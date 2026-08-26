import { useState } from 'react'

import { DownloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, App, Button, DatePicker, Empty, Flex, Tabs, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { Link, useParams } from 'react-router'

import { getAggregation } from '@/api/aggregation'
import type { Aggregation } from '@/api/aggregation'
import { getPhotoSummary } from '@/api/photos'
import { getProject } from '@/api/projects'
import { queryKeys } from '@/api/queryKeys'
import { downloadAggregationExcel } from '@/api/exports'
import { PivotTable } from '@/features/summary/PivotTable'

/** 작업일 열이 서른 개까지 가므로 머리글을 짧게 쓴다 */
function formatDay(workDate: string) {
  return dayjs(workDate).format('M/D')
}

function formatMonth(month: string) {
  return dayjs(`${month}-01`).format('YYYY.MM')
}

/** 소수를 거듭 더하면 꼬리가 남는다. 화면에 내보내기 전에 자른다 */
function round(value: number) {
  return Math.round(value * 100) / 100
}

/**
 * 서버가 준 집계를 화면이 볼 단위로 다시 묶는다.
 *
 * **더하기만 하고 규칙은 건드리지 않는다.** 규격을 가르는 것도 둘레로 환산하는 것도
 * 서버가 이미 끝냈다. 여기서 하는 일은 날짜 열을 골라 남기거나 월로 접는 것뿐이다.
 * `columnOf`가 null을 주면 그 날짜는 버린다.
 */
function reshape(source: Aggregation, columnOf: (date: string) => string | null) {
  const columns: string[] = []
  const kept = new Map<string, string>()

  for (const date of source.dates) {
    const column = columnOf(date)
    if (column == null) continue
    kept.set(date, column)
    if (!columns.includes(column)) columns.push(column)
  }

  const totals: Record<string, number> = {}
  let grandTotal = 0

  const rows = source.rows
    .map((row) => {
      const quantityByDate: Record<string, number> = {}
      let total = 0

      for (const [date, value] of Object.entries(row.quantityByDate)) {
        const column = kept.get(date)
        if (column == null) continue
        quantityByDate[column] = (quantityByDate[column] ?? 0) + value
        total += value
        totals[column] = (totals[column] ?? 0) + value
      }

      grandTotal += total
      return { ...row, quantityByDate, total: round(total) }
    })
    // 고른 기간에 값이 없는 공종은 행을 만들지 않는다
    .filter((row) => row.total !== 0)

  for (const column of columns) totals[column] = round(totals[column])
  return { columns, rows, totals, grandTotal: round(grandTotal) }
}

/**
 * 집계 — 서버가 만든 집계표와 기성누계를 그린다.
 *
 * **더하거나 곱하지 않는다.** 확정된 사진만 세는 것도, 규격을 갈라 행을 만드는 것도,
 * 가로*세로를 둘레 연장으로 환산하는 것도 서버가 한다(`GET /projects/{id}/aggregation`).
 * 화면이 하는 일은 날짜 열을 고른 달로 좁히거나 월로 접는 것뿐이다.
 *
 * **집계표는 한 달치만 본다.** 작업일이 곧 열이라 기간을 안 자르면 1년짜리 현장에서
 * 열이 이백 개가 된다. 기성누계는 성격이 반대라 자르지 않는다.
 */
export function SummaryPage() {
  const { projectId = '' } = useParams()
  const { message } = App.useApp()
  const [month, setMonth] = useState<Dayjs>(() => dayjs())
  const [exporting, setExporting] = useState(false)

  const { data: project } = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => getProject(projectId),
  })

  const { data: aggregation, isLoading } = useQuery({
    queryKey: queryKeys.aggregation(projectId),
    queryFn: () => getAggregation(projectId),
  })

  /* 아직 반영되지 않은 사진 수만 알면 되므로 목록 없이 카운트만 받는다 */
  const { data: summary } = useQuery({
    queryKey: queryKeys.photoSummary(projectId, 'all'),
    queryFn: () => getPhotoSummary(projectId, 'all'),
  })
  const needsReview = summary?.counts.needsReview ?? 0

  const source: Aggregation = aggregation ?? {
    dates: [],
    rows: [],
    totalByDate: {},
    grandTotal: 0,
  }

  const selected = month.format('YYYY-MM')
  const daily = reshape(source, (date) => (date.startsWith(selected) ? date : null))
  const cumulative = reshape(source, (date) => date.slice(0, 7))

  /**
   * 집계 엑셀을 받는다.
   *
   * **서버가 만든다.** 화면이 고른 달과 무관하게 프로젝트 전체가 담기고,
   * 값이 아니라 수식으로 채워져 엑셀에서 원본을 고치면 집계가 따라 바뀐다.
   */
  async function downloadExcel() {
    if (source.rows.length === 0) {
      message.warning('내보낼 집계가 없습니다. 사진대지에서 검수를 먼저 마쳐주세요.')
      return
    }

    setExporting(true)
    try {
      const projectName = project?.name ?? projectId
      await downloadAggregationExcel(projectId, `집계_${projectName}.xlsx`)
    } catch {
      message.error('파일을 받지 못했습니다. 다시 시도해주세요.')
    } finally {
      setExporting(false)
    }
  }

  /** 고른 달에 기록이 없을 때 — 어느 달에 있는지 알려주고 끝낸다 */
  const monthsWithWork = [...new Set(source.dates.map((date) => date.slice(0, 7)))].map(formatMonth)
  const emptyMonth = (
    <Empty
      description={
        monthsWithWork.length > 0
          ? `${month.format('YYYY년 M월')}에는 작업 기록이 없습니다. 기록이 있는 달: ${monthsWithWork.join(', ')}`
          : '집계할 실적이 없습니다. 사진대지에서 사진을 올리고 분석해주세요.'
      }
    />
  )

  return (
    <Flex vertical gap={16}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        집계
      </Typography.Title>

      <Flex justify="space-between" align="center" gap={16}>
        <DatePicker
          picker="month"
          value={month}
          onChange={(next) => next && setMonth(next)}
          allowClear={false}
        />
        <Flex align="center" gap={12}>
          <Typography.Text type="secondary">
            공종 {source.rows.length}행 · 작업일 {daily.columns.length}일
          </Typography.Text>
          {/*
            엑셀에는 기간 파라미터가 없어 늘 프로젝트 전체가 담긴다.
            화면은 한 달만 보고 있으므로, 받기 전에 무엇이 담기는지 밝힌다.
          */}
          <Tooltip title="고른 달과 상관없이 프로젝트 전체 기간이 담깁니다">
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={exporting}
              onClick={downloadExcel}
            >
              엑셀 내려받기
            </Button>
          </Tooltip>
        </Flex>
      </Flex>

      {needsReview > 0 && (
        <Alert
          type="info"
          showIcon
          title={`확인이 필요한 사진 ${needsReview}장은 아직 집계에 없습니다`}
          description={
            <>
              사진대지에서 그 칸을 채우면 물량이 들어옵니다.{' '}
              <Link to={`/projects/${projectId}/sheet`}>사진대지로 가기</Link>
            </>
          }
        />
      )}

      <Tabs
        items={[
          {
            key: 'daily',
            label: '집계표',
            children:
              !isLoading && daily.columns.length === 0 ? (
                emptyMonth
              ) : (
                <Flex vertical gap={8}>
                  <Typography.Text type="secondary">
                    {month.format('YYYY년 M월')} · 공종별 작업일별 집계
                  </Typography.Text>
                  <PivotTable
                    {...daily}
                    formatColumn={formatDay}
                    totalColumn="계"
                    loading={isLoading}
                  />
                </Flex>
              ),
          },
          {
            key: 'cumulative',
            label: '기성누계',
            children:
              !isLoading && cumulative.columns.length === 0 ? (
                <Empty description="집계할 실적이 없습니다. 사진대지에서 사진을 올리고 분석해주세요." />
              ) : (
                <Flex vertical gap={8}>
                  <Typography.Text type="secondary">
                    월별 집계와 누계 · 기간을 자르지 않습니다
                  </Typography.Text>
                  <PivotTable
                    {...cumulative}
                    formatColumn={formatMonth}
                    totalColumn="누계"
                    loading={isLoading}
                  />
                </Flex>
              ),
          },
        ]}
      />
    </Flex>
  )
}

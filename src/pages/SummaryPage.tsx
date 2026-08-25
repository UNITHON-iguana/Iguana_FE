import { useState } from 'react'
import type { ComponentProps } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Alert, DatePicker, Empty, Flex, Switch, Tabs, Typography } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { Link, useParams } from 'react-router'

import { getAggregateItems } from '@/api/aggregateItems'
import { getPhotos } from '@/api/photos'
import { queryKeys } from '@/api/queryKeys'
import { aggregate, groupBy, withoutEmptyRows } from '@/features/summary/aggregate'
import type { Pivot, UnmatchedRow } from '@/features/summary/aggregate'
import { PivotTable } from '@/features/summary/PivotTable'

/** 안내에 이름을 늘어놓을 최대 개수. 넘으면 세어서 말한다 */
const NAMES_SHOWN = 5

/** 한 달 안이라 날짜만으로 충분하지만, 열이 서른 개까지 가므로 짧게 쓴다 */
function formatDay(workDate: string) {
  return dayjs(workDate).format('M/D')
}

function formatMonth(month: string) {
  return dayjs(`${month}-01`).format('YYYY.MM')
}

/** 붙일 품목을 못 찾은 줄을 알린다 — 조용히 버리면 합계가 말없이 줄어든다 */
function UnmatchedNotice({ rows }: { rows: UnmatchedRow[] }) {
  const labels = [
    ...new Set(rows.map((row) => `${row.category ?? '(구분 없음)'} ${row.spec ?? ''}`.trim())),
  ]
  const shown = labels.slice(0, NAMES_SHOWN).join(', ')
  const rest = labels.length - NAMES_SHOWN

  return (
    <Alert
      type="warning"
      showIcon
      title={`품목에 붙지 않은 줄이 ${rows.length}건 있어 집계에서 빠졌습니다`}
      description={`${shown}${rest > 0 ? ` 외 ${rest}종` : ''}. 사진대지에서 구분과 규격을 품목에 맞추거나, 품목 마스터에 추가해야 합니다.`}
    />
  )
}

/** 제목을 단 집계표 한 덩어리 */
function Section({
  title,
  hint,
  ...rest
}: { title: string; hint?: string } & ComponentProps<typeof PivotTable>) {
  return (
    <Flex vertical gap={8}>
      <Flex align="baseline" gap={8}>
        <Typography.Text strong>{title}</Typography.Text>
        {hint && <Typography.Text type="secondary">{hint}</Typography.Text>}
      </Flex>
      <PivotTable {...rest} />
    </Flex>
  )
}

/**
 * 집계 — 원본 엑셀의 집계표와 기성누계 시트를 옮긴 화면.
 *
 * 행 목록·집계 단위·HB 계수·묶음은 전부 품목 마스터가 들고 온다.
 * 이 화면은 마스터가 시킨 대로 묶고 곱한 결과를 보여주기만 한다.
 *
 * **검수 완료된 사진만 센다.** 확인할 칸이 없는 사진은 분석 직후 자동으로 확정되므로
 * 대부분은 올린 즉시 여기 들어오고, 사람 손이 필요한 사진만 남아서 빠진다.
 * 미검수 값이 섞인 합계를 만들지 않는 대신, 빠진 장수를 화면 위에 밝힌다.
 *
 * **집계표는 한 달치만 본다.** 작업일이 곧 열이라 기간을 안 자르면 1년짜리 현장에서
 * 열이 이백 개가 된다. 원본 엑셀도 회차마다 시트를 새로 만들어 한두 달치만 담는다.
 * 기성누계는 성격이 반대라 기간을 자르지 않는다.
 */
export function SummaryPage() {
  const { projectId = '' } = useParams()
  const [month, setMonth] = useState<Dayjs>(() => dayjs())
  const [showEmptyRows, setShowEmptyRows] = useState(false)

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: queryKeys.aggregateItems(projectId),
    queryFn: () => getAggregateItems(projectId),
  })
  const { data: photos = [], isLoading: photosLoading } = useQuery({
    queryKey: queryKeys.photos(projectId),
    queryFn: () => getPhotos(projectId),
  })

  /*
   * 확정된 사진만 실적이다.
   * 분석 실패 사진도 사람이 직접 채워 확정했으면 똑같이 센다 — 값을 채운 건 사람이다.
   */
  const settled = photos.filter(
    (photo) => photo.status !== 'uploading' && photo.status !== 'analyzing',
  )
  const target = settled.filter((photo) => photo.reviewStatus === 'confirmed')
  const pendingCount = settled.length - target.length

  /*
   * 기간은 집계 결과를 잘라내는 게 아니라 집계에 넣을 사진을 고르는 조건이다.
   * 나중에 서버가 집계하게 되면 이 자리가 그대로 `?from=&to=`가 된다.
   */
  const selected = month.format('YYYY-MM')
  const inMonth = target.filter((photo) => photo.workDate?.startsWith(selected))

  const daily = aggregate(items, inMonth, (workDate) => workDate)
  const hb = groupBy(daily.pivot, items, (item) => item.hbGroup, true)

  /*
   * 기성누계와 안내는 프로젝트 전체를 본다.
   * 고른 달에 없다고 해서 '작업일이 빈 사진이 있다' 같은 할 일이 사라지면 안 된다.
   */
  const overall = aggregate(items, target, (workDate) => workDate.slice(0, 7))

  const trim = (pivot: Pivot) => (showEmptyRows ? pivot : withoutEmptyRows(pivot))
  const loading = itemsLoading || photosLoading

  const notices = (
    <>
      {pendingCount > 0 && (
        <Alert
          type="info"
          showIcon
          title={`검수하지 않은 사진 ${pendingCount}장은 아직 집계에 없습니다`}
          description={
            <>
              확인이 필요한 칸을 채우고 검수 완료로 넘기면 그 물량이 들어옵니다.{' '}
              <Link to={`/projects/${projectId}/sheet`}>사진대지에서 검수하기</Link>
            </>
          }
        />
      )}
      {overall.unmatched.length > 0 && <UnmatchedNotice rows={overall.unmatched} />}
      {/*
        작업일이 비면 사진대지에서 확정 자체가 막히므로 지금은 여기까지 오지 않는다.
        확정 규칙이 서버로 넘어가는 날 어긋나면 합계가 말없이 줄어들 자리라 방어로 남긴다.
      */}
      {overall.undatedPhotos > 0 && (
        <Alert
          type="warning"
          showIcon
          title={`작업일이 비어 있는 사진 ${overall.undatedPhotos}장은 집계에서 빠졌습니다`}
          description="사진대지에서 사진 아래 작업일을 채우면 집계에 들어옵니다."
        />
      )}
    </>
  )

  /** 고른 달에 기록이 없을 때 — 어느 달에 있는지 알려주고 끝낸다 */
  const monthsWithWork = overall.pivot.columns.map(formatMonth)
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
        <Flex align="center" gap={16}>
          <DatePicker
            picker="month"
            value={month}
            onChange={(next) => next && setMonth(next)}
            allowClear={false}
          />
          <Flex align="center" gap={8}>
            <Switch size="small" checked={showEmptyRows} onChange={setShowEmptyRows} />
            <Typography.Text>값 없는 품목도 보기</Typography.Text>
          </Flex>
        </Flex>
        <Typography.Text type="secondary">
          품목 {items.length}종 · 이 달 사진 {inMonth.length}장 · 작업일{' '}
          {daily.pivot.columns.length}일
        </Typography.Text>
      </Flex>

      {notices}

      <Tabs
        items={[
          {
            key: 'daily',
            label: '집계표',
            children:
              !loading && daily.pivot.columns.length === 0 ? (
                emptyMonth
              ) : (
                <Flex vertical gap={24}>
                  <Section
                    title="일일작업현황"
                    hint={`${month.format('YYYY년 M월')} · 품목별 작업일별 1차 집계`}
                    pivot={trim(daily.pivot)}
                    formatColumn={formatDay}
                    totalColumn="계"
                    showFooter
                  />
                  <Section
                    title="HB"
                    hint="벽체 양면 시공 계수를 적용한 기성 산출값"
                    pivot={trim(hb)}
                    formatColumn={formatDay}
                    totalColumn="계"
                  />
                </Flex>
              ),
          },
          {
            key: 'cumulative',
            label: '기성누계',
            children:
              !loading && overall.pivot.columns.length === 0 ? (
                <Empty description="집계할 실적이 없습니다. 사진대지에서 사진을 올리고 분석해주세요." />
              ) : (
                <Section
                  title="기성누적집계"
                  hint="월별 집계와 누계 · 기간을 자르지 않는다"
                  pivot={trim(overall.pivot)}
                  formatColumn={formatMonth}
                  totalColumn="누계"
                  showFooter
                />
              ),
          },
        ]}
      />
    </Flex>
  )
}

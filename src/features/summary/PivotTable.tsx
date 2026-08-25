import { Table, Typography } from 'antd'
import type { ColumnType } from 'antd/es/table'

import { HEADER_BG } from '@/app/theme'
import { numberColumn } from '@/components/columns'
import { DataTable } from '@/components/DataTable'
import { AGGREGATE_UNIT_LABEL } from '@/lib/constants'

import type { Pivot, PivotRow } from './aggregate'

/** 열 하나의 폭. 작업일이 스무 개를 넘어서 좁게 잡는다 */
const VALUE_WIDTH = 72

/** 합계 줄 — 사진대지 양식의 라벨 칸과 같은 회색을 쓴다 */
const totalRowStyle = { background: HEADER_BG, fontWeight: 600 }

/**
 * 값이 없는 칸은 0이 아니라 '-'다.
 * 원본 양식이 그렇게 쓰고, 0을 찍으면 '시공했는데 물량이 0'과 구별되지 않는다.
 */
function formatValue(value: number | undefined) {
  if (value == null || value === 0) return '-'
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
}

export interface PivotTableProps {
  pivot: Pivot
  /** 열 이름을 머리글 표기로 바꾼다 */
  formatColumn: (column: string) => string
  /** 맨 오른쪽에 행 합계 열을 붙인다 */
  totalColumn?: string
  /** 맨 아래에 열 합계 줄을 붙인다 */
  showFooter?: boolean
}

/**
 * 집계표 한 덩어리.
 *
 * 일일작업현황·HB·기성누계가 모두 같은 모양이라 한 컴포넌트로 그린다.
 * 행 머리와 단위는 왼쪽에 고정하고 값 열만 가로로 흐른다.
 */
export function PivotTable({ pivot, formatColumn, totalColumn, showFooter }: PivotTableProps) {
  const valueColumns: ColumnType<PivotRow>[] = pivot.columns.map((column) =>
    numberColumn<PivotRow>({
      title: formatColumn(column),
      width: VALUE_WIDTH,
      render: (_, row) => formatValue(row.values[column]),
    }),
  )

  if (totalColumn) {
    valueColumns.push(
      numberColumn<PivotRow>({
        title: totalColumn,
        width: 96,
        fixed: 'right',
        render: (_, row) => <Typography.Text strong>{formatValue(row.total)}</Typography.Text>,
      }),
    )
  }

  return (
    <DataTable<PivotRow>
      rowKey="key"
      dataSource={pivot.rows}
      scroll={{ x: 'max-content' }}
      locale={{ emptyText: '집계된 품목이 없습니다.' }}
      columns={[
        { title: '구 분', dataIndex: 'label', width: 168, fixed: 'left' },
        {
          title: '단위',
          dataIndex: 'unit',
          width: 56,
          fixed: 'left',
          render: (unit: PivotRow['unit']) => AGGREGATE_UNIT_LABEL[unit],
        },
        ...valueColumns,
        /*
         * 남는 폭을 받아내는 빈 열.
         * 없으면 작업일이 몇 개 안 될 때 값 열이 늘어나 표가 엑셀처럼 보이지 않는다.
         */
        { title: '' },
      ]}
      summary={
        showFooter
          ? () => (
              <Table.Summary fixed>
                <Table.Summary.Row style={totalRowStyle}>
                  <Table.Summary.Cell index={0}>합계</Table.Summary.Cell>
                  <Table.Summary.Cell index={1} />
                  {pivot.columns.map((column, i) => (
                    <Table.Summary.Cell key={column} index={2 + i} align="right">
                      {formatValue(pivot.totals[column])}
                    </Table.Summary.Cell>
                  ))}
                  {totalColumn && (
                    <Table.Summary.Cell index={2 + pivot.columns.length} align="right">
                      {formatValue(pivot.grandTotal)}
                    </Table.Summary.Cell>
                  )}
                  <Table.Summary.Cell index={2 + pivot.columns.length + (totalColumn ? 1 : 0)} />
                </Table.Summary.Row>
              </Table.Summary>
            )
          : undefined
      }
    />
  )
}

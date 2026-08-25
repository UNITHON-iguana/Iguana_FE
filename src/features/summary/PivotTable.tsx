import { Table, Typography } from 'antd'
import type { ColumnType } from 'antd/es/table'

import type { AggregationRow } from '@/api/aggregation'
import { HEADER_BG } from '@/app/theme'
import { numberColumn } from '@/components/columns'
import { DataTable } from '@/components/DataTable'

/** 열 하나의 폭. 작업일이 서른 개까지 가므로 좁게 잡는다 */
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

/** 같은 행이 여러 번 안 겹치게 공종과 규격을 합친 키 */
function rowKey(row: AggregationRow) {
  return `${row.workTypeId}:${row.spec ?? ''}`
}

export interface PivotTableProps {
  /** 열 이름. 작업일이거나 월이다 */
  columns: string[]
  rows: AggregationRow[]
  totals: Record<string, number>
  grandTotal: number
  /** 열 이름을 머리글 표기로 바꾼다 */
  formatColumn: (column: string) => string
  /** 맨 오른쪽 행 합계 열의 머리글 */
  totalColumn: string
}

/**
 * 집계표 한 덩어리.
 *
 * 서버가 만든 행을 그대로 그린다 — 여기서 더하거나 곱하지 않는다.
 * 공종과 규격은 왼쪽에 고정하고 값 열만 가로로 흐른다.
 */
export function PivotTable({
  columns,
  rows,
  totals,
  grandTotal,
  formatColumn,
  totalColumn,
}: PivotTableProps) {
  const valueColumns: ColumnType<AggregationRow>[] = columns.map((column) =>
    numberColumn<AggregationRow>({
      title: formatColumn(column),
      width: VALUE_WIDTH,
      render: (_, row) => formatValue(row.quantityByDate[column]),
    }),
  )

  valueColumns.push(
    numberColumn<AggregationRow>({
      title: totalColumn,
      width: 96,
      fixed: 'right',
      render: (_, row) => <Typography.Text strong>{formatValue(row.total)}</Typography.Text>,
    }),
  )

  return (
    <DataTable<AggregationRow>
      rowKey={rowKey}
      dataSource={rows}
      scroll={{ x: 'max-content' }}
      locale={{ emptyText: '집계된 공종이 없습니다.' }}
      columns={[
        { title: '구 분', dataIndex: 'workTypeName', width: 168, fixed: 'left' },
        {
          title: '규격',
          dataIndex: 'spec',
          width: 96,
          fixed: 'left',
          // 규격이 없는 행은 둘레 연장으로 접힌 것이다 — 빈 칸이 아니라 '-'로 둔다
          render: (spec: string | null) => spec ?? '-',
        },
        { title: '단위', dataIndex: 'unit', width: 56, fixed: 'left' },
        ...valueColumns,
        /*
         * 남는 폭을 받아내는 빈 열.
         * 없으면 작업일이 몇 개 안 될 때 값 열이 늘어나 표가 엑셀처럼 보이지 않는다.
         */
        { title: '' },
      ]}
      summary={() => (
        <Table.Summary fixed>
          <Table.Summary.Row style={totalRowStyle}>
            <Table.Summary.Cell index={0}>합계</Table.Summary.Cell>
            <Table.Summary.Cell index={1} />
            <Table.Summary.Cell index={2} />
            {columns.map((column, i) => (
              <Table.Summary.Cell key={column} index={3 + i} align="right">
                {formatValue(totals[column])}
              </Table.Summary.Cell>
            ))}
            <Table.Summary.Cell index={3 + columns.length} align="right">
              {formatValue(grandTotal)}
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4 + columns.length} />
          </Table.Summary.Row>
        </Table.Summary>
      )}
    />
  )
}

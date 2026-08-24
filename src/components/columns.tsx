import type { ColumnType } from 'antd/es/table'

/**
 * 수량처럼 자릿수를 비교해야 하는 열.
 * 우측 정렬은 여기서 강제하고, 고정폭 숫자는 body에 걸린 tabular-nums가 처리한다.
 * 값이 없으면 0으로 채우지 않고 '-'로 둔다 — 없는 값을 추정하지 않는다는 규칙과 같다.
 */
export function numberColumn<T>(column: ColumnType<T>): ColumnType<T> {
  return {
    align: 'right',
    width: 100,
    render: (value: unknown) => (value == null || value === '' ? '-' : String(value)),
    ...column,
  }
}

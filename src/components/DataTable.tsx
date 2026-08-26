import { Table } from 'antd'
import type { TableProps } from 'antd'

import { TableSkeleton } from './TableSkeleton'

/**
 * 이 서비스의 표는 전부 이 컴포넌트를 쓴다.
 *
 * 엑셀처럼 보이려면 모든 표가 같은 격자·밀도를 가져야 하는데,
 * 화면마다 `bordered`, `size`를 손으로 반복하면 언젠가 하나가 빠지고
 * 거기만 antd 기본 표가 된다. 기본값을 여기 한곳에 둔다.
 *
 * **아직 안 온 표와 빈 표를 가른다.** 처음 불러오는 동안 `없습니다`를 띄우면 사람은
 * 없는 줄 알고 화면을 떠난다. 줄이 하나도 없이 불러오는 중이면 `emptyText` 대신
 * 격자 모양 자리를 깔고(`TableSkeleton`), 그 위에 antd 스피너까지 겹치지 않게 끈다.
 * 이미 줄이 있는데 다시 받아오는 중이면 그대로 스피너를 돌린다 — 그때는 화면에 남은
 * 값이 옛것임을 알리는 것이 맞다.
 */
export function DataTable<T extends object>({
  bordered = true,
  size = 'small',
  pagination = false as const,
  loading,
  locale,
  ...rest
}: TableProps<T>) {
  const firstLoad = Boolean(loading) && !rest.dataSource?.length

  return (
    <Table<T>
      bordered={bordered}
      size={size}
      pagination={pagination}
      loading={firstLoad ? false : loading}
      locale={firstLoad ? { ...locale, emptyText: <TableSkeleton /> } : locale}
      {...rest}
    />
  )
}

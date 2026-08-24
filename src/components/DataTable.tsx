import { Table } from 'antd'
import type { TableProps } from 'antd'

/**
 * 이 서비스의 표는 전부 이 컴포넌트를 쓴다.
 *
 * 엑셀처럼 보이려면 모든 표가 같은 격자·밀도를 가져야 하는데,
 * 화면마다 `bordered`, `size`를 손으로 반복하면 언젠가 하나가 빠지고
 * 거기만 antd 기본 표가 된다. 기본값을 여기 한곳에 둔다.
 */
export function DataTable<T extends object>({
  bordered = true,
  size = 'small',
  pagination = false as const,
  ...rest
}: TableProps<T>) {
  return <Table<T> bordered={bordered} size={size} pagination={pagination} {...rest} />
}

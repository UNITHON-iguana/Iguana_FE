import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Empty, Flex, Input, InputNumber, Popconfirm } from 'antd'
import type { ColumnType } from 'antd/es/table'

import { DataTable } from '@/components/DataTable'
import type { PlanItemBase } from '@/types'

export interface PlanItemTableProps<T extends PlanItemBase> {
  items: T[]
  loading?: boolean
  /** 공정은 `description`, 자재는 `material` — 이 열 하나만 다르다 */
  nameKey: keyof T & string
  nameTitle: string
  /** 값이 바뀐 줄 하나를 통째로 돌려준다 */
  onChange: (item: T) => void
  onRemove: (id: string) => void
  onAdd: () => void
  adding?: boolean
  emptyText: string
}

/**
 * 계획 데이터를 표에서 직접 입력한다.
 *
 * 엑셀 업로드를 받지 않으므로 여기가 유일한 입력 경로다.
 * 셀에 항상 입력칸이 깔려 있어 클릭하면 바로 타이핑되고, 칸 안에 또 테두리가
 * 생기지 않게 `variant="borderless"`를 쓴다 — 격자는 표가 그린다.
 *
 * 수량은 antd `InputNumber`에 맡긴다. 자재 수량은 면적(m²)이나 길이(m)라 소수가
 * 흔한데, 입력 도중의 `12.`이 사라지지 않게 붙드는 처리를 직접 하지 않아도 된다.
 */
export function PlanItemTable<T extends PlanItemBase>({
  items,
  loading,
  nameKey,
  nameTitle,
  onChange,
  onRemove,
  onAdd,
  adding,
  emptyText,
}: PlanItemTableProps<T>) {
  /** 글자 칸 하나 */
  function textCell(key: keyof T & string, placeholder?: string): ColumnType<T>['render'] {
    return (_, row) => (
      <Input
        variant="borderless"
        size="small"
        placeholder={placeholder}
        value={(row[key] as string | null) ?? ''}
        onChange={(event) => onChange({ ...row, [key]: event.target.value })}
      />
    )
  }

  return (
    <Flex vertical gap={8}>
      <DataTable<T>
        rowKey="id"
        loading={loading}
        dataSource={items}
        locale={{ emptyText: <Empty description={emptyText} /> }}
        columns={[
          {
            title: '위치',
            dataIndex: 'location',
            width: 140,
            render: textCell('location', '지하2층'),
          },
          {
            title: '공종',
            dataIndex: 'workType',
            width: 140,
            render: textCell('workType', '덕트'),
          },
          { title: nameTitle, dataIndex: nameKey, render: textCell(nameKey) },
          {
            title: '계획 수량',
            dataIndex: 'quantity',
            width: 120,
            align: 'right',
            render: (_, row) => (
              <InputNumber
                variant="borderless"
                size="small"
                controls={false}
                style={{ width: '100%' }}
                value={row.quantity}
                onChange={(next) => onChange({ ...row, quantity: next ?? null })}
              />
            ),
          },
          { title: '단위', dataIndex: 'unit', width: 90, render: textCell('unit', '개소') },
          {
            title: '',
            width: 48,
            render: (_, row) => (
              <Popconfirm
                title="이 줄을 지웁니다"
                okText="삭제"
                cancelText="취소"
                okButtonProps={{ danger: true }}
                onConfirm={() => onRemove(row.id)}
              >
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            ),
          },
        ]}
      />

      <div>
        <Button icon={<PlusOutlined />} loading={adding} onClick={onAdd}>
          줄 추가
        </Button>
      </div>
    </Flex>
  )
}

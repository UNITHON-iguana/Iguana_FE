import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Empty, Flex, Input, InputNumber, Popconfirm, Select } from 'antd'
import type { ColumnType } from 'antd/es/table'

import { DataTable } from '@/components/DataTable'
import type { PlanWorkItem, WorkType } from '@/types'

export interface PlanItemTableProps {
  items: PlanWorkItem[]
  /** `구 분` 칸이 고르는 목록. 서버가 공종을 id로 받아 이름만으로는 저장할 수 없다 */
  workTypes: WorkType[]
  loading?: boolean
  /** 값이 바뀐 줄 하나를 통째로 돌려준다 */
  onChange: (item: PlanWorkItem) => void
  onRemove: (id: string) => void
  onAdd: () => void
  emptyText: string
}

/**
 * 계획 공정을 표에서 직접 입력한다.
 *
 * 엑셀 업로드를 받지 않으므로 여기가 유일한 입력 경로다.
 * 셀에 항상 입력칸이 깔려 있어 클릭하면 바로 타이핑되고, 칸 안에 또 테두리가
 * 생기지 않게 `variant="borderless"`를 쓴다 — 격자는 표가 그린다.
 *
 * 수량은 antd `InputNumber`에 맡긴다. 수량이 면적(m²)이나 길이(m)라 소수가
 * 흔한데, 입력 도중의 `12.`이 사라지지 않게 붙드는 처리를 직접 하지 않아도 된다.
 *
 * **공종만 고르는 칸이다.** 사진대지 `구 분`과 같은 목록에서 고른다 —
 * 자유 입력이면 등록되지 않은 이름이 들어와 계획 대비 현황에서 짝을 못 찾는다.
 */
export function PlanItemTable({
  items,
  workTypes,
  loading,
  onChange,
  onRemove,
  onAdd,
  emptyText,
}: PlanItemTableProps) {
  /** 글자 칸 하나 */
  function textCell(
    key: 'location' | 'description' | 'unit',
    placeholder?: string,
  ): ColumnType<PlanWorkItem>['render'] {
    return (_, row) => (
      <Input
        variant="borderless"
        size="small"
        placeholder={placeholder}
        value={row[key] ?? ''}
        onChange={(event) => onChange({ ...row, [key]: event.target.value })}
      />
    )
  }

  return (
    <Flex vertical gap={8}>
      <DataTable<PlanWorkItem>
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
            width: 150,
            render: (_, row) => (
              <Select
                variant="borderless"
                size="small"
                showSearch
                placeholder="공종 선택"
                style={{ width: '100%' }}
                value={row.workTypeId}
                options={workTypes.map((workType) => ({
                  value: workType.id,
                  label: workType.name,
                }))}
                onChange={(workTypeId: number) =>
                  onChange({
                    ...row,
                    workTypeId,
                    workType: workTypes.find((w) => w.id === workTypeId)?.name ?? '',
                  })
                }
              />
            ),
          },
          { title: '작업내용', dataIndex: 'description', render: textCell('description') },
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
        <Button icon={<PlusOutlined />} onClick={onAdd}>
          줄 추가
        </Button>
      </div>
    </Flex>
  )
}

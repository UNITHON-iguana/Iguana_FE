import { useQuery } from '@tanstack/react-query'
import { Alert, Empty, Flex, Table, Tabs, Tag, Typography } from 'antd'
import { useParams } from 'react-router'

import { getMaterialComparison, getWorkComparison } from '@/api/comparison'
import { getPlanMaterialItems, getPlanWorkItems } from '@/api/plans'
import { queryKeys } from '@/api/queryKeys'
import { COMPARE_STATUS_LABEL } from '@/lib/constants'
import type { CompareStatus, MaterialComparisonRow, WorkComparisonRow } from '@/types'

const STATUS_COLOR: Record<CompareStatus, string> = {
  match: 'success',
  over: 'error',
  under: 'warning',
  insufficient: 'default',
}

function StatusTag({ status }: { status: CompareStatus }) {
  return <Tag color={STATUS_COLOR[status]}>{COMPARE_STATUS_LABEL[status]}</Tag>
}

/** 계획과 실적이 모두 있을 때만 차이를 보여준다 — 없는 값은 추정하지 않는다 */
function diff(planned: number | null, actual: number | null) {
  if (planned == null || actual == null) return '-'
  const value = actual - planned
  return value > 0 ? `+${value}` : String(value)
}

const sharedColumns = [
  { title: '위치', dataIndex: 'location', width: 110 },
  { title: '공종', dataIndex: 'workType', width: 110 },
]

const quantityColumns = [
  { title: '계획 수량', dataIndex: 'plannedQuantity', width: 100, align: 'right' as const },
  {
    title: '확인 수량',
    dataIndex: 'actualQuantity',
    width: 100,
    align: 'right' as const,
    render: (value: number | null) => value ?? '-',
  },
  {
    title: '차이',
    width: 90,
    align: 'right' as const,
    render: (_: unknown, row: { plannedQuantity: number | null; actualQuantity: number | null }) =>
      diff(row.plannedQuantity, row.actualQuantity),
  },
  { title: '단위', dataIndex: 'unit', width: 80 },
  {
    title: '상태',
    dataIndex: 'status',
    width: 140,
    render: (status: CompareStatus) => <StatusTag status={status} />,
  },
]

export function ComparePage() {
  const { projectId = '' } = useParams()

  const { data: planWork = [] } = useQuery({
    queryKey: queryKeys.planWork(projectId),
    queryFn: () => getPlanWorkItems(projectId),
  })
  const { data: planMaterial = [] } = useQuery({
    queryKey: queryKeys.planMaterial(projectId),
    queryFn: () => getPlanMaterialItems(projectId),
  })
  const { data: workRows = [], isLoading: workLoading } = useQuery({
    queryKey: queryKeys.workComparison(projectId),
    queryFn: () => getWorkComparison(projectId),
  })
  const { data: materialRows = [], isLoading: materialLoading } = useQuery({
    queryKey: queryKeys.materialComparison(projectId),
    queryFn: () => getMaterialComparison(projectId),
  })

  const hasPlan = planWork.length > 0 || planMaterial.length > 0

  if (!hasPlan) {
    return (
      <Flex vertical gap={16}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          계획 대비 현황
        </Typography.Title>
        <Empty description="계획 데이터가 없어 비교할 수 없습니다. 계획 데이터를 먼저 등록해주세요." />
      </Flex>
    )
  }

  const insufficient = [...workRows, ...materialRows].filter(
    (row) => row.status === 'insufficient',
  ).length

  return (
    <Flex vertical gap={16}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        계획 대비 현황
      </Typography.Title>

      {insufficient > 0 && (
        <Alert
          type="info"
          showIcon
          title={`비교 데이터가 부족한 항목이 ${insufficient}건 있습니다`}
          description="계획 또는 검수 완료된 실적이 없는 항목은 추정하지 않고 비교 데이터 부족으로 표시합니다."
        />
      )}

      <Tabs
        items={[
          {
            key: 'work',
            label: '공정 비교',
            children: (
              <Table<WorkComparisonRow>
                rowKey="key"
                size="small"
                loading={workLoading}
                dataSource={workRows}
                pagination={false}
                columns={[
                  ...sharedColumns,
                  { title: '작업내용', dataIndex: 'description' },
                  ...quantityColumns,
                ]}
              />
            ),
          },
          {
            key: 'material',
            label: '자재 비교',
            children: (
              <Table<MaterialComparisonRow>
                rowKey="key"
                size="small"
                loading={materialLoading}
                dataSource={materialRows}
                pagination={false}
                columns={[
                  ...sharedColumns,
                  { title: '자재명', dataIndex: 'material' },
                  ...quantityColumns,
                ]}
              />
            ),
          },
        ]}
      />
    </Flex>
  )
}

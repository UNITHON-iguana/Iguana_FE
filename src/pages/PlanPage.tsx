import { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Empty, Flex, Tabs, Tag, Typography } from 'antd'
import type { ColumnType } from 'antd/es/table'
import { useParams } from 'react-router'

import { getMaterialComparison, getWorkComparison } from '@/api/comparison'
import {
  addPlanMaterialItem,
  addPlanWorkItem,
  getPlanMaterialItems,
  getPlanWorkItems,
  removePlanMaterialItem,
  removePlanWorkItem,
  savePlanMaterialItem,
  savePlanWorkItem,
} from '@/api/plans'
import { queryKeys } from '@/api/queryKeys'
import { numberColumn } from '@/components/columns'
import { DataTable } from '@/components/DataTable'
import { PlanItemTable } from '@/features/plan/PlanItemTable'
import { useRowAutosave } from '@/lib/useRowAutosave'
import { COMPARE_STATUS_LABEL } from '@/lib/constants'
import type {
  CompareStatus,
  ComparisonBase,
  MaterialComparisonRow,
  PlanMaterialItem,
  PlanWorkItem,
  WorkComparisonRow,
} from '@/types'

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

/** 공정·자재 비교표가 공유하는 앞쪽 열 */
function sharedColumns<T extends ComparisonBase>(): ColumnType<T>[] {
  return [
    { title: '위치', dataIndex: 'location', width: 110 },
    { title: '공종', dataIndex: 'workType', width: 110 },
  ]
}

/** 공정·자재 비교표가 공유하는 뒤쪽 열 */
function quantityColumns<T extends ComparisonBase>(): ColumnType<T>[] {
  return [
    numberColumn<T>({ title: '계획 수량', dataIndex: 'plannedQuantity' }),
    numberColumn<T>({ title: '확인 수량', dataIndex: 'actualQuantity' }),
    numberColumn<T>({
      title: '차이',
      width: 90,
      render: (_, row) => diff(row.plannedQuantity, row.actualQuantity),
    }),
    { title: '단위', dataIndex: 'unit', width: 80 },
    {
      title: '상태',
      dataIndex: 'status',
      width: 140,
      render: (status: CompareStatus) => <StatusTag status={status} />,
    },
  ]
}

/** 계획 데이터가 없으면 비교할 것도 없다 — 비교 탭은 같은 안내를 쓴다 */
function NoPlan() {
  return (
    <Empty description="계획 데이터가 없어 비교할 수 없습니다. 계획 공정이나 계획 자재를 먼저 입력해주세요." />
  )
}

/**
 * 계획 — 계획 데이터 입력과 계획 대비 현황을 한 페이지에 둔다.
 *
 * 둘은 같은 데이터를 넣고 꺼내 보는 관계라 화면을 오갈 이유가 없다.
 * 사진대지 흐름에는 없어도 되는 곁가지여서 메뉴에서도 아래쪽에 둔다.
 *
 * **엑셀 업로드는 받지 않는다.** 계획 양식이 현장·발주처마다 제각각이라
 * 파일을 읽어 맞추는 것보다 필요한 줄을 표에서 직접 넣는 편이 빠르다.
 */
export function PlanPage() {
  const { projectId = '' } = useParams()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  /** 저장되지 않은 편집분. 서버 값 위에 덮어 쓴다 */
  const [workDrafts, setWorkDrafts] = useState<Record<string, PlanWorkItem>>({})
  const [materialDrafts, setMaterialDrafts] = useState<Record<string, PlanMaterialItem>>({})

  const { data: workItems = [], isLoading: workLoading } = useQuery({
    queryKey: queryKeys.planWork(projectId),
    queryFn: () => getPlanWorkItems(projectId),
  })
  const { data: materialItems = [], isLoading: materialLoading } = useQuery({
    queryKey: queryKeys.planMaterial(projectId),
    queryFn: () => getPlanMaterialItems(projectId),
  })
  const { data: workRows = [], isLoading: workCompareLoading } = useQuery({
    queryKey: queryKeys.workComparison(projectId),
    queryFn: () => getWorkComparison(projectId),
  })
  const { data: materialRows = [], isLoading: materialCompareLoading } = useQuery({
    queryKey: queryKeys.materialComparison(projectId),
    queryFn: () => getMaterialComparison(projectId),
  })

  const invalidateWork = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.planWork(projectId) })
  const invalidateMaterial = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.planMaterial(projectId) })

  const saveWork = useRowAutosave<PlanWorkItem>(savePlanWorkItem)
  const saveMaterial = useRowAutosave<PlanMaterialItem>(savePlanMaterialItem)

  const { mutate: addWork, isPending: addingWork } = useMutation({
    mutationFn: () => addPlanWorkItem(projectId),
    onSuccess: invalidateWork,
    onError: () => message.error('줄을 추가하지 못했습니다. 다시 시도해주세요.'),
  })
  const { mutate: addMaterial, isPending: addingMaterial } = useMutation({
    mutationFn: () => addPlanMaterialItem(projectId),
    onSuccess: invalidateMaterial,
    onError: () => message.error('줄을 추가하지 못했습니다. 다시 시도해주세요.'),
  })
  const { mutate: removeWork } = useMutation({
    mutationFn: removePlanWorkItem,
    onSuccess: invalidateWork,
    onError: () => message.error('줄을 지우지 못했습니다. 다시 시도해주세요.'),
  })
  const { mutate: removeMaterial } = useMutation({
    mutationFn: removePlanMaterialItem,
    onSuccess: invalidateMaterial,
    onError: () => message.error('줄을 지우지 못했습니다. 다시 시도해주세요.'),
  })

  /** 편집분을 덮어쓴 현재 값 */
  const work = workItems.map((item) => workDrafts[item.id] ?? item)
  const material = materialItems.map((item) => materialDrafts[item.id] ?? item)

  const hasPlan = workItems.length > 0 || materialItems.length > 0
  const insufficient = [...workRows, ...materialRows].filter(
    (row) => row.status === 'insufficient',
  ).length

  const insufficientNotice = insufficient > 0 && (
    <Alert
      type="info"
      showIcon
      title={`비교 데이터가 부족한 항목이 ${insufficient}건 있습니다`}
      description="계획 또는 검수 완료된 실적이 없는 항목은 추정하지 않고 비교 데이터 부족으로 표시합니다."
    />
  )

  return (
    <Flex vertical gap={16}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        계획
      </Typography.Title>

      {!hasPlan && (
        <Alert
          type="warning"
          showIcon
          title="계획 데이터가 없습니다"
          description="계획 데이터가 없으면 계획 대비 현황을 볼 수 없습니다. 아래 탭에서 줄을 추가해 입력하세요. 사진대지와 집계는 계획 데이터 없이도 사용할 수 있습니다."
        />
      )}

      <Tabs
        items={[
          {
            key: 'work',
            label: `계획 공정 (${workItems.length})`,
            children: (
              <PlanItemTable<PlanWorkItem>
                items={work}
                loading={workLoading}
                nameKey="description"
                nameTitle="작업내용"
                emptyText="계획 공정이 없습니다. 줄 추가로 입력하세요."
                onChange={(item) => {
                  setWorkDrafts((prev) => ({ ...prev, [item.id]: item }))
                  saveWork.edit(item)
                }}
                onLeave={saveWork.leave}
                onRemove={removeWork}
                onAdd={addWork}
                adding={addingWork}
              />
            ),
          },
          {
            key: 'material',
            label: `계획 자재 (${materialItems.length})`,
            children: (
              <PlanItemTable<PlanMaterialItem>
                items={material}
                loading={materialLoading}
                nameKey="material"
                nameTitle="자재명"
                emptyText="계획 자재가 없습니다. 줄 추가로 입력하세요."
                onChange={(item) => {
                  setMaterialDrafts((prev) => ({ ...prev, [item.id]: item }))
                  saveMaterial.edit(item)
                }}
                onLeave={saveMaterial.leave}
                onRemove={removeMaterial}
                onAdd={addMaterial}
                adding={addingMaterial}
              />
            ),
          },
          {
            key: 'work-compare',
            label: '공정 비교',
            children: !hasPlan ? (
              <NoPlan />
            ) : (
              <Flex vertical gap={16}>
                {insufficientNotice}
                <DataTable<WorkComparisonRow>
                  rowKey="key"
                  loading={workCompareLoading}
                  dataSource={workRows}
                  columns={[
                    ...sharedColumns<WorkComparisonRow>(),
                    { title: '작업내용', dataIndex: 'description' },
                    ...quantityColumns<WorkComparisonRow>(),
                  ]}
                />
              </Flex>
            ),
          },
          {
            key: 'material-compare',
            label: '자재 비교',
            children: !hasPlan ? (
              <NoPlan />
            ) : (
              <Flex vertical gap={16}>
                {insufficientNotice}
                <DataTable<MaterialComparisonRow>
                  rowKey="key"
                  loading={materialCompareLoading}
                  dataSource={materialRows}
                  columns={[
                    ...sharedColumns<MaterialComparisonRow>(),
                    { title: '자재명', dataIndex: 'material' },
                    ...quantityColumns<MaterialComparisonRow>(),
                  ]}
                />
              </Flex>
            ),
          },
        ]}
      />
    </Flex>
  )
}

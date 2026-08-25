import { InboxOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, Empty, Flex, Tabs, Tag, theme as antdTheme, Typography, Upload } from 'antd'
import type { ColumnType } from 'antd/es/table'
import { useParams } from 'react-router'

import { getMaterialComparison, getWorkComparison } from '@/api/comparison'
import { getPlanMaterialItems, getPlanWorkItems } from '@/api/plans'
import { queryKeys } from '@/api/queryKeys'
import { numberColumn } from '@/components/columns'
import { DataTable } from '@/components/DataTable'
import { ACCEPTED_EXCEL_EXTENSIONS, COMPARE_STATUS_LABEL } from '@/lib/constants'
import type {
  CompareStatus,
  ComparisonBase,
  MaterialComparisonRow,
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

function ExcelDropzone() {
  const { token } = antdTheme.useToken()

  return (
    <Upload.Dragger
      accept={ACCEPTED_EXCEL_EXTENSIONS}
      maxCount={1}
      // 백엔드 연동 전까지는 실제로 올리지 않는다
      beforeUpload={() => false}
      style={{ padding: 8 }}
    >
      <p style={{ margin: 0 }}>
        <InboxOutlined style={{ fontSize: 28, color: token.colorPrimary }} />
      </p>
      <p>계획 데이터 엑셀을 끌어다 놓거나 클릭해 선택하세요</p>
      <Typography.Text type="secondary">기본 템플릿 1종(.xlsx)을 지원합니다</Typography.Text>
    </Upload.Dragger>
  )
}

/** 계획 데이터가 없으면 비교할 것도 없다 — 비교 탭은 같은 안내를 쓴다 */
function NoPlan() {
  return (
    <Empty description="계획 데이터가 없어 비교할 수 없습니다. 위에서 계획 엑셀을 올려주세요." />
  )
}

/**
 * 계획 — 계획 데이터 등록과 계획 대비 현황을 한 페이지에 둔다.
 *
 * 둘은 같은 데이터를 넣고 꺼내 보는 관계라 화면을 오갈 이유가 없다.
 * 사진대지 흐름에는 없어도 되는 곁가지여서 메뉴에서도 아래쪽에 둔다.
 */
export function PlanPage() {
  const { projectId = '' } = useParams()

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
          description="계획 데이터가 없으면 계획 대비 현황을 볼 수 없습니다. 사진대지와 집계는 계획 데이터 없이도 사용할 수 있습니다."
        />
      )}

      <ExcelDropzone />

      <Tabs
        items={[
          {
            key: 'work',
            label: `계획 공정 (${workItems.length})`,
            children: (
              <DataTable
                rowKey="id"
                loading={workLoading}
                dataSource={workItems}
                columns={[
                  { title: '위치', dataIndex: 'location', width: 120 },
                  { title: '공종', dataIndex: 'workType', width: 120 },
                  { title: '작업내용', dataIndex: 'description' },
                  { title: '계획 수량', dataIndex: 'quantity', width: 100, align: 'right' },
                  { title: '단위', dataIndex: 'unit', width: 80 },
                ]}
              />
            ),
          },
          {
            key: 'material',
            label: `계획 자재 (${materialItems.length})`,
            children: (
              <DataTable
                rowKey="id"
                loading={materialLoading}
                dataSource={materialItems}
                columns={[
                  { title: '위치', dataIndex: 'location', width: 120 },
                  { title: '공종', dataIndex: 'workType', width: 120 },
                  { title: '자재명', dataIndex: 'material' },
                  { title: '계획 수량', dataIndex: 'quantity', width: 100, align: 'right' },
                  { title: '단위', dataIndex: 'unit', width: 80 },
                ]}
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

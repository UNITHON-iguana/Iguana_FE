import { InboxOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, Flex, Tabs, theme as antdTheme, Typography, Upload } from 'antd'
import { useParams } from 'react-router'

import { getPlanMaterialItems, getPlanWorkItems } from '@/api/plans'
import { queryKeys } from '@/api/queryKeys'
import { DataTable } from '@/components/DataTable'
import { ACCEPTED_EXCEL_EXTENSIONS } from '@/lib/constants'

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

  const hasPlan = workItems.length > 0 || materialItems.length > 0

  return (
    <Flex vertical gap={16}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        계획 데이터
      </Typography.Title>

      {!hasPlan && (
        <Alert
          type="warning"
          showIcon
          title="계획 데이터가 없습니다"
          description="계획 데이터가 없으면 계획 대비 현황 비교를 사용할 수 없습니다. 사진 분석과 검수는 계획 데이터 없이도 사용할 수 있습니다."
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
        ]}
      />
    </Flex>
  )
}

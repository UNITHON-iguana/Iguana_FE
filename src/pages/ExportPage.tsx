import { useState } from 'react'

import { DownloadOutlined, PrinterOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, App, Button, Card, Checkbox, Empty, Flex, Tabs, Typography } from 'antd'
import { useParams } from 'react-router'

import { getPhotos } from '@/api/photos'
import { getProject } from '@/api/projects'
import { queryKeys } from '@/api/queryKeys'
import { buildRecordsWorkbook, downloadBlob } from '@/features/export/excel'
import { PhotoSheet } from '@/features/photo-sheet/PhotoSheet'

export function ExportPage() {
  const { projectId = '' } = useParams()
  const { message } = App.useApp()
  const [confirmedOnly, setConfirmedOnly] = useState(true)
  const [generating, setGenerating] = useState(false)

  const { data: project } = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => getProject(projectId),
  })
  const { data: photos = [] } = useQuery({
    queryKey: queryKeys.photos(projectId),
    queryFn: () => getPhotos(projectId),
  })

  const analyzed = photos.filter((p) => p.status === 'analyzed')
  const target = confirmedOnly ? analyzed.filter((p) => p.reviewStatus === 'confirmed') : analyzed
  const pendingCount = analyzed.filter((p) => p.reviewStatus === 'pending').length
  const projectName = project?.name ?? ''

  async function downloadExcel() {
    if (target.length === 0) {
      message.warning('내보낼 데이터가 없습니다. 필터를 변경해주세요.')
      return
    }
    setGenerating(true)
    try {
      const blob = await buildRecordsWorkbook(projectName, target)
      downloadBlob(blob, `현장기록_${projectName || projectId}.xlsx`)
    } catch {
      message.error('파일 생성에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setGenerating(false)
    }
  }

  const filters = (
    <Flex align="center" gap={16}>
      <Checkbox checked={confirmedOnly} onChange={(e) => setConfirmedOnly(e.target.checked)}>
        검수 완료만 포함
      </Checkbox>
      <Typography.Text type="secondary">포함 {target.length}건</Typography.Text>
    </Flex>
  )

  const warning = !confirmedOnly && pendingCount > 0 && (
    <Alert
      type="warning"
      showIcon
      title={`미검수 데이터 ${pendingCount}건이 포함됩니다`}
      description="검수하지 않은 AI 추출값이 그대로 내보내집니다."
    />
  )

  return (
    <Flex vertical gap={16}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        내보내기
      </Typography.Title>

      <Tabs
        items={[
          {
            key: 'excel',
            label: '엑셀',
            children: (
              <Flex vertical gap={16}>
                {filters}
                {warning}
                <div>
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    loading={generating}
                    disabled={target.length === 0}
                    onClick={downloadExcel}
                  >
                    XLSX 내려받기
                  </Button>
                </div>
              </Flex>
            ),
          },
          {
            key: 'sheet',
            label: '사진대지',
            children: (
              <Flex vertical gap={16}>
                {filters}
                {warning}
                <div>
                  <Button
                    icon={<PrinterOutlined />}
                    disabled={target.length === 0}
                    onClick={() => window.print()}
                  >
                    인쇄 · PDF로 저장
                  </Button>
                </div>
                <Card size="small" title="미리보기" styles={{ body: { background: '#f5f5f5' } }}>
                  {target.length === 0 ? (
                    <Empty description="검수 완료된 작업 사진이 없습니다" />
                  ) : (
                    <PhotoSheet
                      projectName={projectName}
                      entries={target.map((photo) => ({
                        id: photo.id,
                        seq: photo.seq,
                        // 분리된 작업 사진이 없으면 원본을 대신 쓴다
                        imageUrl: photo.croppedUrl ?? photo.originalUrl,
                        location: photo.location,
                        workItems: photo.workItems,
                      }))}
                    />
                  )}
                </Card>
              </Flex>
            ),
          },
        ]}
      />
    </Flex>
  )
}

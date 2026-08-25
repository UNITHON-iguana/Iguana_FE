import { useState } from 'react'

import { DownloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, App, Button, Flex, Typography } from 'antd'
import { Link, useParams } from 'react-router'

import { getPhotos } from '@/api/photos'
import { getProject } from '@/api/projects'
import { queryKeys } from '@/api/queryKeys'
import { buildRecordsWorkbook, downloadBlob } from '@/features/export/excel'

/**
 * 내보내기 — 사진대지를 엑셀 파일로 받는다.
 *
 * **검수 완료된 사진만 내보낸다.** 집계와 같은 기준이다 —
 * 한쪽에는 있고 다른 쪽에는 없는 물량이 생기면 둘 중 어느 숫자를 믿을지 알 수 없다.
 */
export function ExportPage() {
  const { projectId = '' } = useParams()
  const { message } = App.useApp()
  const [generating, setGenerating] = useState(false)

  const { data: project } = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => getProject(projectId),
  })
  const { data: photos = [] } = useQuery({
    queryKey: queryKeys.photos(projectId),
    queryFn: () => getPhotos(projectId),
  })

  // 분석 실패 사진도 사람이 채워 확정했으면 내보낸다 — 값을 채운 건 사람이다
  const settled = photos.filter((p) => p.status !== 'uploading' && p.status !== 'analyzing')
  const target = settled.filter((p) => p.reviewStatus === 'confirmed')
  const pendingCount = settled.length - target.length
  const projectName = project?.name ?? ''

  async function downloadExcel() {
    if (target.length === 0) {
      message.warning('검수 완료된 사진이 없습니다. 사진대지에서 검수를 먼저 해주세요.')
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

  return (
    <Flex vertical gap={16}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        내보내기
      </Typography.Title>

      <Typography.Text type="secondary">검수 완료 {target.length}장을 내보냅니다</Typography.Text>

      {pendingCount > 0 && (
        <Alert
          type="info"
          showIcon
          title={`검수하지 않은 사진 ${pendingCount}장은 빠집니다`}
          description={
            <>
              확인이 필요한 칸을 채우고 검수 완료로 넘기면 함께 내보내집니다.{' '}
              <Link to={`/projects/${projectId}/sheet`}>사진대지에서 검수하기</Link>
            </>
          }
        />
      )}

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
  )
}

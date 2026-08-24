import { InboxOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Flex, Progress, Tag, theme as antdTheme, Typography, Upload } from 'antd'
import { useParams } from 'react-router'

import { addPhotos, getPhotos, removePhoto, startAnalysis } from '@/api/photos'
import { queryKeys } from '@/api/queryKeys'
import { DataTable } from '@/components/DataTable'
import { ACCEPTED_IMAGE_EXTENSIONS, PHOTO_STATUS_LABEL } from '@/lib/constants'
import type { Photo, PhotoStatus } from '@/types'

const STATUS_COLOR: Record<PhotoStatus, string> = {
  uploading: 'default',
  analyzing: 'processing',
  analyzed: 'success',
  failed: 'error',
}

export function UploadPage() {
  const { projectId = '' } = useParams()
  const { message } = App.useApp()
  const { token } = antdTheme.useToken()
  const queryClient = useQueryClient()

  const { data: photos = [] } = useQuery({
    queryKey: queryKeys.photos(projectId),
    queryFn: () => getPhotos(projectId),
    /**
     * 처리 중인 사진이 남아 있는 동안만 다시 물어본다.
     * 백엔드가 충분히 빨라 한 번에 결과가 오면 이 줄만 지우면 된다.
     */
    refetchInterval: (query) =>
      query.state.data?.some((p) => p.status === 'uploading' || p.status === 'analyzing')
        ? 1000
        : false,
  })

  const { mutate: add } = useMutation({
    mutationFn: (files: File[]) => addPhotos(projectId, files),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.photos(projectId) }),
    onError: () => message.error('업로드에 실패했습니다. 다시 시도해주세요.'),
  })

  const { mutate: remove } = useMutation({
    mutationFn: removePhoto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.photos(projectId) }),
  })

  const { mutate: analyze, isPending: analyzing } = useMutation({
    mutationFn: () => startAnalysis(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.photos(projectId) }),
    onError: () => message.error('분석 실행에 실패했습니다. 다시 시도해주세요.'),
  })

  const done = photos.filter((p) => p.status === 'analyzed').length
  const failed = photos.filter((p) => p.status === 'failed').length
  const inProgress = photos.filter(
    (p) => p.status === 'uploading' || p.status === 'analyzing',
  ).length

  return (
    <Flex vertical gap={16}>
      <Flex justify="space-between" align="center">
        <Typography.Title level={3} style={{ margin: 0 }}>
          사진 업로드·분석
        </Typography.Title>
        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          disabled={photos.length === 0 || inProgress > 0}
          loading={analyzing}
          onClick={() => analyze()}
        >
          AI 분석 실행
        </Button>
      </Flex>

      <Upload.Dragger
        multiple
        accept={ACCEPTED_IMAGE_EXTENSIONS}
        showUploadList={false}
        beforeUpload={(file, fileList) => {
          // 브라우저가 목록 전체를 한 번에 넘겨주므로 첫 호출에서만 처리한다
          if (file === fileList[0]) add(fileList as File[])
          return false
        }}
        style={{ padding: 8 }}
      >
        <p style={{ margin: 0 }}>
          <InboxOutlined style={{ fontSize: 28, color: token.colorPrimary }} />
        </p>
        <p>텍스트가 포함된 현장 사진을 끌어다 놓거나 클릭해 선택하세요</p>
        <Typography.Text type="secondary">
          여러 장을 한 번에 올릴 수 있습니다 (JPG, PNG)
        </Typography.Text>
      </Upload.Dragger>

      {photos.length > 0 && (
        <Flex align="center" gap={16}>
          <Progress
            percent={Math.round(((done + failed) / photos.length) * 100)}
            status={inProgress > 0 ? 'active' : 'normal'}
            style={{ flex: 1 }}
          />
          <Typography.Text type="secondary">
            완료 {done} · 실패 {failed} · 처리 중 {inProgress}
          </Typography.Text>
        </Flex>
      )}

      <DataTable<Photo>
        rowKey="id"
        dataSource={photos}
        locale={{ emptyText: '업로드한 사진이 없습니다. 위 영역에 사진을 올려주세요.' }}
        columns={[
          { title: '번호', dataIndex: 'seq', width: 80 },
          { title: '파일명', dataIndex: 'fileName' },
          {
            title: '상태',
            dataIndex: 'status',
            width: 160,
            render: (status: PhotoStatus, row) => (
              <Tag color={STATUS_COLOR[status]}>
                {PHOTO_STATUS_LABEL[status]}
                {row.failureReason ? ` · ${row.failureReason}` : ''}
              </Tag>
            ),
          },
          {
            title: '',
            width: 80,
            render: (_, row) => (
              // 분석 전에는 목록에서 뺄 수 있다
              <Button
                type="link"
                danger
                disabled={row.status === 'analyzing'}
                onClick={() => remove(row.id)}
              >
                삭제
              </Button>
            ),
          },
        ]}
      />
    </Flex>
  )
}

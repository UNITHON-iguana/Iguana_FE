import { useState } from 'react'

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Flex,
  Image,
  Input,
  Menu,
  Progress,
  Table,
  Tag,
  Typography,
} from 'antd'
import dayjs from 'dayjs'
import { useParams } from 'react-router'

import { getPhotos, savePhotoReview } from '@/api/photos'
import { queryKeys } from '@/api/queryKeys'
import { DEFAULT_WORK_ITEM_ROWS, REVIEW_STATUS_LABEL } from '@/lib/constants'
import type { Photo, WorkItem } from '@/types'

function emptyWorkItem(): WorkItem {
  return {
    id: `new_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    category: null,
    description: null,
    spec: null,
    quantity: null,
    unit: null,
  }
}

/** 화면에는 최소 3줄을 보여주되 항목 개수 자체는 제한하지 않는다 */
function withDefaultRows(items: WorkItem[]): WorkItem[] {
  const padding = Math.max(0, DEFAULT_WORK_ITEM_ROWS - items.length)
  return [...items, ...Array.from({ length: padding }, emptyWorkItem)]
}

/**
 * 사진 한 장의 검수 폼.
 * 부모가 photo.id를 key로 넘겨 사진이 바뀌면 이 컴포넌트가 다시 마운트되고,
 * 편집 중이던 값도 자연스럽게 초기화된다.
 */
function PhotoReviewCard({ photo, projectId }: { photo: Photo; projectId: string }) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Photo>(() => ({
    ...photo,
    workItems: withDefaultRows(photo.workItems),
  }))

  const { mutate: save, isPending } = useMutation({
    mutationFn: () =>
      savePhotoReview(draft.id, {
        workDate: draft.workDate,
        location: draft.location,
        // 빈 줄은 저장하지 않는다
        workItems: draft.workItems.filter((item) => item.category || item.description || item.spec),
        reviewStatus: 'confirmed',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.photos(projectId) })
      message.success('검수 완료로 저장했습니다')
    },
    // 저장에 실패해도 편집 중인 값은 유지한다
    onError: () => message.error('저장에 실패했습니다. 다시 시도해주세요.'),
  })

  function updateItem(itemId: string, patch: Partial<WorkItem>) {
    setDraft((prev) => ({
      ...prev,
      workItems: prev.workItems.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    }))
  }

  return (
    <Card
      size="small"
      style={{ flex: 1 }}
      title={`사진 ${draft.seq} · ${draft.fileName}`}
      extra={
        <Button type="primary" loading={isPending} onClick={() => save()}>
          검수 완료
        </Button>
      }
    >
      <Flex vertical gap={16}>
        {draft.status === 'failed' && (
          <Alert
            type="warning"
            showIcon
            title="분석에 실패한 사진입니다"
            description={`${draft.failureReason ?? '사유 미상'} — 아래에서 직접 입력해주세요.`}
          />
        )}

        <Flex gap={16} align="flex-start">
          <Flex vertical gap={4}>
            <Typography.Text type="secondary">원본</Typography.Text>
            <Image src={draft.originalUrl} width={160} />
          </Flex>
          <Flex vertical gap={4}>
            <Typography.Text type="secondary">분리된 작업 사진</Typography.Text>
            {draft.croppedUrl ? (
              <Image src={draft.croppedUrl} width={160} />
            ) : (
              <Flex
                align="center"
                justify="center"
                style={{
                  width: 160,
                  height: 160,
                  background: '#fafafa',
                  border: '1px dashed #d9d9d9',
                }}
              >
                <Typography.Text type="secondary">분리 실패</Typography.Text>
              </Flex>
            )}
          </Flex>

          <Flex vertical gap={12} style={{ flex: 1 }}>
            <Flex vertical gap={4}>
              <Typography.Text type="secondary">작업일</Typography.Text>
              <DatePicker
                value={draft.workDate ? dayjs(draft.workDate) : null}
                onChange={(date) =>
                  setDraft({ ...draft, workDate: date?.format('YYYY-MM-DD') ?? null })
                }
              />
            </Flex>
            <Flex vertical gap={4}>
              <Typography.Text type="secondary">위치</Typography.Text>
              <Input
                value={draft.location ?? ''}
                placeholder="지하2층"
                onChange={(e) => setDraft({ ...draft, location: e.target.value || null })}
              />
            </Flex>
          </Flex>
        </Flex>

        <Flex vertical gap={8}>
          <Flex justify="space-between" align="center">
            <Typography.Text strong>작업 항목</Typography.Text>
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() =>
                setDraft({ ...draft, workItems: [...draft.workItems, emptyWorkItem()] })
              }
            >
              행 추가
            </Button>
          </Flex>
          <Table<WorkItem>
            rowKey="id"
            size="small"
            dataSource={draft.workItems}
            pagination={false}
            columns={[
              {
                title: '구분',
                dataIndex: 'category',
                render: (value: string | null, row) => (
                  <Input
                    value={value ?? ''}
                    onChange={(e) => updateItem(row.id, { category: e.target.value || null })}
                  />
                ),
              },
              {
                title: '작업내용',
                dataIndex: 'description',
                render: (value: string | null, row) => (
                  <Input
                    value={value ?? ''}
                    onChange={(e) => updateItem(row.id, { description: e.target.value || null })}
                  />
                ),
              },
              {
                title: '규격',
                dataIndex: 'spec',
                width: 120,
                render: (value: string | null, row) => (
                  <Input
                    value={value ?? ''}
                    placeholder="800*400"
                    onChange={(e) => updateItem(row.id, { spec: e.target.value || null })}
                  />
                ),
              },
              {
                title: '수량',
                dataIndex: 'quantity',
                width: 90,
                render: (value: number | null, row) => (
                  <Input
                    value={value ?? ''}
                    onChange={(e) =>
                      updateItem(row.id, {
                        quantity: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  />
                ),
              },
              {
                title: '',
                width: 48,
                render: (_, row) => (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        workItems: draft.workItems.filter((item) => item.id !== row.id),
                      })
                    }
                  />
                ),
              },
            ]}
          />
        </Flex>
      </Flex>
    </Card>
  )
}

export function ReviewPage() {
  const { projectId = '' } = useParams()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: photos = [] } = useQuery({
    queryKey: queryKeys.photos(projectId),
    queryFn: () => getPhotos(projectId),
  })

  const reviewable = photos.filter((p) => p.status === 'analyzed' || p.status === 'failed')
  const selected = reviewable.find((p) => p.id === selectedId) ?? reviewable[0]
  const confirmed = photos.filter((p) => p.reviewStatus === 'confirmed').length

  if (reviewable.length === 0) {
    return (
      <Flex vertical gap={16}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          검수
        </Typography.Title>
        <Empty description="분석이 완료된 사진이 없습니다. 사진을 업로드하고 AI 분석을 실행해주세요." />
      </Flex>
    )
  }

  return (
    <Flex vertical gap={16}>
      <Flex justify="space-between" align="center">
        <Typography.Title level={3} style={{ margin: 0 }}>
          검수
        </Typography.Title>
        <Flex align="center" gap={12} style={{ width: 280 }}>
          <Progress
            percent={Math.round((confirmed / photos.length) * 100)}
            size="small"
            style={{ flex: 1 }}
          />
          <Typography.Text type="secondary">
            {confirmed} / {photos.length}
          </Typography.Text>
        </Flex>
      </Flex>

      <Flex gap={16} align="flex-start">
        <Card size="small" style={{ width: 280, flexShrink: 0 }} styles={{ body: { padding: 0 } }}>
          <Menu
            mode="inline"
            selectedKeys={selected ? [selected.id] : []}
            onSelect={({ key }) => setSelectedId(key)}
            items={reviewable.map((photo) => ({
              key: photo.id,
              label: (
                <Flex justify="space-between" align="center" gap={8}>
                  <span>
                    {photo.seq} · {photo.location ?? '위치 미상'}
                  </span>
                  <Tag color={photo.reviewStatus === 'confirmed' ? 'success' : 'default'}>
                    {REVIEW_STATUS_LABEL[photo.reviewStatus]}
                  </Tag>
                </Flex>
              ),
            }))}
          />
        </Card>

        {selected && <PhotoReviewCard key={selected.id} photo={selected} projectId={projectId} />}
      </Flex>
    </Flex>
  )
}

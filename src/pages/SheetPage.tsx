import { useEffect, useRef, useState } from 'react'

import { PictureOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Button,
  Checkbox,
  Empty,
  Flex,
  Pagination,
  Popconfirm,
  Progress,
  Select,
  Switch,
  Tooltip,
  Typography,
  Upload,
} from 'antd'
import { useParams } from 'react-router'

import {
  addPhotos,
  confirmClearPhotos,
  getPhotoPage,
  removePhoto,
  savePhotoReview,
  startAnalysis,
} from '@/api/photos'
import type { PhotoCounts, PhotoReviewInput, WorkDateFilter, WorkDateOption } from '@/api/photos'
import { queryKeys } from '@/api/queryKeys'
import { PhotoSheetGrid } from '@/features/photo-sheet/PhotoSheetGrid'
import { ACCEPTED_IMAGE_EXTENSIONS, PHOTOS_PER_PAGE } from '@/lib/constants'
import { confirmBlocker, hasContent } from '@/lib/workItems'
import type { Photo } from '@/types'

/** 값을 고친 뒤 저장까지 기다리는 시간. 타이핑 중에 매 글자 저장하지 않는다 */
const AUTOSAVE_DELAY = 800

const EMPTY_COUNTS: PhotoCounts = {
  photos: 0,
  inProgress: 0,
  failed: 0,
  confirmed: 0,
  needsReview: 0,
  clearPending: 0,
}

/** 저장에 보낼 것만 추린다. 양식을 채우려고 만든 빈 줄은 보내지 않는다 */
function toReviewInput(photo: Photo): PhotoReviewInput {
  return {
    workDate: photo.workDate,
    location: photo.location,
    workItems: photo.workItems.filter(hasContent),
    reviewStatus: photo.reviewStatus,
    uncertain: photo.uncertain,
  }
}

/**
 * 검수 완료 토글.
 *
 * 확정할 수 없는 사진은 잠그고 이유를 붙인다 — 확정된 사진만 집계와 내보내기에 들어가므로,
 * 여기서 막지 않으면 확인 필요한 칸이나 빈 작업일이 그대로 실적에 섞인다.
 * 잠긴 체크박스는 마우스 이벤트를 내지 않아 툴팁이 뜨지 않으므로 span으로 감싼다.
 */
function ConfirmToggle({ photo, onToggle }: { photo: Photo; onToggle: (next: boolean) => void }) {
  const blocker = confirmBlocker(photo)
  return (
    <Tooltip title={blocker}>
      <span>
        <Checkbox
          disabled={blocker !== null}
          checked={photo.reviewStatus === 'confirmed'}
          onChange={(event) => onToggle(event.target.checked)}
        >
          검수 완료
        </Checkbox>
      </span>
    </Tooltip>
  )
}

function workDateOptions(options: WorkDateOption[]) {
  return options.map((option) => ({
    value: option.workDate ?? 'undated',
    label: `${option.workDate ?? '작업일 없음'} (${option.photos}장)`,
  }))
}

/**
 * 사진대지 — 이 서비스의 본 화면.
 *
 * 사진 올리기, AI 분석 실행, 검수를 한 페이지에서 끝낸다.
 * 사진을 한 장씩 열어보는 화면이 아니라, 사진 한 장이 격자 한 덩어리로 눕는
 * 엑셀식 표다. 확인이 필요한 칸만 노랗게 뜨므로 사람은 그 칸만 보면 된다.
 *
 * **목록은 서버가 잘라서 준다.** 하루에 수백 장이 올라오는데 사진 한 장이 입력칸 16개를
 * 차지해, 다 펼치면 글자 하나 칠 때마다 화면이 밀린다. 작업일로 좁히고 페이지로 나눈다.
 */
export function SheetPage() {
  const { projectId = '' } = useParams()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const [workDate, setWorkDate] = useState<WorkDateFilter>('all')
  const [uncertainOnly, setUncertainOnly] = useState(false)
  const [page, setPage] = useState(1)
  /** 아직 저장되지 않은 편집분. 서버 값 위에 덮어 쓴다 */
  const [drafts, setDrafts] = useState<Record<string, Photo>>({})
  const [saving, setSaving] = useState(false)

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  /** 직전 처리 중 장수. 분석이 방금 끝났는지 알아내는 데 쓴다 */
  const wasInProgress = useRef(0)
  /** 저장이 예약만 되고 아직 안 나간 사진. 화면을 떠날 때 흘려보내지 않으려고 붙든다 */
  const unsaved = useRef(new Map<string, Photo>())

  const query = {
    projectId,
    workDate,
    needsReview: uncertainOnly,
    page,
    size: PHOTOS_PER_PAGE,
  }

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.photoPage(projectId, query),
    queryFn: () => getPhotoPage(query),
    // 페이지를 넘길 때 표가 비었다가 다시 차는 깜빡임을 없앤다
    placeholderData: keepPreviousData,
    /**
     * 처리 중인 사진이 남아 있는 동안만 다시 물어본다.
     * 백엔드가 충분히 빨라 한 번에 결과가 오면 이 줄만 지우면 된다.
     */
    refetchInterval: (queryState) =>
      queryState.state.data && queryState.state.data.counts.inProgress > 0 ? 1000 : false,
  })

  const items = data?.items ?? []
  const counts = data?.counts ?? EMPTY_COUNTS
  const total = data?.total ?? 0

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.photos(projectId) })

  const { mutate: add } = useMutation({
    mutationFn: (files: File[]) => addPhotos(projectId, files),
    onSuccess: invalidate,
    onError: () => message.error('업로드에 실패했습니다. 다시 시도해주세요.'),
  })

  const { mutate: remove } = useMutation({
    mutationFn: removePhoto,
    onSuccess: invalidate,
    onError: () => message.error('삭제에 실패했습니다. 다시 시도해주세요.'),
  })

  const { mutate: analyze, isPending: analyzing } = useMutation({
    mutationFn: () => startAnalysis(projectId),
    /*
     * 분석을 걸면 곧바로 확인 필요한 사진만 보이게 좁힌다.
     * 확인할 칸이 없는 사진은 분석이 끝나는 대로 스스로 확정돼 집계로 넘어가므로
     * 사람이 볼 이유가 없다. 결과가 들어오는 대로 손봐야 할 사진만 여기에 쌓인다.
     */
    onSuccess: () => {
      refilter(() => setUncertainOnly(true))
      invalidate()
    },
    onError: () => message.error('분석 실행에 실패했습니다. 다시 시도해주세요.'),
  })

  const { mutate: confirmAllClear, isPending: confirming } = useMutation({
    mutationFn: () => confirmClearPhotos(projectId, workDate),
    onSuccess: (count) => {
      message.success(`${count}장을 검수 완료로 넘겼습니다`)
      invalidate()
    },
    onError: () => message.error('검수 완료 처리에 실패했습니다. 다시 시도해주세요.'),
  })

  const { mutateAsync: save } = useMutation({
    mutationFn: (photo: Photo) => savePhotoReview(photo.id, toReviewInput(photo)),
    onError: () => message.error('저장하지 못했습니다. 잠시 뒤 다시 시도해주세요.'),
  })

  useEffect(() => {
    const pendingTimers = timers.current
    const pendingPhotos = unsaved.current
    return () => {
      Object.values(pendingTimers).forEach(clearTimeout)
      /*
       * 예약만 되고 아직 안 나간 저장은 버리지 않고 지금 보낸다.
       * 타이핑하고 0.8초 안에 화면을 떠나면 마지막 편집이 사라지기 때문이다.
       */
      pendingPhotos.forEach((photo) => {
        void savePhotoReview(photo.id, toReviewInput(photo))
      })
      pendingPhotos.clear()
    }
  }, [])

  /** 분석이 방금 끝났으면 결과를 한 줄로 알린다. 남은 일이 있는지가 요점이다 */
  useEffect(() => {
    if (wasInProgress.current > 0 && counts.inProgress === 0) {
      if (counts.needsReview > 0) {
        message.info(`확인이 필요한 사진 ${counts.needsReview}장입니다`)
      } else {
        message.success('확인할 칸이 없어 모두 집계에 들어갔습니다')
      }
    }
    wasInProgress.current = counts.inProgress
  }, [counts.inProgress, counts.needsReview, message])

  /** 편집분을 덮어쓴 현재 값 */
  const current = items.map((photo) => drafts[photo.id] ?? photo)

  function edit(photo: Photo) {
    setDrafts((prev) => ({ ...prev, [photo.id]: photo }))
    unsaved.current.set(photo.id, photo)

    clearTimeout(timers.current[photo.id])
    timers.current[photo.id] = setTimeout(async () => {
      unsaved.current.delete(photo.id)
      setSaving(true)
      await save(photo)
      setSaving(false)
      invalidate()
    }, AUTOSAVE_DELAY)
  }

  /** 검수 상태는 사람이 누른 즉시 저장한다 — 기다릴 이유가 없다 */
  async function setReviewed(photo: Photo, confirmedNext: boolean) {
    const next: Photo = { ...photo, reviewStatus: confirmedNext ? 'confirmed' : 'pending' }
    setDrafts((prev) => ({ ...prev, [photo.id]: next }))
    await save(next)
    invalidate()
  }

  /** 필터를 바꾸면 첫 페이지로 돌아간다 — 3페이지를 보다 좁히면 빈 화면이 된다 */
  function refilter(change: () => void) {
    change()
    setPage(1)
  }

  const filters = (
    <Flex justify="space-between" align="center" gap={16}>
      <Flex align="center" gap={16}>
        <Select<string>
          value={workDate}
          onChange={(next) => refilter(() => setWorkDate(next))}
          style={{ width: 200 }}
          options={[
            { value: 'all', label: `전체 작업일 (${counts.photos}장)` },
            ...workDateOptions(data?.workDates ?? []),
          ]}
        />
        <Flex align="center" gap={8}>
          <Switch
            size="small"
            checked={uncertainOnly}
            onChange={(next) => refilter(() => setUncertainOnly(next))}
          />
          <Typography.Text>확인 필요한 사진만 보기</Typography.Text>
        </Flex>
      </Flex>
      <Flex align="center" gap={12}>
        <Typography.Text type="secondary">Tab·방향키로 칸 이동, Enter로 아래 칸</Typography.Text>
        <Button
          disabled={counts.clearPending === 0}
          loading={confirming}
          onClick={() => confirmAllClear()}
        >
          확인할 칸 없는 {counts.clearPending}장 검수 완료
        </Button>
      </Flex>
    </Flex>
  )

  const pager = total > PHOTOS_PER_PAGE && (
    <Flex justify="end">
      <Pagination
        current={page}
        total={total}
        pageSize={PHOTOS_PER_PAGE}
        showSizeChanger={false}
        onChange={setPage}
        showTotal={(count, range) => `${count}장 중 ${range[0]}–${range[1]}`}
      />
    </Flex>
  )

  /** 사진은 있는데 이 조건으로는 안 보일 때 — 어느 조건을 풀면 되는지 알려준다 */
  const emptyDescription = () => {
    if (counts.photos === 0 && workDate !== 'all') {
      return '이 작업일에는 사진이 없습니다. 위에서 작업일을 바꿔보세요.'
    }
    if (counts.photos === 0) {
      return '사진 추가로 현장 사진을 올리고 AI 분석을 실행하면 여기에 사진대지가 만들어집니다.'
    }
    if (counts.inProgress > 0 && counts.photos === counts.inProgress) {
      return '올린 사진을 분석하고 있습니다. 끝나면 여기에 사진대지가 만들어집니다.'
    }
    if (uncertainOnly) {
      return '확인이 필요한 사진이 없습니다. 나머지는 모두 집계에 들어가 있습니다.'
    }
    return '이 조건에 맞는 사진이 없습니다.'
  }

  return (
    <Flex vertical gap={12}>
      <Flex justify="space-between" align="center" gap={16}>
        <Flex align="baseline" gap={12}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            사진대지
          </Typography.Title>
          {counts.photos > 0 && (
            <Typography.Text type="secondary">
              사진 {counts.photos}장 · 검수 완료 {counts.confirmed}장
              {counts.needsReview > 0 && ` · 확인 필요 ${counts.needsReview}장`}
              {counts.failed > 0 && ` · 분석 실패 ${counts.failed}장`}
            </Typography.Text>
          )}
        </Flex>

        <Flex align="center" gap={8}>
          <Typography.Text type="secondary">{saving ? '저장 중' : '저장됨'}</Typography.Text>
          <Upload
            multiple
            accept={ACCEPTED_IMAGE_EXTENSIONS}
            showUploadList={false}
            beforeUpload={(file, fileList) => {
              // 브라우저가 목록 전체를 한 번에 넘겨주므로 첫 호출에서만 처리한다
              if (file === fileList[0]) add(fileList as File[])
              return false
            }}
          >
            <Button icon={<PictureOutlined />}>사진 추가</Button>
          </Upload>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            disabled={counts.photos === 0 || counts.inProgress > 0}
            loading={analyzing}
            onClick={() => analyze()}
          >
            AI 분석 실행
          </Button>
        </Flex>
      </Flex>

      {counts.inProgress > 0 && (
        <Flex align="center" gap={16}>
          <Progress
            percent={Math.round(((counts.photos - counts.inProgress) / counts.photos) * 100)}
            status="active"
            style={{ flex: 1 }}
          />
          <Typography.Text type="secondary">처리 중 {counts.inProgress}장</Typography.Text>
        </Flex>
      )}

      {counts.photos > 0 && filters}

      {current.length === 0 ? (
        !isLoading && <Empty description={emptyDescription()} />
      ) : (
        <>
          {pager}
          <PhotoSheetGrid
            photos={current}
            onChange={edit}
            renderPhotoExtra={(photo) => (
              <Flex align="center" justify="space-between" gap={4}>
                <ConfirmToggle photo={photo} onToggle={(next) => setReviewed(photo, next)} />
                <Popconfirm
                  title={`${photo.seq}번 사진을 지웁니다`}
                  description="입력한 작업 항목도 함께 사라집니다."
                  okText="삭제"
                  cancelText="취소"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => remove(photo.id)}
                >
                  <Button type="text" size="small" danger>
                    삭제
                  </Button>
                </Popconfirm>
              </Flex>
            )}
          />
          {pager}
        </>
      )}
    </Flex>
  )
}

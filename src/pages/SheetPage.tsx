import { useEffect, useRef, useState } from 'react'

import {
  CheckOutlined,
  DownloadOutlined,
  PictureOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Button,
  Empty,
  Flex,
  Pagination,
  Popconfirm,
  Progress,
  Select,
  Tabs,
  Tooltip,
  Typography,
  Upload,
} from 'antd'
import { useParams } from 'react-router'

import {
  addPhotos,
  confirmPhoto,
  getPhotoPage,
  getPhotoSummary,
  removePhoto,
  startAnalysis,
} from '@/api/photos'
import type { PhotoCounts, PhotoScope, WorkDateFilter, WorkDateOption } from '@/api/photos'
import { downloadSheetExcel } from '@/api/exports'
import { getProject } from '@/api/projects'
import { queryKeys } from '@/api/queryKeys'
import { getTrades } from '@/api/trades'
import { PhotoSheetGrid } from '@/features/photo-sheet/PhotoSheetGrid'
import { ACCEPTED_IMAGE_EXTENSIONS, PHOTOS_PER_PAGE } from '@/lib/constants'
import { confirmBlocker, needsReview } from '@/lib/workItems'
import type { Photo } from '@/types'

const EMPTY_COUNTS: PhotoCounts = {
  photos: 0,
  inProgress: 0,
  failed: 0,
  needsReview: 0,
  sheet: 0,
}

/**
 * 사진 한 장의 상태 표시.
 *
 * **누를 것이 없다.** AI가 다 맞춘 사진은 승인 없이 그대로 집계에 들어가고,
 * 사람이 고친 사진은 그 사진에서 손을 뗄 때 서버로 올라간다.
 * 여기 남는 것은 이 사진이 지금 집계에 들어가 있는지뿐이다.
 */
function ReviewMark({ photo }: { photo: Photo }) {
  const blocker = confirmBlocker(photo)
  if (!blocker) {
    return (
      <Typography.Text type="secondary">
        <CheckOutlined /> 집계 반영
      </Typography.Text>
    )
  }
  return (
    <Tooltip title={blocker}>
      <Typography.Text type="warning">확인 필요</Typography.Text>
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
 * **검수와 결과를 한 페이지 안에서 탭으로 가른다.** 하루에 수백 장이 올라오지만
 * 사람이 볼 것은 AI가 자신 없어 한 사진뿐이다. 검수 탭은 그것만 담아 끝나면 비고,
 * 사진대지 탭은 손볼 것이 없는 대지를 담는다. 두 탭은 겹치지 않고, 합치면 분석이 끝난
 * 사진 전부다. 화면을 둘로 쪼개지 않는 이유는 검수할 때 앞뒤 사진을 함께 보는 것이
 * 값을 고치는 근거가 되기 때문이다 — 같은 격자, 같은 조작, 담는 것만 다르다.
 *
 * **확정 호출은 사람이 고친 사진에만 나간다.** AI가 다 맞춘 사진은 승인이 필요 없어
 * 그대로 실적이 되고, 사람이 고친 사진은 그 사진에서 손을 뗄 때 한 장씩 올라간다.
 * 타이핑 중에는 아무것도 보내지 않는다 — 엑셀이 칸을 벗어날 때 값을 확정하는 것과 같다.
 *
 * **목록은 서버가 잘라서 준다.** 사진 한 장이 입력칸 16개를 차지해 다 펼치면
 * 글자 하나 칠 때마다 화면이 밀린다. 작업일로 좁히고 페이지로 나눈다.
 */
export function SheetPage() {
  const { projectId = '' } = useParams()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const [workDate, setWorkDate] = useState<WorkDateFilter>('all')
  /** 사람이 고른 탭. 고르기 전에는 데이터가 정한다 */
  const [picked, setPicked] = useState<PhotoScope | null>(null)
  const [page, setPage] = useState(1)
  /**
   * 사람이 고친 값. 서버 값 위에 덮어 쓴다.
   *
   * 확인할 칸이 다 채워지면 그 사진은 곧바로 서버에 올라가지만, 아직 칸이 남은 사진의
   * 편집분은 **브라우저에만 있다** — 값만 저장하는 API가 없어서(확정 호출이 사진 하나를
   * 통째로 받고 빈 항목이 있으면 400) 고치는 중에는 올려둘 자리가 없다.
   */
  const [drafts, setDrafts] = useState<Record<string, Photo>>({})
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  /** 직전 처리 중 장수. 분석이 방금 끝났는지 알아내는 데 쓴다 */
  const wasInProgress = useRef(0)
  /** 고쳤지만 아직 안 나간 사진. 화면을 떠날 때 흘려보내지 않으려고 붙든다 */
  const waiting = useRef(new Map<string, Photo>())

  const { data: project } = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => getProject(projectId),
  })

  /* `구 분` 칸이 고르는 목록. 이름만 있으면 되므로 이름만 꺼낸다 */
  const { data: trades = [] } = useQuery({
    queryKey: queryKeys.trades(projectId),
    queryFn: () => getTrades(projectId),
    select: (list) => list.map((trade) => trade.name).filter(Boolean),
  })

  /*
   * 탭에 붙는 수와 작업일 선택지는 목록과 따로 받는다.
   * 어느 탭을 열지가 이 수로 정해지는데 목록에 딸려 오면 순환이 되고,
   * 목록을 건드리지 않고 진행 상황만 다시 물어볼 자리도 필요하다.
   */
  const { data: summary } = useQuery({
    queryKey: queryKeys.photoSummary(projectId, workDate),
    queryFn: () => getPhotoSummary(projectId, workDate),
    /**
     * 처리 중인 사진이 남아 있는 동안만 다시 물어본다.
     * 백엔드가 충분히 빨라 한 번에 결과가 오면 이 줄만 지우면 된다.
     */
    refetchInterval: (queryState) =>
      queryState.state.data && queryState.state.data.counts.inProgress > 0 ? 1000 : false,
  })

  const counts = summary?.counts ?? EMPTY_COUNTS

  /*
   * 기본 탭은 데이터가 정한다 — 손볼 사진이 있으면 검수, 없으면 완성된 사진대지.
   * 사람이 탭을 고르거나 값을 고치기 시작하면 그 선택이 이긴다(`picked`).
   * 마지막 한 장을 끝냈다고 보던 탭이 발밑에서 바뀌면 안 되기 때문이다.
   */
  const view: PhotoScope = picked ?? (counts.needsReview > 0 ? 'review' : 'sheet')

  const query = { projectId, workDate, scope: view, page, size: PHOTOS_PER_PAGE }
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.photoPage(projectId, query),
    queryFn: () => getPhotoPage(query),
    // 페이지를 넘길 때 표가 비었다가 다시 차는 깜빡임을 없앤다
    placeholderData: keepPreviousData,
    // 분석이 도는 동안에는 결과가 들어오는 대로 목록에도 얹는다
    refetchInterval: counts.inProgress > 0 ? 1000 : false,
  })

  const items = data?.items ?? []
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
     * 분석을 걸면 곧바로 검수 탭으로 옮긴다.
     * 확인할 칸이 없는 사진은 그대로 사진대지 탭으로 가 실적이 되므로 사람이 볼 이유가
     * 없다. 결과가 들어오는 대로 손봐야 할 사진만 여기에 쌓인다.
     */
    onSuccess: () => {
      refilter(() => setPicked('review'))
      invalidate()
    },
    onError: () => message.error('분석 실행에 실패했습니다. 다시 시도해주세요.'),
  })

  const { mutateAsync: confirm } = useMutation({
    mutationFn: confirmPhoto,
    onError: () => message.error('저장하지 못했습니다. 잠시 뒤 다시 시도해주세요.'),
  })

  useEffect(() => {
    const pendingPhotos = waiting.current
    return () => {
      /*
       * 사진에서 손을 떼지 않은 채 화면을 떠나는 길이 있다 — 메뉴를 누르거나 뒤로 가기.
       * 그때 마지막 편집이 사라지지 않게 여기서 보낸다.
       */
      pendingPhotos.forEach((photo) => void confirmPhoto(photo))
      pendingPhotos.clear()
    }
  }, [])

  /** 분석이 방금 끝났으면 결과를 한 줄로 알린다. 남은 일이 있는지가 요점이다 */
  useEffect(() => {
    if (wasInProgress.current > 0 && counts.inProgress === 0) {
      if (counts.needsReview > 0) {
        message.info(`확인이 필요한 사진 ${counts.needsReview}장입니다`)
      } else {
        message.success('확인할 칸이 없어 모두 그대로 집계에 들어갔습니다')
      }
    }
    wasInProgress.current = counts.inProgress
  }, [counts.inProgress, counts.needsReview, message])

  /** 편집분을 덮어쓴 현재 값 */
  const current = items.map((photo) => drafts[photo.id] ?? photo)

  /** 확인할 칸이 남아 아직 서버에 못 올린 사진. 이만큼이 브라우저에만 있다 */
  const unsent = Object.values(drafts).filter(needsReview).length

  /*
   * 못 올린 편집분은 브라우저에만 있다. 창을 닫기 전에 한 번 붙잡는다.
   * 값만 저장하는 API가 생기면 이 경고는 필요 없어진다.
   */
  useEffect(() => {
    if (unsent === 0) return
    const hold = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', hold)
    return () => window.removeEventListener('beforeunload', hold)
  }, [unsent])

  /**
   * 값을 고쳤을 때 — 화면에만 얹고 아직 보내지 않는다.
   *
   * 타이핑 중에는 저장하지 않는다. 글자 사이에 잠깐 멈췄다고 중간값이 올라가면
   * 틀린 수량이 잠깐씩 집계에 잡히고 확정 기록도 여러 번 남는다.
   * 값이 여문 시점은 **그 사진에서 손을 뗄 때**다(`leave`).
   */
  function edit(photo: Photo) {
    setPicked(view)
    setDrafts((prev) => ({ ...prev, [photo.id]: photo }))
    // 확정 API는 사진 하나를 통째로 받고 공종이 빈 항목이 있으면 400이라, 아직 못 보낸다
    if (needsReview(photo)) waiting.current.delete(photo.id)
    else waiting.current.set(photo.id, photo)
  }

  /**
   * 포커스가 사진 밖으로 나갔을 때 — 고친 값이 있으면 그 사진 한 장을 올린다.
   *
   * 엑셀이 칸을 벗어날 때 값을 확정하는 것과 같다. 같은 사진 안에서 칸을 오가는 동안은
   * 아무것도 보내지 않으므로, 사진 한 장에 호출은 한 번이다.
   * 확인할 칸이 남은 사진은 `waiting`에 들어가지 않아 여기서도 걸러진다.
   */
  async function leave(photo: Photo) {
    const edited = waiting.current.get(photo.id)
    if (!edited) return

    waiting.current.delete(photo.id)
    setSaving(true)
    await confirm(edited)
    setSaving(false)
    /*
     * 화면에 걸린 목록은 다시 받지 않는다(`refetchType: 'none'`) — 검수 탭은 확인할
     * 칸이 남은 사진만 주므로, 방금 끝낸 사진이 목록에서 빠지면 화면이 밀린다.
     * 목록은 탭·페이지·작업일을 옮길 때 새로 받는다.
     * 대신 사진 데이터를 상한 것으로 표시해, 집계로 넘어가면 새 숫자가 나오게 한다.
     */
    queryClient.invalidateQueries({ queryKey: queryKeys.photos(projectId), refetchType: 'none' })
    queryClient.invalidateQueries({ queryKey: queryKeys.photoSummary(projectId, workDate) })
  }

  /**
   * 표준 사진대지 엑셀을 받는다.
   *
   * **서버가 만든다.** 사진이 삽입되고 셀이 병합된 원장이라 브라우저가 만들 물건이 아니다.
   *
   * 담기는 것은 **검수 확정된 사진 전부**다 — 화면에서 고른 작업일은 반영되지 않는다.
   * 엔드포인트가 projectId만 받기 때문이다.
   */
  async function downloadExcel() {
    setExporting(true)
    try {
      const projectName = project?.name ?? projectId
      await downloadSheetExcel(projectId, `사진대지_${projectName}.xlsx`)
    } catch {
      message.error('파일을 받지 못했습니다. 다시 시도해주세요.')
    } finally {
      setExporting(false)
    }
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
            ...workDateOptions(summary?.workDates ?? []),
          ]}
        />
        <Typography.Text type="secondary">
          {view === 'review'
            ? '노란 칸을 채우면 그 사진은 바로 집계로 넘어갑니다'
            : '여기 있는 사진이 집계와 엑셀에 들어갑니다'}
        </Typography.Text>
      </Flex>
      <Flex align="center" gap={12}>
        <Typography.Text type="secondary">Tab·방향키로 칸 이동, Enter로 아래 칸</Typography.Text>
        {/* 내보내기는 작업일 필터를 따르므로 필터와 같은 줄에 둔다 */}
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          loading={exporting}
          onClick={downloadExcel}
        >
          엑셀 내려받기
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

  /** 사진은 있는데 이 탭에는 없을 때 — 어디를 보면 되는지 알려준다 */
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
    if (view === 'review') {
      return '확인이 필요한 사진이 없습니다. 사진대지 탭에 다 들어가 있습니다.'
    }
    return '손볼 것이 없는 사진이 아직 없습니다. 검수 탭에서 노란 칸을 채우면 여기로 넘어옵니다.'
  }

  const body = (
    <Flex vertical gap={12}>
      {filters}
      {current.length === 0 ? (
        !isLoading && <Empty description={emptyDescription()} />
      ) : (
        <>
          {pager}
          <PhotoSheetGrid
            photos={current}
            trades={trades}
            onChange={edit}
            onLeave={leave}
            renderPhotoExtra={(photo) => (
              <Flex align="center" justify="space-between" gap={4}>
                {/* 표시가 없는 사진도 삭제는 오른쪽에 붙어 있어야 줄이 흔들리지 않는다 */}
                <span>
                  <ReviewMark photo={photo} />
                </span>
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

  return (
    <Flex vertical gap={12}>
      <Flex justify="space-between" align="center" gap={16}>
        <Flex align="baseline" gap={12}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            사진대지
          </Typography.Title>
          {counts.photos > 0 && (
            <Typography.Text type="secondary">
              사진 {counts.photos}장{counts.failed > 0 && ` · 분석 실패 ${counts.failed}장`}
            </Typography.Text>
          )}
        </Flex>

        <Flex align="center" gap={8}>
          {/* 못 올린 편집분은 브라우저에만 있다. 몇 장이 떠 있는지 늘 보이게 둔다 */}
          {unsent > 0 ? (
            <Tooltip title="확인이 필요한 칸을 다 채우면 그때 저장됩니다">
              <Typography.Text type="warning">확인 필요 {unsent}장 · 저장 전</Typography.Text>
            </Tooltip>
          ) : (
            <Typography.Text type="secondary">{saving ? '저장 중' : '저장됨'}</Typography.Text>
          )}
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

      {counts.photos === 0 ? (
        !isLoading && <Empty description={emptyDescription()} />
      ) : (
        <Tabs
          activeKey={view}
          onChange={(key) => refilter(() => setPicked(key as PhotoScope))}
          items={[
            {
              key: 'review',
              label: `검수 ${counts.needsReview}`,
              // 보고 있는 탭에만 표를 건다 — 두 벌을 띄우면 입력칸이 두 배로 붙는다
              children: view === 'review' ? body : null,
            },
            {
              key: 'sheet',
              label: `사진대지 ${counts.sheet}`,
              children: view === 'sheet' ? body : null,
            },
          ]}
        />
      )}
    </Flex>
  )
}

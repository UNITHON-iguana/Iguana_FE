import { useCallback, useRef, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Empty, Flex, Tabs, Tag, Typography } from 'antd'
import { useParams } from 'react-router'

import { getWorkComparison } from '@/api/comparison'
import {
  addPlanWorkItem,
  getPlanWorkItems,
  planRowBlocker,
  removePlanWorkItem,
  savePlanWorkItem,
} from '@/api/plans'
import { queryKeys } from '@/api/queryKeys'
import { getWorkTypes } from '@/api/workTypes'
import { numberColumn } from '@/components/columns'
import { DataTable } from '@/components/DataTable'
import { PlanItemTable } from '@/features/plan/PlanItemTable'
import { reason } from '@/lib/api'
import { useRowAutosave } from '@/lib/useRowAutosave'
import { COMPARE_STATUS_LABEL } from '@/lib/constants'
import type { CompareStatus, ComparisonRow, PlanWorkItem } from '@/types'

const STATUS_COLOR: Record<CompareStatus, string> = {
  match: 'success',
  over: 'error',
  under: 'warning',
  insufficient: 'default',
}

/** 아직 서버에 없는 줄의 id 앞머리. 서버 id는 정수라 겹치지 않는다 */
const NEW_ROW = 'new_'

function StatusTag({ status }: { status: CompareStatus }) {
  return <Tag color={STATUS_COLOR[status]}>{COMPARE_STATUS_LABEL[status]}</Tag>
}

/** 계획이 없으면 차이를 말하지 않는다 — 없는 값은 추정하지 않는다 */
function diff(row: ComparisonRow) {
  if (row.plannedQuantity === 0) return '-'
  const value = row.actualQuantity - row.plannedQuantity
  return value > 0 ? `+${value}` : String(value)
}

/**
 * 계획 — 계획 공정 입력과 계획 대비 현황을 한 페이지에 둔다.
 *
 * 둘은 같은 데이터를 넣고 꺼내 보는 관계라 화면을 오갈 이유가 없다.
 * 사진대지 흐름에는 없어도 되는 곁가지여서 메뉴에서도 아래쪽에 둔다.
 *
 * **엑셀 업로드는 받지 않는다.** 계획 양식이 현장·발주처마다 제각각이라
 * 파일을 읽어 맞추는 것보다 필요한 줄을 표에서 직접 넣는 편이 빠르다.
 *
 * **자재는 다루지 않는다.** 서버가 자재 실적을 따로 재지 않고 확정된 작업 수량을
 * 자재 사용량으로 갈음해서, 계획 자재(EA)와 시공 물량(개소)을 나눈 비율이 나온다.
 * 숫자는 나오지만 뜻이 없어 계획도 비교도 공정만 남겼다.
 */
export function PlanPage() {
  const { projectId = '' } = useParams()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  /** 아직 서버에 없는 줄. 칸이 다 차고 손을 뗄 때 등록되고 여기서 빠진다 */
  const [drafts, setDrafts] = useState<PlanWorkItem[]>([])
  /** 서버 줄의 저장되지 않은 편집분. 서버 값 위에 덮어 쓴다 */
  const [edits, setEdits] = useState<Record<string, PlanWorkItem>>({})

  /** 등록 요청이 나가 있는 줄. 같은 줄이 두 번 등록되지 않게 붙든다 */
  const posting = useRef(new Set<string>())
  /** 등록이 도는 동안에도 사람은 계속 친다. 마지막 값을 여기 담아둔다 */
  const draftLatest = useRef(new Map<string, PlanWorkItem>())

  const { data: items = [], isLoading } = useQuery({
    queryKey: queryKeys.planWork(projectId),
    queryFn: () => getPlanWorkItems(projectId),
  })
  const { data: rows = [], isLoading: comparing } = useQuery({
    queryKey: queryKeys.workComparison(projectId),
    queryFn: () => getWorkComparison(projectId),
  })
  /* 공종 칸이 고르는 목록. 서버가 공종을 id로 받아 이름만으로는 저장할 수 없다 */
  const { data: workTypes = [], isLoading: loadingWorkTypes } = useQuery({
    queryKey: queryKeys.workTypes(projectId),
    queryFn: () => getWorkTypes(projectId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.planWork(projectId) })
    // 계획이 바뀌면 계획 대비 현황도 같이 바뀐다
    queryClient.invalidateQueries({ queryKey: queryKeys.workComparison(projectId) })
  }

  /* `useRowAutosave`는 렌더마다 같은 참조를 요구한다 — 매번 새로 만들면 저장이 앞당겨 나간다 */
  const save = useRowAutosave<PlanWorkItem>(
    useCallback((item: PlanWorkItem) => savePlanWorkItem(projectId, item), [projectId]),
    // 실패한 편집은 훅이 도로 붙들어 둔다. 여기서는 왜 못 나갔는지만 밝힌다
    (error) => message.error(reason(error, '줄을 저장하지 못했습니다. 잠시 뒤 다시 시도해주세요.')),
  )

  const { mutate: create } = useMutation({
    mutationFn: (item: PlanWorkItem) => addPlanWorkItem(projectId, item),
    onSuccess: (created, sent) => {
      /*
       * 등록이 도는 동안 사람이 더 쳤으면 그 값이 사라진다.
       * `change`가 줄마다 새 객체를 만드니, 참조가 그대로면 바뀐 게 없다는 뜻이다.
       */
      const latest = draftLatest.current.get(sent.id)
      if (latest && latest !== sent) {
        const merged = { ...latest, id: created.id, workTypeId: created.workTypeId }
        setEdits((prev) => ({ ...prev, [created.id]: merged }))
        // 등록을 기다리는 동안 손은 이미 이 줄을 떠났을 수 있다. 붙들지 말고 지금 보낸다
        save.edit(merged)
        save.leave(merged)
      }
      setDrafts((prev) => prev.filter((draft) => draft.id !== sent.id))
      draftLatest.current.delete(sent.id)
      invalidate()
    },
    onError: (error) =>
      message.error(reason(error, '줄을 등록하지 못했습니다. 잠시 뒤 다시 시도해주세요.')),
    onSettled: (_data, _error, sent) => posting.current.delete(sent.id),
  })

  const { mutate: remove } = useMutation({
    mutationFn: (id: string) => removePlanWorkItem(projectId, id),
    onSuccess: invalidate,
    onError: () => message.error('줄을 지우지 못했습니다. 다시 시도해주세요.'),
  })

  /**
   * 값이 바뀐 줄 하나 — 화면에만 얹고 아무것도 보내지 않는다.
   *
   * 이 함수는 글자 한 자마다 불린다. 여기서 보내면 `지하2층`을 치는 동안 요청이
   * 다섯 번 나가고, 실패하는 줄이면 실패도 다섯 번 알린다.
   * 보내는 시점은 그 줄에서 손을 뗄 때 하나다(`leave`).
   */
  function change(item: PlanWorkItem) {
    if (!item.id.startsWith(NEW_ROW)) {
      setEdits((prev) => ({ ...prev, [item.id]: item }))
      save.edit(item)
      return
    }

    setDrafts((prev) => prev.map((draft) => (draft.id === item.id ? item : draft)))
    // 등록이 도는 동안 이어 친 값도 잃지 않게 마지막 값을 쥔다
    draftLatest.current.set(item.id, item)
  }

  /**
   * 그 줄에서 손을 뗐다 — 값이 여문 시점이다.
   *
   * 서버에 있는 줄은 고친 것이 있으면 지금 보낸다.
   * 아직 없는 줄은 **다섯 칸이 다 찼을 때** 등록한다 — 서버가 위치·작업내용·수량·단위를
   * 공종과 함께 전부 필수로 받아서(`planRowBlocker`), 공종만 고른 줄을 보내면 400이다.
   * 덜 찬 줄은 조용히 화면에 남는다. 무엇이 모자란지는 줄 앞의 표시가 말한다.
   */
  function leave(item: PlanWorkItem) {
    if (!item.id.startsWith(NEW_ROW)) {
      save.leave(item)
      return
    }
    if (planRowBlocker(item) || posting.current.has(item.id)) return
    posting.current.add(item.id)
    create(item)
  }

  /**
   * 이 줄이 아직 서버에 닿지 못하는 이유. 없으면 null.
   *
   * 화면에 값이 보이는 것과 서버에 저장된 것은 다르다. 등록이든 수정이든 같은 조건에서
   * 400이라, 이미 등록된 줄에서 위치를 지운 경우에도 똑같이 알린다.
   */
  function warning(item: PlanWorkItem): string | null {
    const blocker = planRowBlocker(item)
    if (!blocker) return null
    return item.id.startsWith(NEW_ROW)
      ? `아직 등록되지 않았습니다 — ${blocker}`
      : `이대로는 저장되지 않습니다 — ${blocker}`
  }

  function removeRow(id: string) {
    if (id.startsWith(NEW_ROW)) {
      setDrafts((prev) => prev.filter((draft) => draft.id !== id))
      draftLatest.current.delete(id)
      return
    }
    remove(id)
  }

  function addRow() {
    setDrafts((prev) => [
      ...prev,
      {
        id: `${NEW_ROW}${Date.now()}`,
        location: '',
        workTypeId: null,
        workType: '',
        description: '',
        quantity: null,
        unit: null,
      },
    ])
  }

  /** 편집분을 덮어쓴 서버 줄 + 아직 등록 전인 줄 */
  const current = [...items.map((item) => edits[item.id] ?? item), ...drafts]

  const insufficient = rows.filter((row) => row.status === 'insufficient').length

  return (
    <Flex vertical gap={16}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        계획
      </Typography.Title>

      {/* 아직 안 온 것을 없다고 말하지 않는다 — 불러오는 동안은 아무 말도 하지 않는다 */}
      {!isLoading && items.length === 0 && (
        <Alert
          type="warning"
          showIcon
          title="계획 데이터가 없습니다"
          description="계획 데이터가 없으면 계획 대비 현황을 볼 수 없습니다. 아래 탭에서 줄을 추가해 입력하세요. 사진대지와 집계는 계획 데이터 없이도 사용할 수 있습니다."
        />
      )}

      {!loadingWorkTypes && workTypes.length === 0 && (
        <Alert
          type="info"
          showIcon
          title="등록된 공종이 없습니다"
          description="계획 한 줄은 공종 하나를 가리킵니다. 공종 화면에서 먼저 등록해주세요."
        />
      )}

      <Tabs
        items={[
          {
            key: 'work',
            label: isLoading ? '계획 공정' : `계획 공정 (${items.length})`,
            children: (
              <PlanItemTable
                items={current}
                workTypes={workTypes}
                loading={isLoading}
                emptyText="계획 공정이 없습니다. 줄 추가로 입력하세요."
                onChange={change}
                onLeave={leave}
                warning={warning}
                onRemove={removeRow}
                onAdd={addRow}
              />
            ),
          },
          {
            key: 'work-compare',
            label: '공정 비교',
            children:
              // 표 자체는 `comparing`을 받아 스스로 자리를 깐다. 여기서는 계획 줄이
              // 아직 안 온 사이에 `계획 데이터가 없어`를 띄우지만 않으면 된다
              !isLoading && items.length === 0 ? (
                <Empty description="계획 데이터가 없어 비교할 수 없습니다. 계획 공정을 먼저 입력해주세요." />
              ) : (
                <Flex vertical gap={16}>
                  {insufficient > 0 && (
                    <Alert
                      type="info"
                      showIcon
                      title={`계획이 없는 공종이 ${insufficient}건 있습니다`}
                      description="계획을 적지 않은 공종은 견줄 것이 없어 달성률을 매기지 않습니다."
                    />
                  )}
                  {/*
                    위치·작업내용 열이 없다. 계획은 그 단위로 적지만 실적은 공종까지만
                    되짚을 수 있어 서버가 공종으로 합쳐서 준다.
                  */}
                  <DataTable<ComparisonRow>
                    rowKey="workTypeId"
                    loading={comparing}
                    dataSource={rows}
                    columns={[
                      { title: '공종', dataIndex: 'workTypeName' },
                      numberColumn<ComparisonRow>({
                        title: '계획 수량',
                        dataIndex: 'plannedQuantity',
                      }),
                      numberColumn<ComparisonRow>({
                        title: '확인 수량',
                        dataIndex: 'actualQuantity',
                      }),
                      numberColumn<ComparisonRow>({
                        title: '차이',
                        width: 90,
                        render: (_, row) => diff(row),
                      }),
                      numberColumn<ComparisonRow>({
                        title: '달성률',
                        width: 90,
                        render: (_, row) =>
                          row.plannedQuantity === 0 ? '-' : `${row.achievementRate}%`,
                      }),
                      {
                        title: '단위',
                        dataIndex: 'unit',
                        width: 80,
                        // 공종에 등록된 단위를 서버가 그대로 준다. 안 적어둔 공종은 빈다
                        render: (unit: string | null) => unit ?? '-',
                      },
                      {
                        title: '상태',
                        dataIndex: 'status',
                        width: 140,
                        render: (status: CompareStatus) => <StatusTag status={status} />,
                      },
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

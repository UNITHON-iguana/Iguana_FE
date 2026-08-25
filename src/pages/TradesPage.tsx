import { useState } from 'react'

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Empty, Flex, Input, Popconfirm, Tooltip, Typography } from 'antd'
import { useParams } from 'react-router'

import { getAggregation } from '@/api/aggregation'
import { queryKeys } from '@/api/queryKeys'
import { createTrade, getTrades, removeTrade } from '@/api/trades'
import { DataTable } from '@/components/DataTable'
import { ApiError } from '@/lib/api'
import type { Trade } from '@/types'

/** 이름이 겹치는지 비교하기 전에 공백을 없앤다 — 사람이 친 값이다 */
function squeeze(name: string) {
  return name.replace(/\s/g, '')
}

/**
 * 아직 등록되지 않은 줄.
 *
 * 추가 버튼은 화면에만 줄을 만든다. 이름이 채워지고 칸을 벗어날 때 비로소 등록된다 —
 * 버튼만 누르고 나간 빈 줄이 서버에 남지 않는다.
 */
interface DraftTrade {
  /** 화면에서만 쓰는 키. 서버가 채번한 정수 id와 섞이지 않게 문자열로 둔다 */
  key: string
  name: string
}

type Row = Trade | DraftTrade

function isDraft(row: Row): row is DraftTrade {
  return 'key' in row
}

/**
 * 공종 — 사진대지의 `구 분` 목록.
 *
 * **이름만 등록한다.** 규격은 사진마다 AI가 읽고, 단위는 서버가 정한다 —
 * 규격이 `2000*600`처럼 오면 둘레 연장으로 환산하므로 사람이 미리 고를 수 있는 값이 아니다.
 *
 * **등록한 이름은 고칠 수 없다.** 수정 API를 두지 않기로 했고, 고치려면 지우고 다시 만든다.
 * 그래서 타이핑 중에는 아무것도 보내지 않고 칸을 벗어날 때 한 번만 보낸다 —
 * 중간에 저장하면 `금속`처럼 덜 친 이름이 등록되고 되돌릴 방법이 없다.
 */
export function TradesPage() {
  const { projectId = '' } = useParams()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const {
    data: trades = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.trades(projectId),
    queryFn: () => getTrades(projectId),
  })

  /* 이미 실적이 쌓인 공종을 못 지우게 막으려고 집계를 같이 본다. 화면에 표로 그리지는 않는다 */
  const { data: aggregation } = useQuery({
    queryKey: queryKeys.aggregation(projectId),
    queryFn: () => getAggregation(projectId),
  })

  /**
   * 집계에 물량이 쌓인 공종.
   *
   * 이 공종은 지우지 못하게 막는다 — 이미 올린 사진의 실적이 사라지기 때문이다.
   * **완전한 방어선은 아니다.** 집계는 확정된 사진만 세므로, 검수 중인 사진이 쓰고 있는
   * 공종은 여기 안 잡힌다. 서버도 참조를 보고 거절해주지 않아 이 화면이 유일한 방어선이다.
   */
  const inUse = new Set((aggregation?.rows ?? []).map((row) => row.workTypeId))

  const [drafts, setDrafts] = useState<DraftTrade[]>([])

  /**
   * 등록 요청이 나가 있는 임시 줄.
   *
   * 보내는 동안 그 칸을 잠근다 — 이름을 고칠 API가 없어서, 요청이 도는 사이에 이어 친
   * 글자는 서버에 닿지 못하면서 화면에서만 사라진다. 잠그면 그 어긋남이 아예 없다.
   */
  const [sending, setSending] = useState<string[]>([])

  /** 공종이 바뀌면 그 이름으로 묶인 집계도 다시 받아야 한다 */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.trades(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.aggregation(projectId) })
  }

  const { mutate: create } = useMutation({
    mutationFn: (draft: DraftTrade) => createTrade(projectId, draft.name.trim()),
    onMutate: (draft) => setSending((prev) => [...prev, draft.key]),
    onSuccess: (_created, draft) => {
      setDrafts((prev) => prev.filter((row) => row.key !== draft.key))
      invalidate()
    },
    onError: (error, draft) => {
      // 실패한 줄은 화면에 그대로 둔다 — 사람이 친 이름을 지워버리지 않는다
      message.error(
        error instanceof ApiError && error.status === 409
          ? `이미 등록된 공종입니다 — ${draft.name.trim()}`
          : '공종을 등록하지 못했습니다. 다시 시도해주세요.',
      )
    },
    onSettled: (_created, _error, draft) => {
      setSending((prev) => prev.filter((key) => key !== draft.key))
    },
  })

  const { mutate: remove } = useMutation({
    mutationFn: (workTypeId: number) => removeTrade(projectId, workTypeId),
    onSuccess: invalidate,
    onError: () => message.error('공종을 지우지 못했습니다. 다시 시도해주세요.'),
  })

  const registered = new Set(trades.map((trade) => squeeze(trade.name)))

  /** 이 임시 줄의 이름을 지금 등록할 수 있는지 */
  function collides(draft: DraftTrade): boolean {
    const name = squeeze(draft.name)
    if (!name) return false
    if (registered.has(name)) return true
    // 임시 줄끼리도 겹칠 수 있다. 먼저 만든 줄이 이긴다
    return drafts.some((row) => row.key !== draft.key && squeeze(row.name) === name)
  }

  /**
   * 칸을 벗어날 때 등록한다.
   *
   * 이름이 비었으면 아무것도 보내지 않고 줄만 화면에 남긴다 —
   * 잠깐 다른 곳을 봤다고 방금 만든 줄이 사라지면 놀란다.
   */
  function commit(draft: DraftTrade) {
    if (!draft.name.trim() || sending.includes(draft.key)) return
    if (collides(draft)) {
      // 칸이 빨개지는 것만으로는 부족하다 — 손을 뗀 순간 초점도 같이 떠나 있다
      message.error(`이미 있는 공종 이름입니다 — ${draft.name.trim()}`)
      return
    }
    create(draft)
  }

  function editDraft(key: string, name: string) {
    setDrafts((prev) => prev.map((row) => (row.key === key ? { ...row, name } : row)))
  }

  const rows: Row[] = [...trades, ...drafts]

  return (
    <Flex vertical gap={16}>
      <Flex align="baseline" gap={12}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          공종
        </Typography.Title>
        <Typography.Text type="secondary">
          사진대지의 `구 분`에서 고르는 목록입니다. 규격은 사진마다 AI가 읽습니다
        </Typography.Text>
      </Flex>

      {/* 못 불러온 것과 등록된 게 없는 것은 다르다. 빈 표로 뭉뚱그리면 서버가 죽은 줄 모른다 */}
      {isError && (
        <Alert
          type="error"
          showIcon
          title="공종 목록을 불러오지 못했습니다"
          description="잠시 뒤 다시 시도해주세요. 계속 안 되면 서버 상태를 확인해주세요."
          action={
            <Button size="small" onClick={() => void refetch()}>
              다시 시도
            </Button>
          }
        />
      )}

      <DataTable<Row>
        rowKey={(row) => (isDraft(row) ? row.key : String(row.id))}
        loading={isLoading}
        dataSource={rows}
        locale={{
          emptyText: <Empty description="등록된 공종이 없습니다. 공종 추가로 입력하세요." />,
        }}
        columns={[
          {
            title: '공종명',
            render: (_, row) =>
              isDraft(row) ? (
                <Tooltip
                  title={collides(row) ? '이미 있는 이름입니다. 다른 이름을 지어주세요' : ''}
                >
                  <Input
                    autoFocus
                    variant="borderless"
                    size="small"
                    placeholder="금속관벽체"
                    status={collides(row) ? 'error' : undefined}
                    disabled={sending.includes(row.key)}
                    value={row.name}
                    onChange={(event) => editDraft(row.key, event.target.value)}
                    // 확정은 한 곳에서만 일어난다 — Enter도 칸을 벗어나는 것으로 처리한다
                    onPressEnter={(event) => event.currentTarget.blur()}
                    onBlur={() => commit(row)}
                  />
                </Tooltip>
              ) : (
                row.name
              ),
          },
          {
            title: '',
            width: 48,
            render: (_, row) => {
              if (isDraft(row)) {
                return (
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label="줄 지우기"
                    onClick={() => setDrafts((prev) => prev.filter((r) => r.key !== row.key))}
                  />
                )
              }

              return inUse.has(row.id) ? (
                <Tooltip title="집계된 물량이 있어 지울 수 없습니다. 사진대지에서 이 공종을 쓴 줄을 먼저 고쳐주세요.">
                  {/* disabled 버튼은 마우스 이벤트를 안 받아 툴팁이 안 뜬다 — 감싸는 span이 받는다 */}
                  <span>
                    <Button type="text" size="small" disabled icon={<DeleteOutlined />} />
                  </span>
                </Tooltip>
              ) : (
                <Popconfirm
                  title={`${row.name}을 지웁니다`}
                  description="아직 집계된 물량은 없습니다. 검수 중인 사진이 쓰고 있으면 그 줄이 집계에 들어오지 못합니다."
                  okText="삭제"
                  cancelText="취소"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => remove(row.id)}
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              )
            },
          },
        ]}
      />

      <Flex align="center" gap={12}>
        <Button
          icon={<PlusOutlined />}
          onClick={() => setDrafts((prev) => [...prev, { key: crypto.randomUUID(), name: '' }])}
        >
          공종 추가
        </Button>
        <Typography.Text type="secondary">
          이름을 입력하고 칸을 벗어나면 등록됩니다. 등록한 이름은 고칠 수 없어 지우고 다시 추가해야
          합니다
        </Typography.Text>
      </Flex>
    </Flex>
  )
}

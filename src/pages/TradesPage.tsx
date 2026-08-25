import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Empty, Flex, Input, Popconfirm, Tooltip, Typography } from 'antd'
import { useParams } from 'react-router'

import { getAggregation } from '@/api/aggregation'
import { queryKeys } from '@/api/queryKeys'
import { addTrade, getTrades, removeTrade, saveTrade } from '@/api/trades'
import { DataTable } from '@/components/DataTable'
import { useRowAutosave } from '@/lib/useRowAutosave'
import type { Trade } from '@/types'

/** 이름이 겹치는지 비교하기 전에 공백을 없앤다 — 사람이 친 값이다 */
function squeeze(name: string) {
  return name.replace(/\s/g, '')
}

/**
 * 공종 — 사진대지의 `구 분` 목록.
 *
 * **이름만 등록한다.** 규격은 사진마다 AI가 읽고, 단위는 서버가 정한다 —
 * 규격이 `2000*600`처럼 오면 둘레 연장으로 환산하므로 사람이 미리 고를 수 있는 값이 아니다.
 *
 * 이름이 겹치면 서버가 409로 거르므로 화면에서 미리 짚어준다.
 */
export function TradesPage() {
  const { projectId = '' } = useParams()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const { data: trades = [], isLoading } = useQuery({
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
   * 공종은 여기 안 잡힌다. 서버가 참조를 보고 거절해줘야 한다.
   */
  const inUse = new Set((aggregation?.rows ?? []).map((row) => row.workTypeId))

  /** 공종이 바뀌면 그 이름으로 묶인 집계도 다시 받아야 한다 */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.trades(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.aggregation(projectId) })
  }

  const autosave = useRowAutosave<Trade>(saveTrade)

  const { mutate: add, isPending: adding } = useMutation({
    mutationFn: () => addTrade(projectId),
    onSuccess: invalidate,
    onError: () => message.error('공종을 추가하지 못했습니다. 다시 시도해주세요.'),
  })

  const { mutate: remove } = useMutation({
    mutationFn: removeTrade,
    onSuccess: invalidate,
    onError: () => message.error('공종을 지우지 못했습니다. 다시 시도해주세요.'),
  })

  /** 편집분을 바로 화면에 반영하고 저장은 예약한다 */
  function edit(trade: Trade) {
    queryClient.setQueryData<Trade[]>(queryKeys.trades(projectId), (prev) =>
      prev?.map((item) => (item.id === trade.id ? trade : item)),
    )
    autosave(trade)
  }

  /** 이름이 두 번 이상 나오는 공종 */
  const duplicated = new Set(
    trades
      .map((trade) => squeeze(trade.name))
      .filter((name, index, all) => name && all.indexOf(name) !== index),
  )
  const unnamed = trades.filter((trade) => !trade.name.trim()).length

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

      {duplicated.size > 0 && (
        <Alert
          type="error"
          showIcon
          title={`이름이 겹치는 공종이 있습니다 — ${[...duplicated].join(', ')}`}
          description="같은 프로젝트 안에서 공종 이름은 하나여야 합니다. 겹친 줄은 저장되지 않습니다."
        />
      )}

      {unnamed > 0 && (
        <Alert
          type="info"
          showIcon
          title={`이름이 비어 있는 줄이 ${unnamed}개 있습니다`}
          description="이름이 없으면 사진대지에서 고를 수 없습니다."
        />
      )}

      <DataTable<Trade>
        rowKey="id"
        loading={isLoading}
        dataSource={trades}
        locale={{
          emptyText: <Empty description="등록된 공종이 없습니다. 공종 추가로 입력하세요." />,
        }}
        columns={[
          {
            title: '공종명',
            dataIndex: 'name',
            render: (_, row) => (
              <Input
                variant="borderless"
                size="small"
                placeholder="금속관벽체"
                status={duplicated.has(squeeze(row.name)) ? 'error' : undefined}
                value={row.name}
                onChange={(event) => edit({ ...row, name: event.target.value })}
              />
            ),
          },
          {
            title: '',
            width: 48,
            render: (_, row) =>
              inUse.has(row.id) ? (
                <Tooltip title="집계된 물량이 있어 지울 수 없습니다. 사진대지에서 이 공종을 쓴 줄을 먼저 고쳐주세요.">
                  {/* disabled 버튼은 마우스 이벤트를 안 받아 툴팁이 안 뜬다 — 감싸는 span이 받는다 */}
                  <span>
                    <Button type="text" size="small" disabled icon={<DeleteOutlined />} />
                  </span>
                </Tooltip>
              ) : (
                <Popconfirm
                  title={`${row.name || '이름 없는 공종'}을 지웁니다`}
                  description="아직 집계된 물량은 없습니다. 검수 중인 사진이 쓰고 있으면 그 줄이 집계에 들어오지 못합니다."
                  okText="삭제"
                  cancelText="취소"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => remove(row.id)}
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              ),
          },
        ]}
      />

      <div>
        <Button icon={<PlusOutlined />} loading={adding} onClick={() => add()}>
          공종 추가
        </Button>
      </div>
    </Flex>
  )
}

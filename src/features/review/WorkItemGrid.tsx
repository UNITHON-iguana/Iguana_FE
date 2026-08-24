import { useRef, useState } from 'react'

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Flex, Typography } from 'antd'

import { DataTable } from '@/components/DataTable'
import type { WorkItem } from '@/types'

import styles from './WorkItemGrid.module.css'

/** 셀 편집 순서 — 좌에서 우로, 키보드 이동도 이 순서를 따른다 */
const FIELDS = ['category', 'description', 'spec', 'quantity'] as const
type Field = (typeof FIELDS)[number]

export interface WorkItemGridProps {
  items: WorkItem[]
  onChange: (items: WorkItem[]) => void
  /** '행 추가'가 쓸 빈 행을 만든다 */
  createItem: () => WorkItem
}

/**
 * 사진 한 장의 작업 항목을 엑셀처럼 편집한다.
 *
 * - 셀에 항상 입력칸이 깔려 있어 클릭하면 바로 타이핑된다
 * - Tab / Shift+Tab 은 브라우저 기본 순서를 그대로 쓴다
 * - Enter와 위아래 방향키로 위아래 셀로 이동한다
 * - 좌우 방향키는 커서가 글자 끝에 닿았을 때만 옆 셀로 넘어간다
 * - 행 추가는 '행 추가' 버튼으로만 한다 — 방향키로는 늘어나지 않는다
 */
export function WorkItemGrid({ items, onChange, createItem }: WorkItemGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  /*
   * 수량 칸에 입력 중인 원문.
   *
   * 모델은 수량을 number로 들고 있는데 '12.' 는 Number()를 거치면 12가 되어
   * 방금 찍은 소수점이 화면에서 사라진다. 그래서 편집 중인 칸 하나만
   * 사용자가 친 문자열 그대로 붙들고 있다가, 칸을 벗어나면 놓는다.
   */
  const [typingQuantity, setTypingQuantity] = useState<{ id: string; text: string } | null>(null)

  /**
   * data-row 는 items 배열의 인덱스다.
   * 이 표에 정렬이나 페이지네이션을 켜면 인덱스와 화면 행이 어긋나
   * 방향키가 엉뚱한 칸으로 간다 — 에러 없이 조용히 깨지니 켜지 말 것.
   */
  function focusCell(row: number, col: number) {
    const selector = `input[data-row="${row}"][data-col="${col}"]`
    containerRef.current?.querySelector<HTMLInputElement>(selector)?.focus()
  }

  function updateItem(id: string, patch: Partial<WorkItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function addRow() {
    onChange([...items, createItem()])
  }

  function moveVertical(row: number, col: number, delta: number) {
    const next = row + delta
    // 끝에 닿으면 멈춘다. 행 추가는 '행 추가' 버튼으로만 한다
    if (next < 0 || next >= items.length) return
    focusCell(next, col)
  }

  function moveHorizontal(row: number, col: number, delta: number) {
    const next = col + delta
    if (next < 0 || next >= FIELDS.length) return
    focusCell(row, next)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    if (target.tagName !== 'INPUT') return

    /*
     * 한글 입력 중에는 방향키와 Enter가 IME 조합을 확정하는 데 먼저 쓰인다.
     * 이때 셀을 옮기면 조합 중이던 글자가 날아가므로 넘긴다.
     * 사용자는 조합이 끝난 뒤 한 번 더 누르게 되고, 그때 이동한다.
     */
    if (event.nativeEvent.isComposing) return

    const row = Number(target.dataset.row)
    const col = Number(target.dataset.col)
    if (Number.isNaN(row) || Number.isNaN(col)) return

    /*
     * 옛 키 이름(Down, Up, Left, Right, Esc)도 함께 받는다.
     * 방향키가 동작하지 않던 문제를 잡을 때 넣은 방어 코드인데, 원인이
     * IME 조합이었는지 키 이름이었는지 끝내 가리지 못했다.
     * 표준 이름만으로 충분하다는 게 확인되면 지워도 된다.
     */
    const key = event.key

    if (key === 'Enter' || key === 'ArrowDown' || key === 'Down') {
      event.preventDefault()
      moveVertical(row, col, 1)
      return
    }
    if (key === 'ArrowUp' || key === 'Up') {
      event.preventDefault()
      moveVertical(row, col, -1)
      return
    }

    /*
     * 좌우는 칸 안의 글자를 오갈 때도 쓰이므로, 커서가 글자 끝에 닿았을 때만
     * 옆 칸으로 넘어간다. 글자 중간에서는 평소처럼 커서만 움직인다.
     */
    const input = target as HTMLInputElement
    const caret = input.selectionStart
    const hasRange = input.selectionStart !== input.selectionEnd

    if (key === 'ArrowLeft' || key === 'Left') {
      if (hasRange || caret !== 0) return
      event.preventDefault()
      moveHorizontal(row, col, -1)
      return
    }
    if (key === 'ArrowRight' || key === 'Right') {
      if (hasRange || caret !== input.value.length) return
      event.preventDefault()
      moveHorizontal(row, col, 1)
      return
    }

    if (key === 'Escape' || key === 'Esc') {
      target.blur()
    }
  }

  /**
   * 입력칸이 셀을 꽉 채우도록 antd 셀의 안쪽 여백을 없앤다.
   * CSS로는 antd 선택자의 명시도에 밀려서 인라인 스타일로 지정한다.
   */
  const flushCell = { onCell: () => ({ style: { padding: 0 } }) }

  function cell(field: Field, placeholder?: string) {
    const col = FIELDS.indexOf(field)
    const isNumber = field === 'quantity'

    return (value: WorkItem[Field], row: WorkItem, index: number) => {
      const typing = isNumber && typingQuantity?.id === row.id ? typingQuantity.text : null

      return (
        <input
          className={isNumber ? `${styles.cell} ${styles.number}` : styles.cell}
          data-row={index}
          data-col={col}
          value={typing ?? value ?? ''}
          // type="number"를 쓰지 않는다 — selectionStart가 막혀 좌우 화살표 이동이 깨진다
          type="text"
          placeholder={placeholder}
          // 수량은 숫자만 받되, 지우면 0이 아니라 빈 값으로 둔다
          inputMode={isNumber ? 'numeric' : undefined}
          onChange={(event) => {
            const raw = event.target.value
            if (!isNumber) {
              updateItem(row.id, { [field]: raw || null })
              return
            }
            /*
             * 자재 수량은 면적(m²)이나 길이(m)라 소수가 흔하다.
             * 입력 도중의 '12.' 같은 미완성 상태도 통과시켜야 소수점을 찍을 수 있다.
             */
            if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return
            setTypingQuantity({ id: row.id, text: raw })
            const parsed = Number(raw)
            updateItem(row.id, {
              quantity: raw === '' || Number.isNaN(parsed) ? null : parsed,
            })
          }}
          onBlur={() => {
            if (isNumber) setTypingQuantity(null)
          }}
        />
      )
    }
  }

  return (
    <Flex vertical gap={8}>
      <Flex justify="space-between" align="center">
        <Typography.Text strong>작업 항목</Typography.Text>
        <Flex align="center" gap={12}>
          <Typography.Text type="secondary">Tab·방향키로 칸 이동, Enter로 아래 칸</Typography.Text>
          <Button size="small" icon={<PlusOutlined />} onClick={addRow}>
            행 추가
          </Button>
        </Flex>
      </Flex>

      <div ref={containerRef} onKeyDown={handleKeyDown}>
        <DataTable<WorkItem>
          rowKey="id"
          dataSource={items}
          columns={[
            { title: '구분', dataIndex: 'category', render: cell('category'), ...flushCell },
            {
              title: '작업내용',
              dataIndex: 'description',
              render: cell('description'),
              ...flushCell,
            },
            {
              title: '규격',
              dataIndex: 'spec',
              width: 120,
              render: cell('spec', '800*400'),
              ...flushCell,
            },
            {
              title: '수량',
              dataIndex: 'quantity',
              width: 90,
              render: cell('quantity'),
              ...flushCell,
            },
            {
              title: '',
              width: 40,
              render: (_, row) => (
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onChange(items.filter((item) => item.id !== row.id))}
                />
              ),
            },
          ]}
        />
      </div>
    </Flex>
  )
}

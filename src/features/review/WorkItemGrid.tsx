import { useEffect, useRef } from 'react'

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
  /** 새 빈 행을 만든다. 마지막 행에서 아래로 이동하면 자동으로 호출된다 */
  createItem: () => WorkItem
}

/**
 * 사진 한 장의 작업 항목을 엑셀처럼 편집한다.
 *
 * - 셀에 항상 입력칸이 깔려 있어 클릭하면 바로 타이핑된다
 * - Tab / Shift+Tab 은 브라우저 기본 순서를 그대로 쓴다
 * - Enter, 위아래 방향키로 같은 열의 위아래 셀로 이동한다
 * - 마지막 행에서 아래로 가면 행이 새로 생긴다
 */
export function WorkItemGrid({ items, onChange, createItem }: WorkItemGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  /**
   * 행을 새로 만든 직후 그 셀로 포커스를 옮기기 위한 예약.
   * 렌더 결과가 아니라 DOM 조작 대상이라 state가 아닌 ref로 둔다.
   */
  const pendingFocusRef = useRef<{ row: number; col: number } | null>(null)

  // 행이 추가되어 새 입력칸이 DOM에 붙은 뒤에 포커스를 옮긴다
  useEffect(() => {
    const pending = pendingFocusRef.current
    if (!pending) return
    pendingFocusRef.current = null
    focusCell(pending.row, pending.col)
  }, [items.length])

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
    if (next < 0) return

    // 마지막 행을 넘어가면 새 행을 만들고 거기로 이동한다
    if (next >= items.length) {
      pendingFocusRef.current = { row: next, col }
      addRow()
      return
    }
    focusCell(next, col)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    if (target.tagName !== 'INPUT') return

    const row = Number(target.dataset.row)
    const col = Number(target.dataset.col)
    if (Number.isNaN(row) || Number.isNaN(col)) return

    switch (event.key) {
      case 'Enter':
      case 'ArrowDown':
        event.preventDefault()
        moveVertical(row, col, 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        moveVertical(row, col, -1)
        break
      case 'Escape':
        target.blur()
        break
      default:
        break
    }
  }

  function cell(field: Field, placeholder?: string) {
    const col = FIELDS.indexOf(field)
    const isNumber = field === 'quantity'

    return (value: WorkItem[Field], row: WorkItem, index: number) => (
      <input
        className={isNumber ? `${styles.cell} ${styles.number}` : styles.cell}
        data-row={index}
        data-col={col}
        value={value ?? ''}
        placeholder={placeholder}
        // 수량은 숫자만 받되, 지우면 0이 아니라 빈 값으로 둔다
        inputMode={isNumber ? 'numeric' : undefined}
        onChange={(event) => {
          const raw = event.target.value
          if (!isNumber) {
            updateItem(row.id, { [field]: raw || null })
            return
          }
          if (raw !== '' && !/^\d*$/.test(raw)) return
          updateItem(row.id, { quantity: raw === '' ? null : Number(raw) })
        }}
      />
    )
  }

  return (
    <Flex vertical gap={8}>
      <Flex justify="space-between" align="center">
        <Typography.Text strong>작업 항목</Typography.Text>
        <Flex align="center" gap={12}>
          <Typography.Text type="secondary">
            Tab으로 다음 칸, Enter로 아래 칸. 마지막 줄에서 Enter를 누르면 행이 추가됩니다
          </Typography.Text>
          <Button size="small" icon={<PlusOutlined />} onClick={addRow}>
            행 추가
          </Button>
        </Flex>
      </Flex>

      <div ref={containerRef} className={styles.grid} onKeyDown={handleKeyDown}>
        <DataTable<WorkItem>
          rowKey="id"
          dataSource={items}
          columns={[
            { title: '구분', dataIndex: 'category', render: cell('category') },
            { title: '작업내용', dataIndex: 'description', render: cell('description') },
            { title: '규격', dataIndex: 'spec', width: 120, render: cell('spec', '800*400') },
            { title: '수량', dataIndex: 'quantity', width: 90, render: cell('quantity') },
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

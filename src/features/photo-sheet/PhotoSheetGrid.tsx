import { Fragment, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, DatePicker, Image } from 'antd'
import dayjs from 'dayjs'

import { HEADER_BG, SHEET_CATEGORY_BG, SHEET_SEQ_COLOR } from '@/app/theme'
import { DEFAULT_WORK_ITEM_ROWS, SHEET_ENTRY_SLOTS } from '@/lib/constants'
import { splitToFormRows } from '@/lib/workItems'
import type { Photo, Uncertain, WorkEntry, WorkItem } from '@/types'

import styles from './PhotoSheetGrid.module.css'

/**
 * 한 줄 안에서 칸의 가로 순서는 구분(0) 다음에 규격·수량 쌍이 반복된다.
 * Tab과 좌우 방향키가 이 순서를 따른다.
 */
const LAST_COL = SHEET_ENTRY_SLOTS * 2

/** 사진 아래 '위 치' 줄은 칸이 하나뿐이다 */
const LOCATION_COL = 0

/**
 * 사진 칸 크기.
 * 작업 항목 세 줄 + 위치 줄의 높이와 맞춰, 사진이 양식보다 튀어나오지 않게 한다.
 */
const PHOTO_WIDTH = 168
const PHOTO_HEIGHT = 126

/** 화면에 펼쳐진 줄 하나. 방향키 이동은 이 배열의 인덱스로 계산한다 */
type SheetRow =
  { kind: 'item'; photoIndex: number; itemIndex: number } | { kind: 'location'; photoIndex: number }

function emptyEntry(): WorkEntry {
  return { spec: null, quantity: null }
}

function emptyItem(id: string): WorkItem {
  return { id, category: null, entries: Array.from({ length: SHEET_ENTRY_SLOTS }, emptyEntry) }
}

/**
 * 작업일 칸에 붙일 확인 필요 사유.
 *
 * AI가 자신 없어 한 경우뿐 아니라 **비어 있는 것 자체가 확인 대상이다** —
 * 작업일이 없으면 집계가 어느 열에도 못 넣어 검수 완료로 넘길 수 없다.
 */
function workDateFlag(photo: Photo): string | undefined {
  if (photo.uncertain?.workDate) return photo.uncertain.workDate
  return photo.workDate ? undefined : '작업일을 채워야 검수 완료할 수 있습니다'
}

/** 확인 필요 표시에서 칸 하나를 지운다. 남는 게 없으면 통째로 없앤다 */
function without<K extends string>(
  flags: Uncertain<K> | undefined,
  key: K,
): Uncertain<K> | undefined {
  if (!flags || flags[key] == null) return flags
  const next = { ...flags }
  delete next[key]
  return Object.keys(next).length > 0 ? next : undefined
}

/**
 * 양식이 정한 줄 수·칸 수만큼 빈 칸을 채운다.
 * 항목 개수 자체는 제한하지 않는다 — 모자랄 때만 채운다.
 */
function withFormSlots(photo: Photo): WorkItem[] {
  const items = photo.workItems
    // 칸 수를 넘는 쌍은 옆이 아니라 아래로 흘린다 — 양식이 두 쌍까지만 갖고 있다
    .flatMap((item) => splitToFormRows(item, SHEET_ENTRY_SLOTS))
    .map((item) => {
      const missing = SHEET_ENTRY_SLOTS - item.entries.length
      if (missing <= 0) return item
      return { ...item, entries: [...item.entries, ...Array.from({ length: missing }, emptyEntry)] }
    })

  const padding = Math.max(0, DEFAULT_WORK_ITEM_ROWS - items.length)
  return [
    ...items,
    /*
     * 빈 줄의 id를 사진 id에서 만들어 렌더마다 같은 값이 나오게 한다.
     * 매번 새 id를 만들면 React가 다른 줄로 보고, 입력 중이던 칸의 포커스가 날아간다.
     */
    ...Array.from({ length: padding }, (_, i) => emptyItem(`${photo.id}__blank${i}`)),
  ]
}

export interface PhotoSheetGridProps {
  photos: Photo[]
  /** 값이 바뀐 사진 한 장을 통째로 돌려준다 */
  onChange: (photo: Photo) => void
  /** 사진 칸 아래에 붙일 것 — 검수 체크박스처럼 양식 바깥의 도구는 부모가 넣는다 */
  renderPhotoExtra?: (photo: Photo) => ReactNode
}

/**
 * 사진대지 양식을 화면에서 그대로 편집한다.
 *
 * 원본 엑셀 양식과 같은 구조다 — 사진 한 장에 `구 분 | 값 | 작업내용 | 규격 | 수량` 줄이
 * 여럿 붙고, 그 아래 `위 치` 줄이 하나 붙는다. 사진번호와 사진 칸은 세로로 병합된다.
 * `구 분`·`작업내용`·`위 치`는 양식의 라벨이라 편집하지 않고 포커스도 건너뛴다.
 *
 * 조작은 엑셀을 따른다.
 * - 셀에 항상 입력칸이 깔려 있어 클릭하면 바로 타이핑된다
 * - Tab / Shift+Tab 은 브라우저 기본 순서를 그대로 쓴다
 * - Enter와 위아래 방향키로 위아래 줄로 이동한다 (사진 경계도 그냥 넘어간다)
 * - 좌우 방향키는 커서가 글자 끝에 닿았을 때만 옆 칸으로 넘어간다
 * - 줄 추가는 사진 아래 '줄 추가' 버튼으로만 한다 — 방향키로는 늘어나지 않는다
 *
 * 이 표에 정렬이나 페이지네이션을 붙이면 data-row 인덱스와 화면 줄이 어긋나
 * 방향키가 엉뚱한 칸으로 간다. 사진 목록을 자를 때는 photos를 미리 잘라서 넘긴다.
 */
export function PhotoSheetGrid({ photos, onChange, renderPhotoExtra }: PhotoSheetGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  /*
   * 수량 칸에 입력 중인 원문.
   *
   * 모델은 수량을 number로 들고 있는데 '12.' 는 Number()를 거치면 12가 되어
   * 방금 찍은 소수점이 화면에서 사라진다. 그래서 편집 중인 칸 하나만
   * 사용자가 친 문자열 그대로 붙들고 있다가, 칸을 벗어나면 놓는다.
   */
  const [typing, setTyping] = useState<{ key: string; text: string } | null>(null)

  /** 화면에 실제로 그려지는 줄 — 사진마다 작업 항목 줄들 + 위치 줄 하나 */
  const itemsByPhoto = photos.map(withFormSlots)
  const rows: SheetRow[] = itemsByPhoto.flatMap((items, photoIndex) => [
    ...items.map((_, itemIndex): SheetRow => ({ kind: 'item', photoIndex, itemIndex })),
    { kind: 'location', photoIndex },
  ])

  /** 사진 i의 첫 줄이 rows에서 몇 번째인지 */
  const firstRowOf: number[] = []
  itemsByPhoto.reduce((offset, items, index) => {
    firstRowOf[index] = offset
    return offset + items.length + 1
  }, 0)

  function maxColOf(row: SheetRow) {
    return row.kind === 'item' ? LAST_COL : LOCATION_COL
  }

  function focusCell(row: number, col: number) {
    const selector = `input[data-row="${row}"][data-col="${col}"]`
    containerRef.current?.querySelector<HTMLInputElement>(selector)?.focus()
  }

  function moveVertical(row: number, col: number, delta: number) {
    const next = row + delta
    // 끝에 닿으면 멈춘다. 줄 추가는 '줄 추가' 버튼으로만 한다
    if (next < 0 || next >= rows.length) return
    // 위치 줄은 칸이 하나뿐이라, 오른쪽 칸에서 내려오면 첫 칸으로 붙인다
    focusCell(next, Math.min(col, maxColOf(rows[next])))
  }

  function moveHorizontal(row: number, col: number, delta: number) {
    const next = col + delta
    if (next < 0 || next > maxColOf(rows[row])) return
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

    const key = event.key

    if (key === 'Enter' || key === 'ArrowDown') {
      event.preventDefault()
      moveVertical(row, col, 1)
      return
    }
    if (key === 'ArrowUp') {
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

    if (key === 'ArrowLeft') {
      if (hasRange || caret !== 0) return
      event.preventDefault()
      moveHorizontal(row, col, -1)
      return
    }
    if (key === 'ArrowRight') {
      if (hasRange || caret !== input.value.length) return
      event.preventDefault()
      moveHorizontal(row, col, 1)
      return
    }

    if (key === 'Escape') target.blur()
  }

  /**
   * 사진 한 장의 작업 항목을 통째로 돌려준다.
   * 양식을 채우려고 만든 빈 줄도 함께 넘어간다 — 저장하는 쪽에서 걸러낸다.
   */
  function commitItems(photoIndex: number, items: WorkItem[]) {
    onChange({ ...photos[photoIndex], workItems: items })
  }

  function updateItem(photoIndex: number, itemId: string, patch: Partial<WorkItem>) {
    commitItems(
      photoIndex,
      itemsByPhoto[photoIndex].map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    )
  }

  function updateEntry(
    photoIndex: number,
    itemId: string,
    slot: number,
    patch: Partial<WorkEntry>,
  ) {
    commitItems(
      photoIndex,
      itemsByPhoto[photoIndex].map((item) =>
        item.id === itemId
          ? {
              ...item,
              entries: item.entries.map((entry, i) =>
                i === slot ? { ...entry, ...patch } : entry,
              ),
            }
          : item,
      ),
    )
  }

  /** 텍스트 칸 하나 */
  function textCell(
    row: number,
    col: number,
    value: string | null,
    onInput: (next: string | null) => void,
    placeholder?: string,
  ) {
    return (
      <input
        className={styles.cell}
        data-row={row}
        data-col={col}
        type="text"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(event) => onInput(event.target.value || null)}
      />
    )
  }

  /** 수량 칸 하나 — 입력 중인 소수점을 지키느라 텍스트 칸과 따로 둔다 */
  function numberCell(
    row: number,
    col: number,
    cellKey: string,
    value: number | null,
    onInput: (next: number | null) => void,
  ) {
    const draft = typing?.key === cellKey ? typing.text : null

    return (
      <input
        className={`${styles.cell} ${styles.number}`}
        data-row={row}
        data-col={col}
        // type="number"를 쓰지 않는다 — selectionStart가 막혀 좌우 화살표 이동이 깨진다
        type="text"
        inputMode="numeric"
        value={draft ?? value ?? ''}
        onChange={(event) => {
          const raw = event.target.value
          /*
           * 자재 수량은 면적(m²)이나 길이(m)라 소수가 흔하다.
           * 입력 도중의 '12.' 같은 미완성 상태도 통과시켜야 소수점을 찍을 수 있다.
           */
          if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return
          setTyping({ key: cellKey, text: raw })
          const parsed = Number(raw)
          onInput(raw === '' || Number.isNaN(parsed) ? null : parsed)
        }}
        onBlur={() => setTyping(null)}
      />
    )
  }

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      <table className={styles.sheet}>
        {photos.map((photo, photoIndex) => {
          const items = itemsByPhoto[photoIndex]
          // 사진번호·사진 칸은 작업 항목 줄들 + 위치 줄 전체에 걸친다
          const span = items.length + 1
          const firstRow = firstRowOf[photoIndex]

          return (
            <tbody key={photo.id}>
              {items.map((item, itemIndex) => {
                const row = firstRow + itemIndex
                const categoryFlag = item.uncertain?.category

                return (
                  <tr key={item.id} className={styles.itemRow}>
                    {itemIndex === 0 && (
                      <>
                        <td
                          className={styles.seqCell}
                          rowSpan={span}
                          style={{ color: SHEET_SEQ_COLOR }}
                        >
                          {photo.seq}
                        </td>
                        <td className={styles.photoCell} rowSpan={span}>
                          {/*
                           * 크기를 CSS가 아니라 props로 준다.
                           * antd가 런타임에 넣는 .ant-image-img 규칙이 나중에 붙어
                           * 같은 명시도의 CSS 모듈 클래스를 이긴다.
                           */}
                          <Image
                            className={styles.photo}
                            width={PHOTO_WIDTH}
                            height={PHOTO_HEIGHT}
                            src={photo.croppedUrl ?? photo.originalUrl}
                            preview={{ src: photo.originalUrl }}
                            alt=""
                          />
                          <div className={styles.photoTools}>
                            <span className={styles.fileName} title={photo.fileName}>
                              {photo.fileName}
                            </span>
                            <Button
                              size="small"
                              type="text"
                              icon={<PlusOutlined />}
                              onClick={() =>
                                commitItems(photoIndex, [
                                  ...items,
                                  emptyItem(`w_${photo.id}_${Date.now()}`),
                                ])
                              }
                            >
                              줄 추가
                            </Button>
                          </div>
                          {/*
                           * 작업일.
                           * 원본 양식에는 칸이 없고 사진 스탬프에만 찍혀 있지만,
                           * 집계가 이 값으로 날짜를 묶으므로 고칠 자리가 있어야 한다.
                           * 양식이 아니라 화면 도구라 격자 바깥 줄에 둔다.
                           */}
                          <div
                            className={
                              workDateFlag(photo)
                                ? `${styles.workDate} ${styles.uncertain}`
                                : styles.workDate
                            }
                            title={workDateFlag(photo)}
                          >
                            <DatePicker
                              size="small"
                              allowClear
                              placeholder="작업일"
                              style={{ width: '100%' }}
                              value={photo.workDate ? dayjs(photo.workDate) : null}
                              onChange={(next) =>
                                onChange({
                                  ...photo,
                                  workDate: next ? next.format('YYYY-MM-DD') : null,
                                  uncertain: without(photo.uncertain, 'workDate'),
                                })
                              }
                            />
                          </div>
                          {photo.status === 'failed' && (
                            /* 분석이 실패한 사진은 칸이 비어 있는 이유를 사진 옆에 밝힌다 */
                            <div className={styles.failure}>
                              분석 실패 · {photo.failureReason ?? '사유 미상'} — 직접 입력해주세요
                            </div>
                          )}
                          {renderPhotoExtra?.(photo)}
                        </td>
                      </>
                    )}

                    <td className={styles.label} style={{ background: HEADER_BG }}>
                      구 분
                    </td>
                    <td
                      className={
                        categoryFlag
                          ? `${styles.categoryCell} ${styles.uncertain}`
                          : styles.categoryCell
                      }
                      style={categoryFlag ? undefined : { background: SHEET_CATEGORY_BG }}
                      title={categoryFlag}
                    >
                      {textCell(row, 0, item.category, (next) =>
                        updateItem(photoIndex, item.id, {
                          category: next,
                          uncertain: without(item.uncertain, 'category'),
                        }),
                      )}
                    </td>

                    <td
                      className={`${styles.label} ${styles.labelWide}`}
                      style={{ background: HEADER_BG }}
                    >
                      작업내용
                    </td>

                    {item.entries.map((entry, slot) => {
                      // 첫 쌍 다음은 '구분은 같은데 규격이 다른 경우'에 쓰는 여분 칸이다
                      const spare = slot > 0 && !entry.spec && entry.quantity == null
                      const specClass = [
                        styles.specCell,
                        spare ? styles.spare : '',
                        entry.uncertain?.spec ? styles.uncertain : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                      const qtyClass = [
                        styles.qtyCell,
                        spare ? styles.spare : '',
                        entry.uncertain?.quantity ? styles.uncertain : '',
                      ]
                        .filter(Boolean)
                        .join(' ')

                      return (
                        <Fragment key={slot}>
                          <td className={specClass} title={entry.uncertain?.spec}>
                            {textCell(row, 1 + slot * 2, entry.spec, (next) =>
                              updateEntry(photoIndex, item.id, slot, {
                                spec: next,
                                uncertain: without(entry.uncertain, 'spec'),
                              }),
                            )}
                          </td>
                          <td className={qtyClass} title={entry.uncertain?.quantity}>
                            {numberCell(
                              row,
                              2 + slot * 2,
                              `${item.id}:${slot}`,
                              entry.quantity,
                              (next) =>
                                updateEntry(photoIndex, item.id, slot, {
                                  quantity: next,
                                  uncertain: without(entry.uncertain, 'quantity'),
                                }),
                            )}
                          </td>
                        </Fragment>
                      )
                    })}

                    <td className={styles.rowAction}>
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={`${photo.seq}번 사진의 ${itemIndex + 1}번째 줄 지우기`}
                        onClick={() =>
                          commitItems(
                            photoIndex,
                            items.filter((candidate) => candidate.id !== item.id),
                          )
                        }
                      />
                    </td>
                  </tr>
                )
              })}

              <tr>
                <td className={styles.label} colSpan={3} style={{ background: HEADER_BG }}>
                  위 치
                </td>
                <td
                  className={
                    photo.uncertain?.location
                      ? `${styles.locationValue} ${styles.uncertain}`
                      : styles.locationValue
                  }
                  colSpan={SHEET_ENTRY_SLOTS * 2}
                  title={photo.uncertain?.location}
                >
                  {textCell(
                    firstRow + items.length,
                    LOCATION_COL,
                    photo.location,
                    (next) =>
                      onChange({
                        ...photo,
                        location: next,
                        uncertain: without(photo.uncertain, 'location'),
                      }),
                    '리테일 4층',
                  )}
                </td>
                <td className={styles.rowAction} />
              </tr>
            </tbody>
          )
        })}
      </table>
    </div>
  )
}

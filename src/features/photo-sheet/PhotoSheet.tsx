import { DEFAULT_WORK_ITEM_ROWS } from '@/lib/constants'
import type { WorkItem } from '@/types'

import styles from './PhotoSheet.module.css'

export interface PhotoSheetEntry {
  id: string
  /** 사진번호 */
  seq: number
  /** 분리된 작업 사진. 없으면 원본을 쓴다 */
  imageUrl: string
  location: string | null
  workItems: WorkItem[]
}

export interface PhotoSheetProps {
  projectName: string
  entries: PhotoSheetEntry[]
  /** 한 페이지에 넣을 사진 수 */
  blocksPerPage?: number
  /**
   * 작업 항목이 적어도 이 줄 수만큼은 빈 칸으로 채운다.
   * 항목 개수 자체는 제한하지 않는다.
   */
  minRows?: number
}

/** 작업 항목이 minRows보다 적으면 빈 줄로 채워 양식 높이를 맞춘다 */
function padRows(items: WorkItem[], minRows: number): (WorkItem | null)[] {
  const padding = Math.max(0, minRows - items.length)
  return [...items, ...Array<null>(padding).fill(null)]
}

/**
 * 확정 데이터를 A4 사진대지로 조판한다.
 * 브라우저 인쇄로 그대로 PDF 저장이 가능하다.
 */
export function PhotoSheet({
  projectName,
  entries,
  blocksPerPage = 5,
  minRows = DEFAULT_WORK_ITEM_ROWS,
}: PhotoSheetProps) {
  const pages = Array.from({ length: Math.ceil(entries.length / blocksPerPage) || 1 }, (_, i) =>
    entries.slice(i * blocksPerPage, (i + 1) * blocksPerPage),
  )

  return (
    <>
      {pages.map((page, pageIndex) => (
        <section key={pageIndex} className={styles.sheet}>
          <header className={styles.header}>
            <h1 className={styles.title}>사진대지</h1>
            <div>
              <div>공사명: {projectName}</div>
              <div>
                {pageIndex + 1} / {pages.length} 페이지
              </div>
            </div>
          </header>

          {page.map((entry) => (
            <div key={entry.id} className={styles.block}>
              <div className={styles.seq}>{entry.seq}</div>
              <img className={styles.photo} src={entry.imageUrl} alt="" />
              <table className={styles.table}>
                <tbody>
                  {padRows(entry.workItems, minRows).map((item, rowIndex) => (
                    <tr key={item?.id ?? `empty-${rowIndex}`}>
                      <td className={styles.label}>구분</td>
                      <td className={styles.category}>{item?.category ?? ''}</td>
                      <td className={styles.label}>작업내용</td>
                      <td className={styles.spec}>{item?.spec ?? ''}</td>
                      <td className={styles.qty}>{item?.quantity ?? ''}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className={styles.label} colSpan={2}>
                      위치
                    </td>
                    <td className={styles.locationValue} colSpan={3}>
                      {entry.location ?? ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </section>
      ))}
    </>
  )
}

import styles from './PhotoSheet.module.css'

export interface PhotoSheetEntry {
  id: string
  imageUrl: string
  /** 캡션에 표시할 항목 — 라벨과 값의 순서쌍 */
  fields: { label: string; value: string }[]
}

export interface PhotoSheetProps {
  projectName: string
  entries: PhotoSheetEntry[]
  /** 한 페이지에 배치할 열 수 */
  cols?: number
  /** 한 페이지에 배치할 행 수 */
  rows?: number
}

/**
 * 확정 데이터를 A4 사진대지로 조판한다.
 * 브라우저 인쇄(PDF로 저장)로 그대로 내보낼 수 있다.
 */
export function PhotoSheet({ projectName, entries, cols = 2, rows = 2 }: PhotoSheetProps) {
  const perPage = cols * rows
  const pages = Array.from({ length: Math.ceil(entries.length / perPage) || 1 }, (_, i) =>
    entries.slice(i * perPage, (i + 1) * perPage),
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
                {pageIndex + 1} / {pages.length}
              </div>
            </div>
          </header>
          <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {page.map((entry) => (
              <figure key={entry.id} className={styles.cell} style={{ margin: 0 }}>
                <img className={styles.photo} src={entry.imageUrl} alt="" />
                <dl className={styles.caption}>
                  {entry.fields.map((field) => (
                    <div key={field.label} style={{ display: 'contents' }}>
                      <dt>{field.label}</dt>
                      <dd>{field.value}</dd>
                    </div>
                  ))}
                </dl>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

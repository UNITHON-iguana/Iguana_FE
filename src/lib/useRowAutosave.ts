import { useEffect, useRef } from 'react'

/** 자동저장이 다루는 줄이 갖춰야 할 최소 조건 */
interface Row {
  id: string
}

/**
 * 표의 줄 하나를 고치면 **그 줄에서 손을 뗄 때** 저장한다.
 *
 * 엑셀이 칸을 벗어나는 순간 값을 확정하는 것과 같은 시점이다.
 * 시간으로 재면(타이핑 후 몇 초) 글자 사이에 잠깐 멈추기만 해도 중간값이 올라간다 —
 * `금속관벽체`를 치다 두 번 멈추면 `금속`과 `금속관`이 각각 저장되고,
 * 그 반쯤 친 값으로 묶인 집계가 잠깐씩 보인다.
 *
 * 줄 단위로 나눠 보내므로 한 칸을 고쳐도 표 전체가 다시 올라가지 않는다.
 * 화면을 떠날 때 아직 안 나간 저장은 버리지 않고 그때 보낸다 —
 * 줄에서 손을 떼지 않은 채 메뉴를 누르거나 뒤로 가는 길이 있기 때문이다.
 *
 * `save`는 모듈 함수처럼 렌더마다 같은 참조여야 한다. 매번 새로 만들면
 * 정리 함수가 다시 걸리면서 저장이 앞당겨 나간다.
 */
export function useRowAutosave<T extends Row>(
  save: (item: T) => Promise<unknown>,
  onError?: (error: unknown, item: T) => void,
) {
  const unsaved = useRef(new Map<string, T>())
  /* 실패를 알리는 길. 저장은 렌더 밖에서 끝나므로 ref로 최신값을 쥔다 */
  const report = useRef(onError)
  useEffect(() => {
    report.current = onError
  })

  useEffect(() => {
    const pendingRows = unsaved.current
    return () => {
      pendingRows.forEach((item) => {
        void save(item).catch(() => {
          // 떠나는 길이라 알릴 화면이 없다. 조용히 흘려보내되 터뜨리지는 않는다
        })
      })
      pendingRows.clear()
    }
  }, [save])

  return {
    /** 값이 바뀌었다 — 화면에는 바로 얹고, 보내는 것은 손을 뗄 때까지 미룬다 */
    edit(item: T) {
      unsaved.current.set(item.id, item)
    },
    /** 이 줄에서 포커스가 나갔다. 고친 것이 있으면 지금 보낸다 */
    leave(item: T) {
      const pending = unsaved.current.get(item.id)
      if (!pending) return
      unsaved.current.delete(item.id)
      void save(pending).catch((error: unknown) => {
        /*
         * 실패한 편집을 도로 붙든다.
         *
         * 화면에는 고친 값이 그대로 얹혀 있어서, 여기서 버리면 사람은 저장된 줄 알고
         * 넘어간다. 붙들어 두면 다음에 그 줄에서 손을 뗄 때나 화면을 떠날 때 다시 나간다.
         * 그 사이 같은 줄을 또 고쳤으면 그쪽이 최신이다 — 덮어쓰지 않는다.
         */
        if (!unsaved.current.has(pending.id)) unsaved.current.set(pending.id, pending)
        report.current?.(error, pending)
      })
    },
  }
}

/**
 * 표의 `<tr>`에 걸어 줄에서 포커스가 빠져나가는 순간을 잡는다.
 *
 * antd `Table`의 `onRow`가 돌려주는 props에 그대로 넣는다.
 * 같은 줄 안에서 칸을 옮기는 것은 아직 그 줄을 보고 있는 것이므로 부르지 않는다.
 */
export function rowLeaveProps<T extends Row>(row: T, leave: (item: T) => void) {
  return {
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      const next = event.relatedTarget as Node | null
      if (next && event.currentTarget.contains(next)) return
      leave(row)
    },
  }
}

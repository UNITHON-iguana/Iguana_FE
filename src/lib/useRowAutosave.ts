import { useEffect, useRef } from 'react'

/**
 * 값을 고친 뒤 저장까지 기다리는 시간.
 * 사진대지의 셀 편집과 같다 — 타이핑 중에 매 글자 저장하지 않는다.
 */
export const AUTOSAVE_DELAY = 800

/** 자동저장이 다루는 줄이 갖춰야 할 최소 조건 */
interface Row {
  id: string
}

/**
 * 표의 줄 하나가 바뀔 때마다 저장을 예약한다.
 *
 * 줄 단위로 나눠 보내므로 한 칸을 고쳐도 표 전체가 다시 올라가지 않는다.
 * 화면을 떠날 때 예약만 되고 안 나간 저장은 버리지 않고 그때 보낸다 —
 * 타이핑하고 0.8초 안에 나가면 마지막 편집이 사라지기 때문이다.
 *
 * `save`는 모듈 함수처럼 렌더마다 같은 참조여야 한다. 매번 새로 만들면
 * 정리 함수가 다시 걸리면서 예약이 앞당겨 나간다.
 */
export function useRowAutosave<T extends Row>(save: (item: T) => Promise<unknown>) {
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const unsaved = useRef(new Map<string, T>())

  useEffect(() => {
    const pendingTimers = timers.current
    const pendingRows = unsaved.current
    return () => {
      Object.values(pendingTimers).forEach(clearTimeout)
      pendingRows.forEach((item) => void save(item))
      pendingRows.clear()
    }
  }, [save])

  return (item: T) => {
    unsaved.current.set(item.id, item)
    clearTimeout(timers.current[item.id])
    timers.current[item.id] = setTimeout(() => {
      unsaved.current.delete(item.id)
      void save(item)
    }, AUTOSAVE_DELAY)
  }
}

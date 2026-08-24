/** 네트워크 지연을 흉내 내 로딩 상태가 화면에 실제로 보이게 한다 */
export function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

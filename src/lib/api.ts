const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * 서버가 실패를 돌려주는 모양 — `{ code, message, timestamp }`.
 * 사람에게 보일 수 있는 건 `message` 하나뿐이라 그것만 꺼낸다.
 * JSON이 아니면 본문을 그대로 쓴다 — 게이트웨이가 낸 오류는 이 모양이 아니다.
 */
function messageOf(body: string, fallback: string): string {
  try {
    const parsed: unknown = JSON.parse(body)
    if (parsed && typeof parsed === 'object' && 'message' in parsed) {
      const { message } = parsed as { message: unknown }
      if (typeof message === 'string' && message) return message
    }
  } catch {
    // 본문이 JSON이 아니다
  }
  return body || fallback
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ApiError(res.status, messageOf(body, res.statusText))
  }

  /*
   * 본문 없는 200도 온다 — 공종 삭제가 그렇다.
   * `res.json()`을 바로 부르면 빈 본문에서 파싱 에러가 나므로 먼저 읽어보고 판단한다.
   */
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/** `Content-Disposition`이 알려주는 파일명. 없으면 부르는 쪽이 정한 이름을 쓴다 */
function fileNameOf(header: string | null, fallback: string): string {
  const encoded = header?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encoded) return decodeURIComponent(encoded)
  return header?.match(/filename="?([^";]+)"?/i)?.[1] ?? fallback
}

/**
 * 파일을 받아 브라우저에 내려준다.
 *
 * 서버가 만든 엑셀을 그대로 흘려받는다 — 프론트는 파일을 만들지 않는다.
 * `<a href>`로 바로 걸지 않는 이유는 인증 헤더가 붙을 자리를 남겨두기 위해서다.
 */
async function download(path: string, fallbackName: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ApiError(res.status, messageOf(body, res.statusText))
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileNameOf(res.headers.get('Content-Disposition'), fallbackName)
  link.click()
  URL.revokeObjectURL(url)
}

export const api = {
  download,
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

/**
 * 프로토타입용 자리표시 이미지.
 * 실제 사진이 붙기 전까지 사진번호가 보이는 회색 이미지를 쓴다.
 */
export function placeholderImage(label: string, tone = '#d9d9d9'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
    <rect width="400" height="400" fill="${tone}"/>
    <text x="50%" y="50%" font-family="sans-serif" font-size="56" fill="#8c8c8c"
          text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

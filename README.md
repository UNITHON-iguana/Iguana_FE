# 현장노트 AI

건설현장 사무·공무 담당자가 텍스트가 포함된 현장 사진을 여러 장 올리면, AI가 사진과 텍스트를
분리하고 구조화된 공사 데이터로 정리한다. 사용자는 결과를 검수·수정하고 계획 대비 공정과 자재
사용 현황을 확인한 뒤 엑셀 또는 사진대지로 내보낸다.

현장 노동자는 기존처럼 메신저로 사진을 전달하며, 이 서비스의 직접 사용자가 아니다.
데스크톱 웹 전용이다.

## 기술 스택

|           |                                       |
| --------- | ------------------------------------- |
| 빌드      | Vite 8 + React 19 + TypeScript        |
| UI        | Ant Design v6 (한국어 로케일)         |
| 라우팅    | React Router v7                       |
| 서버 상태 | TanStack Query v5                     |
| 엑셀      | ExcelJS (계획 데이터 읽기 / 내보내기) |

## 시작하기

```bash
npm install
cp .env.example .env   # VITE_API_BASE_URL 설정
npm run dev
```

| 스크립트         | 설명                      |
| ---------------- | ------------------------- |
| `npm run dev`    | 개발 서버                 |
| `npm run build`  | 타입 체크 + 프로덕션 빌드 |
| `npm run lint`   | ESLint                    |
| `npm run format` | Prettier                  |

## 구조

```
src/
  app/        프로바이더, 라우터, QueryClient
  layouts/    AppLayout (헤더 + 사이드 내비)
  pages/      계획 데이터 · 업로드/분석 · 검수 · 비교 · 내보내기
  features/
    photo-sheet/  사진대지 A4 인쇄 조판 (antd 미사용, CSS Modules)
  lib/        API 클라이언트
  types/      도메인 타입
```

`@/*` 별칭이 `src/*`를 가리킨다.

### 사진대지 뷰

`features/photo-sheet`는 화면용 UI가 아니라 A4 출력물이라 antd를 쓰지 않고 mm 단위 CSS로
직접 조판한다. 브라우저 인쇄로 PDF 저장이 가능하다.

## MCP

Ant Design 공식 MCP 서버가 `.mcp.json`에 등록되어 있다. 컴포넌트 API·토큰·예제를 조회해
v6 코드 생성 정확도를 높인다.

## 규칙

사진에서 읽어내지 못한 값은 AI가 임의로 채우지 않는다. `확인 필요`로 표시하고, 계획 또는
실적 수량이 없으면 `비교 데이터 부족`으로 표시한다.

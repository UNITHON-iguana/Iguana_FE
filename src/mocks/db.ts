/**
 * 프로토타입용 인메모리 목 데이터.
 *
 * 화면은 src/api를 통해서만 이 데이터를 읽는다.
 * 실제 백엔드가 붙으면 src/api 안쪽만 HTTP 호출로 바꾸면 되고 화면은 그대로다.
 */
import type { PlanMaterialItem, PlanWorkItem, Photo, Project, WorkItem } from '@/types'

import { placeholderImage } from './placeholder'

export const projects: Project[] = [
  {
    id: 'p1',
    name: '○○ 지식산업센터 신축공사',
    siteName: '가산동 현장',
    startDate: '2026-03-02',
    endDate: '2027-08-31',
    createdAt: '2026-03-02T09:00:00+09:00',
  },
  {
    id: 'p2',
    name: '△△ 물류센터 증축공사',
    siteName: '이천 현장',
    startDate: '2026-06-01',
    endDate: '2026-12-20',
    createdAt: '2026-06-01T09:00:00+09:00',
  },
]

export const planWorkItems: PlanWorkItem[] = [
  {
    id: 'pw1',
    projectId: 'p1',
    location: '지하2층',
    workType: '덕트',
    description: '무보온덕트벽체',
    quantity: 12,
    unit: '개소',
  },
  {
    id: 'pw2',
    projectId: 'p1',
    location: '지하2층',
    workType: '덕트',
    description: '오픈구',
    quantity: 4,
    unit: '개소',
  },
  {
    id: 'pw3',
    projectId: 'p1',
    location: '지하1층',
    workType: '배관',
    description: '금속관벽체',
    quantity: 20,
    unit: '개소',
  },
  {
    id: 'pw4',
    projectId: 'p1',
    location: '1층',
    workType: '배관',
    description: '슬리브 설치',
    quantity: 8,
    unit: '개소',
  },
]

export const planMaterialItems: PlanMaterialItem[] = [
  {
    id: 'pm1',
    projectId: 'p1',
    location: '지하2층',
    workType: '덕트',
    material: '무보온벽체차열재마감',
    quantity: 30,
    unit: 'EA',
  },
  {
    id: 'pm2',
    projectId: 'p1',
    location: '지하2층',
    workType: '덕트',
    material: '내화충전재',
    quantity: 15,
    unit: 'EA',
  },
  {
    id: 'pm3',
    projectId: 'p1',
    location: '지하1층',
    workType: '배관',
    material: '금속관',
    quantity: 25,
    unit: 'EA',
  },
]

/*
 * 사진 목 데이터.
 * 실제 현장 사진대지(내화채움)에서 값을 그대로 가져와, 화면이 원본 양식과
 * 같은 인상을 주는지 눈으로 확인할 수 있게 했다.
 * `uncertain`이 붙은 칸은 AI가 자신 없게 채운 칸이라 사진대지에서 노랗게 뜬다.
 *
 * 검수 상태는 며칠 일한 현장의 모습이다 — 지난 것은 반영을 마쳤고(`confirmed`),
 * 확인할 칸이 남은 사진과 아직 반영을 안 누른 사진이 `pending`으로 섞여 있다.
 */
let seq = 623

function photo(overrides: Partial<Photo> & Pick<Photo, 'id' | 'fileName'>): Photo {
  const n = seq++
  return {
    projectId: 'p1',
    seq: n,
    originalUrl: placeholderImage(String(n)),
    croppedUrl: placeholderImage(String(n), '#e8e8e8'),
    status: 'analyzed',
    failureReason: null,
    workDate: '2026-08-20',
    location: '리테일 4층',
    workItems: [],
    reviewStatus: 'pending',
    ...overrides,
  }
}

/** 규격·수량 한 쌍짜리 작업 항목 — 목 데이터 대부분이 이 모양이다 */
function item(
  id: string,
  category: string,
  spec: string,
  quantity: number,
  uncertain?: WorkItem['uncertain'],
): WorkItem {
  return {
    id,
    category,
    entries: [
      { spec, quantity },
      { spec: null, quantity: null },
    ],
    uncertain,
  }
}

/*
 * 볼륨 확인용 사진.
 *
 * 실제 현장은 하루에 수백 장이 올라온다. 손으로 적은 여섯 장만으로는
 * 페이지네이션과 작업일 필터가 도는지 볼 수 없어 같은 모양으로 늘려둔다.
 * 값은 위 여섯 장의 조합을 돌려쓴다 — 집계 숫자를 눈으로 검산할 수 있게 단순하게 둔다.
 */
const BULK_SAMPLES: { category: string; spec: string; quantity: number }[] = [
  { category: '무보온덕트벽체', spec: '2000*600', quantity: 0.5 },
  { category: '보온덕트벽체', spec: '2000*800', quantity: 1 },
  { category: '차열재마감', spec: '1300*800', quantity: 0.5 },
  { category: '금속관벽체', spec: '50', quantity: 1 },
  { category: '금속관벽체', spec: '100', quantity: 0.5 },
  { category: '금속관입상', spec: '150', quantity: 2 },
  { category: '오픈구', spec: '2000*200', quantity: 0.5 },
  { category: '슬리브', spec: '100', quantity: 1 },
]

const BULK_DATES = ['2026-08-18', '2026-08-19', '2026-08-20', '2026-08-24']
const BULK_LOCATIONS = ['리테일 4층', '리테일 3층', '지하 2층', '지하 1층']
const BULK_COUNT = 74

function bulkPhotos(): Photo[] {
  return Array.from({ length: BULK_COUNT }, (_, i) => {
    const sample = BULK_SAMPLES[i % BULK_SAMPLES.length]
    const second = BULK_SAMPLES[(i + 3) % BULK_SAMPLES.length]
    // 일곱 장에 한 장꼴로 AI가 수량을 못 읽은 사진을 섞는다
    const unread = i % 7 === 3

    return photo({
      id: `phb${i}`,
      fileName: `KakaoTalk_bulk_${String(i + 1).padStart(3, '0')}.jpg`,
      workDate: BULK_DATES[i % BULK_DATES.length],
      location: BULK_LOCATIONS[i % BULK_LOCATIONS.length],
      /*
       * 확정은 사람이 반영을 눌러야 일어난다.
       * 손볼 것이 없는데 아직 반영 안 한 사진도 섞어 둔다 — 반영 버튼이 잡을 대상이다.
       */
      reviewStatus: unread || i % 5 === 2 ? 'pending' : 'confirmed',
      workItems: [
        item(`wb${i}_1`, sample.category, sample.spec, sample.quantity),
        unread
          ? {
              id: `wb${i}_2`,
              category: second.category,
              entries: [
                {
                  spec: second.spec,
                  quantity: null,
                  uncertain: { quantity: '수량을 읽지 못했습니다' },
                },
                { spec: null, quantity: null },
              ],
            }
          : item(`wb${i}_2`, second.category, second.spec, second.quantity),
      ],
    })
  })
}

export const photos: Photo[] = [
  photo({
    id: 'ph1',
    fileName: 'KakaoTalk_20260818_01.jpg',
    workDate: '2026-08-18',
    // 확인할 칸이 없어 분석 직후 자동으로 확정된 사진
    reviewStatus: 'confirmed',
    workItems: [
      item('w1', '보온덕트입상', '1300*800', 0.5),
      item('w2', '무보온덕트입상', '1300*800', 0.5),
      item('w3', '차열재마감', '1300*800', 5.5),
    ],
  }),
  photo({
    id: 'ph2',
    fileName: 'KakaoTalk_20260818_02.jpg',
    workDate: '2026-08-18',
    reviewStatus: 'confirmed',
    workItems: [
      item('w4', '보온덕트벽체', '2000*800', 0.5),
      item('w5', '차열재마감', '2000*800', 1),
      item('w6', '오픈구', '2000*200', 0.5),
    ],
  }),
  photo({
    id: 'ph3',
    fileName: 'KakaoTalk_20260819_03.jpg',
    workDate: '2026-08-19',
    // 구분은 읽었지만 수량을 못 읽은 경우 — 그 칸만 확인 필요로 뜬다
    workItems: [
      item('w7', '무보온덕트벽체', '2000*600', 0.5),
      {
        id: 'w8',
        category: '차열재마감',
        entries: [
          { spec: '2000*600', quantity: null, uncertain: { quantity: '수량을 읽지 못했습니다' } },
          { spec: null, quantity: null },
        ],
      },
    ],
  }),
  photo({
    id: 'ph4',
    fileName: 'KakaoTalk_20260819_04.jpg',
    workDate: '2026-08-19',
    // 사진 속 스탬프가 흐려 위치를 확신하지 못한 경우
    uncertain: { location: '사진의 위치 표기를 확신하지 못했습니다' },
    workItems: [
      item('w9', '무보온덕트벽체', '1600*500', 0.5),
      item('w10', '차열재마감', '1600*500', 0.5),
    ],
  }),
  photo({
    id: 'ph5',
    fileName: 'KakaoTalk_20260820_05.jpg',
    reviewStatus: 'confirmed',
    workItems: [
      item('w11', '무보온덕트벽체', '300*200', 2),
      item('w12', '무보온벽체차열재마감', '300*200', 4),
    ],
  }),
  photo({
    id: 'ph6',
    fileName: 'KakaoTalk_20260820_06.jpg',
    status: 'failed',
    croppedUrl: null,
    failureReason: '텍스트 영역을 찾지 못했습니다',
    workDate: null,
    location: null,
    workItems: [],
  }),
  ...bulkPhotos(),
]

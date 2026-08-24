/**
 * 프로토타입용 인메모리 목 데이터.
 *
 * 화면은 src/api를 통해서만 이 데이터를 읽는다.
 * 실제 백엔드가 붙으면 src/api 안쪽만 HTTP 호출로 바꾸면 되고 화면은 그대로다.
 */
import type { PlanMaterialItem, PlanWorkItem, Photo, Project } from '@/types'

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

let seq = 538

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
    location: '지하2층',
    workItems: [],
    reviewStatus: 'pending',
    ...overrides,
  }
}

export const photos: Photo[] = [
  photo({
    id: 'ph1',
    fileName: 'KakaoTalk_20260820_01.jpg',
    workItems: [
      {
        id: 'w1',
        category: '금속관벽체',
        description: '관통부 마감',
        spec: '100',
        quantity: 1,
        unit: '개소',
      },
    ],
  }),
  photo({
    id: 'ph2',
    fileName: 'KakaoTalk_20260820_02.jpg',
    workItems: [
      {
        id: 'w2',
        category: '무보온덕트벽체',
        description: '덕트 관통부',
        spec: '800*400',
        quantity: 1,
        unit: '개소',
      },
      {
        id: 'w3',
        category: '무보온벽체차열재마감',
        description: '차열재 마감',
        spec: '800*400',
        quantity: 2,
        unit: 'EA',
      },
      {
        id: 'w4',
        category: '오픈구',
        description: '오픈구 처리',
        spec: '800*300',
        quantity: 1,
        unit: '개소',
      },
    ],
  }),
  photo({
    id: 'ph3',
    fileName: 'KakaoTalk_20260820_03.jpg',
    reviewStatus: 'confirmed',
    workItems: [
      {
        id: 'w5',
        category: '무보온덕트벽체',
        description: '덕트 관통부',
        spec: '800*400',
        quantity: 1,
        unit: '개소',
      },
      {
        id: 'w6',
        category: '무보온벽체차열재마감',
        description: '차열재 마감',
        spec: '800*400',
        quantity: 2,
        unit: 'EA',
      },
      {
        id: 'w7',
        category: '오픈구',
        description: '오픈구 처리',
        spec: '800*200',
        quantity: 1,
        unit: '개소',
      },
    ],
  }),
  photo({
    id: 'ph4',
    fileName: 'KakaoTalk_20260820_04.jpg',
    reviewStatus: 'confirmed',
    workItems: [
      {
        id: 'w8',
        category: '무보온덕트벽체',
        description: '덕트 관통부',
        spec: '300*200',
        quantity: 2,
        unit: '개소',
      },
      {
        id: 'w9',
        category: '무보온벽체차열재마감',
        description: '차열재 마감',
        spec: '300*200',
        quantity: 4,
        unit: 'EA',
      },
    ],
  }),
  photo({
    id: 'ph5',
    fileName: 'KakaoTalk_20260820_05.jpg',
    status: 'failed',
    croppedUrl: null,
    failureReason: '텍스트 영역을 찾지 못했습니다',
    workDate: null,
    location: null,
    workItems: [],
  }),
]

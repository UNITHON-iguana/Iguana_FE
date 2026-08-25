import type { AggregateItem } from '@/types'

/*
 * 집계 품목 마스터 목 데이터.
 *
 * 실제 현장 파일(BS.xlsm) `집계표` 시트의 행 목록을 그대로 옮겼다.
 * 값이 하나도 없는 품목도 행이 남아 있는데, 기성 청구 양식이라 행 목록과 순서가
 * 고정이기 때문이다. 화면도 그 순서를 그대로 따른다.
 *
 * 백엔드가 붙으면 이 파일 대신 API가 같은 모양을 돌려준다.
 * 계수와 그룹은 현장·발주처마다 달라지는 업무 규칙이라 프론트가 정하지 않는다.
 */

/** 배관류 호칭경. 이 경계 위아래로 소구경·대구경이 갈린다 */
const LARGE_BORE_FROM = 200

interface PipeSpec {
  category: string
  /** 호칭경 목록 */
  specs: number[]
  multiplier: number
  hbGroup: string
  /** 대구경은 다른 그룹으로 묶일 때 쓴다 */
  largeBoreHbGroup?: string
}

/** 호칭경마다 품목 한 줄씩 펼친다 — 배관은 구분+호칭경이 한 품목이다 */
function pipeItems(spec: PipeSpec): AggregateItem[] {
  return spec.specs.map((bore) => {
    const large = bore >= LARGE_BORE_FROM
    return {
      id: `${spec.category}${bore}`,
      name: `${spec.category}${bore}`,
      category: spec.category,
      spec: String(bore),
      unit: 'EA' as const,
      multiplier: spec.multiplier,
      hbGroup: (large && spec.largeBoreHbGroup) || spec.hbGroup,
    }
  })
}

/** 규격으로 갈리지 않는 품목 한 줄 */
function singleItem(
  category: string,
  unit: AggregateItem['unit'],
  multiplier: number,
  hbGroup: string,
): AggregateItem {
  return { id: category, name: category, category, spec: null, unit, multiplier, hbGroup }
}

const SMALL_BORES = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150]
const ALL_BORES = [...SMALL_BORES, 200, 250, 300, 350, 400, 450, 500]

export const aggregateItems: AggregateItem[] = [
  ...pipeItems({
    category: '금속관입상차열',
    specs: SMALL_BORES,
    multiplier: 1,
    hbGroup: 'HB 금속관 입상차열',
  }),
  ...pipeItems({
    category: '금속관입상',
    specs: ALL_BORES,
    multiplier: 1,
    hbGroup: 'HB 배관(소구경)',
    largeBoreHbGroup: 'HB 배관(대구경)',
  }),
  ...pipeItems({
    category: '스파이럴입상',
    specs: [100, 150, 200, 250, 300],
    multiplier: 1,
    hbGroup: 'HB 배관(소구경)',
    largeBoreHbGroup: 'HB 배관(대구경)',
  }),
  ...pipeItems({
    category: '금속관벽체',
    specs: ALL_BORES,
    // 벽체는 벽 앞뒤 양면을 시공한다
    multiplier: 2,
    hbGroup: 'HB 배관(소구경)',
    largeBoreHbGroup: 'HB 배관(대구경)',
  }),
  ...pipeItems({
    category: '스파이럴벽체',
    specs: [100, 125, 150, 200, 250, 300],
    multiplier: 2,
    hbGroup: 'HB 배관(소구경)',
    largeBoreHbGroup: 'HB 배관(대구경)',
  }),
  ...pipeItems({
    category: 'PVC입상',
    specs: [30, 40, 50, 75, 100, 125, 150, 200, 250, 300, 350, 400],
    multiplier: 1,
    hbGroup: 'HB 배관(소구경)',
    largeBoreHbGroup: 'HB 배관(대구경)',
  }),
  ...pipeItems({
    category: '세대SP',
    specs: [25, 40, 50, 65],
    multiplier: 2,
    hbGroup: 'HB 세대SP',
  }),
  ...pipeItems({
    category: 'PVC벽체',
    specs: [25, 30, 40, 50, 65, 75, 100, 125, 150, 200, 250, 300, 350, 400],
    multiplier: 2,
    hbGroup: 'HB 배관(소구경)',
    largeBoreHbGroup: 'HB 배관(대구경)',
  }),

  singleItem('대구경추가차열입상', 'EA', 1, 'HB 대구경추가차열'),
  singleItem('대구경추가차열벽체', 'EA', 2, 'HB 대구경추가차열'),
  singleItem('실란트마감입상', 'EA', 1, 'HB 실란트마감'),
  singleItem('실란트마감벽체', 'EA', 2, 'HB 실란트마감'),
  // 슬리브만 벽체인데도 계수가 1이다 — 단면 시공이라 원본 산출식이 그렇게 잡혀 있다
  singleItem('슬리브', 'EA', 1, 'HB 슬리브'),

  // 여기부터 연장 길이(m)로 센다 — 규격의 가로*세로에서 둘레를 뽑는다
  singleItem('무보온덕트입상', 'M', 2, 'HB 덕트'),
  singleItem('보온덕트입상', 'M', 2, 'HB 덕트'),
  singleItem('무보온덕트벽체', 'M', 2, 'HB 덕트'),
  singleItem('보온덕트벽체', 'M', 2, 'HB 덕트'),
  singleItem('댐퍼팽창테이프', 'M', 2, 'HB 댐퍼팽창테이프'),
  singleItem('덕트마감', 'M', 2, 'HB 덕트마감'),
  singleItem('오픈구', 'M', 2, 'HB 오픈구'),
  singleItem('차열재마감', 'M', 2, 'HB 차열재마감'),
]

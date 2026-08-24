import { Alert, Flex, Typography } from 'antd'

export function ComparePage() {
  return (
    <Flex vertical gap={16}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        계획 대비 현황
      </Typography.Title>
      {/* TODO: 확정 데이터 기준 공정·자재 비교표. 계획 또는 실적이 없으면 '비교 데이터 부족' */}
      <Alert type="info" showIcon title="확정된 검수 데이터로 공정과 자재 사용량을 비교합니다." />
    </Flex>
  )
}

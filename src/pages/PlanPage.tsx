import { Alert, Flex, Typography } from 'antd'

export function PlanPage() {
  return (
    <Flex vertical gap={16}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        계획 데이터
      </Typography.Title>
      {/* TODO: 엑셀 업로드(exceljs 파싱) + Table 인라인 편집 */}
      <Alert type="info" showIcon title="엑셀 업로드 또는 표 직접 입력으로 계획을 등록합니다." />
    </Flex>
  )
}

import { Alert, Flex, Typography } from 'antd'

export function ExportPage() {
  return (
    <Flex vertical gap={16}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        내보내기
      </Typography.Title>
      {/* TODO: 기간·공종·구역·검수 상태 필터 → 엑셀(exceljs) 또는 사진대지(PhotoSheet 인쇄) */}
      <Alert type="info" showIcon title="기본 엑셀 또는 사진대지 형식으로 내려받습니다." />
    </Flex>
  )
}

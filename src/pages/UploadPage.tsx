import { Alert, Flex, Typography } from 'antd'

export function UploadPage() {
  return (
    <Flex vertical gap={16}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        사진 업로드·분석
      </Typography.Title>
      {/* TODO: Upload.Dragger 다중 업로드 + 분석 job 폴링(refetchInterval) */}
      <Alert
        type="info"
        showIcon
        title="텍스트가 포함된 현장 사진을 여러 장 올리면 AI가 사진·텍스트 영역을 분리합니다."
      />
    </Flex>
  )
}

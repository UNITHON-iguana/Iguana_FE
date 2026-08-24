import { Alert, Flex, Typography } from 'antd'

export function ReviewPage() {
  return (
    <Flex vertical gap={16}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        검수
      </Typography.Title>
      {/* TODO: 좌측 사진 + bbox 오버레이, 우측 추출값 편집 폼. 미확인 값은 '확인 필요' 표시 */}
      <Alert type="info" showIcon title="AI가 추출한 값을 대조·수정하고 확정합니다." />
    </Flex>
  )
}

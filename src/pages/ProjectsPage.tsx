import { Button, Empty, Flex, Typography } from 'antd'
import { useNavigate } from 'react-router'

export function ProjectsPage() {
  const navigate = useNavigate()

  return (
    <Flex vertical gap={16}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        프로젝트
      </Typography.Title>
      <Empty description="등록된 프로젝트가 없습니다">
        {/* TODO: 프로젝트 목록 조회 및 생성 연결 */}
        <Button type="primary" onClick={() => navigate('/projects/demo/plan')}>
          데모 프로젝트 열기
        </Button>
      </Empty>
    </Flex>
  )
}

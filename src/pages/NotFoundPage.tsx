import { Button, Result } from 'antd'
import { useNavigate } from 'react-router'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Result
      status="404"
      title="404"
      subTitle="요청한 페이지를 찾을 수 없습니다."
      extra={
        <Button type="primary" onClick={() => navigate('/projects')}>
          프로젝트 목록으로
        </Button>
      }
    />
  )
}

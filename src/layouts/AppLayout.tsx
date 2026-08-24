import { Layout, Menu, Typography } from 'antd'
import { Link, Outlet, useLocation, useParams } from 'react-router'

const { Header, Sider, Content } = Layout

const PROJECT_MENU = [
  { key: 'plan', label: '계획 데이터' },
  { key: 'upload', label: '사진 업로드·분석' },
  { key: 'review', label: '검수' },
  { key: 'compare', label: '계획 대비 현황' },
  { key: 'export', label: '내보내기' },
]

export function AppLayout() {
  const { projectId } = useParams()
  const { pathname } = useLocation()
  const activeKey = pathname.split('/').at(-1) ?? ''

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <Link to="/projects">
          <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
            현장노트 AI
          </Typography.Title>
        </Link>
      </Header>
      <Layout>
        {projectId && (
          <Sider width={200} theme="light">
            <Menu
              mode="inline"
              selectedKeys={[activeKey]}
              style={{ height: '100%' }}
              items={PROJECT_MENU.map((item) => ({
                ...item,
                label: <Link to={`/projects/${projectId}/${item.key}`}>{item.label}</Link>,
              }))}
            />
          </Sider>
        )}
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

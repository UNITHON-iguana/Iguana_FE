import { useQuery } from '@tanstack/react-query'
import { Layout, Menu, theme as antdTheme, Typography } from 'antd'
import { Link, Outlet, useLocation, useParams } from 'react-router'

import { queryKeys } from '@/api/queryKeys'
import { getProject } from '@/api/projects'

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
  const { token } = antdTheme.useToken()
  const activeKey = pathname.split('/').at(-1) ?? ''

  const { data: project } = useQuery({
    queryKey: queryKeys.project(projectId ?? ''),
    queryFn: () => getProject(projectId ?? ''),
    enabled: Boolean(projectId),
  })

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          borderBottom: `1px solid ${token.colorBorder}`,
        }}
      >
        <Link to="/projects" style={{ color: token.colorText }}>
          <Typography.Text strong style={{ fontSize: 14 }}>
            현장노트 AI
          </Typography.Text>
        </Link>

        {/* 어느 현장을 보고 있는지 항상 보이게 둔다 */}
        {project && (
          <>
            <span style={{ color: token.colorSplit }}>|</span>
            <Typography.Text style={{ fontSize: 13 }}>{project.name}</Typography.Text>
            <Typography.Text type="secondary">{project.siteName}</Typography.Text>
          </>
        )}
      </Header>

      <Layout>
        {projectId && (
          <Sider
            width={180}
            theme="light"
            style={{ borderRight: `1px solid ${token.colorBorderSecondary}` }}
          >
            <Menu
              mode="inline"
              selectedKeys={[activeKey]}
              style={{ height: '100%', borderInlineEnd: 'none', paddingTop: 8 }}
              items={PROJECT_MENU.map((item) => ({
                ...item,
                label: <Link to={`/projects/${projectId}/${item.key}`}>{item.label}</Link>,
              }))}
            />
          </Sider>
        )}
        <Content style={{ padding: 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

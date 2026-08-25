import { useQuery } from '@tanstack/react-query'
import { Layout, Menu, theme as antdTheme, Typography } from 'antd'
import { Link, Outlet, useLocation, useParams } from 'react-router'

import { queryKeys } from '@/api/queryKeys'
import { getProject } from '@/api/projects'

const { Header, Sider, Content } = Layout

/**
 * 프로젝트 메뉴.
 *
 * 사진대지가 본 화면이다 — 사진 올리기·AI 분석·검수가 모두 거기서 끝나고,
 * 집계와 내보내기가 그 결과를 받아 쓴다.
 * 계획은 이 흐름 없이도 돌아가는 곁가지라 구분선 아래에 둔다.
 */
const PROJECT_MENU = [
  { key: 'sheet', label: '사진대지' },
  { key: 'summary', label: '집계' },
  { key: 'export', label: '내보내기' },
  { key: 'plan', label: '계획', divided: true },
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
              items={PROJECT_MENU.flatMap((item) => [
                ...(item.divided ? [{ type: 'divider' as const, key: `${item.key}-divider` }] : []),
                {
                  key: item.key,
                  label: <Link to={`/projects/${projectId}/${item.key}`}>{item.label}</Link>,
                },
              ])}
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

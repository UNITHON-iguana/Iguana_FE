import { createBrowserRouter, Navigate } from 'react-router'

import { AppLayout } from '@/layouts/AppLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PlanPage } from '@/pages/PlanPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { SheetPage } from '@/pages/SheetPage'
import { SummaryPage } from '@/pages/SummaryPage'
import { TradesPage } from '@/pages/TradesPage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      { path: 'projects', element: <ProjectsPage /> },
      {
        path: 'projects/:projectId',
        children: [
          { index: true, element: <Navigate to="sheet" replace /> },
          { path: 'sheet', element: <SheetPage /> },
          { path: 'summary', element: <SummaryPage /> },
          { path: 'trades', element: <TradesPage /> },
          { path: 'plan', element: <PlanPage /> },

          /*
           * 화면을 합치기 전 경로.
           * 업로드·검수는 사진대지 한 페이지가 됐고, 계획 대비 현황은 계획에 붙었다.
           * 내보내기는 페이지를 없애고 사진대지·집계의 버튼이 됐다.
           * 저장해둔 링크가 404로 떨어지지 않게 남겨둔다.
           */
          { path: 'upload', element: <Navigate to="../sheet" replace /> },
          { path: 'review', element: <Navigate to="../sheet" replace /> },
          { path: 'compare', element: <Navigate to="../plan" replace /> },
          { path: 'export', element: <Navigate to="../sheet" replace /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

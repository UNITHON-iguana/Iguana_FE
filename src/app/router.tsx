import { createBrowserRouter, Navigate } from 'react-router'

import { AppLayout } from '@/layouts/AppLayout'
import { ComparePage } from '@/pages/ComparePage'
import { ExportPage } from '@/pages/ExportPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PlanPage } from '@/pages/PlanPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { ReviewPage } from '@/pages/ReviewPage'
import { UploadPage } from '@/pages/UploadPage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      { path: 'projects', element: <ProjectsPage /> },
      {
        path: 'projects/:projectId',
        children: [
          { index: true, element: <Navigate to="plan" replace /> },
          { path: 'plan', element: <PlanPage /> },
          { path: 'upload', element: <UploadPage /> },
          { path: 'review', element: <ReviewPage /> },
          { path: 'compare', element: <ComparePage /> },
          { path: 'export', element: <ExportPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

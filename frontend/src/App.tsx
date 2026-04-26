import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { getDefaultRoute } from './auth/roles'
import { useAuth } from './auth/useAuth'
import { AppShell } from './components/AppShell'
import { RoleGuard } from './components/RoleGuard'
import { AdminHomePage } from './pages/AdminHomePage'
import { AdminFeedbackPage } from './pages/AdminFeedbackPage'
import { AdminRegistrationsPage } from './pages/AdminRegistrationsPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { BatchDetailPage } from './pages/BatchDetailPage'
import { BatchListPage } from './pages/BatchListPage'
import { ConsumerFavoritesPage } from './pages/ConsumerFavoritesPage'
import { ConsumerFeedbackPage } from './pages/ConsumerFeedbackPage'
import { ConsumerHomePage } from './pages/ConsumerHomePage'
import { LoginPage } from './pages/LoginPage'
import { PortalHomePage } from './pages/PortalHomePage'
import { ProfilePage } from './pages/ProfilePage'
import { PublicQueryPage } from './pages/PublicQueryPage'
import { QualityEvaluationPage } from './pages/QualityEvaluationPage'
import { RegisterPage } from './pages/RegisterPage'
import { RectificationPage } from './pages/RectificationPage'
import { ReviewPage } from './pages/ReviewPage'
import { StatsPage } from './pages/StatsPage'

function ProtectedRoutes() {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          path="/admin"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <AdminHomePage />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/registrations"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <AdminRegistrationsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <AdminUsersPage />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/feedback"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <AdminFeedbackPage />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/batches/:id"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <BatchDetailPage />
            </RoleGuard>
          }
        />

        <Route
          path="/farmer"
          element={
            <RoleGuard allowedRoles={['farmer']}>
              <PortalHomePage
                title="茶农工作台"
                description="茶农可查看与自己相关的批次，并补录种植、采摘等生产阶段信息。"
                shortcuts={[
                  { label: '我的批次', to: '/batches' },
                  { label: '整改任务', to: '/rectifications' },
                  { label: '个人中心', to: '/profile' },
                ]}
              />
            </RoleGuard>
          }
        />
        <Route
          path="/farmer/batches"
          element={
            <RoleGuard allowedRoles={['farmer']}>
              <BatchListPage />
            </RoleGuard>
          }
        />
        <Route
          path="/farmer/batches/:id"
          element={
            <RoleGuard allowedRoles={['farmer']}>
              <BatchDetailPage />
            </RoleGuard>
          }
        />
        <Route
          path="/farmer/rectifications"
          element={
            <RoleGuard allowedRoles={['farmer']}>
              <RectificationPage />
            </RoleGuard>
          }
        />

        <Route
          path="/enterprise"
          element={
            <RoleGuard allowedRoles={['enterprise']}>
              <PortalHomePage
                title="企业工作台"
                description="企业可创建批次、维护加工包装流通信息，并发起品质评估与查看统计分析。"
                shortcuts={[
                  { label: '批次管理', to: '/batches' },
                  { label: '整改任务', to: '/rectifications' },
                  { label: '品质评估', to: '/quality/new' },
                  { label: '统计分析', to: '/stats' },
                ]}
              />
            </RoleGuard>
          }
        />
        <Route
          path="/enterprise/rectifications"
          element={
            <RoleGuard allowedRoles={['enterprise']}>
              <RectificationPage />
            </RoleGuard>
          }
        />
        <Route
          path="/enterprise/batches"
          element={
            <RoleGuard allowedRoles={['enterprise']}>
              <BatchListPage />
            </RoleGuard>
          }
        />
        <Route
          path="/enterprise/batches/:id"
          element={
            <RoleGuard allowedRoles={['enterprise']}>
              <BatchDetailPage />
            </RoleGuard>
          }
        />
        <Route
          path="/enterprise/quality/new"
          element={
            <RoleGuard allowedRoles={['enterprise']}>
              <QualityEvaluationPage />
            </RoleGuard>
          }
        />
        <Route
          path="/enterprise/stats"
          element={
            <RoleGuard allowedRoles={['enterprise']}>
              <StatsPage />
            </RoleGuard>
          }
        />

        <Route
          path="/regulator"
          element={
            <RoleGuard allowedRoles={['regulator']}>
              <PortalHomePage
                title="监管工作台"
                description="监管方可查看全部批次、执行业务审核并查看统计分析结果。"
                shortcuts={[
                  { label: '批次审核', to: '/reviews' },
                  { label: '统计分析', to: '/stats' },
                ]}
              />
            </RoleGuard>
          }
        />
        <Route
          path="/regulator/reviews"
          element={
            <RoleGuard allowedRoles={['regulator']}>
              <ReviewPage />
            </RoleGuard>
          }
        />
        <Route
          path="/regulator/stats"
          element={
            <RoleGuard allowedRoles={['regulator']}>
              <StatsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/regulator/batches/:id"
          element={
            <RoleGuard allowedRoles={['regulator']}>
              <BatchDetailPage />
            </RoleGuard>
          }
        />

        <Route
          path="/consumer"
          element={
            <RoleGuard allowedRoles={['consumer']}>
              <ConsumerHomePage />
            </RoleGuard>
          }
        />
        <Route
          path="/consumer/query"
          element={
            <RoleGuard allowedRoles={['consumer']}>
              <PublicQueryPage />
            </RoleGuard>
          }
        />
        <Route
          path="/consumer/favorites"
          element={
            <RoleGuard allowedRoles={['consumer']}>
              <ConsumerFavoritesPage />
            </RoleGuard>
          }
        />
        <Route
          path="/consumer/feedback"
          element={
            <RoleGuard allowedRoles={['consumer']}>
              <ConsumerFeedbackPage />
            </RoleGuard>
          }
        />

        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="/batches" element={<Navigate to={getDefaultRoute(user)} replace />} />
      <Route path="/batches/:id" element={<Navigate to={getDefaultRoute(user)} replace />} />
      <Route path="/quality/new" element={<Navigate to={getDefaultRoute(user)} replace />} />
      <Route path="/stats" element={<Navigate to={getDefaultRoute(user)} replace />} />
      <Route path="/reviews" element={<Navigate to={getDefaultRoute(user)} replace />} />
      <Route path="*" element={<Navigate to={getDefaultRoute(user)} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/public-query" element={<PublicQueryPage />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  )
}

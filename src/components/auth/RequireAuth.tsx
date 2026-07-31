import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PageSkeleton } from '../ui/Skeleton'

export function RequireAuth() {
  const { isAuthenticated, isRestoring } = useAuth()
  const location = useLocation()
  if (isRestoring) return <PageSkeleton />

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

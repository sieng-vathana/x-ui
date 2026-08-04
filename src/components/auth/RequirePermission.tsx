import { Navigate, Outlet, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { paths } from '../../lib/paths'

export function RequirePermission({ permission }: { permission: string }) {
  const { user } = useAuth()
  const parentContext = useOutletContext()

  if (!user?.permissions.includes(permission)) {
    return <Navigate to={paths.products} replace />
  }

  return <Outlet context={parentContext} />
}

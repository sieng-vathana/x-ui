import { Navigate, Outlet, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { paths } from '../../lib/paths'

export function RequirePermission({ permission }: { permission: string }) {
  const { user } = useAuth()
  const parentContext = useOutletContext()

  if (!user?.permissions.includes(permission)) {
    const fallback = [
      ['x-bff:read', paths.dashboard],
      ['x-order:create', paths.pos],
      ['x-product:read', paths.products],
      ['x-store:read', paths.stores],
      ['x-inventory:read', paths.purchases],
      ['x-user:read', paths.users],
    ].find(([required]) => user?.permissions.includes(required))?.[1] ?? '/sign-in'
    return <Navigate to={fallback} replace />
  }

  return <Outlet context={parentContext} />
}

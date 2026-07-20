import { useOutletContext } from 'react-router-dom'
import type { AdminOutletContext } from '../layouts/AdminLayout'

export function useAdminStore() {
  return useOutletContext<AdminOutletContext>()
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../lib/api'
import { storeApi } from './storeApi'
import type { BffStore, CreateStoreRequest, UpdateStoreRequest } from './types'
import type { StoreOption } from '../../components/pos/StoreSwitcher'

function storeImageUrl(store: BffStore): string | undefined {
  const image = store.images?.find((img) => img.isPrimary) ?? store.images?.[0]
  return image?.imageUrl
}

export function toStoreOption(store: BffStore): StoreOption {
  const address = [store.addressLine1, store.city].filter(Boolean).join(', ')
  return {
    id: String(store.id),
    name: store.name,
    address: address || undefined,
    image: storeImageUrl(store),
  }
}

export function useStores() {
  const { user } = useAuth()
  const businessId = user?.business.id

  return useQuery({
    queryKey: ['stores', { businessId }],
    queryFn: () => storeApi.getByBusiness(businessId!),
    enabled: Boolean(businessId),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false
      return failureCount < 1
    },
    select: (stores) => stores.map(toStoreOption),
  })
}

export function useStoresRaw() {
  const { user } = useAuth()
  const businessId = user?.business.id

  return useQuery({
    queryKey: ['stores', { businessId }],
    queryFn: () => storeApi.getByBusiness(businessId!),
    enabled: Boolean(businessId),
    staleTime: 5 * 60 * 1000,
    // Store management must replace any login-bootstrap cache with the
    // canonical records, including their direct AWS image URLs.
    refetchOnMount: 'always',
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false
      return failureCount < 1
    },
  })
}

export function useCreateStore() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (request: Omit<CreateStoreRequest, 'businessId'>) =>
      storeApi.create({ ...request, businessId: Number(user?.business.id) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}

export function useUpdateStore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateStoreRequest }) =>
      storeApi.update(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}

export function useSoftDeleteStore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => storeApi.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}

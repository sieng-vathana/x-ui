import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../lib/api'
import { productApi } from './productApi'
import type { CreateProductPayload } from './types'

export function useProductsList(storeId?: string | number) {
  return useQuery({
    queryKey: ['products-list', { storeId }],
    queryFn: () => productApi.getProducts(storeId),
    staleTime: 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false
      return failureCount < 1
    },
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateProductPayload) => productApi.createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-list'] })
    },
  })
}

export function useProductCategories(storeId?: string | number) {
  const { user } = useAuth()
  const businessId = user?.business?.id

  return useQuery({
    queryKey: ['product-categories', { businessId, storeId }],
    queryFn: () => productApi.getCategories(businessId!, storeId),
    enabled: Boolean(businessId),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false
      return failureCount < 1
    },
  })
}

export function useProductUnits(storeId?: string | number) {
  const { user } = useAuth()
  const businessId = user?.business?.id

  return useQuery({
    queryKey: ['product-units', { businessId, storeId }],
    queryFn: () => productApi.getUnits(businessId!, storeId),
    enabled: Boolean(businessId),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false
      return failureCount < 1
    },
  })
}

export function useProductBrands(storeId?: string | number) {
  const { user } = useAuth()
  const businessId = user?.business?.id

  return useQuery({
    queryKey: ['product-brands', { businessId, storeId }],
    queryFn: () => productApi.getBrands(businessId!, storeId),
    enabled: Boolean(businessId),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false
      return failureCount < 1
    },
  })
}

export function useProductTaxes(storeId?: string | number) {
  const { user } = useAuth()
  const businessId = user?.business?.id

  return useQuery({
    queryKey: ['product-taxes', { businessId, storeId }],
    queryFn: () => productApi.getTaxes(businessId!, storeId),
    enabled: Boolean(businessId),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false
      return failureCount < 1
    },
  })
}

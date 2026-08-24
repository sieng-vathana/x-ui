import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../lib/api'
import { productApi } from './productApi'
import type {
  CreateProductBrandPayload,
  CreateProductCategoryPayload,
  CreateProductPayload,
  CreateProductUnitPayload,
} from './types'

function normalizeStoreId(storeId?: string | number): number | undefined {
  const numericId = Number(storeId)
  return Number.isInteger(numericId) && numericId > 0 ? numericId : undefined
}

export function useProductsList(storeId?: string | number, enabled = true) {
  return useQuery({
    queryKey: ['products-list', { storeId: normalizeStoreId(storeId) }],
    queryFn: () => productApi.getProducts(normalizeStoreId(storeId)),
    enabled: enabled && Boolean(normalizeStoreId(storeId)),
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
  const normalizedStoreId = normalizeStoreId(storeId)

  return useQuery({
    queryKey: ['product-categories', { businessId, storeId: normalizedStoreId }],
    queryFn: () => productApi.getCategories(businessId!, normalizedStoreId),
    enabled: Boolean(businessId && normalizedStoreId),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false
      return failureCount < 1
    },
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (payload: Omit<CreateProductCategoryPayload, 'businessId'>) =>
      productApi.createCategory({ ...payload, businessId: Number(user?.business?.id) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Omit<CreateProductCategoryPayload, 'businessId'> }) =>
      productApi.updateCategory(id, { ...payload, businessId: Number(user?.business?.id) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (id: number) => productApi.deleteCategory(id, Number(user?.business?.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
    },
  })
}

export function useProductUnits(storeId?: string | number) {
  const { user } = useAuth()
  const businessId = user?.business?.id
  const normalizedStoreId = normalizeStoreId(storeId)

  return useQuery({
    queryKey: ['product-units', { businessId, storeId: normalizedStoreId }],
    queryFn: () => productApi.getUnits(businessId!, normalizedStoreId),
    enabled: Boolean(businessId && normalizedStoreId),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false
      return failureCount < 1
    },
  })
}

export function useCreateUnit() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (payload: Omit<CreateProductUnitPayload, 'businessId'>) =>
      productApi.createUnit({ ...payload, businessId: Number(user?.business?.id) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-units'] })
    },
  })
}

export function useUpdateUnit() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Omit<CreateProductUnitPayload, 'businessId'> }) =>
      productApi.updateUnit(id, { ...payload, businessId: Number(user?.business?.id) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-units'] })
    },
  })
}

export function useDeleteUnit() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (id: number) => productApi.deleteUnit(id, Number(user?.business?.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-units'] })
    },
  })
}

export function useProductBrands(storeId?: string | number) {
  const { user } = useAuth()
  const businessId = user?.business?.id
  const normalizedStoreId = normalizeStoreId(storeId)

  return useQuery({
    queryKey: ['product-brands', { businessId, storeId: normalizedStoreId }],
    queryFn: () => productApi.getBrands(businessId!, normalizedStoreId),
    enabled: Boolean(businessId && normalizedStoreId),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false
      return failureCount < 1
    },
  })
}

export function useCreateBrand() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (payload: Omit<CreateProductBrandPayload, 'businessId'>) =>
      productApi.createBrand({ ...payload, businessId: Number(user?.business?.id) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-brands'] })
    },
  })
}

export function useUpdateBrand() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Omit<CreateProductBrandPayload, 'businessId'> }) =>
      productApi.updateBrand(id, { ...payload, businessId: Number(user?.business?.id) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-brands'] })
    },
  })
}

export function useDeleteBrand() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (id: number) => productApi.deleteBrand(id, Number(user?.business?.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-brands'] })
    },
  })
}

export function useProductTaxes(storeId?: string | number) {
  const { user } = useAuth()
  const businessId = user?.business?.id
  const normalizedStoreId = normalizeStoreId(storeId)

  return useQuery({
    queryKey: ['product-taxes', { businessId, storeId: normalizedStoreId }],
    queryFn: () => productApi.getTaxes(businessId!, normalizedStoreId),
    enabled: Boolean(businessId && normalizedStoreId),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false
      return failureCount < 1
    },
  })
}

export function useProductSuppliers(storeId?: string | number) {
  const { user } = useAuth()
  const businessId = user?.business?.id
  const normalizedStoreId = normalizeStoreId(storeId)

  return useQuery({
    queryKey: ['product-suppliers', { businessId, storeId: normalizedStoreId }],
    queryFn: () => productApi.getSuppliers(businessId!, normalizedStoreId),
    enabled: Boolean(businessId && normalizedStoreId),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false
      return failureCount < 1
    },
  })
}

export function useProductAttributes() {
  const { user } = useAuth()
  const businessId = user?.business?.id

  return useQuery({
    queryKey: ['product-attributes', { businessId }],
    queryFn: () => productApi.getAttributes(businessId!),
    enabled: Boolean(businessId),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false
      return failureCount < 1
    },
  })
}

export function useProductAttributeValues(attributeId?: number) {
  return useQuery({
    queryKey: ['product-attribute-values', { attributeId }],
    queryFn: () => productApi.getAttributeValues(attributeId!),
    enabled: Boolean(attributeId && attributeId > 0),
    staleTime: 5 * 60 * 1000,
  })
}

export function useProduct(idOrSku?: string | number) {
  return useQuery({
    queryKey: ['product', { idOrSku }],
    queryFn: () => productApi.getProductById(idOrSku!),
    enabled: Boolean(idOrSku),
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: CreateProductPayload }) =>
      productApi.updateProduct(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products-list'] })
      queryClient.invalidateQueries({ queryKey: ['product', { idOrSku: variables.id }] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idOrSku: string | number) => productApi.deleteProduct(idOrSku),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-list'] })
    },
  })
}

export function useProductOptionsList(businessIdOverride?: string | number) {
  const { user } = useAuth()
  const businessId = businessIdOverride ?? user?.business?.id ?? 1

  return useQuery({
    queryKey: ['product-options-list', { businessId }],
    queryFn: () => productApi.getProductOptions(businessId),
    enabled: Boolean(businessId),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false
      return failureCount < 1
    },
  })
}

export function useProductOption(optionId?: string | number) {
  return useQuery({
    queryKey: ['product-option', { optionId }],
    queryFn: () => productApi.getSingleOption(optionId!),
    enabled: Boolean(optionId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateProductOption() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (payload: {
      businessId?: number
      attributeName: string
      status?: number
      values: { id?: number; value: string }[]
      isGlobal?: boolean
      storeIds?: number[]
      description?: string
    }) =>
      productApi.createProductOption({
        businessId: payload.businessId ?? (Number(user?.business?.id) || 1),
        attributeName: payload.attributeName,
        status: payload.status ?? 1,
        values: payload.values.map((v) => (v.id ? { id: Number(v.id), value: v.value } : { value: v.value })),
        ...(payload.isGlobal !== undefined ? { isGlobal: payload.isGlobal } : {}),
        ...(payload.storeIds ? { storeIds: payload.storeIds } : {}),
        ...(payload.description ? { description: payload.description } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-options-list'] })
    },
  })
}

export function useUpdateProductOption() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const businessId = Number(user?.business?.id) || 1

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number | string
      payload: {
        attributeName: string
        status?: number
        values: { id?: number; value: string }[]
        isGlobal?: boolean
        storeIds?: number[]
        description?: string
      }
    }) =>
      productApi.updateProductOption(id, {
        businessId,
        attributeName: payload.attributeName,
        status: payload.status ?? 1,
        values: payload.values.map((v) => (v.id ? { id: Number(v.id), value: v.value } : { value: v.value })),
        ...(payload.isGlobal !== undefined ? { isGlobal: payload.isGlobal } : {}),
        ...(payload.storeIds ? { storeIds: payload.storeIds } : {}),
        ...(payload.description ? { description: payload.description } : {}),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-options-list'] })
      queryClient.invalidateQueries({ queryKey: ['product-option', { optionId: variables.id }] })
    },
  })
}

export function useAddOptionValue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ optionId, value }: { optionId: number | string; value: string }) =>
      productApi.addOptionValue(optionId, { value }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-options-list'] })
      queryClient.invalidateQueries({ queryKey: ['product-option', { optionId: variables.optionId }] })
    },
  })
}

export function useDeleteOptionValue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: { valueId: number | string; optionId?: number | string }) =>
      productApi.deleteOptionValue(variables.valueId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-options-list'] })
      if (variables.optionId) {
        queryClient.invalidateQueries({ queryKey: ['product-option', { optionId: variables.optionId }] })
      }
    },
  })
}

export function useDeleteProductOption() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number | string) => productApi.deleteProductOption(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-options-list'] })
    },
  })
}




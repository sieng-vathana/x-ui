import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { stockTransferApi, type StockTransferAction, type StockTransferCommandInput, type ReceiveStockTransferInput } from './stockTransferApi'

export function useStockTransfers(storeId?: number) {
  return useQuery({
    queryKey: ['stock-transfers', { storeId }],
    queryFn: () => stockTransferApi.list(storeId!),
    enabled: Boolean(storeId && storeId > 0),
    staleTime: 30_000,
  })
}

function useRefreshTransfers() {
  const queryClient = useQueryClient()
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] }),
      queryClient.invalidateQueries({ queryKey: ['stock-balance'] }),
      queryClient.invalidateQueries({ queryKey: ['stock-expiry-batches'] }),
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] }),
    ])
  }
}

export function useCreateStockTransfer() {
  const refresh = useRefreshTransfers()
  return useMutation({ mutationFn: stockTransferApi.create, onSuccess: refresh })
}

export function useStockTransferCommand() {
  const refresh = useRefreshTransfers()
  return useMutation({
    mutationFn: ({ id, action, input }: {
      id: number
      action: StockTransferAction
      input: StockTransferCommandInput
    }) => stockTransferApi.command(id, action, input),
    onSuccess: refresh,
  })
}

export function useReceiveStockTransfer() {
  const refresh = useRefreshTransfers()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ReceiveStockTransferInput }) =>
      stockTransferApi.receive(id, input),
    onSuccess: refresh,
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { telegramApi, type TelegramPreferences, type TelegramStatus } from './telegramApi'

const statusKey = (businessId: number | undefined) => ['telegram', businessId] as const

/** While waiting for the owner to press Start in Telegram, checks every 3 seconds until the chat connects. */
export function useTelegramStatus(businessId: number | undefined, waitingForConnection: boolean) {
  return useQuery({
    queryKey: statusKey(businessId),
    queryFn: () => telegramApi.status(businessId!, waitingForConnection),
    enabled: Boolean(businessId),
    refetchInterval: (query) => (waitingForConnection && !query.state.data?.connected ? 3000 : false),
  })
}

function useStatusMutation<Input>(businessId: number | undefined, run: (businessId: number, input: Input) => Promise<TelegramStatus>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Input) => run(businessId!, input),
    onSuccess: (status) => queryClient.setQueryData(statusKey(businessId), status),
  })
}

export function useUpdateTelegramPreferences(businessId: number | undefined) {
  return useStatusMutation(businessId, (id, preferences: TelegramPreferences) => telegramApi.updatePreferences(id, preferences))
}

export function useDisconnectTelegram(businessId: number | undefined) {
  return useStatusMutation(businessId, (id, _: void) => telegramApi.disconnect(id))
}

export function useCreateTelegramLink(businessId: number | undefined) {
  return useMutation({ mutationFn: () => telegramApi.createLink(businessId!) })
}

export function useSendTelegramTest(businessId: number | undefined) {
  return useMutation({ mutationFn: () => telegramApi.sendTest(businessId!) })
}

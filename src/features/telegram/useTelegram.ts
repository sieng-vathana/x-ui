import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { telegramApi, type TelegramChatChanges, type TelegramPreferences, type TelegramStatus } from './telegramApi'

const statusKey = (businessId: number | undefined) => ['telegram', businessId] as const

/** Reloaded when the bot links or drops a chat: the business service pushes telegram.chats.changed (see RealtimeBridge). */
export function useTelegramStatus(businessId: number | undefined, waitingForConnection: boolean) {
  return useQuery({
    queryKey: statusKey(businessId),
    queryFn: () => telegramApi.status(businessId!, waitingForConnection),
    enabled: Boolean(businessId),
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

export function useUpdateTelegramChat(businessId: number | undefined) {
  return useStatusMutation(businessId, (id, { chatId, changes }: { chatId: number; changes: TelegramChatChanges }) =>
    telegramApi.updateChat(id, chatId, changes))
}

export function useDisconnectTelegramChat(businessId: number | undefined) {
  return useStatusMutation(businessId, (id, chatId: number) => telegramApi.disconnectChat(id, chatId))
}

export function useCreateTelegramLink(businessId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => telegramApi.createLink(businessId!),
    onSuccess: () => queryClient.setQueryData<TelegramStatus>(statusKey(businessId), (status) => status && { ...status, linkPending: true }),
  })
}

export function useSendTelegramTest(businessId: number | undefined) {
  return useMutation({ mutationFn: (chatId: number) => telegramApi.sendTest(businessId!, chatId) })
}

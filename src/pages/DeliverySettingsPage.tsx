import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Breadcrumb, Button, Icon, StoreSwitcher, Topbar } from '../components'
import { useToast } from '../context/ToastContext'
import { useStoresRaw } from '../features/stores/useStores'
import { deliveryApi, type DeliveryProviderType } from '../features/deliveries/deliveryApi'
import { useAdminStore } from '../hooks/useAdminStore'
import { card, pageContent } from '../lib/ui'
import { paths } from '../lib/paths'

const providerDetails: Record<DeliveryProviderType, { description: string; icon: string }> = {
  GRAB: { description: 'On-demand pickup and local parcel delivery with GrabExpress.', icon: 'e-bike-2-line' },
  VIREAK_BUNTHAM: { description: 'Parcel and intercity delivery through Vireak Buntham.', icon: 'truck-line' },
  OWN_RIDER: { description: 'Deliver orders with your store’s own rider team.', icon: 'user-star-line' },
}

export function DeliverySettingsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { storeId, setStoreId } = useAdminStore()
  const storesQuery = useStoresRaw()
  const stores = storesQuery.data ?? []
  const selectedStoreId = Number(storeId)
  const selectedStore = stores.find((store) => store.id === selectedStoreId)

  const providersQuery = useQuery({
    queryKey: ['deliveryProviders'],
    queryFn: () => deliveryApi.getProviders(),
    staleTime: 30_000,
  })
  const configQuery = useQuery({
    queryKey: ['storeDeliveryConfig', selectedStoreId],
    queryFn: () => deliveryApi.getStoreConfig(selectedStoreId),
    enabled: Number.isInteger(selectedStoreId) && selectedStoreId > 0,
    staleTime: 30_000,
  })

  const [enabledProviders, setEnabledProviders] = useState<DeliveryProviderType[]>([])
  const [defaultProvider, setDefaultProvider] = useState<DeliveryProviderType | null>(null)

  useEffect(() => {
    if (!configQuery.data) return
    setEnabledProviders(configQuery.data.enabledProviders)
    setDefaultProvider(configQuery.data.defaultProvider)
  }, [configQuery.data])

  const availableProviders = useMemo(
    () => (providersQuery.data ?? []).filter((provider) => provider.enabled),
    [providersQuery.data],
  )

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!defaultProvider) throw new Error('Choose a default delivery provider.')
      return deliveryApi.updateStoreConfig(selectedStoreId, { enabledProviders, defaultProvider })
    },
    onSuccess: (config) => {
      queryClient.setQueryData(['storeDeliveryConfig', selectedStoreId], config)
      queryClient.invalidateQueries({ queryKey: ['storeDeliveryConfig', selectedStoreId] })
      toast.success('Delivery settings saved for this store.')
    },
    onError: (failure: Error) => toast.error(failure.message || 'Delivery settings could not be saved.'),
  })

  const originalProviders = configQuery.data?.enabledProviders ?? []
  const isDirty = [...enabledProviders].sort().join('|') !== [...originalProviders].sort().join('|')
    || defaultProvider !== configQuery.data?.defaultProvider

  const toggleProvider = (provider: DeliveryProviderType) => {
    if (enabledProviders.includes(provider)) {
      if (enabledProviders.length === 1) return
      const next = enabledProviders.filter((item) => item !== provider)
      setEnabledProviders(next)
      if (defaultProvider === provider) setDefaultProvider(next[0] ?? null)
      return
    }
    setEnabledProviders([...enabledProviders, provider])
    if (enabledProviders.length === 0) setDefaultProvider(provider)
  }

  return (
    <>
      <Topbar
        title="Delivery settings"
        subtitle="Choose which platform delivery providers this store offers to customers."
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-6">
          <Breadcrumb items={[{ label: 'Settings', to: paths.settings }, { label: 'Delivery settings' }]} />
        </section>

        <section className={`${card} mb-5 flex items-start gap-3 p-4 sm:p-5`}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-700"><Icon name="information-line" /></span>
          <div>
            <h2 className="m-0 text-[14px] font-extrabold text-vpos-text">Your store’s delivery choices</h2>
            <p className="mt-1 mb-0 text-[13px] leading-5 text-vpos-muted">
              Backoffice controls which providers the platform supports. Choose from those providers here, separately for each store. Booking is currently simulated; live courier integrations will be connected later.
            </p>
          </div>
        </section>

        {storesQuery.isError ? (
          <section className={`${card} p-6`}>
            <h2 className="m-0 text-[15px] font-extrabold text-vpos-text">Could not load your stores</h2>
            <p className="mt-2 mb-0 text-[13px] text-vpos-muted">{(storesQuery.error as Error).message}</p>
          </section>
        ) : storesQuery.isLoading ? (
          <section className={`${card} h-64 animate-pulse`} />
        ) : stores.length === 0 ? (
          <section className={`${card} p-10 text-center`}>
            <Icon name="store-2-line" className="text-4xl text-vpos-muted" />
            <h2 className="mt-3 text-[16px] font-extrabold text-vpos-text">No store is available</h2>
            <p className="mt-1 text-[13px] text-vpos-muted">Create or activate a store before configuring its delivery options.</p>
          </section>
        ) : configQuery.isError || providersQuery.isError ? (
          <section className={`${card} p-6`}>
            <h2 className="m-0 text-[15px] font-extrabold text-vpos-text">Delivery settings could not be loaded</h2>
            <p className="mt-2 mb-0 text-[13px] text-vpos-muted">
              {((configQuery.error ?? providersQuery.error) as Error).message}
            </p>
            <Button variant="secondary" className="mt-4" onClick={() => { void configQuery.refetch(); void providersQuery.refetch() }}>
              <Icon name="refresh-line" /> Try again
            </Button>
          </section>
        ) : configQuery.isLoading || providersQuery.isLoading || !configQuery.data || !providersQuery.data ? (
          <section className={`${card} h-64 animate-pulse`} />
        ) : (
          <>
            <section className={`${card} mb-5 overflow-hidden`}>
              <div className="flex flex-col gap-3 border-b border-vpos-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <div className="text-[11px] font-bold tracking-wide text-vpos-muted uppercase">Current store</div>
                  <h2 className="mt-1 mb-0 text-[18px] font-extrabold text-vpos-text">{selectedStore?.name ?? `Store #${selectedStoreId}`}</h2>
                  <p className="mt-1 mb-0 text-[12px] text-vpos-muted">{selectedStore?.city || 'Store delivery configuration'}</p>
                </div>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[12px] font-bold text-amber-800">
                  <Icon name="flask-line" /> Simulated provider booking
                </span>
              </div>

              <div className="p-5 sm:p-6">
                {availableProviders.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">
                    No delivery provider is currently offered by the platform. Contact Backoffice to enable a provider.
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="m-0 text-[15px] font-extrabold text-vpos-text">Providers for this store</h3>
                        <p className="mt-1 mb-0 text-[12px] text-vpos-muted">Customers and staff can choose from the providers you enable.</p>
                      </div>
                      <span className="text-[12px] font-semibold text-vpos-muted">{enabledProviders.length} selected</span>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      {availableProviders.map((provider) => {
                        const details = providerDetails[provider.providerType]
                        const enabled = enabledProviders.includes(provider.providerType)
                        const isDefault = defaultProvider === provider.providerType
                        return (
                          <article key={provider.providerType} className={`rounded-lg border p-4 transition ${enabled ? 'border-vpos-primary/40 bg-vpos-primary/[0.025]' : 'border-vpos-line'}`}>
                            <div className="flex items-start gap-3">
                              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[18px] ${enabled ? 'bg-vpos-primary/10 text-vpos-primary' : 'bg-vpos-subtle text-vpos-muted'}`}>
                                <Icon name={details.icon} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <h4 className="m-0 text-[14px] font-extrabold text-vpos-text">{provider.displayName}</h4>
                                <p className="mt-1 mb-0 text-[12px] leading-5 text-vpos-muted">{details.description}</p>
                              </div>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={enabled}
                                aria-label={`${enabled ? 'Disable' : 'Enable'} ${provider.displayName} for this store`}
                                disabled={enabled && enabledProviders.length === 1}
                                title={enabled && enabledProviders.length === 1 ? 'Keep at least one provider enabled.' : undefined}
                                onClick={() => toggleProvider(provider.providerType)}
                                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vpos-primary disabled:cursor-not-allowed disabled:opacity-60 ${enabled ? 'bg-vpos-primary' : 'bg-slate-300'}`}
                              >
                                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                              </button>
                            </div>
                            <div className="mt-4 flex items-center justify-between border-t border-vpos-line/70 pt-3">
                              <span className={`text-[11px] font-bold ${enabled ? 'text-emerald-700' : 'text-vpos-muted'}`}>
                                {isDefault ? 'Default provider' : enabled ? 'Enabled for this store' : 'Not offered by this store'}
                              </span>
                              {enabled && !isDefault ? (
                                <button type="button" onClick={() => setDefaultProvider(provider.providerType)} className="text-[12px] font-bold text-vpos-primary hover:underline">
                                  Set as default
                                </button>
                              ) : isDefault ? <Icon name="checkbox-circle-fill" className="text-emerald-600" /> : null}
                            </div>
                          </article>
                        )
                      })}
                    </div>

                    <div className="mt-5 flex flex-col gap-3 border-t border-vpos-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="m-0 text-[12px] text-vpos-muted">
                        {defaultProvider ? `New deliveries default to ${availableProviders.find((provider) => provider.providerType === defaultProvider)?.displayName ?? defaultProvider}.` : 'Choose at least one provider and set a default.'}
                      </p>
                      <Button
                        onClick={() => saveMutation.mutate()}
                        disabled={!isDirty || saveMutation.isPending || enabledProviders.length === 0 || !defaultProvider}
                      >
                        <Icon name={saveMutation.isPending ? 'loader-4-line' : 'save-line'} className={saveMutation.isPending ? 'animate-spin' : undefined} />
                        {saveMutation.isPending ? 'Saving…' : 'Save delivery settings'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  )
}

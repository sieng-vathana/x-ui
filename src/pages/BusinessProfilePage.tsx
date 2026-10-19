import { BusinessBrandForm } from '../components/business/BusinessBrandForm'
import { LoyaltySettingsForm } from '../components/business/LoyaltySettingsForm'
import { PosConfigurationForm } from '../components/business/PosConfigurationForm'
import { TelegramAlertsForm } from '../components/business/TelegramAlertsForm'
import { TelegramMfaSettings } from '../components/auth/TelegramMfaSettings'
import { EmailMfaSettings } from '../components/auth/EmailMfaSettings'
import { Breadcrumb, Icon, StoreSwitcher, Topbar } from '../components'
import { useAuth } from '../context/AuthContext'
import { useStores } from '../features/stores/useStores'
import { useAdminStore } from '../hooks/useAdminStore'
import { card, pageContent } from '../lib/ui'
import { paths } from '../lib/paths'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../features/auth/authApi'
import { useToast } from '../context/ToastContext'

export function BusinessProfilePage() {
  const { user, updateBusinessSettings } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const businessId = user?.business.id
  const { data: businessReview } = useQuery({
    queryKey: ['businessReview', businessId],
    queryFn: () => authApi.getBusinessReview(businessId!),
    enabled: Boolean(businessId && businessId !== 'workspace'),
  })
  const resubmit = useMutation({
    mutationFn: () => authApi.resubmitBusiness(businessId!),
    onSuccess: () => {
      toast.success('Merchant application submitted for review.')
      queryClient.invalidateQueries({ queryKey: ['businessReview', businessId] })
    },
    onError: (failure: Error) => toast.error(failure.message),
  })
  const { storeId, setStoreId, sidebar } = useAdminStore()
  const { data: stores = [] } = useStores()
  const location = useLocation()
  const section = location.pathname === paths.settingsPos
    ? 'pos'
    : location.pathname === paths.settingsLayout
      ? 'layout'
      : location.pathname === paths.settingsTelegram
        ? 'telegram'
        : location.pathname === paths.settingsSecurity
          ? 'security'
          : location.pathname === paths.settingsLoyalty
            ? 'loyalty'
            : 'profile'
  const sectionLabel = section === 'pos'
    ? 'POS configuration'
    : section === 'layout'
      ? 'Workspace layout'
      : section === 'telegram'
        ? 'Telegram alerts'
        : section === 'security'
          ? 'Security & 2FA'
        : section === 'loyalty'
          ? 'Loyalty'
          : 'Business profile'
  const sectionSubtitle = section === 'pos'
    ? 'Control register currency, conversion, payment methods, and checkout behavior.'
    : section === 'layout'
      ? 'Choose how the workspace navigation behaves while you work.'
      : section === 'telegram'
        ? 'Get payments, online orders, low stock and a daily summary in Telegram.'
        : section === 'security'
          ? 'Protect your own account and manage your sign-in verification.'
        : section === 'loyalty'
          ? 'Reward customers by phone number with points and member prices.'
          : 'Control the identity your staff sees throughout the workspace.'

  return (
    <>
      <Topbar title={sectionLabel} subtitle={sectionSubtitle} actions={<StoreSwitcher value={storeId} onChange={setStoreId} />} />
      <main className={pageContent}>
        <section className="mb-6"><Breadcrumb items={[{ label: 'Settings', to: paths.settings }, { label: sectionLabel }]} /></section>
        {section === 'profile' && businessReview ? <section className={`${card} mb-6 p-5`}>
          <h2 className="m-0 text-[17px] font-extrabold text-vpos-text">Merchant approval</h2>
          <p className="mt-2 mb-0 text-[14px] text-vpos-muted">
            {businessReview.status === 1 ? 'Your merchant account is approved. Each store listing still needs its own marketplace review.'
              : businessReview.status === -1 ? 'Your application was returned. Update your business details and submit it again.'
                : 'Your merchant account is awaiting backoffice review. You can prepare your workspace now.'}
          </p>
          {businessReview.status === -1 ? <>
            <p className="mt-3 text-[14px] font-semibold text-rose-700">Reason: {businessReview.reviewReason || 'Contact backoffice for details.'}</p>
            <button type="button" disabled={resubmit.isPending} onClick={() => resubmit.mutate()} className="mt-3 rounded-lg bg-vpos-primary px-4 py-2 text-[14px] font-bold text-white disabled:opacity-60">Resubmit for approval</button>
          </> : null}
        </section> : null}
        {section === 'profile' ? <section className={`${card} overflow-hidden p-0`}>
          <div className="border-b border-vpos-line bg-vpos-subtle/45 px-6 py-6 sm:px-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-vpos-primary text-[22px] text-white">{user?.business.logoUrl ? <img src={user.business.logoUrl} alt="Current business logo" className="h-full w-full object-cover" /> : <Icon name="store-3-fill" />}</span><span><h2 className="m-0 text-[19px] font-extrabold text-vpos-text">Business identity</h2><p className="mt-1 mb-0 text-[13px] text-vpos-muted">Name and logo are reused in the left navigation.</p></span></div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-vpos-green-bg px-3 py-1.5 text-[12px] font-bold text-vpos-green"><Icon name="checkbox-circle-line" /> Workspace owner</span>
            </div>
          </div>
          <div className="p-6 sm:p-7"><BusinessBrandForm /></div>
        </section> : null}
        {section === 'pos' && user ? <section className={`${card} overflow-hidden p-0`}>
          <div className="border-b border-vpos-line bg-vpos-subtle/45 px-6 py-5 sm:px-7">
            <h2 className="m-0 text-[17px] font-extrabold text-vpos-text">POS and currency</h2>
            <p className="mt-1 mb-0 text-[13px] text-vpos-muted">Set the register currency, exchange rate, payment methods, and checkout behavior.</p>
          </div>
          <div className="p-5 sm:p-7"><PosConfigurationForm business={user.business} stores={stores} updateBusinessSettings={updateBusinessSettings} /></div>
        </section> : null}
        {section === 'loyalty' && user ? <section className={`${card} overflow-hidden p-0`}>
          <div className="border-b border-vpos-line bg-vpos-subtle/45 px-6 py-5 sm:px-7">
            <h2 className="m-0 text-[17px] font-extrabold text-vpos-text">Loyalty points and member prices</h2>
            <p className="mt-1 mb-0 text-[13px] text-vpos-muted">Find customers by phone at the POS. They earn points on what they pay and can use them on a later sale.</p>
          </div>
          <div className="p-5 sm:p-7"><LoyaltySettingsForm businessId={Number(user.business.id)} /></div>
        </section> : null}
        {section === 'telegram' && user ? <section className={`${card} overflow-hidden p-0`}>
          <div className="border-b border-vpos-line bg-vpos-subtle/45 px-6 py-5 sm:px-7">
            <h2 className="m-0 text-[17px] font-extrabold text-vpos-text">Telegram alerts</h2>
            <p className="mt-1 mb-0 text-[13px] text-vpos-muted">Choose Telegram chats for alerts about KHQR payments, online orders, low stock and the day's sales, and the stores each chat covers.</p>
          </div>
          <div className="p-5 sm:p-7"><TelegramAlertsForm businessId={Number(user.business.id)} businessName={user.business.name} /></div>
        </section> : null}
        {section === 'security' ? <section className={`${card} overflow-hidden p-0`}>
          <div className="border-b border-vpos-line bg-vpos-subtle/45 px-6 py-5 sm:px-7">
            <h2 className="m-0 text-[17px] font-extrabold text-vpos-text">Account security</h2>
            <p className="mt-1 mb-0 text-[13px] text-vpos-muted">Choose Telegram or email verification for your sign-in. You can manage either method below.</p>
          </div>
          <div className="grid gap-5 p-5 sm:p-7"><TelegramMfaSettings /><EmailMfaSettings /></div>
        </section> : null}
        {section === 'layout' ? <section className={`${card} overflow-hidden p-0`}>
          <div className="border-b border-vpos-line bg-vpos-subtle/45 px-6 py-5 sm:px-7">
            <h2 className="m-0 text-[17px] font-extrabold text-vpos-text">Workspace layout</h2>
            <p className="mt-1 mb-0 text-[13px] text-vpos-muted">Choose how the workspace navigation behaves while you work.</p>
          </div>
          <div className="grid gap-3 p-6 sm:grid-cols-2 sm:p-7">
            <button type="button" onClick={() => sidebar.updateConfig({ position: 'fixed' })} className={`rounded-xl border p-4 text-left transition-colors ${sidebar.config.position === 'fixed' ? 'border-vpos-primary bg-vpos-sand' : 'border-vpos-line bg-white hover:border-vpos-primary/45'}`} aria-pressed={sidebar.config.position === 'fixed'}>
              <span className="flex items-center justify-between gap-3"><strong className="text-[14px] text-vpos-text">Fixed</strong>{sidebar.config.position === 'fixed' ? <Icon name="checkbox-circle-fill" className="text-vpos-primary" /> : null}</span>
              <span className="mt-1 block text-[12px] leading-relaxed text-vpos-muted">Recommended for POS. The navigation and order panel stay anchored while the page scrolls.</span>
            </button>
            <button type="button" onClick={() => sidebar.updateConfig({ position: 'scrollable' })} className={`rounded-xl border p-4 text-left transition-colors ${sidebar.config.position === 'scrollable' ? 'border-vpos-primary bg-vpos-sand' : 'border-vpos-line bg-white hover:border-vpos-primary/45'}`} aria-pressed={sidebar.config.position === 'scrollable'}>
              <span className="flex items-center justify-between gap-3"><strong className="text-[14px] text-vpos-text">Scrollable</strong>{sidebar.config.position === 'scrollable' ? <Icon name="checkbox-circle-fill" className="text-vpos-primary" /> : null}</span>
              <span className="mt-1 block text-[12px] leading-relaxed text-vpos-muted">Let the navigation move with the page content.</span>
            </button>
          </div>
        </section> : null}
      </main>
    </>
  )
}

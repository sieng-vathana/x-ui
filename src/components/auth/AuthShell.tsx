import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Icon } from '../ui/Icon'

export function AuthShell({
  children,
  eyebrow,
  title,
  description,
  singleColumn = false,
}: {
  children: ReactNode
  eyebrow: string
  title: string
  description: string
  singleColumn?: boolean
}) {
  return (
    <main className="min-h-screen bg-vpos-bg p-4 sm:p-6 lg:p-8">
      <div className={`mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1180px] overflow-hidden rounded-[6px] border border-vpos-line bg-white shadow-vpos ${singleColumn ? 'max-w-[780px]' : 'lg:grid-cols-[.93fr_1.07fr]'}`}>
        {!singleColumn ? <section className="relative hidden overflow-hidden bg-vpos-primary p-10 text-white lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_10%,rgba(50,182,145,.34),transparent_31%),radial-gradient(circle_at_8%_88%,rgba(255,205,112,.18),transparent_28%)]" />
          <Link to="/sign-in" className="relative z-10 flex items-center gap-3 self-start no-underline">
            <span className="grid h-11 w-11 place-items-center rounded-[4px] bg-white/15 text-[22px] text-white">
              <Icon name="store-3-fill" />
            </span>
            <span>
              <strong className="block text-[19px] tracking-tight text-white">V-POS</strong>
              <small className="block text-[11px] font-bold tracking-[1.5px] text-white/55">SMART BUSINESS</small>
            </span>
          </Link>

          <div className="relative z-10 my-auto max-w-sm">
            <p className="mb-4 text-[12px] font-extrabold tracking-[.16em] text-[#9ce7cf]">ONE PLACE TO RUN YOUR BUSINESS</p>
            <h1 className="m-0 text-[43px] leading-[1.08] tracking-[-.045em] text-white">Today’s decisions, made simpler.</h1>
            <p className="mt-5 mb-0 max-w-[320px] text-[16px] leading-7 text-white/68">Bring sales, inventory, stores, and your team into one focused workspace.</p>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-3">
            {[
              ['store-2-line', 'Locations'],
              ['shopping-bag-3-line', 'Products'],
              ['line-chart-line', 'Insights'],
            ].map(([icon, label]) => (
              <div key={label} className="rounded-[4px] border border-white/10 bg-white/[.06] p-3">
                <Icon name={icon} className="text-[19px] text-[#9ce7cf]" />
                <span className="mt-3 block text-[12px] font-bold text-white/70">{label}</span>
              </div>
            ))}
          </div>
        </section> : null}

        <section className={`flex justify-center px-5 py-10 sm:px-10 ${singleColumn ? 'items-start' : 'items-center lg:px-[clamp(46px,6vw,92px)]'}`}>
          <div className={`w-full ${singleColumn ? 'max-w-[620px]' : 'max-w-[440px]'}`}>
            <Link to="/sign-in" className="mb-12 flex items-center gap-2.5 no-underline lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-[4px] bg-vpos-primary text-[19px] text-white"><Icon name="store-3-fill" /></span>
              <strong className="text-[18px] text-vpos-text">V-POS</strong>
            </Link>
            <p className="m-0 text-[12px] font-extrabold tracking-[.14em] text-vpos-primary">{eyebrow}</p>
            <h2 className="mt-3 mb-0 text-[33px] leading-tight tracking-[-.035em] text-vpos-text">{title}</h2>
            <p className="mt-3 mb-8 text-[15px] leading-6 text-vpos-muted">{description}</p>
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}

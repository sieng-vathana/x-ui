import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Icon } from '../ui/Icon'

export function AuthShell({
  children,
  eyebrow,
  title,
  description,
  singleColumn = false,
  variant = 'default',
}: {
  children: ReactNode
  eyebrow: string
  title: string
  description: string
  singleColumn?: boolean
  variant?: 'default' | 'reference'
}) {
  const isReference = variant === 'reference'

  return (
    <main className={`auth-stage ${isReference ? 'auth-stage--reference' : ''}`}>
      <div className={`auth-frame ${singleColumn ? 'auth-frame--single' : ''} ${isReference ? 'auth-frame--reference' : ''}`}>
        {!singleColumn ? (
          isReference ? <ReferenceRail /> : <aside className="auth-rail" aria-label="V-POS workspace overview">
            <div className="auth-rail-grid" />
            <div className="auth-rail-inner">
              <div className="auth-rail-topline">
                <Link to="/sign-in" className="auth-brand auth-brand--light">
                  <span className="auth-brand-mark"><Icon name="store-3-fill" /></span>
                  <span>
                    <strong className="auth-brand-name">V-POS</strong>
                    <small className="auth-brand-caption">OPERATIONS, IN SYNC</small>
                  </span>
                </Link>
                <span className="auth-live-chip"><i /> Workspace online</span>
              </div>

              <div className="auth-rail-copy">
                <p className="auth-rail-kicker">BUILT FOR THE BUSY HOUR</p>
                <h2>Keep the floor moving.</h2>
                <p>Sales, stock, stores, and your team — one clear view when the counter gets loud.</p>
              </div>

              <div className="auth-register-card" aria-label="Sample workspace activity">
                <div className="auth-register-card__topline">
                  <span className="auth-mono">TODAY / 09:42</span>
                  <span className="auth-register-card__signal"><i /> Live</span>
                </div>
                <div className="auth-register-card__metric">
                  <strong>128</strong>
                  <span>orders moving through your workspace</span>
                </div>
                <div className="auth-register-bars" aria-hidden="true">
                  <span style={{ height: '38%' }} />
                  <span style={{ height: '62%' }} />
                  <span style={{ height: '48%' }} />
                  <span style={{ height: '78%' }} />
                  <span style={{ height: '57%' }} />
                  <span style={{ height: '88%' }} />
                  <span style={{ height: '70%' }} />
                  <span style={{ height: '96%' }} />
                </div>
                <div className="auth-register-card__footer">
                  <span><b /> Sales steady</span>
                  <span className="auth-mono">+18.4%</span>
                </div>
              </div>

              <div className="auth-rail-footer">
                <span className="auth-mono">V-POS / COMMAND DESK</span>
                <span>Make the next decision obvious.</span>
              </div>
            </div>
          </aside>
        ) : null}

        <section className={`auth-pane ${singleColumn ? 'auth-pane--setup' : ''} ${isReference ? 'auth-pane--reference' : ''}`}>
          <div className="auth-mobile-brand">
            <Link to="/sign-in" className="auth-brand">
              <span className="auth-brand-mark"><Icon name="store-3-fill" /></span>
              <strong className="auth-brand-name">V-POS</strong>
            </Link>
            {singleColumn ? <span className="auth-mobile-meta">WORKSPACE SETUP</span> : null}
          </div>

          <div className={`auth-content ${singleColumn ? 'auth-content--setup' : ''} ${isReference ? 'auth-content--reference' : ''}`}>
            {singleColumn ? (
              <div className="auth-setup-strip">
                <Link to="/sign-in" className="auth-setup-brand">
                  <span className="auth-setup-brand-mark"><Icon name="store-3-fill" /></span>
                  <strong>V-POS</strong>
                </Link>
                <span className="auth-setup-badge"><Icon name="sparkling-2-line" /> Workspace setup</span>
                <span className="auth-mono">3 STEPS / ABOUT 4 MIN</span>
              </div>
            ) : null}
            <p className="auth-eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="auth-description">{description}</p>
            {children}
          </div>
        </section>
      </div>
      <p className="auth-stage-note"><Icon name="lock-2-line" /> Private by design · ready when your team is</p>
    </main>
  )
}

function ReferenceRail() {
  return (
    <aside className="auth-rail auth-rail--reference" aria-label="V-POS workspace overview">
      <div className="auth-reference-grid" />
      <div className="auth-reference-inner">
        <div className="auth-reference-topline">
          <Link to="/sign-in" className="auth-reference-brand">
            <span className="auth-reference-brand-mark"><Icon name="store-3-fill" /></span>
            <span>V-POS</span>
          </Link>
          <span className="auth-reference-status"><i /> Secure workspace</span>
        </div>

        <div className="auth-reference-copy">
          <p className="auth-reference-kicker">OPERATIONS, IN SYNC</p>
          <h2>Ready to keep<br />the floor moving?</h2>
          <p>One clear view for sales, stock, stores, and your team when the counter gets loud.</p>
        </div>

        <div className="auth-reference-mosaic" aria-hidden="true">
          <span className="auth-reference-tile auth-reference-tile--wide" />
          <span className="auth-reference-tile auth-reference-tile--tall" />
          <span className="auth-reference-tile" />
          <span className="auth-reference-tile" />
          <span className="auth-reference-tile auth-reference-tile--focus"><Icon name="line-chart-line" /></span>
          <span className="auth-reference-tile auth-reference-tile--tall" />
          <span className="auth-reference-tile" />
          <span className="auth-reference-tile auth-reference-tile--wide" />
        </div>

        <article className="auth-reference-quote">
          <div className="auth-reference-quote__brand"><span><Icon name="store-3-fill" /></span><strong>V-POS</strong></div>
          <p>“A calm command center for every busy hour.”</p>
          <footer>Workspace operations, in sync.</footer>
        </article>

        <div className="auth-reference-footer">
          <span className="auth-mono">V-POS / COMMAND DESK</span>
          <span>Make the next decision obvious.</span>
        </div>
      </div>
    </aside>
  )
}

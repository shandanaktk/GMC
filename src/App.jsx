import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Download,
  ExternalLink,
  FileSearch,
  FileText,
  Filter,
  HelpCircle,
  House,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  TriangleAlert,
  UserRoundCheck,
  WandSparkles,
  X,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { auditService } from './services/auditService'
import { auditDiscoveryCards, demoMerchantStories } from './mockData'

const numberFormatter = new Intl.NumberFormat('en-US')

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.13H3.06v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.93a6.02 6.02 0 0 1 0-3.86V7.45H3.06a10 10 0 0 0 0 9.1l3.34-2.62Z" />
      <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.94 5.45l3.34 2.62C7.19 7.7 9.4 5.94 12 5.94Z" />
    </svg>
  )
}

function Logo({ compact = false, inverse = false }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''} ${inverse ? 'brand--inverse' : ''}`}>
      <span className="brand-mark" aria-hidden="true"><b>M</b><i /></span>
      {!compact && <span className="brand-word">Merchant<span>Audit</span></span>}
    </div>
  )
}

function ThemeToggle({ theme, onToggle, label = false }) {
  return (
    <button className={`theme-toggle ${label ? 'theme-toggle--label' : ''}`} onClick={onToggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      {label && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  )
}

function DiscoveryGraphic({ type, stat }) {
  if (type === 'disapprovals') {
    return (
      <div className="discovery-graphic discovery-graphic--products" aria-hidden="true">
        <div className="mini-product mini-product--back"><span /><i /><b>SKU 2041</b></div>
        <div className="mini-product"><span><PackageCheck /></span><i /><i /><b>Invalid GTIN</b></div>
        <em><AlertCircle /> {stat} blocked</em>
      </div>
    )
  }
  if (type === 'mismatch') {
    return (
      <div className="discovery-graphic discovery-graphic--compare" aria-hidden="true">
        <div><small>FEED PRICE</small><b>$128</b><span>Submitted</span></div>
        <i><ArrowRight /></i>
        <div><small>PAGE PRICE</small><b>$119</b><span>Live site</span></div>
        <em><AlertTriangle /> Values don’t match</em>
      </div>
    )
  }
  if (type === 'account') {
    return (
      <div className="discovery-graphic discovery-graphic--shield" aria-hidden="true">
        <span className="shield-orbit"><i /><i /><i /></span>
        <span className="shield-core"><ShieldAlert /><b>{stat}</b></span>
        <em>Account diagnostics</em>
      </div>
    )
  }
  if (type === 'priority') {
    return (
      <div className="discovery-graphic discovery-graphic--queue" aria-hidden="true">
        <div><b>01</b><span><i />Invalid GTIN</span><em>64</em></div>
        <div><b>02</b><span><i />Price mismatch</span><em>31</em></div>
        <div><b>03</b><span><i />Missing brand</span><em>18</em></div>
      </div>
    )
  }
  return (
    <div className="discovery-graphic discovery-graphic--trend" aria-hidden="true">
      <div><small>HEALTH TREND</small><b>{stat}</b><span>points</span></div>
      <svg viewBox="0 0 260 100" preserveAspectRatio="none"><path d="M2 88 C35 84 43 72 70 75 S110 58 132 63 S172 39 194 43 S225 22 258 12" /><path className="trend-area" d="M2 88 C35 84 43 72 70 75 S110 58 132 63 S172 39 194 43 S225 22 258 12 L258 100 L2 100Z" /></svg>
    </div>
  )
}

function DiscoveryCarousel({ onSample }) {
  const trackRef = useRef(null)
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0 })
  const [active, setActive] = useState(0)

  const goTo = (nextIndex) => {
    const next = Math.max(0, Math.min(auditDiscoveryCards.length - 1, nextIndex))
    const track = trackRef.current
    const card = track?.children[next]
    if (track && card) track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: 'smooth' })
    setActive(next)
  }

  const syncActive = () => {
    const track = trackRef.current
    if (!track) return
    const positions = [...track.children].map((card) => Math.abs(card.offsetLeft - track.offsetLeft - track.scrollLeft))
    setActive(positions.indexOf(Math.min(...positions)))
  }

  const startDrag = (event) => {
    if (event.pointerType !== 'mouse') return
    dragRef.current = { active: true, startX: event.clientX, startScroll: trackRef.current.scrollLeft }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.classList.add('is-dragging')
  }

  const moveDrag = (event) => {
    if (!dragRef.current.active) return
    trackRef.current.scrollLeft = dragRef.current.startScroll - (event.clientX - dragRef.current.startX)
  }

  const endDrag = (event) => {
    if (!dragRef.current.active) return
    dragRef.current.active = false
    event.currentTarget.classList.remove('is-dragging')
    syncActive()
  }

  return (
    <section className="discovery-section" id="what-we-find">
      <div className="shell-width discovery-head">
        <div><span className="kicker">WHAT THE AUDIT UNCOVERS</span><h2>Every issue has<br />a next move.</h2></div>
        <div className="discovery-copy"><p>Swipe through a clearer way to understand your catalog. No vague error codes. No spreadsheet archaeology.</p><span><i /> Drag to explore</span></div>
        <div className="carousel-arrows">
          <button onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Previous audit check"><ChevronLeft /></button>
          <button onClick={() => goTo(active + 1)} disabled={active === auditDiscoveryCards.length - 1} aria-label="Next audit check"><ChevronRight /></button>
        </div>
      </div>
      <div className="discovery-track-shell">
        <div className="discovery-track" ref={trackRef} onScroll={syncActive} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
          {auditDiscoveryCards.map((card, index) => (
            <article className={`discovery-card discovery-card--${card.tone} ${active === index ? 'is-active' : ''}`} key={card.id}>
              <header><span>{card.number}</span><i>{card.eyebrow}</i><ArrowUpRight /></header>
              <DiscoveryGraphic type={card.id} stat={card.stat} />
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <footer><strong>{card.stat}</strong><span>{card.statLabel}</span></footer>
            </article>
          ))}
          <article className="discovery-card discovery-card--final">
            <span className="kicker">SEE IT ALL TOGETHER</span><h3>Your catalog has a story. Read the whole thing.</h3><button onClick={onSample}>Open sample audit <ArrowUpRight /></button>
          </article>
        </div>
      </div>
      <div className="shell-width carousel-progress"><span><i style={{ width: `${((active + 1) / auditDiscoveryCards.length) * 100}%` }} /></span><b>{String(active + 1).padStart(2, '0')} / {String(auditDiscoveryCards.length).padStart(2, '0')}</b></div>
    </section>
  )
}

function MerchantStories() {
  const [active, setActive] = useState(0)
  const touchStart = useRef(0)
  const story = demoMerchantStories[active]
  const goTo = (index) => setActive((index + demoMerchantStories.length) % demoMerchantStories.length)

  return (
    <section className="stories-section" id="merchant-stories" onTouchStart={(event) => { touchStart.current = event.touches[0].clientX }} onTouchEnd={(event) => { const distance = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(distance) > 45) goTo(active + (distance < 0 ? 1 : -1)) }}>
      <div className="shell-width stories-layout">
        <div className="stories-heading"><span className="kicker">SAMPLE MERCHANT STORIES</span><h2>But, don’t take<br />it from us<span>...</span></h2><p>Swipe through a few examples of what a clear, focused audit should feel like.</p><div className="stories-swipe-note"><ArrowRight /> Swipe or use the arrows</div></div>
        <article className="story-card" key={active}>
          <div className="story-quote-mark">“</div>
          <blockquote>{story.quote}</blockquote>
          <div className="story-quote-mark story-quote-mark--close">”</div>
          <footer><div className="story-avatar">{story.name.split(' ').map((part) => part[0]).join('')}</div><div><b>{story.name}</b><small>{story.role}</small></div><span><Check /> {story.result}</span></footer>
          <div className="story-controls"><b>{String(active + 1).padStart(2, '0')}<span> / {String(demoMerchantStories.length).padStart(2, '0')}</span></b><div><button onClick={() => goTo(active - 1)} aria-label="Previous story"><ChevronLeft /></button><button onClick={() => goTo(active + 1)} aria-label="Next story"><ChevronRight /></button></div></div>
        </article>
      </div>
    </section>
  )
}

function LandingPage({ theme, onThemeToggle, onSignIn, onSample, signingIn }) {
  return (
    <div className="landing landing--editorial">
      <div className="landing-hero-shell">
        <header className="landing-nav shell-width">
          <Logo inverse />
          <nav className="landing-links" aria-label="Main navigation">
            <a href="#what-we-find">What we find <span>+</span></a>
            <a href="#how-it-works">How it works <span>+</span></a>
            <a href="#security">Security <span>+</span></a>
          </nav>
          <div className="landing-actions">
            <ThemeToggle theme={theme} onToggle={onThemeToggle} />
            <button className="editorial-nav-cta" onClick={onSignIn} disabled={signingIn}>{signingIn ? 'Connecting…' : 'Start free audit'} <ArrowUpRight /></button>
          </div>
        </header>

        <section className="editorial-hero shell-width">
          <span className="hero-side-note hero-side-note--left">READ-ONLY GOOGLE ACCESS <i /></span>
          <span className="hero-side-note hero-side-note--right"><i /> RESULTS IN ABOUT 60 SECONDS</span>
          <div className="editorial-hero__copy">
            <span className="hero-kicker"><i /> GOOGLE MERCHANT CENTER, MADE LEGIBLE</span>
            <h1>Know what <span className="scribble-word">Google sees.</span><br />Fix what it<br /><em>doesn’t like.</em></h1>
            <p>A beautifully simple audit for product disapprovals, feed warnings, and account-level problems—ranked by what deserves your attention first.</p>
            <div className="editorial-hero__actions">
              <button className="split-cta" onClick={onSignIn} disabled={signingIn}><span>{signingIn ? 'Connecting securely…' : 'Audit my GMC'}</span><i>{signingIn ? <span className="mini-spinner" /> : <ArrowRight />}</i></button>
              <button className="hero-sample-link" onClick={onSample}>Explore a sample <ArrowUpRight /></button>
            </div>
          </div>
          <div className="hero-audit-visual" aria-label="Sample MerchantAudit dashboard card">
            <div className="hero-audit-card">
              <header><Logo compact /><div><span>LIVE AUDIT</span><b>Catalog overview</b></div><em><i /> Connected</em></header>
              <div className="hero-audit-score">
                <div className="hero-score-ring"><span><b>72</b><small>/100</small></span></div>
                <section><small>GMC HEALTH SCORE</small><h3>Needs attention</h3><p><TrendingUp /> 4 points since last audit</p></section>
              </div>
              <div className="hero-audit-stats"><div><small>APPROVED</small><b>2,421</b><span>85% of catalog</span></div><div><small>WARNINGS</small><b>286</b><span>Need a review</span></div><div><small>CRITICAL</small><b>96</b><span>Fix these first</span></div></div>
              <div className="hero-audit-list"><header><b>Top priorities</b><span>VIEW ALL</span></header><div><i className="red-dot" /><span>Invalid or missing GTIN</span><b>64</b></div><div><i className="orange-dot" /><span>Price mismatch</span><b>31</b></div><div><i className="blue-dot" /><span>Missing brand</span><b>18</b></div></div>
            </div>
            <div className="hero-visual-float hero-visual-float--score"><Sparkles /><span><b>+4 points</b><small>Health is improving</small></span></div>
            <div className="hero-visual-float hero-visual-float--alert"><AlertTriangle /><span><b>96 critical</b><small>Prioritized for you</small></span></div>
          </div>
          <div className="hero-scroll-cue"><span>SCROLL TO EXPLORE</span><i><ArrowDown /></i></div>
        </section>

        <div className="hero-marquee" aria-hidden="true"><div><span>DISAPPROVALS</span><i>✦</i><span>ACCOUNT HEALTH</span><i>✦</i><span>FEED QUALITY</span><i>✦</i><span>FIX PRIORITY</span><i>✦</i><span>DISAPPROVALS</span><i>✦</i><span>ACCOUNT HEALTH</span><i>✦</i><span>FEED QUALITY</span><i>✦</i><span>FIX PRIORITY</span><i>✦</i></div></div>
      </div>

      <main>
        <section className="intro-statement shell-width">
          <span className="intro-index">01 — WHY IT EXISTS</span>
          <p>Merchant Center tells you <em>what happened.</em></p>
          <h2>We show you what to do next.</h2>
          <div className="intro-foot"><p>One focused view of your catalog, the issues holding it back, and the shortest path to better account health.</p><button onClick={onSample}>View the live demo <span><ArrowDown /></span></button></div>
        </section>

        <DiscoveryCarousel onSample={onSample} />

        <section className="section shell-width" id="how-it-works">
          <div className="section-heading">
            <div><span className="kicker">THE SIMPLE VERSION</span><h2>From Google login<br />to a fix list.</h2></div>
            <p>No spreadsheets. No hunting through Merchant Center. Just the issues that matter and a sensible order to fix them.</p>
          </div>
          <div className="steps-grid">
            <article className="step-card"><span className="step-number">01</span><div className="step-icon"><UserRoundCheck /></div><h3>Connect securely</h3><p>Sign in with Google and select any Merchant Center account you authorize.</p><small>READ-ONLY ACCESS</small></article>
            <article className="step-card step-card--accent"><span className="step-number">02</span><div className="step-icon"><FileSearch /></div><h3>We scan the details</h3><p>We review product statuses, disapproval reasons, warnings, and account issues.</p><small>ABOUT 60 SECONDS</small></article>
            <article className="step-card"><span className="step-number">03</span><div className="step-icon"><ClipboardCheck /></div><h3>Get your fix list</h3><p>See a health score, the highest-impact problems, and clean product-level detail.</p><small>ACTIONABLE RESULTS</small></article>
          </div>
        </section>

        <MerchantStories />

        <section className="section check-section" id="features">
          <div className="shell-width check-layout">
            <div className="check-copy">
              <span className="kicker">A COMPLETE CHECKUP</span>
              <h2>Your whole GMC account, in plain language.</h2>
              <p>Technical problems are grouped by urgency and translated into clear next steps, so your team knows what to tackle first.</p>
              <button className="text-link" onClick={onSample}>View the sample audit <ArrowUpRight size={17} /></button>
            </div>
            <div className="check-list">
              <div><span><PackageCheck /></span><section><b>Product status health</b><p>Approved, disapproved, pending, and warning counts.</p></section><Check size={18} /></div>
              <div><span><TriangleAlert /></span><section><b>Disapprovals & warnings</b><p>Exact reasons, affected products, and severity.</p></section><Check size={18} /></div>
              <div><span><ShieldAlert /></span><section><b>Account-level issues</b><p>Policy problems and account suspension reasons.</p></section><Check size={18} /></div>
              <div><span><TrendingUp /></span><section><b>Health score & trends</b><p>A simple benchmark to measure ongoing improvement.</p></section><Check size={18} /></div>
            </div>
          </div>
        </section>

        <section className="section shell-width security-section" id="security">
          <div className="security-icon"><ShieldCheck /></div>
          <span className="kicker">BUILT WITH RESPECT FOR YOUR DATA</span>
          <h2>We look.<br /><em>We never touch.</em></h2>
          <p>MerchantAudit uses secure, session-based Google authentication and requests access only to read the Merchant Center data needed for your audit.</p>
          <div className="security-points"><span><Check /> No catalog edits</span><span><Check /> No payment required</span><span><Check /> Disconnect anytime</span></div>
        </section>

        <section className="final-cta">
          <div className="shell-width final-cta__inner">
            <div><span className="kicker">READY WHEN YOU ARE</span><h2>Your next fix could be one minute away.</h2><p>Connect your Merchant Center account or explore the demo first.</p></div>
            <div className="final-cta__actions"><button className="button button--lime button--large" onClick={onSignIn}><GoogleMark /> Start free audit <ArrowRight size={18} /></button><button className="button button--dark-ghost" onClick={onSample}>View sample</button></div>
          </div>
        </section>
      </main>

      <footer className="landing-footer shell-width">
        <Logo />
        <p>Google Merchant Center clarity, minus the clutter.</p>
        <div><button>Privacy</button><button>Terms</button><span>© 2026 MerchantAudit</span></div>
      </footer>
    </div>
  )
}

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Product issues', icon: PackageCheck },
  { id: 'account', label: 'Account health', icon: ShieldCheck },
]

function Sidebar({ activePage, onNavigate, account, user, open, onClose, onLogout, onSpecialist, theme, onThemeToggle }) {
  return (
    <>
      {open && <button className="sidebar-backdrop" aria-label="Close menu" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar-top"><Logo /><button className="mobile-close" onClick={onClose} aria-label="Close menu"><X /></button></div>
        <div className="account-switcher">
          <span className="store-avatar">NG</span>
          <div><b>{account.name}</b><small>ID: {account.id.replace('MC-', '')}</small></div>
          <ChevronDown size={15} />
        </div>
        <nav className="sidebar-nav" aria-label="Dashboard">
          <span className="nav-label">WORKSPACE</span>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={activePage === id ? 'active' : ''} onClick={() => { onNavigate(id); onClose() }}>
              <Icon size={18} /><span>{label}</span>{id === 'products' && <em>382</em>}
            </button>
          ))}
          <span className="nav-label nav-label--second">SUPPORT</span>
          <button onClick={onSpecialist}><LifeBuoy size={18} /><span>Hire a specialist</span></button>
          <button><CircleHelp size={18} /><span>Help center</span><ExternalLink size={13} className="nav-external" /></button>
          <button className="sidebar-theme" onClick={onThemeToggle}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}<span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span></button>
        </nav>
        <div className="sidebar-help">
          <span><WandSparkles size={17} /></span>
          <b>Need a hand?</b>
          <p>Let a GMC specialist fix complex issues for you.</p>
          <button onClick={onSpecialist}>Fix my GMC <ArrowRight size={14} /></button>
        </div>
        <div className="sidebar-user">
          <span className="user-avatar">{user.initials}</span>
          <div><b>{user.name}</b><small>{user.email}</small></div>
          <button onClick={onLogout} aria-label="Log out" title="Log out"><LogOut size={17} /></button>
        </div>
      </aside>
    </>
  )
}

function DashboardHeader({ activePage, account, theme, onThemeToggle, onMenu, onGoHome, notifications, notificationOpen, setNotificationOpen }) {
  const titles = { overview: 'Overview', products: 'Product issues', account: 'Account health' }
  const notificationRef = useRef(null)

  useEffect(() => {
    const close = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) setNotificationOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [setNotificationOpen])

  return (
    <header className="dashboard-header">
      <button className="menu-button" onClick={onMenu} aria-label="Open menu"><Menu /></button>
      <div className="mobile-brand"><Logo compact /><span>{titles[activePage]}</span></div>
      <div className="header-crumbs"><span>{account.name}</span><ChevronRight size={13} /><b>{titles[activePage]}</b></div>
      <div className="header-actions">
        <button className="icon-button dashboard-home-button" onClick={onGoHome} aria-label="Back to landing page" title="Back to landing page"><House size={18} /></button>
        <div className="connection-pill"><i /> GMC connected</div>
        <ThemeToggle theme={theme} onToggle={onThemeToggle} />
        <div className="notification-wrap" ref={notificationRef}>
          <button className="icon-button" onClick={() => setNotificationOpen((value) => !value)} aria-label="Notifications">
            <Bell size={18} /><i className="notification-dot" />
          </button>
          {notificationOpen && (
            <div className="notifications-popover">
              <div className="popover-title"><b>Notifications</b><button>Mark all read</button></div>
              {notifications.map((item) => (
                <div className="notification-item" key={item.id}>
                  <i className={item.unread ? 'unread' : ''} />
                  <div><b>{item.title}</b><p>{item.body}</p><small>{item.time}</small></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function StatusBadge({ severity, children }) {
  return <span className={`status-badge status-badge--${severity}`}><i />{children}</span>
}

function ScoreRing({ score, size = 'large' }) {
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  return (
    <div className={`score-ring score-ring--${size}`}>
      <svg viewBox="0 0 120 120">
        <circle className="score-ring__track" cx="60" cy="60" r={radius} />
        <circle className="score-ring__progress" cx="60" cy="60" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div><b>{score}</b><small>/100</small></div>
    </div>
  )
}

function CustomChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return <div className="chart-tooltip"><span>{label}</span><b>{payload[0].value}<small>/100</small></b></div>
}

function OverviewPage({ data, onRunAudit, onNavigate, onIssue, onSpecialist, onExport, onPrint }) {
  const { summary, account, healthTrend, productDistribution, priorityIssues, accountIssues } = data
  return (
    <div className="page page--overview">
      <div className="page-intro overview-intro">
        <div><span className="overline">AUDIT SNAPSHOT</span><h1>Good morning, <em>{data.user.name.split(' ')[0]}.</em></h1><p>Here’s what’s happening across your Merchant Center catalog.</p></div>
        <div className="page-actions"><button className="button button--outline" onClick={onPrint}><FileText size={17} /> Generate report</button><button className="button button--primary" onClick={onRunAudit}><RefreshCw size={17} /> Run new audit</button></div>
      </div>

      {account.status === 'suspended' && (
        <section className="suspension-banner">
          <div className="suspension-icon"><ShieldAlert /></div>
          <div className="suspension-copy"><span>ACCOUNT ACTION REQUIRED</span><h2>Your Merchant Center account is suspended</h2><p><b>{account.suspensionReason}.</b> {account.suspensionDetail}</p></div>
          <button className="button button--danger-soft" onClick={onSpecialist}>Get expert help <ArrowUpRight size={16} /></button>
        </section>
      )}

      <section className="metric-grid">
        <article className="metric-card metric-card--score">
          <div className="metric-card__head"><span>GMC health score</span><button aria-label="Health score information"><HelpCircle size={15} /></button></div>
          <div className="score-layout"><ScoreRing score={summary.healthScore} /><div><StatusBadge severity="warning">{summary.grade}</StatusBadge><p><ArrowUp size={13} /> <b>{summary.healthScore - summary.previousScore} points</b> since last audit</p></div></div>
          <div className="metric-footer"><span>Last audit</span><b>{account.lastAudit}</b></div>
        </article>
        <article className="metric-card">
          <div className="metric-card__head"><span>Products checked</span><span className="metric-icon metric-icon--violet"><PackageCheck /></span></div>
          <strong className="big-number">{numberFormatter.format(summary.productsChecked)}</strong>
          <p className="metric-caption"><span className="positive"><TrendingUp size={13} /> 2.4%</span> from previous audit</p>
          <div className="segmented-bar"><i style={{ width: `${summary.approved / summary.productsChecked * 100}%` }} /><i style={{ width: `${summary.warnings / summary.productsChecked * 100}%` }} /><i style={{ width: `${summary.critical / summary.productsChecked * 100}%` }} /><i style={{ width: `${summary.pending / summary.productsChecked * 100}%` }} /></div>
          <div className="metric-footer"><span>Catalog coverage</span><b>100%</b></div>
        </article>
        <article className="metric-card">
          <div className="metric-card__head"><span>Approved products</span><span className="metric-icon metric-icon--green"><CheckCircle2 /></span></div>
          <strong className="big-number">{numberFormatter.format(summary.approved)}</strong>
          <p className="metric-caption"><span className="positive"><ArrowUp size={13} /> 116</span> since last audit</p>
          <div className="metric-footer"><span>Approval rate</span><b>{(summary.approved / summary.productsChecked * 100).toFixed(1)}%</b></div>
        </article>
        <article className="metric-card">
          <div className="metric-card__head"><span>Needs action</span><span className="metric-icon metric-icon--red"><AlertTriangle /></span></div>
          <strong className="big-number">{numberFormatter.format(summary.critical + summary.warnings)}</strong>
          <p className="metric-caption"><span className="negative"><ArrowDown size={13} /> 22</span> issues resolved</p>
          <div className="metric-footer"><span>Critical disapprovals</span><b className="danger-text">{summary.critical}</b></div>
        </article>
      </section>

      <section className="overview-charts">
        <article className="panel trend-panel">
          <div className="panel-head"><div><span className="panel-kicker">PERFORMANCE</span><h2>Health score trend</h2></div><div className="time-control"><button className="active">7D</button><button>30D</button><button>90D</button></div></div>
          <div className="chart-summary"><strong>+14</strong><span>points this week</span></div>
          <div className="trend-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={healthTrend} margin={{ top: 10, right: 6, left: -28, bottom: 0 }}>
                <defs><linearGradient id="healthArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9dc235" stopOpacity={0.36} /><stop offset="100%" stopColor="#9dc235" stopOpacity={0.01} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 5" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} dy={9} />
                <YAxis domain={[40, 100]} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} ticks={[40, 60, 80, 100]} />
                <Tooltip content={<CustomChartTooltip />} cursor={{ stroke: 'var(--chart-cursor)', strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="score" stroke="#8eaf2c" strokeWidth={3} fill="url(#healthArea)" activeDot={{ r: 5, fill: '#a7cc39', stroke: 'var(--surface)', strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel distribution-panel">
          <div className="panel-head"><div><span className="panel-kicker">CURRENT AUDIT</span><h2>Product distribution</h2></div><button className="more-button"><MoreHorizontal /></button></div>
          <div className="distribution-content">
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={productDistribution} dataKey="value" innerRadius="72%" outerRadius="96%" paddingAngle={2} cornerRadius={5} stroke="none">{productDistribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie></PieChart>
              </ResponsiveContainer>
              <div><b>{numberFormatter.format(summary.productsChecked)}</b><span>products</span></div>
            </div>
            <div className="distribution-legend">
              {productDistribution.map((item) => <div key={item.name}><i style={{ background: item.color }} /><span>{item.name}</span><b>{numberFormatter.format(item.value)}</b><small>{(item.value / summary.productsChecked * 100).toFixed(1)}%</small></div>)}
            </div>
          </div>
        </article>
      </section>

      <section className="overview-lower">
        <article className="panel issues-panel">
          <div className="panel-head"><div><span className="panel-kicker">PRIORITY QUEUE</span><h2>Fix these first</h2></div><button className="text-link" onClick={() => onNavigate('products')}>View all issues <ArrowRight size={15} /></button></div>
          <div className="issue-list">
            {priorityIssues.slice(0, 4).map((issue, index) => (
              <button className="priority-row" key={issue.id} onClick={() => onIssue(issue)}>
                <span className="priority-index">{String(index + 1).padStart(2, '0')}</span>
                <span className={`issue-symbol issue-symbol--${issue.severity}`}>{issue.severity === 'critical' ? <AlertCircle /> : <AlertTriangle />}</span>
                <span className="priority-info"><b>{issue.title}</b><small>{issue.category}</small></span>
                <span className="affected-count"><b>{issue.affected}</b><small>products</small></span>
                <StatusBadge severity={issue.severity}>{issue.severity === 'critical' ? 'High' : 'Medium'}</StatusBadge>
                <ChevronRight className="row-chevron" size={17} />
              </button>
            ))}
          </div>
        </article>
        <article className="panel account-snapshot">
          <div className="panel-head"><div><span className="panel-kicker">ACCOUNT STATUS</span><h2>Account health</h2></div><button className="more-button"><MoreHorizontal /></button></div>
          <div className="account-status-visual"><span><ShieldAlert /></span><div><b>Suspended</b><small>Action required</small></div></div>
          <div className="account-totals"><div><span className="red-dot" /><b>{accountIssues.filter((item) => item.severity === 'critical').length}</b><small>Critical</small></div><div><span className="orange-dot" /><b>{accountIssues.filter((item) => item.severity === 'warning').length}</b><small>Warnings</small></div><div><span className="blue-dot" /><b>{accountIssues.filter((item) => item.severity === 'info').length}</b><small>Advisory</small></div></div>
          <button className="account-link" onClick={() => onNavigate('account')}>Review account diagnostics <ArrowRight size={16} /></button>
        </article>
      </section>

      <section className="specialist-strip">
        <div className="specialist-avatars"><span>JD</span><span>SM</span><span>AK</span><i><Check size={13} /></i></div>
        <div><span className="panel-kicker">HANDS-ON SUPPORT</span><h2>Complex issue? Let a specialist handle it.</h2><p>Get help with suspensions, feed cleanup, and policy compliance.</p></div>
        <button className="button button--ink" onClick={onSpecialist}>Fix my GMC <ArrowUpRight size={16} /></button>
        <button className="button button--outline export-mobile" onClick={onExport}><Download size={16} /> Export CSV</button>
      </section>
    </div>
  )
}

function ProductsPage({ data, onIssue, onExport }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [page, setPage] = useState(1)
  const pageSize = 7
  const statuses = ['All', 'Disapproved', 'Warning', 'Approved', 'Pending']
  const filtered = useMemo(() => data.products.filter((product) => {
    const textMatch = `${product.name} ${product.id} ${product.issue}`.toLowerCase().includes(query.toLowerCase())
    return textMatch && (status === 'All' || product.status === status)
  }), [data.products, query, status])
  const maxPage = Math.max(1, Math.ceil(filtered.length / pageSize))
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize)
  const selectStatus = (value) => { setStatus(value); setPage(1) }

  return (
    <div className="page">
      <div className="page-intro">
        <div><span className="overline">CATALOG DIAGNOSTICS</span><h1>Product issues</h1><p>Inspect product-level disapprovals and warnings from your latest audit.</p></div>
        <div className="page-actions"><button className="button button--outline" onClick={onExport}><Download size={17} /> Export CSV</button></div>
      </div>
      <section className="product-stat-row">
        <div><span className="stat-dot stat-dot--red" /><section><b>{data.summary.critical}</b><small>Disapproved</small></section><em>3.4%</em></div>
        <div><span className="stat-dot stat-dot--orange" /><section><b>{data.summary.warnings}</b><small>With warnings</small></section><em>10.0%</em></div>
        <div><span className="stat-dot stat-dot--green" /><section><b>{numberFormatter.format(data.summary.approved)}</b><small>Approved</small></section><em>85.0%</em></div>
        <div><span className="stat-dot stat-dot--violet" /><section><b>{data.summary.pending}</b><small>Pending review</small></section><em>1.5%</em></div>
      </section>
      <section className="panel product-panel">
        <div className="product-tools">
          <div className="search-field"><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search products, IDs, or issues…" aria-label="Search products" />{query && <button onClick={() => setQuery('')}><X size={14} /></button>}</div>
          <div className="status-tabs">{statuses.map((item) => <button key={item} className={status === item ? 'active' : ''} onClick={() => selectStatus(item)}>{item}{item !== 'All' && <span>{item === 'Disapproved' ? data.summary.critical : item === 'Warning' ? data.summary.warnings : item === 'Approved' ? data.summary.approved : data.summary.pending}</span>}</button>)}</div>
          <button className="filter-button"><Filter size={16} /> More filters</button>
        </div>
        <div className="table-wrap">
          <table className="products-table">
            <thead><tr><th>Product</th><th>Status</th><th>Issue found</th><th>Price</th><th>Updated</th><th aria-label="Actions" /></tr></thead>
            <tbody>{shown.map((product) => <tr key={product.id}>
              <td><div className={`product-thumb product-thumb--${product.category.toLowerCase()}`}><PackageCheck /></div><section><b>{product.name}</b><small>{product.id} · {product.category}</small></section></td>
              <td><StatusBadge severity={product.severity}>{product.status}</StatusBadge></td>
              <td><button className={product.issue === '—' ? 'no-issue' : 'issue-link'} onClick={() => product.issue !== '—' && onIssue(data.priorityIssues.find((issue) => product.issue.toLowerCase().includes(issue.title.split(' ')[0].toLowerCase())) || { ...product, title: product.issue, affected: 1, description: 'This product needs attention based on the most recent Merchant Center diagnostic.', recommendation: 'Review the submitted product data and landing page, then resubmit after correcting the mismatch.' })}>{product.issue}</button></td>
              <td>{product.price}</td><td className="muted-cell">{product.updated}</td><td><button className="more-button"><MoreHorizontal size={18} /></button></td>
            </tr>)}</tbody>
          </table>
          <div className="mobile-product-list">{shown.map((product) => <article key={product.id} onClick={() => product.issue !== '—' && onIssue({ ...product, title: product.issue, affected: 1, description: 'This product needs attention based on the most recent Merchant Center diagnostic.', recommendation: 'Review the submitted product data and landing page, then resubmit after correcting the mismatch.' })}><div><span className={`product-thumb product-thumb--${product.category.toLowerCase()}`}><PackageCheck /></span><section><b>{product.name}</b><small>{product.id} · {product.price}</small></section><ChevronRight size={17} /></div><footer><StatusBadge severity={product.severity}>{product.status}</StatusBadge><span>{product.issue}</span></footer></article>)}</div>
        </div>
        {shown.length === 0 ? <div className="empty-state"><Search /><h3>No products found</h3><p>Try a different search or status filter.</p></div> : <div className="pagination"><span>Showing <b>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)}</b> of <b>{numberFormatter.format(filtered.length)}</b> matching products</span><div><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /></button><b>{page}</b><button disabled={page === maxPage} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button></div></div>}
      </section>
    </div>
  )
}

function AccountPage({ data, onSpecialist }) {
  return (
    <div className="page">
      <div className="page-intro">
        <div><span className="overline">ACCOUNT DIAGNOSTICS</span><h1>Account health</h1><p>Policy, setup, and business-level issues from Google Merchant Center.</p></div>
        <button className="button button--primary" onClick={onSpecialist}><LifeBuoy size={17} /> Fix my GMC</button>
      </div>
      <section className="account-hero panel">
        <div className="account-hero__status"><span><ShieldAlert /></span><section><small>CURRENT STATUS</small><h2>Account suspended</h2><p>{data.account.suspensionReason}</p></section></div>
        <div className="account-hero__detail"><small>WHAT GOOGLE REPORTED</small><p>{data.account.suspensionDetail}</p><button>Read Google’s policy guidance <ExternalLink size={14} /></button></div>
        <div className="account-hero__meta"><div><small>MERCHANT ID</small><b>{data.account.id.replace('MC-', '')}</b></div><div><small>MARKET</small><b>{data.account.country}</b></div><div><small>CONNECTED</small><b>{data.account.connectedAt}</b></div></div>
      </section>
      <section className="account-content">
        <article className="panel account-diagnostics">
          <div className="panel-head"><div><span className="panel-kicker">ISSUES FOUND</span><h2>Account diagnostics</h2></div><span className="count-pill">{data.accountIssues.length} total</span></div>
          <div className="diagnostic-list">{data.accountIssues.map((issue) => <article key={issue.id}>
            <span className={`issue-symbol issue-symbol--${issue.severity}`}>{issue.severity === 'critical' ? <AlertCircle /> : issue.severity === 'warning' ? <AlertTriangle /> : <Activity />}</span>
            <section><div><h3>{issue.title}</h3><StatusBadge severity={issue.severity}>{issue.severity === 'info' ? 'Advisory' : issue.severity}</StatusBadge></div><small>{issue.type}</small><p>{issue.description}</p><button>{issue.action} <ArrowUpRight size={14} /></button></section>
          </article>)}</div>
        </article>
        <aside className="account-aside">
          <article className="panel fix-estimate"><span><Clock3 /></span><small>ESTIMATED RESOLUTION</small><h2>{data.summary.estimatedFixTime}</h2><p>For the highest-priority account and product issues.</p><div><i /><span>Identify root cause</span></div><div><i /><span>Apply recommended fixes</span></div><div><i /><span>Request Google review</span></div></article>
          <article className="expert-card"><span><Sparkles /></span><h2>Prefer expert help?</h2><p>A specialist can review the suspension, help apply fixes, and prepare your account for review.</p><button className="button button--lime" onClick={onSpecialist}>Talk to a specialist <ArrowRight size={16} /></button></article>
        </aside>
      </section>
    </div>
  )
}

function AuditModal({ progress, onClose }) {
  const complete = progress.percent === 100
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="audit-title">
      <div className="audit-modal">
        {complete ? <div className="audit-complete"><Check /></div> : <div className="scan-orbit"><span /><i /><b /></div>}
        <span className="kicker">LIVE GMC SCAN</span>
        <h2 id="audit-title">{complete ? 'Audit complete' : 'Reviewing your catalog…'}</h2>
        <p>{progress.label}</p>
        <div className="audit-progress"><i style={{ width: `${progress.percent}%` }} /></div>
        <div className="audit-percent"><span>{complete ? 'Everything is ready' : 'Please keep this window open'}</span><b>{progress.percent}%</b></div>
        <div className="audit-steps-compact"><span className={progress.index >= 1 ? 'done' : ''}>Connect</span><span className={progress.index >= 3 ? 'done' : ''}>Products</span><span className={progress.index >= 5 ? 'done' : ''}>Score</span></div>
        {complete && <button className="button button--primary" onClick={onClose}>View refreshed results <ArrowRight size={16} /></button>}
      </div>
    </div>
  )
}

function IssueDrawer({ issue, onClose, onSpecialist }) {
  if (!issue) return null
  return (
    <div className="drawer-layer" role="dialog" aria-modal="true" aria-labelledby="issue-title">
      <button className="drawer-backdrop" onClick={onClose} aria-label="Close issue details" />
      <aside className="issue-drawer">
        <div className="drawer-head"><span>ISSUE DETAILS</span><button onClick={onClose}><X /></button></div>
        <div className={`drawer-issue-icon issue-symbol--${issue.severity}`}><AlertTriangle /></div>
        <StatusBadge severity={issue.severity}>{issue.severity === 'critical' ? 'High priority' : issue.severity}</StatusBadge>
        <h2 id="issue-title">{issue.title}</h2>
        <p>{issue.description}</p>
        <div className="drawer-stats"><div><small>AFFECTED</small><b>{issue.affected} {issue.affected === 1 ? 'product' : 'products'}</b></div><div><small>IMPACT</small><b>{issue.impact || issue.status || 'Limited visibility'}</b></div></div>
        <div className="recommendation"><span><WandSparkles /></span><section><small>RECOMMENDED FIX</small><p>{issue.recommendation}</p></section></div>
        <h3>Suggested steps</h3>
        <ol className="fix-steps"><li><span>1</span>Confirm the issue in Merchant Center diagnostics.</li><li><span>2</span>Correct the source data or landing-page information.</li><li><span>3</span>Resync your feed and allow Google time to review it.</li></ol>
        <div className="drawer-actions"><button className="button button--primary">View affected products</button><button className="button button--outline" onClick={() => { onClose(); onSpecialist() }}>Get specialist help</button></div>
      </aside>
    </div>
  )
}

function SpecialistModal({ user, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, need: 'Account suspension', note: '' })
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event) => { event.preventDefault(); setSubmitting(true); await onSubmit(form); setSubmitting(false) }
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="specialist-title">
      <form className="specialist-modal" onSubmit={submit}>
        <div className="specialist-modal__top"><span><LifeBuoy /></span><button type="button" onClick={onClose}><X /></button></div>
        <span className="kicker">HANDS-ON GMC SUPPORT</span><h2 id="specialist-title">Tell us what you need fixed.</h2><p>Share a few details and a Merchant Center specialist will follow up with the next steps.</p>
        <div className="form-row"><label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Work email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label></div>
        <label>What do you need help with?<select value={form.need} onChange={(event) => setForm({ ...form, need: event.target.value })}><option>Account suspension</option><option>Product disapprovals</option><option>Feed cleanup</option><option>Website + GMC audit</option><option>Something else</option></select></label>
        <label>Anything we should know? <span>(optional)</span><textarea rows="3" placeholder="Add context about the issue…" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
        <div className="specialist-modal__footer"><small><ShieldCheck /> Your account remains read-only.</small><button className="button button--primary" disabled={submitting}>{submitting ? <><span className="mini-spinner mini-spinner--light" /> Sending…</> : <>Request specialist <ArrowRight size={16} /></>}</button></div>
      </form>
    </div>
  )
}

function MobileBottomNav({ activePage, onNavigate }) {
  return <nav className="mobile-bottom-nav">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={activePage === id ? 'active' : ''} onClick={() => onNavigate(id)}><Icon /><span>{id === 'products' ? 'Products' : id === 'account' ? 'Account' : label}</span></button>)}</nav>
}

function Dashboard({ data, theme, onThemeToggle, onLogout, onGoHome, setData }) {
  const location = useLocation()
  const navigate = useNavigate()
  const activePage = location.pathname.endsWith('/products') ? 'products' : location.pathname.endsWith('/account') ? 'account' : 'overview'
  const navigatePage = (page) => navigate(page === 'overview' ? '/dashboard' : `/dashboard/${page}`)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [auditProgress, setAuditProgress] = useState(null)
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [specialistOpen, setSpecialistOpen] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [activePage])
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 3400)
    return () => clearTimeout(timer)
  }, [toast])

  const runAudit = async () => {
    setAuditProgress({ index: 0, label: 'Preparing secure connection', percent: 3 })
    const refreshed = await auditService.runAudit(setAuditProgress)
    setData(refreshed)
  }

  const exportCsv = () => {
    const header = ['Product ID', 'Name', 'Status', 'Issue', 'Severity', 'Price']
    const rows = data.products.map((p) => [p.id, p.name, p.status, p.issue, p.severity, p.price])
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'merchant-audit-product-issues.csv'; link.click(); URL.revokeObjectURL(url)
    setToast('Product issues exported successfully.')
  }

  const submitSpecialist = async (form) => {
    const result = await auditService.requestSpecialist(form)
    setSpecialistOpen(false)
    setToast(`Request ${result.reference} sent. A specialist will be in touch.`)
  }

  const commonProps = { data, onSpecialist: () => setSpecialistOpen(true) }

  return (
    <div className="dashboard-shell">
      <Sidebar activePage={activePage} onNavigate={navigatePage} account={data.account} user={data.user} open={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={onLogout} onSpecialist={() => setSpecialistOpen(true)} theme={theme} onThemeToggle={onThemeToggle} />
      <div className="dashboard-main">
        <DashboardHeader activePage={activePage} account={data.account} theme={theme} onThemeToggle={onThemeToggle} onMenu={() => setSidebarOpen(true)} onGoHome={onGoHome} notifications={data.notifications} notificationOpen={notificationOpen} setNotificationOpen={setNotificationOpen} />
        {activePage === 'overview' && <OverviewPage {...commonProps} onRunAudit={runAudit} onNavigate={navigatePage} onIssue={setSelectedIssue} onExport={exportCsv} onPrint={() => window.print()} />}
        {activePage === 'products' && <ProductsPage data={data} onIssue={setSelectedIssue} onExport={exportCsv} />}
        {activePage === 'account' && <AccountPage {...commonProps} />}
        <footer className="dashboard-footer"><span>MerchantAudit demo · Data last synced {data.account.lastAudit}</span><span>Read-only connection <ShieldCheck size={14} /></span></footer>
      </div>
      <MobileBottomNav activePage={activePage} onNavigate={navigatePage} />
      {auditProgress && <AuditModal progress={auditProgress} onClose={() => { setAuditProgress(null); setToast('Your audit results are up to date.') }} />}
      <IssueDrawer issue={selectedIssue} onClose={() => setSelectedIssue(null)} onSpecialist={() => setSpecialistOpen(true)} />
      {specialistOpen && <SpecialistModal user={data.user} onClose={() => setSpecialistOpen(false)} onSubmit={submitSpecialist} />}
      {toast && <div className="toast"><CheckCircle2 /> <span>{toast}</span><button onClick={() => setToast('')}><X /></button></div>}
    </div>
  )
}

function DashboardLoading() {
  return <div className="route-loader"><Logo /><span className="route-loader__orbit"><i /></span><p>Preparing your audit workspace…</p></div>
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [theme, setTheme] = useState(() => localStorage.getItem('merchant-audit-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  const [data, setData] = useState(null)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#121412' : '#f4f5ef')
    localStorage.setItem('merchant-audit-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!location.pathname.startsWith('/dashboard') || data) return undefined
    let active = true
    auditService.getDashboard().then((dashboard) => { if (active) setData(dashboard) })
    return () => { active = false }
  }, [location.pathname, data])

  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark')

  const enterDashboard = async (googleSignIn = false) => {
    setSigningIn(true)
    try {
      if (googleSignIn) await auditService.signInWithGoogle()
      const dashboard = await auditService.getDashboard()
      setData(dashboard)
      navigate('/dashboard')
      window.scrollTo(0, 0)
    } finally {
      setSigningIn(false)
    }
  }

  const dashboardRoute = data ? (
    <Dashboard
      data={data}
      setData={setData}
      theme={theme}
      onThemeToggle={toggleTheme}
      onGoHome={() => { navigate('/'); window.scrollTo(0, 0) }}
      onLogout={() => { setData(null); navigate('/'); window.scrollTo(0, 0) }}
    />
  ) : <DashboardLoading />

  return (
    <Routes>
      <Route path="/" element={<LandingPage theme={theme} onThemeToggle={toggleTheme} onSignIn={() => enterDashboard(true)} onSample={() => enterDashboard(false)} signingIn={signingIn} />} />
      <Route path="/dashboard" element={dashboardRoute} />
      <Route path="/dashboard/products" element={dashboardRoute} />
      <Route path="/dashboard/account" element={dashboardRoute} />
      <Route path="/dashboard/*" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

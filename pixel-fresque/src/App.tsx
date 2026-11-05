import { useEffect, useState } from 'react'
import { checkout, confirmStripe, fetchBlocks, fetchHealth, fetchStats } from './api'
import { DesignStudio } from './components/DesignStudio'
import { FresqueCanvas } from './components/FresqueCanvas'
import type { BlockDraft, FresqueStats, PixelBlock, Selection } from './types'
import type { DesignDocument } from './design/types'
import './App.css'

const emptyDraft: BlockDraft = {
  ownerName: '',
  ownerEmail: '',
  title: '',
  message: '',
  linkUrl: '',
  color: '#ffffff',
  imageData: null,
  attachments: [],
  useStripe: false,
  designDoc: null,
}

export default function App() {
  const [blocks, setBlocks] = useState<PixelBlock[]>([])
  const [stats, setStats] = useState<FresqueStats | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [draft, setDraft] = useState<BlockDraft>(emptyDraft)
  const [selecting, setSelecting] = useState(false)
  const [studioOpen, setStudioOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stripeEnabled, setStripeEnabled] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [activeBlock, setActiveBlock] = useState<PixelBlock | null>(null)
  const [showApp, setShowApp] = useState(false)

  async function refresh() {
    const [b, s, h] = await Promise.all([fetchBlocks(), fetchStats(), fetchHealth()])
    setBlocks(b)
    setStats(s)
    setStripeEnabled(h.stripeEnabled)
  }

  useEffect(() => {
    refresh().catch((e) => setError(String(e.message || e)))

    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    if (params.get('paid') === '1' && sessionId) {
      setShowApp(true)
      setBusy(true)
      confirmStripe(sessionId)
        .then(async () => {
          setToast('Paiement confirmé — ton bloc est sur la fresque.')
          await refresh()
          window.history.replaceState({}, '', '/')
        })
        .catch((e) => setError(String(e.message || e)))
        .finally(() => setBusy(false))
    }
    if (params.get('canceled') === '1') {
      setToast('Paiement annulé.')
      window.history.replaceState({}, '', '/')
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(t)
  }, [toast])

  function openStudioFromSelection(sel: Selection) {
    setSelection(sel)
    setDraft((d) => ({
      ...d,
      designDoc: null,
      imageData: null,
      color: d.color || '#ffffff',
    }))
    setStudioOpen(true)
    setSelecting(false)
  }

  async function onBuy() {
    if (!selection) return
    setBusy(true)
    setError(null)
    try {
      const result = await checkout(selection, {
        ...draft,
        title: '',
        ownerName: '',
        message: '',
      })
      if (result.mode === 'stripe' && result.checkoutUrl) {
        window.location.href = result.checkoutUrl
        return
      }
      setToast('Bloc acheté (démo) — il apparaît sur la fresque.')
      setSelecting(false)
      setStudioOpen(false)
      setSelection(null)
      setDraft(emptyDraft)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const pixels = selection ? selection.width * selection.height : 0

  return (
    <div className="app">
      {!showApp ? (
        <section className="hero" aria-label="Accueil Pixora">
          <div className="hero-bg" aria-hidden="true" />
          <nav className="topnav">
            <span className="brand-mark">Pixora</span>
            <button type="button" className="ghost" onClick={() => setShowApp(true)}>
              Ouvrir la fresque
            </button>
          </nav>
          <div className="hero-copy">
            <p className="brand-hero">Pixora</p>
            <h1>Une fresque d’un million de pixels. La tienne à 1&nbsp;€.</h1>
            <p className="lede">
              Achète un bloc, personnalise-le dans un studio type Canva, et laisse ta marque sur la
              toile collective.
            </p>
            <div className="cta-row">
              <button
                type="button"
                className="cta-primary"
                onClick={() => {
                  setShowApp(true)
                  setSelecting(true)
                }}
              >
                Acheter des pixels
              </button>
              <button type="button" className="cta-secondary" onClick={() => setShowApp(true)}>
                Explorer la grille
              </button>
            </div>
          </div>
          <div className="hero-mosaic" aria-hidden="true">
            {Array.from({ length: 48 }, (_, i) => (
              <span key={i} style={{ animationDelay: `${(i % 12) * 0.08}s` }} />
            ))}
          </div>
        </section>
      ) : studioOpen && selection ? (
        <>
          <header className="app-bar">
            <button
              type="button"
              className="brand-mark"
              onClick={() => {
                setStudioOpen(false)
                setShowApp(false)
              }}
            >
              Pixora
            </button>
            <div className="stats">
              <span>
                Studio · <strong>{selection.width}×{selection.height}</strong>
              </span>
            </div>
          </header>
          <DesignStudio
            selection={selection}
            background={draft.color}
            attachments={draft.attachments}
            initialDoc={draft.designDoc}
            onBackgroundChange={(color) => setDraft((d) => ({ ...d, color }))}
            onAttachmentsChange={(attachments) => setDraft((d) => ({ ...d, attachments }))}
            onExport={(imageData, designDoc: DesignDocument) =>
              setDraft((d) => ({ ...d, imageData, designDoc }))
            }
            onBuy={onBuy}
            onBack={() => {
              setStudioOpen(false)
              setSelecting(true)
            }}
            busy={busy}
            stripeEnabled={stripeEnabled}
            useStripe={draft.useStripe}
            onUseStripeChange={(useStripe) => setDraft((d) => ({ ...d, useStripe }))}
            error={error}
            priceEuros={pixels}
            pixels={pixels}
          />
        </>
      ) : (
        <>
          <header className="app-bar">
            <button type="button" className="brand-mark" onClick={() => setShowApp(false)}>
              Pixora
            </button>
            <div className="stats">
              {stats && (
                <>
                  <span>
                    <strong>{stats.soldPixels.toLocaleString('fr-FR')}</strong> / 1&nbsp;000&nbsp;000
                    px
                  </span>
                  <span>
                    <strong>{stats.occupancyPercent}%</strong> occupé
                  </span>
                  <span>
                    <strong>{stats.revenueEuros.toLocaleString('fr-FR')} €</strong>
                  </span>
                </>
              )}
            </div>
            <button
              type="button"
              className={`cta-primary compact ${selecting ? 'armed' : ''}`}
              onClick={() => {
                setSelecting((v) => !v)
                setSelection(null)
              }}
            >
              {selecting ? 'Annuler sélection' : 'Acheter un bloc'}
            </button>
          </header>

          <main className="workspace fresque-only">
            <FresqueCanvas
              blocks={blocks}
              selection={selection}
              onSelect={setSelection}
              onOpenBlock={setActiveBlock}
              selecting={selecting}
            />
            {selecting && selection && (
              <div className="select-cta">
                <p>
                  Zone <strong>{selection.width}×{selection.height}</strong> ·{' '}
                  <strong>{pixels.toLocaleString('fr-FR')} €</strong>
                </p>
                <button
                  type="button"
                  className="cta-primary"
                  onClick={() => openStudioFromSelection(selection)}
                >
                  Personnaliser dans le studio
                </button>
              </div>
            )}
            {selecting && !selection && (
              <div className="select-cta muted-cta">
                <p>Clique (1 px) ou glisse une zone, puis ouvre le studio type Canva.</p>
              </div>
            )}
          </main>
        </>
      )}

      {activeBlock && (
        <div className="modal-backdrop" onClick={() => setActiveBlock(null)} role="presentation">
          <article
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Bloc pixel"
          >
            <div
              className="modal-swatch large"
              style={{
                background: activeBlock.imageData ? undefined : activeBlock.color,
                backgroundImage: activeBlock.imageData
                  ? `url(${activeBlock.imageData})`
                  : undefined,
              }}
            />
            <p className="muted">
              ({activeBlock.x},{activeBlock.y}) · {activeBlock.width}×{activeBlock.height} ·{' '}
              {activeBlock.priceEuros} €
            </p>
            {activeBlock.attachments?.length > 0 && (
              <ul className="modal-attachments">
                {activeBlock.attachments.map((a) => (
                  <li key={a.id}>
                    <a href={a.dataUrl} download={a.name}>
                      {a.kind === 'image' ? '🖼' : '📄'} {a.name}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {activeBlock.linkUrl && (
              <a href={activeBlock.linkUrl} target="_blank" rel="noreferrer">
                Ouvrir le lien
              </a>
            )}
            <button type="button" className="ghost" onClick={() => setActiveBlock(null)}>
              Fermer
            </button>
          </article>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

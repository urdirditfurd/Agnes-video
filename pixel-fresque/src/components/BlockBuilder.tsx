import { useMemo, useRef, useState } from 'react'
import type { BlockDraft, BuilderTool, Selection } from '../types'
import { PRICE_PER_PIXEL } from '../types'
import { MiniBoard } from './MiniBoard'

type Props = {
  selection: Selection | null
  draft: BlockDraft
  onChange: (draft: BlockDraft) => void
  onBuy: () => void
  busy: boolean
  stripeEnabled: boolean
  error: string | null
}

const TOOLS: { id: BuilderTool; label: string; hint: string }[] = [
  { id: 'board', label: 'Tableau', hint: 'Dessiner & pièces jointes' },
  { id: 'select', label: 'Zone', hint: 'Taille & position du bloc' },
  { id: 'text', label: 'Infos', hint: 'Titre & message' },
  { id: 'link', label: 'Lien', hint: 'URL cliquable' },
]

export function BlockBuilder({
  selection,
  draft,
  onChange,
  onBuy,
  busy,
  stripeEnabled,
  error,
}: Props) {
  const [tool, setTool] = useState<BuilderTool>('board')
  const draftRef = useRef(draft)
  draftRef.current = draft

  const quote = useMemo(() => {
    if (!selection) return null
    const pixels = selection.width * selection.height
    return { pixels, price: pixels * PRICE_PER_PIXEL }
  }, [selection])

  return (
    <aside className="builder" aria-label="Builder de blocs">
      <header className="builder-head">
        <p className="eyebrow">Builder · Blocks</p>
        <h2>Mini tableau virtuel</h2>
        <p className="builder-sub">
          Dessine pixel par pixel, colle des images, joins des fichiers — ton bloc devient une vraie
          toile sur la fresque.
        </p>
      </header>

      <div className="tool-rail" role="tablist" aria-label="Outils builder">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tool === t.id}
            className={tool === t.id ? 'active' : ''}
            onClick={() => setTool(t.id)}
            title={t.hint}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="builder-panel">
        {tool === 'board' && (
          <div className="panel-block board-wrap">
            <label className="bg-label">
              Fond du tableau
              <input
                type="color"
                value={draft.color}
                onChange={(e) => onChange({ ...draftRef.current, color: e.target.value })}
              />
            </label>
            <MiniBoard
              selection={selection}
              bgColor={draft.color}
              canvasData={draft.imageData}
              attachments={draft.attachments}
              onCanvasChange={(imageData) => onChange({ ...draftRef.current, imageData })}
              onAttachmentsChange={(attachments) =>
                onChange({ ...draftRef.current, attachments })
              }
            />
          </div>
        )}

        {tool === 'select' && (
          <div className="panel-block">
            {selection ? (
              <>
                <p>
                  Position{' '}
                  <strong>
                    ({selection.x}, {selection.y})
                  </strong>
                </p>
                <p>
                  Taille{' '}
                  <strong>
                    {selection.width}×{selection.height}
                  </strong>
                </p>
                <p className="muted">Minimum 10×10. Sélectionne sur la fresque.</p>
              </>
            ) : (
              <p className="muted">Active « Acheter » puis dessine ta zone sur la grille.</p>
            )}
          </div>
        )}

        {tool === 'text' && (
          <div className="panel-block stack">
            <label>
              Nom affiché
              <input
                value={draft.ownerName}
                onChange={(e) =>
                  onChange({ ...draftRef.current, ownerName: e.target.value })
                }
                placeholder="Ton nom ou marque"
                maxLength={60}
              />
            </label>
            <label>
              Titre du bloc
              <input
                value={draft.title}
                onChange={(e) => onChange({ ...draftRef.current, title: e.target.value })}
                placeholder="Ex. Studio Nord"
                maxLength={80}
              />
            </label>
            <label>
              Message
              <textarea
                value={draft.message}
                onChange={(e) =>
                  onChange({ ...draftRef.current, message: e.target.value })
                }
                placeholder="Une ligne pour ton histoire"
                maxLength={200}
                rows={3}
              />
            </label>
          </div>
        )}

        {tool === 'link' && (
          <div className="panel-block stack">
            <label>
              URL
              <input
                value={draft.linkUrl}
                onChange={(e) =>
                  onChange({ ...draftRef.current, linkUrl: e.target.value })
                }
                placeholder="https://ton-site.com"
              />
            </label>
            <label>
              Email (reçu)
              <input
                type="email"
                value={draft.ownerEmail}
                onChange={(e) =>
                  onChange({ ...draftRef.current, ownerEmail: e.target.value })
                }
                placeholder="toi@email.com"
              />
            </label>
          </div>
        )}
      </div>

      <footer className="builder-foot">
        {quote ? (
          <div className="price-line">
            <span>{quote.pixels.toLocaleString('fr-FR')} px</span>
            <strong>{quote.price.toLocaleString('fr-FR')} €</strong>
          </div>
        ) : (
          <p className="muted">Sélectionne une zone pour voir le prix.</p>
        )}

        {draft.attachments.length > 0 && (
          <p className="fee-note">
            {draft.attachments.length} pièce{draft.attachments.length > 1 ? 's' : ''} jointe
            {draft.attachments.length > 1 ? 's' : ''}
          </p>
        )}

        {stripeEnabled && (
          <label className="stripe-toggle">
            <input
              type="checkbox"
              checked={draft.useStripe}
              onChange={(e) =>
                onChange({ ...draftRef.current, useStripe: e.target.checked })
              }
            />
            Paiement Stripe (0 commission Pixora)
          </label>
        )}

        {!draft.useStripe && (
          <p className="fee-note">Mode démo · 0 frais · inscription immédiate</p>
        )}

        {error && <p className="error">{error}</p>}

        <button
          type="button"
          className="cta-buy"
          disabled={!selection || busy}
          onClick={onBuy}
        >
          {busy ? 'Traitement…' : draft.useStripe ? 'Payer avec Stripe' : 'Acheter (démo 0 €)'}
        </button>
      </footer>
    </aside>
  )
}

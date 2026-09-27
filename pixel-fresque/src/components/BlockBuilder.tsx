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
  { id: 'board', label: 'Tableau', hint: 'Dessiner, texte & pièces jointes' },
  { id: 'select', label: 'Zone', hint: 'Taille & position' },
  { id: 'link', label: 'Lien', hint: 'URL optionnelle' },
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
          Dessine, écris, colle des images. Même 1 pixel s’affiche en grand dans le studio.
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
            <MiniBoard
              selection={selection}
              bgColor={draft.color}
              canvasData={draft.imageData}
              attachments={draft.attachments}
              onCanvasChange={(imageData) => onChange({ ...draftRef.current, imageData })}
              onAttachmentsChange={(attachments) =>
                onChange({ ...draftRef.current, attachments })
              }
              onBgColorChange={(color) => onChange({ ...draftRef.current, color })}
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
                  {selection.width * selection.height === 1 ? ' · 1 pixel' : ''}
                </p>
                <p className="muted">Clic = 1 px · glisser = zone. Min. 1×1.</p>
              </>
            ) : (
              <p className="muted">Active « Acheter » puis clique ou glisse sur la grille.</p>
            )}
          </div>
        )}

        {tool === 'link' && (
          <div className="panel-block stack">
            <label>
              URL (optionnel)
              <input
                value={draft.linkUrl}
                onChange={(e) =>
                  onChange({ ...draftRef.current, linkUrl: e.target.value })
                }
                placeholder="https://ton-site.com"
              />
            </label>
            <label>
              Email reçu (optionnel)
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

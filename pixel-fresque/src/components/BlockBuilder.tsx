import { useMemo, useState } from 'react'
import type { BlockDraft, BuilderTool, Selection } from '../types'
import { PRICE_PER_PIXEL } from '../types'

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
  { id: 'select', label: 'Zone', hint: 'Taille & position du bloc' },
  { id: 'paint', label: 'Peinture', hint: 'Couleur de fond du bloc' },
  { id: 'image', label: 'Image', hint: 'Logo ou visuel' },
  { id: 'text', label: 'Texte', hint: 'Titre & message' },
  { id: 'link', label: 'Lien', hint: 'URL cliquable' },
]

const SWATCHES = ['#c8f542', '#ff6b4a', '#4ecdc4', '#f4f1de', '#1a1a1a', '#3d5a80', '#e9c46a', '#9b5de5']

export function BlockBuilder({
  selection,
  draft,
  onChange,
  onBuy,
  busy,
  stripeEnabled,
  error,
}: Props) {
  const [tool, setTool] = useState<BuilderTool>('paint')

  const quote = useMemo(() => {
    if (!selection) return null
    const pixels = selection.width * selection.height
    return { pixels, price: pixels * PRICE_PER_PIXEL }
  }, [selection])

  function onFile(file: File | null) {
    if (!file) return
    if (file.size > 1_500_000) {
      alert('Image trop lourde (max ~1,5 Mo). Compresse-la puis réessaie.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      onChange({ ...draft, imageData: String(reader.result) })
    }
    reader.readAsDataURL(file)
  }

  return (
    <aside className="builder" aria-label="Builder de blocs">
      <header className="builder-head">
        <p className="eyebrow">Builder · Blocks</p>
        <h2>Compose ton pixel-bloc</h2>
        <p className="builder-sub">
          Assemble ta case comme des briques : zone, couleur, image, texte, lien — puis paie 1&nbsp;€
          par pixel.
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
        {tool === 'select' && (
          <div className="panel-block">
            {selection ? (
              <>
                <p>
                  Position <strong>({selection.x}, {selection.y})</strong>
                </p>
                <p>
                  Taille <strong>{selection.width}×{selection.height}</strong>
                </p>
                <p className="muted">Minimum 10×10. Sélectionne sur la fresque.</p>
              </>
            ) : (
              <p className="muted">Active « Acheter » puis dessine ta zone sur la grille.</p>
            )}
          </div>
        )}

        {tool === 'paint' && (
          <div className="panel-block">
            <label>
              Couleur
              <input
                type="color"
                value={draft.color}
                onChange={(e) => onChange({ ...draft, color: e.target.value })}
              />
            </label>
            <div className="swatches">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="swatch"
                  style={{ background: c }}
                  aria-label={c}
                  onClick={() => onChange({ ...draft, color: c })}
                />
              ))}
            </div>
          </div>
        )}

        {tool === 'image' && (
          <div className="panel-block">
            <label className="file-label">
              Importer un logo / visuel
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onFile(e.target.files?.[0] || null)}
              />
            </label>
            {draft.imageData && (
              <div className="image-preview">
                <img src={draft.imageData} alt="Aperçu bloc" />
                <button type="button" onClick={() => onChange({ ...draft, imageData: null })}>
                  Retirer
                </button>
              </div>
            )}
          </div>
        )}

        {tool === 'text' && (
          <div className="panel-block stack">
            <label>
              Nom affiché
              <input
                value={draft.ownerName}
                onChange={(e) => onChange({ ...draft, ownerName: e.target.value })}
                placeholder="Ton nom ou marque"
                maxLength={60}
              />
            </label>
            <label>
              Titre du bloc
              <input
                value={draft.title}
                onChange={(e) => onChange({ ...draft, title: e.target.value })}
                placeholder="Ex. Studio Nord"
                maxLength={80}
              />
            </label>
            <label>
              Message
              <textarea
                value={draft.message}
                onChange={(e) => onChange({ ...draft, message: e.target.value })}
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
                onChange={(e) => onChange({ ...draft, linkUrl: e.target.value })}
                placeholder="https://ton-site.com"
              />
            </label>
            <label>
              Email (reçu)
              <input
                type="email"
                value={draft.ownerEmail}
                onChange={(e) => onChange({ ...draft, ownerEmail: e.target.value })}
                placeholder="toi@email.com"
              />
            </label>
          </div>
        )}
      </div>

      <div className="builder-preview" aria-hidden={!selection}>
        <div
          className="mini-block"
          style={{
            background: draft.imageData ? undefined : draft.color,
            backgroundImage: draft.imageData ? `url(${draft.imageData})` : undefined,
          }}
        >
          <span>{draft.title || 'Aperçu'}</span>
        </div>
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

        {stripeEnabled && (
          <label className="stripe-toggle">
            <input
              type="checkbox"
              checked={draft.useStripe}
              onChange={(e) => onChange({ ...draft, useStripe: e.target.checked })}
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

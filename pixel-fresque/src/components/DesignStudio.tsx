import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  createEmptyDoc,
  FONT_OPTIONS,
  NUANCIER_ROWS,
  uid,
  type DesignDocument,
  type DesignElement,
  type DesignTool,
  type TextElement,
} from '../design/types'
import { docPixelSize, hitTest, renderDesignToDataUrl } from '../design/render'
import type { BlockAttachment, Selection } from '../types'

type Props = {
  selection: Selection
  background: string
  attachments: BlockAttachment[]
  initialDoc?: DesignDocument | null
  onBackgroundChange: (color: string) => void
  onAttachmentsChange: (attachments: BlockAttachment[]) => void
  onExport: (imageData: string, doc: DesignDocument) => void
  onBuy: () => void
  onBack: () => void
  busy: boolean
  stripeEnabled: boolean
  useStripe: boolean
  onUseStripeChange: (v: boolean) => void
  error: string | null
  priceEuros: number
  pixels: number
}

type DragMode =
  | null
  | {
      kind: 'move'
      id: string
      ox: number
      oy: number
      ex: number
      ey: number
      startPoints?: { x: number; y: number }[]
    }
  | { kind: 'resize'; id: string; handle: string; start: DesignElement; mx: number; my: number }
  | { kind: 'draw'; id: string }
  | { kind: 'create'; type: 'rect' | 'ellipse'; x0: number; y0: number; id: string }

const MAX_FILE = 2_500_000

export function DesignStudio({
  selection,
  background,
  attachments,
  initialDoc,
  onBackgroundChange,
  onAttachmentsChange,
  onExport,
  onBuy,
  onBack,
  busy,
  stripeEnabled,
  useStripe,
  onUseStripeChange,
  error,
  priceEuros,
  pixels,
}: Props) {
  const { width, height, scale } = useMemo(
    () => docPixelSize(selection.width, selection.height),
    [selection.width, selection.height],
  )

  const [doc, setDoc] = useState<DesignDocument>(() =>
    initialDoc && initialDoc.width === width && initialDoc.height === height
      ? initialDoc
      : { ...createEmptyDoc(width, height, background), background },
  )
  const [tool, setTool] = useState<DesignTool>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [, setHistory] = useState<DesignDocument[]>([])
  const [drawColor, setDrawColor] = useState('#1a1a1a')
  const [nuancierTarget, setNuancierTarget] = useState<'element' | 'bg'>('element')
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const drag = useRef<DragMode>(null)
  const exportTimer = useRef<number | null>(null)

  useEffect(() => {
    setDoc((d) => ({ ...d, width, height, background }))
  }, [width, height, background])

  const selected = doc.elements.find((e) => e.id === selectedId) || null

  const pushHistory = useCallback((prev: DesignDocument) => {
    setHistory((h) => [...h.slice(-39), structuredClone(prev)])
  }, [])

  const updateDoc = useCallback(
    (updater: (d: DesignDocument) => DesignDocument, record = true) => {
      setDoc((prev) => {
        if (record) pushHistory(prev)
        return updater(prev)
      })
    },
    [pushHistory],
  )

  const scheduleExport = useCallback(
    (next: DesignDocument) => {
      if (exportTimer.current) window.clearTimeout(exportTimer.current)
      exportTimer.current = window.setTimeout(() => {
        void renderDesignToDataUrl(next).then((url) => onExport(url, next))
      }, 180)
    },
    [onExport],
  )

  useEffect(() => {
    scheduleExport(doc)
  }, [doc, scheduleExport])

  function undo() {
    setHistory((h) => {
      if (!h.length) return h
      const prev = h[h.length - 1]
      setDoc(prev)
      return h.slice(0, -1)
    })
  }

  function boardPoint(e: React.PointerEvent | PointerEvent) {
    const board = boardRef.current!
    const rect = board.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height,
    }
  }

  function addTextAt(x: number, y: number) {
    const el: TextElement = {
      id: uid(),
      type: 'text',
      name: 'Texte',
      x: Math.max(0, x - 40),
      y: Math.max(0, y - 12),
      w: Math.min(width * 0.6, 180),
      h: 40,
      text: 'Double-clique pour éditer',
      fontSize: Math.max(14, Math.round(height * 0.08)),
      fontFamily: 'Outfit',
      color: drawColor,
      align: 'left',
      bold: false,
    }
    updateDoc((d) => ({ ...d, elements: [...d.elements, el] }))
    setSelectedId(el.id)
    setEditingTextId(el.id)
    setTool('select')
  }

  function patchElement(id: string, patch: Partial<DesignElement>) {
    updateDoc(
      (d) => ({
        ...d,
        elements: d.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as DesignElement) : el)),
      }),
      true,
    )
  }

  function deleteSelected() {
    if (!selectedId) return
    updateDoc((d) => ({ ...d, elements: d.elements.filter((e) => e.id !== selectedId) }))
    setSelectedId(null)
    setEditingTextId(null)
  }

  function bringForward() {
    if (!selectedId) return
    updateDoc((d) => {
      const i = d.elements.findIndex((e) => e.id === selectedId)
      if (i < 0 || i >= d.elements.length - 1) return d
      const els = [...d.elements]
      ;[els[i], els[i + 1]] = [els[i + 1], els[i]]
      return { ...d, elements: els }
    })
  }

  function sendBackward() {
    if (!selectedId) return
    updateDoc((d) => {
      const i = d.elements.findIndex((e) => e.id === selectedId)
      if (i <= 0) return d
      const els = [...d.elements]
      ;[els[i - 1], els[i]] = [els[i], els[i - 1]]
      return { ...d, elements: els }
    })
  }

  function duplicateSelected() {
    if (!selected) return
    const copy = {
      ...structuredClone(selected),
      id: uid(),
      x: selected.x + 12,
      y: selected.y + 12,
      name: `${selected.name} copie`,
    } as DesignElement
    updateDoc((d) => ({ ...d, elements: [...d.elements, copy] }))
    setSelectedId(copy.id)
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return
    const board = boardRef.current!
    board.setPointerCapture(e.pointerId)
    const p = boardPoint(e)

    if (tool === 'text') {
      addTextAt(p.x, p.y)
      return
    }

    if (tool === 'rect' || tool === 'ellipse') {
      const id = uid()
      const base = {
        id,
        name: tool === 'rect' ? 'Rectangle' : 'Ellipse',
        x: p.x,
        y: p.y,
        w: 1,
        h: 1,
        fill: drawColor,
        stroke: '#00000000',
        strokeWidth: 0,
      }
      const el: DesignElement =
        tool === 'rect'
          ? { ...base, type: 'rect', radius: 0 }
          : { ...base, type: 'ellipse' }
      updateDoc((d) => ({ ...d, elements: [...d.elements, el] }), true)
      drag.current = { kind: 'create', type: tool, x0: p.x, y0: p.y, id }
      setSelectedId(id)
      return
    }

    if (tool === 'draw') {
      const id = uid()
      const el: DesignElement = {
        id,
        type: 'path',
        name: 'Trait',
        x: p.x,
        y: p.y,
        w: 1,
        h: 1,
        points: [{ x: p.x, y: p.y }],
        color: drawColor,
        strokeWidth: Math.max(2, scale / 3),
      }
      updateDoc((d) => ({ ...d, elements: [...d.elements, el] }), true)
      drag.current = { kind: 'draw', id }
      setSelectedId(id)
      return
    }

    // select tool
    const handle = (e.target as HTMLElement).dataset.handle
    if (handle && selectedId) {
      const el = doc.elements.find((x) => x.id === selectedId)
      if (el) {
        drag.current = {
          kind: 'resize',
          id: selectedId,
          handle,
          start: structuredClone(el),
          mx: p.x,
          my: p.y,
        }
      }
      return
    }

    const hit = hitTest(doc, p.x, p.y)
    if (hit) {
      setSelectedId(hit.id)
      drag.current = {
        kind: 'move',
        id: hit.id,
        ox: p.x,
        oy: p.y,
        ex: hit.x,
        ey: hit.y,
        startPoints: hit.type === 'path' ? hit.points.map((pt) => ({ ...pt })) : undefined,
      }
    } else {
      setSelectedId(null)
      setEditingTextId(null)
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const mode = drag.current
    if (!mode) return
    const p = boardPoint(e)

    if (mode.kind === 'move') {
      const dx = p.x - mode.ox
      const dy = p.y - mode.oy
      setDoc((d) => ({
        ...d,
        elements: d.elements.map((el) => {
          if (el.id !== mode.id) return el
          if (el.type === 'path' && mode.startPoints) {
            const points = mode.startPoints.map((pt) => ({ x: pt.x + dx, y: pt.y + dy }))
            const xs = points.map((pt) => pt.x)
            const ys = points.map((pt) => pt.y)
            return {
              ...el,
              points,
              x: Math.min(...xs),
              y: Math.min(...ys),
              w: Math.max(1, Math.max(...xs) - Math.min(...xs)),
              h: Math.max(1, Math.max(...ys) - Math.min(...ys)),
            }
          }
          return { ...el, x: mode.ex + dx, y: mode.ey + dy }
        }),
      }))
      return
    }

    if (mode.kind === 'resize') {
      const s = mode.start
      let { x, y, w, h } = s
      const dx = p.x - mode.mx
      const dy = p.y - mode.my
      if (mode.handle.includes('e')) w = Math.max(8, s.w + dx)
      if (mode.handle.includes('s')) h = Math.max(8, s.h + dy)
      if (mode.handle.includes('w')) {
        w = Math.max(8, s.w - dx)
        x = s.x + dx
      }
      if (mode.handle.includes('n')) {
        h = Math.max(8, s.h - dy)
        y = s.y + dy
      }
      setDoc((d) => ({
        ...d,
        elements: d.elements.map((el) => (el.id === mode.id ? { ...el, x, y, w, h } : el)),
      }))
      return
    }

    if (mode.kind === 'create') {
      const x = Math.min(mode.x0, p.x)
      const y = Math.min(mode.y0, p.y)
      const w = Math.max(1, Math.abs(p.x - mode.x0))
      const h = Math.max(1, Math.abs(p.y - mode.y0))
      setDoc((d) => ({
        ...d,
        elements: d.elements.map((el) => (el.id === mode.id ? { ...el, x, y, w, h } : el)),
      }))
      return
    }

    if (mode.kind === 'draw') {
      setDoc((d) => ({
        ...d,
        elements: d.elements.map((el) => {
          if (el.id !== mode.id || el.type !== 'path') return el
          const points = [...el.points, { x: p.x, y: p.y }]
          const xs = points.map((pt) => pt.x)
          const ys = points.map((pt) => pt.y)
          return {
            ...el,
            points,
            x: Math.min(...xs),
            y: Math.min(...ys),
            w: Math.max(1, Math.max(...xs) - Math.min(...xs)),
            h: Math.max(1, Math.max(...ys) - Math.min(...ys)),
          }
        }),
      }))
    }
  }

  function onPointerUp() {
    if (drag.current) {
      scheduleExport(doc)
      if (drag.current.kind === 'create') setTool('select')
    }
    drag.current = null
  }

  async function onUpload(files: FileList | null) {
    if (!files?.length) return
    const nextAtt = [...attachments]
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE) {
        alert(`« ${file.name} » trop lourd (max 2,5 Mo).`)
        continue
      }
      const dataUrl = await readFile(file)
      if (file.type.startsWith('image/')) {
        await new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => {
            const maxW = width * 0.55
            const maxH = height * 0.55
            const ratio = Math.min(maxW / img.width, maxH / img.height, 1)
            const w = img.width * ratio
            const h = img.height * ratio
            const el: DesignElement = {
              id: uid(),
              type: 'image',
              name: file.name,
              x: (width - w) / 2,
              y: (height - h) / 2,
              w,
              h,
              src: dataUrl,
              fileName: file.name,
            }
            updateDoc((d) => ({ ...d, elements: [...d.elements, el] }))
            setSelectedId(el.id)
            setTool('select')
            resolve()
          }
          img.onerror = () => resolve()
          img.src = dataUrl
        })
      } else {
        nextAtt.push({
          id: uid(),
          name: file.name,
          mime: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl,
          kind: 'file',
        })
      }
    }
    onAttachmentsChange(nextAtt)
  }

  function applyNuancier(color: string) {
    if (nuancierTarget === 'bg') {
      onBackgroundChange(color)
      setDoc((d) => ({ ...d, background: color }))
      return
    }
    setDrawColor(color)
    if (!selected) return
    if (selected.type === 'text') patchElement(selected.id, { color } as Partial<TextElement>)
    if (selected.type === 'rect' || selected.type === 'ellipse') {
      patchElement(selected.id, { fill: color })
    }
    if (selected.type === 'path') patchElement(selected.id, { color })
  }

  const { displayW, displayH } = useMemo(() => {
    const maxSide = 520
    const aspect = width / Math.max(height, 1)
    if (aspect >= 1) {
      const w = maxSide
      return { displayW: w, displayH: Math.max(48, w / aspect) }
    }
    const h = maxSide
    return { displayW: Math.max(48, h * aspect), displayH: h }
  }, [width, height])

  return (
    <div className="canva-studio">
      <header className="canva-top">
        <button type="button" className="ghost" onClick={onBack}>
          ← Fresque
        </button>
        <div className="canva-top-meta">
          <span className="eyebrow">Studio Canva</span>
          <strong>
            {selection.width}×{selection.height} px · ×{scale}
          </strong>
        </div>
        <div className="canva-top-actions">
          <button type="button" onClick={undo} title="Annuler">
            ↶ Annuler
          </button>
          <button type="button" onClick={duplicateSelected} disabled={!selected}>
            Dupliquer
          </button>
          <button type="button" onClick={deleteSelected} disabled={!selected}>
            Supprimer
          </button>
        </div>
      </header>

      <div className="canva-body">
        <nav className="canva-rail" aria-label="Outils">
          {(
            [
              ['select', 'Sélection', 'V'],
              ['text', 'Texte', 'T'],
              ['rect', 'Forme', '□'],
              ['ellipse', 'Cercle', '○'],
              ['draw', 'Dessin', '✎'],
              ['image', 'Media', '🖼'],
            ] as const
          ).map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              className={tool === id ? 'active' : ''}
              onClick={() => {
                if (id === 'image') {
                  document.getElementById('canva-upload')?.click()
                  return
                }
                setTool(id)
              }}
              title={label}
            >
              <span className="rail-icon">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
          <input
            id="canva-upload"
            type="file"
            hidden
            multiple
            accept="image/*,.pdf,.txt,.zip,application/pdf"
            onChange={(e) => {
              void onUpload(e.target.files)
              e.target.value = ''
            }}
          />
        </nav>

        <section className="canva-stage">
          <div
            className="canva-artboard-wrap"
            style={{ width: displayW, height: displayH }}
          >
            <div
              ref={boardRef}
              className={`canva-artboard tool-${tool}`}
              style={{
                width: displayW,
                height: displayH,
                background: doc.background,
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {doc.elements.map((el) => (
                <ElementView
                  key={el.id}
                  el={el}
                  selected={el.id === selectedId}
                  editing={el.id === editingTextId}
                  scaleX={displayW / width}
                  scaleY={displayH / height}
                  onDoubleClick={() => {
                    if (el.type === 'text') {
                      setSelectedId(el.id)
                      setEditingTextId(el.id)
                    }
                  }}
                  onTextChange={(text) => patchElement(el.id, { text } as Partial<TextElement>)}
                />
              ))}
            </div>
          </div>
          <p className="canva-hint">
            Glisse pour déplacer · poignées pour redimensionner · double-clic texte pour éditer
          </p>
        </section>

        <aside className="canva-props">
          <h3>Propriétés</h3>
          {!selected ? (
            <p className="muted tiny">Sélectionne un élément ou change le fond.</p>
          ) : (
            <ElementProps
              el={selected}
              onChange={(patch) => patchElement(selected.id, patch)}
              onForward={bringForward}
              onBackward={sendBackward}
            />
          )}

          <div className="nuancier">
            <div className="nuancier-head">
              <strong>Nuancier</strong>
              <div className="nuancier-targets">
                <button
                  type="button"
                  className={nuancierTarget === 'element' ? 'active' : ''}
                  onClick={() => setNuancierTarget('element')}
                >
                  Élément
                </button>
                <button
                  type="button"
                  className={nuancierTarget === 'bg' ? 'active' : ''}
                  onClick={() => setNuancierTarget('bg')}
                >
                  Fond
                </button>
              </div>
              <label className="nuancier-custom">
                <input
                  type="color"
                  value={nuancierTarget === 'bg' ? doc.background : drawColor}
                  onChange={(e) => applyNuancier(e.target.value)}
                />
              </label>
            </div>
            {NUANCIER_ROWS.map((row) => (
              <div key={row.label} className="nuancier-row">
                <span className="nuancier-label">{row.label}</span>
                <div className="swatches dense">
                  {row.colors.map((c) => (
                    <button
                      key={`${row.label}-${c}`}
                      type="button"
                      className="swatch"
                      style={{ background: c }}
                      aria-label={c}
                      onClick={() => applyNuancier(c)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="canva-layers">
            <h4>Calques</h4>
            <ul>
              {[...doc.elements].reverse().map((el) => (
                <li key={el.id}>
                  <button
                    type="button"
                    className={el.id === selectedId ? 'active' : ''}
                    onClick={() => setSelectedId(el.id)}
                  >
                    {el.type} · {el.name}
                  </button>
                </li>
              ))}
              {!doc.elements.length && <li className="muted tiny">Aucun élément</li>}
            </ul>
          </div>

          {attachments.filter((a) => a.kind === 'file').length > 0 && (
            <div className="attachments">
              <strong>Fichiers joints</strong>
              <ul className="attachment-list">
                {attachments
                  .filter((a) => a.kind === 'file')
                  .map((a) => (
                    <li key={a.id}>
                      <span className="att-file">📄</span>
                      <span className="att-name">{a.name}</span>
                      <button
                        type="button"
                        className="att-remove"
                        onClick={() =>
                          onAttachmentsChange(attachments.filter((x) => x.id !== a.id))
                        }
                      >
                        ×
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <footer className="canva-foot">
        <div className="price-line">
          <span>{pixels.toLocaleString('fr-FR')} px</span>
          <strong>{priceEuros.toLocaleString('fr-FR')} €</strong>
        </div>
        {stripeEnabled && (
          <label className="stripe-toggle">
            <input
              type="checkbox"
              checked={useStripe}
              onChange={(e) => onUseStripeChange(e.target.checked)}
            />
            Stripe (0 commission Pixora)
          </label>
        )}
        {!useStripe && <p className="fee-note">Mode démo · 0 frais</p>}
        {error && <p className="error">{error}</p>}
        <button type="button" className="cta-buy" disabled={busy} onClick={onBuy}>
          {busy ? 'Traitement…' : useStripe ? 'Payer avec Stripe' : 'Acheter (démo 0 €)'}
        </button>
      </footer>
    </div>
  )
}

function ElementView({
  el,
  selected,
  editing,
  scaleX,
  scaleY,
  onDoubleClick,
  onTextChange,
}: {
  el: DesignElement
  selected: boolean
  editing: boolean
  scaleX: number
  scaleY: number
  onDoubleClick: () => void
  onTextChange: (text: string) => void
}) {
  const style: CSSProperties = {
    position: 'absolute',
    left: el.x * scaleX,
    top: el.y * scaleY,
    width: Math.max(4, el.w * scaleX),
    height: Math.max(4, el.h * scaleY),
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    boxSizing: 'border-box',
  }

  let inner: React.ReactNode = null
  if (el.type === 'rect') {
    inner = (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: el.fill,
          border:
            el.strokeWidth > 0 ? `${el.strokeWidth * scaleX}px solid ${el.stroke}` : undefined,
          borderRadius: el.radius * scaleX,
        }}
      />
    )
  } else if (el.type === 'ellipse') {
    inner = (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: el.fill,
          borderRadius: '50%',
          border:
            el.strokeWidth > 0 ? `${el.strokeWidth * scaleX}px solid ${el.stroke}` : undefined,
        }}
      />
    )
  } else if (el.type === 'text') {
    inner = editing ? (
      <textarea
        className="canva-text-edit"
        value={el.text}
        autoFocus
        onChange={(e) => onTextChange(e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          fontSize: el.fontSize * scaleY,
          fontFamily: el.fontFamily,
          fontWeight: el.bold ? 700 : 500,
          color: el.color,
          textAlign: el.align,
        }}
      />
    ) : (
      <div
        style={{
          width: '100%',
          height: '100%',
          fontSize: el.fontSize * scaleY,
          fontFamily: el.fontFamily,
          fontWeight: el.bold ? 700 : 500,
          color: el.color,
          textAlign: el.align,
          lineHeight: 1.25,
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {el.text}
      </div>
    )
  } else if (el.type === 'image') {
    inner = (
      <img
        src={el.src}
        alt={el.fileName}
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
      />
    )
  } else if (el.type === 'path') {
    const minX = Math.min(...el.points.map((p) => p.x))
    const minY = Math.min(...el.points.map((p) => p.y))
    const path = el.points
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${(pt.x - minX) * scaleX} ${(pt.y - minY) * scaleY}`)
      .join(' ')
    inner = (
      <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
        <path
          d={path}
          fill="none"
          stroke={el.color}
          strokeWidth={el.strokeWidth * scaleX}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <div
      className={`canva-el ${selected ? 'selected' : ''}`}
      style={style}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onDoubleClick()
      }}
    >
      {inner}
      {selected && (
        <>
          {['nw', 'ne', 'sw', 'se'].map((h) => (
            <span key={h} className={`handle handle-${h}`} data-handle={h} />
          ))}
        </>
      )}
    </div>
  )
}

function ElementProps({
  el,
  onChange,
  onForward,
  onBackward,
}: {
  el: DesignElement
  onChange: (patch: Partial<DesignElement>) => void
  onForward: () => void
  onBackward: () => void
}) {
  return (
    <div className="props-stack">
      <label>
        Nom
        <input
          value={el.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </label>

      {el.type === 'text' && (
        <>
          <label>
            Contenu
            <textarea
              rows={3}
              value={el.text}
              onChange={(e) => onChange({ text: e.target.value } as Partial<TextElement>)}
            />
          </label>
          <label>
            Police
            <select
              value={el.fontFamily}
              onChange={(e) =>
                onChange({ fontFamily: e.target.value } as Partial<TextElement>)
              }
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label>
            Taille {el.fontSize}
            <input
              type="range"
              min={8}
              max={120}
              value={el.fontSize}
              onChange={(e) =>
                onChange({ fontSize: Number(e.target.value) } as Partial<TextElement>)
              }
            />
          </label>
          <label className="row-check">
            <input
              type="checkbox"
              checked={el.bold}
              onChange={(e) => onChange({ bold: e.target.checked } as Partial<TextElement>)}
            />
            Gras
          </label>
          <div className="align-row">
            {(['left', 'center', 'right'] as const).map((a) => (
              <button
                key={a}
                type="button"
                className={el.align === a ? 'active' : ''}
                onClick={() => onChange({ align: a } as Partial<TextElement>)}
              >
                {a === 'left' ? '⟸' : a === 'center' ? '⇔' : '⟹'}
              </button>
            ))}
          </div>
        </>
      )}

      {(el.type === 'rect' || el.type === 'ellipse') && (
        <>
          <label>
            Remplissage
            <input
              type="color"
              value={el.fill.startsWith('#') && el.fill.length === 7 ? el.fill : '#c8f542'}
              onChange={(e) => onChange({ fill: e.target.value })}
            />
          </label>
          {el.type === 'rect' && (
            <label>
              Coins {el.radius}
              <input
                type="range"
                min={0}
                max={80}
                value={el.radius}
                onChange={(e) => onChange({ radius: Number(e.target.value) })}
              />
            </label>
          )}
        </>
      )}

      {el.type === 'path' && (
        <label>
          Épaisseur {el.strokeWidth}
          <input
            type="range"
            min={1}
            max={40}
            value={el.strokeWidth}
            onChange={(e) => onChange({ strokeWidth: Number(e.target.value) })}
          />
        </label>
      )}

      <div className="layer-btns">
        <button type="button" onClick={onBackward}>
          ↓ Arrière
        </button>
        <button type="button" onClick={onForward}>
          ↑ Avant
        </button>
      </div>
    </div>
  )
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

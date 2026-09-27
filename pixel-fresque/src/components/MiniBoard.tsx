import { useCallback, useEffect, useRef, useState } from 'react'
import type { BlockAttachment, BoardDrawTool, Selection } from '../types'

type Props = {
  selection: Selection | null
  bgColor: string
  canvasData: string | null
  attachments: BlockAttachment[]
  onCanvasChange: (dataUrl: string) => void
  onAttachmentsChange: (attachments: BlockAttachment[]) => void
  onBgColorChange: (color: string) => void
}

/** Nuancier étendu — teintes + neutres */
const NUANCIER: { label: string; colors: string[] }[] = [
  {
    label: 'Vifs',
    colors: ['#c8f542', '#ff6b4a', '#ef476f', '#f72585', '#ffd166', '#06d6a0', '#4ecdc4', '#118ab2'],
  },
  {
    label: 'Profonds',
    colors: ['#073b4c', '#1b4332', '#3d5a80', '#5c4d7a', '#9b5de5', '#7b2cbf', '#bc4749', '#6a994e'],
  },
  {
    label: 'Pastels',
    colors: ['#f4f1de', '#ffe5ec', '#e8f5e9', '#e3f2fd', '#fff3e0', '#f3e5f5', '#e0f7fa', '#fce4ec'],
  },
  {
    label: 'Neutres',
    colors: ['#ffffff', '#e8e8e8', '#bdbdbd', '#757575', '#424242', '#1a1a1a', '#0c0f0a', '#000000'],
  },
]

const MAX_FILE = 2_000_000
/** Taille d’affichage cible du studio (px) — même 1×1 apparaît en grand */
const STUDIO_DISPLAY = 380

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function floodFill(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  fillColor: string,
) {
  const { width, height } = ctx.canvas
  const img = ctx.getImageData(0, 0, width, height)
  const data = img.data
  const x0 = Math.floor(sx)
  const y0 = Math.floor(sy)
  if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) return

  const i0 = (y0 * width + x0) * 4
  const tr = data[i0]
  const tg = data[i0 + 1]
  const tb = data[i0 + 2]
  const ta = data[i0 + 3]
  const [fr, fg, fb] = hexToRgb(fillColor)
  if (tr === fr && tg === fg && tb === fb && ta === 255) return

  const stack: number[] = [x0, y0]
  const seen = new Uint8Array(width * height)

  while (stack.length) {
    const y = stack.pop()!
    const x = stack.pop()!
    const idx = y * width + x
    if (seen[idx]) continue
    seen[idx] = 1
    const i = idx * 4
    if (data[i] !== tr || data[i + 1] !== tg || data[i + 2] !== tb || data[i + 3] !== ta) continue
    data[i] = fr
    data[i + 1] = fg
    data[i + 2] = fb
    data[i + 3] = 255
    if (x > 0) stack.push(x - 1, y)
    if (x < width - 1) stack.push(x + 1, y)
    if (y > 0) stack.push(x, y - 1)
    if (y < height - 1) stack.push(x, y + 1)
  }
  ctx.putImageData(img, 0, 0)
}

export function MiniBoard({
  selection,
  bgColor,
  canvasData,
  attachments,
  onCanvasChange,
  onAttachmentsChange,
  onBgColorChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const history = useRef<string[]>([])
  const [tool, setTool] = useState<BoardDrawTool>('pen')
  const [color, setColor] = useState('#1a1a1a')
  const [brush, setBrush] = useState(4)
  const [stampId, setStampId] = useState<string | null>(null)
  const [textValue, setTextValue] = useState('Pixora')
  const [fontSize, setFontSize] = useState(18)
  const [nuancierTarget, setNuancierTarget] = useState<'draw' | 'bg'>('draw')
  const exportTimer = useRef<number | null>(null)

  const w = selection?.width ?? 1
  const h = selection?.height ?? 1
  // Toujours travailler en grand : 1 pixel → studio ~380×380
  const scale = Math.max(8, Math.min(128, Math.floor(STUDIO_DISPLAY / Math.max(w, h))))
  const cw = Math.max(1, w * scale)
  const ch = Math.max(1, h * scale)
  const displayCss = Math.min(STUDIO_DISPLAY, 420)

  const commit = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (exportTimer.current) window.clearTimeout(exportTimer.current)
    exportTimer.current = window.setTimeout(() => {
      onCanvasChange(canvas.toDataURL('image/png'))
    }, 120)
  }, [onCanvasChange])

  const snapshot = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    history.current.push(canvas.toDataURL('image/png'))
    if (history.current.length > 30) history.current.shift()
  }, [])

  const paintBackground = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, cw, ch)
      if (scale >= 4) {
        ctx.strokeStyle = 'rgba(0,0,0,0.1)'
        ctx.lineWidth = 1
        for (let x = 0; x <= cw; x += scale) {
          ctx.beginPath()
          ctx.moveTo(x + 0.5, 0)
          ctx.lineTo(x + 0.5, ch)
          ctx.stroke()
        }
        for (let y = 0; y <= ch; y += scale) {
          ctx.beginPath()
          ctx.moveTo(0, y + 0.5)
          ctx.lineTo(cw, y + 0.5)
          ctx.stroke()
        }
      }
    },
    [bgColor, cw, ch, scale],
  )

  const redrawFrom = useCallback(
    async (dataUrl: string | null) => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = cw
      canvas.height = ch
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.imageSmoothingEnabled = false

      if (dataUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => {
            ctx.clearRect(0, 0, cw, ch)
            ctx.drawImage(img, 0, 0, cw, ch)
            resolve()
          }
          img.onerror = () => {
            paintBackground(ctx)
            resolve()
          }
          img.src = dataUrl
        })
      } else {
        paintBackground(ctx)
      }
      commit()
    },
    [cw, ch, paintBackground, commit],
  )

  useEffect(() => {
    void redrawFrom(canvasData)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cw, ch, selection?.x, selection?.y])

  useEffect(() => {
    if (!canvasData) void redrawFrom(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgColor])

  function pos(e: React.PointerEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * cw,
      y: ((e.clientY - rect.top) / rect.height) * ch,
    }
  }

  function strokeLine(x0: number, y0: number, x1: number, y1: number) {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(1, brush * (scale / 4))
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color
    }
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
  }

  function placeStamp(px: number, py: number) {
    const att = attachments.find((a) => a.id === stampId && a.kind === 'image')
    if (!att) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    snapshot()
    const img = new Image()
    img.onload = () => {
      const mw = Math.min(cw * 0.45, img.width)
      const mh = (img.height / img.width) * mw
      ctx.drawImage(img, px - mw / 2, py - mh / 2, mw, mh)
      commit()
    }
    img.src = att.dataUrl
  }

  function placeText(px: number, py: number) {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !textValue.trim()) return
    snapshot()
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = color
    ctx.textBaseline = 'top'
    ctx.font = `600 ${Math.max(8, fontSize * (scale / 8))}px Outfit, sans-serif`
    ctx.fillText(textValue, px, py)
    commit()
  }

  function onPointerDown(e: React.PointerEvent) {
    const canvas = canvasRef.current!
    canvas.setPointerCapture(e.pointerId)
    const p = pos(e)

    if (tool === 'stamp') {
      placeStamp(p.x, p.y)
      return
    }
    if (tool === 'text') {
      placeText(p.x, p.y)
      return
    }
    if (tool === 'fill') {
      snapshot()
      const ctx = canvas.getContext('2d')!
      floodFill(ctx, p.x, p.y, color)
      commit()
      return
    }
    if (tool === 'pen' || tool === 'eraser') {
      snapshot()
      drawing.current = true
      last.current = p
      strokeLine(p.x, p.y, p.x + 0.01, p.y + 0.01)
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drawing.current || !last.current) return
    const p = pos(e)
    strokeLine(last.current.x, last.current.y, p.x, p.y)
    last.current = p
  }

  function onPointerUp() {
    if (drawing.current) commit()
    drawing.current = false
    last.current = null
  }

  function undo() {
    const prev = history.current.pop()
    if (!prev) return
    void redrawFrom(prev)
  }

  function clearBoard() {
    snapshot()
    void redrawFrom(null)
  }

  function pickNuancier(c: string) {
    if (nuancierTarget === 'bg') {
      onBgColorChange(c)
    } else {
      setColor(c)
      if (tool !== 'text' && tool !== 'fill' && tool !== 'pen') setTool('pen')
    }
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return
    const next = [...attachments]
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE) {
        alert(`« ${file.name} » trop lourd (max 2 Mo).`)
        continue
      }
      const dataUrl = await readFile(file)
      const isImage = file.type.startsWith('image/')
      const att: BlockAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        mime: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl,
        kind: isImage ? 'image' : 'file',
      }
      next.push(att)
      if (isImage) {
        const ctx = canvasRef.current?.getContext('2d')
        if (ctx) {
          snapshot()
          await new Promise<void>((resolve) => {
            const img = new Image()
            img.onload = () => {
              const mw = Math.min(cw * 0.7, img.width)
              const mh = (img.height / img.width) * mw
              ctx.drawImage(img, (cw - mw) / 2, (ch - mh) / 2, mw, mh)
              commit()
              resolve()
            }
            img.onerror = () => resolve()
            img.src = dataUrl
          })
        }
      }
    }
    onAttachmentsChange(next)
  }

  function removeAttachment(id: string) {
    onAttachmentsChange(attachments.filter((a) => a.id !== id))
    if (stampId === id) setStampId(null)
  }

  return (
    <div className="mini-board">
      {selection && (
        <div className="studio-banner">
          <span>
            Zone {w}×{h} px
            {w * h === 1 ? ' · 1 pixel agrandi' : ''}
          </span>
          <strong>×{scale} zoom studio</strong>
        </div>
      )}

      <div className="board-toolbar">
        {(
          [
            ['pen', 'Crayon'],
            ['eraser', 'Gomme'],
            ['fill', 'Remplir'],
            ['text', 'Texte'],
            ['stamp', 'Tampon'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tool === id ? 'active' : ''}
            onClick={() => setTool(id)}
          >
            {label}
          </button>
        ))}
        <button type="button" onClick={undo} title="Annuler">
          ↶
        </button>
        <button type="button" onClick={clearBoard} title="Effacer le tableau">
          Effacer
        </button>
      </div>

      {tool === 'text' && (
        <div className="text-tool-bar">
          <label>
            Texte
            <input
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="Écrire…"
              maxLength={80}
            />
          </label>
          <label className="brush-label">
            Taille {fontSize}
            <input
              type="range"
              min={8}
              max={64}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
            />
          </label>
          <p className="muted tiny">Clique sur le tableau pour poser le texte.</p>
        </div>
      )}

      <div className="nuancier">
        <div className="nuancier-head">
          <strong>Nuancier</strong>
          <div className="nuancier-targets">
            <button
              type="button"
              className={nuancierTarget === 'draw' ? 'active' : ''}
              onClick={() => setNuancierTarget('draw')}
            >
              Dessin
            </button>
            <button
              type="button"
              className={nuancierTarget === 'bg' ? 'active' : ''}
              onClick={() => setNuancierTarget('bg')}
            >
              Fond
            </button>
          </div>
          <label className="nuancier-custom" title="Couleur perso">
            <input
              type="color"
              value={nuancierTarget === 'bg' ? bgColor : color}
              onChange={(e) => pickNuancier(e.target.value)}
            />
          </label>
        </div>
        {NUANCIER.map((row) => (
          <div key={row.label} className="nuancier-row">
            <span className="nuancier-label">{row.label}</span>
            <div className="swatches dense">
              {row.colors.map((c) => (
                <button
                  key={`${row.label}-${c}`}
                  type="button"
                  className={`swatch ${
                    (nuancierTarget === 'bg' ? bgColor : color).toLowerCase() === c.toLowerCase()
                      ? 'selected'
                      : ''
                  }`}
                  style={{ background: c }}
                  aria-label={c}
                  onClick={() => pickNuancier(c)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {(tool === 'pen' || tool === 'eraser') && (
        <label className="brush-label">
          Épaisseur {brush}
          <input
            type="range"
            min={1}
            max={24}
            value={brush}
            onChange={(e) => setBrush(Number(e.target.value))}
          />
        </label>
      )}

      <div className="board-stage studio-zoom">
        {!selection && (
          <p className="board-empty">
            Sélectionne une zone (même 1 pixel) — elle s’affiche ici en grand.
          </p>
        )}
        <canvas
          ref={canvasRef}
          className={`board-canvas tool-${tool}`}
          style={{
            width: displayCss,
            height: (displayCss * h) / w,
            maxWidth: '100%',
            opacity: selection ? 1 : 0.35,
            pointerEvents: selection ? 'auto' : 'none',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        <p className="board-hint">
          Studio {w}×{h} · agrandi pour personnaliser · rendu réel sur la fresque
        </p>
      </div>

      <div className="attachments">
        <div className="attachments-head">
          <strong>Pièces jointes</strong>
          <label className="file-chip">
            + Ajouter
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.json,.csv,.zip,application/pdf"
              onChange={(e) => {
                void addFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </label>
        </div>
        {attachments.length === 0 ? (
          <p className="muted tiny">Images (sur le tableau) ou fichiers (PDF, etc.).</p>
        ) : (
          <ul className="attachment-list">
            {attachments.map((a) => (
              <li key={a.id}>
                {a.kind === 'image' ? (
                  <button
                    type="button"
                    className={`att-thumb ${stampId === a.id ? 'picked' : ''}`}
                    onClick={() => {
                      setStampId(a.id)
                      setTool('stamp')
                    }}
                    title="Utiliser comme tampon"
                  >
                    <img src={a.dataUrl} alt={a.name} />
                  </button>
                ) : (
                  <span className="att-file" title={a.mime}>
                    📄
                  </span>
                )}
                <span className="att-name">{a.name}</span>
                <button type="button" className="att-remove" onClick={() => removeAttachment(a.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        {tool === 'stamp' && (
          <p className="muted tiny">Clique sur le tableau pour tamponner l’image sélectionnée.</p>
        )}
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

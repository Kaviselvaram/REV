/* ---------------------------------------------------------------------------
   Share cards.

   A rider page spreads because someone screenshots it and puts it on a status.
   A purpose-drawn card beats a screenshot: it is the right aspect ratio, it
   carries the wordmark, and it shows only the things worth showing.

   Drawn on a canvas in the browser — no server, no image service, nothing to
   run or pay for. 1080×1350 is the portrait ratio Instagram and WhatsApp
   status both accept without cropping the important part away.
   --------------------------------------------------------------------------- */

const W = 1080
const H = 1350

const INK = '#191713'
const IVORY = '#F6F3EC'
const MUTED = 'rgba(246,243,236,0.45)'

// Fraunces and Inter arrive over the network. If they have not landed we fall
// back rather than drawing the card in a default face that looks nothing like
// the product.
async function fontsReady() {
  try {
    if (document.fonts?.ready) await document.fonts.ready
    return document.fonts?.check?.('700 100px Fraunces') ?? false
  } catch { return false }
}

const display = (weight, size, ok) =>
  `${weight} ${size}px ${ok ? '"Fraunces", Georgia, serif' : 'Georgia, serif'}`
const body = (weight, size) =>
  `${weight} ${size}px "Inter", system-ui, sans-serif`

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Wraps to at most `maxLines`, shrinking until it fits rather than clipping a
// rider's name mid-word.
function fitLines(ctx, text, maxW, maxLines) {
  const words = String(text).split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width > maxW && line) {
      lines.push(line)
      line = w
      if (lines.length === maxLines) break
    } else {
      line = next
    }
  }
  if (lines.length < maxLines && line) lines.push(line)
  return lines
}

function initials(name) {
  return String(name).split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

/**
 * Draws a rider card and resolves to a PNG Blob.
 * @param {object} rider  the shape app.rider_identity() returns
 * @param {string} accent hex accent for the world
 */
export async function riderCard(rider, accent = '#A64B2A') {
  const ok = await fontsReady()
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')

  // ground
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, W, H)

  // accent bar
  ctx.fillStyle = accent
  ctx.fillRect(0, 0, W, 14)

  // a soft accent wash so the card is not a flat rectangle
  const g = ctx.createRadialGradient(W * 0.85, H * 0.12, 0, W * 0.85, H * 0.12, W * 0.9)
  g.addColorStop(0, `${accent}22`)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  const M = 88
  let y = 150

  // wordmark
  ctx.font = display(900, 54, ok)
  ctx.fillStyle = IVORY
  ctx.fillText('REV', M, y)
  const revW = ctx.measureText('REV').width
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.arc(M + revW + 20, y - 8, 9, 0, Math.PI * 2)
  ctx.fill()

  // avatar disc
  y += 130
  const R = 74
  ctx.save()
  ctx.beginPath()
  ctx.arc(M + R, y + R, R, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  const ag = ctx.createLinearGradient(M, y, M + R * 2, y + R * 2)
  ag.addColorStop(0, accent)
  ag.addColorStop(1, '#2A241C')
  ctx.fillStyle = ag
  ctx.fillRect(M, y, R * 2, R * 2)
  ctx.restore()
  ctx.font = display(700, 52, ok)
  ctx.fillStyle = IVORY
  ctx.textAlign = 'center'
  ctx.fillText(initials(rider.display_name), M + R, y + R + 18)
  ctx.textAlign = 'left'

  // rank / founding line
  const rank = { captain: 'CAPTAIN', founding_captain: 'FOUNDING CAPTAIN', corridor_legend: 'CORRIDOR LEGEND' }[rider.captain_rank]
  ctx.font = body(700, 22)
  ctx.fillStyle = accent
  ctx.letterSpacing = '3px'
  const tag = [rank, rider.founding_number != null ? `FOUNDING #${rider.founding_number}` : null]
    .filter(Boolean).join('   ·   ') || 'RIDER'
  ctx.fillText(tag, M + R * 2 + 34, y + 52)
  ctx.letterSpacing = '0px'

  // name
  ctx.font = display(600, 78, ok)
  ctx.fillStyle = IVORY
  const nameLines = fitLines(ctx, rider.display_name, W - (M + R * 2 + 34) - M, 2)
  nameLines.forEach((ln, i) => ctx.fillText(ln, M + R * 2 + 34, y + 118 + i * 78))

  y += R * 2 + (nameLines.length > 1 ? 70 : 20)

  // handle + place
  ctx.font = body(400, 28)
  ctx.fillStyle = MUTED
  ctx.fillText(`@${rider.handle}  ·  ${rider.corridor || rider.city}`, M, y + 60)

  // the record
  y += 150
  ctx.strokeStyle = 'rgba(246,243,236,0.14)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(M, y); ctx.lineTo(W - M, y); ctx.stroke()

  const machines = rider.machines?.length ?? 0
  const km = (rider.machines ?? []).reduce((s, m) =>
    s + (m.milestones ?? []).reduce((t, x) => t + (Number(x.detail?.distance_km) || 0), 0), 0)

  const stats = [
    [rider.rides_count ?? 0, 'RIDES RIDDEN'],
    [rider.rides_led ?? 0, 'RIDES LED'],
    [Math.round(km), 'KM LOGGED'],
    [machines, machines === 1 ? 'MACHINE' : 'MACHINES'],
  ]
  const colW = (W - M * 2) / 4
  stats.forEach(([v, label], i) => {
    const x = M + i * colW
    ctx.font = display(600, 68, ok)
    ctx.fillStyle = IVORY
    ctx.fillText(String(v), x, y + 96)
    ctx.font = body(600, 18)
    ctx.fillStyle = MUTED
    ctx.letterSpacing = '2px'
    ctx.fillText(label, x, y + 132)
    ctx.letterSpacing = '0px'
  })

  y += 190
  ctx.beginPath(); ctx.moveTo(M, y); ctx.lineTo(W - M, y); ctx.stroke()

  // primary machine
  const m0 = rider.machines?.[0]
  if (m0) {
    ctx.font = body(600, 20)
    ctx.fillStyle = accent
    ctx.letterSpacing = '3px'
    ctx.fillText('THE MACHINE', M, y + 64)
    ctx.letterSpacing = '0px'
    ctx.font = display(600, 52, ok)
    ctx.fillStyle = IVORY
    fitLines(ctx, `${m0.make} ${m0.model}`, W - M * 2, 1)
      .forEach((ln) => ctx.fillText(ln, M, y + 128))
    ctx.font = body(400, 26)
    ctx.fillStyle = MUTED
    ctx.fillText([m0.year, m0.extra, m0.ride_style].filter(Boolean).join('  ·  '), M, y + 172)
  }

  // earned marks
  const marks = (rider.badges ?? []).slice(0, 4)
  if (marks.length) {
    let bx = M
    const by = H - 250
    ctx.font = body(600, 20)
    marks.forEach((b) => {
      const label = b.label.toUpperCase()
      const w = ctx.measureText(label).width + 44
      if (bx + w > W - M) return
      ctx.strokeStyle = `${accent}66`
      ctx.lineWidth = 2
      roundRect(ctx, bx, by, w, 52, 26)
      ctx.stroke()
      ctx.fillStyle = accent
      ctx.letterSpacing = '2px'
      ctx.fillText(label, bx + 22, by + 34)
      ctx.letterSpacing = '0px'
      bx += w + 14
    })
  }

  // footer
  ctx.font = body(400, 24)
  ctx.fillStyle = MUTED
  ctx.fillText('Verified riders only  ·  rev.app', M, H - 96)

  ctx.font = body(600, 22)
  ctx.fillStyle = accent
  ctx.letterSpacing = '2px'
  ctx.textAlign = 'right'
  ctx.fillText('EARNED, NOT BOUGHT', W - M, H - 96)
  ctx.textAlign = 'left'
  ctx.letterSpacing = '0px'

  return new Promise((resolve) => c.toBlob(resolve, 'image/png', 0.95))
}

/* Hands the card to the OS share sheet where files are supported — that is the
   path to Instagram and WhatsApp on a phone — and downloads it otherwise. */
export async function shareCardImage(blob, filename, title) {
  const file = new File([blob], filename, { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}

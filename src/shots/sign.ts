import { Sheet, keyframes, lattice, leaf, n, type Theme } from '../kit.ts'

const [W, H] = [1280, 320]
const LOOP = 12
const STILL = 6
const END = 11

/** The leaf's last fall: down in two swings to rest beside the name. */
const [FALLS, RESTS] = [0.4, 3.6]

export function sign(theme: Theme) {
  const sheet = new Sheet(W, H, theme)
  const grid = lattice(20, 0, 20)
  sheet.def(
    `<radialGradient id="clear" cx="50%" cy="50%" r="60%"><stop offset="0.25" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></radialGradient>`,
    `<mask id="around"><rect width="${W}" height="${H}" fill="url(#clear)"/></mask>`,
  )
  sheet.field(grid, 'around')

  // The name, letter by letter.
  const [name, size, baseline] = ['Ewen Gao', 128, 182]
  let pen = W / 2 - sheet.width('sign', name, size) / 2 - 24
  ;[...name].forEach((letter, k) => {
    if (letter !== ' ') sheet.add(`<g${sheet.appear(LOOP, 0.5 + 0.13 * k, END, STILL, 14)}>${sheet.type('sign', letter, pen, baseline, size)}</g>`)
    pen += sheet.width('sign', letter, size)
  })

  // The leaf, come to rest where a full stop would stand.
  const rest = { x: pen + 44, y: baseline - 26, turn: 24 }
  const fall = Array.from({ length: 33 }, (_, k) => {
    const s = k / 32
    const calm = (1 - s) ** 0.9
    const swing = 2 * Math.PI * s
    const [x, y, turn] = [rest.x + 110 * calm * Math.sin(swing), rest.y - 250 * (1 - s) + 14 * calm * Math.cos(2 * swing), rest.turn + 40 * calm * Math.sin(swing)]
    return [FALLS + (RESTS - FALLS) * s, `transform:translate(${n(x)}px,${n(y)}px) rotate(${n(turn)}deg)`] as [number, string]
  })
  const [first, last] = [fall[0]![1], fall.at(-1)![1]]
  sheet.css(
    keyframes('settle', LOOP, [[0, `opacity:1;${first}`], ...fall.map(([at, move]) => [at, `opacity:1;${move}`] as [number, string]), [END, `opacity:1;${last}`], [END + 0.4, `opacity:0;${last}`], [END + 0.41, `opacity:0;${first}`], [LOOP, `opacity:1;${first}`]]),
    `.settle{animation:settle ${LOOP}s linear infinite}`,
  )
  sheet.add(`<g class="settle" transform="translate(${n(rest.x)} ${n(rest.y)}) rotate(${rest.turn})">${leaf(theme)}</g>`)

  const colophon = 'every frame here is drawn in code · set in JetBrains Mono and Newsreader'
  const wide = sheet.width('mono', colophon, 17)
  sheet.add(sheet.mark(W / 2 - wide / 2 - 12, 238, 7, theme.faint), sheet.type('mono', colophon, W / 2 - wide / 2 + 12, 258, 17, { fill: theme.faint }))
  return sheet.toString()
}

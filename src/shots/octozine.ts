import { Sheet, keyframes, n, squares, type Theme } from '../kit.ts'

const [W, H] = [632, 440]
const LOOP = 9
const STILL = 7

/** The loop's beats: the week's candidates are read through, the picks leave for the page, the issue stands. */
const [READ, READ_THROUGH, END] = [0.6, 2.6, 8.2]

const [COLS, ROWS, PITCH] = [15, 10, 15.5]
const FIELD = [68, 122] as const

/** The eight picked of the hundred and fifty, by column and row, in the order the page ranks them. */
const PICKS = [
  [6, 3],
  [11, 0],
  [2, 1],
  [13, 5],
  [8, 7],
  [1, 6],
  [4, 9],
  [12, 8],
] as const

export function octozine(theme: Theme) {
  const sheet = new Sheet(W, H, theme)
  sheet.head('octozine', '')
  const spot = (col: number, row: number) => [FIELD[0] + PITCH * col, FIELD[1] + PITCH * row] as const
  const all = Array.from({ length: COLS * ROWS }, (_, k) => spot(k % COLS, Math.floor(k / COLS)))
  sheet.add(`<path fill="${theme.track}" d="${squares(all, 6)}"/>`)

  // The reading: a band of light that crosses the candidates.
  const across = PITCH * (COLS - 1)
  sheet.css(
    keyframes('read', LOOP, [[0, 'opacity:0;transform:translateX(0px)'], [READ, 'opacity:1;transform:translateX(0px)'], [READ_THROUGH, `opacity:1;transform:translateX(${n(across)}px)`], [READ_THROUGH + 0.3, `opacity:0;transform:translateX(${n(across)}px)`], [LOOP, 'opacity:0;transform:translateX(0px)']]),
    `.read{animation:read ${LOOP}s linear infinite}`,
  )
  sheet.add(`<rect class="read" opacity="0" x="${FIELD[0] - 9}" y="${FIELD[1] - 10}" width="18" height="${n(PITCH * (ROWS - 1) + 20)}" rx="5" fill="${theme.iris}" fill-opacity="0.28"/>`)

  // The page: the week's issue, a line for each pick.
  const [px, py, pw, ph] = [336, 108, 232, 190]
  sheet.add(`<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="12" fill="${theme.well}" stroke="${theme.line}" stroke-width="1.5"/>`)
  PICKS.forEach(([col, row], rank) => {
    const [fx, fy] = spot(col, row)
    const [tx, ty] = [px + 24, py + 25 + 20 * rank]
    const seen = READ + ((READ_THROUGH - READ) * col) / (COLS - 1)
    const leaves = READ_THROUGH + 0.3 + 0.16 * rank
    const move = `transform:translate(${n(tx - fx)}px,${n(ty - fy)}px)`
    sheet.css(
      keyframes(`pick${rank}`, LOOP, [
        [0, 'opacity:0;transform:translate(0px,0px)'],
        [seen, 'opacity:0;transform:translate(0px,0px)'],
        [seen + 0.1, 'opacity:1;transform:translate(0px,0px)'],
        [leaves, 'opacity:1;transform:translate(0px,0px);animation-timing-function:cubic-bezier(.5,0,.2,1)'],
        [leaves + 0.8, `opacity:1;${move}`],
        [END, `opacity:1;${move}`],
        [END + 0.4, `opacity:0;${move}`],
        [LOOP, 'opacity:0;transform:translate(0px,0px)'],
      ]),
      `.pick${rank}{animation:pick${rank} ${LOOP}s linear infinite}`,
    )
    const wide = [150, 118, 164, 132, 146, 104, 158, 124][rank]!
    sheet.add(
      `<rect x="${tx + 18}" y="${ty - 3}" width="${wide}" height="6" rx="3" fill="${rank === 0 ? theme.ink : theme.soft}" fill-opacity="${rank === 0 ? 0.9 : 0.5}"${sheet.appear(LOOP, leaves + 0.7, END, STILL)}/>`,
      `<g transform="translate(${n(fx)} ${n(fy)})"><rect class="pick${rank}" x="-4" y="-4" width="8" height="8" rx="1" fill="${theme.gold}" transform="translate(${n(tx - fx)} ${n(ty - fy)})"/></g>`,
    )
  })
  const count = (text: string, x: number) => sheet.type('mono', text, x, 326, 18, { fill: theme.faint })
  sheet.add(
    count('150 candidates', FIELD[0] - 4),
    count('8 picks', px),
    sheet.type('bold', 'A folio of GitHub, curated weekly.', 64, 374, 23, { tracking: -6 }),
    sheet.type('mono', 'Fork it, and the picks are ranked for you.', 64, 404, 18, { fill: theme.soft }),
  )
  return sheet.toString()
}

import { readFileSync, readdirSync } from 'node:fs'
import { Sheet, keyframes, n, type Theme } from '../kit.ts'

const [W, H] = [1280, 400]

/** The film's length in seconds; the strip passes once in that time. */
const FILM = 52

const FOLDER = new URL('../stills/', import.meta.url)
const STILLS = readdirSync(FOLDER)
  .filter(file => file.endsWith('.jpg'))
  .sort()
  .map(file => ({ caption: file.slice(3, -4).replace('-', ' '), data: readFileSync(new URL(file, FOLDER)).toString('base64') }))

const [WIDE, TALL, GAP, HOLE] = [288, 162, 16, 38]
const PITCH = WIDE + GAP
const TURN = STILLS.length * PITCH
const BASE = '#0c0b12'

export function reel(theme: Theme) {
  const sheet = new Sheet(W, H, theme)
  sheet.head('Eight Dots', 'the film of better-statusline: 52 seconds, all of it code')
  sheet.css(keyframes('pass', FILM, [[0, 'transform:translateX(0px)'], [FILM, `transform:translateX(${-TURN}px)`]]), `.pass{animation:pass ${FILM}s linear infinite}`)
  sheet.def(...STILLS.map((still, k) => `<image id="still${k}" width="${WIDE}" height="${TALL}" preserveAspectRatio="xMidYMid slice" href="data:image/jpeg;base64,${still.data}"/>`))

  const [top, tall] = [118, 218]
  const count = STILLS.length + Math.ceil(W / PITCH) + 1
  const frames = Array.from({ length: count }, (_, k) => {
    const x = k * PITCH + GAP / 2
    const still = k % STILLS.length
    return (
      `<use href="#still${still}" x="${x}" y="${top + 28}"/><rect x="${x + 0.5}" y="${top + 28.5}" width="${WIDE - 1}" height="${TALL - 1}" fill="none" stroke="#fff" stroke-opacity="0.1"/>` +
      sheet.type('mono', STILLS[still]!.caption, x + 2, top + tall + 34, 18, { fill: theme.faint })
    )
  })
  const holes = Array.from({ length: Math.ceil((count * PITCH) / HOLE) }, (_, k) => [top + 9, top + tall - 19].map(y => `<rect x="${n(k * HOLE + 11)}" y="${y}" width="16" height="10" rx="3"/>`).join(''))
  sheet.add(
    `<g transform="rotate(-1.6 ${W / 2} ${top + tall / 2})"><g class="pass">`,
    `<rect x="-200" y="${top}" width="${count * PITCH + 400}" height="${tall}" fill="${BASE}"/><g fill="${theme.paper}">${holes.join('')}</g>${frames.join('')}`,
    `</g></g>`,
  )
  return sheet.toString()
}

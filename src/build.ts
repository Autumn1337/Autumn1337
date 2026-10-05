import { mkdirSync, writeFileSync } from 'node:fs'
import { THEMES } from './kit.ts'
import { daybreak } from './shots/daybreak.ts'
import { hero } from './shots/hero.ts'
import { octozine } from './shots/octozine.ts'
import { reel } from './shots/reel.ts'
import { research } from './shots/research.ts'
import { sign } from './shots/sign.ts'
import { statusline } from './shots/statusline.ts'

const SHOTS = { hero, research, statusline, reel, octozine, daybreak, sign }

const out = new URL('../assets/', import.meta.url)
mkdirSync(out, { recursive: true })
for (const theme of THEMES) for (const [name, shot] of Object.entries(SHOTS)) writeFileSync(new URL(`${name}-${theme.name}.svg`, out), shot(theme))

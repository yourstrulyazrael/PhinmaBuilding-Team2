# Zenith Repair — design system

One page that says how the app looks, so every new screen matches the
old ones. The values live as tokens in `src/app/globals.css`; change a
token there and the whole app follows.

## Colours (tokens, light and dark)

| Token | Used for |
|---|---|
| `primary` (forest green) | main buttons, the focus ring, highlights |
| `tertiary` (navy) | page titles |
| `card` / `background` | surfaces / the page behind them |
| `muted` / `muted-foreground` | hover fills / secondary text |
| `destructive` | delete, cancel, errors |
| `highlight` (blue) | links to other places, info |
| `nav-active` | the page you are on, in the top bar |

Never write a raw colour (`#1f5f3f`, `green-700`) in a component — use a
token, so dark mode keeps working.

## Spacing

Tailwind's 4px steps, but only these: **1, 1.5, 2, 3, 4, 5, 6, 8**.
- Inside a control: `gap-2`
- Between fields in a form: `gap-4`
- Between cards on a page: `gap-4` (forms) or `gap-5`/`gap-6` (dashboards)
- Card padding: `p-6` (`CardHeader`, `CardContent`)
- Page edges: `px-4` on phones, `md:px-8`, `2xl:px-12`

## Type

| Role | Classes |
|---|---|
| Page title | `PageHeader` (`text-2xl md:text-[2rem] font-semibold text-tertiary`) |
| Card title | `CardTitle` (`text-lg font-semibold`) |
| Body | `text-sm` (`text-base` in fields on phones, so iOS doesn't zoom) |
| Small print, hints | `text-xs text-muted-foreground` |
| Eyebrow / chip | `text-[11px] font-semibold uppercase tracking-wider` |
| Numbers in tables | add `tabular-nums` |

Font: Geist. Big screens (1440px+) scale everything up slightly.

## Radius, shadow, sizes

- Radius: `rounded-[var(--radius)]` (14px) for cards, buttons, fields;
  `rounded-inner` (10px) for things inside them (menu rows, chips).
  Pills and badges: `rounded-full`.
- Shadow: `shadow-card` on cards; `shadow-lg` only on floating things
  (menus, toasts, dialogs).
- Control heights: `h-9` small, `h-10` normal, `h-11` large.

## Icons

lucide-react only. One line weight (1.75, set globally). Sizes:
`size-3.5` in chips and badges, `size-4` in buttons and text,
`size-5` in the top bar. Decorative icons get `aria-hidden`; an icon-only
button gets an `aria-label`.

## Motion

- Hover and press: 160ms ease (global).
- Gliding highlights (tabs, navbar): `GLIDE_MS` 420ms with `EASE`, from
  `components/sliding-tabs.tsx`.
- Menus: 120ms in and out.
- **Reduce motion:** the device setting turns every animation off
  (global rule in `globals.css`); JavaScript animations check
  `prefers-reduced-motion` themselves.

## Focus

Every focusable thing shows a ring when reached by keyboard
(`:focus-visible`): a 2px green outline, or a green border plus soft
glow on fields. Never remove it without putting a visible ring back.

## Feedback

- Confirmations and undo: a toast (bottom corner), never an `alert()`.
- Errors: next to the field, and a toast with **Try again** when the
  action can simply be retried.
- Loading: a skeleton shaped like the page, not a spinner.

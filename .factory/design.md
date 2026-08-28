# Subtitle Ladder — visual thesis

## Direction: the listening landscape

Subtitle Ladder uses **surreal editorial scenery** to make a difficult, abstract
practice method feel tangible. Caption slips rise like stepping stones through a
deep-ink landscape: at the bottom language is visible and supportive; at the top
only a listening moon remains. The scenery explains the product's central move—
gradually removing textual support—rather than acting as decoration.

The working interface is intentionally more like a marked-up language workbook
than a generic dashboard: generous paper fields, editorial rules, oversized stage
numbers, and tactile coral controls. The decorative scene appears only in the
welcome state and as a small cropped motif around onboarding; the learner's own
audio and words dominate during practice.

## Palette

The palette comes from late-night study: blue-black ink, warm book paper, a coral
record button, electric citron annotations, and cool dusk blue.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#F5F0E6` | `#101725` | page / book paper |
| `--surface` | `#FFFDF7` | `#182235` | raised working surface |
| `--text` | `#151A29` | `#F7F2E8` | primary ink (≥ 12:1) |
| `--muted` | `#5E6573` | `#B8C1D1` | secondary copy (≥ 4.8:1) |
| `--line` | `#C8C2B7` | `#3A465A` | boundaries |
| `--accent` | `#C93F2B` | `#FF765F` | primary action / recording |
| `--accent-contrast` | `#FFFFFF` | `#17111A` | text on accent |
| `--citron` | `#DCEB54` | `#DCEB54` | active-stage annotation |
| `--blue` | `#244DA0` | `#7FA7FF` | links / listening state |
| `--success` | `#24734C` | `#72D49E` | completed state |
| `--warning` | `#7A5310` | `#F0C66B` | recoverable warnings |
| `--danger` | `#A22626` | `#FF8585` | destructive/error state |

The theme follows the operating-system preference and can also be changed from
the footer. Status never relies on color alone: labels, icons, and state text are
always present.

## Typography

- Display and stage numerals: Georgia, Cambria, `Times New Roman`, serif. The
  high-contrast editorial face turns each exercise into a page rather than an app
  dashboard.
- Interface and reading text: `ui-sans-serif`, system-ui, -apple-system, Segoe UI,
  sans-serif. It stays crisp for captions across scripts and avoids network fonts.
- Scale: 14 (metadata), 16 (body), 20, 26, 40, and `clamp(48px, 10vw, 96px)`.
  Body line-height is 1.55 and prose measure is capped at 68 characters.
- Caption areas use the interface stack with `unicode-bidi: plaintext`; language
  and direction are user-selectable so Arabic, Hebrew, and other RTL captions
  retain their natural order.

## Spacing and layout

The system uses a 4/8px rhythm: 4, 8, 12, 16, 24, 32, 48, 64, and 96px. Content
is capped at 1180px. On wide screens the setup/practice page is a 5/7 editorial
split; at 760px it becomes one column. The phone version drops large scenery
crops, stacks transport controls, keeps the current stage sticky within the flow,
and respects safe-area insets. Targets are at least 44×44px with 8px separation.

## Interaction grammar

- A **ladder rail** with four numbered rungs is the persistent mental model.
  Completed rungs gain a check and remain revisitable; the next rung is explicit.
- Primary controls are coral lozenges with a 2px ink edge and a 3px offset shadow,
  like moveable print blocks. Pressing one settles the shadow.
- Media transport is a dark ink strip. Recording is the only circular control, a
  direct reference to a record button.
- Setup reveals progressively: media → captions → loop boundaries. Each accepted
  input gives immediate filename/count feedback; errors explain the repair.
- Destructive actions name their target and require confirmation. Recording delete
  offers an immediate undo window.

## Motion policy

Interface transitions last 180–240ms and use only opacity and transform: a newly
selected rung lifts 4px from its rail; the practice panel crossfades in place;
recording breathes once when it starts. No scenery loops. Under
`prefers-reduced-motion: reduce`, transforms and smooth scrolling are removed,
crossfades become instant, and the recording indicator stays solid.

## Asset plan and provenance

### Hero: `public/hero-listening-landscape.webp`

- Use case: `stylized-concept`; wide editorial welcome illustration.
- Subject/world: an impossible paper staircase made from blank subtitle strips
  rising through a midnight landscape from a coral listening horn toward a pale
  moon; four distinct landings, sparse cut-paper plants, no people.
- Materials: torn cotton paper, screen-print ink, subtle grain, crisp collage
  edges.
- Light/lens: flat editorial lighting with long stage-like shadows; wide landscape
  framing with quiet negative space on the left.
- Palette words: midnight ink, warm parchment, vermilion coral, electric citron,
  dusk blue.
- Negative list: text, letters, numbers, logos, watermark, UI mockup, gradients,
  people, faces, brands, commercial characters, photorealism, excessive detail.
- Prompt: “Surreal editorial cut-paper landscape for a language listening practice
  web app. An impossible staircase made of four blank subtitle-paper strips rises
  through a midnight ink landscape, beginning beside a sculptural coral listening
  horn and ending at a quiet warm-paper moon. Sparse citron reeds and dusk-blue
  shadows, tactile torn cotton paper, screen-print grain, crisp collage edges,
  sophisticated magazine illustration, wide composition with generous calm
  negative space, no text, no letters, no numbers, no people, no logos, no
  watermark, no interface, no gradients.”
- Generator: Azure AI Foundry factory image deployment via
  `/opt/fleet/lib/gen-image.sh`; generated 2026-08-28. Original generated asset;
  project use. The selected PNG is retained in `assets/src/` with a JSON prompt
  sidecar; WebP and responsive mobile crop are optimized derivatives.

App icons are original hand-authored SVG artwork derived from the four-rung ladder
and listening moon, then exported to PNG for the PWA manifest. No third-party
visual assets or runtime font/CDN requests are used. The footer discloses that the
welcome illustration is AI-generated.

## Accessibility notes

Focus uses a 3px blue outline with a 3px paper offset in light mode and a citron
outline in dark mode. Large scene areas are decorative only where duplicated by
copy; the welcome illustration has concise alt text because it explains the
ladder metaphor. Live regions announce uploads, saves, stage changes, recording,
offline status, and license results. The single page has one `h1`; route-like
legal views retain that same product `h1` and begin their content at `h2`.

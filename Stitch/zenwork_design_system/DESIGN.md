---
name: ZenWork Design System
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#38393a'
  surface-container-lowest: '#0c0f0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#282a2b'
  surface-container-highest: '#333535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c4c5d6'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#8e909f'
  outline-variant: '#434654'
  surface-tint: '#b6c4ff'
  primary: '#b6c4ff'
  on-primary: '#00277f'
  primary-container: '#2d56cf'
  on-primary-container: '#d3daff'
  inverse-primary: '#2a54cd'
  secondary: '#c7c6ca'
  on-secondary: '#2f3034'
  secondary-container: '#48494c'
  on-secondary-container: '#b8b8bc'
  tertiary: '#c8c6c8'
  on-tertiary: '#303032'
  tertiary-container: '#616062'
  on-tertiary-container: '#dedbdd'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#001550'
  on-primary-fixed-variant: '#003ab2'
  secondary-fixed: '#e3e2e6'
  secondary-fixed-dim: '#c7c6ca'
  on-secondary-fixed: '#1a1b1f'
  on-secondary-fixed-variant: '#46474a'
  tertiary-fixed: '#e4e2e4'
  tertiary-fixed-dim: '#c8c6c8'
  on-tertiary-fixed: '#1b1b1d'
  on-tertiary-fixed-variant: '#474649'
  background: '#121414'
  on-background: '#e2e2e2'
  surface-variant: '#333535'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.06em
  code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
spacing:
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 3rem
  sidebar-width: 16rem
  topbar-height: 3.25rem
  gutter: 1px
---

## Brand & Style

This design system embodies high-performance architectural minimalism for technical operators, engineers, and product architects. It unites the visual canvas of card-based workflow boards, granular issue tracking, and rich documentation under a monolithic, distraction-free environment. 

The aesthetic is precision-engineered brutalist minimalism: strictly dark mode, zero border radius on all interactive primitives, high-density data presentation, and absolute spatial discipline. The user interface does not seek to entertain with playful ornaments, skeuomorphic volume, or organic curves. Instead, it behaves like an instrument panel or an integrated development environment: razor-sharp geometry, hair-thin structural lines, absolute functional legibility, and targeted chromatic signals using pure accent blue against tiered black granite surfaces.

## Colors

The color palette is built strictly for dark-first high contrast without visual fatigue. Surfaces are layered using micro-variations of deep carbon and obsidian rather than drop shadows.

### Surface Tiers
- **Canvas Base (`#121214`)**: Root application background, sidebar gutters, and outermost app shell.
- **Surface Level 1 (`#1A1A1C`)**: Standard workspace canvas, board columns, document writing surface, and modal backdrops.
- **Surface Level 2 (`#222226`)**: Elevated interactive items, issue rows, kanban cards, menu containers, and toolbars.
- **Surface Hover / Active (`#2C2C32`)**: State-change indicators for clickable rows and neutral button hovers.

### Accents & Typography
- **Primary Accent (`#2D56CF`)**: Focused actions, selected navigation items, primary CTA backgrounds, and active tab borders.
- **Primary Accent Hover (`#3B66E8`)**: Hover state for active primary interactions.
- **Primary Accent Subtle (`rgba(45, 86, 207, 0.15)`)**: Background highlight for selected issues, active board states, and token highlights.
- **Text High-Contrast / Foreground (`#EBEBEB`)**: Primary headers, values, active card titles, and high-priority labels.
- **Text Muted / Structural Borders (`#7E7E82`)**: Secondary metadata, breadcrumbs, descriptions, placeholders, and standard 1px structural container rules.
- **Divider Hairline (`rgba(126, 126, 130, 0.2)`)**: Ultra-thin grid lines between dense data rows and split panes.

## Typography

The typographic hierarchy is driven by two high-precision sans/mono typefaces: `Geist` for clear, unembellished readability across headlines and running prose, and `JetBrains Mono` for technical tags, shortcut hints, issue identifiers (e.g., `ZEN-104`), metadata badges, and numeric data displays.

All headings employ tight negative tracking to ground content blocks firmly into layout grids. Running body copy emphasizes comfortable vertical rhythm for Notion-like documentation editing. Monospaced elements use uppercase styling with open tracking for effortless parsing across dense Jira-like issue matrices.

## Layout & Spacing

The layout is built on a strict multi-pane split layout with a baseline 4px / 8px incremental rhythm:
- **Application Shell**: A rigid two-tier navigation. The left navigational sidebar is locked at 256px (`16rem`), fixed to the base surface (`#121214`). The global utility bar spans the top with a fixed height of 52px (`3.25rem`).
- **Dividers as Structural Gutters**: Major panel divisions do not rely on empty space or drop shadows; they are separated by 1px solid rules of `#7E7E82` with an alpha transparency of 20% to 30%.
- **Work Area Grids**:
  - **Kanban Board**: Horizontal flex container displaying discrete, equal-width columns (min-width 280px, max-width 360px). Columns rest on `#1A1A1C` with interior gap spacing of `0.5rem`.
  - **Issue Matrix**: Full-width linear table with 36px row heights and 1px bottom hairpins for high information density.
  - **Document Workspace**: Centered fluid reading container locked to max-width `768px` with `3rem` side margins.
- **Breakpoints**:
  - `Desktop (>= 1280px)`: Full 3-pane layout (Sidebar + List/Board + Inspector).
  - `Tablet (768px - 1279px)`: Collapsible sidebar (collapses to 48px icon rail), full width main canvas.
  - `Mobile (< 768px)`: Sidebar converts to off-canvas slide-out sheet, boards stack or swipe horizontally with snap points.

## Elevation & Depth

This design system avoids blurred drop shadows and lighting illusions. Depth is conveyed entirely through **structural borders and planar surface layering**:

1. **Layer 0 (Canvas Base - `#121214`)**: Root level background. Never elevated.
2. **Layer 1 (Recessed/Containers - `#1A1A1C`)**: Board columns, search inputs, code blocks, sidebar inactive states. Framed by a 1px solid `#7E7E82` border at 25% opacity.
3. **Layer 2 (Elevated Primitives - `#222226`)**: Kanban task cards, issue list rows, floating toolbars. Bordered with a crisp 1px solid `#7E7E82` outline (50% opacity). Hovering transitions the background to `#2C2C32` and sharpens the border to 80% opacity.
4. **Layer 3 (Overlays & Dialogs - `#1A1A1C`)**: Command palettes (Cmd+K), dropdown menus, and issue detail drawers. Framed by a crisp 1px solid border in `#7E7E82` or accent blue `#2D56CF`, accompanied by a dark scrim (`rgba(0, 0, 0, 0.75)`).

## Shapes

The geometric signature is uncompromisingly **sharp (`border-radius: 0px` everywhere)**.

- Every button, card, modal, chip, badge, input field, and dropdown item must use strictly 90-degree square corners.
- Avatar placeholders, profile icons, and status dots are rendered as square boxes or sharp diamond marks, never rounded circles.
- Inner elements nest cleanly within parent containers with matching 0px corners, producing unified monolithic planes aligned to pixel boundaries.

## Components

### Buttons
- **Shape**: `border-radius: 0px`.
- **Primary**: Background `#2D56CF`, text `#EBEBEB`, border `1px solid #2D56CF`. Hover: `#3B66E8`. Active: `#2143A8`.
- **Secondary / Neutral**: Background `#1A1A1C`, text `#EBEBEB`, border `1px solid #7E7E82`. Hover: `#222226` with full brightness white border.
- **Ghost / Tertiary**: Background transparent, text `#7E7E82`. Hover: text `#EBEBEB`, background `#222226`.
- **Sizes**:
  - `sm`: Height 28px, padding 0 8px, font `Geist` 12px.
  - `md`: Height 36px, padding 0 14px, font `Geist` 14px.

### Inputs & Search Bars
- **Style**: Square (`0px`), height 36px, background `#121214`, border `1px solid rgba(126, 126, 130, 0.4)`. Text `#EBEBEB`, placeholder `#7E7E82`.
- **Focus**: Border `1px solid #2D56CF`, zero glow or blur.
- **Inline Badges**: Quick search prompts (`⌘K`) rendered in square `JetBrains Mono` tags (`#222226` background, `#7E7E82` border).

### Cards (Kanban / Dashboard)
- **Container**: Background `#1A1A1C` or `#222226`, border `1px solid rgba(126, 126, 130, 0.25)`, padding `12px 14px`.
- **State**: Dragging or focused states swap border to `1px solid #2D56CF`.
- **Interior**: Issue identifiers (e.g. `ZEN-42`) in `label-sm` font in muted `#7E7E82`. Title in `body-md` `#EBEBEB`.

### Status Chips & Priority Badges
- **Shape**: Square tags (`rounded-none`), height 20px, font `JetBrains Mono` 11px uppercase.
- **Variants**:
  - In Progress: Background `rgba(45, 86, 207, 0.15)`, text `#3B66E8`, border `1px solid #2D56CF`.
  - Done: Background `rgba(34, 197, 94, 0.1)`, text `#22C55E`, border `1px solid rgba(34, 197, 94, 0.4)`.
  - Blocked / High: Background `rgba(239, 68, 68, 0.1)`, text `#EF4444`, border `1px solid rgba(239, 68, 68, 0.4)`.
  - Neutral / Todo: Background `#1A1A1C`, text `#7E7E82`, border `1px solid rgba(126, 126, 130, 0.3)`.

### Lists & Tables (Issue Tracker)
- **Row**: Height 38px, background transparent, border-bottom `1px solid rgba(126, 126, 130, 0.15)`.
- **Hover**: Background `#222226`.
- **Selected**: Background `rgba(45, 86, 207, 0.12)`, border-left `2px solid #2D56CF`.

### Checkboxes & Radio Controls
- **Style**: Pure square box (`14px x 14px`), border `1px solid #7E7E82`, background `#121214`.
- **Checked**: Background `#2D56CF`, border `#2D56CF`, marked with a crisp white square dot or sharp vector glyph. Radio buttons remain square with an inset square pip.
# Best Brain Academy Design Guide

## Purpose and Sources

Build a clear, trustworthy school finance and administration interface for staff who work with records throughout the day. Financial accuracy, accessibility, and efficient scanning come before decoration.

Read these sources before implementation:

- [Project.md](../Project.md): engineering architecture, security, performance, testing, and document responsibilities.
- [Plan.md](../Plan.md): current phase, task dependencies, design verification gates, and session handover.
- [design_system.md](design_system.md): the detailed design specification, preserved from the original `design.md`; it defines the palette, components, financial presentation, and page patterns.
- [design_inspiration.jpg](design_inspiration.jpg): the primary visual reference for dashboard composition, proportions, spacing, and information density.
- [PROJECT_GUIDE_BEST_BRAIN_ACADEMY.md](PROJECT_GUIDE_BEST_BRAIN_ACADEMY.md): product scope, business rules, navigation, and permissions.

This guide translates those sources into an implementation workflow and resolves the choices below. Use it together with the detailed specification. User instructions take precedence; business rules govern behavior, and this guide plus `design_system.md` govern appearance. Older blue-brand guidance in the project guide is superseded by the school's red identity. Generic skill defaults must not override these project requirements.

## Required Design Skills

For **every design change**, including small spacing, color, component, and responsive changes:

1. Read and apply the available `gpt-taste` skill before editing. Reuse its already-read instructions within the same task rather than repeatedly loading them.
2. Inspect the inspiration image and affected existing screens. Read the relevant sections of `design_system.md`; read both design documents completely before application-wide changes.
3. Use every other skill needed for the actual task. Use the browser skill for visual and interaction verification, `react-doctor` after React changes, and the appropriate PDF/document skill for generated official documents.
4. State a short design plan: affected screens, reference details to preserve, reusable components, tokens, responsive behavior, and verification steps. Identify applicable GPT Taste rules and any project-specific overrides.
5. If a required skill cannot be accessed, report that limitation before proceeding with the affected work. Never claim a skill or check was used when it was not.

### Applying GPT Taste to this product

Use its discipline around intentional hierarchy, consistent spacing, readable button labels, balanced grids, useful copy, and avoiding repetitive template output. Review the finished screen critically rather than treating component assembly as design completion.

This is an administrative application. The following project rules explicitly override conflicting GPT Taste defaults:

- Preserve the reference layout; do not randomize navigation, font families, or component placement.
- Do not impose AIDA, marketing heroes, testimonial carousels, marquees, or oversized calls to action on operational pages.
- Do not add mandatory GSAP, scroll pinning, animated counters, parallax, or cinematic section spacing. Use short transitions only for feedback and state changes.
- Keep Inter as the specified UI font. Geist is acceptable if already established; do not mix font families or replace branding to satisfy a generic font ban.
- Use Lucide icons and shadcn/ui primitives from the approved stack. Do not import a competing design system because a skill suggests one.
- Do not use random stock imagery, mesh gradients, glass effects, or decorative assets in accounting screens.
- Preserve logical DOM, reading, and keyboard order. Do not use dense grid reordering if it disconnects visual order from navigation order.
- Do not fabricate randomization output, measurements, screenshots, or verification results.

The `design-taste-frontend` skill explicitly excludes dashboards and data tables. Use it only for suitable future marketing surfaces; do not impose its landing-page rules on the school application.

## Visual Direction: No AI Slop

The design must be specific to Best Brain Academy, not a generic SaaS template with a changed logo.

Reject these patterns during review:

- Blue/cyan/purple primary branding, rainbow KPI cards, or a red-filled dashboard.
- Unmodified component-library styling, inconsistent radii, arbitrary hex colors, heavy shadows, and excessive rounded cards.
- Giant welcome banners, decorative taglines, unnecessary badges, floating pills, and filler sections above useful financial information.
- Repeated card grids where a searchable table or simple section is more useful.
- Decorative photographs, emoji navigation, invented statistics, unsupported growth claims, or production-looking fake student records.
- Oversized headings, excessive whitespace, weak contrast, clipped currency, and controls that only work on hover.
- Gratuitous animation or motion that delays access to records or temporarily misrepresents financial amounts.

Cards, badges, and repeated rows are appropriate when they serve a real task. A consistent four-card KPI block is required by the reference; do not remove it merely to avoid a generic pattern.

## Reference Layout

Use `design_inspiration.jpg` for structure, not for its SchoolHub name, cyan identity, dollar amounts, sample people, or out-of-scope modules.

| Area | Implementation direction |
| --- | --- |
| Application shell | White surfaces on a light neutral canvas; compact fixed/collapsible sidebar. |
| Sidebar | 220–236px expanded, 72px collapsed; soft red selection and clear nested navigation. |
| Top utility bar | 64–72px; rounded search on the left, current user and role on the right. |
| Analytics row | Fees Collection chart occupies roughly 65–70%; four KPIs form a 2 × 2 block beside it. |
| KPI content | Expected Fees, Fees Collected, Outstanding Fees, Total Expenses. |
| Operational section | Full-width Recent Fee Collections table below; search, date, class, and status filters. |
| Main spacing | 24–28px desktop content padding; 20–24px gaps; consistent alignment. |

Use the actual school navigation from the project guide. Admissions and Financials have expandable child routes. Do not copy Attendance, Library, Messages, or other reference features into Phase 0. Hide unavailable utilities or clearly label placeholders; do not imply that unsupported actions work.

## Design Tokens

Define tokens centrally in the application theme; components consume semantic names instead of scattered values. The full palette and status mapping live in `design_system.md`.

| Token | Value | Purpose |
| --- | --- | --- |
| `brand-primary` | `#BD3B36` | Primary actions, active navigation, main chart series. |
| `brand-primary-hover` | `#9F302C` | Hover state. |
| `brand-primary-active` | `#812522` | Pressed state and strong brand accents. |
| `brand-primary-soft` | `#F7E8E7` | Selected navigation and restrained highlights. |
| `brand-primary-subtle` | `#FCF5F4` | Subtle branded surfaces. |
| `surface-canvas` | `#F3F4F8` | Outer application canvas. |
| `surface-page` | `#F7F8FA` | Page background where separate from the canvas. |
| `surface-card` | `#FFFFFF` | Cards, table rows, and shell surfaces. |
| `text-primary` | `#1F2328` | Headings, body text, financial values. |
| `text-secondary` | `#667085` | Supporting text. |
| `border-default` | `#E4E7EC` | Subtle structure. |
| `success` | `#16835D` | Paid/success states. |
| `warning` | `#B7791F` | Partial payment and warning states. |
| `danger` | `#B42318` | Errors, overdue and destructive states. |
| `info` | `#2563EB` | Information and credit balances, never primary branding. |

Use the detailed specification's badge foreground/background pairs; a semantic base color is not automatically an accessible text color on every surface. Keep school red distinct from destructive red. Validate contrast for actual combinations, including focus and disabled states.

Use Inter with system fallbacks; apply tabular numerals to money. Start with 24px page headings, 20px section headings, 16px card headings, and 14px body text. Use 12–13px only for supporting metadata. Use a 4px spacing scale.

Resolve the detailed specification's radius ranges consistently: 8px controls, 12px ordinary cards, 16px dashboard panels and dialogs, and pill radii for compact badges/search. Do not choose a different value for every screen. Use subtle shadows, not heavy elevation.

## Components and Financial Presentation

- Reuse `AppShell`, `Sidebar`, `TopBar`, `PageHeader`, `StatCard`, `StatusBadge`, `Money`, `DataTable`, and loading/empty/error components. Adapt accessible shadcn/ui primitives rather than duplicating them.
- Keep table rows around 52–60px and right-align monetary columns. Use real column headers, useful sorting/filtering, and pagination when needed.
- Display currency as `GHS 1,250.00`; preserve signs and decimals. Do not truncate amounts or animate balances through inaccurate intermediate values.
- Preserve recorded-by, timestamp, transaction reference, and reversal context. Never hide essential financial data exclusively in tooltips.
- Use explicit actions such as `Record Payment`, `Generate Invoice`, and `Save Changes`. Separate destructive actions and explain consequences in confirmations.
- Give inputs visible labels, helpful validation, and clear pending states. Provide loading, empty, no-results, error, and permission-denied states.
- Mark demo data visibly and keep it in separate synthetic fixtures. Do not present demo figures as live totals or place fake school records in production.
- Keep invoices and receipts printable, legible in grayscale, and branded with the school identity. Refer to the detailed specification for document anatomy.

## Responsive Behavior and Motion

Desktop retains the chart beside the KPI block with the table beneath. On tablet, collapse the sidebar when needed, place the chart above the two-column KPIs, and allow contained table scrolling. On mobile, use a navigation drawer, stack the chart and KPIs as space requires, and use table scrolling or record cards without dropping essential fields.

Test content fit rather than relying on one device width. Prevent accidental page overflow, but do not hide inaccessible table columns with global clipping. Preserve filter labels, keyboard order, and financial actions across sizes.

Use 120–160ms hover/focus transitions and 160–200ms drawer/dialog transitions where useful. Respect `prefers-reduced-motion`; no interaction should require animation to be understood. Maintain visible focus, accessible names, and approximately 40px or larger touch targets. Status must have text or an icon as well as color.

## Design Change Acceptance Checklist

- [ ] GPT Taste and other relevant skills were read and applied; project overrides are identified.
- [ ] The changed screen was compared with `design_inspiration.jpg` and existing components.
- [ ] School red, approved tokens, typography, spacing, and component hierarchy are consistent.
- [ ] Financial context and useful actions take priority over branding and decoration.
- [ ] The no-slop patterns above have been checked and corrected.
- [ ] Labels, button contrast, keyboard use, focus, and status communication were verified.
- [ ] Desktop, tablet, and mobile screenshots were inspected; no essential content is clipped.
- [ ] Loading, empty, error, denied, and demo states were checked where applicable.
- [ ] UI interactions work or are explicitly presented as unavailable placeholders.
- [ ] Relevant lint, typecheck, build, and React checks were run when tooling exists.
- [ ] The delivery report names the changed files, skills used, checks actually run, and remaining limitations.

For documentation-only changes, verify source links and consistency; do not claim browser tests or runtime checks. Until scaffolding provides runnable tooling, report those checks as unavailable. A checklist is not evidence unless the corresponding verification was performed.

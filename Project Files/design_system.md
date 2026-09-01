# Best Brain Academy — Design System

**Document:** `design_system.md`  
**Product:** Best Brain Academy School Management System  
**Design direction:** School-branded, accounting-focused, clear, trustworthy, simple  
**Source:** Visual system extracted from the Best Brain Academy crest/logo supplied for the project.

**Implementation guide:** Read [design.md](design.md) alongside this detailed specification. It defines the required GPT Taste workflow, project-specific skill overrides, no-slop review, and consistent choices within the ranges below. This file preserves the original design specification; [design_inspiration.jpg](design_inspiration.jpg) remains the primary visual reference.

**Visual reference:** The supplied SchoolHub dashboard screenshot is the primary layout and interaction reference for the web dashboard. Reproduce its clean application shell, spacing, sidebar proportions, top utility bar, chart/card composition, filters and table density, while replacing the reference product's cyan branding with the Best Brain Academy design tokens defined here.

> **Brand ownership note:** The school-facing application should use the **Best Brain Academy red/black identity** derived from the school logo. David Nartey's blue is appropriate for developer/vendor documents such as quotations and invoices, but should not replace the school's primary color inside the school management system.

---

## 1. Brand Interpretation

The logo communicates four strong visual characteristics:

1. **Red shield / frame** — authority, structure, energy and institutional identity.
2. **Black typography and eagle** — seriousness, confidence and clarity.
3. **Open book** — learning, records and education.
4. **White/light background** — simplicity and contrast.

The digital product should translate those characteristics into a modern administrative interface without copying the hand-painted appearance of the physical logo.

### Product personality

The interface should feel:

- Professional
- Dependable
- Educational
- Financially trustworthy
- Familiar to non-technical school staff
- Clean rather than decorative
- Structured rather than playful

Avoid making the dashboard look like a children's learning application. This is primarily an **administrative and financial system**.

---

# 2. Core Brand Palette

The source image is low-resolution and photographed, so the extracted values are approximate digital equivalents rather than official print specifications.

## Primary colors

| Token | Hex | Usage |
|---|---|---|
| `brand-red-600` | `#BD3B36` | Primary brand color extracted from the crest |
| `brand-red-700` | `#9F302C` | Hover states, stronger emphasis |
| `brand-red-800` | `#812522` | Dark brand accents |
| `brand-red-500` | `#CB514C` | Secondary accent |
| `brand-red-100` | `#F7E8E7` | Selected rows, badges, subtle highlights |
| `brand-red-50` | `#FCF5F4` | Very light branded surfaces |
| `ink-900` | `#1F2328` | Main text, headings |
| `white` | `#FFFFFF` | Cards and primary surfaces |

### Primary CSS tokens

```css
:root {
  --brand-primary: #BD3B36;
  --brand-primary-hover: #9F302C;
  --brand-primary-active: #812522;
  --brand-primary-soft: #F7E8E7;
  --brand-primary-subtle: #FCF5F4;

  --text-primary: #1F2328;
  --text-secondary: #667085;
  --text-muted: #98A2B3;
  --text-inverse: #FFFFFF;

  --surface-page: #F7F8FA;
  --surface-card: #FFFFFF;
  --surface-subtle: #F2F4F7;
  --border-default: #E4E7EC;
  --border-strong: #D0D5DD;
}
```

---

# 3. Supporting / Semantic Colors

The logo itself is mainly red, black and white. Additional colors are necessary for a usable accounting system. They should remain subordinate to the school brand.

| Purpose | Hex | Suggested token |
|---|---|---|
| Success / Paid | `#16835D` | `success-600` |
| Success soft | `#E8F5EF` | `success-50` |
| Warning / Partially paid | `#B7791F` | `warning-600` |
| Warning soft | `#FFF6E0` | `warning-50` |
| Information | `#2563EB` | `info-600` |
| Information soft | `#EFF6FF` | `info-50` |
| Destructive / Error | `#B42318` | `danger-600` |
| Destructive soft | `#FEECEB` | `danger-50` |
| Neutral / Draft | `#667085` | `neutral-600` |

### Financial status mapping

Use colors consistently:

```text
Paid              → Green
Partially Paid    → Amber
Unpaid            → Neutral/Amber depending on urgency
Overdue           → Red
Cancelled/Void    → Gray
Credit Balance    → Blue
Active Student    → Green
Inactive Student  → Gray
```

**Important:** Because red is also the brand color, do not use bright red for every normal financial highlight. Reserve semantic danger red for genuine errors, overdue states, reversals and destructive actions.

---

# 4. Color Usage Ratio

A recommended interface balance:

```text
70%  White / light neutral
20%  Dark text / gray structure
10%  Best Brain Academy red
```

The red should provide identity and hierarchy, not fill the entire interface.

Good uses of brand red:

- Logo
- Primary buttons
- Active navigation marker
- Key links
- Small header accents
- Focus indicators
- Important non-destructive highlights

Avoid:

- Large red page backgrounds
- Red-filled tables
- Red cards everywhere
- Red body text
- Using red simultaneously for branding, success and warnings

---

# 5. Typography

The physical logo uses bold, condensed, uppercase lettering. The application should preserve the **confidence** of that lettering without copying the handmade font.

## Recommended UI font

### Primary
`Inter`

Fallback:

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

If the project already uses `Geist`, it is also acceptable. Do not mix Inter and Geist in the same interface.

## Type scale

| Style | Size | Weight | Line Height | Usage |
|---|---:|---:|---:|---|
| Display | 30px | 700 | 38px | Rare dashboard hero value |
| H1 | 24px | 700 | 32px | Page title |
| H2 | 20px | 650–700 | 28px | Section heading |
| H3 | 16px | 600 | 24px | Card / subsection title |
| Body | 14px | 400 | 20px | Normal UI text |
| Body Strong | 14px | 600 | 20px | Important values |
| Small | 13px | 400 | 18px | Secondary information |
| Caption | 12px | 500 | 16px | Table metadata, labels |
| Micro | 11px | 600 | 14px | Badges where necessary |

## Typography rules

- Use sentence case for most interface labels.
- Use uppercase only for compact labels such as `PAID`, `VOID`, or document identifiers.
- Never use decorative fonts for financial information.
- Monetary values should use tabular numerals where supported:

```css
font-variant-numeric: tabular-nums;
```

---

# 6. Logo Usage

Use the crest primarily in:

- Login screen
- Sidebar/header brand area
- Printable invoices
- Receipts
- Reports
- School settings preview

## Digital logo rules

- Preserve the crest's aspect ratio.
- Do not stretch or skew.
- Do not recolor the eagle/book independently.
- Do not place the logo directly on visually noisy backgrounds.
- Give the logo breathing room equal to at least **20% of its width**.
- On the main dashboard, use a compact version rather than an oversized crest.

### Sidebar brand block

Recommended:

```text
[ Crest ]  Best Brain Academy
           School Management
```

Do not rely on the acronym `B.B.A` alone in navigation because the complete school name is clearer.

---

# 7. Layout System

## Dashboard reference direction

The supplied dashboard reference is the **layout target** for the application. The goal is not to copy the SchoolHub brand, text, students or colors. The goal is to reproduce its visual structure:

- Large white application shell
- Very light neutral page/background
- Narrow fixed left sidebar
- Slim top utility/search bar
- Spacious but data-dense main canvas
- Large analytics/chart panel on the left
- Four compact summary cards in a `2 × 2` block on the right
- A full-width records table beneath the analytics row
- Soft section backgrounds rather than heavy borders
- Rounded cards
- Very subtle shadows
- Thin line icons
- Muted gray secondary text

### Desktop application shell

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ ┌───────────────┬─────────────────────────────────────────────────────────┐ │
│ │               │ Search                           Alerts      User       │ │
│ │  BBA Brand    ├─────────────────────────────────────────────────────────┤ │
│ │               │                                                         │ │
│ │  Sidebar      │ ┌──────────────────────────────┐ ┌───────┐ ┌───────┐  │ │
│ │               │ │                              │ │ KPI 1 │ │ KPI 2 │  │ │
│ │               │ │ Financial Trend / Chart      │ ├───────┤ ├───────┤  │ │
│ │               │ │                              │ │ KPI 3 │ │ KPI 4 │  │ │
│ │               │ └──────────────────────────────┘ └───────┘ └───────┘  │ │
│ │               │                                                         │ │
│ │               │ ┌─────────────────────────────────────────────────────┐ │ │
│ │               │ │ Section title        Search  Date  Class  Status   │ │ │
│ │               │ ├─────────────────────────────────────────────────────┤ │ │
│ │               │ │ Data table / operational records                  │ │ │
│ │               │ └─────────────────────────────────────────────────────┘ │ │
│ └───────────────┴─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Recommended measurements

- Sidebar expanded: `220–236px`
- Sidebar collapsed: `72px`
- Top utility bar: `64–72px`
- Main app surface: white
- Main content gap: `20–24px`
- Main content padding: `24–28px`
- Card radius: `14–18px`
- Main section/card radius: `14–18px`
- Search field width on desktop: `240–300px`
- Analytics row:
  - Chart area: approximately `65–70%`
  - KPI area: approximately `30–35%`
- KPI grid: `2 columns × 2 rows`
- Large desktop table should use almost the full main content width.

### Outer background

Use a very light cool neutral around the app shell:

```css
--surface-canvas: #F3F4F8;
```

For a full-browser deployment the shell may extend edge-to-edge, but the interior visual treatment should retain the same clean white surfaces and soft spacing as the reference.

## Responsive behavior

### Large desktop
- Sidebar visible
- Analytics chart + `2 × 2` KPI cards on one row
- Full-width table below

### Laptop
- Sidebar visible or compact
- Chart remains larger than KPI area
- KPI cards remain `2 × 2`

### Tablet
- Sidebar becomes collapsible
- Chart becomes full-width
- KPI cards sit beneath it in two columns
- Table may horizontally scroll

### Mobile
- Sidebar becomes a drawer
- Search moves into top bar or page filter area
- Chart becomes full-width
- KPI cards become one or two columns depending on width
- Tables may transform into stacked record cards where necessary

---


# 8. Spacing Scale

Use a consistent 4px base scale.

```text
1  = 4px
2  = 8px
3  = 12px
4  = 16px
5  = 20px
6  = 24px
8  = 32px
10 = 40px
12 = 48px
16 = 64px
```

Common application:

- Icon → label: `8px`
- Label → input: `6–8px`
- Form fields: `16–20px` vertical separation
- Card padding: `20–24px`
- Page sections: `28–32px`
- Page title → content: `20–24px`

---

# 9. Border Radius

The logo itself is geometric and formal, so avoid extremely rounded consumer-app styling.

Recommended:

```css
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-pill: 999px;
```

Usage:

- Inputs: `8px`
- Buttons: `8px`
- Cards: `12px`
- Dialogs: `12–16px`
- Badges: pill radius

Avoid huge 24–32px rounded cards across the accounting interface.

---

# 10. Shadows

Use subtle elevation.

```css
--shadow-xs: 0 1px 2px rgba(16, 24, 40, 0.05);
--shadow-sm: 0 1px 3px rgba(16, 24, 40, 0.08),
             0 1px 2px rgba(16, 24, 40, 0.04);
--shadow-md: 0 4px 12px rgba(16, 24, 40, 0.08);
```

Tables and ordinary cards should generally use borders plus `shadow-xs`, not heavy shadows.

---

# 11. Sidebar

The sidebar must visually follow the supplied dashboard reference: clean white surface, compact line icons, subdued labels, clearly highlighted active navigation and expandable nested modules.

## Default appearance

- Background: `#FFFFFF`
- Width: `220–236px`
- Border-right: either none or `1px solid #EEF0F3`
- Main text: `#667085`
- Section labels: `#98A2B3`
- Icons: `#667085`
- Item height: approximately `40px`
- Icon size: `18–20px`
- Item radius: `7–9px`
- Horizontal padding: `14–16px`
- Gap between icon and label: `10–12px`

## Active navigation

Replace the cyan highlight in the reference with Best Brain Academy branding:

```text
Active background:     #F7E8E7
Active text:           #812522
Active icon:           #BD3B36
Active child marker:   #BD3B36
```

For an expanded parent such as `Financials`, highlight the parent with the soft brand background and show its children beneath it.

### Navigation hierarchy

```text
MENU

Dashboard

Admissions
  New Admission
  Admission Records

Students

Classes

Staff

Financials
  Financial Overview
  Fee Structure
  Invoices
  Payments
  Receipts
  Outstanding Fees
  Expenses
  Salary Deductions

Reports

OTHER

Administrators
Settings
Log out
```

Use subtle category labels similar to the reference (`MENU`, `OTHER`) to separate everyday operations from system administration.

### Nested navigation

- Indent child routes by `18–24px`
- Use a thin vertical guide/brand line for the active subgroup if helpful
- Children should not use full colored pills unless selected
- Keep only the current expandable module open by default on smaller screens

### Brand block

At the top:

```text
[ Crest ]  Best Brain Academy
```

At wider sidebar widths, a second muted line may read:

```text
School Management
```

The crest should be compact. Do not let the logo consume sidebar space needed for navigation.

---


# 12. Top Utility Bar

The top bar should closely follow the supplied dashboard reference.

## Structure

### Left
A rounded global search control:

```text
[ 🔍  Search students, receipts, invoices... ]
```

Recommended:
- Width: `240–300px`
- Height: `40px`
- Background: white
- Border: `#D0D5DD`
- Radius: `999px` or `18–22px`
- Search icon: muted gray

### Right
Use compact utility controls:

- Messages only if implemented
- Notifications only if implemented
- User identity
- User role
- Circular avatar or initials
- Small account-status indicator if useful

Example:

```text
                       [message] [bell]   Osei Emmanuel
                                          Administrator   [OE]
```

Do not make the top bar a second navigation bar. It is for search, context and user utilities.

## Current context

Academic Year and Term may appear:
- next to the page title,
- in a compact selector beneath the top bar,
- or in the right-side utility area if space permits.

Avoid overcrowding the top bar.

---


# 13. Buttons

## Primary button

```text
Background:  #BD3B36
Text:        #FFFFFF
Hover:       #9F302C
Active:      #812522
Focus ring:  rgba(189, 59, 54, .25)
Height:      40px
Radius:      8px
```

Examples:

- New Admission
- Record Payment
- Save Changes
- Generate Invoice

## Secondary button

```text
Background:  #FFFFFF
Border:      #D0D5DD
Text:        #344054
Hover:       #F9FAFB
```

Examples:

- Cancel
- Export
- Print
- Back

## Destructive button

Use only for:

- Void payment
- Cancel invoice
- Disable user
- Archive critical records

Never style routine actions as destructive.

## Button text

Prefer:

- `Record Payment`
- `Add Student`
- `Generate Invoice`

Avoid vague labels such as:

- `Submit`
- `Proceed`
- `Do It`

when a precise verb is available.

---

# 14. Forms

## Input dimensions

- Minimum height: `40px`
- Comfortable form height: `44px`
- Border: `#D0D5DD`
- Focus border: `#BD3B36`
- Focus ring: branded soft red
- Radius: `8px`

## Form structure

Use:

```text
Label
Input
Helper / validation message
```

Example:

```text
Admission number *
[BBA/STU/2026/0001                    ]
Must be unique.
```

## Required fields

Use a small asterisk but do not make the entire label red.

## Validation

Error:

```text
Border: #B42318
Message: #B42318
```

Success should generally not be shown on every valid input.

---

# 15. Data Tables

Tables are central to this product.

## Table design

- Header background: `#F9FAFB`
- Header text: `#475467`, 12–13px, 600
- Row background: white
- Border: `#EAECF0`
- Row hover: `#FCFCFD`
- Selected row: `#FCF5F4`
- Row height: approximately `52–60px`

## Table behavior

Provide:

- Search
- Filters
- Sort where useful
- Pagination
- Row actions
- Empty state
- Loading state
- Mobile fallback

### Financial alignment

Text values:

```text
Student Name        left
Class               left
Date                left
Amount               right
Balance              right
Status              left/center
```

Always right-align money.

---

# 16. Cards

Cards should communicate information rather than decorate the screen.

## Standard card

```text
Background: #FFFFFF
Border: 1px solid #E4E7EC
Radius: 12px
Padding: 20–24px
Shadow: xs
```

## Metric card example

```text
FEES COLLECTED
GHS 84,250.00
↑ 8.4% vs last month
```

Use:

- Small neutral label
- Large dark financial value
- Semantic trend color
- Optional simple icon

Do not make each metric card a different bright color.

---

# 17. Financial UI Rules

Financial screens require stricter visual consistency.

## Currency

Always display:

```text
GHS 1,250.00
```

Do not alternate among:

```text
₵1,250
GH₵ 1,250
1,250 GHS
GHS1250
```

## Negative / reversed values

Example:

```text
-GHS 250.00
```

Display reversals with a `VOID` or `REVERSED` badge and clear transaction history.

## Account balance

Suggested pattern:

```text
Total Invoiced      GHS 4,500.00
Total Paid          GHS 3,000.00
Outstanding         GHS 1,500.00
```

Give the outstanding amount the strongest emphasis only when it is genuinely outstanding.

---

# 18. Status Badges

Badge anatomy:

```text
height: 24px
padding-inline: 8px
font-size: 12px
font-weight: 600
border-radius: 999px
```

Examples:

| Status | Background | Text |
|---|---|---|
| Paid | `#E8F5EF` | `#067647` |
| Partially Paid | `#FFF6E0` | `#9A6700` |
| Unpaid | `#F2F4F7` | `#475467` |
| Overdue | `#FEECEB` | `#B42318` |
| Draft | `#F2F4F7` | `#475467` |
| Cancelled | `#F2F4F7` | `#667085` |
| Active | `#E8F5EF` | `#067647` |
| Inactive | `#F2F4F7` | `#667085` |

---

# 19. Dashboard Visual Language

The dashboard must follow the supplied reference layout more closely than a generic SaaS dashboard.

The main visual composition is:

```text
TOP UTILITY BAR
Search                                              Alerts / User

ANALYTICS ROW
┌───────────────────────────────────────┬────────────┬────────────┐
│                                       │ KPI Card 1 │ KPI Card 2 │
│ Fees Collection / Financial Trend     ├────────────┼────────────┤
│ Large chart                           │ KPI Card 3 │ KPI Card 4 │
│                                       │            │            │
└───────────────────────────────────────┴────────────┴────────────┘

OPERATIONAL SECTION
Section title                 Search | Date | Class | Status
┌────────────────────────────────────────────────────────────┐
│ Table                                                      │
└────────────────────────────────────────────────────────────┘
```

## 19.1 Primary analytics card

The large left card should contain the main financial trend.

Default chart:
**Fees Collection**

Recommended contents:

- Title: `Fees Collection`
- Optional overflow menu
- Monthly line/area chart
- X-axis: Jan–Dec or selected term/date period
- Y-axis: GHS values
- Hover tooltip containing:
  - Amount
  - Exact date/month
  - Optional comparison

The visual style should imitate the reference:

- White card
- Almost invisible border
- `14–18px` radius
- Subtle shadow
- Thin smooth line
- Very soft area fill under the line
- Light grid lines
- Minimal chart chrome

Use the school's brand red rather than the reference yellow/cyan:

```text
Line:             #BD3B36
Area fill:        rgba(189, 59, 54, 0.10)
Point highlight:  #BD3B36
Grid:             #EAECF0
Tooltip:          #FFFFFF
```

## 19.2 KPI card block

Place four compact KPI cards to the **right of the main chart**, in a `2 × 2` grid on desktop.

Recommended initial cards:

```text
Total Expected Fees
GHS xx,xxx.xx

Fees Collected
GHS xx,xxx.xx

Outstanding Fees
GHS xx,xxx.xx

Total Expenses
GHS xx,xxx.xx
```

Each card may contain:

- Small decorative line/sparkline
- Percentage comparison chip where meaningful
- Large monetary value
- Short muted label

### KPI surface treatment

To visually echo the pastel cards in the reference while respecting the school identity:

Primary branded card:
```text
Background: #F7E8E7 or #FCF5F4
Value:      #1F2328
Accent:     #BD3B36
```

Neutral card:
```text
Background: #F5F7FA
Value:      #1F2328
Accent:     #667085
```

Semantic cards may use very soft semantic backgrounds, but do not turn the grid into a rainbow.

## 19.3 Operational table below

Below the analytics row, show a wide working table similar to the reference.

For the Dashboard, the default table can be:

**Recent Fee Collections**

Top-left:
```text
Fees Collection
```

Top-right filter row:

```text
[ Search by Student / ID ] [ Date ] [ All Classes ] [ All Status ]
```

Suggested columns:

```text
Student
Class
Invoice
Amount Paid
Outstanding
Payment Method
Status
Date
Action
```

Alternative dashboard tables may be switched by context, but `Recent Fee Collections` should be the default because finance is the system's primary focus.

## 19.4 Dashboard hierarchy

The dashboard should answer in this visual order:

1. What is the school's current financial position?
2. How are collections trending?
3. How much is expected/collected/outstanding/spent?
4. Which student payments require attention?
5. What happened recently?

Avoid placing student/staff counts above the main financial information. They may appear as secondary dashboard statistics or elsewhere.

---


# 20. Charts

Charts should visually match the light, elegant treatment in the supplied reference.

## Default style

- No heavy border around plot area
- Thin grid lines
- Muted axis labels
- Smooth strokes
- Soft area fills
- Minimal legends
- Tooltip displayed on hover
- No 3D charts
- No thick bars
- No rainbow palettes

Recommended:

- Line/area chart: fee collections over time
- Bar chart: expected vs collected by class
- Donut chart: payment status only when proportion comparison adds value
- Bar/line chart: revenue vs expenses

### Chart colors

```text
Primary financial series  #BD3B36
Primary area fill          rgba(189, 59, 54, .10)
Secondary series           #344054
Positive series            #16835D
Warning series             #B7791F
Information series         #2563EB
Grid                       #EAECF0
Axis text                  #98A2B3
Tooltip text               #1F2328
```

### Chart card header

Use:

```text
Fees Collection                                      ⋯
```

Keep card titles at `16–18px`, semibold/bold. Do not add unnecessary subtitles unless the selected time period needs explanation.

---


# 21. Admissions UI

The admission form may be long, so organize it into logical sections:

```text
Student Information
Guardian Information
Admission Details
Optional Information
```

Use a single page with clear sections or a short stepper if needed.

Recommended completion flow:

```text
Save Admission
    ↓
Student Created
    ↓
[View Student] [Generate Initial Invoice]
```

Do not force staff to navigate through five screens to admit one student.

---

# 22. Student Profile

Recommended header:

```text
┌──────────────────────────────────────────────────────────┐
│ [Photo] Ama Mensah                         ACTIVE         │
│         BBA/STU/2026/0014 · Basic 4                       │
│         Guardian: Kofi Mensah · 024 XXX XXXX              │
└──────────────────────────────────────────────────────────┘

Profile | Financial Account | Invoices | Payments | Receipts
```

Financial Account should be the most prominent non-profile tab because finance is the project's main purpose.

---

# 23. Invoice Design

Invoices generated by the school should use the **school's red identity**, not the developer's invoice blue.

Recommended hierarchy:

```text
[School Crest] BEST BRAIN ACADEMY
               Contact / Address

                            INVOICE
                            INV-00001

Student
Class
Academic Year
Term

---------------------------------------------
Fee Item                            Amount
---------------------------------------------
Tuition                        GHS 1,000.00
Feeding                          GHS 450.00
Bus                              GHS 300.00
---------------------------------------------
TOTAL                          GHS 1,750.00
---------------------------------------------

Previous Balance
Amount Paid
Outstanding Balance
```

Use brand red for headings/dividers only.

The printed document must remain readable in grayscale.

---

# 24. Receipt Design

Receipts should be compact and transaction-focused.

Required visual hierarchy:

1. School identity
2. `OFFICIAL RECEIPT`
3. Receipt number
4. Student and class
5. Amount paid
6. Payment method/date
7. Previous and remaining balance
8. Received by

Highlight **Amount Paid** prominently.

Example:

```text
AMOUNT PAID
GHS 500.00
```

Do not make the remaining balance appear as though it is the amount received.

---

# 25. Modal / Dialog Rules

Use dialogs for short confirmations and focused tasks.

Good dialog uses:

- Confirm payment
- Void payment
- Cancel invoice
- Archive class
- Disable user

Do not put large admission forms or complex reports inside modal dialogs.

## Financial confirmation example

```text
Record payment?

Student: Ama Mensah
Invoice: BBA/INV/2026/0012
Amount: GHS 500.00
Method: Mobile Money

[Cancel] [Record Payment]
```

---

# 26. Empty States

Use concise, useful empty states.

Example:

```text
No fee structure has been created for this class.

Create the fee structure before generating student invoices.

[Create Fee Structure]
```

Avoid generic illustrations that consume large amounts of space.

---

# 27. Loading States

Use skeletons for:

- Metric cards
- Tables
- Student profile
- Financial overview

Use button loading states for writes:

```text
[ Recording payment… ]
```

Disable duplicate submission while a financial operation is being processed.

---

# 28. Accessibility

Minimum requirements:

- WCAG AA contrast for normal text.
- Do not communicate status by color alone.
- Keyboard-accessible navigation and dialogs.
- Visible focus states.
- Minimum touch target: approximately `40 × 40px`.
- Inputs must have real labels.
- Icons used as buttons require accessible names.
- Tables should have proper column headers.
- Printed invoices/receipts must maintain contrast.

---

# 29. Responsive Behavior

## Desktop

Use full sidebar + data tables.

## Tablet

- Collapsible sidebar
- Cards become 2-column
- Dense tables may horizontally scroll

## Mobile

- Sidebar becomes drawer
- Cards become single column
- Important table rows may transform into stacked records
- Keep primary financial action visible
- Avoid hiding essential fields merely to fit screen width

Example mobile payment record:

```text
Ama Mensah
Basic 4

GHS 500.00                  PAID
Receipt: BBA/REC/2026/0014
30 Aug 2026 · Mobile Money
```

---

# 30. Iconography

Use one consistent outline icon library such as:

- Lucide
- Heroicons

Recommended size:

- Sidebar: 20px
- Buttons: 16–18px
- Cards: 20–24px

Suggested metaphors:

```text
Dashboard          LayoutDashboard
Admissions         UserPlus
Students           GraduationCap / Users
Classes            School
Staff              BriefcaseBusiness / UsersRound
Financials         WalletCards
Invoices           FileText
Payments           HandCoins / CreditCard
Receipts           ReceiptText
Outstanding Fees   CircleAlert
Expenses           ArrowUpFromLine
Salary Deductions  BadgeMinus
Reports            ChartNoAxesCombined
Administrators     ShieldCheck
Settings           Settings
```

Do not use emoji as production navigation icons.

---

# 31. Motion

Use minimal animation.

Recommended:

```text
Hover transitions:        120–160ms
Dropdown/sidebar:         160–200ms
Dialog entrance:          160–200ms
```

Use ease-out for entry and standard easing for hover states.

Never animate financial numbers in a way that makes them temporarily misleading.

---

# 32. Tailwind Token Direction

Example Tailwind-compatible theme:

```ts
colors: {
  brand: {
    50:  "#FCF5F4",
    100: "#F7E8E7",
    500: "#CB514C",
    600: "#BD3B36",
    700: "#9F302C",
    800: "#812522",
  },
  success: {
    50:  "#E8F5EF",
    600: "#16835D",
  },
  warning: {
    50:  "#FFF6E0",
    600: "#B7791F",
  },
  danger: {
    50:  "#FEECEB",
    600: "#B42318",
  },
  info: {
    50:  "#EFF6FF",
    600: "#2563EB",
  },
}
```

Do not scatter hard-coded hex values throughout components. Use theme tokens.

---

# 33. Component Inventory

Build reusable primitives before repeating patterns.

## Foundation

- `AppShell`
- `Sidebar`
- `TopBar`
- `PageHeader`
- `Breadcrumbs`

## Data Display

- `StatCard`
- `DataTable`
- `StatusBadge`
- `Money`
- `EmptyState`
- `DetailList`
- `Timeline`
- `AuditEntry`

## Forms

- `FormField`
- `TextInput`
- `Select`
- `DatePicker`
- `CurrencyInput`
- `PhoneInput`
- `SearchSelect`
- `FileUpload`

## Feedback

- `Alert`
- `Toast`
- `ConfirmDialog`
- `Skeleton`
- `InlineError`

## Finance

- `InvoiceSummary`
- `PaymentSummary`
- `OutstandingBalance`
- `FeeBreakdown`
- `ReceiptPreview`
- `TransactionTable`

Consistency is more important than creating dozens of specialized components.

---

# 34. Page Header Pattern

Every primary page should use roughly the same structure.

Example:

```text
Students                                        [+ Add Student]
Manage student records and financial accounts.

[ Search students... ] [Class ▼] [Status ▼]

------------------------------------------------------------
Table
```

Financial example:

```text
Payments                                      [+ Record Payment]
Record and review school fee collections.

[ Search student/receipt... ] [Term ▼] [Date ▼]

------------------------------------------------------------
Table
```

---

# 35. Information Density

School administrators often work with many records. Optimize for efficient scanning.

Prefer:

- Compact but readable rows
- Visible totals
- Search above tables
- Common filters immediately accessible
- Secondary information in muted text

Avoid:

- Huge empty spaces between table rows
- Full-screen cards for simple information
- Excessive gradients
- Oversized illustrations
- Consumer-fintech styling that sacrifices data density

---

# 36. Financial Trust Signals

The UI should visibly reinforce accountability.

Display where useful:

- `Recorded by`
- `Created at`
- `Payment reference`
- `Receipt number`
- `Invoice number`
- `Last updated`
- Reversal reason
- Audit history

For example:

```text
Recorded by: Emmanuel Osei
30 Aug 2026 · 10:42 AM
```

This matters more than decorative effects.

---

# 37. Design Do / Don't

## Do

- Use red as a controlled brand accent.
- Keep the majority of surfaces white/neutral.
- Make financial values easy to scan.
- Keep buttons action-oriented.
- Use consistent status colors.
- Use the school crest on official documents.
- Design for desktop staff workflows first, while remaining responsive.
- Preserve clear audit context.

## Don't

- Make the whole UI red.
- Use gradients as the primary visual identity.
- Use several different icon styles.
- Use children's illustrations in the accounting dashboard.
- Put destructive actions next to primary actions without separation.
- Use color alone to communicate payment status.
- Mix the developer/vendor blue into the school product's core branding.
- Use heavy glassmorphism.
- Use excessive rounded cards.
- hide important financial data behind hover interactions.

---

# 38. Login Page Direction

Recommended layout:

```text
Desktop
┌──────────────────────┬──────────────────────────────┐
│ Brand panel          │ Login form                   │
│                      │                              │
│ School crest         │ Welcome back                 │
│ Best Brain Academy   │ Email / username             │
│ Service With         │ Password                     │
│ Diligence            │ [Sign in]                    │
└──────────────────────┴──────────────────────────────┘
```

Brand panel:

- Light `brand-red-50` or dark neutral background
- Crest
- School name
- Motto

Login form should remain simple.

---

# 39. Brand Motto

The crest includes:

**SERVICE WITH DILIGENCE**

Use the motto sparingly.

Appropriate locations:

- Login page
- About/settings page
- Printed reports
- Footer of formal documents

Do not repeat it in every card or page header.

---

# 40. Final Visual Direction

The final application should feel like:

> **A modern school finance and administration platform carrying the authority of the Best Brain Academy crest, using the supplied SchoolHub screenshot as the primary dashboard layout reference: clean white application shell, slim sidebar, rounded search bar, large financial chart, four compact KPI cards, wide filtered data table, strong black typography and restrained institutional red accents.**

The visual hierarchy should always prioritize:

1. Current context
2. Financial numbers
3. Required action
4. Record status
5. Supporting information
6. Brand decoration

---

# 41. AI / Coding Agent Design Instructions

Any coding agent implementing this interface must:

1. Read `design.md` before creating or changing application-wide UI.
2. Use the defined color tokens rather than inventing new primary colors.
3. Keep the Best Brain Academy school application red/black/neutral.
4. Reuse established components before creating duplicates.
5. Maintain consistent spacing, typography and radius tokens.
6. Preserve table density and readability.
7. Use semantic colors according to this guide.
8. Ensure mobile responsiveness.
9. Maintain visible focus states and accessible labels.
10. Never trade financial clarity for decorative design.
11. Compare new pages with existing pages before introducing a new pattern.
12. Run visual checks at desktop, tablet and mobile widths.
13. Treat invoices and receipts as official school documents and keep them print-friendly.
14. Keep vendor/developer invoice branding separate from the school application's visual identity.
15. Treat the supplied SchoolHub dashboard screenshot as the primary dashboard composition reference.
16. Match its proportions, whitespace, card hierarchy, search/filter placement and table density without copying its brand assets or cyan identity.
17. When the screenshot and a generic dashboard convention conflict, prefer the screenshot's layout while preserving the Best Brain Academy business requirements and red brand tokens.

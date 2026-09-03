# School Configuration Reference — 2026/2027

**Provided by:** Chief Engineer, 1 September 2026  
**Sources:** Chief Engineer's written requirements, `E:/Downloads/fees_structure.md`, and the supplied handwritten fee schedule image.  
**Authority boundary:** These sources provide school facts and fee requirements. They do not override `Project.md`, `Plan.md`, security rules, or phase sequencing.

## Academic configuration

- Academic year: `2026/2027` (`26/27`)
- Academic-year planning window: 1 September 2026 to 31 August 2027
- Terms: Term 1, Term 2, Term 3
- Confirmed Term 1 start: 8 September 2026
- Preliminary Term 1 end: 7 December 2026, derived from the stated average of three months; administrators may revise it when the official calendar is confirmed.
- Term 2 and Term 3 dates remain unconfirmed and must remain schedulable rather than fabricated.
- Future cycles may contain two or three terms. Term names, sequence, dates, status, and current context must therefore remain configurable.

## Classes

| Group              | Classes                          |
| ------------------ | -------------------------------- |
| Early Years        | Nursery 1, Nursery 2, KG 1, KG 2 |
| Lower Basic        | Basic 1, Basic 2, Basic 3        |
| Upper Basic        | Basic 4, Basic 5, Basic 6        |
| Junior High School | JHS 1, JHS 2, JHS 3              |

## Transport locations

A "location" is not a school campus; it identifies how far a student stays from school and therefore which transport charge applies to that student.

1. Osenase & Akwadum
2. Asuofori
3. Kobriso & Abaase
4. Anomaa Kojo
5. Bamenase

Transport locations are Phase 1 school configuration. Their monetary transport charges are Phase 3 fee configuration.

## Confirmed fee requirements for Phase 3

The markdown file and handwritten schedule agree on the following current values.

### Base class fees

| Class group    | Base fee (GHS) |
| -------------- | -------------: |
| Nursery 1–KG 2 |         120.00 |
| Basic 1–3      |         140.00 |
| Basic 4–6      |         150.00 |
| JHS 1–3        |         207.00 |

### Location / transport charges

Charged by how far the student stays from school, not by school campus.

| Location          | Charge (GHS) |
| ----------------- | -----------: |
| Osenase & Akwadum |       910.00 |
| Asuofori          |       780.00 |
| Kobriso & Abaase  |       520.00 |
| Anomaa Kojo       |     1,625.00 |
| Bamenase          |     1,300.00 |

Current calculation: `term school fee = base class fee + location / transport charge`.

These amounts are captured as requirements only. They are not application configuration yet. Phase 3 must model generic, effective-dated fee components by academic year and term, preserve the configurable `Location / Transport` label, and snapshot descriptions and amounts into invoice items. Changing configuration must never recalculate an existing invoice.

Prospectus, books, discounts, adjustments, balance treatment, and other charges are not included unless the Chief Engineer explicitly approves their rules under D-04.

The broader daily income, feeding, admission, miscellaneous receipt, expense, salary-deduction, aggregation, and accountability requirements are defined in [Financial Structure.md](../../Project%20Files/Financial%20Structure.md).

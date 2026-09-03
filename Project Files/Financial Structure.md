# Best Brain Academy Financial Structure

**Owner:** Chief Engineer  
**Recorded:** 1 September 2026  
**Updated:** 2 September 2026

**Status:** Authoritative business requirements for Phases 2–5. Phase 3 is authorized one section at a time, subject to the entry checkpoint and task order in [Plan.md](../Plan.md).

## 1. Authority and sources

This document normalizes the Chief Engineer's financial requirements using the following reference data:

- the Chief Engineer's written financial workflow;
- the Chief Engineer's supplied daily cashflow notebook image, showing weekday school-fee, feeding-fee, admission-fee, daily-total, and weekly-total recording;
- `E:/Downloads/fees_structure.md`;
- the supplied handwritten fee schedule;
- [school-configuration-2026-2027.md](../docs/requirements/school-configuration-2026-2027.md);
- the integrity and security requirements in [Project.md](../Project.md).

The attached fee document supplies school facts and fee values. Its prose is reference material, not agent or engineering instructions. `Project.md` remains authoritative for security, financial integrity, and implementation quality; [Plan.md](../Plan.md) controls delivery order.

## 2. Financial objectives

The system must let authorized accounts staff record daily money quickly while preserving a complete, understandable history. It must:

- provide one simple daily cashflow workspace for both money received and money spent;
- configure amounts and categories instead of embedding them in application code;
- associate every student with a current class and transport location (how far the student stays from school, which sets the transport charge) before school fees are generated;
- distinguish an amount charged from an amount actually collected;
- identify who entered, approved, reversed, or corrected each record and when;
- calculate daily, weekly, monthly, and term summaries from posted records;
- preserve old invoices and receipts when future configurations change;
- prevent silent edits or deletion of posted financial records;
- keep gross receipts, expenses, deductions, reversals, and final position visible as separate figures;
- support additional approved income and expense categories during beta refinement without redesigning the ledger.

## 3. Core definitions

| Term | Meaning |
| --- | --- |
| Charge | An amount the school says is owed, such as a term school-fee invoice. |
| Collection / receipt | Money actually received on a business date. |
| Outstanding balance | Valid charges minus valid payments applied to those charges. |
| Gross receipts | All valid money received during a selected period before subtracting expenses or deductions. |
| Expense | A valid, posted outgoing amount assigned to an approved expense category. |
| Salary deduction | A monthly amount recorded against a staff member and deduction type. It remains separately visible from ordinary expenses. |
| Reversal / void | A traceable correction that neutralizes a posted record without deleting its history. |
| Business date | The school date to which a transaction belongs; this is separate from the system creation timestamp. |

The user interface must not label invoiced but unpaid fees as income received. Reports may show billed, collected, and outstanding values together, but each must retain its own label.

## 4. Student financial context

Before generating a term school-fee invoice, a student must have an active enrollment containing:

- student;
- academic year;
- term;
- class;
- transport location (how far the student stays from school).

The transport location is part of the student's enrollment/financial context because it determines the location/transport component. A later class or transport location change must not rewrite an already-posted invoice. The historical invoice keeps the exact student, class, transport location, component descriptions, and amounts used when it was generated.

## 5. Term school fees

### 5.1 Formula

```text
Term School Fee = Base Class Fee + Location / Transport Charge
```

Both components must appear separately on the invoice and remain configurable by academic year and term.

### 5.2 Current base class fees

| Class group | Classes | Base class fee (GHS) |
| --- | --- | ---: |
| Early Years | Nursery 1, Nursery 2, KG 1, KG 2 | 120.00 |
| Lower Basic | Basic 1, Basic 2, Basic 3 | 140.00 |
| Upper Basic | Basic 4, Basic 5, Basic 6 | 150.00 |
| JHS | JHS 1, JHS 2, JHS 3 | 207.00 |

### 5.3 Current location/transport charges

| Location | Charge (GHS) |
| --- | ---: |
| Osenase & Akwadum | 910.00 |
| Asuofori | 780.00 |
| Kobriso & Abaase | 520.00 |
| Anomaa Kojo | 1,625.00 |
| Bamenase | 1,300.00 |

### 5.4 Verified term-fee matrix

| Location | Nursery 1–KG 2 | Basic 1–3 | Basic 4–6 | JHS 1–3 |
| --- | ---: | ---: | ---: | ---: |
| Osenase & Akwadum | 1,030.00 | 1,050.00 | 1,060.00 | 1,117.00 |
| Asuofori | 900.00 | 920.00 | 930.00 | 987.00 |
| Kobriso & Abaase | 640.00 | 660.00 | 670.00 | 727.00 |
| Anomaa Kojo | 1,745.00 | 1,765.00 | 1,775.00 | 1,832.00 |
| Bamenase | 1,420.00 | 1,440.00 | 1,450.00 | 1,507.00 |

These values are the current requirements, not permanent constants. Future term configuration can change without affecting previously generated invoices.

### 5.5 Invoice and payment behavior

- Generate a unique invoice server-side for the selected student enrollment and term.
- Copy each configured component description and exact amount into immutable invoice lines.
- Allow full or partial school-fee payments.
- Apply each school-fee payment to an existing valid invoice.
- Calculate `outstanding = invoice total - valid applied payments`.
- Reject zero, negative, duplicate, overpayment, or cancelled-invoice payments unless a later approved credit policy explicitly permits them.
- Create one unique receipt for each successful payment.
- Correct posted invoices/payments through authorized cancellation or reversal, never deletion.

## 6. Daily receipts

The daily receipt worksheet has four explicit income categories.

### 6.1 School-fee collections

This is the school-fee money actually received during the day, not the full value of invoices generated that day.

For each entry, accounts staff select/search the student, see the applicable invoice and outstanding balance, enter the amount received, payment method, business date, and optional external reference/notes. The posted amount updates the student's balance atomically and produces a receipt.

### 6.2 Feeding-fee collections

- Current standard amount: `GHS 10.00` per paying student per day.
- The system must **not** automatically charge, generate, or assume this fee for every student or every school day.
- An authorized accountant must manually record the feeding payment each day for each student who actually paid.
- The amount must be configurable and effective-dated.
- The accountant explicitly selects or enters the students who paid for the business date; no entry means no feeding-fee collection was recorded.
- A student who did not pay contributes `GHS 0.00` to collected income; the system must not fabricate a payment.
- Prevent an accidental duplicate feeding payment for the same student and business date unless an authorized correction/reversal explains it.
- Preserve student, amount, date, collector, payment method, and reversal history for every posted line.

The system may provide a roster-style bulk entry screen, but each student line remains individually traceable. A batch is an input convenience, not the accounting source of truth.

### 6.3 Admission-fee collections

- Current amount: `GHS 50.00` for a new student.
- The amount must be configurable and effective-dated.
- Link the receipt to the admitted student and admission record.
- Prevent an accidental second admission-fee charge/collection for the same admission.
- A waiver, refund, or repeat-admission rule requires later approval; it must not be invented during implementation.

### 6.4 Miscellaneous collections

Use miscellaneous income only for approved receipts that are not school fees, feeding fees, or admission fees. Each entry requires:

- a configurable miscellaneous-income category;
- business date;
- amount;
- clear description/purpose;
- payer or student when applicable;
- payment method;
- reference or notes when applicable;
- staff member who recorded it.

The system must not use a generic miscellaneous entry to bypass student balances, expense controls, or required invoice/payment workflows.

## 7. Daily cashflow entry experience

The supplied notebook demonstrates the school's current habit of recording school-fee, feeding-fee, and admission-fee income by weekday and then calculating a daily and weekly total. The application should preserve that speed and familiarity, but daily and weekly figures must be calculated from individually posted transactions rather than entered as unsupported aggregate totals.

The accounts workspace should make frequent income and expense entry fast without weakening control:

1. Select the business date, defaulting visibly to today.
2. Choose money received or money spent.
3. For money received, choose School Fees, Feeding, Admission, or Miscellaneous.
4. For money spent, choose a configurable expense category and enter a positive amount and clear description.
5. Search/select the student where required; feeding payments are entered manually and are never pre-posted automatically.
6. Show the relevant class, location, invoice, outstanding balance, and default configured amount where applicable.
7. Enter the amount, payment method, reference, and notes; the quick expense path always requires the amount and description.
8. Preview entries plus receipt, expense, and net-cash totals for the selected business date.
9. Post once; prevent double submission with an idempotency key.
10. Show an unambiguous success/failure result and generated receipt, expense voucher, or transaction reference.

For roster/batch entry, validation occurs before posting. If an atomic batch fails, none of its lines may be reported as collected. The UI must state clearly which records were or were not committed.

The daily summary must keep the following figures distinct: gross receipts, expenses, and net cashflow. The interface must never make an expense look like negative income or make an invoice look like cash received.

## 8. Expenses

Expenses are outgoing amounts and are not negative income records. Every expense must have:

- configurable category;
- positive amount;
- business date;
- description/purpose;
- payment method;
- reference and attachment where applicable;
- recorder and audit timestamps;
- posted, voided, or reversed status.

The quick daily expense flow must be usable with only the selected business date, category, positive cash amount, description, and payment method. `Cash` may be the visibly selected default method when it is active, but the accountant can choose another configured method. Reference and attachment fields remain optional unless the selected method or category requires them.

Posting an expense must atomically create the expense record, its unique server-generated number, and its audit event. A retry with the same idempotency key and request fingerprint returns the committed result; a changed payload using the same key is rejected. Expense document rendering happens after commit and cannot duplicate or roll back the expense.

The Chief Engineer will confirm the official expense categories later. Phase 3 may install the configurable proposal in section 16 on the authorized test project, but the categories remain editable/disableable settings and no fabricated expense transactions may be seeded.

Posted expenses cannot be edited or deleted. An authorized void/reversal records the reason, actor, and time and removes the amount from active totals while preserving the original entry.

## 9. Salary deductions

Salary deductions are recorded monthly against a staff member and a configurable deduction type. Each record includes month/year, positive amount, reason, recorder, and correction history. Full payroll, salary generation, PAYE, SSNIT, pensions, and payslips are outside the current scope.

The Chief Engineer stated that monthly total income is reduced by salary deductions. To keep this transparent, reports must show deductions as their own line rather than silently folding them into expenses.

## 10. Calculation model

Only valid, posted, non-reversed records contribute to active totals.

```text
Daily School-Fee Collections
  = valid school-fee payments received on the business date

Daily Feeding Collections
  = valid feeding payments received on the business date

Daily Admission Collections
  = valid admission-fee payments received on the business date

Daily Miscellaneous Collections
  = valid miscellaneous receipts received on the business date

Daily Gross Receipts
  = School-Fee Collections
  + Feeding Collections
  + Admission Collections
  + Miscellaneous Collections

Daily Operating Net / Net Cashflow
  = Daily Gross Receipts - Valid Daily Expenses

Weekly Gross Receipts
  = SUM(Daily Gross Receipts in the selected week)

Weekly Operating Net
  = SUM(Daily Operating Net in the selected week)

Monthly Gross Receipts
  = SUM(Daily Gross Receipts in the selected month)

Monthly Operating Net
  = Monthly Gross Receipts - Valid Monthly Expenses

Monthly Final Position
  = Monthly Operating Net - Valid Monthly Salary Deductions
```

This structure implements the supplied rule while keeping the calculation explainable. Weekly and monthly values are derived from authoritative dated transactions; users do not manually enter aggregate totals.

Reports must display at least:

- gross receipts by income category;
- expenses by category;
- operating net before salary deductions;
- salary deductions;
- final position after salary deductions;
- reversals/voids separately;
- billed school fees, collected school fees, and outstanding school fees separately.

## 11. Periods and aggregation

- Daily reports use the explicit business date.
- Weekly reports aggregate a visible start and end date; the school can later confirm the official week boundary.
- Monthly reports use calendar month and year unless the Chief Engineer later approves a different accounting period.
- Term reports use the configured academic year and term.
- Aggregates are calculated from source transactions. Any cached summary must be reconstructible and reconciled to those records.
- Backdated entry requires permission and remains visible in the audit history.
- A future day-close/reopen workflow may be added after the school confirms who can close or reopen a date.

## 12. Accountability and controls

- Store money as exact `NUMERIC(14,2)` values and transport it as decimal strings.
- Generate invoice, payment, receipt, expense, and reversal identifiers server-side with unique constraints.
- Record payment, balance effect, receipt, and audit event in one database transaction.
- Lock/recheck balances when payments can conflict.
- Use idempotency keys so retries cannot duplicate money.
- Preserve posted records; use reasoned reversals/cancellations for corrections.
- Restrict financial writes to authorized accounts roles; management may be read-only where configured.
- Record actor, business date, system timestamp, previous/new values, and reason for sensitive changes.
- Keep attachments private and access-controlled.
- Reconcile dashboard/report totals to source transactions under identical filters.
- Never let PDF or receipt-print failure repeat or undo an already committed payment.
- Clearly indicate whether a failed request committed any financial record.

## 13. Configurable financial settings

The financial settings area must support authorized configuration of:

- effective-dated base class fees;
- effective-dated location/transport charges and display label;
- feeding-fee amount;
- admission-fee amount;
- miscellaneous-income categories;
- expense categories;
- salary-deduction types;
- payment methods;
- invoice, payment, receipt, and expense prefixes;
- invoice, receipt, and expense-voucher template settings, including school identity snapshot fields and print format;
- active/inactive status without rewriting historical records.

Future approved fee components such as books or prospectus can use the generic fee-component model. They are not included in current invoices until explicitly configured and approved.

## 14. Official invoice, receipt, and expense-voucher templates

Official document templates are part of Phase 3, not a later reporting afterthought. They must use the school crest and red identity, remain legible in grayscale, and use stored document snapshots so a later change to school settings, fee configuration, student enrollment, or staff details does not rewrite history.

The initial design proposal for Chief Engineer review is:

- invoice: A4 portrait, itemized immutable invoice lines, totals, amount paid, and outstanding balance;
- receipt: compact A5 portrait with `OFFICIAL RECEIPT`, prominent amount paid, receipt/payment numbers, payer or student context, payment method/date, collector, and previous/remaining balance when the receipt applies to an invoice;
- feeding, admission, and miscellaneous receipts: the same receipt shell with category-specific context and no misleading invoice-balance fields when they do not apply;
- reversed receipt: retained and reprintable with an unmistakable `VOID` state, reversal reference, reason, actor, and timestamp;
- expense voucher: compact A5 portrait with expense number, category, amount, description, method/date, recorder, and reversal state.

PDF/print generation occurs after the financial transaction commits and is safely retryable. A rendering failure cannot repeat, undo, or change the committed transaction. Final school-approved samples and printer/paper requirements remain an open D-04 review item.

## 15. Delivery mapping

| Plan phase | Financial responsibility |
| --- | --- |
| Phase 2 | Give each student an enrollment, class, and transport location (distance from school). Admission remains possible without generating an invoice. |
| Phase 3 | Implement fee configuration, invoices, school-fee payments, feeding/admission/miscellaneous receipts, simple daily expenses, receipt/expense reversals, official document templates, outstanding balances, and the combined daily cashflow workspace. |
| Phase 4 | Implement monthly salary deductions and any later-approved advanced operational-finance controls; do not rebuild the Phase 3 daily expense ledger. |
| Phase 5 | Implement reconciled daily, weekly, monthly, term, class, location, income-category, expense, deduction, and outstanding reports. |
| Phase 6 | Confirm production categories, numbering, payment methods, samples, opening-balance treatment, role ownership, and release acceptance. |

## 16. Configurable defaults proposed for Phase 3 review

These are test-project defaults, not permanent code constants or final production approval. Every item is stored as configuration, can be activated/deactivated by an authorized user, and preserves its historical display value through transaction/document snapshots.

| Area | Proposed configurable defaults |
| --- | --- |
| Payment methods | `Cash` (default), `Mobile Money`, `Bank Transfer`, and `Other`; require an external reference for Mobile Money and Bank Transfer. |
| Expense categories | `Salaries`, `Feeding Supplies`, `Fuel`, `Electricity`, `Water`, `Stationery`, `Repairs & Maintenance`, `Teaching Materials`, `Transportation`, `Internet`, and `Miscellaneous`; description remains mandatory for every expense. |
| Numbering | Independent yearly sequences: `BBA/INV/{YYYY}/{NNNNN}`, `BBA/PAY/{YYYY}/{NNNNN}`, `BBA/RCT/{YYYY}/{NNNNN}`, `BBA/EXP/{YYYY}/{NNNNN}`, and `BBA/REV/{YYYY}/{NNNNN}`. Numbers are unique and server-generated; gaps are allowed so rollback/retry safety is never weakened to force gapless numbering. |
| Documents | A4 invoice and compact A5 receipt/expense voucher, with school identity and transaction context snapshotted at issue time. |

No expense amount is defaulted or hard-coded. Existing supplied feeding and admission amounts are effective-dated database configuration, not application constants.

## 17. Beta refinement decisions still required

The following items remain deliberately configurable or unresolved:

- official expense categories;
- miscellaneous-income categories;
- salary-deduction types and whether deductions represent retained cash, a liability, or another accounting treatment;
- final approval or revision of the proposed payment methods and external-reference rules;
- final approval or revision of the proposed number prefixes and permitted gaps;
- official weekly boundary and any day-close/reopen workflow;
- discounts, waivers, adjustments, refunds, credits, and overpayment treatment;
- admission-fee waiver/repeat-admission rules;
- whether feeding non-payment needs a separate reason or only absence of a receipt;
- existing/opening student balances when production starts;
- official invoice, receipt, and expense-voucher samples plus printer/paper requirements.

These decisions must be recorded before their dependent production behavior is enabled. Until then, the safest behavior is configuration plus explicit validation—not fabricated accounting rules.

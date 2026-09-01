# Best Brain Academy School Management System
## Project Guide

**Project:** Accounting-Focused School Management System  
**Client:** Best Brain Academy Basic School  
**Primary Contact:** Osei Emmanuel Kofi  
**Version:** 1.0  
**Currency:** Ghana Cedi (GHS)  
**Delivery Target:** 3 weeks from confirmed first installment and receipt of required project information

---

## 1. Project Purpose

Build a secure, responsive school management system for Best Brain Academy with a strong focus on financial administration.

The system must support:

- New student admissions and class assignment
- Student records
- Classes
- Teachers/staff and class assignments
- Administrators, roles and permissions
- School fee structures
- Student invoices
- Full and partial payments
- School-fee receipts
- Outstanding balances
- Expenses
- Salary deductions
- Management and financial reports
- School/system settings
- Audit logs for sensitive actions

### Version 1 scope boundary

This is not a full academic or learning management system. The following are outside the initial scope unless later approved:

- Attendance
- Examinations and grading
- Report cards
- Parent/student portals
- Learning content
- Full payroll
- Biometric attendance
- SMS/WhatsApp integration
- Online payment gateway
- Library management
- Inventory
- GPS/transport tracking

---

## 2. Product Principles

1. Financial accuracy comes before visual polish.
2. Historical financial records must never silently change.
3. Every financial transaction must be traceable to the user who created it.
4. Invoices and receipts must store snapshots of the values used when they were generated.
5. Fee types must be configurable; never hard-code tuition, feeding, bus fees, etc.
6. Academic years, terms, classes, payment methods and categories must be configurable.
7. Financial transactions should not be hard-deleted after posting.
8. Use reversals/cancellations with reasons and audit trails.
9. All sensitive permissions must be enforced on the server.
10. Use decimal-safe storage/calculation for all money.
11. The system should work well on desktop, tablet and mobile.
12. Display currency consistently as `GHS 1,250.00`.

---

## 3. Recommended Technology Baseline

Recommended implementation:

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Supabase for database/authentication/storage, or an equivalent PostgreSQL-backed platform
- Server-side authorization
- Zod or equivalent validation
- React Hook Form or equivalent
- PDF generation for invoices, receipts and reports
- Excel/CSV import/export

Equivalent technologies may be substituted, but the business rules and relational data model in this guide must remain intact.

---

## 4. Main Navigation

```text
Dashboard

Admissions
  ├── New Admission
  └── Admission Records

Students

Classes

Staff

Financials
  ├── Financial Overview
  ├── Fee Structure
  ├── Invoices
  ├── Payments
  ├── Receipts
  ├── Outstanding Fees
  ├── Expenses
  └── Salary Deductions

Reports

Administrators

Settings
```

`Admissions` and `Financials` should be expandable sidebar groups.

---

## 5. Dashboard

The dashboard is a management overview.

### Summary Cards

- Total Students
- New Admissions This Term
- Total Staff
- Total Classes
- Total Fees Expected
- Total Fees Collected
- Total Outstanding Fees
- Total Expenses
- Net Financial Position
- Today's Collections

### Charts

- Monthly fee collection trend
- Paid vs Outstanding
- Revenue vs Expenses
- Students by Class

### Recent Activity

- Recent Payments
- Recent Admissions
- Recent Expenses

### Quick Actions

- New Admission
- Record Payment
- Add Expense
- Generate Invoice

Financial figures should respect the selected academic year and term where relevant.

---

## 6. Admissions

### 6.1 New Admission

Minimum student fields:

- Admission Number
- First Name
- Middle Name (optional)
- Last Name
- Gender
- Date of Birth (optional)
- Admission Date
- Class
- Academic Year
- Term
- Student Location
- Student Status
- Has Disability: Yes / No
- Disability Details (required when Yes)
- Religious Denomination

Guardian fields:

- Guardian Name
- Relationship
- Primary Phone Number
- Alternative Phone Number (optional)
- Email (optional)
- Address (optional)

Optional fields:

- Previous School
- Student Photo
- Notes

### 6.2 Admission Workflow

```text
New Admission
    ↓
Validate Student Information
    ↓
Create Student Record
    ↓
Create Enrollment
    ↓
Assign Class
    ↓
Determine Applicable Fee Structure
    ↓
Optionally Generate Initial Invoice
    ↓
Student Appears Under Students
```

Invoice generation must not be mandatory for completing admission.

### 6.3 Admission Records

Columns:

- Admission Number
- Student
- Class
- Admission Date
- Guardian
- Guardian Phone
- Academic Year
- Status
- Actions

Actions:

- View
- Edit
- View Student Profile
- Generate Invoice

---

## 7. Students

### 7.1 Students List

Columns:

- Student/Admission Number
- Student Name
- Class
- Guardian
- Guardian Phone
- Fee Balance
- Status
- Actions

Filters:

- Search by student name
- Admission number
- Class
- Academic year
- Status
- Gender

### 7.2 Student Profile

Tabs:

```text
Profile
Financial Account
Invoices
Payments
Receipts
```

Financial summary:

- Total Invoiced
- Total Paid
- Outstanding Balance
- Credit Balance, if later enabled

Example account ledger:

```text
Date        Type       Reference      Debit       Credit      Balance
---------------------------------------------------------------------
01/09/26    Invoice    INV-00001      1,500.00       -        1,500.00
03/09/26    Payment    PAY-00001          -        500.00     1,000.00
```

---

## 8. Classes

### 8.1 Class List

Columns:

- Class Name
- Number of Students
- Assigned Teacher(s)
- Academic Year
- Status

Actions:

- View
- Edit
- Archive

Do not delete classes that have historical records.

### 8.2 Class Profile

Show:

- Class name
- Assigned teacher(s)
- Student count
- Student list
- Current fee structure
- Expected fees
- Fees collected
- Outstanding fees

---

## 9. Staff

Use `Staff` instead of only `Teachers`, because salary deductions may also apply to non-teaching employees.

### 9.1 Staff Fields

- Staff ID
- First Name
- Middle Name (optional)
- Last Name
- Phone
- Email (optional)
- Staff Type: Teaching / Non-Teaching
- Position
- Assigned Class(es), where applicable
- Employment Status
- Date Joined (optional)

### 9.2 Staff Profile

Tabs:

```text
Profile
Class Assignments
Salary Deductions
```

A staff record does not automatically create a login account. Login accounts are managed under Administrators.

---

## 10. Administrators and Roles

Administrators are users permitted to log into the application.

### Super Administrator

- Full access
- User management
- Settings
- Financial access
- Audit access

### Administrator

- Admissions
- Students
- Classes
- Staff
- Selected reports
- Limited settings

### Accountant / Bursar

- Financial Overview
- Fee Structure
- Invoices
- Payments
- Receipts
- Outstanding Fees
- Expenses
- Financial Reports

### Management / Proprietor

- Dashboard
- Reports
- Read-only financial visibility
- Optional read-only student/staff visibility

Permissions must be enforced server-side, not only through hidden menu items.

---

## 11. Financials

`Financials` is an expandable module.

### 11.1 Financial Overview

Display:

- Total Fees Expected
- Total Fees Collected
- Total Outstanding
- Collection Rate
- Feeding Fees Collected
- Bus Fees Collected
- Other Fees Collected
- Total Expenses
- Net Financial Position

Also display recent payments, invoices and expenses.

Filters:

- Academic Year
- Term
- Date Range
- Class where relevant

---

## 12. Fee Structure

Fee structures must be configurable and tied to:

```text
Academic Year
+ Term
+ Class
```

Example:

```text
Academic Year: 2026/2027
Term: Term 1
Class: Basic 3

Tuition          GHS 1,000.00
Feeding          GHS   450.00
ICT              GHS   100.00
PTA              GHS    50.00
--------------------------------
Total            GHS 1,600.00
```

A fee item should support:

- Name
- Description
- Amount
- Required / Optional
- Active / Inactive
- Class
- Academic Year
- Term

Possible fee types:

- Tuition
- Feeding
- Bus
- PTA
- ICT
- Books
- Examination
- Development Levy
- Other

These are examples only. Do not hard-code them.

### Critical fee snapshot rule

When an invoice is generated, copy applicable fee values into invoice line items.

Changing a fee structure later must not change an already-issued invoice.

---

## 13. Invoices

Invoices represent money a student is expected to pay.

### Invoice Fields

- Unique Invoice Number
- Student
- Class
- Academic Year
- Term
- Invoice Date
- Due Date (optional)
- Invoice Line Items
- Previous Balance, if applicable
- Subtotal
- Discount/Adjustment, if enabled
- Total
- Amount Paid
- Outstanding Balance
- Status
- Created By
- Created At

Statuses:

- Draft
- Unpaid
- Partially Paid
- Paid
- Cancelled

Actions:

- View
- Print
- Download PDF
- Record Payment
- Cancel with reason and permission

Never hard-delete an invoice that has financial history.

---

## 14. Payments

Payments represent money actually received.

### Payment Workflow

```text
Find Student
    ↓
Select Open Invoice / Account
    ↓
Display Amount Due
    ↓
Enter Payment Amount
    ↓
Select Payment Method
    ↓
Validate
    ↓
Create Payment
    ↓
Update Invoice Balance
    ↓
Generate Receipt
```

### Payment Fields

- Payment Number
- Student
- Invoice
- Amount
- Payment Date
- Payment Method
- External Reference (optional)
- Notes
- Received By
- Created At
- Status

Default payment methods may include:

- Cash
- Mobile Money
- Bank Transfer
- Other

Payment methods must be configurable.

### Partial Payments

Partial payments must be supported.

```text
Invoice Total:       GHS 1,500.00
Previously Paid:     GHS   500.00
Current Payment:     GHS   400.00
Remaining Balance:   GHS   600.00
```

Multiple payments may apply to one invoice.

### Overpayment

Recommended initial behavior:

- Prevent payment greater than the outstanding balance.
- Add student credit-balance functionality only when explicitly requested.

### Payment Integrity

Do not directly edit posted payments after a receipt has been generated.

Use a reversal flow:

```text
Reverse Payment
→ Require Reason
→ Store User + Timestamp
→ Recalculate Balance
→ Enter Correct Payment if necessary
```

---

## 15. Receipts

Every confirmed payment must generate a receipt.

Receipt fields:

- Unique Receipt Number
- Payment Number
- Student Name
- Student Number
- Class
- Academic Year
- Term
- Invoice Reference
- Amount Paid
- Payment Method
- Payment Date
- Previous Balance
- Remaining Balance
- Received By
- School Details

Recommended number format:

```text
BBA/2026/00001
```

The exact prefix/format should be configurable.

Rules:

- One receipt per confirmed payment.
- Receipt numbers are unique.
- Historical receipts must not change when school settings or fee structures change.
- Receipts may be reprinted.
- A reversed payment should cause the receipt to display a `VOID` or reversal state, not disappear.

---

## 16. Outstanding Fees

Show:

- Total Outstanding Amount
- Number of Students with Outstanding Balances

Table columns:

- Student
- Student Number
- Class
- Total Invoiced
- Amount Paid
- Outstanding
- Guardian Phone
- Last Payment Date

Filters:

- Academic Year
- Term
- Class
- Student
- Outstanding Amount

Actions:

- View Student
- View Invoice
- Record Payment
- Print/Export Report

---

## 17. Expenses

The system supports simple expense recording.

Expense categories must be configurable.

Examples:

- Salaries
- Feeding Supplies
- Fuel
- Electricity
- Water
- Stationery
- Repairs & Maintenance
- Teaching Materials
- Transportation
- Internet
- Miscellaneous

Expense fields:

- Expense Number
- Date
- Category
- Description
- Amount
- Payment Method
- Reference Number (optional)
- Supporting Receipt/Attachment (optional)
- Recorded By
- Created At
- Status

Posted expenses must not be hard-deleted. Use void/cancel with reason, user and timestamp.

---

## 18. Salary Deductions

Version 1 handles salary deduction records only. It is not a complete payroll engine.

Fields:

- Staff
- Month
- Year
- Deduction Type
- Amount
- Reason/Description
- Date
- Recorded By
- Created At

Possible types:

- Salary Advance
- Staff Loan
- Absence
- Welfare
- Other

Deduction types must be configurable.

Do not implement full payroll, PAYE, SSNIT, pension calculations or payslip processing unless scope is formally expanded.

---

## 19. Reports

### Financial Reports

- School Fee Collection Report
- Outstanding Fees Report
- Daily Collection Report
- Monthly Collection Report
- Collection by Class
- Collection by Fee Type
- Student Account Statement
- Invoice Report
- Payment Report
- Expense Report
- Revenue vs Expenses
- Salary Deduction Report

### Administrative Reports

- Student List
- Admission Report
- Students by Class
- Staff List
- Class List

Common filters:

- Academic Year
- Term
- Class
- Student
- Staff
- Date From
- Date To
- Payment Method
- Fee Type
- Expense Category

Exports where relevant:

- Print
- PDF
- Excel/CSV

---

## 20. Settings

### School Settings

- School Name
- Logo
- Address
- Phone
- Email
- Motto (optional)

### Academic Settings

- Academic Years
- Current Academic Year
- Terms
- Current Term
- Classes

### Financial Settings

- Fee Types
- Expense Categories
- Salary Deduction Types
- Payment Methods
- Invoice Number Prefix
- Receipt Number Prefix

### System Settings

- Roles
- Permissions
- Administrator Accounts
- Audit preferences

---

## 21. Suggested Data Model

Core tables:

```text
users
roles
permissions
user_roles

academic_years
terms
classes

students
guardians
student_guardians
student_enrollments

staff
staff_class_assignments

fee_types
fee_structures
fee_structure_items

invoices
invoice_items

payments
payment_reversals
receipts

expense_categories
expenses
expense_reversals

salary_deduction_types
salary_deductions

payment_methods
audit_logs
system_settings
```

---

## 22. Important Relationships

```text
Student
  └── Enrollment
        ├── Academic Year
        ├── Term
        └── Class

Class
  ├── Students
  ├── Staff Assignments
  └── Fee Structure

Fee Structure
  └── Fee Structure Items

Student
  └── Invoice
        ├── Invoice Items
        └── Payments
              └── Receipt

Expense Category
  └── Expenses

Staff
  └── Salary Deductions
```

---

## 23. Suggested Key Fields

### `students`

```text
id
admission_number UNIQUE
first_name
middle_name
last_name
gender
date_of_birth
admission_date
status
has_disability
disability_details
religious_denomination
photo_url
created_at
updated_at
```

### `student_enrollments`

```text
id
student_id
class_id
academic_year_id
term_id
status
created_at
```

Use enrollment history rather than overwriting a student's class forever.

### `fee_structures`

```text
id
academic_year_id
term_id
class_id
name
status
created_at
updated_at
```

### `fee_structure_items`

```text
id
fee_structure_id
fee_type_id
amount
is_required
created_at
```

### `invoices`

```text
id
invoice_number UNIQUE
student_id
enrollment_id
academic_year_id
term_id
invoice_date
due_date
subtotal
discount
adjustment
total
amount_paid
balance
status
created_by
created_at
```

### `invoice_items`

```text
id
invoice_id
fee_type_id
description
quantity
unit_amount
line_total
```

Invoice items are historical snapshots.

### `payments`

```text
id
payment_number UNIQUE
student_id
invoice_id
amount
payment_method_id
payment_date
external_reference
notes
received_by
status
created_at
```

### `receipts`

```text
id
receipt_number UNIQUE
payment_id UNIQUE
previous_balance
amount_paid
remaining_balance
generated_by
created_at
```

### `expenses`

```text
id
expense_number UNIQUE
expense_category_id
expense_date
description
amount
payment_method_id
reference
attachment_url
recorded_by
status
created_at
```

### `salary_deductions`

```text
id
staff_id
deduction_type_id
month
year
amount
reason
recorded_by
created_at
```

### `audit_logs`

```text
id
user_id
action
entity_type
entity_id
old_values
new_values
ip_address
created_at
```

---

## 24. Number Generation

Identifiers should be generated server-side.

Examples:

```text
Admission: BBA/STU/2026/0001
Invoice:   BBA/INV/2026/00001
Payment:   BBA/PAY/2026/00001
Receipt:   BBA/REC/2026/00001
Expense:   BBA/EXP/2026/00001
```

Prefixes should be configurable.

Do not generate sequential financial identifiers only in the browser.

---

## 25. Financial Calculation Rules

Use decimal-safe values.

Recommended PostgreSQL money fields:

```sql
NUMERIC(14,2)
```

Do not use JavaScript floating-point arithmetic as the source of truth for money.

Core calculations:

```text
Invoice Total =
SUM(Invoice Line Totals) - Discount + Adjustment

Amount Paid =
SUM(Valid Payments)

Outstanding =
Invoice Total - Amount Paid

Net Financial Position =
Valid Collections - Valid Expenses
```

Voided/reversed transactions must not contribute to active totals.

---

## 26. Search and Filtering

Fast search should exist for:

- Student names
- Admission numbers
- Guardian phone numbers
- Staff
- Invoice numbers
- Payment numbers
- Receipt numbers

Where practical, filters should be represented in the URL query string so refresh/navigation does not lose state.

---

## 27. Audit Trail

Audit at minimum:

- User login
- Student creation/update
- Class assignment changes
- Fee structure creation/update
- Invoice creation/cancellation
- Payment recording/reversal
- Receipt generation
- Expense recording/reversal
- Salary deduction creation/update
- Administrator creation
- Role/permission changes
- Critical system settings changes

Audit logs should not be editable by ordinary users.

---

## 28. Validation Rules

At minimum:

- Admission number must be unique.
- Invoice number must be unique.
- Payment number must be unique.
- Receipt number must be unique.
- Payment amount must be greater than zero.
- Expense amount must be greater than zero.
- Salary deduction must be greater than zero.
- A payment cannot reference a cancelled invoice.
- A payment cannot exceed outstanding balance unless credits are explicitly enabled.
- A fee structure must reference a valid academic year, term and class.
- Historical records must remain readable even when configuration records are archived.
- Validate inputs on both client and server.

---

## 29. Security Requirements

- Authentication required for all application pages except login.
- Role-based permissions enforced server-side.
- Protect all financial mutations from unauthorized users.
- Do not expose database/service-role secrets to client code.
- Validate all server inputs.
- Restrict file upload types and sizes.
- Use HTTPS in production.
- Use least-privilege database access where practical.
- Keep sensitive actions in audit logs.
- Do not rely on hidden UI controls as security.

---

## 30. Data Import

Prepare import templates for initial migration.

### Students Template

```text
Admission Number
First Name
Middle Name
Last Name
Gender
Date of Birth
Class
Academic Year
Term
Student Location
Has Disability
Disability Details
Religious Denomination
Guardian Name
Guardian Relationship
Guardian Phone
Alternative Phone
Admission Date
Status
```

### Staff Template

```text
Staff ID
First Name
Middle Name
Last Name
Phone
Email
Staff Type
Position
Assigned Class
Status
```

### Administrators Template

```text
Full Name
Email
Phone
Role
Status
```

### Fee Structure Template

```text
Academic Year
Term
Class
Fee Type
Amount
Required/Optional
```

### Expense Categories Template

```text
Category Name
Description
Status
```

### Salary Deduction Types Template

```text
Deduction Type
Description
Status
```

Import flow:

1. Upload file.
2. Preview rows.
3. Validate.
4. Display row-level errors.
5. Prevent duplicates.
6. Ask for explicit confirmation.
7. Import valid data.
8. Show import summary.

---

## 31. Empty, Loading and Error States

Every page must handle:

- Loading
- Empty data
- Search with no results
- Server/API error
- Permission denied

Never expose raw database errors to the user.

For financial failures, state clearly whether the transaction was recorded.

---

## 32. UI / UX Direction

The interface should be:

- Professional
- Clean
- Accounting-oriented
- Easy for non-technical school staff
- Responsive
- Consistent

Use:

- Blue as the primary brand color
- White/light neutral surfaces
- Clear financial typography
- Status badges
- Searchable/filterable tables
- Pagination
- Confirmation dialogs for sensitive actions
- Clear success/error feedback

Avoid excessive animations.

---

## 33. Recommended Routes

```text
/login

/dashboard

/admissions
/admissions/new
/admissions/[id]

/students
/students/[id]

/classes
/classes/[id]

/staff
/staff/[id]

/financials
/financials/fees
/financials/invoices
/financials/invoices/[id]
/financials/payments
/financials/receipts
/financials/receipts/[id]
/financials/outstanding
/financials/expenses
/financials/salary-deductions

/reports

/administrators

/settings
/settings/school
/settings/academics
/settings/financial
/settings/roles
```

---

## 34. Development Sequence

### Phase 1 — Foundation

1. Project setup
2. Database schema
3. Authentication
4. Role-based authorization
5. App shell/sidebar
6. Academic years
7. Terms
8. Classes
9. Basic audit logging

### Phase 2 — People

1. Admissions
2. Students
3. Guardians
4. Enrollment/class assignment
5. Staff
6. Staff/class assignment
7. Administrators

### Phase 3 — Finance Core

1. Fee Types
2. Fee Structures
3. Invoice generation
4. Invoice PDF
5. Payments
6. Partial-payment logic
7. Receipts
8. Receipt PDF
9. Outstanding balances

Do not move to financial reporting until invoice/payment tests pass.

### Phase 4 — Operational Finance

1. Expense Categories
2. Expenses
3. Salary Deduction Types
4. Salary Deductions

### Phase 5 — Dashboard and Reports

1. Dashboard metrics
2. Collection reports
3. Outstanding reports
4. Expense reports
5. Student statements
6. Revenue vs Expenses
7. PDF/Excel export

### Phase 6 — Client Data and Deployment

1. Import students
2. Import staff
3. Configure classes
4. Configure academic year/term
5. Configure fee structure
6. Configure roles
7. Test real client scenarios
8. Remove test data
9. Configure domain
10. Deploy
11. Run production smoke tests
12. Create initial administrator
13. Handover/training

---

## 35. Critical Test Scenarios

### Admissions

- Admit a student successfully.
- Reject duplicate admission number.
- Assign class correctly.
- Preserve historical enrollment when class changes later.

### Invoices

- Generate invoice from fee structure.
- Store invoice line-item snapshot.
- Change fee structure and confirm old invoice remains unchanged.
- Cancel invoice only with proper permission/reason.

### Payments

- Full payment.
- Partial payment.
- Multiple partial payments.
- Reject zero amount.
- Reject negative amount.
- Reject overpayment when credits are disabled.
- Calculate balance correctly.
- Reverse payment without deleting history.

### Receipts

- Generate one receipt per valid payment.
- Guarantee receipt number uniqueness.
- Reprint historical receipt.
- Mark receipt appropriately after payment reversal.

### Expenses

- Create expense.
- Validate amount.
- Void expense with reason.
- Exclude void expense from active financial totals.

### Permissions

- Accountant can record payment.
- Unauthorized user cannot record payment.
- Read-only management user cannot alter financial data.
- Only authorized roles can manage administrators/settings.

---

## 36. Definition of Done

A feature is complete only when:

- Database schema/migration is implemented.
- Server-side authorization exists.
- Form validation exists.
- Loading state exists.
- Empty state exists.
- Error state exists.
- Responsive behavior is acceptable.
- Important actions are audited.
- Relevant tests pass.
- Type checking passes.
- Linting passes.
- Production build passes.
- No critical console/server errors remain.
- Financial calculations are tested where applicable.

---

## 37. AI Coding Agent Instructions

Any coding agent working on this repository must:

1. Read this entire guide before making architectural changes.
2. Inspect the existing repository before creating duplicate components or tables.
3. Do not rewrite unrelated working code.
4. Make changes in small, reviewable increments.
5. Before implementing a feature, identify the tables/routes/components involved.
6. Prefer reusable components without over-engineering.
7. Use database transactions for financial workflows involving multiple writes.
8. Never use floating-point arithmetic as the source of truth for money.
9. Never hard-delete posted invoices, payments, receipts or expenses.
10. Never expose privileged secrets to the client.
11. Never weaken authorization to make a feature pass.
12. Add migrations rather than manually changing production schema.
13. Add tests for financial calculations.
14. Run lint, typecheck, tests and production build before declaring major work complete.
15. Report what changed, what was tested and any remaining risks.
16. If a business rule is unclear, ask or implement the safest configurable design instead of hard-coding assumptions.
17. Do not invent real student/staff data. Use clearly labeled test fixtures.
18. Update this guide when approved scope changes.

---

## 38. What Can Be Built Before Client Data Arrives

Proceed with:

- Project/repository setup
- Database schema
- Authentication
- Roles/permissions
- Navigation
- Dashboard shell
- Admissions workflow
- Student CRUD
- Class CRUD
- Staff CRUD
- Academic year/term configuration
- Fee type configuration
- Fee structure engine
- Invoice engine using test data
- Payment engine using test data
- Receipt generation
- Expense module
- Salary deduction module
- Report framework
- Import templates
- Tests
- Deployment configuration

Do not hard-code the school's real:

- Classes
- Students
- Staff
- Administrators
- Fee amounts
- Expense categories
- Salary deduction types

until client information is confirmed.

---

## 39. Client Information Still Required

### Students

- Student details
- Admission numbers
- Classes
- Guardian details

### Teachers / Staff

- Staff details
- Class assignments

### Administrators

- Names
- Emails
- Phone numbers
- Roles

### Financials

- School fee structure per class
- Academic year and term
- Existing invoice sample/format
- Existing school-fee receipt sample/format
- Expense categories/structure
- Salary deduction categories/structure

Preferred bulk-data format: Excel or CSV.

---

## 40. Scope Guardrail

Version 1 includes:

```text
Admissions
Students
Classes
Staff
Administrators / Roles
Fee Structures
Invoices
Payments
Receipts
Outstanding Fees
Expenses
Salary Deductions
Reports
Settings
Audit Trail
```

Anything outside that list requires scope approval.

---

## 41. Primary End-to-End Workflow

```text
ADMISSION
   ↓
STUDENT RECORD
   ↓
CLASS ENROLLMENT
   ↓
APPLICABLE FEE STRUCTURE
   ↓
INVOICE
   ↓
PAYMENT
   ↓
RECEIPT
   ↓
STUDENT ACCOUNT / OUTSTANDING BALANCE
   ↓
REPORTING
```

Architecture and UI decisions should make this workflow simple, reliable and auditable.

---

## 42. Engineering Priority

When trade-offs are necessary, prioritize:

1. Financial correctness
2. Data integrity
3. Security and permissions
4. Auditability
5. Usability for school staff
6. Reporting
7. Performance
8. Visual polish

A visually attractive system with unreliable balances, editable receipts or weak permissions is unacceptable.

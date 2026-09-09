# Phase 5 reporting verification

**Date:** 9 September 2026  
**Scope:** P5-01–P5-05 verified complete  
**Environment:** Local Next.js application with the configured Supabase test project

## Delivered

- Added permission-gated daily, weekly, monthly, and term reporting aggregates for school fees, feeding, admission, miscellaneous income, expenses, salary deductions, reversals, and outstanding balances.
- Replaced the dashboard demonstration values with live authorized records and added the financial overview.
- Replaced the dashboard's recent-collections table with the highest outstanding student balances and an explicit class filter. Recent collections now appear on Financial Overview, where collection activity belongs.
- Added 13 financial and administrative reports, including student statements, with bounded pagination and filters.
- Added four financial-summary periods: Monday-to-Friday daily rows with a weekly total; four fixed monthly buckets with the 22nd through month-end in Week 4; calendar months clipped to the configured term; and configured terms within the selected academic cycle. Each view reports Revenue, Expenses, and Net with a total row. Salary deductions remain separately disclosed pending the documented accounting decision.
- Added CSV and Excel exports capped at 10,000 rows. Text that begins with a spreadsheet formula character is escaped, while money stays numeric in Excel with a Ghana cedi number format.
- Added browser print styling for Print / Save PDF without introducing a separate PDF service.

Tracked database changes:

- `20260909103436_phase5_reporting_snapshot.sql`
- `20260909103644_financial_activity_report_view.sql`
- `20260909104811_phase5_weekly_reporting.sql`
- `20260909105412_term_invoice_reporting_scope.sql`

The fourth migration keeps expected and outstanding school-fee totals scoped by the invoice's assigned academic term. Cash activity remains scoped by its recorded business date. All four migrations are present under the same versions and names locally and in the remote migration history.

## Reconciliation and access evidence

The rollback-only focused SQL check in `supabase/tests/phase5-reporting.sql` passed after permission revocation was added to the scenario. The synthetic period reconciled to:

| Measure                   | Expected result |
| ------------------------- | --------------: |
| Billed school fees        |    GHS 1,000.00 |
| School fees collected     |      GHS 400.00 |
| Outstanding school fees   |      GHS 600.00 |
| Feeding collections       |      GHS 100.00 |
| Admission collections     |      GHS 200.00 |
| Miscellaneous collections |       GHS 50.00 |
| Gross receipts            |      GHS 750.00 |
| Expenses                  |       GHS 80.00 |
| Operating net             |      GHS 670.00 |
| Salary deductions         |       GHS 55.00 |
| Final position            |      GHS 615.00 |

The same check verified 31 daily points, one monthly point, reconciled weekly totals, seven normalized activity rows, exclusion of the reversed receipt, assigned-term invoice scope, denial immediately after revoking the actor's role, denial without an authenticated identity, and rollback with no test residue.

Authenticated browser inspection of the existing records reconciled the dashboard, Reports financial summary, outstanding report, and student statement to GHS 1,775.00 billed, GHS 500.00 school fees collected, GHS 1,275.00 outstanding, GHS 700.00 expenses, GHS 1,900.00 gross receipts, and GHS 1,200.00 final position. The collection report showed the three matching active receipts. The outstanding report and statement both retained the invoice assigned to the selected term even though its issue date precedes the term start by one day; this browser finding prompted and then verified the term-scope correction.

## Export and browser evidence

- The focused export test passes two cases: formula-injection protection with numeric money, and a complete 10,000-row workbook containing all 10,004 worksheet rows including its four header rows.
- A live authenticated Excel download from the collection report completed successfully. The temporary downloaded workbook was removed after the check.
- The Reports financial summary and collection table were inspected at 768 x 1,024 and 390 x 844. Both retained all controls without document-level horizontal overflow; the wide mobile collection table stays inside its own horizontal scroll region.
- The reference dashboard composition, financial overview, report filters, summary, collection, outstanding, and student-statement surfaces were inspected in the authenticated Chromium-based browser. No application console errors were observed.
- The revised dashboard class filter was exercised against Basic 5 and returned the correct empty balance state while preserving the class in the full-report link. Recent collections were verified on Financial Overview.
- Weekly, monthly, term, and academic-cycle financial summaries were opened against the live data. Weekly rendered Monday through Friday plus its total; monthly rendered Week 1 through Week 4 with the documented final bucket; term rendered calendar-month rows; academic cycle rendered the configured Term 1 row. Revenue, expense, and net totals reconciled in each view.
- The revised dashboard and report filters/tables were inspected at 768 x 1,024 and 390 x 844. There was no document-level horizontal overflow; the dashboard's wide outstanding table remained contained in its own horizontal scroll region. No console warnings or errors were present.

## Measured school-volume paths

A rollback-only synthetic benchmark used 200 students and 10,000 finance rows. The reconciled snapshot completed in 54.59 ms and the 25-row report-page query completed in 20.54 ms, both below the project's 100 ms SQL investigation threshold. A residue check returned zero benchmark students, receipts, and users.

Ten authenticated production-build report tabs loaded successfully with zero functional errors. The browser harness creates tabs serially, so its 2.1–8.0 second wall times include tab creation and are not application-latency measurements. This result is retained only as a 10-tab functional peak probe; the SQL timings above are the reliable performance evidence.

A second rollback-only benchmark measured the actual two-query payment-list path under an authenticated Accountant role with 10,001 visible receipts. Exact count took 11.81 ms, the ordered 25-row page took 2.02 ms, payment-reference hydration took 1.07 ms, and the conservative combined database time was 14.90 ms. A follow-up residue query returned zero benchmark payments, receipts, and users.

A temporary local proxy added a fixed 400 ms delay to each upstream response to exercise an intentionally constrained connection without changing the running application. The authenticated dashboard became usable in 2.39 seconds and the weekly financial report in 2.06 seconds with all five weekday rows and no console issues. This is a controlled latency profile, not a claim about the school's unmeasured bandwidth; on-site validation remains Phase 6. The proxy was stopped immediately afterward, and only the requested server on port 3000 remained listening.

The term financial summary was rendered through Chromium's print engine as a three-page A4 PDF, then rendered at 144 DPI and inspected page by page. The heading, period, KPI cards, period table, reconciliation ledger, and breakdown cards were intact with no clipping or overlap. A grayscale render retained clear hierarchy, borders, labels, and monetary values. All temporary print artifacts were removed after inspection.

## Quality and review

- `pnpm exec vitest run src/features/reports/period-summary.test.ts src/features/reports/server/exports.test.ts`: 6/6 passed.
- `pnpm format`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`: passed.
- React Doctor found no new actionable Phase 5 defect. Its Recharts eager-load warning is a false positive because `chart-panel.tsx` dynamically imports the chart with server rendering disabled; remaining findings predate this phase.
- Supabase security findings remain the already documented private deny-all tables, permission-gated `SECURITY DEFINER` functions, and free-plan leaked-password protection setting. The new reporting RPCs passed negative permission tests. Performance advisors reported informational unindexed foreign keys and unused indexes; the measured report queries did not justify speculative indexes.
- The always-on GitHub Actions quality job does not install Playwright or run the broad `pnpm test:e2e` suite. The manually dispatched isolated authentication check remains available.

## Phase 5 conclusion

P5-01–P5-05 are verified complete. Reconciliation, permission denial, exports, responsive layouts, representative database volume, a 10-tab functional peak, constrained latency, and A4/grayscale print output have direct evidence. No broad E2E or general-purpose load-test suite was added or run.

The unresolved August salary source-to-roster mismatch remains a data decision. The batch is unposted and therefore correctly absent from Phase 5 reports. Exact school-network behavior remains a Phase 6 on-site release validation rather than a Phase 5 software blocker.

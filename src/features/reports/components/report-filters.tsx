import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  ReportAccess,
  ReportFilters,
  ReportingPeriod,
  ReportView,
} from "../types";

const reportChoices: Array<{
  value: ReportView;
  label: string;
  access: keyof ReportAccess;
}> = [
  {
    value: "financial-summary",
    label: "Financial summary",
    access: "financials",
  },
  { value: "collections", label: "Collection report", access: "financials" },
  { value: "outstanding", label: "Outstanding fees", access: "financials" },
  { value: "invoices", label: "Invoices", access: "financials" },
  { value: "payments", label: "School-fee payments", access: "financials" },
  { value: "expenses", label: "Expenses", access: "financials" },
  {
    value: "salary-deductions",
    label: "Payroll deductions",
    access: "financials",
  },
  {
    value: "student-statement",
    label: "Student statement",
    access: "students",
  },
  { value: "students", label: "Student list", access: "students" },
  { value: "admissions", label: "Admission report", access: "admissions" },
  {
    value: "students-by-class",
    label: "Students by class",
    access: "students",
  },
  { value: "staff", label: "Staff list", access: "staff" },
  { value: "classes", label: "Class list", access: "classes" },
];

const datedViews: ReportView[] = [
  "financial-summary",
  "collections",
  "outstanding",
  "invoices",
  "payments",
  "expenses",
  "salary-deductions",
  "student-statement",
  "admissions",
];
const academicViews: ReportView[] = [
  "financial-summary",
  "outstanding",
  "invoices",
  "payments",
  "student-statement",
  "students",
  "admissions",
  "students-by-class",
];
const classViews: ReportView[] = [
  "outstanding",
  "invoices",
  "payments",
  "students",
  "admissions",
  "students-by-class",
];

export function ReportFiltersForm({
  filters,
  options,
  access,
}: {
  filters: ReportFilters;
  options: ReportingPeriod;
  access: ReportAccess;
}) {
  const isFinancialSummary = filters.view === "financial-summary";
  const showDates = datedViews.includes(filters.view) && !isFinancialSummary;
  const showAcademic = academicViews.includes(filters.view);
  const showClass = classViews.includes(filters.view);
  const showStudent = [
    "outstanding",
    "invoices",
    "payments",
    "student-statement",
    "students",
    "admissions",
  ].includes(filters.view);
  const showStaff =
    filters.view === "salary-deductions" || filters.view === "staff";
  const showPaymentMethod = ["collections", "payments", "expenses"].includes(
    filters.view,
  );
  const showExpenseCategory = filters.view === "expenses";
  const showStatus = [
    "collections",
    "invoices",
    "payments",
    "expenses",
    "salary-deductions",
  ].includes(filters.view);

  return (
    <form method="get" className="panel mb-5 p-5 print:hidden">
      <div className="mb-4 flex items-center gap-2">
        <SlidersHorizontal
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <h2 className="text-sm font-semibold">Report filters</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Report" htmlFor="report-view">
          <select
            id="report-view"
            name="view"
            defaultValue={filters.view}
            className="native-select w-full"
          >
            {reportChoices
              .filter((choice) => access[choice.access])
              .filter(
                (choice) =>
                  choice.value !== "student-statement" || access.financials,
              )
              .map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
          </select>
        </Field>
        {isFinancialSummary && (
          <Field label="Summary period" htmlFor="report-period">
            <select
              id="report-period"
              name="period"
              defaultValue={filters.period}
              className="native-select w-full"
            >
              <option value="weekly">Weekly · Monday to Friday</option>
              <option value="monthly">Monthly · Week 1 to Week 4</option>
              <option value="term">Term · By month</option>
              <option value="academic-cycle">Academic cycle · By term</option>
            </select>
          </Field>
        )}
        {isFinancialSummary &&
          (filters.period === "weekly" || filters.period === "monthly") && (
            <Field
              label={
                filters.period === "weekly" ? "Date in week" : "Date in month"
              }
              htmlFor="report-start"
            >
              <Input
                id="report-start"
                name="start"
                type="date"
                defaultValue={filters.start}
              />
            </Field>
          )}
        {showDates && (
          <>
            <Field label="From" htmlFor="report-start">
              <Input
                id="report-start"
                name="start"
                type="date"
                defaultValue={filters.start}
              />
            </Field>
            <Field label="To" htmlFor="report-end">
              <Input
                id="report-end"
                name="end"
                type="date"
                defaultValue={filters.end}
              />
            </Field>
          </>
        )}
        {showAcademic &&
          (!isFinancialSummary ||
            filters.period === "term" ||
            filters.period === "academic-cycle") && (
            <Field label="Academic year" htmlFor="report-year">
              <select
                id="report-year"
                name="academicYearId"
                defaultValue={filters.academicYearId ?? ""}
                className="native-select w-full"
              >
                <option value="">Current academic year</option>
                {options.academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                    {year.isCurrent ? " · Current" : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}
        {showAcademic && (!isFinancialSummary || filters.period === "term") && (
          <Field label="Academic term" htmlFor="report-term">
            <select
              id="report-term"
              name="academicTermId"
              defaultValue={filters.academicTermId ?? ""}
              className="native-select w-full"
            >
              <option value="">All terms in range</option>
              {options.academicTerms.map((term) => (
                <option key={term.id} value={term.id}>
                  {options.academicYears.find(
                    (year) => year.id === term.academicYearId,
                  )?.name ?? "Academic year"}
                  {" · "}
                  {term.name}
                  {term.isCurrent ? " · Current" : ""}
                </option>
              ))}
            </select>
          </Field>
        )}
        {showClass && (
          <Field label="Class" htmlFor="report-class">
            <select
              id="report-class"
              name="classId"
              defaultValue={filters.classId ?? ""}
              className="native-select w-full"
            >
              <option value="">All classes</option>
              {options.classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        {showStudent && (
          <Field label="Student" htmlFor="report-student">
            <select
              id="report-student"
              name="studentId"
              defaultValue={filters.studentId ?? ""}
              className="native-select w-full"
              required={filters.view === "student-statement"}
            >
              <option value="">All students</option>
              {options.students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} · {student.admissionNumber}
                </option>
              ))}
            </select>
          </Field>
        )}
        {showStaff && (
          <Field label="Staff member" htmlFor="report-staff">
            <select
              id="report-staff"
              name="staffId"
              defaultValue={filters.staffId ?? ""}
              className="native-select w-full"
            >
              <option value="">All staff</option>
              {options.staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} · {person.staffNumber}
                </option>
              ))}
            </select>
          </Field>
        )}
        {showPaymentMethod && (
          <Field label="Payment method" htmlFor="report-method">
            <select
              id="report-method"
              name="paymentMethodId"
              defaultValue={filters.paymentMethodId ?? ""}
              className="native-select w-full"
            >
              <option value="">All methods</option>
              {options.paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        {showExpenseCategory && (
          <Field label="Expense category" htmlFor="report-expense-category">
            <select
              id="report-expense-category"
              name="expenseCategoryId"
              defaultValue={filters.expenseCategoryId ?? ""}
              className="native-select w-full"
            >
              <option value="">All categories</option>
              {options.expenseCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        {showStatus && (
          <Field label="Record status" htmlFor="report-status">
            <select
              id="report-status"
              name="status"
              defaultValue={filters.status}
              className="native-select w-full"
            >
              <option value="active">Active</option>
              <option value="reversed">Reversed / cancelled</option>
              <option value="all">All statuses</option>
            </select>
          </Field>
        )}
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t pt-4">
        <Button variant="ghost" asChild>
          <Link href="/reports">Reset</Link>
        </Button>
        <Button type="submit">Apply filters</Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <Label htmlFor={htmlFor} className="field-label">
        {label}
      </Label>
      {children}
    </div>
  );
}

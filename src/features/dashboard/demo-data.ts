import type { PaymentStatus } from "@/components/data-display/status-badge";

// Synthetic display fixtures only. Never inserted into a school database.
export const demoMetrics = [
  {
    label: "Expected Fees",
    amount: "180000.00",
    note: "Illustrative term total",
  },
  {
    label: "Fees Collected",
    amount: "146250.00",
    note: "Illustrative collections",
  },
  {
    label: "Outstanding Fees",
    amount: "33750.00",
    note: "Illustrative balance",
  },
  {
    label: "Total Expenses",
    amount: "12600.00",
    note: "Illustrative expenses",
  },
];
export const demoTrend = [
  { month: "Jan", amount: 12000 },
  { month: "Feb", amount: 16500 },
  { month: "Mar", amount: 15250 },
  { month: "Apr", amount: 22000 },
  { month: "May", amount: 18250 },
  { month: "Jun", amount: 20750 },
  { month: "Jul", amount: 18000 },
  { month: "Aug", amount: 23500 },
];
export type DemoCollection = {
  id: string;
  student: string;
  className: string;
  invoice: string;
  amount: string;
  outstanding: string;
  method: string;
  status: PaymentStatus;
  date: string;
  recordedBy: string;
};
export const demoCollections: DemoCollection[] = [
  {
    id: "DEMO-001",
    student: "Demo student 001",
    className: "Demo Class A",
    invoice: "DEMO-INV-001",
    amount: "1250.00",
    outstanding: "0.00",
    method: "Cash",
    status: "Paid",
    date: "2026-08-31",
    recordedBy: "Demo cashier",
  },
  {
    id: "DEMO-002",
    student: "Demo student 002",
    className: "Demo Class B",
    invoice: "DEMO-INV-002",
    amount: "500.00",
    outstanding: "750.00",
    method: "Mobile Money",
    status: "Partially Paid",
    date: "2026-08-31",
    recordedBy: "Demo cashier",
  },
  {
    id: "DEMO-003",
    student: "Demo student 003",
    className: "Demo Class A",
    invoice: "DEMO-INV-003",
    amount: "1600.00",
    outstanding: "0.00",
    method: "Bank Transfer",
    status: "Paid",
    date: "2026-08-30",
    recordedBy: "Demo cashier",
  },
  {
    id: "DEMO-004",
    student: "Demo student 004",
    className: "Demo Class C",
    invoice: "DEMO-INV-004",
    amount: "850.00",
    outstanding: "400.00",
    method: "Cash",
    status: "Partially Paid",
    date: "2026-08-30",
    recordedBy: "Demo cashier",
  },
  {
    id: "DEMO-005",
    student: "Demo student 005",
    className: "Demo Class B",
    invoice: "DEMO-INV-005",
    amount: "1250.00",
    outstanding: "0.00",
    method: "Mobile Money",
    status: "Paid",
    date: "2026-08-29",
    recordedBy: "Demo cashier",
  },
];

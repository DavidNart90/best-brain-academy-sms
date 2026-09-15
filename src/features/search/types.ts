export type GlobalSearchItem = {
  id: string;
  category: "Student" | "Staff" | "Class" | "Finance" | "Administrator";
  title: string;
  description: string;
  href: string;
};

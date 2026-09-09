"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintInvoiceButton() {
  return (
    <Button
      className="print:hidden"
      type="button"
      variant="outline"
      onClick={() => window.print()}
    >
      <Printer /> Print / save PDF
    </Button>
  );
}

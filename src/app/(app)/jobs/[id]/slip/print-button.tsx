"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

// Opens the device's normal print screen. On a phone that screen can
// also "Save as PDF".
export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden />
      Print
    </Button>
  );
}

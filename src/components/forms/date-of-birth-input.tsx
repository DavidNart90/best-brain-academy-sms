import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";

export function DateOfBirthInput({
  placeholder = "DD-MM-YYYY",
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "inputMode" | "maxLength">) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="bday"
      maxLength={10}
      pattern="[0-9]{2}-[0-9]{2}-[0-9]{4}"
      placeholder={placeholder}
      {...props}
    />
  );
}

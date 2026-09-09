/** Combine configured decimal rates without floating-point arithmetic. */
export function feeTotal(
  base: string | null,
  transport: string | null,
): string | null {
  if (base === null || transport === null) return null;
  const cents = (value: string) => BigInt(value.replace(".", ""));
  const total = cents(base) + cents(transport);
  return `${total / 100n}.${(total % 100n).toString().padStart(2, "0")}`;
}

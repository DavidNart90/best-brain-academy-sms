/** Format an exact decimal string, without passing monetary values through floats. */
export function formatMoney(value: string) {
  const match = /^(-?)(0|[1-9]\d{0,11})\.(\d{2})$/.exec(value);
  if (!match) throw new Error("Money must be a NUMERIC(14,2) decimal string.");
  const [, sign, whole, fraction] = match;
  if (whole === undefined || fraction === undefined)
    throw new Error("Invalid money.");
  const negative = sign === "-" && (whole !== "0" || fraction !== "00");
  return `${negative ? "-" : ""}GHS ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction}`;
}

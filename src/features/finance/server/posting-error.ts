import "server-only";

export function postingError(
  error: { code?: string; message?: string },
  operation: string,
) {
  const reference = crypto.randomUUID();
  const code = /^[A-Z0-9]{5,12}$/.test(error.code ?? "")
    ? error.code
    : "UNKNOWN";
  // Diagnostic metadata only. Never log form input, SQL messages, or provider details.
  console.error("finance_post_failed", { operation, code, reference });
  let message =
    "The transaction could not be posted. Contact an administrator with reference " +
    reference +
    ".";
  if (error.code === "23505") {
    message = error.message?.includes("daily_total_unique")
      ? "A daily total already exists for this date and payment method. Reverse that receipt before posting a replacement."
      : "This transaction conflicts with an existing record. Check Receipts before trying again.";
  } else if (error.code === "23503") {
    message =
      "The invoice or payment configuration is unavailable. Refresh and select it again.";
  } else if (error.code === "42501") {
    message =
      "Your account cannot post this transaction. Sign in again or contact an administrator.";
  } else if (error.code === "22023" || error.code === "23514") {
    const allowed = [
      "The payment exceeds the outstanding balance.",
      "Cancelled invoices cannot accept payments.",
      "This payment method requires an external reference.",
    ];
    message =
      error.message && allowed.includes(error.message)
        ? error.message
        : "Check the amount, payment reference and required fields. No transaction was posted.";
  }
  return { ok: false, message };
}

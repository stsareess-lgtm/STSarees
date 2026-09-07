/** Checkout telemetry — optional; no-op until admin outcome UI is ported. */
export async function appendCheckoutTelemetryEvent(_input: {
  orderId: string;
  type: string;
  reason?: string | null;
  source?: "client" | "server";
}) {
  // Intentionally no-op for Sakthi Textile until checkout-outcome module is added.
}

import "server-only";
import {
  MercadoPagoConfig,
  Payment,
  Preference,
  PreApproval,
} from "mercadopago";
import {
  readMercadoPagoAccessToken,
  readMercadoPagoWebhookSecret,
} from "@/lib/billing/mp-env";
import { PublicError } from "@/lib/http/errors";

let cachedToken: string | null = null;
let cachedClients:
  | {
      payment: Payment;
      preference: Preference;
      preApproval: PreApproval;
    }
  | undefined;

export function mercadoPagoAccessToken(): string | null {
  return readMercadoPagoAccessToken();
}

export function mercadoPagoWebhookSecret(): string | null {
  return readMercadoPagoWebhookSecret();
}

function accessToken(): string {
  const token = mercadoPagoAccessToken();
  if (!token) {
    throw new PublicError("Mercado Pago não configurado.", 503);
  }
  return token;
}

/**
 * SDK clients are initialized lazily so builds/tests do not require a live key.
 * Token remains server-only in the Next.js BFF.
 */
export function mercadoPago() {
  const token = accessToken();
  if (!cachedClients || cachedToken !== token) {
    const client = new MercadoPagoConfig({
      accessToken: token,
      options: { timeout: 10_000 },
    });
    cachedToken = token;
    cachedClients = {
      payment: new Payment(client),
      preference: new Preference(client),
      preApproval: new PreApproval(client),
    };
  }
  return cachedClients;
}

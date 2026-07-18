import "server-only";
import {
  MercadoPagoConfig,
  Payment,
  Preference,
  PreApproval,
} from "mercadopago";
import { PublicError } from "@/lib/http/errors";

let cachedToken: string | null = null;
let cachedClients:
  | {
      payment: Payment;
      preference: Preference;
      preApproval: PreApproval;
    }
  | undefined;

function accessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new PublicError("Mercado Pago não configurado.", 503);
  }
  return token;
}

/**
 * SDK clients are initialized lazily so builds/tests do not require a live key.
 * MP_ACCESS_TOKEN remains server-only in the Next.js BFF.
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

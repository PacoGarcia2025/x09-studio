import { createServer } from "node:http";
import { tickAssetJobQueue } from "@/lib/asset-jobs/queue";
import { getAssetProcessor } from "@/lib/asset-jobs/processors/registry";
import { getAssetStorage } from "@/lib/storage/registry";
import { createServiceClient } from "@/lib/supabase/service-client";

const PORT = Number(process.env.ASSET_WORKER_PORT ?? 3040);
const SECRET = process.env.STUDIO_ASSET_WORKER_SECRET?.trim() ?? "";
const POLL_MS = Number(process.env.ASSET_WORKER_POLL_MS ?? 0);

function json(res: import("node:http").ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function isAuthorized(req: import("node:http").IncomingMessage): boolean {
  if (!SECRET) return false;
  return req.headers.authorization === `Bearer ${SECRET}`;
}

async function tickOnce() {
  const supabase = createServiceClient();
  return tickAssetJobQueue(supabase);
}

const server = createServer((req, res) => {
  const url = req.url ?? "/";

  if (req.method === "GET" && (url === "/health" || url === "/v1/health")) {
    const storage = getAssetStorage();
    const processor = getAssetProcessor();
    json(res, 200, {
      ok: true,
      service: "x09-asset-worker",
      processor: processor.id,
      storage: { id: storage.id, status: storage.status },
      generation: false,
      modelsLoaded: false,
      gpu: false,
    });
    return;
  }

  if (req.method === "POST" && url === "/v1/tick") {
    if (!isAuthorized(req)) {
      json(res, SECRET ? 401 : 503, {
        error: SECRET
          ? "Não autorizado"
          : "STUDIO_ASSET_WORKER_SECRET não configurado",
      });
      return;
    }
    void tickOnce()
      .then((tick) => json(res, tick.ok ? 200 : 400, tick))
      .catch((err) =>
        json(res, 500, {
          error: err instanceof Error ? err.message : "tick failed",
        }),
      );
    return;
  }

  json(res, 404, { error: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `[asset-worker] http://127.0.0.1:${PORT} processor=${getAssetProcessor().id} storage=${getAssetStorage().id}`,
  );
});

if (POLL_MS > 0) {
  console.log(`[asset-worker] poll ${POLL_MS}ms`);
  const loop = async () => {
    try {
      const tick = await tickOnce();
      if (tick.ok && tick.processed) {
        console.log(`[asset-worker] ${tick.jobId} → ${tick.status}: ${tick.message}`);
      }
    } catch (err) {
      console.error("[asset-worker] poll error", err);
    }
  };
  void loop();
  setInterval(() => {
    void loop();
  }, POLL_MS);
}

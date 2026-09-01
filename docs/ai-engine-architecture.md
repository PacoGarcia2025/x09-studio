# AI Engine — arquitetura técnica

Núcleo **congelado**. Novos motores entram como Providers. Se um Provider precisar alterar o Core, isso é um problema do Provider: justifique **antes** de qualquer mudança estrutural.

Superfícies permitidas para integração:

- Capability Router
- ExecutionContext
- Provider Interface (`CapabilityProvider`)
- Asset Jobs
- Storage Driver

O Studio não conhece TRELLIS, Hunyuan, Flux nem qualquer outro motor. Conhece **capabilities** (`mesh.generate`, `asset.ingest`, …).

---

## 1. Visão geral

O AI Engine não é uma plataforma pesada. É uma fila de jobs de assets + um roteador fino que escolhe um Provider pela capability e pelas políticas de execução.

Seis módulos, responsabilidade única:

| Módulo | Pasta | Faz |
| --- | --- | --- |
| Assets | `src/lib/assets/` | Biblioteca: kind, source, metadados, upload, paths |
| Asset Storage | `src/lib/storage/` | Ler/gravar bytes (`AssetStorageDriver`) |
| Asset Jobs | `src/lib/asset-jobs/` | Fila universal (`queued` → `running` → `done` / `failed` / `skipped`) |
| Processors | `src/lib/asset-jobs/processors/` | Onde o tick corre (hoje `local`). Não é um motor de IA |
| Providers | `src/lib/capability-router/providers/` | Motores / stubs. Só falam com `ExecutionContext` |
| Capability Router | `src/lib/capability-router/` | `resolveCapability()` + registry interno |

```
UI / action
    → insere asset_jobs (kind + operation + paths)
        → tick (Next interno, UI, ou services/asset-worker)
            → AssetProcessor (local)
                → capabilityFromJob
                → resolveCapability(capability, policies)
                → createExecutionContext
                → provider.execute(ctx)
                    → ctx.storage.writeFile / readFile
                → fila grava status + output_path
```

**Processor ≠ Provider.** Processor é o host da fila (`local` | `future`). Provider é o motor (`local-assets`, `fake-mesh`, TRELLIS, …). A coluna `asset_jobs.provider_id` é o **processor**, não o nome do motor.

---

## 2. Fluxo completo

Exemplo: gerar um mesh a partir de uma imagem (ou mesh de exemplo sem origem).

1. **Origem** — upload cria um asset `image` + job `ingest`; ou a UI chama `enqueueMeshGenerateAction`.
2. **Job** — linha em `asset_jobs`:
   - `kind: "mesh"`
   - `operation: "generate"`
   - `provider_id: "local"` (processor)
   - `input_path` / `output_path` relativos ao storage
   - `meta.capability: "mesh.generate"` (opcional; o Router também deriva `kind.operation`)
   - `status: "queued"`
3. **Tick** — `tickAssetJobQueue` (`src/lib/asset-jobs/queue.ts`):
   - recupera jobs `running`/`retrying` velhos (stale configurável, padrão 40 min; `STUDIO_ASSET_JOB_STALE_MS`)
   - o tick HTTP espera até 1800s (`maxDuration` da infra, qualquer job)
   - pega o `queued` mais antigo
   - marca `running`
   - chama `getAssetProcessor().process({ job, storage })`
4. **Processor local** — `createLocalAssetProcessor`:
   - `capabilityFromJob(job)`
   - `getExecutionPolicies()`
   - `resolveCapability(capability, policies)`
   - se não houver provider: job `skipped` (não é falha de infraestrutura)
   - senão: `createExecutionContext` → `provider.execute(ctx)`
5. **Provider** — usa só o contexto:
   - lê `ctx.inputPath` via `ctx.storage` se precisar
   - grava o resultado em `ctx.outputPath`
   - devolve `{ status, outputPath, message, meta }`
6. **Fila** — persiste `status`, `output_path`, `error_message`, `meta` mesclado.
7. **Biblioteca** — o asset de destino já tem `storage_path` = `output_path`. Depois do tick, `GET /api/assets/[id]/file` serve o arquivo.

Ingest segue o mesmo caminho com capability `asset.ingest` (exceção ao padrão `kind.operation`).

Health sem nomes de motor no vocabulário: `GET /api/health/capabilities`.

---

## 3. Responsabilidades de cada módulo

### 3.1 Assets (`src/lib/assets/`)

- Kinds: `mesh`, `image`, `audio`, `video`, `texture`, `material`, `animation`, `hdri`, `thumbnail`, `other`. Extensão (`.glb`, `.png`) não é kind.
- Sources: `upload`, `generated`, `imported`, `builder`, `marketplace`, `template`, `plugin`.
- Paths relativos: `{workspaceId}/{kind}/{assetId}/source.{ext}`.
- Não escolhe Provider. Não fala com GPU.

### 3.2 Asset Storage (`src/lib/storage/`)

Interface:

```ts
writeFile(relativePath, bytes)
readFile(relativePath) → Buffer
exists(relativePath)
remove(relativePath)  // arquivo ou prefixo de diretório
```

- Driver ativo: `STUDIO_ASSET_STORAGE` (padrão `local`).
- IDs reservados: `local`, `supabase`, `s3`, `r2`, `minio`, `azure`, `gcs`.
- Não-local hoje: stub `planned` que lança erro pedindo `local`.
- Disco local: `STUDIO_ASSETS_ROOT` ou irmã de `STUDIO_PROJECTS_ROOT`.

O Provider **nunca** abre path absoluto do Studio. Só `ctx.storage` e paths do job.

### 3.3 Asset Jobs (`src/lib/asset-jobs/`)

Fila de **qualquer** operação de asset, não só IA.

Operações: `ingest`, `generate`, `optimize`, `convert`, `compress`, `thumbnail`, `preview`, `transcode`, `import`, `export`.

Status: `queued`, `running`, `retrying`, `done`, `failed`, `skipped`, `cancelled`.

Tick: um job por chamada. Worker isolado: `npm run asset-worker` (`services/asset-worker/main.ts`) — mesma fila, mesmo processor.

### 3.4 Processors

Implementam `AssetProcessor.process({ job, storage })`.

O processor **local** só roteia. Não contém lógica de TRELLIS/Hunyuan. Não acrescente motores aqui.

### 3.5 Providers

Implementam `CapabilityProvider`:

- `manifest` — id, capabilities, priority, `requiresGpu`, `requiresInternet`, `enabled`, `status`
- `execute(ctx: ExecutionContext)` → `ProviderResult`

Proibidos no Provider: import de Next, Supabase, React, `asset-jobs/queue`, actions, UI.

Permitido: `ctx`, libs do próprio motor, `child_process` / Python sidecar **do Provider**, env vars **do próprio motor**.

### 3.6 Capability Router

- Lista estável: `src/lib/capability-router/capabilities.ts` (sem nomes de motor).
- Registro: `registerCapabilityProvider()` em `register.ts` (único ponto de plug).
- Resolução: `resolveCapability(capability, policies)` em `resolve.ts`.
- API pública: `src/lib/capability-router/index.ts`. O restante do Studio não importa arquivos de Provider.

Critérios de escolha (nessa ordem de filtro):

1. `enabled === true`
2. `status === "ready"`
3. manifesto inclui a capability
4. se `requiresGpu`, então `policies.gpuAvailable`
5. se `requiresInternet`, então `policies.internetAllowed`
6. maior `priority` vence
7. capabilities `*.generate` (exceto `asset.ingest`) exigem `policies.generationEnabled`

### 3.7 ExecutionContext

Entregue ao Provider. É a fronteira com o Studio:

| Campo | Origem |
| --- | --- |
| `capability` | job / meta |
| `jobId`, `workspaceId`, `projectId`, `assetId`, `createdBy` | `asset_jobs` |
| `assetKind` | `job.kind` |
| `inputPath`, `outputPath` | colunas do job |
| `storage` | `AssetStorageDriver` já resolvido |
| `policies` | env (ver abaixo) |
| `processorTarget` | `"local"` \| `"gpu-worker"` |

Não há `supabase`, cookies, `Request` nem paths absolutos do host.

### 3.8 Políticas (env)

| Variável | Efeito |
| --- | --- |
| `STUDIO_AI_ENGINE_GENERATION_ENABLED=true` | Permite `*.generate` |
| `STUDIO_ASSET_GPU_AVAILABLE=true` | Providers com `requiresGpu` |
| `STUDIO_ASSET_PAID_APIS=true` | Flag no contexto (Router ainda não filtra por ela) |
| `STUDIO_ASSET_INTERNET=false` | Bloqueia Providers com `requiresInternet` |

---

## 4. Guia — novo Provider

**Não altere** `resolve.ts`, `types.ts`, a fila, o processor local, storage, Assets ou UI.

O job `mesh.generate` (e o botão da biblioteca) já existe. Um motor real de mesh é escolhido automaticamente se o manifesto cobrir `mesh.generate`, `requiresGpu` bater com a política, e a `priority` for maior que a do `fake-mesh` (20).

### Passos

1. Criar `src/lib/capability-router/providers/<id>.ts`.
2. Exportar `createXProvider(): CapabilityProvider`.
3. Em `execute`:
   - recusar capabilities que o manifesto não cobre (`skipped`);
   - exigir `ctx.outputPath` (e `inputPath` se o motor precisar);
   - ler/gravar **somente** via `ctx.storage`;
   - devolver `done` / `failed` / `skipped` + `message` curta.
4. Registrar **uma linha** no `seed()` de `register.ts`:

```ts
registerCapabilityProvider(createXProvider());
```

5. Teste no mesmo espírito de `providers/fake-mesh.test.ts`: o processor local despacha **sem importar** o arquivo do motor no teste do processor — só via registry.
6. Env do motor (pesos, Python, CUDA) fica **no Provider**, não no Router.

### Manifesto mínimo

```ts
{
  id: "trellis",           // estável, kebab-case, sem colidir
  name: "TRELLIS",
  version: "1.0.0",
  capabilities: ["mesh.generate"],
  priority: 80,            // > fake-mesh (20) para ganhar quando GPU existir
  status: "ready",         // "planned" nunca é escolhido
  requiresGpu: true,
  requiresInternet: false, // pesos locais
  enabled: true,
}
```

### Checklist (bloqueante)

- [ ] Não importa `@/lib/supabase`, `next/*`, actions ou componentes
- [ ] Não grava em `asset_jobs.provider_id` o nome do motor
- [ ] Não adiciona capability nova “só para este motor”
- [ ] Sem API paga (Replicate, Fal, …) — `paidApisAllowed` deve permanecer falso no produto
- [ ] Falha explícita se pesos/sidecar ausentes (`failed` + mensagem), não exceção não tratada

### Referência viva

`src/lib/capability-router/providers/fake-mesh.ts` — Provider válido que percorre o fluxo sem IA.

---

## 5. Guia — nova Capability

Uma capability é vocabulário do Studio, não de um motor. Mudar `capabilities.ts` **é** alteração de Core. Só faça se o produto precisar do verbo, não para acomodar um binário.

### Convenção

- Padrão: `{kind}.{operation}` alinhado a `ASSET_KINDS` + `ASSET_JOB_OPERATIONS`.
- Exceção: `ingest` → sempre `asset.ingest`.
- Tem de existir em `CAPABILITIES` senão `capabilityFromKindOperation` devolve `null` e o job vira `skipped`.

### Passos (com justificativa por escrito)

1. Confirmar que nenhum id atual cobre o caso (`mesh.generate` vs `mesh.convert`).
2. Acrescentar o literal em `src/lib/capability-router/capabilities.ts`.
3. Garantir `kind` + `operation` do job correspondentes (se a operation ainda não existir em `ASSET_JOB_OPERATIONS`, isso também é Core — justifique).
4. Registrar pelo menos um Provider `ready` que declare a capability, senão o Router responde “Nenhum provider habilitado”.
5. **Não** colocar o nome do motor na string da capability.

Jobs podem forçar a capability com `meta.capability` (já validado por `isCapabilityId`). Prefira o mapeamento kind+operation.

---

## 6. Guia — novo Storage Driver

O Studio só fala com `AssetStorageDriver`. Trocar disco por R2/S3 não muda Providers nem a fila.

### Passos

1. Se o id **já** está em `ASSET_STORAGE_DRIVER_IDS` (`r2`, `s3`, …):
   - implementar `src/lib/storage/drivers/<id>.ts` com a mesma interface;
   - em `registry.ts`, em vez de `createPlannedStorageDriver(id)`, retornar o driver real quando `getAssetStorageDriverId()` for esse id.
2. Se o id **não** existe:
   - isso amplia o catálogo (Core pequeno) — justifique;
   - adicionar o literal em `ASSET_STORAGE_DRIVER_IDS`;
   - seguir o passo 1.
3. Paths continuam **relativos** (`workspace/kind/uuid/source.ext`). O driver resolve para bucket/disco.
4. Testes no estilo `src/lib/storage/registry.test.ts`.
5. `STUDIO_ASSET_STORAGE=<id>`.

Não coloque SDK de nuvem dentro de um Provider. O Provider já recebe `ctx.storage`.

---

## 7. Guia — novo Processor

Processor = **onde o tick executa**, não qual rede neural roda.

Hoje: `ASSET_PROCESSOR_IDS = ["local", "future"]`. `STUDIO_ASSET_PROCESSOR=local`.

O processor `local` já chama o Router. Um motor GPU **não** precisa de processor novo: o Provider pode lançar o sidecar na própria `execute()`, desde que use `ctx.storage` e respeite `ctx.policies.gpuAvailable`.

### Quando um Processor novo é legítimo

- O tick precisa correr noutro processo/máquina (ex.: worker GPU que puxa a mesma tabela `asset_jobs`).
- Não use processor novo para “adicionar Hunyuan”.

### Passos (Core — justificar)

1. Acrescentar id em `ASSET_PROCESSOR_IDS`.
2. Implementar `AssetProcessor` em `src/lib/asset-jobs/processors/`.
3. Registrar em `processors/registry.ts`.
4. O processor deve continuar: job + storage → Router → `execute(ctx)`. Não embutir o motor.
5. Jobs novos seguem com `provider_id` = id do **processor** (`local` ou o novo host).

`processorTarget` no ExecutionContext (`local` | `gpu-worker`) informa o Provider onde está rodando; ainda não há host `gpu-worker` no registry.

---

## 8. O que não fazer

- Escolher motor por env do tipo `STUDIO_AI_ENGINE_PROVIDER=hunyuan`.
- Escrever “trellis” em `capabilities.ts` ou em `asset_jobs.provider_id`.
- Importar o arquivo do Provider a partir de `queue.ts`, actions ou UI.
- Geração real com `STUDIO_AI_ENGINE_GENERATION_ENABLED` desligado (o Router bloqueia).
- APIs pagas de inferência.
- Transformar o Router em marketplace (custo, health por modelo, streaming) sem necessidade real.

---

## 9. Mapa de arquivos

```
src/lib/assets/                    # biblioteca
src/lib/storage/                   # drivers
src/lib/asset-jobs/queue.ts        # tick
src/lib/asset-jobs/processors/     # host da fila
src/lib/capability-router/
  capabilities.ts
  types.ts                         # ExecutionContext, CapabilityProvider
  resolve.ts
  register.ts                      # seed dos Providers
  context.ts
  policies.ts
  from-job.ts
  providers/local.ts               # asset.ingest
  providers/fake-mesh.ts           # mesh.generate (validação, sem IA)
  providers/trellis.ts             # mesh.generate (GPU; sidecar)
src/app/api/health/capabilities/   # rotas por capability
services/asset-worker/             # tick isolado (opcional)
```

Providers no seed:

- `local-assets` — `asset.ingest`
- `fake-mesh` — `mesh.generate` sem GPU (validação)
- `trellis` — `mesh.generate` com GPU; sidecar Python em `services/trellis-worker/` (pesos Hugging Face Hub, sem API paga de inferência)

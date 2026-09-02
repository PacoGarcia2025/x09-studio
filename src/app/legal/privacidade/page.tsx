import Link from "next/link";
import { StudioAtmosphere } from "@/components/brand/StudioAtmosphere";
import { studioSupportEmail } from "@/lib/billing/product";

export default function PrivacidadePage() {
  const supportEmail = studioSupportEmail();
  const updated = "2 de setembro de 2026";

  return (
    <main className="x09-landing relative min-h-screen overflow-hidden text-zinc-100">
      <StudioAtmosphere />
      <div className="relative z-10 mx-auto max-w-2xl px-5 py-16">
        <Link href="/login" className="text-sm text-zinc-500 hover:text-violet-200">
          ← Voltar
        </Link>
        <h1 className="mt-6 text-3xl font-semibold text-white">
          Política de privacidade
        </h1>
        <p className="mt-2 text-xs text-zinc-500">Última atualização: {updated}</p>

        <section className="mt-8 space-y-4 text-sm leading-7 text-zinc-400">
          <p>
            Esta política descreve como a X09 Games trata dados pessoais no
            X09 Studio, nos termos da Lei nº 13.709/2018 (LGPD). Controladora:
            X09 Games, contato{" "}
            <a
              href={`mailto:${supportEmail}`}
              className="text-violet-200 hover:underline"
            >
              {supportEmail}
            </a>
            .
          </p>

          <h2 className="pt-2 text-base font-semibold text-white">
            Dados que tratamos
          </h2>
          <p>
            Conta: e-mail, nome, identificador do login social (se você
            escolher Google). Conteúdo de uso: prompts, arquivos da
            biblioteca 3D, projetos gerados, saldo de créditos e histórico
            de pagamento. Técnico: IP, user-agent e cookies de sessão
            necessários para autenticar.
          </p>

          <h2 className="pt-2 text-base font-semibold text-white">
            Para que usamos
          </h2>
          <p>
            Executar o contrato (gerar sites e assets, debitar créditos,
            publicar o que você pedir), segurança da conta, cumprimento
            legal e melhoria do produto em dados agregados. Base legal:
            execução de contrato (art. 7º, V) e, quando couber, legítimo
            interesse (art. 7º, IX) ou consentimento no login social.
          </p>

          <h2 className="pt-2 text-base font-semibold text-white">
            Com quem partilhamos
          </h2>
          <p>
            Supabase (conta e dados da aplicação), Mercado Pago (pagamento;
            não armazenamos o número do cartão), e o fornecedor de login
            social se você clicar nesse botão. Não vendemos dados pessoais.
          </p>

          <h2 className="pt-2 text-base font-semibold text-white">Prazos</h2>
          <p>
            Mantemos a conta enquanto estiver ativa. Após exclusão, apagamos
            ou anonimizamos o conteúdo operacional em até 30 dias, salvo
            obrigação legal de guarda (por exemplo, comprovantes fiscais).
          </p>

          <h2 className="pt-2 text-base font-semibold text-white">
            Os seus direitos
          </h2>
          <p>
            Acesso, correção, anonimização, portabilidade, eliminação e
            informação sobre partilhas. Envie o pedido para {supportEmail}{" "}
            com o e-mail da conta. Recusa de tratamento essencial impede
            operar o Studio. Autoridade: Autoridade Nacional de Proteção de
            Dados (ANPD).
          </p>
        </section>
      </div>
    </main>
  );
}

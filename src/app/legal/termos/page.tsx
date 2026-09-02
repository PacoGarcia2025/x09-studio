import Link from "next/link";
import { StudioAtmosphere } from "@/components/brand/StudioAtmosphere";
import { studioSupportEmail } from "@/lib/billing/product";

export default function TermosPage() {
  const supportEmail = studioSupportEmail();
  const updated = "2 de setembro de 2026";

  return (
    <main className="x09-landing relative min-h-screen overflow-hidden text-zinc-100">
      <StudioAtmosphere />
      <div className="relative z-10 mx-auto max-w-2xl px-5 py-16">
        <Link href="/login" className="text-sm text-zinc-500 hover:text-violet-200">
          ← Voltar
        </Link>
        <h1 className="mt-6 text-3xl font-semibold text-white">Termos de uso</h1>
        <p className="mt-2 text-xs text-zinc-500">Última atualização: {updated}</p>

        <section className="mt-8 space-y-4 text-sm leading-7 text-zinc-400">
          <p>
            Estes termos regulam o uso do X09 Studio (studio.x09.com.br),
            operado pela X09 Games. Ao criar conta você concorda com este
            texto e com a{" "}
            <Link href="/legal/privacidade" className="text-violet-200 hover:underline">
              Política de privacidade
            </Link>
            .
          </p>

          <h2 className="pt-2 text-base font-semibold text-white">Serviço</h2>
          <p>
            O Studio gera sites, aplicações e arquivos 3D a partir de prompts
            e da sua biblioteca. O resultado depende de créditos, da fila e da
            disponibilidade dos motores. Não prometemos um prazo fixo nem um
            resultado visual específico.
          </p>

          <h2 className="pt-2 text-base font-semibold text-white">Conta</h2>
          <p>
            Você é responsável pelas credenciais, pelo conteúdo enviado
            (prompts, imagens, malhas) e pelo que publica a partir do
            workspace. Não use o serviço para material ilícito, ofensivo a
            menores, ou que viole direitos de terceiros.
          </p>

          <h2 className="pt-2 text-base font-semibold text-white">Créditos</h2>
          <p>
            Conta nova recebe créditos de boas-vindas. Pacotes pagos são
            vendidos via Mercado Pago. Cada site (Build) e cada geração 3D
            debitam o valor indicado na hora da ação. Job que falha devolve
            os créditos. Créditos não usados podem ser reembolsados até 7
            dias após a compra se nada desse pacote tiver sido consumido —
            depois disso, o valor correspondente ao consumo não volta.
          </p>

          <h2 className="pt-2 text-base font-semibold text-white">
            Propriedade
          </h2>
          <p>
            Você permanece titular do que envia e do output gerado na sua
            conta, no limite da lei e das licenças dos modelos usados. A X09
            pode armazenar arquivos para operar o produto (fila, preview,
            publicação que você pedir).
          </p>

          <h2 className="pt-2 text-base font-semibold text-white">
            Limitação
          </h2>
          <p>
            O Studio é oferecido “como está”. Na máxima medida permitida,
            a responsabilidade da X09 por falhas, interrupção ou conteúdo
            gerado limita-se ao valor pago nos 30 dias anteriores ao evento.
          </p>

          <h2 className="pt-2 text-base font-semibold text-white">Contato</h2>
          <p>
            Suporte e pedidos sobre estes termos:{" "}
            <a
              href={`mailto:${supportEmail}`}
              className="text-violet-200 hover:underline"
            >
              {supportEmail}
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}

X09 STUDIO — SOFTWARE FACTORY IA
BLUEPRINT v2.1
README DE REFERÊNCIA PARA O AGENTE

============================================================
OBJETIVO DESTA PASTA
============================================================

A pasta x09_Studio_Blueprint contém a referência oficial para a construção
do X09 Studio — Software Factory IA.

Estrutura esperada:

x09_Studio_Blueprint/
├── X09_Studio_Project_Blueprint_v2_1.pdf
├── README_BLUEPRINT.txt
└── References/
    ├── 01_Landing_Page.png
    ├── 02_Login.png
    ├── 03_Cadastro.png
    ├── ...
    └── demais referências visuais

O PDF contém a especificação funcional, visual e arquitetural.

A pasta References contém referências visuais das telas, experiências,
estados da IA e conceitos importantes do produto.

O PDF e as imagens DEVEM ser analisados em conjunto.

============================================================
FONTE DE VERDADE
============================================================

O Blueprint é a fonte de verdade do projeto.

As imagens da pasta References complementam o Blueprint mostrando
a direção visual e a experiência desejada.

As imagens são referências de design e experiência. Elas não devem ser
tratadas simplesmente como imagens decorativas.

Não substituir decisões do Blueprint por interpretações próprias sem
registrar o conflito durante a auditoria.

============================================================
PRIMEIRA ETAPA — SOMENTE AUDITORIA
============================================================

Antes de alterar qualquer código:

1. Ler o Blueprint inteiro.
2. Analisar todas as imagens disponíveis em References.
3. Analisar o projeto atual.
4. Comparar o projeto atual com o Blueprint.
5. Identificar o que já existe.
6. Identificar o que pode ser aproveitado.
7. Identificar o que precisa ser alterado.
8. Identificar o que está faltando.
9. Identificar conflitos arquiteturais.
10. Identificar riscos.

Durante a primeira auditoria:

- NÃO programar.
- NÃO alterar arquivos.
- NÃO instalar dependências.
- NÃO apagar funcionalidades.
- NÃO refatorar.
- NÃO substituir a arquitetura atual.
- NÃO implementar funcionalidades novas.

Após a auditoria, apresentar um relatório objetivo e aguardar
autorização para iniciar a implementação.

============================================================
RELATÓRIO DA AUDITORIA
============================================================

O relatório deve conter:

1. Resumo do estado atual
2. O que já está pronto
3. O que pode ser aproveitado
4. O que precisa ser alterado
5. O que está faltando
6. Problemas arquiteturais encontrados
7. Situação atual dos assets
8. Situação atual do agente
9. Situação atual do Preview
10. Diferenças entre projeto atual e Blueprint
11. Riscos identificados
12. Primeira etapa recomendada de implementação

Não inventar informações.

Quando algo não puder ser confirmado no código:

"NÃO FOI POSSÍVEL CONFIRMAR."

============================================================
EXPERIÊNCIA DO USUÁRIO
============================================================

O usuário deve conseguir descrever o que deseja construir em linguagem
natural.

Exemplo:

"Quero um site para minha loja de roupas."

O X09 deve interpretar a intenção, estruturar o projeto e conduzir o
mínimo necessário para começar a construção.

A experiência deve parecer uma Software Factory real, e não um painel
administrativo genérico.

O usuário deve acompanhar o resultado através do Workspace, com Chat
e Preview.

============================================================
ASSET INTELLIGENCE ENGINE
============================================================

O Asset Intelligence Engine é parte central do X09 Studio.

O sistema NÃO deve simplesmente pedir ao LLM uma URL de imagem.

O LLM deve identificar quais assets são necessários e para qual finalidade.

Exemplo:

Usuário:
"Quero um site para minha loja de roupas."

A IA pode identificar necessidades como:

- imagem principal/hero;
- imagens de coleção;
- imagens de categorias;
- banners;
- imagens de produtos;
- outros elementos visuais necessários.

Cada asset deve possuir uma finalidade clara.

Para cada necessidade, o sistema poderá decidir entre:

A) usar um asset enviado pelo usuário;
B) buscar um asset real em uma fonte apropriada;
C) gerar um novo asset com IA.

A escolha depende da finalidade do asset.

REGRA FUNDAMENTAL:

"O LLM pode solicitar um asset, mas não pode fabricar o asset."

URLs não podem ser inventadas.

O sistema não deve aceitar uma imagem apenas porque ela possui palavras
semelhantes à solicitação.

O asset deve ser validado em relação à finalidade para a qual foi solicitado.

============================================================
GERAÇÃO DE IMAGENS
============================================================

Quando a IA decidir gerar uma imagem, ela deve gerar pensando no uso
específico dentro do projeto.

Exemplo de HERO:

- proporção adequada;
- enquadramento adequado;
- posição do assunto;
- espaço para texto;
- espaço para CTA;
- estética coerente com o projeto.

Uma imagem de card de produto pode exigir outra composição.

Uma imagem de banner pode exigir outra composição.

O objetivo é que os assets pareçam criados especificamente para aquele
projeto e para aquele espaço da interface.

============================================================
VALIDAÇÃO DOS ASSETS
============================================================

Depois de buscar ou gerar um asset, o sistema deve validar:

- se corresponde ao assunto solicitado;
- se corresponde à categoria correta;
- se corresponde à finalidade;
- se possui composição adequada;
- se possui formato/proporção adequada;
- se possui qualidade suficiente;
- se combina com o projeto.

Quando possível, deve haver análise visual.

Se o asset não corresponder ao pedido:

REJEITAR.

O sistema deve buscar ou gerar novamente.

Não aceitar automaticamente o primeiro resultado.

============================================================
EXPERIÊNCIA DURANTE O TRABALHO DA IA
============================================================

O usuário NÃO deve ser exposto a logs técnicos durante a criação.

A interface deve comunicar estados claros e humanos, como:

"Pensando..."
"Analisando..."
"Planejando..."
"Criando..."
"Preparando imagens..."
"Construindo..."
"Testando..."
"Fazendo os últimos ajustes..."

A complexidade técnica permanece por trás da interface.

============================================================
WORKSPACE
============================================================

A experiência central após o primeiro comando é:

CHAT À ESQUERDA
PREVIEW À DIREITA

O Chat permite continuar conversando com o agente.

O Preview deve parecer uma aplicação real e ser interativo dentro das
capacidades do ambiente.

As alterações devem atualizar o Preview após execução bem-sucedida.

============================================================
EXECUÇÃO ITERATIVA
============================================================

O desenvolvimento deve ser feito em etapas.

Regra:

ANALISAR
→ IMPLEMENTAR UMA ETAPA
→ TESTAR
→ ANALISAR RESULTADO
→ DEFINIR PRÓXIMA ETAPA

Não tentar implementar todo o Blueprint de uma vez.

Não antecipar módulos desnecessários.

Cada etapa deve ser concluída e validada antes da próxima.

============================================================
QUALIDADE
============================================================

O objetivo não é simplesmente produzir código que compile.

O resultado deve ser:

- visualmente profissional;
- coerente;
- funcional;
- responsivo;
- consistente com o projeto;
- adequado ao negócio solicitado;
- livre de assets incorretos;
- testado no Preview.

O X09 deve transformar uma ideia simples em um produto que pareça ter
sido criado por uma equipe profissional de design e desenvolvimento.

============================================================
REGRA FINAL
============================================================

Não interpretar a pasta Blueprint como uma sugestão genérica.

Ela representa a referência de produto para esta versão do X09 Studio.

Primeiro compreender.
Depois auditar.
Depois implementar por etapas.
Depois testar.

Nunca pular diretamente para uma implementação completa sem validar
a etapa atual.

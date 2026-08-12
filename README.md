# minhauti — DadosUTI

Versão preparada para publicação no Cloudflare Workers como site estático.

## Importante

Este projeto NÃO usa um script Worker com `return new Response("Hello World")`.

O `wrangler.jsonc` aponta diretamente para os arquivos estáticos:

- index.html
- style.css
- app.js

## Publicar

Abra o terminal dentro desta pasta e execute:

    npx wrangler deploy

Se já existir um Worker `minhauti` criado com o template Hello World,
este deploy deve substituí-lo pela versão estática.

## Estrutura

- index.html
- style.css
- app.js
- wrangler.jsonc
- .nojekyll


## Integração com o Auxiliar — v3

Foi adicionado um campo opcional para colar o resumo gerado pelo aplicativo Auxiliar.

O botão **Extrair dados selecionados** pode preencher:
- HGT
- Temperatura
- Diurese
- Balanço hídrico

Se um dos campos já estiver preenchido, o programa pede confirmação antes de substituí-lo.
A temperatura extraída é preservada como série/range para reconhecer tanto febre quanto hipotermia.


## v4 — DDE automático

- HGT, temperatura, diurese e balanço hídrico são procurados automaticamente no texto colado do Auxiliar.
- Não há mais caixas de seleção para escolher os quatro itens.
- O período do DDE é definido apenas como 12 h ou 24 h.
- Hipotermia pode ser exibida na conferência, mas não é narrada automaticamente na evolução final.
- A evolução gerada inclui, entre `#Dispositivos` e `#Evolução`:
  `#DDE (12h/24h): dados de enfermagem inseridos`

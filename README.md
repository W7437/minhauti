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


## v5 — fluxo compacto para UTI

- Removida a calculadora de escores e o SOFA da interface.
- `Importar dados` agora usa exatamente o mesmo tipo de botão dos demais.
- Removido `Lactato atual` da Hemodinâmica.
- Gasometria passou a ser uma caixa única em Laboratório para colar a saída do módulo Gasometria.
- Extração automática de pH, PaO2, PaCO2, HCO3, SO2, P/F, AG, BE, lactato e, quando presentes, PvCO2/ScvO2.
- Adicionado Neurológico junto de Hemodinâmica e Função Respiratória.
- Pupilas isocóricas geram `PIFR+` no `NEU:`.
- Anisocoria abre miose/midríase e direita/esquerda.
- Déficit motor `Não` gera `sem déficits motores`; `Sim` abre `Onde?`.
- Removidos peso ideal para critério urinário e intervalo da creatinina anterior.
- Mantidos creatinina basal/anterior, creatinina atual, ureia anterior e ureia atual.
- Terminologia: `Profilaxia para TEV` e `Profilaxia para LAMG`.
- Mantido `#DDE (12h/24h)` entre `#Dispositivos` e `#Evolução`.
- Interface reorganizada para minimizar scroll: cards lado a lado, laboratório em grade, DVA em mosaico, leito ativo e abas persistentes.


## v6 — reorganização do fluxo

- Ordem inicial: Paciente → Evolução anterior.
- DVA movida para uma aba própria.
- Adicionada Adrenalina à DVA.
- Sintomas/Queixas e Profilaxias movidos para uma aba própria.
- Adicionado campo Dieta em Paciente.
- CNO2 abre Fluxo de O₂ em L/min.
- Removido “Ureia acima do VR do laboratório”.
- Função Renal reorganizada em duas linhas:
  - DU, período, via, BH;
  - creatinina basal/anterior, creatinina atual, ureia anterior, ureia atual.
- Checklist alerta IOT/TQT sem Profilaxia para LAMG registrada.
- Evolução usa apenas “profilaxia para TEV”; textos antigos com PTEV são sanitizados ao carregar.

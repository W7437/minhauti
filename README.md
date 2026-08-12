# DadosUTI — minhauti

Atualização visual para o padrão aprovado dos módulos DadosUTI.

## Alterações desta versão

- Cabeçalho padrão DadosUTI.
- Selo “Processamento local” com ponto verde.
- Faixa fixa de privacidade.
- Mesmas cores, fontes, bordas, raios e sombras dos módulos Gasometria/NPT.
- Etapas com círculos azuis numerados:
  1. Evolução anterior
  2. Paciente
  3. Hemodinâmica e Respiratório
  4. Função Renal
  5. Laboratório
  6. Checklist
  7. Evolução
- Navegação por leitos preservada.
- Lógica clínica e geração de evolução preservadas.
- OCR/PDF não foi incorporado ao minhauti.

## Arquivos

- `index.html`
- `style.css`
- `app.js`
- `.nojekyll`


## v2 — segurança de contexto do leito
- Adicionada faixa persistente **LEITO ATIVO: X** entre a barra de ações e as abas.
- A faixa acompanha a rolagem da página e atualiza automaticamente ao trocar de leito.
- A confirmação de salvamento agora informa explicitamente o número do leito.

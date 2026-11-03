# Telas e fluxos do aplicativo (MVP)

Guia para o protótipo no Figma e a implementação em React Native. Reflete as regras do [README](../README.md) e do fluxo de [áudio](audio.md). Itens marcados como **a definir** não são decisões tomadas e não devem ser tratados como definitivos no protótipo.

## Princípios

- **Acolhimento:** linguagem respeitosa, sem cobranças ou culpa ("Como você está hoje?", não "Você não registrou nada"). Sem gamificação, sequências ou metas.
- **Acessibilidade:** fonte base ≥ 16 pt com suporte a fonte ampliada do sistema; contraste WCAG AA; áreas de toque ≥ 44×44 pt; rótulos para leitores de tela; nada comunicado apenas por cor. Considerar fadiga e alterações de sensibilidade/coordenação nas mãos durante o tratamento.
- **Privacidade:** deixar claro quem pode ver cada informação. Não exibir conteúdo de relatos em notificações, títulos de tela ou prévias fora do app. Protótipos usam apenas nomes e relatos fictícios.
- **Somente leitura para psicólogos:** nenhuma tela de psicólogo tem ações de criar, editar ou excluir relatos.
- **Fora do MVP:** notas do psicólogo, alertas/notificações, transcrição de áudio, cadastro público, chat.

## Mapa de navegação

```text
Login ─┬─ Paciente ── [Consentimento, 1º acesso] ── Histórico ─┬─ Novo relato ── Gravação de áudio
       │                                                       └─ Detalhe ── Editar relato ── Gravação de áudio
       └─ Psicólogo ── Pacientes vinculadas ── Relatos da paciente ── Detalhe (somente leitura)
Ambos: Conta (sair)
```

O app detecta o papel pelo perfil do servidor após o login; não há escolha de papel pela pessoa usuária.

## Telas comuns

### C1. Login

- E-mail, senha (com mostrar/ocultar), entrar, "Esqueci minha senha".
- Erro genérico ("E-mail ou senha incorretos"), sem revelar se o e-mail existe.
- Sem botão de cadastro público: criação de contas e vínculos é **a definir** (ver pendências).

### C2. Recuperar senha

- Campo de e-mail e confirmação neutra ("Se houver uma conta, enviaremos instruções").

### C3. Conta

- Nome de exibição, papel, sair.
- Paciente: nome do psicólogo vinculado (ou "Nenhum psicólogo vinculado") e acesso ao texto de privacidade/consentimento.

## Telas da paciente

### P1. Consentimento e privacidade (primeiro acesso)

- Explicar em linguagem simples: o que é registrado, quem pode ler e ouvir (somente o psicólogo vinculado), que relatos não são atendimento de emergência e onde rever esse aviso.
- Ações: aceitar/continuar e ler mais. Texto final, base legal e comportamento em caso de recusa são **a definir**.
- Exibir mensagem sobre canais de emergência é recomendado; conteúdo **a definir** com responsáveis clínicos.

### P2. Histórico de relatos

- Lista em ordem cronológica decrescente: data/hora, humor, trecho do texto e indicador de áudio (ícone + texto "Áudio", não apenas ícone).
- Botão principal "Novo relato".
- Estado vazio acolhedor, com convite para o primeiro relato.
- Paginação/rolagem infinita.

### P3. Novo relato

- Pergunta inicial ("Como você está hoje?").
- Humor/bem-estar: formato e escala **a definir**. Prever espaço para o componente sem fixar faixa numérica.
- Texto livre (opcional se houver áudio), com contador apenas se houver limite **a definir**.
- Botão "Gravar áudio" (abre P4) ou, após gravação, cartão com player, duração, substituir e remover.
- Aviso curto: "Seu psicólogo vinculado poderá ler e ouvir este relato."
- Salvar habilitado somente com texto não vazio ou áudio.
- Ao sair com alterações não salvas: confirmar descarte.

### P4. Gravação de áudio

- Solicitar permissão de microfone somente ao tocar em gravar, com explicação prévia. Se negada: orientar a ativar nas configurações e manter a opção de texto.
- Controles: gravar, pausar/retomar, parar, ouvir antes de enviar, regravar, cancelar.
- Indicador de tempo e de limite (10 MiB). Duração máxima equivalente depende do formato/codec, **a definir** na implementação; avisar antes de atingir o limite.
- Indicação visual e textual de "Gravando".
- Interrupções (ligação, app em segundo plano): pausar e informar.

### P5. Detalhe do relato

- Data/hora de criação e "editado em", humor, texto completo, player (tocar/pausar, avançar/voltar, duração).
- Ação "Editar".

### P6. Editar relato

- Mesmos campos de P3, preenchidos.
- Áudio: ouvir, substituir (nova gravação) ou remover. Remover só é permitido se houver texto não vazio; caso contrário, explicar que o relato precisa de texto ou áudio.
- Exclusão de relatos não faz parte do MVP.

## Telas do psicólogo

### S1. Pacientes vinculadas

- Lista com nome de exibição e data do último relato. Busca por nome se a lista for longa.
- Estado vazio: "Nenhuma paciente vinculada".
- Sem indicadores de risco ou alertas (fora do MVP).

### S2. Relatos da paciente

- Cabeçalho com nome da paciente; lista igual a P2, sem botão de novo relato.

### S3. Detalhe do relato (somente leitura)

- Igual a P5, sem "Editar" e sem ações de escrita. Player de áudio disponível.
- Se o vínculo for removido, a próxima requisição falha: voltar para S1 com mensagem neutra.

## Estados obrigatórios

Desenhar para cada tela de lista/detalhe e envio:

| Estado | Comportamento esperado |
|---|---|
| Carregando | Skeleton ou indicador, sem conteúdo anterior de outra pessoa. |
| Vazio | Mensagem acolhedora e próxima ação (quando houver). |
| Erro | Mensagem clara e "Tentar novamente"; nenhum detalhe técnico ou dado sensível. |
| Sem internet | Avisar e preservar o rascunho na tela. Armazenamento offline/rascunhos persistentes **a definir** (exigem decisão de segurança). |
| Sessão expirada | Retornar ao login sem expor dados. |
| Envio de áudio | Progresso, cancelar e falha com nova tentativa. Mensagens para arquivo acima de 10 MiB e formato não suportado. |
| Sem permissão | Ex.: relato não encontrado ou vínculo removido; mensagem neutra. |

## Pendências que afetam o design

| Tema | Pergunta |
|---|---|
| Escala de humor | Formato (emoji, escala numérica, palavras) e intervalo. |
| Cadastro e vínculo | Quem cria contas, como paciente e psicólogo são vinculados (ex.: convite) e como trocar/remover o vínculo. |
| Consentimento | Texto, base legal LGPD, recusa e revogação. |
| Retenção | Prazo e exclusão de relatos/áudios e da conta. |
| Emergência | Texto e canais de apoio exibidos no app. |
| Plataforma | Somente iOS/Android ou também web; Expo ou React Native puro. |
| Offline | Se rascunhos podem ser salvos no dispositivo e com qual proteção. |

## Fluxo Figma → código

- Definir no Figma, antes das telas finais: cores, tipografia, espaçamentos e componentes (botão, campo, cartão de relato, seletor de humor, player, gravador, estados vazios/erro).
- Nomear componentes e variantes de forma consistente para facilitar o mapeamento para componentes React Native.
- Compartilhar com a implementação: frames exportados (PNG) ou acesso via Dev Mode/MCP do Figma, sem dados reais.

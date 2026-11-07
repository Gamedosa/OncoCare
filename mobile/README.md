# OncoCare — app (Expo)

App multiplataforma (Android, iOS e web) do OncoCare, em Expo SDK 58 + React Native + TypeScript, usando o Supabase (Auth, Postgres com RLS e Storage) como backend.

## Como rodar

Pré-requisitos: Node.js 22+ e um projeto Supabase com as migrations de [`../supabase/migrations`](../supabase/migrations) aplicadas.

```sh
cd mobile
npm install
cp .env.example .env   # preencha com a URL e a publishable key do projeto (OncoCare-Dev)
npm run web            # navegador
npm start              # Expo Go / emulador (leia o QR code)
```

O `.env` não é versionado e só pode conter valores públicos (`EXPO_PUBLIC_*`). Nunca use a service role key no app.

Contas de teste: psicólogos são criados no painel do Supabase (perfil por SQL). Pacientes são convidadas pelo psicólogo no app; veja [Configurar convites de pacientes](#configurar-convites-de-pacientes).

## Verificações

```sh
npm run typecheck                                            # tsc --noEmit
npm test                                                     # jest (jest-expo + Testing Library)
CI=1 npx expo export --platform web --output-dir /tmp/onco-web  # build web
```

Regenerar os tipos do banco após uma migration:

```sh
npx supabase gen types typescript --remote --schema public > src/shared/supabase/database.types.ts
```

## Arquitetura

Organização por feature, com camadas dentro de cada uma:

```
src/
  app/                    rotas (Expo Router); arquivos finos que só exportam telas
    _layout.tsx           providers e guardas por papel (Stack.Protected)
    patient/              área da paciente
    psychologist/         área do psicólogo
  features/
    auth/                 sessão, perfil, login e recuperação de senha
    diary/                relatos: domínio, repositório, hooks, componentes e telas da paciente
    patients/             pacientes vinculadas e telas somente leitura do psicólogo
    account/              tela de conta dos dois papéis
    invitations/          convites: envio pelo psicólogo, aceite/recusa pela paciente
    audio/                download autenticado, player e cópias temporárias de áudio
  shared/
    supabase/             cliente, sessão em SecureStore (nativo) e tipos gerados
    query/                React Query provider e utilitários de teste
    ui/                   tema (paleta da marca) e componentes base
    errors.ts             detecção de erro de rede
```

Fluxo de dados: **tela → hooks (TanStack Query) → repositório → Supabase**, com validação/mapeamento das linhas por **schemas zod**.

- Somente os arquivos `*Repository.ts` chamam o Supabase.
- A autorização é feita pelo **RLS no banco**. Filtros no app (ex.: `patient_id`) expressam intenção, não segurança. Conteúdo ocultado pelo RLS é tratado como "não disponível", com mensagem neutra.
- A sessão fica no SecureStore no Android/iOS e no `localStorage` na web. O cache do React Query é limpo ao sair.

## Status

| Área | Situação |
|---|---|
| Login, recuperar senha, guardas por papel | Recuperação por link de uso único e formulário de nova senha implementados. Exige configurar template/redirects no Supabase; validação por e-mail e aparelhos pendente. |
| Paciente: histórico, novo relato, detalhe, edição | Pronto (texto + humor provisório 1–5). |
| Psicólogo: pacientes vinculadas, relatos e detalhe somente leitura | Pronto. |
| Conta (os dois papéis) | Inclui prévia dos Termos de Uso. Política de privacidade, consentimento e registro de aceite continuam pendentes. |
| Áudio: ouvir | Player integrado ao detalhe dos dois papéis; download autenticado sob demanda, reproduzir/pausar e nova tentativa. Validação em aparelhos ainda pendente. |
| Áudio: gravar e enviar | Implementado para novos relatos e para adicionar áudio a relatos de texto, com prévia, cancelamento da gravação e recuperação de falhas de envio/escrita. Validação em aparelhos/Storage reais pendente. |
| Áudio: substituir/remover áudio salvo | Implementado na edição; confirma a alteração no banco antes de excluir o arquivo antigo. Remoção exige texto; falha de limpeza permite nova tentativa sem reenviar. Testes automatizados e typecheck passaram; validação manual pendente. |
| Convites e vínculo | Psicólogo convida por nome/e-mail, reenvia e cancela pendentes; paciente valida o link, cria a senha e aceita ou recusa. Fluxo principal validado manualmente na web com e-mail e áudio; demais cenários e dispositivos nativos pendentes. |
| Desvínculo | Paciente pode encerrar em Conta; psicólogo, na tela de relatos da paciente. Requer a migration `20261107010000_unlink_patient.sql`. Validação manual após publicação pendente. |
| Consentimento, escala de humor, rascunhos offline | Dependem de decisões em aberto ([Docs/telas.md](../Docs/telas.md)). |

Validações dos incrementos anteriores: typecheck, testes unitários e de tela, build web e consultas somente leitura no OncoCare-Dev (isolamento entre pacientes e psicólogos). Execução em aparelhos iOS/Android reais ainda precisa ser validada.

O usuário confirmou na web o convite, a gravação/envio e a reprodução do áudio pelo psicólogo com uma conta de teste. A substituição/remoção de áudio ainda precisa de validação manual.

O player não usa URLs públicas/assinadas nem guarda bytes no cache do TanStack Query. Na web usa uma URL `blob:` local; no nativo usa arquivo no cache privado do app. A cópia é liberada ao sair da tela, encerrar a sessão ou colocar o app em segundo plano; ao voltar, é necessário carregar novamente. Falhas de limpeza exibem aviso com nova tentativa. Encerramento abrupto do processo pode deixar arquivos no cache: limpeza após falhas e retenção operacional precisam ser definidas antes de usar dados reais. Veja [Docs/audio.md](../Docs/audio.md).

## Prévia dos Termos de Uso

Em **Conta → Ver termos de uso (prévia)**, ambos os perfis podem consultar a minuta de [`../Docs/TERMOS_DE_USO.md`](../Docs/TERMOS_DE_USO.md). Ela é uma prévia, não solicita nem registra aceite e não substitui a política de privacidade ou consentimentos específicos. Nome ElaConta e responsável são preenchidos apenas na prévia; CPF, contatos, datas e demais informações não definidas permanecem pendentes. O nome técnico do app e os links existentes não foram alterados.

Após atualizar a minuta, execute `npm run sync:terms` em `mobile/` e inclua o `terms.json` gerado. Revise cláusulas, dados, contatos e recursos não implementados com assessoria jurídica antes de apresentar o documento como definitivo ou usar dados reais.

## Publicar a versão web (Cloudflare Pages)

O app web é estático (SPA, `web.output: "single"`). O export não gera `404.html`, então o Cloudflare Pages entrega `index.html` para rotas como `/accept-invite` e `/reset-password`. [`public/_headers`](./public/_headers) é copiado para o build e define `Referrer-Policy: no-referrer` (links de convite e recuperação levam token na URL), bloqueia iframes e libera o microfone apenas para o próprio site.

1. No Cloudflare: **Workers & Pages → Create → Pages → Connect to Git** e selecione o repositório.
2. Configuração do build:
   - Production branch: a branch publicada (ex.: `dev` para testes).
   - Root directory: `mobile`
   - Build command: `npx expo export --platform web`
   - Build output directory: `dist`
3. Variáveis de ambiente (Production e Preview): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NODE_VERSION=22`. Elas entram no bundle no build; nunca use a secret/service role key aqui. A proteção dos dados é feita pelo RLS.
4. Após o deploy, no Supabase (**Authentication → URL Configuration**): defina a **Site URL** e inclua `https://SEU-PROJETO.pages.dev/accept-invite` e `https://SEU-PROJETO.pages.dev/reset-password` em **Redirect URLs**.
5. Verifique se `https://SEU-PROJETO.pages.dev/accept-invite` abre o app (não um 404).

Use dados fictícios: o projeto Dev não é ambiente de produção. Deploys de preview (`*.SEU-PROJETO.pages.dev`) usam outro endereço e precisam de Redirect URL própria para testar convites. Domínio próprio: em **Custom domains** do projeto Pages (com o DNS no Cloudflare), atualizando as Redirect URLs.

## Configurar a recuperação de senha

Não há migration. No projeto Supabase correto, configure manualmente:

1. **Authentication → URL Configuration → Redirect URLs**: permita os endereços exatos de retorno utilizados:
   - Web local: `http://localhost:8081/reset-password` (ajuste a porta).
   - Web publicada: `https://SEU-DOMINIO/reset-password`. O servidor precisa servir essa rota diretamente.
   - Build nativo com scheme registrado: `oncocare://reset-password`.
   - Expo Go: `exp://SEU-HOST:PORTA/--/reset-password`, conforme o endereço da sessão atual do Metro. IP/túnel mudam; atualize a allowlist quando necessário. Expo Go não registra o scheme `oncocare`. Para links estáveis, use um development build ou build instalado.
2. **Authentication → Email Templates → Reset Password**: use o conteúdo de [`../supabase/templates/recovery.html`](../supabase/templates/recovery.html). O link deve ser `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery`, **não** `{{ .ConfirmationURL }}`. O template também está configurado para Supabase local em [`../supabase/config.toml`](../supabase/config.toml).
3. Configure SMTP/limites de envio e revise a validade do token no servidor (local: `otp_expiry = 3600`). Nunca use dados reais nos testes.

O app envia `redirectTo` calculado pelo Expo Linking para o ambiente atual. Quem recebe o e-mail abre o link e toca em **Validar link de recuperação**: somente então `verifyOtp` valida o token de uso único no Supabase. Links sem token, expirados, usados ou de outro fluxo não liberam o formulário. O template padrão do Supabase e links PKCE/implicit antigos não são aceitos: após configurar, solicite um novo e-mail.

Após validar, a navegação fica no fluxo de recuperação, sem depender de carregar o perfil. A nova senha exige confirmação e ao menos 6 caracteres (mínimo atual da configuração local); políticas mais fortes do projeto remoto continuam sendo aplicadas pelo servidor. O app não coleta CPF. Ao salvar, solicita encerramento global das sessões e exige novo login. Se esse encerramento falhar, oferece repetir **somente** o encerramento. JWTs de acesso já emitidos podem continuar válidos até expirar; revogar refresh tokens não os invalida imediatamente.

Tokens são retirados da URL visível após a abertura e não são enviados a logs pelo app. Hospedagem/proxies devem omitir parâmetros sensíveis dos logs e usar `Referrer-Policy: no-referrer`; o primeiro acesso HTTP ainda contém o token. Use HTTPS fora do localhost. O Supabase controla validade/uso único do token e proteção dos dados em repouso; sessões continuam usando SecureStore no nativo e localStorage na web. Não compartilhe links de recuperação.

O formulário mantém sua validação apenas durante a abertura atual; recarregar ou encerrar o app após consumir o link exige solicitar outro link para redefinir.

Validação manual pendente: solicitar e-mail com conta fictícia; abrir na web/Android/iOS com app fechado e aberto; testar expiração/reuso, confirmação divergente, perda de rede, encerramento das sessões e login com a nova senha. Nenhuma configuração remota é aplicada pelos testes automatizados.

## Configurar convites de pacientes

Componentes: migration [`20261107000000_patient_invitations.sql`](../supabase/migrations/20261107000000_patient_invitations.sql), Edge Function [`invite-patient`](../supabase/functions/invite-patient/index.ts) e template [`invite.html`](../supabase/templates/invite.html).

Fluxo:

1. O psicólogo informa nome e e-mail em **Pacientes → Convidar paciente**. O app chama a Edge Function, que verifica o JWT e o papel de psicólogo.
2. E-mail sem conta (ou conta ainda não confirmada): o Auth cria a conta e envia o e-mail de convite. Conta de paciente já confirmada: nenhum e-mail é enviado; ela vê o convite ao entrar. E-mails de psicólogos ou do próprio remetente são recusados.
3. A paciente abre o link (`/accept-invite`), toca em **Validar convite**, cria a senha e decide em **Convites** se aceita ou recusa. Pendências aparecem também no topo do histórico.
4. Aceitar grava o vínculo (substituindo o anterior); recusar ou expirar (7 dias) mantém a conta sem vínculo. O psicólogo pode reenviar ou cancelar convites pendentes.

O link do e-mail expira conforme `otp_expiry` do Auth (local: 1 h), antes dos 7 dias do convite. Se expirar, o psicólogo pode reenviar enquanto a conta não estiver confirmada; se a paciente já criou a senha, ela vê o convite no app (ou usa **Esqueci minha senha**).

No projeto Supabase, configure manualmente:

1. Aplique a migration (`supabase db push`, revisando antes com `--dry-run`) e publique a função: `npx supabase functions deploy invite-patient --use-api`. A função usa `verify_jwt = false` porque valida o JWT no código com `auth.getClaims` ([`config.toml`](../supabase/config.toml)), compatível com chaves legadas e assimétricas.
2. **Redirect URLs**: inclua os retornos de `/accept-invite` equivalentes aos de recuperação (ex.: `http://localhost:8081/accept-invite`, `https://SEU-DOMINIO/accept-invite`, `oncocare://accept-invite`, `exp://SEU-HOST:PORTA/--/accept-invite`).
3. **Email Templates → Invite user**: use [`../supabase/templates/invite.html`](../supabase/templates/invite.html). O link deve ser `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=invite`.
4. Opcional: o secret `INVITE_REDIRECT_URL` (ex.: `https://SEU-DOMINIO/accept-invite`) fixa o retorno no servidor, ignorando o enviado pelo app.
5. Configure SMTP próprio: o servidor de e-mail padrão do Supabase tem limite baixo de envios. O app mostra mensagem específica quando o limite é atingido.

Privacidade: o psicólogo vê nome, e-mail e validade apenas dos convites que enviou; a paciente vê apenas o nome do psicólogo. Convites pendentes não dão acesso a perfil nem a relatos. A função não registra e-mails em log. O nome informado pelo psicólogo vira o nome de exibição só de contas novas; a paciente pode alterá-lo depois. Ao validar o link num aparelho com outra conta aberta, a sessão anterior é substituída e o cache local é limpo.

Validação: `supabase/tests/patient_invitations.sql` (isolamento, transferência, expiração, recusa e cancelamento), testes Deno da função (`deno test` em `supabase/functions/invite-patient`) e testes do app. Convite e acesso foram testados na web; outros cenários e aparelhos nativos permanecem pendentes.

## Encerrar o vínculo

Após aplicar a migration [`20261107010000_unlink_patient.sql`](../supabase/migrations/20261107010000_unlink_patient.sql), a paciente pode encerrar o vínculo em **Conta**, e o psicólogo na tela de relatos da paciente. Ambos recebem uma confirmação antes da alteração. A função no banco autoriza somente as partes e verifica os dois IDs, evitando encerrar um vínculo diferente daquele confirmado. O RLS impede novos acessos aos relatos e áudios pelo profissional após o desvínculo; cópias previamente obtidas não podem ser revogadas.

O diário permanece disponível para a paciente, que pode continuar criando e editando relatos sem vínculo. Ao aceitar outro convite, ela autoriza acesso a todos os relatos e áudios anteriores e aos futuros durante o vínculo. O aviso não substitui a definição da base legal e do texto de privacidade antes do uso real.

Os testes [`unlink_patient.sql`](../supabase/tests/unlink_patient.sql) usam dados sintéticos e verificam autorização, vínculo alterado, acesso ao áudio e continuidade do diário. Rode-os apenas em banco local isolado. Após publicar a migration, teste manualmente os dois lados e regenere os tipos do banco.

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

Contas de teste: são criadas no painel do Supabase e vinculadas por SQL. O app não tem cadastro nem vínculo pelo cliente (decisão pendente).

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
| Conta (os dois papéis) | Pronto. O texto de consentimento completo está pendente. |
| Áudio: ouvir | Player integrado ao detalhe dos dois papéis; download autenticado sob demanda, reproduzir/pausar e nova tentativa. Validação em aparelhos ainda pendente. |
| Áudio: gravar e enviar | Implementado para novos relatos e para adicionar áudio a relatos de texto, com prévia, cancelamento da gravação e recuperação de falhas de envio/escrita. Validação em aparelhos/Storage reais pendente. |
| Áudio: substituir/remover áudio salvo | Implementado na edição; confirma a alteração no banco antes de excluir o arquivo antigo. Remoção exige texto; falha de limpeza permite nova tentativa sem reenviar. Testes automatizados e typecheck passaram; validação manual pendente. |
| Consentimento, escala de humor, cadastro/vínculo, rascunhos offline | Dependem de decisões em aberto ([Docs/telas.md](../Docs/telas.md)). |

Validações dos incrementos anteriores: typecheck, testes unitários e de tela, build web e consultas somente leitura no OncoCare-Dev (isolamento entre pacientes e psicólogos). Execução em aparelhos iOS/Android reais ainda precisa ser validada.

O usuário confirmou o teste manual do fluxo de gravação/envio com uma conta fictícia de paciente. A substituição/remoção de áudio é um incremento posterior: typecheck e os 103 testes da suíte passaram; validação manual desses novos fluxos ainda está pendente.

O player não usa URLs públicas/assinadas nem guarda bytes no cache do TanStack Query. Na web usa uma URL `blob:` local; no nativo usa arquivo no cache privado do app. A cópia é liberada ao sair da tela, encerrar a sessão ou colocar o app em segundo plano; ao voltar, é necessário carregar novamente. Falhas de limpeza exibem aviso com nova tentativa. Encerramento abrupto do processo pode deixar arquivos no cache: limpeza após falhas e retenção operacional precisam ser definidas antes de usar dados reais. Veja [Docs/audio.md](../Docs/audio.md).

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

O formulário mantém sua validação apenas durante a abertura atual; recarregar ou encerrar o app após consumir o link exige solicitar outro link para redefinir. Isso não implementa cadastro, convite, primeiro acesso obrigatório ou consentimento de vínculo.

Validação manual pendente: solicitar e-mail com conta fictícia; abrir na web/Android/iOS com app fechado e aberto; testar expiração/reuso, confirmação divergente, perda de rede, encerramento das sessões e login com a nova senha. Nenhuma configuração remota é aplicada pelos testes automatizados.

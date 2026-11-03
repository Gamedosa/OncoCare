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
| Login, recuperar senha, guardas por papel | Pronto. O link de redefinição ainda não abre no app. |
| Paciente: histórico, novo relato, detalhe, edição | Pronto (texto + humor provisório 1–5). |
| Psicólogo: pacientes vinculadas, relatos e detalhe somente leitura | Pronto. |
| Conta (os dois papéis) | Pronto. O texto de consentimento completo está pendente. |
| Áudio (gravar, enviar, ouvir) | Pendente. O banco e o bucket já existem. |
| Consentimento, escala de humor, cadastro/vínculo, rascunhos offline | Dependem de decisões em aberto ([Docs/telas.md](../Docs/telas.md)). |

Validado: typecheck, testes unitários e de tela, build web e consultas somente leitura no OncoCare-Dev (isolamento entre pacientes e psicólogos). **Ainda não validado:** execução em aparelhos iOS/Android reais e escrita de relatos pelo app no ambiente Dev.

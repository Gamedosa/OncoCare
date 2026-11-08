# ElaConta - Security & Privacy Release Checklist

## Registro da verificacao

Verificacao executada em 2026-11-07, sobre o commit `533e8a2`. Os itens originais
abaixo foram preservados. Uma caixa vazia significa que o criterio completo de
lancamento ainda nao foi comprovado, nao necessariamente codigo ausente.

Estados da matriz: **APROVADO** (somente no escopo indicado), **REPROVADO**
(criterio nao atendido), **PENDENTE** (evidencia insuficiente ou dependencia externa)
e **NAO APLICAVEL** (com justificativa). Evidencia local nao aprova automaticamente
o ambiente hospedado ou o uso com dados reais.

### Evidencias obtidas

| ID | Verificacao | Resultado e limite |
|---|---|---|
| E1 | Revisao de seguranca somente leitura | Nenhuma vulnerabilidade de alta confianca identificada no codigo revisado. Nao e garantia de ausencia de vulnerabilidades nem pentest do ambiente. |
| E2 | `cd mobile && npm run typecheck`; `npm test -- --runInBand` | Typecheck e 46 suites / 219 testes aprovados. Inclui telas, caches, perfil, callback de e-mail e erros; mocks nao comprovam os servicos reais. |
| E3 | Seis scripts SQL em PostgreSQL isolado via PGlite | `diary_audio`, `patient_invitations`, `unlink_patient`, `delete_diary_entry`, `account_deletion_notifications`, `diary_days_profile`: aprovados. Aplicadas todas as migrations reais; Auth/Storage simulados com dados sinteticos. Nao executados no banco hospedado. |
| E4 | `deno test` dos dois diretorios de funcoes; `deno check` dos dois `index.ts` | 15 testes aprovados e ambas as Edge Functions sem erros de tipos. Dependencias administrativas simuladas nos testes; nao executam delecao real no Auth/Storage. |
| E5 | `cd mobile && npm audit --json`; `npm audit --omit=dev --json`; `npm ls glob minimatch deepmerge --all` | SCA completa: 24 pacotes sinalizados, 23 moderate e 1 low; 0 high / critical. Omitindo dev: 22 (21 moderate, 1 low). Cadeias de ferramentas Expo/Jest; classificacao do manifesto nao comprova inclusao no bundle nem explorabilidade remota. |
| E6 | HEAD em `/` e `/confirm-email` no site publicado; HEAD por HTTP | HTTPS 200; `no-referrer`, `nosniff`, `DENY`, `microphone=(self), camera=(), geolocation=()` observados. HTTP redireciona 301 para HTTPS. Nao comprova que o ultimo commit/migration esteja publicado. |
| E7 | Correcao autorizada de `glob`/`minimatch`, depois do registro inicial | Overrides seletivos, lockfile reinstalado com `npm ci --ignore-scripts`: sem versoes afetadas pelos dois advisories. Typecheck, 46 suites / 219 testes com cobertura, exportacao web/Android/iOS e fingerprint aprovados. Audit completo: 9 low, 0 moderate/high/critical; omit-dev: 7 low, 0 moderate/high/critical. Um unico advisory restante: `deepmerge`. |
| E8 | Compatibilidade do lockfile com Cloudflare Pages | Falha `EUSAGE` reproduzida com npm 10.9.9. Overrides explicitos de `glob`/`minimatch`, com excecao `test-exclude` 6 para APIs legadas, corrigiram a resolucao. Node 22.23.4 + npm 10.9.9: `npm ci --offline --no-audit`, typecheck, 46 suites / 219 testes, exportacao web e fingerprint aprovados. Audit: 9 low, 0 moderate/high/critical; dependencias diretas e versoes resolvidas preservadas. Deploy remoto nao executado. |

Evidencias de codigo/testes:
[migrations](../supabase/migrations/), [SQL](../supabase/tests/),
[convites](../supabase/functions/invite-patient/),
[exclusao](../supabase/functions/delete-account/),
[app](../mobile/src/features/), [headers](../mobile/public/_headers).

Nao houve leitura de dados reais, uso de credenciais administrativas, alteracao
remota, teste de carga, delecao remota, rotacao de chave ou restauracao de backup.
A CLI remota informou ausencia de sessao autenticada. A validacao visual/nativa
permanece pendente. Lint nao foi validado: a tentativa anterior do Expo encontrou
ausencia de configuracao e falha de compatibilidade; a instalacao automatica de
tooling foi removida, sem alterar dependencias neste trabalho.

## Authentication
- [ ] Passwords hashed securely
- [ ] Login rate limiting
- [ ] Secure password reset
- [ ] MFA for administrators

## Authorization
- [ ] All resources validate ownership server-side
- [ ] IDOR tests passing
- [ ] Administrative endpoints protected
- [ ] Default deny authorization

## Sensitive Data
- [ ] Diary content absent from logs
- [ ] Passwords absent from logs
- [ ] Tokens absent from logs
- [ ] Analytics does not receive diary content
- [ ] Error tracking does not receive sensitive content

## Database
- [ ] Parameterized queries/ORM
- [ ] Encryption enabled
- [ ] Database not publicly accessible
- [ ] Production credentials isolated

## Account deletion
- [ ] User removed/anonymized
- [ ] Diaries removed
- [ ] Attachments removed
- [ ] Tokens revoked
- [ ] Cache cleared
- [ ] Backup retention documented

## Export
- [ ] User can export own data
- [ ] User cannot export another user's data

## Application Security
- [ ] XSS tested
- [ ] SQL/NoSQL injection tested
- [ ] CSRF tested
- [ ] SSRF tested where applicable
- [ ] File upload tested
- [ ] Rate limiting tested

## Infrastructure
- [ ] HTTPS enforced
- [ ] Secrets stored outside repository
- [ ] Backups encrypted
- [ ] Dev/staging/prod separated

## Dependencies
- [x] SCA executed
- [x] Critical vulnerabilities = 0
- [x] High vulnerabilities reviewed

## Privacy
- [ ] Collected fields are necessary
- [ ] Terms match actual implementation
- [ ] Privacy Policy matches actual data flow
- [ ] Retention implemented
- [ ] Third-party integrations documented

## Incident readiness
- [ ] Security logs available
- [ ] Incident response procedure implemented
- [ ] Credential rotation procedure tested
- [ ] Backup restoration tested

## Matriz de verificacao por criterio

| Criterio | Estado | Evidencia / acao restante |
|---|---|---|
| Passwords hashed securely | PENDENTE | Auth gerenciado; confirmar mecanismo/politica do provedor e configuracao remota, sem acessar hashes. |
| Login rate limiting | PENDENTE | Confirmar limites Auth e testar poucas tentativas controladas no Dev, sem carga no ambiente publicado. |
| Secure password reset | PENDENTE | E1/E2: fluxo de uso unico e nova senha. Validar SMTP, templates, allowlist exata, expiracao/reuso e sessoes reais. |
| MFA for administrators | PENDENTE | Administrador deve comprovar MFA no painel/contas que controlam Supabase, GitHub e hospedagem. |
| All resources validate ownership server-side | PENDENTE | E1/E3: RLS/RPCs locais aprovados. Confirmar migrations/policies/grants do remoto e repetir com JWTs ficticios. |
| IDOR tests passing | PENDENTE | E3: pacientes/psicologos/anon isolados, incluindo contagens e audio. Repetir via HTTP real, nao somente telas. |
| Administrative endpoints protected | PENDENTE | E1/E4: verificacao JWT/papel ou credencial servidor. Testar ambos os endpoints implantados sem token e com papel incorreto. |
| Default deny authorization | PENDENTE | E1/E3: grants/revokes e RLS revisados. Confirmar ausencia de grants/policies adicionais no projeto remoto. |
| Diary content absent from logs | PENDENTE | E1: nao identificado no logging revisado. Inspecionar logs efetivos de app, funcoes, Auth, banco e hospedagem com texto-canario ficticio. |
| Passwords absent from logs | PENDENTE | E1: nao identificadas nos logs do codigo. Conferir captura de bodies, console, proxies e monitoramento reais. |
| Tokens absent from logs | PENDENTE | E1/E2: tokens removidos da URL apos captura. Primeiro acesso HTTP ainda contem token; revisar logs de URL/query strings e provedores. |
| Analytics does not receive diary content | PENDENTE | E1: sem integracao de analytics no app revisado. Verificar configuracoes dos provedores, incluindo telemetria da hospedagem. |
| Error tracking does not receive sensitive content | PENDENTE | E1: sem integracao identificada no app. Confirmar observabilidade remota, scrubbing e captura de requests. |
| Parameterized queries/ORM | APROVADO | E1: uso das APIs Supabase e SQL parametrizado no escopo revisado. Reavaliar ao adicionar consultas dinamicas. |
| Encryption enabled | PENDENTE | HTTPS observado (E6). Confirmar protecao em repouso de banco, Storage e backups nos provedores; nao inferir por RLS. |
| Database not publicly accessible | PENDENTE | Definir acesso de rede administrativo permitido. API publica Supabase com RLS nao equivale a banco aberto; conferir conexao PostgreSQL, TLS e restricoes de rede. |
| Production credentials isolated | PENDENTE | Conferir projetos, ambientes, variaveis CI/CD e privilegios; publishable key e publica, secret/service role nunca deve entrar no app. |
| User removed/anonymized | PENDENTE | E3/E4: cascata e ordem Auth local aprovadas. Executar exclusao real autorizada de contas descartaveis no Dev. |
| Diaries removed | PENDENTE | E3: registros da paciente excluida removidos; psicologo excluido preserva pacientes. Conferir banco remoto depois da operacao. |
| Attachments removed | PENDENTE | E3/E4: fila/lotes/orfaos e falhas aprovados. Conferir bytes/objetos no Storage real, nao apenas metadados SQL. |
| Tokens revoked | PENDENTE | E1/E3: RLS impede novo acesso quando exclusao comeca. Confirmar revogacao de refresh tokens no Auth e testar JWT antigo ate expirar; nao prometer revogacao instantanea de access token. |
| Cache cleared | PENDENTE | E2: limpeza de caches/sessao e copias temporarias no codigo testada. Testar conta compartilhada, background e encerramento abrupto em web/Android/iOS. |
| Backup retention documented | PENDENTE | Definir prazo, obrigacoes aplicaveis e como evitar reintroduzir dados excluidos em restauracoes. |
| User can export own data | REPROVADO | Exportacao ainda nao implementada. Definir recurso ou procedimento seguro de atendimento; nao afirmar direito atendido sem processo. |
| User cannot export another user's data | PENDENTE | Depende do fluxo de exportacao. RLS atual nao substitui teste de um exportador ainda inexistente. |
| XSS tested | PENDENTE | E1: diario renderizado como texto, sem HTML executavel identificado. Testar strings sinteticas de markup/script na web e confirmar que nao executam. |
| SQL/NoSQL injection tested | PENDENTE | E1: PostgreSQL parametrizado; NoSQL nao usado. Testar entradas malformadas via endpoints/RPC reais autorizados. |
| CSRF tested | NAO APLICAVEL | E1: operacoes autenticadas revisadas usam Bearer explicito, nao cookie automatico para autorizar API. Reavaliar se introduzir cookies/SSR ou outro backend; XSS continua relevante. |
| SSRF tested where applicable | NAO APLICAVEL | E1: nao identificado fetch servidor de URL arbitraria. Redirect de convite depende da allowlist do Auth e precisa de verificacao separada. |
| File upload tested | PENDENTE | E3: MIME/limite configurados, paths/ownership/RLS testados. E2: falhas no cliente. Validar bytes, limite de 10 MiB, formatos e spoofing de MIME no Storage real. |
| Rate limiting tested | PENDENTE | Testar Auth, funcoes, convites/SMTP e upload com tentativas limitadas; registrar 429/retry e capacidade operacional. |
| HTTPS enforced | APROVADO | E6: HTTP 301 -> HTTPS e HTTPS 200 no dominio web verificado. Nao cobre outros dominios/endpoints nem configuracao nativa. |
| Secrets stored outside repository | PENDENTE | E1: nenhuma credencial identificada no codigo revisado. Conferir secret scanning/historico Git e variaveis administrativas sem imprimir valores. |
| Backups encrypted | PENDENTE | Confirmar configuracao/garantias do provedor e protecao de qualquer copia exportada. |
| Dev/staging/prod separated | PENDENTE | Confirmar inventario de projetos, branches e destinos CI/CD. Nome Dev ou rotulo da CLI nao comprova separacao. |
| SCA executed | APROVADO | E5/E7, antes e depois da correcao, sobre arvore instalada e lockfile. Repetir apos mudancas de dependencias. |
| Critical vulnerabilities = 0 | APROVADO | E7: zero critical no npm audit desta execucao. Nao cobre Deno/npm externo ao lockfile, sistema operacional ou falhas desconhecidas. |
| High vulnerabilities reviewed | APROVADO | E7: zero high/moderate no inventario analisado; advisory low continua aberto abaixo. |
| Collected fields are necessary | PENDENTE | Revisar inventario/finalidades/minimizacao com responsavel. Nao coletar CPF nem dados reais em testes. |
| Terms match actual implementation | PENDENTE | Minuta/previa, sem aceite registrado; revisar recursos, direitos, limitacoes e versao final. |
| Privacy Policy matches actual data flow | PENDENTE | Documento final/base legal/consentimentos e fornecedores ainda dependem de decisao e revisao adequada. |
| Retention implemented | PENDENTE | Exclusao do ambiente ativo implementada; backups, logs, filas pendentes e prazos ainda precisam de politica/processo. |
| Third-party integrations documented | PENDENTE | Stack tecnica descrita em README; completar operadores, regioes, transferencias e responsabilidades contratuais. |
| Security logs available | PENDENTE | Confirmar logs uteis, acesso restrito, ausencia de dados sensiveis e retencao no ambiente real. |
| Incident response procedure implemented | PENDENTE | Definir responsaveis, triagem, contencao, comunicacao e exercicio simulado. |
| Credential rotation procedure tested | PENDENTE | Planejar rotacao no Dev com inventario de consumidores, rollback e verificacao de chaves antigas. Nenhuma rotacao executada. |
| Backup restoration tested | PENDENTE | Restaurar somente em projeto isolado autorizado, verificar RLS/Storage e tratamento das exclusoes posteriores ao backup. |

## Dependencias: inventario inicial e tratamento

Sao **tres advisories distintos**, propagados para 24 entradas no inventario.
Contagem de pacotes nao equivale a 24 vulnerabilidades independentes.

| Severidade npm | Dependencia presente | Advisory | Tratamento |
|---|---|---|---|
| moderate | `glob` 13.0.6 (tambem 10.5.0 em cadeias de teste) | [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4): cancelamento por AbortSignal permite traversal apos timeout | CORRIGIDO em E7: override seletivo para 14.0.4, sem versoes afetadas no lockfile. Nao foi demonstrada exploracao no app. |
| moderate | `minimatch` 10.2.6 (tambem 9.0.9) | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249): amplificacao de globparts / DoS | CORRIGIDO em E7: override seletivo para 11.0.5, SCA/testes/exportacao aprovados. |
| low | `deepmerge` 4.3.1 via configuracao Jest | [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4): prototype poisoning do objeto retornado | Avaliar atualizacao compativel de tooling; manter configuracoes de testes confiaveis. Nao comprovado como caminho acessivel ao usuario do app. |

Evidencia: [package-lock.json](../mobile/package-lock.json), `npm audit` e
`npm ls` (E5/E7). Sugestoes automaticas do npm incluem downgrade de Expo/Jest;
nenhuma foi aplicada. Mesmo `--omit=dev` inclui ferramentas por dependencias
transitivas do Expo; isso nao prova que estejam no JavaScript publicado.
A analise das dependencias npm das Edge Functions exige inventario separado:
o `deno check` confirma tipos/resolucao, nao e SCA dessas dependencias.

### Resultado da correcao escolhida

O usuario autorizou corrigir os dois advisories medios. Os overrides em
[package.json](../mobile/package.json) substituem apenas `glob@>=9.0.0 <=14.0.1`
por `14.0.4` e `minimatch@>=7.0.0 <11.0.1` por `11.0.5`. Nao houve mudanca das
dependencias diretas, versoes do Expo/Jest, produto ou backend.
`path-scurry` passou de 2.0.2 para 3.0.0 como dependencia do `glob` corrigido;
foi adicionada a dependencia `@isaacs/nonrecursive-glob-match` 1.1.0.
O npm deduplicou cadeias repetidas.

Essa descricao registra a correcao inicial E7. Em E8, os seletores por faixa
foram substituidos por overrides explicitos `glob: 14.0.4` e
`minimatch: 11.0.5`, com excecao `test-exclude@^6.0.0` para `glob: 7.2.3` e
`minimatch: 3.1.5`. O npm 10.9.9 do Cloudflare rejeitava o lockfile validado
anteriormente apenas no npm 11; a falha de instalacao antecedia o Expo.
Nao foi removida a protecao contra os advisories nem feito downgrade da stack.
O lockfile regenerado mantem as versoes de todos os pacotes; a mudanca restante
e normalizacao de metadados de dependencias opcionais entre versoes do npm.

Validacao E8 usou a versao exata de Node do log hospedado, 22.23.4, e npm
10.9.9. A instalacao completa (com scripts habilitados) utilizou `--offline`
com artefatos previamente disponiveis no cache local: uma tentativa de baixar
`node-forge` existente retornou HTTP 403 do registry neste ambiente.
Isso limita a verificacao de download online, nao a validacao do lockfile ou
do build. Nenhum registry alternativo foi usado. No Cloudflare, reexecutar
`npm ci` e exportacao apos publicar os arquivos corrigidos.

Essas correcoes estao em novas majors transitivas. A revisao das mudancas
upstream e os testes cobrem as APIs/padroes usados pelo tooling; nao garantem
compatibilidade de toda API antiga. `glob` 7.2.3 / `minimatch` 3.1.5 foram
preservados no preset legado porque usam API diferente e nao estao nas faixas
destes advisories. O aviso de depreciacao do `glob` 7 continua, sem adicionar
um finding ao audit desta execucao.

Depois da instalacao limpa, um smoke test encontrou exatamente 46 arquivos de
teste via glob, conferiu brace matching, exclusao de paths e rejeicao de glob
com signal previamente abortado. Isso testa compatibilidade de uso, nao mede
todos os cenarios de cancelamento/DoS dos advisories. A verificacao de seguranca
tambem conferiu todas as versoes do lockfile contra as faixas vulneraveis.

E7: audit passou de 23 moderate / 1 low para **0 moderate / 9 low**; essas nove
entradas sao propagacao do unico advisory de `deepmerge`, nao nove falhas
independentes novas. Sem dev: **0 moderate / 7 low**. `deepmerge` nao foi
alterado porque ficou fora da correcao escolhida.
As exportacoes Android/iOS geraram bundles, nao builds nativos instalados
nem validacao em aparelhos. Nenhuma publicacao remota foi executada.

Comandos adicionais executados em `mobile/`:

```sh
npm install --ignore-scripts
npm run typecheck
npm test -- --runInBand --coverage --coverageDirectory=/tmp/elaconta-security-coverage
CI=1 npx expo export --platform all --output-dir /tmp/elaconta-security-export
node -e "require('@expo/fingerprint').createFingerprintAsync(process.cwd()).then(f => console.log(f.sources.length)).catch(e => { console.error(e); process.exitCode = 1; })"
npm ci --ignore-scripts
npm audit --json
npm audit --omit=dev --json
npm ls glob minimatch --all
```

Pastas de cobertura/exportacao e arquivos de audit foram temporarios e removidos
apos verificacao. O requisito de Node.js 22+ permanece; esta execucao usou Node
24.22.0. Nao foi executado novamente o backend, pois nenhuma migration/funcao
ou dependencia das Edge Functions foi alterada.

## Roteiro restante no ambiente Dev

Executar com autorizacao, contas descartaveis e conteudo ficticio. Nao compartilhar
senhas, JWTs, links de confirmacao, headers ou dados pessoais como evidencia.
Guardar somente ID do caso, ambiente, resultado esperado/obtido, timestamp e
evidencia sanitizada. Nao testar carga nem exclusao em producao.

### 1. Conferir implantacao e acesso

- Confirmar projeto Dev vinculado, migrations/Edge Functions implantadas e branch
  publicada antes de testar. Comparar RLS/grants remotos com migrations.
- Criar P1/P2 (pacientes), S1/S2 (psicologos), vincular apenas P1 a S1.
  Contas administrativas permanecem no painel, nao no app.
- Conferir MFA, permissoes de operador, URLs de retorno **exatas e confiaveis**
  e SMTP. O convite aceita redirect do cliente e depende da allowlist do Auth.
  Nao usar wildcard amplo em producao.

### 2. Matriz HTTP de autorizacao

Para perfil, pacientes, relatos, dias/contagens, convites, notificacoes, audio e
RPCs: testar anonimo, dono, outra paciente, psicologo vinculado e nao vinculado.
O resultado pode ser 401/403, lista vazia ou erro neutro, conforme contrato;
nunca conteudo/contagem de terceiro. Tentar alterar papel, vinculo e dados de
terceiro diretamente, sem depender de esconder botoes.

Nos endpoints administrativos: sem token, token invalido, papel incorreto,
paciente tentando enviar `userId` de terceiro e senha incorreta na exclusao.
Requests aceitos devem afetar somente os recursos autorizados. Repetir consultas
com JWT previamente emitido apos desvinculo/exclusao iniciada.

### 3. Arquivos, falhas e exclusao

- Upload valido; acima de 10 MiB; formato/MIME nao permitido; arquivo de outro
  tipo com MIME de audio; nome/path de terceiro; overwrite; acesso sem vinculo.
- Criar texto/audio, substituir/remover audio e excluir relato. Conferir arquivo
  anexado e orfao via Storage API; nunca apagar apenas `storage.objects` por SQL.
- Excluir paciente com senha/confirmacao, interromper rede, retomar no app/painel.
  Conferir Auth, banco, Storage, notificacoes e caches; outra paciente permanece.
- Excluir psicologo com pacientes: somente vinculos/conta do profissional acabam;
  pacientes, registros e audios permanecem. Testar tambem exclusao administrativa.
- Verificar upload concorrente e limpeza pendente sem sucesso falso.

### 4. Auth, logs e interface

- Recuperacao e troca de e-mail: dois enderecos, expiracao/reuso, token de outro
  fluxo, sessao substituida e novo login; tentativas controladas de rate limit.
- Usar texto-canario ficticio para verificar logs/analytics; nao procurar dados
  reais. Confirmar que tokens em query strings nao sao armazenados pelos proxies.
- Inserir markup/script como texto ficticio; nao deve executar. Testar tela
  pequena, teclado/leitor de tela, conta compartilhada, background e aparelhos.

### 5. Operacao e privacidade

- Documentar canal de solicitacoes/exportacao, termos/consentimentos, finalidades,
  fornecedores, retencao e acompanhamento de exclusoes pendentes.
- Preparar exercicios separados/autorizados de rotacao, incidente e restauracao.
  Registrar tempo de recuperacao, integridade e como manter exclusoes apos restore.
- Repetir SCA e verificacoes afetadas depois de corrigir alertas. Somente marcar
  criterio completo quando sua evidencia cobrir o ambiente de lancamento.

## Como repetir as verificacoes locais

```sh
cd mobile
npm run typecheck
npm test -- --runInBand
npm audit --json
npm audit --omit=dev --json
npm ls glob minimatch deepmerge --all
cd ..
deno test supabase/functions/invite-patient/invite.test.ts \
  supabase/functions/delete-account/delete.test.ts
deno check supabase/functions/invite-patient/index.ts \
  supabase/functions/delete-account/index.ts
```

SQL: executar os seis scripts em [`supabase/tests`](../supabase/tests/) somente
em PostgreSQL isolado com todas as migrations, roles `anon`, `authenticated`,
`service_role`, `auth.uid()` e Storage de teste. Na execucao E3, o harness
temporario PGlite simulou esses servicos; nao foi introduzida dependencia no
projeto. Nao rodar fixtures de metadados Storage no Supabase hospedado.

`npm audit` retorna codigo nao zero quando ha alertas: isso nao e falha de coleta.
Na coleta inicial E1-E6 nenhuma dependencia foi alterada; E7 registra a correcao
posterior autorizada. Este registro nao substitui
validacao juridica, configuracao do provedor, pentest ou autorizacao de lancamento.
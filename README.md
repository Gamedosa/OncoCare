# OncoCare

Diário online para mulheres em tratamento de câncer de mama, permitindo que registrem relatos diários (emocionais, sintomas, bem-estar) que podem ser acompanhados por um psicólogo responsável.

## Objetivo

Oferecer um espaço seguro e simples para que pacientes registrem seus sentimentos e experiências durante o tratamento, e permitir que psicólogos acompanhem a evolução emocional de suas pacientes, identificando sinais de alerta e oferecendo suporte mais próximo.

## Público-alvo

- **Pacientes**: mulheres em tratamento de câncer de mama.
- **Psicólogos**: profissionais vinculados às pacientes, com acesso aos relatos para acompanhamento.

## Funcionalidades principais (MVP)

- [ ] Cadastro/login de pacientes e psicólogos (perfis distintos). *Login pronto; pacientes entram por convite do psicólogo; contas de psicólogos ainda são criadas manualmente.*
- [x] Vínculo entre paciente e psicólogo responsável por convite, com aceite ou recusa e desvínculo por ambos.
- [x] Criação de relatos diários (texto, áudio ou ambos + humor/escala de bem-estar). *Humor provisório.*
- [x] Envio e reprodução de um áudio por relato (até 10 MiB, sem transcrição automática). *Testado na web; validação nativa pendente.*
- [x] Atualização de relatos existentes pela paciente.
- [x] Exclusão de relatos próprios pela paciente, com confirmação e limpeza pendente do áudio quando necessário.
- [x] Exclusão da própria conta com senha atual; pacientes apagam seus registros, psicólogos preservam as contas e relatos das pacientes.
- [x] Central de notificações em Conta: convites, vínculos, novos relatos e avisos administrativos, com indicação de leitura.
- [x] Histórico de relatos da paciente.
- [x] Psicólogo visualiza lista de pacientes vinculadas (somente leitura).
- [x] Psicólogo lê e ouve os relatos das pacientes vinculadas (somente leitura).
- [ ] Psicólogo adicionar notas no perfil da paciente (futuro, pós-MVP).
- [ ] Alertas clínicos para o psicólogo em casos de sinais preocupantes (futuro; não fazem parte da central de notificações).

## Casos de uso

### Paciente

- Criar relato diário.
- Enviar, ouvir, substituir e remover o áudio do próprio relato.
- Ver histórico de relatos.
- Atualizar (editar) um relato existente.
- Excluir um relato próprio.
- Aceitar ou recusar convite de acompanhamento de um psicólogo.
- Encerrar o vínculo e continuar usando o diário sem psicólogo.
- Excluir a própria conta e todos os seus relatos e áudios.
- Consultar notificações e marcá-las como lidas.

### Psicólogo

- Convidar paciente por e-mail e cancelar ou reenviar convites pendentes.
- Ver lista de pacientes vinculadas.
- Ler e ouvir relatos das pacientes vinculadas.
- Encerrar o vínculo com uma paciente.
- Excluir a própria conta sem apagar contas, relatos ou áudios das pacientes.
- Consultar notificações e marcá-las como lidas.

No MVP o psicólogo tem papel **somente de acompanhamento**, sem ações de escrita. A capacidade de adicionar notas no perfil da paciente fica para uma versão futura.

## Stack tecnológica

| Camada | Escolha | Observações |
|---|---|---|
| App | Expo (React Native) + TypeScript | Android, iOS e web a partir do mesmo código. Expo Router, TanStack Query e zod. Ver [mobile/README.md](mobile/README.md). |
| Backend/API | Supabase como BaaS | O app acessa o Supabase diretamente; a autorização fica no RLS. Sem API própria; Edge Functions `invite-patient` e `delete-account` atendem operações que exigem a API administrativa do Auth. |
| Banco de dados | PostgreSQL (via Supabase) | Relacional, para suportar vínculos e consultas entre paciente/psicólogo/relatos. |
| Arquivos de áudio | Supabase Storage | Bucket privado com RLS, sem URLs públicas. |
| Autenticação | Supabase Auth | E-mail e senha; o papel (paciente/psicólogo) vem de `profiles`. |

## Modelo de dados (rascunho inicial)

- **User** (base): id, email, senha (hash), papel (`paciente` | `psicologo`), criado_em.
- **PatientProfile**: user_id, nome, data_nascimento, psicologo_id (vínculo).
- **PsychologistProfile**: user_id, nome, registro_profissional (CRP).
- **DiaryEntry**: id, paciente_id, texto opcional, audio_object_id opcional, audio_path derivado pelo servidor, humor/escala, criado_em, atualizado_em. Exige texto não vazio ou áudio; no máximo um áudio por relato.
- **PatientInvitation**: id, psicologo_id, paciente_id, email, nome_paciente, status (`pendente` | `aceito` | `recusado` | `cancelado`), expira_em (7 dias), criado_em, encerrado_em. No máximo um convite pendente por psicólogo e paciente.
- **PsychologistNote** (futuro, pós-MVP): id, paciente_id, psicologo_id, nota, criado_em.

## Privacidade e segurança

- Dados de saúde/emocionais são sensíveis (LGPD) — necessário criptografia em trânsito (HTTPS) e em repouso, controle de acesso por papel (RLS) e minimização de dados coletados.
- Psicólogo só deve acessar relatos de pacientes explicitamente vinculadas a ele. O vínculo só começa quando a própria paciente aceita o convite; convites pendentes não dão acesso a perfil ou relatos.
- Avaliar necessidade de consentimento explícito da paciente para compartilhamento dos relatos.
- Áudios seguem as mesmas restrições dos relatos. O app deve informar que o psicólogo vinculado poderá ouvi-los antes do envio; consentimento/base legal e política de retenção precisam ser definidos antes do uso com pacientes reais.

## Status do projeto

Em desenvolvimento. O app em [mobile/](mobile/) (Expo) já tem login com guardas por papel, os relatos de texto da paciente (histórico, novo relato, detalhe e edição), as telas somente leitura do psicólogo e a tela de conta. Veja como rodar e a arquitetura em [mobile/README.md](mobile/README.md).

A recuperação de senha por e-mail está implementada, com link de uso único, confirmação da nova senha e encerramento das sessões. Antes de testar, configure o template de recuperação e as URLs de retorno no Supabase, conforme [mobile/README.md](mobile/README.md#configurar-a-recuperação-de-senha). Validação manual por e-mail e aparelhos ainda pendente.

O player está integrado ao detalhe dos dois papéis, com download autenticado. A paciente pode gravar e enviar áudio em novos relatos, adicioná-lo a relatos de texto e substituir/remover o áudio na edição. Gravação, envio e reprodução pelo psicólogo foram testados manualmente na web; os fluxos de substituição/remoção ainda precisam de validação manual. Veja o [fluxo de áudio e validação](Docs/audio.md).

O convite de pacientes está implementado: o psicólogo informa nome e e-mail; contas novas recebem um link para criar a senha; contas existentes veem o convite no app. A paciente aceita (transferindo o vínculo, se já houver outro psicólogo) ou recusa e continua usando o diário. Ao aceitar, compartilha também os relatos e áudios anteriores. Convites valem 7 dias. Não há CPF nem senha provisória. O fluxo principal de convite, relato com áudio e acesso do psicólogo foi testado na web com uma conta de teste. Configuração no Supabase em [mobile/README.md](mobile/README.md#configurar-convites-de-pacientes).

O desvínculo por qualquer uma das partes requer a aplicação da migration `20261107010000_unlink_patient.sql` no ambiente correspondente; sua validação manual após publicação ainda está pendente.

A exclusão de conta e a central de notificações ampliam o MVP por solicitação explícita. Requerem as migrations `20261107030000_account_deletion.sql` e `20261107040000_notifications.sql`, além da publicação de `delete-account`. A exclusão exige senha atual e confirmação; apaga os dados no ambiente ativo e remove arquivos pela API do Storage antes de excluir o usuário do Auth. Falhas de limpeza são informadas e permitem nova tentativa, inclusive pelo administrador no painel. Ao excluir um psicólogo, somente seus vínculos são removidos; pacientes e seus diários permanecem. Procedimento administrativo e publicação em [mobile/README.md](mobile/README.md#exclusão-de-contas-e-notificações).

Notificações são internas ao app, sem push/e-mail ou classificação de risco. Não incluem nomes, e-mails, texto, humor ou áudio dos relatos. A paciente sem psicólogo vê “Sem vínculo com psicólogo” em Conta. Backups, logs e cópias previamente obtidas não são apagados instantaneamente pelo app; política de retenção e procedimentos operacionais continuam pendentes.

As telas, fluxos e estados do aplicativo para o protótipo no Figma estão em [Docs/telas.md](Docs/telas.md).

## Decisões confirmadas para o banco

- Banco: PostgreSQL via Supabase.
- Relação: cada paciente pode ter no máximo um psicólogo vinculado; cada psicólogo pode acompanhar várias pacientes.
- Contas usam UUID (`auth.uid()`) como chave interna e e-mail para login e convites; CPF não é coletado. Pacientes são criadas por convite do psicólogo (Edge Function com service role); o vínculo é gravado apenas pela função `accept_patient_invitation`, executada pela própria paciente. Criação de perfis e vínculos nunca ocorre por autoatribuição no cliente.
- Aceitar um convite substitui o vínculo anterior; o novo psicólogo pode acessar os relatos anteriores e os futuros enquanto o vínculo existir. Recusar mantém o vínculo anterior, se houver. Paciente e psicólogo podem encerrar o vínculo; o acesso futuro pelo aplicativo é bloqueado e o diário permanece com a paciente. Cópias previamente obtidas não podem ser revogadas.
- A escala e os limites do campo de humor continuam a definir; a migração inicial não presume uma faixa numérica.
- No MVP, pacientes criam, consultam e editam seus relatos; psicólogos vinculados podem apenas consultar.
- Relatos podem conter texto, áudio ou ambos. Um áudio por relato, até 10 MiB (10.485.760 bytes), sem transcrição automática. Áudios ficam no bucket privado `diary-audio`; a paciente pode substituí-los/removê-los, desde que o relato não fique vazio.

## Roadmap

1. Definir documentação técnica e modelo de dados detalhado.
2. Prototipar autenticação e papéis de usuário.
3. Implementar criação e listagem de relatos (paciente).
4. Implementar painel do psicólogo.
5. Adicionar melhorias de UX e alertas.

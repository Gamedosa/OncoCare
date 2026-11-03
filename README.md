# OncoCare

Diário online para mulheres em tratamento de câncer de mama, permitindo que registrem relatos diários (emocionais, sintomas, bem-estar) que podem ser acompanhados por um psicólogo responsável.

## Objetivo

Oferecer um espaço seguro e simples para que pacientes registrem seus sentimentos e experiências durante o tratamento, e permitir que psicólogos acompanhem a evolução emocional de suas pacientes, identificando sinais de alerta e oferecendo suporte mais próximo.

## Público-alvo

- **Pacientes**: mulheres em tratamento de câncer de mama.
- **Psicólogos**: profissionais vinculados às pacientes, com acesso aos relatos para acompanhamento.

## Funcionalidades principais (MVP)

- [ ] Cadastro/login de pacientes e psicólogos (perfis distintos). *Login pronto; cadastro a definir.*
- [ ] Vínculo entre paciente e psicólogo responsável. *Feito manualmente no banco; fluxo a definir.*
- [x] Criação de relatos diários (texto, áudio ou ambos + humor/escala de bem-estar). *Humor provisório; gravação/envio ainda requerem validação em aparelhos reais.*
- [ ] Envio e reprodução de um áudio por relato (até 10 MiB, sem transcrição automática).
- [x] Atualização de relatos existentes pela paciente.
- [x] Histórico de relatos da paciente.
- [x] Psicólogo visualiza lista de pacientes vinculadas (somente leitura).
- [ ] Psicólogo lê e ouve os relatos das pacientes vinculadas (somente leitura). *Leitura pronta; áudio pendente.*
- [ ] Psicólogo adicionar notas no perfil da paciente (futuro, pós-MVP).
- [ ] Notificações/alertas para o psicólogo em casos de sinais preocupantes (futuro).

## Casos de uso

### Paciente

- Criar relato diário.
- Enviar, ouvir, substituir e remover o áudio do próprio relato.
- Ver histórico de relatos.
- Atualizar (editar) um relato existente.

### Psicólogo

- Ver lista de pacientes vinculadas.
- Ler e ouvir relatos das pacientes vinculadas.

No MVP o psicólogo tem papel **somente de acompanhamento**, sem ações de escrita. A capacidade de adicionar notas no perfil da paciente fica para uma versão futura.

## Stack tecnológica

| Camada | Escolha | Observações |
|---|---|---|
| App | Expo (React Native) + TypeScript | Android, iOS e web a partir do mesmo código. Expo Router, TanStack Query e zod. Ver [mobile/README.md](mobile/README.md). |
| Backend/API | Supabase como BaaS | O app acessa o Supabase diretamente; a autorização fica no RLS. Sem API própria no MVP. |
| Banco de dados | PostgreSQL (via Supabase) | Relacional, para suportar vínculos e consultas entre paciente/psicólogo/relatos. |
| Arquivos de áudio | Supabase Storage | Bucket privado com RLS, sem URLs públicas. |
| Autenticação | Supabase Auth | E-mail e senha; o papel (paciente/psicólogo) vem de `profiles`. |

## Modelo de dados (rascunho inicial)

- **User** (base): id, email, senha (hash), papel (`paciente` | `psicologo`), criado_em.
- **PatientProfile**: user_id, nome, data_nascimento, psicologo_id (vínculo).
- **PsychologistProfile**: user_id, nome, registro_profissional (CRP).
- **DiaryEntry**: id, paciente_id, texto opcional, audio_object_id opcional, audio_path derivado pelo servidor, humor/escala, criado_em, atualizado_em. Exige texto não vazio ou áudio; no máximo um áudio por relato.
- **PsychologistNote** (futuro, pós-MVP): id, paciente_id, psicologo_id, nota, criado_em.

## Privacidade e segurança

- Dados de saúde/emocionais são sensíveis (LGPD) — necessário criptografia em trânsito (HTTPS) e em repouso, controle de acesso por papel (RLS) e minimização de dados coletados.
- Psicólogo só deve acessar relatos de pacientes explicitamente vinculadas a ele.
- Avaliar necessidade de consentimento explícito da paciente para compartilhamento dos relatos.
- Áudios seguem as mesmas restrições dos relatos. O app deve informar que o psicólogo vinculado poderá ouvi-los antes do envio; consentimento/base legal e política de retenção precisam ser definidos antes do uso com pacientes reais.

## Status do projeto

Em desenvolvimento. O app em [mobile/](mobile/) (Expo) já tem login com guardas por papel, os relatos de texto da paciente (histórico, novo relato, detalhe e edição), as telas somente leitura do psicólogo e a tela de conta. Veja como rodar e a arquitetura em [mobile/README.md](mobile/README.md).

O player está integrado ao detalhe dos dois papéis, com download autenticado. A paciente pode gravar e enviar áudio em novos relatos, adicioná-lo a relatos de texto e substituir/remover o áudio na edição. O fluxo anterior de gravação/envio foi testado manualmente pelo usuário; os novos fluxos de substituição/remoção passaram nos testes automatizados e no typecheck, mas ainda precisam de validação manual. Veja o [fluxo de áudio e validação](Docs/audio.md).

As telas, fluxos e estados do aplicativo para o protótipo no Figma estão em [Docs/telas.md](Docs/telas.md).

## Decisões confirmadas para o banco

- Banco: PostgreSQL via Supabase.
- Relação: cada paciente pode ter no máximo um psicólogo vinculado; cada psicólogo pode acompanhar várias pacientes.
- Credenciais e fluxo de autenticação continuam a definir. A migração inicial usa UUIDs de usuário compatíveis com `auth.uid()`; criação de perfis e vínculos deve ocorrer por operação confiável, nunca por autoatribuição no cliente.
- A escala e os limites do campo de humor continuam a definir; a migração inicial não presume uma faixa numérica.
- No MVP, pacientes criam, consultam e editam seus relatos; psicólogos vinculados podem apenas consultar.
- Relatos podem conter texto, áudio ou ambos. Um áudio por relato, até 10 MiB (10.485.760 bytes), sem transcrição automática. Áudios ficam no bucket privado `diary-audio`; a paciente pode substituí-los/removê-los, desde que o relato não fique vazio.

## Roadmap

1. Definir documentação técnica e modelo de dados detalhado.
2. Prototipar autenticação e papéis de usuário.
3. Implementar criação e listagem de relatos (paciente).
4. Implementar painel do psicólogo.
5. Adicionar melhorias de UX e alertas.

# OncoCare

Diário online para mulheres em tratamento de câncer de mama, permitindo que registrem relatos diários (emocionais, sintomas, bem-estar) que podem ser acompanhados por um psicólogo responsável.

## Objetivo

Oferecer um espaço seguro e simples para que pacientes registrem seus sentimentos e experiências durante o tratamento, e permitir que psicólogos acompanhem a evolução emocional de suas pacientes, identificando sinais de alerta e oferecendo suporte mais próximo.

## Público-alvo

- **Pacientes**: mulheres em tratamento de câncer de mama.
- **Psicólogos**: profissionais vinculados às pacientes, com acesso aos relatos para acompanhamento.

## Funcionalidades principais (MVP)

- [ ] Cadastro/login de pacientes e psicólogos (perfis distintos).
- [ ] Vínculo entre paciente e psicólogo responsável.
- [ ] Criação de relatos diários (texto livre + humor/escala de bem-estar).
- [ ] Atualização de relatos existentes pela paciente.
- [ ] Histórico de relatos da paciente.
- [ ] Psicólogo visualiza lista de pacientes vinculadas (somente leitura).
- [ ] Psicólogo lê os relatos das pacientes vinculadas (somente leitura).
- [ ] Psicólogo adicionar notas no perfil da paciente (futuro, pós-MVP).
- [ ] Notificações/alertas para o psicólogo em casos de sinais preocupantes (futuro).

## Casos de uso

### Paciente

- Criar relato diário.
- Ver histórico de relatos.
- Atualizar (editar) um relato existente.

### Psicólogo

- Ver lista de pacientes vinculadas.
- Ler relatos das pacientes vinculadas.

No MVP o psicólogo tem papel **somente de acompanhamento**, sem ações de escrita. A capacidade de adicionar notas no perfil da paciente fica para uma versão futura.

## Stack tecnológica

| Camada | Escolha | Observações |
|---|---|---|
| App | React Native + TypeScript | Multiplataforma (iOS/Android), tipagem estática para maior segurança em dados sensíveis. |
| Backend/API | A definir (Node.js/NestJS ou Supabase como BaaS) | Ver seção de banco de dados. |
| Banco de dados | PostgreSQL (via Supabase) | Relacional, para suportar vínculos e consultas entre paciente/psicólogo/relatos. |
| Autenticação | Supabase Auth (ou similar) | Suporte a diferentes papéis (paciente/psicólogo). |

## Modelo de dados (rascunho inicial)

- **User** (base): id, email, senha (hash), papel (`paciente` | `psicologo`), criado_em.
- **PatientProfile**: user_id, nome, data_nascimento, psicologo_id (vínculo).
- **PsychologistProfile**: user_id, nome, registro_profissional (CRP).
- **DiaryEntry**: id, paciente_id, texto, humor/escala, criado_em, atualizado_em.
- **PsychologistNote** (futuro, pós-MVP): id, paciente_id, psicologo_id, nota, criado_em.

## Privacidade e segurança

- Dados de saúde/emocionais são sensíveis (LGPD) — necessário criptografia em trânsito (HTTPS) e em repouso, controle de acesso por papel (RLS) e minimização de dados coletados.
- Psicólogo só deve acessar relatos de pacientes explicitamente vinculadas a ele.
- Avaliar necessidade de consentimento explícito da paciente para compartilhamento dos relatos.

## Status do projeto

Em fase inicial de planejamento e documentação. Ainda não há código de aplicação.

## Roadmap

1. Definir documentação técnica e modelo de dados detalhado.
2. Prototipar autenticação e papéis de usuário.
3. Implementar criação e listagem de relatos (paciente).
4. Implementar painel do psicólogo.
5. Adicionar melhorias de UX e alertas.

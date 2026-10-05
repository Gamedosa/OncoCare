# Instrucoes para agentes de IA

## Contexto do projeto

OncoCare e um diario online para mulheres em tratamento de cancer de mama. O MVP deve permitir que pacientes registrem relatos diarios sobre experiencias, sintomas, humor e bem-estar, e que psicologos vinculados acompanhem esses relatos.

O projeto esta em fase de planejamento e ainda nao possui codigo de aplicacao. Consulte o README.md e a documentacao em Docs/ antes de propor ou implementar mudancas. Nao trate escolhas marcadas como "a definir" ou itens futuros como decisoes ja tomadas.

## Regras de produto

- Existem dois papeis: paciente e psicologo.
- A paciente pode criar, consultar e editar os proprios relatos.
- No MVP, o psicologo pode consultar apenas pacientes explicitamente vinculadas a ele e ler seus relatos; nao pode editar relatos nem escrever notas.
- Notas de psicologo e alertas/notificacoes estao fora do MVP, salvo solicitacao explicita.
- Preserve a privacidade, a autonomia e a linguagem respeitosa ao lidar com pacientes e informacoes de saude.

## Seguranca e dados

- Relatos e dados emocionais sao dados sensiveis. Minimize os dados coletados e considere a LGPD em decisoes de produto e implementacao.
- Qualquer acesso a dados deve ser autorizado no servidor/banco, nao apenas ocultado na interface.
- Psicologos nunca devem acessar pacientes ou relatos sem vinculo autorizado. Pacientes devem acessar apenas os proprios dados.
- Nao inclua dados reais de pacientes, credenciais ou segredos em codigo, exemplos, fixtures ou logs.
- Ao propor armazenamento, autenticacao ou compartilhamento, explicite controles de acesso, protecao em transito e em repouso e necessidade de consentimento.

## Diretrizes de trabalho

- Antes de implementar, confira as decisoes existentes no README.md e nos diagramas em Docs/diagrams/.
- Mantenha as mudancas pequenas e alinhadas ao escopo do MVP; sinalize quando um pedido ampliar o escopo ou contrariar as regras acima.
- A stack descrita no README e uma direcao inicial: React Native com TypeScript e PostgreSQL via Supabase; backend/API e autenticacao ainda podem exigir decisao. Nao introduza servicos ou dependencias sem necessidade.
- Ao adicionar codigo, siga os padroes ja existentes no repositorio. Como ainda nao ha codigo de aplicacao, proponha a estrutura minima necessaria em vez de presumir convencoes.
- Valide mudancas com os testes ou verificacoes disponiveis e informe claramente o que nao foi possivel validar.
- Mantenha a documentacao atualizada quando uma decisao de produto ou tecnica for tomada.
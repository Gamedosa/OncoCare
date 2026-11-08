# Privacidade, segurança e requisitos legais

## 1. Objetivo deste documento

Este documento define requisitos jurídicos, éticos e técnicos para o
desenvolvimento de um diário online destinado a mulheres em tratamento
de câncer de mama.

A plataforma permite o registro de experiências em texto e áudio e,
quando autorizado pela usuária, o compartilhamento desses registros com
um profissional de Psicologia.

A aplicação é uma ferramenta de apoio e organização de registros pessoais.
Ela não realiza diagnóstico, prescrição, atendimento de emergência ou
tratamento médico ou psicológico, e não substitui psicoterapia ou
acompanhamento oncológico.

> Este documento orienta o desenvolvimento, mas não substitui validação
> jurídica, ética ou profissional antes da disponibilização pública do sistema.

---

## 2. Legislação e normas consideradas

### 2.1. Lei Geral de Proteção de Dados Pessoais — LGPD
**Lei nº 13.709/2018**

A LGPD regula o tratamento de dados pessoais, inclusive em meios digitais.
No projeto, registros sobre diagnóstico, tratamento, sintomas, estado
emocional, consultas, medicamentos e acompanhamento psicológico podem
conter dados pessoais sensíveis relacionados à saúde.

Requisitos:

- [ ] Mapear todos os dados coletados, armazenados, consultados,
      compartilhados e excluídos.
- [ ] Definir uma finalidade específica para cada dado coletado.
- [ ] Coletar somente os dados estritamente necessários.
- [ ] Definir e documentar a base legal aplicável a cada operação.
- [ ] Não utilizar consentimento como autorização genérica para todas
      as operações.
- [ ] Informar, em linguagem clara, como os dados são utilizados.
- [ ] Permitir que a usuária consulte seus dados.
- [ ] Permitir correção dos dados cadastrais.
- [ ] Permitir exportação dos registros em formato legível.
- [x] Permitir exclusão da própria conta e dos dados no ambiente ativo com senha e confirmação; administrador também pode excluir pelo painel. Retenção de backups/logs continua pendente.
- [ ] Informar quais dados podem precisar ser mantidos por obrigação legal.
- [ ] Definir prazo ou critério de retenção para dados, logs e backups.
- [ ] Identificar controlador, operadores e fornecedores envolvidos.
- [ ] Documentar eventual transferência internacional de dados.
- [ ] Manter canal para solicitações relacionadas à privacidade.
- [ ] Manter procedimento de resposta a incidentes de segurança.
- [ ] Não utilizar os dados para discriminação.
- [ ] Não vender ou compartilhar dados de saúde para publicidade.
- [ ] Não utilizar registros para treinamento de inteligência artificial
      sem análise jurídica, ética e consentimento ou base legal apropriada.

---

### 2.2. Marco Civil da Internet
**Lei nº 12.965/2014**

O Marco Civil estabelece princípios, garantias, direitos e deveres para
o uso da internet no Brasil.

Requisitos:

- [ ] Proteger a privacidade e a confidencialidade dos registros.
- [ ] Utilizar medidas técnicas compatíveis com boas práticas de segurança.
- [ ] Informar claramente as condições de funcionamento da aplicação.
- [ ] Diferenciar conteúdo do diário, dados cadastrais e registros técnicos.
- [ ] Coletar e conservar somente os registros técnicos necessários.
- [ ] Definir política de retenção para registros de acesso à aplicação.
- [ ] Restringir o acesso aos registros técnicos a pessoas autorizadas.
- [ ] Não entregar conteúdo ou dados a terceiros sem base legal,
      autorização válida ou ordem judicial aplicável.
- [ ] Manter procedimento para atendimento de solicitações legais.
- [ ] Registrar alterações importantes dos Termos de Uso e da
      Política de Privacidade.

---

### 2.3. Código de Defesa do Consumidor — CDC
**Lei nº 8.078/1990**

O CDC deve ser considerado quando a plataforma for oferecida como
produto ou serviço ao usuário, especialmente em uma operação comercial,
assinatura, modelo freemium ou monetização indireta.

Requisitos:

- [ ] Apresentar informações claras sobre funcionalidades e limitações.
- [ ] Não prometer benefício terapêutico ou clínico não demonstrado.
- [ ] Informar preços, cobranças, renovação e cancelamento, se aplicável.
- [ ] Não utilizar cláusulas que eliminem direitos obrigatórios da usuária.
- [ ] Não declarar que a plataforma nunca será responsável por qualquer dano.
- [ ] Evitar alterações contratuais relevantes sem comunicação prévia.
- [ ] Disponibilizar canal de contato e suporte.
- [ ] Tratar erros, indisponibilidades e falhas de maneira transparente.
- [ ] Não empregar interfaces manipulativas para obter consentimento,
      dificultar cancelamento ou impedir exclusão da conta.

---

### 2.4. Lei Brasileira de Inclusão — LBI
**Lei nº 13.146/2015**

A aplicação deve buscar acesso em condições de igualdade e evitar
barreiras digitais para pessoas com deficiência.

Requisitos de acessibilidade:

- [ ] Adotar WCAG 2.2 nível AA como referência técnica.
- [ ] Garantir navegação por teclado.
- [ ] Utilizar HTML semântico.
- [ ] Fornecer rótulos acessíveis em campos e controles.
- [ ] Garantir compatibilidade com leitores de tela.
- [ ] Manter contraste adequado entre texto e fundo.
- [ ] Não transmitir informações somente por cores.
- [ ] Permitir ampliação do texto sem perda de conteúdo.
- [ ] Exibir mensagens de erro claras e associadas ao campo correspondente.
- [ ] Fornecer transcrição ou alternativa textual quando necessário.
- [ ] Testar fluxos principais com ferramentas automáticas e avaliação manual.
- [ ] Considerar fadiga, limitações motoras, dificuldades visuais e
      alterações cognitivas que possam ocorrer durante o tratamento.

---

### 2.5. Código Civil e direitos da personalidade

O sistema deve preservar privacidade, intimidade, honra, imagem e demais
direitos da personalidade.

Requisitos:

- [ ] Tratar o conteúdo do diário como pertencente à usuária.
- [ ] Não reivindicar propriedade sobre os textos e áudios armazenados.
- [ ] Solicitar apenas a licença técnica mínima necessária para hospedar,
      processar, reproduzir e disponibilizar o conteúdo para a própria usuária.
- [ ] Não publicar depoimentos, imagens ou relatos sem autorização específica.
- [ ] Não permitir acesso de familiar, cuidador ou profissional sem
      autorização válida da usuária.
- [ ] Revogar o acesso compartilhado quando solicitado pela usuária.

---

### 2.6. Lei nº 13.787/2018 — prontuário de paciente

Esta lei deverá ser reavaliada se o diário for integrado a clínicas,
hospitais ou prontuários eletrônicos, ou se passar a ser utilizado como
documentação clínica oficial.

Enquanto o sistema for apenas um diário pessoal de apoio:

- [ ] Não apresentar o sistema como prontuário médico.
- [ ] Não permitir que registros profissionais transformem automaticamente
      o diário em documentação clínica.
- [ ] Não afirmar que os registros possuem valor de prontuário.
- [ ] Manter clara separação entre diário pessoal e prontuário institucional.

Se houver integração clínica, deverão ser avaliados requisitos adicionais
de integridade, autenticidade, confidencialidade, guarda e valor probatório.

---

### 2.7. Telessaúde e normas profissionais

Essas normas deverão ser analisadas se a plataforma oferecer atendimento
médico, psicológico ou de outro profissional de saúde.

Não implementar sem análise específica:

- [ ] diagnóstico automatizado;
- [ ] recomendação individual de tratamento;
- [ ] prescrição;
- [ ] triagem clínica;
- [ ] atendimento psicológico pela plataforma;
- [ ] teleconsulta;
- [ ] interpretação clínica automatizada dos relatos;
- [ ] alertas apresentados como conclusão profissional;
- [ ] comunicação que apresente o sistema como psicoterapia.

Se essas funcionalidades forem adicionadas, deverão ser examinadas a
legislação de telessaúde e as normas do conselho profissional competente.

---

### 2.8. Pesquisa com seres humanos

Caso o sistema seja avaliado por mulheres com câncer de mama, profissionais
de saúde ou outros participantes, o Termo de Uso não substitui o Termo de
Consentimento Livre e Esclarecido.

Requisitos da pesquisa:

- [ ] Avaliar a necessidade de submissão ao sistema CEP/Conep.
- [ ] Utilizar Termo de Consentimento Livre e Esclarecido quando aplicável.
- [ ] Separar o consentimento para pesquisa da aceitação dos Termos de Uso.
- [ ] Informar objetivos, procedimentos, riscos e benefícios esperados.
- [ ] Informar que a participação é voluntária.
- [ ] Permitir desistência sem penalização.
- [ ] Definir quem poderá acessar os dados da pesquisa.
- [ ] Definir prazo e local de armazenamento.
- [ ] Utilizar anonimização ou pseudonimização sempre que possível.
- [ ] Não utilizar registros reais do diário em apresentações ou no TCC
      sem autorização ética e jurídica adequada.
- [ ] Não utilizar entradas de produção como massa de testes.
- [ ] Definir procedimento para situações de sofrimento emocional observadas
      durante entrevistas ou testes, sem prometer monitoramento clínico contínuo.

---

## 3. Requisitos funcionais de privacidade

### RF-PRIV-001 — Controle dos registros

A usuária deve poder criar, consultar, editar e excluir seus próprios
registros.

### RF-PRIV-002 — Exportação

A usuária deve poder exportar seus registros em formato legível e acessível.

### RF-PRIV-003 — Exclusão da conta

A aplicação deve disponibilizar funcionalidade para solicitação de exclusão
da conta e informar o efeito dessa operação sobre dados ativos e backups.

### RF-PRIV-004 — Compartilhamento controlado

O compartilhamento com profissional deve:

1. permanecer desativado por padrão;
2. depender de ação explícita da usuária;
3. identificar quem receberá acesso;
4. informar quais registros serão compartilhados;
5. permitir a escolha do período ou conteúdo;
6. permitir revogação do acesso;
7. registrar concessão e revogação;
8. não conceder acesso retroativo sem informação clara.

### RF-PRIV-005 — Painel de privacidade

A aplicação deve oferecer um local no qual a usuária consiga:

- consultar configurações de privacidade;
- revisar compartilhamentos ativos;
- revogar acessos;
- exportar dados;
- solicitar exclusão;
- acessar a Política de Privacidade;
- acessar os Termos de Uso;
- entrar em contato com o responsável pela aplicação.

### RF-PRIV-006 — Consentimentos

Quando consentimento for a base legal utilizada, o sistema deve registrar:

- versão do texto apresentado;
- finalidade informada;
- data e horário;
- decisão da usuária;
- revogação posterior.

A revogação deve ser tão acessível quanto a concessão.

---

## 4. Requisitos de segurança

### Autenticação e autorização

- [ ] Armazenar senhas somente com algoritmo apropriado de hash, como
      Argon2id ou bcrypt, com configuração atualizada.
- [ ] Nunca armazenar senhas em texto simples.
- [ ] Implementar recuperação de senha com token de uso único e expiração.
- [ ] Invalidar sessões após alteração ou recuperação da senha.
- [ ] Aplicar limitação de tentativas em login e recuperação de conta.
- [ ] Utilizar autorização no servidor para cada acesso a registros.
- [ ] Impedir enumeração de contas por mensagens de login ou recuperação.
- [ ] Disponibilizar autenticação multifator, pelo menos para profissionais
      e administradores.
- [ ] Aplicar menor privilégio a usuários, profissionais e administradores.

### Criptografia

- [ ] Utilizar HTTPS/TLS em todas as comunicações.
- [ ] Criptografar banco de dados, objetos de áudio e backups em repouso.
- [ ] Gerenciar chaves e segredos fora do código-fonte.
- [ ] Não incluir credenciais em commits, imagens de container ou logs.
- [ ] Definir procedimento para rotação de chaves e credenciais.
- [ ] Avaliar criptografia em nível de aplicação para o conteúdo do diário.

### Logs e auditoria

- [ ] Registrar acesso administrativo a dados sensíveis.
- [ ] Registrar concessão e revogação de compartilhamentos.
- [ ] Registrar exportações e solicitações de exclusão.
- [ ] Não registrar conteúdo do diário em logs de aplicação.
- [ ] Não registrar tokens, senhas ou áudios em logs.
- [ ] Evitar dados sensíveis em ferramentas de monitoramento.
- [ ] Proteger logs contra alteração e acesso indevido.
- [ ] Definir prazo de retenção dos logs.

### Upload e armazenamento de áudio

- [ ] Validar tipo, tamanho e formato dos arquivos.
- [ ] Gerar nomes internos não previsíveis.
- [ ] Armazenar arquivos fora de diretórios públicos.
- [ ] Impedir execução de arquivos enviados.
- [ ] Utilizar URLs temporárias ou acesso autenticado.
- [ ] Aplicar verificação contra conteúdo malicioso.
- [ ] Excluir metadados desnecessários quando tecnicamente apropriado.
- [ ] Garantir que a exclusão do registro inclua o áudio correspondente,
      conforme a política de retenção.

### Banco de dados e APIs

- [ ] Utilizar consultas parametrizadas.
- [ ] Validar entradas no servidor.
- [ ] Implementar proteção contra IDOR/BOLA.
- [ ] Não confiar em identificadores enviados pelo cliente para autorização.
- [ ] Aplicar controle de acesso por objeto.
- [ ] Limitar volume e frequência de requisições.
- [ ] Evitar exposição excessiva de dados nas respostas.
- [ ] Utilizar paginação e filtros seguros.
- [ ] Desabilitar mensagens detalhadas de erro em produção.

### Desenvolvimento seguro

- [ ] Utilizar OWASP ASVS como referência de verificação.
- [ ] Utilizar OWASP Top 10 para revisão das principais classes de risco.
- [ ] Executar análise de dependências.
- [ ] Manter dependências e imagens base atualizadas.
- [ ] Executar análise estática do código.
- [ ] Implementar revisão obrigatória de código em funções sensíveis.
- [ ] Separar ambientes de desenvolvimento, teste e produção.
- [ ] Não copiar dados reais de produção para desenvolvimento.
- [ ] Utilizar dados sintéticos nos testes.
- [ ] Executar testes de autorização entre contas distintas.
- [ ] Criar modelo de ameaças para os fluxos de diário e compartilhamento.

---

## 5. Requisitos de retenção e exclusão

- [ ] Criar tabela de retenção por categoria de dado.
- [ ] Definir prazo para contas inativas.
- [ ] Definir prazo para tokens e sessões.
- [ ] Definir prazo para logs de aplicação e segurança.
- [ ] Definir ciclo de retenção dos backups.
- [ ] Informar que a exclusão de backups pode seguir o ciclo técnico de retenção.
- [ ] Bloquear o uso normal de dados que aguardam eliminação em backup.
- [ ] Excluir arquivos de áudio juntamente com seus registros.
- [ ] Documentar exceções de retenção decorrentes de obrigação legal.
- [ ] Testar periodicamente o processo de exclusão.

Exemplo de inventário:

| Categoria | Finalidade | Base legal | Retenção | Acesso |
|---|---|---|---|---|
| Dados cadastrais | Criar e administrar a conta | A definir | A definir | Usuária e suporte autorizado |
| Texto do diário | Disponibilizar o diário | A definir | Até exclusão ou prazo definido | Usuária e pessoa autorizada |
| Áudio | Permitir registro por voz | A definir | Até exclusão ou prazo definido | Usuária e pessoa autorizada |
| Logs de acesso | Segurança e obrigações aplicáveis | A definir | A definir | Equipe autorizada |
| Dados da pesquisa | Avaliação acadêmica | A definir no protocolo | A definir no protocolo | Equipe de pesquisa |

> Os valores “A definir” precisam ser resolvidos antes da disponibilização
> do sistema para participantes ou usuários reais.

---

## 6. Política de Privacidade

A aplicação deve possuir uma Política de Privacidade separada dos
Termos de Uso.

Conteúdo mínimo:

- [ ] identidade e contato do responsável pelo tratamento;
- [ ] dados coletados;
- [ ] destaque para dados sensíveis de saúde;
- [ ] finalidades;
- [ ] bases legais;
- [ ] compartilhamentos;
- [ ] fornecedores e operadores relevantes;
- [ ] cookies e tecnologias semelhantes;
- [ ] localização do armazenamento;
- [ ] transferência internacional;
- [ ] retenção e eliminação;
- [ ] direitos das titulares;
- [ ] canal para solicitações;
- [ ] medidas gerais de segurança;
- [ ] tratamento de incidentes;
- [ ] data e versão da política;
- [ ] procedimento para comunicação de alterações.

---

## 7. Termos de Uso

Conteúdo mínimo:

- [ ] finalidade da plataforma;
- [ ] quem pode utilizar o sistema;
- [ ] idade mínima;
- [ ] criação e proteção da conta;
- [ ] responsabilidades da usuária;
- [ ] usos proibidos;
- [ ] propriedade do conteúdo;
- [ ] licença técnica necessária para hospedar o conteúdo;
- [ ] funcionamento do compartilhamento;
- [ ] exportação e exclusão;
- [ ] manutenção e indisponibilidade;
- [ ] propriedade intelectual do software;
- [ ] hipóteses de suspensão e encerramento;
- [ ] limitações de responsabilidade compatíveis com a legislação;
- [ ] contato do responsável;
- [ ] legislação e foro aplicáveis;
- [ ] data e versão dos termos.

O Termo de Uso deve declarar que:

> A plataforma é uma ferramenta complementar para registro de experiências.
> Ela não realiza diagnóstico, prescrição, atendimento de emergência,
> psicoterapia ou tratamento médico ou psicológico e não substitui o
> acompanhamento por profissionais habilitados.

---

## 8. Restrições obrigatórias do produto

A primeira versão não deve:

- [ ] permitir acesso público aos diários;
- [ ] manter compartilhamento ativado por padrão;
- [ ] vender dados pessoais ou registros;
- [ ] exibir publicidade baseada em condição de saúde;
- [ ] treinar modelos de inteligência artificial com entradas reais;
- [ ] realizar diagnóstico ou recomendação de tratamento;
- [ ] afirmar que detecta depressão, ansiedade ou risco clínico;
- [ ] afirmar que monitora continuamente as usuárias;
- [ ] prometer resposta emergencial;
- [ ] utilizar conteúdo real em testes automatizados;
- [ ] permitir que administradores consultem diários sem necessidade
      operacional documentada;
- [ ] compartilhar dados com familiares, clínicas ou profissionais sem
      autorização válida.

---

## 9. Critérios de aceite para publicação

A versão não estará pronta para produção enquanto algum item crítico abaixo
estiver pendente:

- [ ] inventário de dados concluído;
- [ ] base legal documentada por operação;
- [ ] Política de Privacidade publicada;
- [ ] Termos de Uso publicados;
- [ ] consentimentos separados por finalidade quando necessários;
- [ ] exclusão de conta implementada e testada;
- [ ] exportação de dados implementada e testada;
- [ ] compartilhamento revogável implementado;
- [ ] autorização testada entre usuários diferentes;
- [ ] criptografia em trânsito e em repouso habilitada;
- [ ] segredos removidos do código-fonte;
- [ ] backups protegidos e com retenção definida;
- [ ] logs revisados para evitar dados sensíveis;
- [ ] plano de resposta a incidentes documentado;
- [ ] testes básicos de acessibilidade concluídos;
- [ ] revisão segundo OWASP ASVS/Top 10 concluída;
- [ ] decisão sobre CEP/Conep registrada antes da pesquisa;
- [ ] TCLE preparado, quando aplicável;
- [ ] validação jurídica realizada antes de disponibilização pública.

---

## 10. Documentos relacionados

O repositório deve manter:

- `docs/data-inventory.md`
- `docs/privacy-policy.md`
- `docs/terms-of-use.md`
- `docs/data-retention.md`
- `docs/incident-response.md`
- `docs/access-control.md`
- `docs/threat-model.md`
- `docs/research-ethics.md`
- `docs/accessibility.md`
- `SECURITY.md`

---

## 11. Referências legais principais

- Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais.
- Lei nº 12.965/2014 — Marco Civil da Internet.
- Lei nº 8.078/1990 — Código de Defesa do Consumidor.
- Lei nº 13.146/2015 — Lei Brasileira de Inclusão.
- Lei nº 10.406/2002 — Código Civil.
- Lei nº 13.787/2018 — Digitalização e guarda de prontuário de paciente,
  quando aplicável.
- Normas de telessaúde e dos conselhos profissionais, quando aplicáveis.
- Normas éticas de pesquisa com seres humanos, quando aplicáveis.
# Áudio nos relatos

## Escopo

- Relato com texto, áudio ou ambos; texto enviado não pode ser vazio ou só espaços.
- Um arquivo por relato, até **10 MiB (10.485.760 bytes)**.
- Formatos: M4A (`audio/mp4`, `audio/x-m4a`), MP3 (`audio/mpeg`), WAV (`audio/wav`, `audio/x-wav`), OGG (`audio/ogg`) e WebM (`audio/webm`).
- Sem transcrição automática ou processamento por serviços externos.
- Apenas a paciente envia, substitui ou remove seus áudios. O psicólogo atualmente vinculado pode ouvi-los, sem alterar arquivos ou relatos.
- Banco e Storage são preparados aqui; gravação, permissão de microfone, envio e player no React Native ainda não estão implementados.

## Banco e armazenamento

A [migração incremental](../supabase/migrations/20261103000000_diary_audio.sql) preserva os relatos de texto existentes e cria o bucket privado `diary-audio`.

Em `diary_entries`:

| Campo | Uso |
|---|---|
| `content` | Texto opcional; usar `null` ou omitir quando houver apenas áudio. |
| `audio_object_id` | UUID de `storage.objects.id` retornado pelo upload. Opcional, único entre relatos. |
| `audio_path` | Caminho preenchido pelo servidor; o cliente não pode escrevê-lo. |

O banco exige texto ou áudio, valida bucket/propriedade/caminho do arquivo e impede referências a arquivos inexistentes ou de outra paciente. A FK para a chave primária de `storage.objects` impede excluir metadados de um áudio ainda referenciado, inclusive em operações concorrentes. Essa dependência deve ser considerada em upgrades do Storage e na exclusão administrativa de contas: primeiro tratar os relatos e depois remover arquivos **pela API do Storage**.

Não há política de `UPDATE` em `storage.objects` para este recurso: sobrescrever, mover e renomear não são permitidos. Substituição usa um novo UUID/caminho. Não acrescente políticas permissivas que ampliem o acesso a este bucket.

## Fluxo pela API

Usar a chave publicável e o JWT da pessoa autenticada, nunca `service_role` no aplicativo. Os exemplos usam placeholders, não dados reais.

1. Gerar um UUID aleatório para o arquivo. O caminho deve ser:

   ```text
   <patient-auth-uid>/<file-uuid>.m4a
   ```

   Usar UUIDs minúsculos e uma extensão permitida; não incluir nomes, diagnósticos ou o nome original do arquivo.

2. Fazer upload binário:

   ```http
   POST /storage/v1/object/diary-audio/<patient-auth-uid>/<file-uuid>.m4a
   apikey: <publishable-key>
   Authorization: Bearer <patient-jwt>
   Content-Type: audio/mp4
   Cache-Control: max-age=0
   x-upsert: false

   <bytes de áudio sintético para testes>
   ```

   No cliente Supabase JS, usar `storage.from('diary-audio').upload(path, bytes, { contentType: 'audio/mp4', upsert: false, cacheControl: '0' })`. O ID é `data.id` (campo `Id` da resposta HTTP do Storage). Verificar erros antes de continuar. O Storage valida tamanho e MIME declarado; isso **não** equivale a verificar o conteúdo binário ou o codec.

3. Criar o relato, ou atualizar um relato próprio:

   ```http
   POST /rest/v1/diary_entries
   apikey: <publishable-key>
   Authorization: Bearer <patient-jwt>
   Content-Type: application/json
   Prefer: return=representation

   {
     "patient_id": "<patient-auth-uid>",
     "content": null,
     "audio_object_id": "<id-retornado-pelo-storage>"
   }
   ```

   Para editar, usar `PATCH /rest/v1/diary_entries?id=eq.<entry-id>`. O `GET` de relatos inclui `audio_path` e `audio_object_id`. Omitir ambos os campos de áudio nas requisições antigas de texto continua funcionando.

4. Paciente ou psicólogo vinculado obtém o arquivo com JWT, sem URL pública:

   ```http
   GET /storage/v1/object/authenticated/diary-audio/<audio_path>
   apikey: <publishable-key>
   Authorization: Bearer <user-jwt>
   ```

   Com Supabase JS, usar `storage.from('diary-audio').download(audio_path)`. O futuro player deve reproduzir o download autenticado e remover cópias temporárias ao sair/encerrar sessão. Requisições autenticadas futuras são bloqueadas após desfazer o vínculo; arquivos já baixados não podem ser revogados.

5. Para substituir: enviar outro arquivo com UUID novo, atualizar `audio_object_id` e só então remover o arquivo antigo. Para remover sem substituir: primeiro enviar `audio_object_id: null` no relato, preservando/adicionando texto não vazio, depois excluir o arquivo.

   ```http
   DELETE /storage/v1/object/diary-audio
   apikey: <publishable-key>
   Authorization: Bearer <patient-jwt>
   Content-Type: application/json

   {"prefixes":["<old-audio-path>"]}
   ```

   Com Supabase JS: `storage.from('diary-audio').remove([oldPath])`. Conferir o resultado: operações bloqueadas por RLS podem retornar zero arquivos/linhas sem erro de autorização explícito.

Upload e escrita do relato não são uma transação única. Se a escrita falhar, tentar remover o novo arquivo pela API, informando falhas de limpeza e permitindo nova tentativa. Arquivos ainda não associados são visíveis somente à paciente; não ficam disponíveis ao psicólogo. Não há limpeza automática implementada. Retenção e limpeza operacional desses arquivos precisam ser definidas antes do uso real.

## Privacidade e decisões pendentes

- Exigir HTTPS fora do desenvolvimento local e confirmar criptografia em repouso do banco e do provedor de Storage no ambiente de implantação.
- Aplicar RLS no banco e no Storage, além das restrições de interface. Não usar URLs públicas ou assinadas neste fluxo: URLs assinadas permaneceriam válidas até expirar mesmo após a revogação do vínculo.
- Antes do envio, explicar o compartilhamento com o psicólogo vinculado, solicitar permissão de microfone apenas quando necessária e permitir cancelar a gravação.
- Base legal/consentimento, retenção, exclusão de conta e gestão de cópias locais ainda precisam ser definidos. Não coletar áudios reais até concluir essas decisões e validar o fluxo completo.
- Não registrar bytes, conteúdo, JWTs ou URLs de acesso em logs. Testes usam apenas áudio sintético.

## Validação

### Banco isolado

Com as migrações aplicadas em um Supabase **local e descartável**, executar a partir da raiz:

```sh
psql "$LOCAL_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/diary_audio.sql
```

`LOCAL_DATABASE_URL` deve apontar exclusivamente para o banco local, com um usuário administrativo capaz de `SET ROLE`. O teste cria metadados sintéticos de Storage dentro de uma transação com `ROLLBACK`; **não executar em projeto hospedado** e não usar SQL para gerenciar arquivos reais.

O teste verifica configuração exata do bucket, relatos de texto/áudio/mistos, referências inválidas, isolamento entre pacientes, psicólogo somente leitura, revogação do vínculo, substituição/remoção, FK, caminhos e acesso anônimo.

### API do Storage (Bruno)

Após revisar/aplicar a migração no ambiente de desenvolvimento, autenticar as contas sintéticas pela [coleção Bruno](../bruno/OncoCare/README.md) e executar o fluxo acima. Conferir:

1. Upload válido e download com bytes idênticos pela paciente; sucesso também com arquivo de exatamente 10.485.760 bytes.
2. Rejeição de arquivo com 10.485.761 bytes e de MIME não permitido (`text/plain`).
3. Upload em pasta alheia, caminho inválido ou realizado por psicólogo deve falhar.
4. Outra paciente, psicólogo sem vínculo e usuário anônimo não podem listar/baixar/remover o arquivo.
5. Psicólogo vinculado baixa apenas áudio associado ao relato, nunca upload ainda sem relato.
6. Desvincular o psicólogo bloqueia novos downloads autenticados.
7. Sobrescrita/renomeação bloqueadas; exclusão de áudio associado bloqueada. Substituição e remoção seguem a ordem descrita, sem deixar o relato vazio.
8. Reexecutar as requisições existentes de texto para confirmar compatibilidade.

Os testes SQL não verificam upload binário, MIME/tamanho impostos pela API, codecs, cache HTTP ou reprodução em dispositivo. Esses cenários exigem o serviço de Storage e, para reprodução, o futuro app.

Nenhuma migração remota deve ser aplicada sem autorização. Seguir o fluxo de CLI/Docker do [AGENTS.md](../AGENTS.md), confirmar o projeto vinculado e revisar `supabase db push --remote --dry-run` antes de aplicar.

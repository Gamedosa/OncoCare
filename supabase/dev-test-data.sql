begin;

insert into public.profiles (id, role, display_name) values
  ('254a4de7-c12d-4b96-a3c4-9c091e8ab85a', 'psychologist', 'Psicologo Teste 1'),
  ('b9251dce-cc1a-46c5-93c2-60cf50e1eec4', 'psychologist', 'Psicologo Teste 2'),
  ('50c01418-6770-47c4-9bed-74c09f066382', 'patient', 'Paciente Teste 1'),
  ('b2c77a23-7a93-4c0d-8a78-5b924cefcd29', 'patient', 'Paciente Teste 2');

insert into public.psychologist_profiles (user_id) values
  ('254a4de7-c12d-4b96-a3c4-9c091e8ab85a'),
  ('b9251dce-cc1a-46c5-93c2-60cf50e1eec4');

insert into public.patient_profiles (user_id, psychologist_id) values
  ('50c01418-6770-47c4-9bed-74c09f066382', '254a4de7-c12d-4b96-a3c4-9c091e8ab85a'),
  ('b2c77a23-7a93-4c0d-8a78-5b924cefcd29', 'b9251dce-cc1a-46c5-93c2-60cf50e1eec4');

insert into public.diary_entries (patient_id, content) values
  ('50c01418-6770-47c4-9bed-74c09f066382', 'Relato ficticio de teste da paciente 1.'),
  ('b2c77a23-7a93-4c0d-8a78-5b924cefcd29', 'Relato ficticio de teste da paciente 2.');

commit;
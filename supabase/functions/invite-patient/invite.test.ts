import { assertEquals, assertRejects, assertThrows } from 'jsr:@std/assert@1';

import { InviteError, invitePatient, parseInviteInput, type InviteDeps, type InvitationTarget } from './invite.ts';

const PSI = '00000000-0000-4000-8000-000000000001';
const PATIENT = '00000000-0000-4000-8000-000000000002';
const input = { email: 'paciente@example.test', name: 'Paciente', redirectTo: 'oncocare://accept-invite' };

function fakeDeps(target: InvitationTarget | null, overrides: Partial<InviteDeps> = {}) {
  const calls: string[] = [];
  const deps: InviteDeps = {
    isPsychologist: async () => true,
    findTarget: async () => target,
    sendAuthInvite: async () => {
      calls.push('sendAuthInvite');
      return PATIENT;
    },
    createInvitation: async (_psi, patientId) => {
      calls.push(`createInvitation:${patientId}`);
    },
    deleteUser: async (userId) => {
      calls.push(`deleteUser:${userId}`);
    },
    ...overrides,
  };
  return { deps, calls };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  const error = await assertRejects(() => promise, InviteError);
  assertEquals(error.code, code);
}

Deno.test('normalizes input and prefers the configured redirect', () => {
  assertEquals(parseInviteInput({ email: ' Ana@Example.TEST ', name: ' Ana ' }, 'https://app.example/accept-invite'), {
    email: 'ana@example.test',
    name: 'Ana',
    redirectTo: 'https://app.example/accept-invite',
  });
  assertEquals(parseInviteInput({ email: 'a@b.co', name: 'A', redirectTo: 'oncocare://accept-invite' }, undefined)
    .redirectTo, 'oncocare://accept-invite');
});

Deno.test('rejects invalid input', () => {
  for (const body of [
    null,
    {},
    { email: 'sem-arroba', name: 'A' },
    { email: 'a@b.co', name: '   ' },
    { email: 'a@b.co', name: 'x'.repeat(121) },
    { email: 'a@b.co', name: 'A', redirectTo: 'javascript:alert(1)' },
    { email: 'a@b.co', name: 'A', redirectTo: 'nao e url' },
  ]) {
    const error = assertThrows(() => parseInviteInput(body, undefined), InviteError);
    assertEquals(error.code, 'invalid_input');
  }
});

Deno.test('only psychologists can invite', async () => {
  const { deps, calls } = fakeDeps(null, { isPsychologist: async () => false });
  await expectCode(invitePatient(deps, PSI, input), 'not_psychologist');
  assertEquals(calls, []);
});

Deno.test('rejects the caller and non-patient accounts without sending e-mail', async () => {
  for (const target of [
    { userId: PSI, confirmed: true, role: 'psychologist' },
    { userId: PATIENT, confirmed: true, role: 'psychologist' },
  ]) {
    const { deps, calls } = fakeDeps(target);
    await expectCode(invitePatient(deps, PSI, input), 'invitation_unavailable');
    assertEquals(calls, []);
  }
});

Deno.test('new e-mail gets an Auth invite and a pending invitation', async () => {
  const { deps, calls } = fakeDeps(null);
  await invitePatient(deps, PSI, input);
  assertEquals(calls, ['sendAuthInvite', `createInvitation:${PATIENT}`]);
});

Deno.test('unconfirmed account receives the e-mail again', async () => {
  const { deps, calls } = fakeDeps({ userId: PATIENT, confirmed: false, role: 'patient' });
  await invitePatient(deps, PSI, input);
  assertEquals(calls, ['sendAuthInvite', `createInvitation:${PATIENT}`]);
});

Deno.test('confirmed patient sees the invitation in the app without e-mail', async () => {
  const { deps, calls } = fakeDeps({ userId: PATIENT, confirmed: true, role: 'patient' });
  await invitePatient(deps, PSI, input);
  assertEquals(calls, [`createInvitation:${PATIENT}`]);
});

Deno.test('removes an account created now if the invitation cannot be stored', async () => {
  const { deps, calls } = fakeDeps(null, {
    createInvitation: async () => {
      throw new InviteError('internal');
    },
  });
  await expectCode(invitePatient(deps, PSI, input), 'internal');
  assertEquals(calls, ['sendAuthInvite', `deleteUser:${PATIENT}`]);
});

Deno.test('keeps existing accounts when the invitation cannot be stored', async () => {
  const { deps, calls } = fakeDeps({ userId: PATIENT, confirmed: false, role: 'patient' }, {
    createInvitation: async () => {
      throw new InviteError('already_linked');
    },
  });
  await expectCode(invitePatient(deps, PSI, input), 'already_linked');
  assertEquals(calls, ['sendAuthInvite']);
});

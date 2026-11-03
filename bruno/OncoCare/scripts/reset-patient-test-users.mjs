const expectedProjectUrl = 'https://bwinnbwmfwqbgepougyd.supabase.co';
const projectUrl = process.env.project_url?.replace(/\/+$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (projectUrl !== expectedProjectUrl) {
  throw new Error('Refusing to update users: project_url is not OncoCare-Dev.');
}

if (!serviceRoleKey) {
  throw new Error('Set SUPABASE_SERVICE_ROLE_KEY in the local .env first.');
}

const patientUsers = [
  {
    name: 'patient 1',
    id: '50c01418-6770-47c4-9bed-74c09f066382',
    email: process.env.PATIENT1_EMAIL,
    password: process.env.PATIENT1_PASSWORD
  },
  {
    name: 'patient 2',
    id: 'b2c77a23-7a93-4c0d-8a78-5b924cefcd29',
    email: process.env.PATIENT2_EMAIL,
    password: process.env.PATIENT2_PASSWORD
  }
];

if (patientUsers.some(({ email, password }) => !email || !password)) {
  throw new Error('Set both patient test emails and passwords in the local .env.');
}

let failed = false;

for (const user of patientUsers) {
  const response = await fetch(`${projectUrl}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true
    })
  });

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    console.error(`Failed to update ${user.name}: HTTP ${response.status} ${details.msg ?? details.message ?? ''}`);
    failed = true;
    continue;
  }

  console.log(`Updated ${user.name} test login.`);
}

if (failed) {
  process.exitCode = 1;
}
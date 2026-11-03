# OncoCare Bruno collection

## Local setup

1. Copy the repository `.env` into this collection folder:

   ```sh
   cp ../../.env .env
   ```

2. Open this folder as a collection in Bruno and select the `OncoCare-Dev` environment.
3. In the environment's **Secrets** tab, set `publishableKey` and the email/password secrets for the test accounts. These values are stored by Bruno and do not depend on its cached process environment.
4. Run each request under `auth` once. The access tokens are stored as Bruno secret environment variables.
5. Run the requests under `diary` to test read and write access. `Create - Patient 1 own entry` must run before `Update - Patient 1 own entry`.

All requests target the development project. Use only synthetic test data.

## Reset patient test logins

If a patient test account's credentials do not work, set new unique values for `PATIENT1_EMAIL`, `PATIENT1_PASSWORD`, `PATIENT2_EMAIL`, and `PATIENT2_PASSWORD` in the local `.env`. Add the legacy `service_role` key for `OncoCare-Dev` as `SUPABASE_SERVICE_ROLE_KEY`, then run:

```sh
node --env-file=.env scripts/reset-patient-test-users.mjs
```

The script updates only the two patient test users in `OncoCare-Dev` and confirms their email addresses. After it succeeds, copy the current email/password values from `.env` into the matching Bruno Secrets (`patient1Email`, `patient1Password`, `patient2Email`, `patient2Password`). Never add the `service_role` key to Bruno requests, collection environments, or version control. Rotate any test passwords that were shared outside the local `.env`.
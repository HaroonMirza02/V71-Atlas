# Runbook

## Deploy

```bash
npm install
npm run build
npm start
```

The server refuses to start if a required environment variable is missing or malformed (see `src/config/index.ts`), rather than starting in a half-configured state. Check the startup log for the specific missing variable if it exits immediately.

## Roll back

This is a stateless Node process. Rolling back means deploying the previous build artifact or the previous git commit and restarting. There is no in-place migration step tied to a specific version in this sprint, so a rollback is safe as long as the database schema has not changed between versions. If a future change does alter the schema, that change must document its own rollback path at the time it is made.

## Rotate a leaked or expiring API key

1. Generate the new key with the third-party source (GitHub, Product Hunt, and so on).
2. Update the corresponding variable in `.env` (for example `GITHUB_TOKEN`).
3. Restart the process. `src/config/index.ts` reads environment variables once at boot, so a running process does not pick up a changed `.env` file without a restart.
4. If the key being rotated was ever encrypted and stored in the database rather than only kept in environment variables, re-encrypt and replace the stored value using `encryptSecret()` from `src/lib/encryption.ts`, then remove the old ciphertext.
5. Confirm the rotation worked by checking that connector's `GET /connectors` entry shows a recent `lastSuccessAt` after the restart.

If a key is suspected leaked rather than simply expiring, treat it as compromised: revoke it at the source first, then follow the same steps.

## Rotate JWT or encryption secrets

Rotating `JWT_SECRET` or `JWT_REFRESH_SECRET` immediately invalidates every existing access and refresh token; every user will need to log in again. Rotating `ENCRYPTION_SECRET` makes any previously encrypted value (stored connector credentials, existing backups) undecryptable unless you decrypt everything with the old secret and re-encrypt with the new one before switching over. This is a deliberate, planned action, not a routine one, and should happen during a maintenance window.

## Back up the database

```
POST /backups/export
```
(requires an ADMIN token). Produces an AES-256-CBC encrypted file under `backups/`. Confirm it worked with `GET /backups`, which lists filename, size, and creation time.

## Restore from backup

```
POST /backups/restore
{ "filename": "backup-1234567890.enc" }
```

This replaces the contents of every collection present in the backup file. Test this on a non-production database before relying on it in an actual incident; an untested restore path is not a real backup, and this restore path has not yet been exercised against a live MongoDB instance in this sprint because MongoDB was not available in the environment this review ran in. Run one real export and one real restore against a disposable database before trusting this in production.

## Diagnose a stuck or failing connector

1. `GET /connectors` — check `lastError`, `lastErrorAt`, and `consecutiveErrors` for the connector in question.
2. `GET /connectors/failed-jobs` — see the specific jobs that exhausted their retries and why.
3. Check the structured logs for that connector's `sourceId`, filtering on the `requestId` shown in either of the above, to trace the exact request through the queue and worker.
4. If the source's API itself is down or rate-limiting aggressively, disable the connector temporarily with `PUT /connectors/:id/state` (`isEnabled: false`) rather than leaving it retrying against a source that will keep failing.
5. Once fixed, either wait for the next scheduled run or trigger one manually with `POST /connectors/:id/trigger`.

## Diagnose a general request failure

Every request carries a request id, either supplied by the client in an `X-Request-Id` header or generated automatically. Every log line produced while handling that request, including inside the async queue worker if that request enqueued a job, includes that same request id. Search the logs for it to see the full path a specific request took.

## Scale verification still required

The database seed script (`npm run seed -- --size=100000`) and the benchmark script (`npm run benchmark`) exist and were reviewed, but could not be executed during this pass because this environment had no MongoDB instance available. Before this sprint is marked complete, run both against a real database and confirm:

- Query latency at 100, 100,000, and ideally 1,000,000 rows for the filtered list, full-text search, and tag-filter queries.
- That `EXPLAIN` output shows `IXSCAN` or `TEXT_MATCH`, not `COLLSCAN`, confirming the indexes are actually being used and not silently ignored.

The benchmark script already prints exactly this information; running it and recording the output is the only remaining step.

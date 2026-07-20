# API Reference

Base URL: `/api/v1`

All endpoints except `/auth/login` and `/auth/signup` require an `Authorization: Bearer <accessToken>` header. All responses are JSON. Errors follow this shape:

```json
{
  "error": {
    "code": "SOME_CODE",
    "message": "Human readable explanation",
    "details": {}
  }
}
```

## Roles and permissions

| Permission | ADMIN | ANALYST | VIEWER |
|---|---|---|---|
| signals:read | yes | yes | yes |
| signals:write | yes | no | no |
| signals:review | yes | yes | no |
| connectors:read | yes | yes | yes |
| connectors:write | yes | yes | no |
| users:manage | yes | no | no |
| metrics:read | yes | yes | no |
| backups:manage | yes | no | no |

## Authentication

### POST /auth/login
No authentication required.

Request body:
```json
{ "email": "user@vision71.com", "password": "at-least-8-characters" }
```

Response `200`: `accessToken`, `refreshToken`, and the user's `id`, `email`, `name`, `role`.

Errors: `400 INVALID_INPUT`, `401 INVALID_CREDENTIALS`, `403 USER_DEACTIVATED`.

### POST /auth/signup
No authentication required. Public self-registration.

Request body:
```json
{ "email": "user@vision71.com", "password": "at-least-8-characters", "name": "Full Name" }
```

Always creates a `VIEWER` account, with one exception: if the database has no users at all, the very first signup becomes `ADMIN` so a freshly deployed system has a way in. Any `role` field sent in the body is ignored, since this endpoint has no authentication in front of it.

Response `201`: same shape as login.

### GET /auth/profile
Requires authentication. Returns the caller's own `id`, `email`, `name`, `role`, `lastLoginAt`.

## User management

### POST /users
Requires `users:manage` (ADMIN only). This is how ADMIN and ANALYST accounts are created, since public signup cannot assign a role.

Request body:
```json
{ "email": "new@vision71.com", "password": "at-least-8-characters", "name": "Full Name", "role": "ANALYST" }
```

Response `201`: the created user's `id`, `email`, `name`, `role`.

Errors: `400 INVALID_INPUT`, `409 USER_EXISTS`.

## Signals

### GET /signals
Requires `signals:read`.

Query parameters (all optional): `sourceId`, `category`, `status`, `tag`, `technology`, `search` (full text), `limit` (1 to 100, default 20), `cursor` (from a previous response's `pagination.cursor`).

Response `200`:
```json
{
  "data": [ /* Signal objects */ ],
  "pagination": { "cursor": "opaque-string-or-absent", "hasMore": true, "limit": 20 },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

Results are cached for 5 minutes by default, keyed by the exact filter combination and the caller's role, so one role never sees another role's cached response.

### GET /signals/:id
Requires `signals:read`. Returns one signal with its linked raw payload populated. Cached for 30 minutes.

Errors: `400 INVALID_ID`, `404 SIGNAL_NOT_FOUND`.

### PUT /signals/:id/review
Requires `signals:review`.

Request body:
```json
{ "status": "REVIEWED", "reviewNotes": "optional, up to 2000 characters" }
```

`status` must be one of `REVIEWED`, `ARCHIVED`, `REJECTED`. Records who reviewed it and when. Invalidates the relevant caches. Writes an audit log entry.

## Connectors

### GET /connectors
Requires `connectors:read`. Lists every registered connector with its current enabled state, schedule interval, last run and error timestamps, and lifetime fetch and ingest counts.

### POST /connectors/:id/trigger
Requires `connectors:write`. Enqueues an immediate ingestion job for the named connector, outside its normal schedule. Writes an audit log entry.

Errors: `404 CONNECTOR_NOT_FOUND`.

### PUT /connectors/:id/state
Requires `users:manage` (ADMIN only). Enables, disables, or changes the schedule interval (minimum 60,000 ms) for a connector. Writes an audit log entry recording the before and after state.

### GET /connectors/failed-jobs
Requires `connectors:read`. Lists ingestion jobs that exhausted their retry attempts, with the connector id, the reason for failure, and how many attempts were made. This is the reviewable dead letter view described in the security requirements, so a broken connector is visible instead of discovered later.

Query parameter: `limit` (1 to 100, default 25).

## Backups

### GET /backups
Requires `backups:manage` (ADMIN only). Lists available encrypted backup files with size and creation time.

### POST /backups/export
Requires `backups:manage`. Creates a new encrypted backup of every collection. Writes an audit log entry.

### POST /backups/restore
Requires `backups:manage`.

Request body:
```json
{ "filename": "backup-1234567890.enc" }
```

Restores the named backup, replacing current collection contents. The filename is resolved with `path.basename()` before use, so a path such as `../../etc/passwd` cannot escape the backups directory. Writes an audit log entry.

## Metrics

### GET /metrics
Requires `metrics:read`. Returns signal counts by status and category, per-connector telemetry, BullMQ queue counts (waiting, active, delayed, failed, completed), database and Redis connection status, and process memory usage.

## System endpoints (no authentication, not versioned)

### GET /status
Liveness and readiness combined. Returns `200` with `status: "ok"` when both MongoDB and Redis are connected, `503` with `status: "degraded"` otherwise.

### GET /
Landing response with links to `/status` and the API root.

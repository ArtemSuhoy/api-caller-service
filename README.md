# API Task Service

Service for handling tasks to call external APIs through a queue with **retry mechanism** and **callback notifications**.

---

## Features

* ✅ Accept tasks via REST API
* ✅ Queue-based processing (Redis + BullMQ)
* ✅ Execute HTTP requests: GET, POST, PUT, DELETE, PATCH
* ✅ Retry mechanism for errors (rate limit, server errors, network issues)
* ✅ Send results to a callback URL
* ✅ Basic error handling

---

## Requirements

* Node.js 18+
* Redis 6+
* npm or yarn

---

## Installation

1. Install dependencies:

```bash
yarn install
```

2. Copy configuration file:

```bash
cp .env.example .env
```

3. Start Redis (via Docker):

```bash
# Only Redis
docker-compose -f docker-compose.redis.yml up -d

# Or Redis + service together
docker-compose up -d
```

> Alternatively, you can install Redis locally and ensure it runs on port 6379.

4. Start the application:

```bash
# Development
npx yarn start:dev

# Production
npx yarn build
npx yarn start:prod
```

Application is available at: `http://localhost:3000`

---

## Usage

### Create a Task

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "url": "https://api.example.com/users/123",
    "callbackUrl": "https://your-app.com/webhook",
    "headers": {"Authorization": "Bearer token123"},
    "timeout": 5000,
    "maxRetries": 3,
    "retryDelay": 1000
  }'
```

**Response:**

```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

### Request Format

**Required fields:**

* `method` – HTTP method (GET, POST, PUT, PATCH, DELETE)
* `url` – Target API URL
* `callbackUrl` – URL to send results

**Optional fields:**

* `headers` – HTTP headers (object)
* `body` – Request body (for POST, PUT, PATCH)
* `queryParams` – Query parameters (object)
* `timeout` – Timeout in ms (default 30000)
* `maxRetries` – Maximum retry attempts (default 3)
* `retryDelay` – Retry delay in ms (default 1000)

---

### Callback Format

After task execution (success or failure), a POST request is sent to `callbackUrl`.

**Success:**

```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "attempts": 1,
  "response": {
    "statusCode": 200,
    "headers": {"content-type": "application/json"},
    "body": {"id": 123,"name": "John Doe"}
  },
  "executionTime": 245,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Failure:**

```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "attempts": 3,
  "error": {"message": "Request failed with status code 500", "code": 500},
  "executionTime": 15234,
  "timestamp": "2024-01-15T10:30:15.000Z"
}
```

---

## Retry Mechanism

The service automatically retries requests for:

* **HTTP 429 (Rate Limit)** – uses `Retry-After` header or fixed delay
* **HTTP 5xx (Server Errors)** – retries with exponential backoff
* **Network Errors** – retries on network issues

Number of attempts is configured via `maxRetries` (default 3).

---

## Project Structure

```
src/
├── main.ts                 # Entry point
├── app.module.ts           # Root module
├── tasks/                  # Task module
│   ├── tasks.controller.ts
│   ├── tasks.service.ts
│   └── dto/
├── queue/                  # Queue module
│   ├── queue.service.ts
│   └── queue.module.ts
├── http/                   # HTTP executor
│   ├── http-executor.service.ts
│   └── http.module.ts
└── callback/               # Callback service
    ├── callback.service.ts
    └── callback.module.ts
```

**Test app structure:**

```
_scripts/
  ├── package.json
  └── webhook.js
```

---

## Docker

### Start Application (Redis + Service)

```bash
docker compose up --build
```

---

## Development

```bash
# Start in development mode
yarn run start:dev

# Run tests
yarn run test

# Linting
yarn run lint

# Code formatting
yarn run format
```

---

## License

MIT

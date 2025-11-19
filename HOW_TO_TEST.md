# API Caller Service Testing Guide

## API Endpoints

* `GET /` - Health check
* `POST /api/tasks` - Create a new HTTP request task
* `DELETE /api/tasks/:id` - Delete a specific task from the queue
* `DELETE /api/queue` - Clear all tasks from the queue

---

## 🚀 Setup for Testing

### 1. Install Dependencies

```bash
yarn install
```

### 2. Setup Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or locally if installed
redis-server
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env as needed

# Test scripts environment
cp _scripts/.env.example _scripts/.env
# Edit .env as needed
```

### 4. Start the Application

```bash
# Development mode
yarn start:dev

# Production mode
yarn build
yarn start:prod
```

Or via Docker:

```bash
docker-compose up -d
```

* Main application: `http://localhost:3000`
* Test application: `http://localhost:3009` or the port specified in .env

---

## 🧪 Testing

### Step 1: Health Check

```bash
curl http://localhost:3000/
```

Expected response: `"Hello World!"`

---

## 📝 Test Examples

### Example 1: Simple GET Request

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "url": "https://jsonplaceholder.typicode.com/posts/1",
    "callbackUrl": "https://webhook.site/your-unique-id"
  }'
```

**Expected response:**

```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Callback content:**

```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "attempts": 1,
  "response": {
    "statusCode": 200,
    "headers": {"content-type": "application/json"},
    "body": {"userId":1,"id":1,"title":"...","body":"..."}
  },
  "executionTime": 245,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Example 2: POST Request with Body

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "method": "POST",
    "url": "https://jsonplaceholder.typicode.com/posts",
    "callbackUrl": "https://webhook.site/your-unique-id",
    "headers": {"Content-Type": "application/json"},
    "body": {"title": "Test Post", "body": "This is a test", "userId": 1}
  }'
```

### Example 3: GET Request with Query Parameters

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "url": "https://jsonplaceholder.typicode.com/posts",
    "callbackUrl": "https://webhook.site/your-unique-id",
    "queryParams": {"userId":1,"_limit":5}
  }'
```

### Example 4: Custom Settings

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "url": "https://jsonplaceholder.typicode.com/posts/1",
    "callbackUrl": "https://webhook.site/your-unique-id",
    "timeout": 5000,
    "maxRetries": 3,
    "retryDelay": 1000
  }'
```

### Example 5: Testing Error Handling (404)

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "url": "https://jsonplaceholder.typicode.com/posts/99999",
    "callbackUrl": "https://webhook.site/your-unique-id"
  }'
```

**Callback on error:**

```json
{
  "taskId": "...",
  "status": "failed",
  "attempts": 1,
  "error": {"message": "Request failed with status code 404", "code": 404,},
  "executionTime": 150,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Example 6: Retry Mechanism (Non-existent Domain)

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "url": "https://this-domain-does-not-exist-12345.com/api",
    "callbackUrl": "https://webhook.site/your-unique-id",
    "maxRetries": 3,
    "retryDelay": 1000
  }'
```

Logs show retry attempts:

```
Task <id> attempt 1 failed, retrying in 1000ms
Task <id> attempt 2 failed, retrying in 2000ms
Task <id> attempt 3 failed, retrying in 3000ms
```

### Example 7: Clear Queue

```bash
curl -X DELETE http://localhost:3000/api/queue
```

**Response:**

```json
{ "message": "Queue cleanup successfully", "success": true }
```

### Example 8: Delete Specific Task

```bash
curl -X DELETE http://localhost:3000/api/tasks/<taskId>
```

**Response:**

```json
{ "success": true, "message": "Job with id=<taskId> removed successfully" }
```

---

## 🔍 Logging

* Task creation, HTTP execution, retry attempts, success/failure, callback sent.

Example:

```
[QueueService] Task abc-123 completed
[HttpExecutorService] Executing GET request to https://api.example.com
[CallbackService] Callback sent successfully for task abc-123
```

---

## 🧪 Advanced Scenarios

### 1. Timeout Test

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"method": "GET", "url": "https://httpstat.us/200?sleep=5000", "callbackUrl": "https://webhook.site/your-unique-id", "timeout": 2000}'
```

### 2. Rate Limit Test (429)

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"method": "GET", "url": "https://httpstat.us/429", "callbackUrl": "https://webhook.site/your-unique-id", "maxRetries": 3}'
```

### 3. Server Error Test (500)

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"method": "GET", "url": "https://httpstat.us/500", "callbackUrl": "https://webhook.site/your-unique-id", "maxRetries": 2}'
```

---

## 📊 Redis Queue Verification

### Ping Redis

```bash
redis-cli ping
# Expected: PONG
```

### View Tasks in Queue

```bash
redis-cli
KEYS *
GET <task-id>
```

---

## ✅ Testing Checklist

* [ ] Application starts without errors
* [ ] Health check endpoint works
* [ ] Task creation returns taskId
* [ ] GET and POST requests succeed
* [ ] Query parameters appended correctly
* [ ] Callback sent on success
* [ ] Callback sent on error
* [ ] Retry mechanism works on network, 429, 5xx errors
* [ ] Timeout handled correctly
* [ ] Input validation works
* [ ] Logs display all events

---

## 🐛 Debugging

* Check Redis: `redis-cli ping`
* Review app logs for errors
* Ensure callback URL is reachable

---

## 📚 Resources

* [JSONPlaceholder](https://jsonplaceholder.typicode.com/) - testing API
* [httpstat.us](https://httpstat.us/) - simulate status codes
* [Webhook.site](https://webhook.site/) - test callbacks

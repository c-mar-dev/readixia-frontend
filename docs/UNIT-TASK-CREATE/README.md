# UNIT-TASK-CREATE

Enables task creation from the Dashboard UI, persisting tasks to MDQ as markdown files in the Obsidian vault. Implements the full round-trip: UI → Engine API → MDQ → Event → Decision → UI.

## Problem Statement

The "+ New Task" button in the Dashboard created only ephemeral, local-only decisions that:
- Were lost on page refresh
- Never persisted to the Obsidian vault
- Did not trigger the decision workflow

## Solution

Implemented a `POST /api/tasks/` endpoint in the Engine that:
1. Accepts task parameters (title, project, priority, description)
2. Calls `mdq_client.submit_intent()` to create the task file
3. Returns success response to frontend

The existing event-driven architecture handles the rest:
- MDQ creates `tasks/{title}.md` and emits event
- Engine receives event, creates triage decision
- Dashboard receives decision via WebSocket/polling

## Installation

No installation required. Changes are part of the Engine and Frontend codebases.

## Usage

### Frontend

```typescript
import { tasksApi } from '$lib/api';

// Create a new task
const result = await tasksApi.create({
  title: 'Fix login bug',
  project: 'Apollo',          // optional
  priority: 'high',           // optional: low|normal|medium|high|urgent
  description: 'SSO broken'   // optional
});

console.log(result.path);     // "tasks/fix-login-bug.md"
console.log(result.message);  // "Task created: Fix login bug"
```

### API

```http
POST /api/tasks/
Content-Type: application/json

{
  "title": "Fix login bug",
  "project": "Apollo",
  "priority": "high",
  "description": "Users cannot log in with SSO"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "path": "tasks/fix-login-bug.md",
  "message": "Task created: Fix login bug"
}
```

**Error (503 Service Unavailable):**
```json
{
  "detail": {
    "code": "MDQ_UNAVAILABLE",
    "message": "MDQ client not available"
  }
}
```

## API Reference

### CreateTaskRequest

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| title | string | Yes | - | Task title (used for filename) |
| project | string | No | null | Project to assign task to |
| priority | string | No | "normal" | One of: low, normal, medium, high, urgent |
| description | string | No | null | Initial task description/notes |

### CreateTaskResponse

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Whether task was created |
| path | string | Path to created file (e.g., "tasks/fix-bug.md") |
| message | string | Human-readable success message |

## Testing

### Manual Testing

1. Start MDQ daemon: `cd backend && bin/mdq serve`
2. Start Engine: `cd engine && uvicorn main:app --reload`
3. Start Frontend: `cd frontend && npm run dev`
4. Click "+ New Task" button in Dashboard
5. Fill in title and optional fields
6. Click "Create Task"
7. Verify:
   - Success toast appears immediately
   - Triage decision appears in queue within 1-2 seconds
   - File exists at `tasks/{title}.md` in vault

### API Testing

```bash
# Create task via curl
curl -X POST http://localhost:8000/api/tasks/ \
  -H "Content-Type: application/json" \
  -d '{"title": "Test task", "priority": "high"}'

# Expected response
{"success":true,"path":"tasks/test-task.md","message":"Task created: Test task"}
```

## Files

| File | Layer | Description |
|------|-------|-------------|
| `engine/src/api/routes/tasks.py` | Engine | POST /api/tasks/ endpoint |
| `engine/src/api/routes/__init__.py` | Engine | Router exports |
| `engine/main.py` | Engine | Router registration |
| `frontend/src/lib/api/tasks.ts` | Frontend | tasksApi client |
| `frontend/src/lib/api/index.ts` | Frontend | API exports |
| `frontend/src/routes/+page.svelte` | Frontend | handleTaskCreate integration |

## Dependencies

- **Engine**: FastAPI, Pydantic, MDQClient (all existing)
- **Frontend**: apiClient (existing)

No new dependencies added.

## Delivery Checklist

### Acceptance Criteria

- [x] "+ New Task" button creates task in MDQ
- [x] Task persists as markdown file in vault
- [x] Success/error feedback shown to user
- [x] Task triggers triage decision via event flow
- [x] Decision appears in queue after creation

### Standard Requirements

- [x] All acceptance criteria met
- [ ] Unit test coverage >80% (tests not implemented in this phase)
- [x] No hardcoded values (configurable)
- [x] Error handling complete (503, 500, validation errors)
- [x] Logging at appropriate levels (info for create, error for failures)
- [x] IMPLEMENTATION.md complete
- [x] No linter warnings (build passes)
- [x] Code formatted per standards

### Contract Compliance

- [x] Engine endpoint follows existing API patterns
- [x] MDQ intent format matches submit_intent protocol
- [x] Frontend API follows existing apiClient patterns

### Self-Review

- [x] I would approve this PR
- [x] Edge cases considered (empty title, invalid priority, MDQ unavailable)
- [x] Error messages are helpful
- [x] No obvious security issues

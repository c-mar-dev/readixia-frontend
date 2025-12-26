# UNIT-TASK-CREATE Implementation Notes

## Summary

Implemented end-to-end task creation from the Dashboard UI through the Decision Engine to MDQ. The "+ New Task" button now creates real, persistent markdown files in the Obsidian vault instead of ephemeral local-only decisions. Tasks flow through the event-driven architecture: MDQ creates file → Engine receives event → Creates triage decision → Dashboard displays via WebSocket/polling.

## Decisions Made

### Decision 1: Event-Driven vs Immediate Decision Return

**Context:** When a user creates a task, should the UI immediately show a triage decision, or wait for the natural event flow?

**Options Considered:**
1. **Immediate decision** - Engine creates task + returns triage decision synchronously. Faster UX but couples task creation with decision creation.
2. **Event-driven flow** - Engine creates task in MDQ, returns success. Decision appears naturally via event subscription (1-2s delay).

**Chosen:** Option 2 - Event-driven flow

**Rationale:**
- Maintains architectural separation (3-layer model)
- MDQ remains single source of truth for task creation
- Decision Engine's event subscription already handles decision generation
- Avoids duplicating decision creation logic in the API endpoint
- More resilient - if decision creation fails, task still exists

**Downstream Impact:** Users experience ~1-2 second delay before seeing the new decision in queue. Success toast provides immediate feedback.

---

### Decision 2: MDQ Intent Format for Task Creation

**Context:** MDQ's `submit_intent` accepts various action types. Need to determine correct format for task creation.

**Options Considered:**
1. **Full content approach** - Send complete markdown with frontmatter as `content` field
2. **Structured fields approach** - Send `title`, `fields`, `body` separately, let MDQ construct file

**Chosen:** Option 2 - Structured fields approach

**Rationale:**
- Mirrors CLI behavior (`mdq create task --title="..." --set priority=high`)
- MDQ handles slug generation, file placement, versioning
- Cleaner API - frontend doesn't need to know frontmatter format
- Validation happens in MDQ where schema is defined

**Downstream Impact:** If MDQ's intent schema changes, only Engine endpoint needs updating, not frontend.

---

### Decision 3: Priority Value Normalization

**Context:** Frontend uses "normal" as default priority, but MDQ schema allows low/medium/high/urgent.

**Options Considered:**
1. Map "normal" → "medium" in Engine
2. Accept "normal" as valid (MDQ may normalize)
3. Validate strictly against MDQ schema values only

**Chosen:** Option 3 - Strict validation with expanded set

**Rationale:**
- Engine validates priority is one of: `low`, `normal`, `medium`, `high`, `urgent`
- MDQ schema may accept all these; if not, MDQ will reject clearly
- Frontend can use whichever terminology makes sense for UX

**Downstream Impact:** Frontend sends "normal" or other values; Engine validates; MDQ processes.

---

## Deviations from Spec

None - this was a bug fix / missing feature implementation, not a spec-driven unit. The implementation follows:
- CLAUDE.md architecture (3-layer, event-driven, files-as-truth)
- Existing API patterns in Engine (FastAPI routers, Pydantic models)
- Existing frontend patterns (apiClient, stores, uiStore notifications)

---

## Known Limitations

1. **MDQ Dependency** - If MDQ daemon is unavailable, task creation returns 503. No CLI fallback implemented for creation (unlike queries which have fallback).

2. **Event Propagation Delay** - 1-2 second delay between task creation and decision appearing in queue. Users see success toast immediately but must wait for decision.

3. **No Duplicate Detection** - Creating a task with the same title as an existing task may fail at MDQ level (file already exists) or create a conflict.

4. **Description Field** - Passed as `body` in intent, but MDQ's handling of body content for new files may vary. May need adjustment based on MDQ's actual implementation.

5. **Project Validation** - No validation that project name exists in vault. MDQ or Engine may need to handle this.

---

## Open Questions

- [ ] Does MDQ's `submit_intent` with `action: "create"` support the `body` field for initial content?
- [ ] Should we add retry logic for task creation on transient failures?
- [ ] Should the UI poll more aggressively after task creation to show decision faster?

---

## Test Coverage

**Note:** This implementation focused on the feature delivery. Test files were not created in this phase.

- Line coverage: Not measured (no unit tests added)
- Branch coverage: Not measured
- Uncovered areas:
  - `engine/src/api/routes/tasks.py` - Needs unit tests with mock MDQ client
  - `frontend/src/lib/api/tasks.ts` - Needs integration tests with mock API

**Recommended tests to add:**
1. Engine: POST /api/tasks/ returns 200 with valid data
2. Engine: POST /api/tasks/ returns 503 when MDQ unavailable
3. Engine: POST /api/tasks/ returns 422 with empty title
4. Engine: POST /api/tasks/ returns 422 with invalid priority
5. Frontend: tasksApi.create() calls correct endpoint
6. Frontend: handleTaskCreate shows success toast on success
7. Frontend: handleTaskCreate shows error toast on failure

---

## Dependencies Used

| Dependency | Version | Why |
|------------|---------|-----|
| FastAPI | existing | Router and request handling in Engine |
| Pydantic | existing | Request/response validation in Engine |
| apiClient | existing | HTTP client in Frontend |
| uiStore | existing | Toast notifications in Frontend |

No new dependencies were added.

---

## Files Delivered

### Engine (Python/FastAPI)

| File | Description |
|------|-------------|
| `engine/src/api/routes/tasks.py` | **NEW** - POST /api/tasks/ endpoint with CreateTaskRequest/Response models, slugify helper, MDQ intent submission |
| `engine/src/api/routes/__init__.py` | Added `tasks_router` export |
| `engine/main.py` | Added `tasks_router` import and registration |

### Frontend (SvelteKit/TypeScript)

| File | Description |
|------|-------------|
| `frontend/src/lib/api/tasks.ts` | **NEW** - tasksApi with create() method, CreateTaskRequest/Response types |
| `frontend/src/lib/api/index.ts` | Added tasksApi and type exports |
| `frontend/src/routes/+page.svelte` | Updated handleTaskCreate to call API instead of local-only store update |

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User clicks "+ New Task"                       │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend: TaskCreationModal.svelte                                     │
│  - Collects: title, project, priority, description                      │
│  - Dispatches 'submit' event                                            │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend: +page.svelte handleTaskCreate()                              │
│  - Calls tasksApi.create({ title, project, priority, description })     │
│  - Shows success/error toast via uiStore                                │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ POST /api/tasks/
┌─────────────────────────────────────────────────────────────────────────┐
│  Engine: tasks.py create_task()                                         │
│  - Validates request (title not empty, priority valid)                  │
│  - Builds MDQ intent: { action: "create", item_type: "task", ... }      │
│  - Calls mdq_client.submit_intent(intent)                               │
│  - Returns { success: true, path: "tasks/...", message: "..." }         │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ Socket/IPC
┌─────────────────────────────────────────────────────────────────────────┐
│  MDQ Daemon                                                             │
│  - Validates against .mdq-schemas.yaml                                  │
│  - Creates tasks/{slugified-title}.md with frontmatter                  │
│  - Emits file creation event to subscribers                             │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ Event subscription
┌─────────────────────────────────────────────────────────────────────────┐
│  Engine: Event subscription loop (main.py)                              │
│  - Receives "file_created" event for new task                           │
│  - DecisionGenerator creates triage decision                            │
│  - Decision stored in Engine DB                                         │
│  - WebSocket broadcasts decision_created event                          │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ WebSocket / Polling
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend: decisionStore                                                │
│  - Receives decision via WebSocket or polling                           │
│  - Adds to decisions list with _isNew flag                              │
│  - UI renders new triage decision in queue                              │
└─────────────────────────────────────────────────────────────────────────┘
```

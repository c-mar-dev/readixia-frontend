# Integration Test Plan

This document provides a manual test checklist for validating the Engine ↔ Frontend integration.

## Prerequisites

1. **Engine running**: `cd engine && uvicorn main:app --reload`
2. **Frontend running**: `cd frontend && npm run dev`
3. **MDQ daemon running**: `cd backend && make run-test`
4. **Test vault available**: With sample tasks in various states

---

## Test Scenarios

### 1. Decision Queue (Unit 3)

- [ ] **Load decisions**: Navigate to `/` - decisions should load from API
- [ ] **Empty state**: With no pending decisions, shows "All caught up!" message
- [ ] **Loading state**: Shows skeleton while fetching
- [ ] **Error state**: Stop Engine, refresh page - shows error with retry button
- [ ] **Pagination**: With 50+ decisions, scroll to bottom triggers load more

### 2. Decision Filtering

- [ ] **Filter by stage**: Click stage filters (triage, specify, etc.) - updates list
- [ ] **Filter by type**: Select item type (task, email, etc.) - filters correctly
- [ ] **Filter by project**: Select project - shows only matching decisions
- [ ] **Search**: Type in search box - filters by subject text
- [ ] **Clear filters**: "Clear filters" resets all filters

### 3. Decision Actions (Unit 4)

- [ ] **Resolve triage**: Select destination and project, click resolve
- [ ] **Resolve specify**: Add AI spec and criteria, click approve
- [ ] **Resolve review**: Click approve or request changes
- [ ] **Defer**: Click defer dropdown, select time, confirm
- [ ] **Undo**: After resolution, undo toast appears with countdown
- [ ] **Undo action**: Click undo button - decision returns to pending

### 4. Real-time Updates (Unit 5)

- [ ] **New decision**: Create task in MDQ - appears in queue automatically
- [ ] **Resolved decision**: Resolve via API - disappears from queue
- [ ] **Deferred resurface**: Wait for defer time - decision reappears
- [ ] **Connection indicator**: Shows green when connected
- [ ] **Reconnection**: Stop/start Engine - indicator shows reconnecting

### 5. Session Management (Unit 6)

- [ ] **Start session**: Click "Start Session" - shows active indicator
- [ ] **Session stats**: During session, shows duration and decisions count
- [ ] **End session**: Click "End Session" - resets to inactive state
- [ ] **Session persistence**: Refresh page - session state preserved

### 6. Error Handling (Unit 7)

- [ ] **Network error**: Disconnect network - shows offline banner
- [ ] **API error**: Engine returns 500 - shows error toast
- [ ] **Retry mechanism**: Error with retry button - clicking retries request
- [ ] **Toast auto-dismiss**: Success toasts dismiss after timeout
- [ ] **Manual dismiss**: Click X on toast - dismisses immediately

### 7. Entity Timeline (Unit 8)

- [ ] **Navigate to entity**: Click on task subject - goes to entity page
- [ ] **Timeline loads**: Shows state transition history
- [ ] **Progress bar**: Shows workflow progress (triage → specify → etc.)
- [ ] **Verification status**: Shows pass/fail for verification criteria

### 8. Settings (Unit 9)

- [ ] **Load settings**: Navigate to `/settings` - all sections load
- [ ] **General settings**: Toggle theme/notifications - saves to API
- [ ] **Models config**: Change model for role - updates assignment
- [ ] **Agents config**: Enable/disable agent - saves to API
- [ ] **Overseer config**: Change max retries - saves to API
- [ ] **API keys**: Shows masked values (read-only)

### 9. Agent Status (Unit 10)

- [ ] **Navigate to agents**: Go to `/agents` - shows agent list
- [ ] **Real-time status**: During execution, shows progress updates
- [ ] **Idle detection**: Agents without activity show "idle"
- [ ] **Error display**: Failed agents show error state
- [ ] **Logs link**: "View logs" links to filtered logs view

### 10. Decision Chaining (Unit 11)

- [ ] **Triage → Specify**: Resolve triage - specify decision appears
- [ ] **Specify → Verifying**: Resolve specify - verifying appears
- [ ] **Verifying → Review**: Pass verification - review appears
- [ ] **Review → Done**: Approve review - task marked done in MDQ
- [ ] **Progress indicator**: Cards show workflow stage

### 11. Execution Logs (Unit 14)

- [ ] **Navigate to logs**: Go to `/logs` - shows log list
- [ ] **Filter by agent**: Select agent - filters list
- [ ] **Filter by status**: Select SUCCESS/FAILED - filters list
- [ ] **Search by task**: Enter task path - searches logs
- [ ] **View detail**: Click log row - shows full execution detail
- [ ] **Prompt/response**: Expand sections - shows full content
- [ ] **Event timeline**: Shows execution events in order

### 12. All Decision Types

Test each decision type renders correctly:

- [ ] **Triage**: Route options, project/priority selection
- [ ] **Specify**: AI spec editor, success criteria list
- [ ] **Clarifying**: Question display, answer input
- [ ] **Checkpoint**: Blocking question with timer
- [ ] **Verifying**: Retry/override/escalate options
- [ ] **Review**: Approve/reject with feedback
- [ ] **Conflict**: Side-by-side version comparison
- [ ] **Escalate**: History and draft preview
- [ ] **Enrich**: Transcript enrichment fields
- [ ] **Meeting Triage**: Task extraction list
- [ ] **Approval**: Approve/reject workflow
- [ ] **Categorize**: Project/type assignment

---

## E2E Test Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/e2e/decisions.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed
```

---

## Known Issues

1. **WebSocket in background tabs**: Browser may throttle WebSocket - polling fallback handles this
2. **Large timelines**: Entity pages with 100+ events may need virtual scrolling
3. **Concurrent tabs**: Multiple tabs open separate WebSocket connections

---

## Sign-off

| Tester | Date | Version | Pass/Fail |
|--------|------|---------|-----------|
|        |      |         |           |

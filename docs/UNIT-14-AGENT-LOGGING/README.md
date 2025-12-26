# Unit 14: Agent Execution Logging

Frontend viewer for agent execution logs.

## Overview

This unit provides a UI for browsing and viewing detailed agent execution logs from the Engine's logging infrastructure. Users can filter logs by agent, status, and task path, then drill into individual executions to see full prompts, responses, and event timelines.

## Features

- **Log List**: Paginated table with agent, task, status, duration, cost
- **Filtering**: By agent name, status (SUCCESS/FAILED/etc.), task path search
- **Log Detail**: Full prompt and response content (collapsible)
- **Event Timeline**: Chronological execution events with tool invocations
- **Navigation**: Direct link from AgentCard and main nav

## Usage

### Accessing Logs

1. Click "Logs" in the main navigation
2. Or click "View Full Logs" on any AgentCard

### Filtering

- Select agent from dropdown to filter by agent name
- Select status to see only SUCCESS, FAILED, etc.
- Enter task path in search to find specific tasks

### Viewing Details

Click any row in the logs table to view full execution details:
- Execution summary (duration, cost, timestamps)
- Expandable Prompt section (full prompt sent to AI)
- Expandable Response section (full AI response)
- Event Timeline (tool invocations, checkpoints, etc.)
- Tool Calls (detailed input/output for each tool)

## API Integration

### Store Usage

```javascript
import { logsStore, logs, selectedLog, isLogsLoading } from '$lib/stores/logs';

// Load logs with filters
await logsStore.load({ agent: 'executor', status: 'FAILED' });

// Load more (pagination)
await logsStore.loadMore();

// Load specific log detail
await logsStore.loadDetail('exec-abc123');

// Clear filters
await logsStore.clearFilters();
```

### API Client

```javascript
import { logsApi } from '$lib/api/logs';

// List logs
const response = await logsApi.list({
  agent: 'executor',
  status: 'SUCCESS',
  limit: 50,
  offset: 0,
});

// Get log detail
const detail = await logsApi.get('exec-abc123');

// Get storage stats
const stats = await logsApi.getStats();
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/logs/` | GET | List logs with filtering |
| `/api/logs/{id}` | GET | Get full execution detail |
| `/api/logs/stats` | GET | Storage statistics |

### Query Parameters for List

| Parameter | Type | Description |
|-----------|------|-------------|
| agent | string | Filter by agent name |
| task | string | Filter by task path (contains) |
| status | string | Filter by status (SUCCESS, FAILED, etc.) |
| session | string | Filter by session ID |
| decision | string | Filter by decision ID |
| from_time | ISO string | Start of time range |
| to_time | ISO string | End of time range |
| limit | number | Max results (default 50) |
| offset | number | Pagination offset |

## Routes

| Route | Description |
|-------|-------------|
| `/logs` | Log list with filters |
| `/logs/[id]` | Log detail view |

## Testing

E2E tests are in `tests/e2e/logs.spec.ts`:

```bash
npx playwright test tests/e2e/logs.spec.ts
```

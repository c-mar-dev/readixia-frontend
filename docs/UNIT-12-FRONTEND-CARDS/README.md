# Unit 12: Frontend Decision Card Designs

Frontend UI components for decision types that require human input during AI task orchestration.

## Overview

This unit implements 4 decision card types:

| Card Type | Purpose | Key Features |
|-----------|---------|--------------|
| **Checkpoint** | Agent needs input to continue | Countdown timer, blocking questions, urgency indicator |
| **Approval** | Authorize an action | Approve/Reject buttons, implications display, feedback |
| **Conflict** | Resolve version conflicts | Side-by-side diff, merge editor, file path display |
| **Categorize** | Classify items | Category/project dropdowns, AI suggestion, collapsible fields |

## Installation

Components are automatically available via the `cards/` barrel export:

```javascript
import {
  CheckpointCard,
  ApprovalCard,
  ConflictCard,
  CategorizeCard
} from '$lib/components/cards';
```

## Usage

### Basic Usage in DecisionCard.svelte

```svelte
{#if decision.decisionType === 'checkpoint'}
  <CheckpointCard {decision} on:action={handleAction} on:defer={handleDefer} />
{:else if decision.decisionType === 'approval'}
  <ApprovalCard {decision} on:action={handleAction} on:defer={handleDefer} />
<!-- ... etc -->
{/if}
```

### Event Handling

All cards dispatch two events:

```javascript
// Action event - user submitted the card
function handleAction(event) {
  const { name, decision, payload } = event.detail;
  // name: Action button label (e.g., 'Submit Checkpoint', 'Approve Request')
  // decision: The decision object
  // payload: Form data collected from card
}

// Defer event - user wants to handle later
function handleDefer() {
  // Dispatch defer to parent
}
```

### Mock Data Structure

Each card type expects specific data in `decision.data`:

#### Checkpoint
```javascript
{
  data: {
    taskContext: 'Optimizing database queries',
    agentName: 'Claude Executor',
    expiresAt: '2024-12-25T12:00:00Z', // ISO timestamp
    progress: 'Step 2 of 5'
  },
  clarificationQuestions: [
    { id: 'q1', type: 'choice', text: 'Which option?', options: ['A', 'B'] },
    { id: 'q2', type: 'text', text: 'Any constraints?' }
  ]
}
```

#### Approval
```javascript
{
  data: {
    action: 'Deploy version 2.4.1 to production',
    context: 'All tests passed. Includes 3 bug fixes.',
    implications: 'Will affect all active users. Rollback available.',
    requestedBy: 'CI Pipeline',
    requestedAt: '5 minutes ago'
  }
}
```

#### Conflict
```javascript
{
  data: {
    filePath: 'tasks/write-report.md',
    conflictType: 'concurrent', // or 'version'
    myVersion: {
      seq: 47,
      timestamp: '2 min ago',
      actor: 'You (Obsidian)',
      changes: ['priority: p2', '_state: specifying']
    },
    incomingVersion: {
      seq: 47,
      timestamp: '1 min ago',
      actor: 'Claude (worker)',
      changes: ['priority: p1', '_state: specified']
    }
  }
}
```

#### Categorize
```javascript
{
  data: {
    preview: 'Please review the attached budget spreadsheet...',
    suggestedCategory: 'Reference',
    categories: ['Task Source', 'Reference', 'Archive', 'Spam'],
    suggestedProject: 'Finance',
    projects: ['Finance', 'Q1 Planning', 'Marketing'],
    showTypeSelector: false, // Show item type dropdown
    itemTypes: ['task', 'reference', 'archive'],
    additionalFields: [
      { name: 'From', value: 'email@example.com', editable: false },
      { name: 'Tags', value: 'budget', editable: true }
    ]
  }
}
```

## Resolution Payloads

Each card produces a specific resolution payload:

| Card | Payload |
|------|---------|
| Checkpoint | `{ answers: { q1: 'value', q2: 'value' } }` |
| Approval | `{ approved: true/false, feedback: 'optional text' }` |
| Conflict | `{ choice: 'keep_mine'/'take_theirs'/'merge', mergeContent?: 'text' }` |
| Categorize | `{ category: 'name', project: 'name', fieldUpdates: {...} }` |

## Styling

All cards use:
- Tailwind CSS for layout and styling
- Zinc color palette for dark mode
- Type-specific accent colors matching `decisionTypeConfig`

| Type | Color |
|------|-------|
| Checkpoint | Yellow (with glow) |
| Approval | Emerald (approve) / Red (reject) |
| Conflict | Red |
| Categorize | Pink |

## Testing

```bash
# Build check (no dedicated test command yet)
npm run build

# Development server
npm run dev
```

## Files

```
src/lib/
├── components/
│   ├── cards/
│   │   ├── index.ts           # Barrel export
│   │   ├── CheckpointCard.svelte
│   │   ├── ApprovalCard.svelte
│   │   ├── ConflictCard.svelte
│   │   └── CategorizeCard.svelte
│   └── DecisionCard.svelte    # Parent component (modified)
├── data/
│   └── decisions.js           # Type configs + mock data
├── stores/
│   └── types.ts               # TypeScript interfaces
└── utils/
    └── resolution.ts          # Payload builders
```

## Related Units

- **Unit 0A/0B**: Engine decision types (upstream)
- **Unit 4**: Decision actions (resolution handling)
- **Unit 5**: Test infrastructure (when available)

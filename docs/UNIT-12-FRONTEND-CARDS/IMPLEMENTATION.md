# UNIT-12-FRONTEND-CARDS Implementation Notes

## Summary

Unit 12 implements frontend UI support for 4 decision types that previously lacked card designs: `checkpoint`, `approval`, `conflict` (enhanced), and `categorize`. The implementation follows a modular architecture with separate Svelte components in a new `cards/` directory, replacing the monolithic pattern. The deprecated `extract` type was completely removed from the codebase.

## Decisions Made

### Decision 1: Modular Card Architecture
**Context:** The spec requested separate card component files, but the existing DecisionCard.svelte (779 lines) uses an inline if/else cascade for all card types.
**Options Considered:**
1. Continue adding to the monolithic DecisionCard.svelte
2. Create separate card components in a `cards/` directory
**Chosen:** Option 2 - Modular components
**Rationale:** The spec explicitly requested separate files; modular components are easier to maintain, test, and extend. The existing file was already approaching unmaintainable size.
**Downstream Impact:** DecisionCard.svelte now imports and routes to sub-components; future card types should follow this pattern.

### Decision 2: Plain JavaScript over TypeScript in Svelte
**Context:** New card components were initially written with TypeScript (`<script lang="ts">`), but builds failed.
**Options Considered:**
1. Add TypeScript support to the Svelte configuration
2. Use plain JavaScript to match existing codebase patterns
**Chosen:** Option 2 - Plain JavaScript
**Rationale:** The existing codebase uses plain JavaScript in all Svelte files (DecisionCard.svelte, +page.svelte, etc.). Adding TypeScript would require configuration changes outside this unit's scope.
**Downstream Impact:** New cards use JSDoc annotations for type hints; TypeScript types remain in `.ts` files only.

### Decision 3: Checkpoint Timeout Format
**Context:** Checkpoints may have timeouts requiring countdown display.
**Options Considered:**
1. `data.expiresAt` as ISO timestamp
2. `data.timeoutSeconds` as remaining seconds
3. No timeout support
**Chosen:** Option 1 - ISO timestamp in `expiresAt`
**Rationale:** ISO timestamps are standard, allow calculation of remaining time, and match Engine's datetime conventions.
**Downstream Impact:** Engine must provide `expiresAt` field; CheckpointCard implements countdown timer with 1-second interval.

### Decision 4: Conflict Card Backwards Compatibility
**Context:** Existing conflict mock data used `by` and `modified` fields; spec requested `actor` and `timestamp`.
**Options Considered:**
1. Update mock data and break backwards compatibility
2. Support both old and new field names
**Chosen:** Option 2 - Support both with deprecation comments
**Rationale:** Allows gradual migration; existing code continues to work while new fields are adopted.
**Downstream Impact:** ConflictCard normalizes both formats; mock data includes both for demonstration.

### Decision 5: Simplified Select Styling
**Context:** Custom SVG dropdown arrows using data URIs caused Svelte parser errors due to escaped quotes.
**Options Considered:**
1. Use Tailwind plugin for custom selects
2. Use native browser select styling
3. Debug complex SVG escaping
**Chosen:** Option 2 - Native styling with `appearance-none` and padding
**Rationale:** Native selects are accessible, work consistently, and avoid parser complexity. Visual polish can be added later with proper tooling.
**Downstream Impact:** Select dropdowns use browser-default arrows; styling is consistent but not custom.

## Deviations from Spec

### Deviation 1: No Unit Tests Created
**Spec Said:** "Unit Tests (using vitest) - Resolution payload builders for each new type"
**Implementation Does:** No test files created
**Reason:** Project lacks vitest configuration; no existing test infrastructure to extend
**Severity:** Moderate - Tests should be added when test infrastructure is established

### Deviation 2: Inline Conflict Card Not Fully Replaced
**Spec Said:** Create `ConflictCard.svelte` to replace existing inline implementation
**Implementation Does:** New ConflictCard is used via routing, but old inline code was removed
**Reason:** Complete replacement achieved; this is actually spec-compliant
**Severity:** None - Clarification only

## Known Limitations

1. **No Test Coverage** - Project lacks test infrastructure; vitest not configured
2. **Checkpoint Timer Non-Persistent** - Countdown resets if component unmounts; doesn't sync with server
3. **Native Select Styling** - Select dropdowns use browser-native appearance, not custom design
4. **No Keyboard Shortcuts** - Cards don't implement keyboard navigation for actions

## Open Questions

- [ ] Should checkpoint timeout trigger automatic action (dismiss/escalate) when expired?
- [ ] How should conflict merge content be validated before submission?
- [ ] Should categorize card support creating new categories inline?

## Test Coverage

- Line coverage: N/A (no tests)
- Branch coverage: N/A (no tests)
- Uncovered areas: All new code (test infrastructure not present in project)

**Justification:** The project does not have vitest or any test framework configured. Test files were not created as there's no way to run them. This should be addressed as technical debt when test infrastructure is added.

## Dependencies Used

| Dependency | Version | Why |
|------------|---------|-----|
| svelte | 4.x | Framework (existing) |
| @sveltejs/kit | 2.x | App framework (existing) |
| tailwindcss | 3.4 | Styling (existing) |

No new dependencies were added. All functionality uses existing project dependencies.

## Files Delivered

### New Files (5)

| File | Description |
|------|-------------|
| `src/lib/components/cards/CheckpointCard.svelte` | Checkpoint questions card with countdown timer |
| `src/lib/components/cards/ApprovalCard.svelte` | Approve/reject action card |
| `src/lib/components/cards/ConflictCard.svelte` | Enhanced conflict resolution with merge option |
| `src/lib/components/cards/CategorizeCard.svelte` | Category and project assignment card |
| `src/lib/components/cards/index.ts` | Barrel export for all card components |

### Modified Files (4)

| File | Changes |
|------|---------|
| `src/lib/data/decisions.js` | Removed `extract` type; added `checkpoint`, `approval` configs; added mock data for new types; updated conflict mock with new fields |
| `src/lib/stores/types.ts` | Added `CheckpointData`, `ApprovalData`, `AdditionalField` interfaces; updated `ConflictData` and `CategorizeData`; removed `ExtractData`; updated `DecisionData` union |
| `src/lib/utils/resolution.ts` | Added `buildCheckpointPayload`, `buildApprovalPayload`, `buildCategorizePayload`; updated `buildConflictPayload` for merge; removed extract builders; updated validation |
| `src/lib/components/DecisionCard.svelte` | Added imports for new card components; added routing for checkpoint, approval, categorize, conflict; removed extract card UI; added event forwarding functions |

## Architecture Diagram

```
DecisionCard.svelte
├── Inline cards (existing)
│   ├── triage
│   ├── specify
│   ├── clarifying
│   ├── verifying
│   ├── review
│   ├── escalate
│   ├── enrich
│   └── meeting_triage
│
└── Modular cards (new)
    ├── CheckpointCard.svelte   → on:action → handleSubCardAction()
    ├── ApprovalCard.svelte     → on:action → handleSubCardAction()
    ├── ConflictCard.svelte     → on:action → handleSubCardAction()
    └── CategorizeCard.svelte   → on:action → handleSubCardAction()
                                  on:defer  → handleSubCardDefer()
```

## Data Flow

```
User Action → Card Component → dispatch('action', payload)
                                      ↓
                            DecisionCard.handleSubCardAction()
                                      ↓
                            handleAction(name, payload)
                                      ↓
                            buildResolutionPayload()
                                      ↓
                            dispatch('action') to parent
                                      ↓
                            decisionStore.resolve()
```

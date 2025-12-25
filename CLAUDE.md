# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "decisions-dashboard" - a SvelteKit front-end application that provides a decision queue interface. Users can triage, review, specify, enrich, and categorize various items (tasks, transcripts, emails) through a filterable queue UI.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Tech Stack

- **Framework**: SvelteKit 2.x with Svelte 4
- **Styling**: Tailwind CSS 3.4
- **Build**: Vite 5
- **Adapter**: @sveltejs/adapter-auto (auto-detects deployment target)

## Architecture

The application is a single-page decision queue interface with:

- **src/routes/+page.svelte**: Main page containing all logic and UI. Includes:
  - Mock data structures for decisions (triage, review, specify, enrich, categorize types)
  - Multi-dimensional filtering (by stage, thing type, project)
  - Two-panel layout: left queue list, right detail panel
  - Reactive Svelte state management using `$:` declarations

- **src/routes/+layout.svelte**: Root layout that imports global CSS

- **src/app.css**: Tailwind directives only

## Decision Types

The UI supports five decision workflow stages:
- `enrich`: Add context to transcripts (speaker info, project assignment)
- `triage`: Route tasks (specify for AI, execute, do manually, defer)
- `specify`: Provide details for AI execution
- `review`: Approve/revise/reject AI work
- `categorize`: Classify emails (task source, reference, ignore)

## Styling Convention

Uses Tailwind's zinc color palette for dark mode UI with amber as the accent color.

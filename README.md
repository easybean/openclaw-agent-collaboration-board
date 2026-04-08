# OpenClaw Agent Collaboration Board

Lightweight collaboration observability for multi-agent execution.

## Overview

OpenClaw Agent Collaboration Board is a lightweight observability plugin for OpenClaw.
It is designed for solo founders and multi-agent teams who need to quickly answer questions like:

- Which agents are truly progressing?
- Which tasks are blocked?
- Which tasks are actually waiting, even if they look active?
- Which items need a founder decision right now?

The first version focuses on a Telegram text board instead of a heavy dashboard.

## Why this exists

In multi-agent execution, chat messages are visible, but execution state often is not.
That creates a recurring management problem:

- an agent says it is working, but is actually waiting
- a task is completed, but the result is not reported back
- a task is blocked, but nobody escalates it
- the founder cannot tell what is truly moving without manually reading long conversations

This project exists to make collaboration state visible, actionable, and compact.

## MVP goals

The first MVP focuses on four things:

1. **Recent collaboration**
2. **Current tasks**
3. **Blockers**
4. **Decision-needed items**

The goal is not to build a full workflow product on day one.
The goal is to build a useful observability layer for real agent execution.

## MVP scope

### Included in v1
- Telegram text board
- Task/State aggregation
- ACK-aware collaboration status
- Runtime-oriented status interpretation
- `stale` detection for fake progress
- `needsDavidAction` style decision-needed visibility

### Not included in v1
- graphical dashboard UI
- drag-and-drop workflow management
- complex inline task editing
- full event sourcing system
- advanced lease/dead-letter/compensation semantics

## Core ideas

### 1. Task/State is the primary status source
The board should not rely only on raw chat messages.
It should primarily read structured task state.

### 2. ACK matters
Message delivery is not the same as task acceptance.
The board needs to understand whether a task is:
- sent
- received
- running
- blocked
- waiting
- completed

### 3. Runtime truth matters more than optimistic wording
A task marked `running` is not enough.
If it has no recent movement, no result, and no next actor, it may actually be `stale`.

### 4. The founder needs management truth, not message volume
The purpose of the board is not to replay chats.
The purpose is to expose what is moving, what is waiting, and what needs a decision.

## Architecture

The MVP pipeline is:

1. **Collector**
   - gather Task/State
   - gather ACK status
   - use session text only as fallback

2. **Normalizer**
   - map raw sources into one internal board shape

3. **Evaluator**
   - determine actual progress
   - identify stale tasks
   - identify blockers and decision-needed items

4. **Renderer**
   - output Telegram-friendly board text

## Key concepts

### `owner`
The person or role responsible for the result.

### `executor`
The person or role currently executing the task.

### `stale`
A task that looks active on the surface but is not truly progressing.

### `needsDavidAction`
A task or issue that needs a founder decision, approval, or priority call.

## Example output

See:
- [`examples/telegram-output.md`](examples/telegram-output.md)

## Current project status

Current project artifacts already include:

- product plan
- technical design
- MVP field mapping
- MVP implementation task breakdown
- GitHub repository initialization

The project has moved past concept discussion and entered MVP implementation planning.

## Documentation

Current docs:

- [`docs/plugin-plan.md`](docs/plugin-plan.md)
- [`docs/technical-design.md`](docs/technical-design.md)
- [`docs/mvp-fields-and-mapping.md`](docs/mvp-fields-and-mapping.md)
- [`docs/mvp-implementation-tasks.md`](docs/mvp-implementation-tasks.md)

## Roadmap

### Near term
- finalize MVP pipeline boundaries
- implement collector / normalizer / evaluator / renderer skeleton
- generate first Telegram board output from structured data

### Later
- better session fallback extraction
- richer stale/blocker heuristics
- more channels beyond Telegram
- stronger workflow observability and alerting

## Project status

This repository is currently in early build stage.
The first milestone is to make the Telegram text board useful enough for real founder oversight.

## License

MIT

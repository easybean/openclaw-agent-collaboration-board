# OpenClaw Agent Collaboration Board

Lightweight collaboration observability for multi-agent execution.

## What it is

OpenClaw Agent Collaboration Board is a lightweight observability plugin for multi-agent execution.
It helps solo founders see which agents are truly progressing, which are blocked, which are waiting, and which tasks need a decision.

## Why it exists

In multi-agent workflows, messages are visible but execution state is often not.
This creates common problems:
- an agent says it is working, but is actually waiting
- a task is completed, but the result is not reported back
- a task is blocked, but nobody escalates it
- the founder cannot quickly tell what is truly moving

This project is built to make those states visible.

## MVP scope

Version 1 focuses on a Telegram text board that shows:
- recent collaboration
- current tasks
- blockers
- decision-needed items

It does not try to provide:
- a complex dashboard UI
- heavy workflow editing
- graphical drag-and-drop management

## Core concepts

- Task/State
- ACK
- Runtime Lead
- stale
- needsDavidAction

## Architecture

The MVP pipeline is:
1. collector
2. normalizer
3. evaluator
4. renderer

## Current status

The project has:
- product plan
- technical design
- MVP field mapping
- MVP implementation task breakdown
- GitHub initialization

Implementation is starting from the MVP pipeline.

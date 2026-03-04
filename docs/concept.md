# App Concept: AI-Powered Technical Advisor for Non-Technical Teams

## Problem

When PMs, designers, or clients propose features or report bugs, they lack technical context. Devs end up going back and forth explaining why something is complex, not feasible, or needs to be scoped differently.

## Solution

An AI layer with codebase access that guides non-technical people through refining their ideas before they ever reach a dev.

## Structure

**Project** (top level)

- Connected git repo (GitHub/GitLab/Azure DevOps — read access)
- Docs (lightweight knowledge base the AI can reference)
- Tasks (vetted units of work)
- Conversations (AI-guided refinement sessions)
- Triage (quick-add inbox)

## Core Entities

### Triage Items

Low-friction inputs. Drop a one-liner, voice note, screenshot, whatever. No structure needed. Just capture the thought.

### Conversations

The core experience. A chat with AI that has access to the codebase and project docs (pulled in as needed, not always loaded). The AI helps the user:

- Understand **feasibility** — what parts of the codebase are involved, what's complex
- **Refine** the request — asks smart questions, surfaces edge cases
- Estimate **impact** — what's affected, rough complexity signal
- Produce a **dev-ready brief** — clear, scoped description (no implementation plan)

A conversation can be started from a triage item or from scratch. Its output is **0 to many tasks** — the idea might be bad (0), straightforward (1), or need to be broken down (multiple).

### Tasks

Only created as output of conversations. Always pre-vetted and scoped. These are what devs actually work from.

### Docs

Project knowledge base. Context the AI can pull in when relevant (tool-call pattern — not always in context).

## What It's Not

- Not a full project management tool
- Not a dev tool or code editor
- Not generating implementation plans

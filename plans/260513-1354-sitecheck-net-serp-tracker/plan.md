---
title: "SiteCheck.net - Full-Stack SERP Tracker (Next.js + MongoDB)"
description: "Full rebuild of sitecheck crawler as a multi-tenant SaaS with workspaces, keyword lists, SERP crawling, position tracking, and admin panel"
status: pending
priority: P1
created: 2026-05-13
---

# SiteCheck.net - Full-Stack SERP Tracker (Next.js + MongoDB)

## Overview

Port and upgrade the existing Express-based Google SERP crawler (`/Users/elknowsdev/Documents/CODE/meo/sitecheck`) into a production-grade Next.js application. Core change: multi-tenant workspace model (one domain per workspace, like Google Search Console), keyword list management per workspace with country targeting, position history tracking, and an admin panel for user/proxy/workspace management.

**Tech Stack:** Next.js 15 (App Router) · MongoDB (Mongoose) · shadcn/ui (shadcn-admin template) · NextAuth.js · BullMQ + Redis · PM2 · TypeScript

**Deployment:** Native instance (dev/prod) managed by PM2. Docker Compose = local dev only (spins up MongoDB + Redis, app/worker run natively).

**Source Reference:** `/Users/elknowsdev/Documents/CODE/meo/sitecheck` — existing crawler logic to be ported.

## Phases

| Phase | Name | Status | Effort |
|-------|------|--------|--------|
| 1 | [Project Setup & Infrastructure](./phase-01-project-setup-infrastructure.md) | Pending | 3h |
| 2 | [Database Models & Base Services](./phase-02-database-models-base-services.md) | Pending | 4h |
| 3 | [Authentication System](./phase-03-authentication-system.md) | Pending | 3h |
| 4 | [Workspace Management](./phase-04-workspace-management.md) | Pending | 4h |
| 5 | [Keyword List Management](./phase-05-keyword-list-management.md) | Pending | 3h |
| 6 | [SERP Crawler Engine (Port)](./phase-06-serp-crawler-engine-port.md) | Pending | 6h |
| 7 | [Results & Position Tracking](./phase-07-results-position-tracking.md) | Pending | 4h |
| 8 | [Admin Panel](./phase-08-admin-panel.md) | Pending | 4h |
| 9 | [Proxy Management](./phase-09-proxy-management.md) | Pending | 2h |
| 10 | [Docker & Deployment Config](./phase-10-docker-deployment-config.md) | Pending | 2h |

## Key Architectural Decisions

- **BaseService pattern** — all business logic via `abstract BaseService<TInput, TOutput>` with single `call()` method
- **BullMQ** (Redis-backed) for crawl job queue instead of plain cron — provides concurrency control, retries, visibility
- **NextAuth.js** with Credentials provider — JWT sessions, admin role from `.env`
- **Mongoose** (not Prisma) — matches existing stack, flexible schema for SERP results
- **No Redis caching** in MVP — BullMQ queue is the only Redis usage to minimize complexity

## Data Model Summary

```
User → Workspace (1:N, owner)
Workspace → WorkspaceMember (1:N, collaborators)
Workspace → KeywordList (1:N)
KeywordList → CrawlJob (1:N, triggered runs)
CrawlJob → SerpResult (1:N, one per keyword per run)
Proxy → ProxyCountry (1:N, country mapping)
```

## Dependencies

<!-- No blocking cross-plans detected -->

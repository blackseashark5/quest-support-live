
# AtomQuest Support Connect — v1 Plan (P0)

Enterprise-minimal SaaS for 1:1 (and small-group ≤4) live video support. No third-party media vendor — all WebRTC runs **browser-to-browser** with Supabase Realtime as the signaling channel.

## Scope (P0 only)

Sessions, video/audio, screen share, in-call chat, JWT auth + roles, secure invite tokens, agent dashboard, customer join flow, video room, session history. P1 (recording, file sharing, reconnect UX) and P2 (admin/observability) are explicitly **deferred** to a follow-up turn.

## Stack adjustments vs. brief

| Brief said | Actual (Lovable) | Why |
|---|---|---|
| Next.js 15 | TanStack Start (React 19) | Required by this platform |
| NestJS + Socket.IO + Mediasoup + Redis + MinIO + Docker | Lovable Cloud (Supabase: Postgres, Auth, Realtime, Storage) + browser WebRTC | No long-lived servers, no native addons in this runtime |
| JWT auth | Supabase Auth (issues JWTs under the hood) | Equivalent, integrated |
| Netlify deploy | TanStack Start source code; user exports & deploys | Acknowledged: user will adapt for Netlify themselves |

Keep from brief: Tailwind, shadcn/ui, Zustand, React Hook Form + Zod, Recharts, dark/light mode, accessibility, toasts, error boundaries, loading skeletons.

## Architecture

```text
Browser (Agent)  <— WebRTC P2P media —>  Browser (Customer)
        \                                    /
         \—— Supabase Realtime (signaling) ——/
                       |
              Supabase (Postgres + Auth + Storage)
```

- **Signaling**: Supabase Realtime broadcast channel per session — exchanges SDP offers/answers + ICE candidates.
- **Media**: `RTCPeerConnection` direct P2P with public STUN. Works for 1:1 reliably; mesh up to ~4 participants.
- **Persistence**: All session state, chat, events written via `createServerFn` with `requireSupabaseAuth`.

## Database schema (Supabase migration)

Tables (with RLS + grants):
- `profiles` — id (FK auth.users), name, email, created_at
- `user_roles` — separate table; enum `app_role` = `agent | customer | admin`; `has_role()` SECURITY DEFINER fn
- `sessions` — id, session_code, agent_id, title, customer_name, notes, status (`created|waiting|active|ended`), started_at, ended_at, duration_seconds
- `session_invites` — id, session_id, token (random), expires_at, used, created_at
- `session_participants` — id, session_id, user_id (nullable for guest), display_name, joined_at, left_at, connection_status
- `messages` — id, session_id, sender_id, sender_name, body, created_at
- `session_events` — id, session_id, event_type, payload jsonb, created_at

RLS:
- Agents read/write own sessions; admins read all.
- Participants (matched by user_id OR valid invite token claim) read their session's messages/events.
- Invite tokens validated by a `redeem_invite(token)` SECURITY DEFINER RPC that returns session info + creates a participant row.

## Server functions (`src/lib/*.functions.ts`)

- `sessions.functions.ts` — `createSession`, `endSession`, `listMySessions`, `getSession`
- `invites.functions.ts` — `createInvite` (agent), `redeemInvite` (public, validates token)
- `messages.functions.ts` — `sendMessage`, `listMessages` (Realtime subscription handles live updates from client)
- `events.functions.ts` — `logEvent`

All authenticated fns use `requireSupabaseAuth`. `redeemInvite` is public (a TSS server route under `/api/public/redeem-invite`) since customers may not have accounts — returns a short-lived session JWT or guest participant token stored in localStorage.

## Routes (file-based, TanStack)

Public:
- `/` — landing (hero, features, architecture diagram, CTAs: "Agent sign in" / "Join session")
- `/auth` — sign in / sign up (email+password; agents/admins)
- `/join` — customer enters invite link/token, lands in waiting room
- `/join/$token` — direct invite link

Authenticated (`_authenticated/`):
- `/dashboard` — agent home: active sessions, past sessions, create-session button
- `/sessions/new` — create-session modal/page (form: customer name, title, notes → generates invite link + token)
- `/sessions/$id` — agent view of one session (details, transcript, events)
- `/history` — filterable table (date, status)

Shared (auth OR valid invite):
- `/room/$sessionId` — the video call room

## Video room UI

Layout matches brief:
```text
┌──────────────────────────────────────────────┐
│ Header: session title • participants • status │
├───────────────────────────┬──────────────────┤
│                           │                  │
│      Remote video         │   Chat sidebar   │
│      Local PIP            │   (toggleable)   │
│                           │                  │
├───────────────────────────┴──────────────────┤
│ Controls: mic | cam | screen | end | chat    │
└──────────────────────────────────────────────┘
```

Hooks:
- `useWebRTC(sessionId, role)` — manages `RTCPeerConnection`, local/remote streams, ICE via Supabase Realtime
- `useSignaling(sessionId)` — Supabase channel: `offer`, `answer`, `ice`, `peer-joined`, `peer-left`
- `useChat(sessionId)` — `messages` table + Realtime subscription
- Zustand store for call state (muted, camOff, sharing, peers)

Connection indicators driven by `RTCPeerConnection.connectionState`.

## Design

Enterprise minimal, Linear/Intercom feel. Tokens defined in `src/styles.css`:
- Palette: **Slate & Steel** base (`#2d3748 → #a0aec0`) with a single **electric indigo** accent (`#4f46e5`)
- Typography: `space-grotesk-dm-sans` (Space Grotesk headings, DM Sans body)
- Dark + light mode via `.dark` class toggle (persisted)
- Radius `0.625rem`, restrained motion, subtle elevation

All colors via semantic tokens (`bg-background`, `text-foreground`, `bg-primary`, etc.) — no hardcoded hex in components.

## Cross-cutting

- Error boundaries on root + each route's `errorComponent` / `notFoundComponent`
- `sonner` toasts for actions
- Skeletons for dashboard tables, room loading
- Keyboard shortcuts in room: `M` mute, `V` camera, `S` share, `C` chat, `E` end
- Zod schemas for every form + server-fn validator

## Deliverables this turn

1. Enable Lovable Cloud
2. Supabase migration: tables + enum + roles + RLS + grants + `has_role` + `redeem_invite`
3. Auth pages (email/password) + role assignment on signup (default `agent` for self-signup; customers join as guests via token)
4. Server functions for sessions/invites/messages/events
5. Landing, dashboard, create session, join, room, history routes
6. WebRTC + signaling hooks, full room UI with controls and chat
7. Design tokens (light + dark), shared layout/header, toasts, error boundaries

## Explicitly out of scope this turn

- Recording (P1) — will add `MediaRecorder` + Supabase Storage upload next
- File sharing (P1)
- Reconnect UX polish (P1)
- Admin dashboard + observability (P2)
- Any SFU / Mediasoup work (cannot run in Lovable — separate self-hosted project)
- Netlify-specific config (you'll adapt on export)

## Open assumptions (will proceed unless you say otherwise)

- Self-signup creates an **agent** account; admins are promoted manually via SQL. Customers never sign up — they join via invite token only.
- Invite tokens expire in **24h** by default.
- Group size capped at **4** participants (mesh limit).

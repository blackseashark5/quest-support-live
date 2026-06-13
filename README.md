# AtomQuest Support Connect

A browser-based **Real-Time Video Support Platform** built for customer support teams to conduct secure, live, video-assisted troubleshooting sessions with chat, session tracking, recordings, and role-based access.

## Live Demo

**Production Demo:** https://quest-support-live.lovable.app/

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Key Features](#key-features)
- [Roles](#roles)
- [Live Demo Flow](#live-demo-flow)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Database Design](#database-design)
- [Security](#security)
- [Folder Structure](#folder-structure)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Future Enhancements](#future-enhancements)
- [Demo Credentials](#demo-credentials)
- [Submission Details](#submission-details)
- [License](#license)

---

## Overview

AtomQuest Support Connect is a full-stack web application designed for modern customer support teams that need more than just voice calls.

When a customer issue requires visual context, a traditional support call is often not enough. This platform solves that by enabling:
- real-time browser-based video calling,
- in-call chat,
- secure invite-based access,
- session history tracking,
- recording support,
- file sharing,
- and admin monitoring.

The application is built to feel like a professional enterprise support tool, while staying simple enough for a customer to join without installation.

---

## Problem Statement

Customer support teams often struggle when a problem cannot be diagnosed over voice alone. Visual troubleshooting is needed for:
- device setup,
- product installation,
- UI walkthroughs,
- field support,
- and verification of physical issues.

This platform provides a secure and self-owned real-time video support system that support teams can control end to end, without depending on third-party hosted video APIs.

---

## Key Features

### Session Management
- Agent can create a new support session
- Customer can join through a secure invite link or token
- Session participants are tracked in real time
- Either participant can end the session
- Session history is persisted and queryable

### Real-Time Video Calling
- Browser-based audio/video support
- Stable in-call communication
- Mute/unmute microphone
- Turn camera on/off
- Connection status handling
- Media routed through owned infrastructure

### In-Call Chat
- Real-time text messaging during active calls
- Persistent chat history
- Timestamped messages
- Session-linked conversation records

### Call Recording
- Agent can start and stop recording
- Recording state tracking
- Recording processing and availability status
- Final recording can be downloaded or reviewed later

### File Sharing
- Share images, PDFs, and documents during a call
- Secure file storage
- File history linked to the session record

### Reconnect Handling
- Temporary disconnect recovery
- Grace window for seamless rejoin
- Restores user state without interrupting the other participant unnecessarily

### Admin Dashboard
- Live active session monitoring
- Session duration tracking
- Participant details
- Session logs and audit visibility
- Ability to end active sessions

### Observability
- Metrics for active sessions
- Connected participants
- Error rates
- Monitoring-friendly operational data

---

## Roles

### Agent
The support agent can:
- create sessions
- generate invite links or tokens
- initiate and end calls
- start and stop recording
- view call/session history
- monitor participant activity

### Customer
The customer can:
- join only through a valid invite
- participate in the video call
- chat during the session
- share files if enabled
- reconnect if the network drops temporarily

Role-based access control ensures customers cannot perform agent-only actions.

---

## Live Demo Flow

A complete end-to-end demo should look like this:

1. Agent logs into the platform
2. Agent creates a new session
3. The system generates an invite link/token
4. Customer opens the invite link in the browser
5. Customer joins the session
6. Both users connect in real time
7. Video, audio, and chat work during the session
8. Agent can optionally start recording
9. Session can be ended cleanly
10. Session data remains available in history

---

## Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Shadcn UI

### Backend
- NestJS
- TypeScript
- Socket.IO
- JWT Authentication

### Database
- PostgreSQL
- Prisma ORM

### Storage
- MinIO Object Storage

### Real-Time Communication
- WebSockets
- Self-hosted SFU architecture
- Mediasoup

### Infrastructure
- Docker
- Docker Compose
- Nginx

### Monitoring
- Prometheus
- Grafana
- Loki

---

## System Architecture

```text
Frontend (Next.js)
        ↓
API / Backend (NestJS)
        ↓
Auth + Session + Chat Services
        ↓
WebSocket Signaling Layer
        ↓
Self-Hosted Media Server (Mediasoup SFU)
        ↓
PostgreSQL + Redis + MinIO

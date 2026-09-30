# Converge

A real-time collaborative code editor built with React, WebSockets, Yjs, and PostgreSQL.

## Features

- Create projects and files
- Edit a file with multiple people in real time
- See collaborator cursors, selections, names, and colors
- Persist document updates in PostgreSQL

## Tech stack

- React, TypeScript, Vite, and Monaco Editor
- Node.js, TypeScript, and `ws`
- Yjs and `y-monaco` for collaborative editing
- PostgreSQL for project, file, and document-update storage

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+

### Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### Configure the database

Create a database and add a `server/.env` file:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/converge
```

Create the required tables:

```bash
psql "$DATABASE_URL" -f server/db/schema.sql
```

### Start the app

Run these commands in separate terminals:

```bash
cd server && npm run dev
```

```bash
cd client && npm run dev
```

Open the client URL shown by Vite, usually `http://localhost:5173`.

## How collaboration works

Each editor has a Yjs document. When someone types, the client sends a Yjs update over a WebSocket. The server stores that update, applies it to the in-memory document, and broadcasts it to other clients viewing the same file. Yjs merges simultaneous edits safely.

Cursor and presence information uses Yjs Awareness. It is sent over the same WebSocket connection but is not saved to the database.

## Project structure

```text
client/   React, Monaco Editor, and browser collaboration code
server/   HTTP API, WebSocket server, and PostgreSQL queries
docs/     Performance notes
```

## Scripts

```bash
# Start the client
cd client && npm run dev

# Build the client
cd client && npm run build

# Lint the client
cd client && npm run lint

# Start the server
cd server && npm run dev
```

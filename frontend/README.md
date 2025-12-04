# NoteAI Frontend

React + TypeScript frontend for the NoteAI lecture highlight extraction platform.

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **TailwindCSS** - Styling framework
- **Shadcn/ui** - Component library
- **TanStack Router** - Type-safe routing
- **TanStack Query** - Data fetching
- **Clerk** - Authentication
- **Axios** - HTTP client

## Quick Start

### Prerequisites

- **Node.js** v18+ installed

### Installation

```bash
cd frontend

# install dependencies
npm install

# configure environment
cp .env.example .env
```

Edit `.env`:

```bash
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws
VITE_CLERK_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXX
```

### Run Development Server

```bash
npm run dev
```

Frontend available at: **http://localhost:5173**

## Available Scripts

```bash
npm run dev          # start dev server
npm run build        # build for production
npm run preview      # preview production build
npm run lint         # check for lint errors
npm run lint:fix     # auto-fix lint errors
npm run format       # format code with prettier
npm run type-check   # run TypeScript checks
```

## Project Structure

```
src/
├── components/      # reusable UI components
│   └── ui/         # shadcn components
├── routes/         # TanStack Router pages
├── lib/            # utilities and API client
├── hooks/          # custom React hooks
└── assets/         # static files
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:8000/api/v1` |
| `VITE_WS_URL` | WebSocket URL for real-time updates | `ws://localhost:8000/ws` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk authentication key | `pk_test_...` |

## Code Quality

Before committing, ensure code passes:

```bash
npm run lint:fix && npm run format && npm run type-check
```

**Enforced Standards:**
- ESLint with React/TypeScript rules
- Prettier formatting (single quotes, 2 spaces)
- Import organization (React → external → internal → relative)
- Unused imports/variables removed automatically

## Adding UI Components

Use Shadcn CLI:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

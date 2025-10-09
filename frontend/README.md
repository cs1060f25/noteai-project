# Frontend

React + TypeScript frontend application built with Vite.

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Shadcn/ui** - UI components

## Quick Start

```bash
# install dependencies
npm install

# copy environment variables
cp .env.example .env

# start development server
npm run dev
```

## Available Scripts

```bash
npm run dev          # start dev server (http://localhost:5173)
npm run build        # build for production
npm run preview      # preview production build
npm run lint         # check for lint errors
npm run lint:fix     # auto-fix lint errors
npm run format       # format code with prettier
npm run format:check # check code formatting
```

## Project Structure

```
src/
├── components/      # reusable UI components
│   └── ui/         # shadcn components
├── lib/            # utilities and configurations
│   ├── api.ts      # axios client setup
│   └── utils.ts    # helper functions
├── assets/         # static files
├── App.tsx         # main app component
└── main.tsx        # app entry point
```

## Environment Variables

Create a `.env` file in the root directory:

```bash
VITE_API_URL=http://localhost:8000/api
```

Access in code: `import.meta.env.VITE_API_URL`

## API Usage

Use the pre-configured axios client for all API calls:

```tsx
import { apiClient } from '@/lib/api';

// type-safe requests
interface User {
  id: string;
  name: string;
}

const users = await apiClient.get<User[]>('/users');
const newUser = await apiClient.post<User>('/users', { name: 'John' });
```

See `src/lib/README.md` for detailed API client documentation.

## Code Standards

### ESLint Rules

- ✅ Unused imports automatically removed
- ✅ Unused variables warned
- ✅ Import ordering enforced (React → external → internal → relative)
- ✅ Alphabetically sorted imports

### Prettier Configuration

- Single quotes
- Semicolons enabled
- 100 character line width
- 2 space indentation

Run `npm run lint:fix && npm run format` before committing.

## Adding Components

Use shadcn CLI to add components:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
```

## Path Aliases

Configure in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Usage: `import { Button } from '@/components/ui/button';`

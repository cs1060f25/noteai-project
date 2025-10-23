import { createRouter } from '@tanstack/react-router';

import { routeTree } from './routeTree.gen';

// create the router instance
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

// register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

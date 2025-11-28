import { Outlet } from '@tanstack/react-router';

import { LandingNavbar } from './LandingNavbar';
import { Footer } from './layout/Footer';
import { ScrollToTop } from './ScrollToTop';

export function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <LandingNavbar />
      <div className="flex-grow">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

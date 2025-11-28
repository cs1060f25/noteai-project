import { Outlet } from '@tanstack/react-router';
import { ScrollToTop } from './ScrollToTop';
import { Footer } from './layout/Footer';
import { LandingNavbar } from './LandingNavbar';

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

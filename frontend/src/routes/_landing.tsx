import { createFileRoute, Outlet } from '@tanstack/react-router';

import { LandingNavbar } from '../components/LandingNavbar';
import { Footer } from '../components/layout/Footer';
import { ScrollToTop } from '../components/ScrollToTop';

export const Route = createFileRoute('/_landing')({
  component: LandingLayout,
});

function LandingLayout() {
  return (
    <>
      <ScrollToTop />
      <LandingNavbar />
      <Outlet />
      <Footer />
    </>
  );
}

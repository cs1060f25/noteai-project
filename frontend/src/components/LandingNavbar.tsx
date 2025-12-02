import { useState } from 'react';

import { Link } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

const productLinks = [
  { title: 'Features', href: '/#features', description: 'Explore our powerful AI capabilities.' },
  {
    title: 'How It Works',
    href: '/#how-it-works',
    description: 'Three simple steps to transform your content.',
  },
  { title: 'Pricing', href: '/pricing', description: 'Simple, transparent pricing for everyone.' },
  { title: 'Use Cases', href: '/use-cases', description: 'Discover how NoteAI fits your needs.' },
];

const companyLinks = [
  { title: 'About', href: '/about', description: 'Learn more about our mission and team.' },
  { title: 'Blog', href: '/blog', description: 'Read our latest updates and stories.' },
  { title: 'Contact', href: '/contact', description: 'Get in touch with us.' },
];

export const LandingNavbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <motion.header
      className="border-b border-border/50 glass-header sticky top-0 z-50 backdrop-blur-xl"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="relative flex items-center justify-between h-16 px-6 lg:px-8">
          {/* logo */}
          <div className="flex items-center shrink-0">
            <Link
              to="/"
              className="flex items-center gap-3 no-underline hover:no-underline cursor-pointer"
              aria-label="Home"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                className="flex items-center gap-3"
              >
                <motion.div
                  className="w-10 h-10 flex items-center justify-center"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <img
                    src="/logo.png"
                    alt="NoteAI Logo"
                    className="w-full h-full object-contain cursor-pointer"
                  />
                </motion.div>
                <span className="text-lg font-semibold text-foreground tracking-tight hover:text-primary transition-colors">
                  NoteAI
                </span>
              </motion.div>
            </Link>
          </div>

          {/* desktop navigation - centered */}
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Product</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                      <li className="row-span-4">
                        <NavigationMenuLink asChild>
                          <Link
                            className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                            to="/"
                          >
                            <img
                              src="/ai_agent.png"
                              alt="NoteAI Agent"
                              className="w-full rounded-md object-cover mb-4"
                            />
                            <div className="mb-2 text-lg font-medium">NoteAI</div>
                            <p className="text-sm leading-tight text-muted-foreground">
                              Transform your lectures into highlight clips with AI-powered
                              processing.
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      {productLinks.map((link) => (
                        <ListItem key={link.title} title={link.title} href={link.href}>
                          {link.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Company</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[300px] gap-3 p-4">
                      {companyLinks.map((link) => (
                        <ListItem key={link.title} title={link.title} href={link.href}>
                          {link.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* theme toggle */}
            <ThemeToggle />

            {/* auth buttons - desktop */}
            <div className="hidden md:flex items-center gap-2">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className="glass-card border-border/50 hover:bg-foreground/5 font-medium cursor-pointer"
                  >
                    Sign In
                  </Button>
                </Link>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link to="/login">
                  <Button className="bg-black hover:bg-black/90 text-white dark:bg-white dark:hover:bg-white/90 dark:text-black font-medium">
                    Get Started
                  </Button>
                </Link>
              </motion.div>
            </div>

            {/* mobile menu button */}
            <motion.div
              className="md:hidden"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="glass-card border-border/50"
              >
                <AnimatePresence mode="wait">
                  {mobileMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu className="w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          </div>
        </div>

        {/* mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              className="md:hidden border-t border-border/50 py-4 px-6 lg:px-8"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <nav className="flex flex-col gap-4">
                <Link
                  to="/"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>

                <div className="py-2">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Product</h4>
                  <div className="flex flex-col gap-2 pl-4">
                    {productLinks.map((link) => (
                      <ListItemMobile
                        key={link.title}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {link.title}
                      </ListItemMobile>
                    ))}
                  </div>
                </div>

                <div className="py-2">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Company</h4>
                  <div className="flex flex-col gap-2 pl-4">
                    {companyLinks.map((link) => (
                      <ListItemMobile
                        key={link.title}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {link.title}
                      </ListItemMobile>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                  >
                    <Link to="/login" className="block">
                      <Button
                        variant="ghost"
                        className="w-full justify-start glass-card border-border/50"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign In
                      </Button>
                    </Link>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25, duration: 0.3 }}
                  >
                    <Link to="/login" className="block">
                      <Button
                        className="w-full justify-start bg-black hover:bg-black/90 text-white dark:bg-white dark:hover:bg-white/90 dark:text-black"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Get Started
                      </Button>
                    </Link>
                  </motion.div>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
};

function ListItemMobile({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  const isExternal = href.startsWith('http') || href.startsWith('#') || href.includes('/#');

  if (isExternal) {
    return (
      <a
        href={href}
        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
        onClick={onClick}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      to={href}
      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

function ListItem({
  className,
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<'a'> & { href: string }) {
  // Determine if it's an external link or hash link
  const isExternal = href.startsWith('http') || href.startsWith('#') || href.includes('/#');

  return (
    <li>
      <NavigationMenuLink asChild>
        {isExternal ? (
          <a
            href={href}
            className={cn(
              'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
              className
            )}
            {...props}
          >
            <div className="text-sm font-medium leading-none">{title}</div>
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">{children}</p>
          </a>
        ) : (
          <Link
            to={href}
            className={cn(
              'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
              className
            )}
            {...(props as Record<string, unknown>)}
          >
            <div className="text-sm font-medium leading-none">{title}</div>
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">{children}</p>
          </Link>
        )}
      </NavigationMenuLink>
    </li>
  );
}

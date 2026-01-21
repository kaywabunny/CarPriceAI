import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Car, Menu, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AdminPanel } from '@/components/AdminPanel';
import { trackEvent } from '@/lib/privateAnalytics';

export const Layout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const handleAdminClick = () => {
    trackEvent('admin_panel_open');
    setAdminOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-2 font-heading font-bold text-lg"
              data-testid="nav-logo"
            >
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Car className="w-5 h-5 text-primary" />
              </div>
              <span className="hidden sm:inline">CarPrice</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">TH</span>
            </Link>

            {/* Desktop Nav - simplified, no analytics link */}
            <nav className="hidden md:flex items-center gap-1">
              <Link to="/">
                <Button 
                  variant={isActive('/') ? 'secondary' : 'ghost'} 
                  size="sm"
                  data-testid="nav-home"
                >
                  <Car className="w-4 h-4 mr-2" />
                  Price Check
                </Button>
              </Link>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="mobile-menu-toggle"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu - simplified, no analytics link */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-background animate-fade-in">
            <nav className="flex flex-col p-4 gap-2">
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                <Button 
                  variant={isActive('/') ? 'secondary' : 'ghost'} 
                  className="w-full justify-start"
                >
                  <Car className="w-4 h-4 mr-2" />
                  Price Check
                </Button>
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4" />
            <span>CarPrice TH - Used Car Pricing Tool</span>
          </div>
          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()}</span>
            <span>•</span>
            <span>Demo Version</span>
            <span>•</span>
            <button
              onClick={handleAdminClick}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              data-testid="admin-link"
            >
              <Settings className="w-3 h-3" />
              Admin
            </button>
          </div>
        </div>
      </footer>

      {/* Admin Panel */}
      <AdminPanel isOpen={adminOpen} onClose={() => setAdminOpen(false)} />
    </div>
  );
};

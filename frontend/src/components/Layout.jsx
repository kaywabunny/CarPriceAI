import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { useTheme } from '@/hooks/useTheme';
// Import logo images - theme-aware
// Dark Plain Logo = for light mode (dark logo on light background)
// Light Plain Logo = for dark mode (light logo on dark background)
import logoDark from '@/assets/images/CarPriceAI - Dark Plain Logo.png';
import logoLight from '@/assets/images/CarPriceAI - Light Plain logo.png';

export const Layout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { language } = useLanguage();
  const isDark = useTheme(); // Detect current theme

  const isActive = (path) => location.pathname === path;
  
  // Select logo based on theme
  // Dark mode = Light Plain Logo (light logo on dark background)
  // Light mode = Dark Plain Logo (dark logo on light background)
  const logoImage = isDark ? logoLight : logoDark;

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
              <div className="p-1.5 rounded-lg bg-primary/10 flex items-center justify-center">
                <img 
                  src={logoImage} 
                  alt="CarPriceAI" 
                  className="w-5 h-5 object-contain" 
                />
              </div>
              <span className="hidden sm:inline">CarPriceAI</span>
            </Link>

            {/* Desktop Nav - removed Price Check button */}

            {/* Right Side */}
            <div className="flex items-center gap-2">
              <LanguageToggle />
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

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-background animate-fade-in">
            <nav className="flex flex-col p-4 gap-2">
              {/* Mobile menu items can be added here if needed */}
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
            <img 
              src={logoImage} 
              alt="CarPriceAI" 
              className="w-4 h-4 object-contain" 
            />
            <span>{getTranslation('footer.tagline', language)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4">
            <Link
              to="/faq"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {getTranslation('footer.faq', language)}
            </Link>
            <span className="hidden sm:inline">•</span>
            <Link
              to="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {getTranslation('footer.terms', language)}
            </Link>
            <span className="hidden sm:inline">•</span>
            <Link
              to="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {getTranslation('footer.privacy', language)}
            </Link>
            <span className="hidden sm:inline">•</span>
            <span className="w-full text-center sm:w-auto sm:text-right">
              © {new Date().getFullYear()} • {getTranslation('footer.version', language)}
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
};

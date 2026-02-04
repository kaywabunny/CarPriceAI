import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export const LanguageToggle = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="h-9 px-3"
      data-testid="language-toggle"
      title={language === 'en' ? 'Switch to Thai' : 'เปลี่ยนเป็นภาษาอังกฤษ'}
    >
      <Languages className="w-4 h-4 mr-2" />
      <span className="text-xs font-medium">{language === 'en' ? 'ENG' : 'TH'}</span>
    </Button>
  );
};


import { useEffect } from 'react';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { trackPageView } from '@/lib/analytics';

export default function AnalyticsPage() {
  useEffect(() => {
    trackPageView('analytics');
  }, []);

  return (
    <div className="min-h-screen py-8 px-4" data-testid="analytics-page">
      <div className="max-w-6xl mx-auto">
        <AnalyticsDashboard />
      </div>
    </div>
  );
}

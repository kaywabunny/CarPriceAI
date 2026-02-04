import { Component } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getTranslation } from '@/lib/translations';

/**
 * Error boundary around the result area so a render error shows a message instead of a blank page.
 */
export class ResultErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ResultErrorBoundary]', error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      const language = this.props.language || 'en';
      return (
        <Alert variant="destructive" className="animate-fade-in">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            {getTranslation('error.priceEstimate', language)}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="mt-2 text-xs overflow-auto max-h-24">
                {this.state.error.message}
              </pre>
            )}
          </AlertDescription>
        </Alert>
      );
    }
    return this.props.children;
  }
}

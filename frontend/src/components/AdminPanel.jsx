import { useState } from 'react';
import { RefreshCw, Check, AlertCircle, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { reloadModel } from '@/lib/api';
import { track } from '@/lib/analytics';
import { EVENT_TYPES } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export const AdminPanel = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [lastReload, setLastReload] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleReload = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await reloadModel();
      setLastReload(result.timestamp || new Date().toISOString());
      setSuccess(true);
      track(EVENT_TYPES.ADMIN_RELOAD, { success: true });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to reload model:', err);
      setError('Failed to reload model. Please try again.');
      track(EVENT_TYPES.ADMIN_RELOAD, { success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-testid="admin-panel-overlay"
    >
      <Card 
        className="w-full max-w-md m-4 animate-scale-in"
        data-testid="admin-panel"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <CardTitle className="font-heading">Admin Panel</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            Internal
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ML Model Status */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
            <h4 className="text-sm font-medium mb-3">ML Model Status</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge className="bg-status-good/10 text-status-good border-status-good/20">
                  Active (Mock)
                </Badge>
              </div>
              
              {lastReload && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Reload</span>
                  <span className="font-mono text-xs">{formatDate(lastReload)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Reload Button */}
          <Button
            onClick={handleReload}
            disabled={loading}
            className="w-full"
            data-testid="reload-model-button"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Reloading...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload ML Model
              </>
            )}
          </Button>

          {/* Status Messages */}
          {success && (
            <div className="flex items-center gap-2 text-sm text-status-good animate-fade-in">
              <Check className="w-4 h-4" />
              Model reloaded successfully
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive animate-fade-in">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Close Button */}
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
            data-testid="close-admin-panel"
          >
            Close
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Note: This is a mock implementation. In production, this will call the ML service.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

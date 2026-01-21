import { useState, useEffect, useRef, useCallback } from 'react';
import { Download, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getPriceGraph } from '@/lib/api';
import { trackEvent } from '@/lib/privateAnalytics';

export const GraphModal = ({ isOpen, onClose, request, predictionId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  
  // Track if we've already loaded for this request to prevent double-loads
  const loadedRequestRef = useRef(null);
  const mountedRef = useRef(true);

  // Cleanup function to revoke blob URLs
  const cleanupImageUrl = useCallback(() => {
    if (imageUrl && imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }
  }, [imageUrl]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      cleanupImageUrl();
      setImageUrl(null);
      setError(null);
      setLoading(false);
      loadedRequestRef.current = null;
    }
  }, [isOpen, cleanupImageUrl]);

  // Load graph when modal opens with new request
  useEffect(() => {
    mountedRef.current = true;

    const loadGraph = async () => {
      // Prevent double loading for the same request
      const requestKey = request ? `${request.make}-${request.model}-${request.year}-${request.mileage_km_num}` : null;
      
      if (!isOpen || !request || loadedRequestRef.current === requestKey) {
        return;
      }

      // Mark as loading this request
      loadedRequestRef.current = requestKey;
      
      // Clean up previous image
      cleanupImageUrl();
      
      setLoading(true);
      setError(null);
      setImageUrl(null);

      try {
        const url = await getPriceGraph(request);
        
        // Only update state if still mounted and modal still open
        if (mountedRef.current && isOpen) {
          setImageUrl(url);
          trackEvent('graph_loaded', { prediction_id: predictionId });
        } else if (url && url.startsWith('blob:')) {
          // Clean up if we're no longer showing this
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.error('Failed to load graph:', err);
        if (mountedRef.current && isOpen) {
          setError('Failed to load price graph. Please try again.');
          trackEvent('graph_error', { 
            prediction_id: predictionId,
            error: err.message 
          });
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadGraph();

    return () => {
      mountedRef.current = false;
    };
  }, [isOpen, request, predictionId, cleanupImageUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupImageUrl();
    };
  }, [cleanupImageUrl]);

  const handleRetry = useCallback(() => {
    // Reset the loaded ref to allow re-loading
    loadedRequestRef.current = null;
    // Trigger re-render which will cause the useEffect to run again
    setError(null);
    setLoading(true);
    
    // Force reload
    const loadGraph = async () => {
      try {
        cleanupImageUrl();
        const url = await getPriceGraph(request);
        if (mountedRef.current) {
          setImageUrl(url);
          trackEvent('graph_loaded', { prediction_id: predictionId });
        }
      } catch (err) {
        if (mountedRef.current) {
          setError('Failed to load price graph. Please try again.');
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };
    
    loadGraph();
  }, [request, predictionId, cleanupImageUrl]);

  const handleDownload = useCallback(async () => {
    if (!imageUrl) return;
    
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `price-graph-${request.make}-${request.model}-${request.year}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download:', err);
    }
  }, [imageUrl, request]);

  const handleClose = useCallback((open) => {
    if (!open) {
      onClose();
    }
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden"
        data-testid="graph-modal"
      >
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="font-heading">
            Price Distribution Graph
          </DialogTitle>
          <div className="flex items-center gap-2">
            {imageUrl && !loading && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                data-testid="download-graph-button"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-[400px] flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p>Loading price graph...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-3 text-destructive">
              <AlertCircle className="w-8 h-8" />
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Try Again
              </Button>
            </div>
          )}

          {imageUrl && !loading && !error && (
            <img
              src={imageUrl}
              alt={`Price distribution for ${request?.make} ${request?.model}`}
              className="max-w-full max-h-[60vh] object-contain"
              data-testid="graph-image"
            />
          )}
        </div>

        <div className="text-sm text-muted-foreground text-center">
          {request && (
            <p>
              {request.make} {request.model} {request.trim && `• ${request.trim}`} • {request.year} • {request.mileage_km_num?.toLocaleString()} km
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

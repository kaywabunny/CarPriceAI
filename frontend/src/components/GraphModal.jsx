import { useState, useEffect } from 'react';
import { X, Download, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getPriceGraph } from '@/lib/api';
import { track } from '@/lib/analytics';
import { EVENT_TYPES } from '@/lib/types';

export const GraphModal = ({ isOpen, onClose, request, predictionId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    if (isOpen && request) {
      loadGraph();
    }
    
    return () => {
      // Cleanup blob URL when modal closes
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [isOpen, request]);

  const loadGraph = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const url = await getPriceGraph(request);
      setImageUrl(url);
      track(EVENT_TYPES.GRAPH_LOADED, { prediction_id: predictionId }, predictionId);
    } catch (err) {
      console.error('Failed to load graph:', err);
      setError('Failed to load price graph. Please try again.');
      track(EVENT_TYPES.GRAPH_ERROR, { 
        prediction_id: predictionId,
        error: err.message 
      }, predictionId);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
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
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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

          {error && (
            <div className="flex flex-col items-center gap-3 text-destructive">
              <AlertCircle className="w-8 h-8" />
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={loadGraph}>
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

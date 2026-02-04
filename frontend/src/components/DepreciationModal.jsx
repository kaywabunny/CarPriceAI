import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, AlertCircle, TrendingDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { getDepreciation } from '@/lib/api';
import { formatTHB, formatPercent } from '@/lib/utils';
import { trackEvent } from '@/lib/privateAnalytics';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/translations';

const formatDepreciationError = (err, language) => {
  const rawMessage = err?.message || '';
  const lower = rawMessage.toLowerCase();

  const isInsufficientData =
    lower.includes('insufficient amount of data') ||
    lower.includes('need at least 30') ||
    lower === 'invalid request: bad request' ||
    lower === 'bad request';

  if (isInsufficientData) {
    return {
      kind: 'insufficient',
      // UX copy intentionally does not expose thresholds or counts
      message: 'Not enough market data to build a reliable depreciation curve at this time.',
    };
  }

  return {
    kind: 'error',
    message: rawMessage || getTranslation('depreciation.error', language),
  };
};

export const DepreciationModal = ({ isOpen, onClose, request, predictionId, marketPrice }) => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorTitle, setErrorTitle] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);
  const [data, setData] = useState(null);
  const [viewMode, setViewMode] = useState('chart');
  
  // Track loaded request to prevent double-loading
  const loadedRequestRef = useRef(null);
  const mountedRef = useRef(true);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setError(null);
      setErrorTitle(null);
      setInfoMessage(null);
      setLoading(false);
      loadedRequestRef.current = null;
    }
  }, [isOpen]);

  // Load depreciation when modal opens with new request
  useEffect(() => {
    mountedRef.current = true;

    const loadDepreciation = async () => {
      const requestKey = request ? `${request.make}-${request.model}-${request.year}-${request.mileage_km_num}` : null;
      
      if (!isOpen || !request || loadedRequestRef.current === requestKey) {
        return;
      }

      loadedRequestRef.current = requestKey;
      setLoading(true);
      setError(null);
      setErrorTitle(null);
      setInfoMessage(null);

      try {
        const result = await getDepreciation({
          ...request,
          horizon_years: 6,
          market_price: marketPrice && marketPrice > 0 ? marketPrice : null,  // Pass market price (yellow) to align baseline with price card
        });
        
        if (mountedRef.current && isOpen) {
          setData(result);
          trackEvent('depreciation_loaded', { prediction_id: predictionId });
        }
      } catch (err) {
        console.error('Failed to load depreciation:', err);
        if (mountedRef.current && isOpen) {
          const { kind, message } = formatDepreciationError(err, language);
          if (kind === 'insufficient') {
            // Neutral info state – no error styling, no retry button, no chart
            setInfoMessage(message);
            setError(null);
            setErrorTitle(null);
          } else {
            setErrorTitle(null);
            setError(message);
          }
          trackEvent('depreciation_error', { 
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

    loadDepreciation();

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, request, predictionId, language]); // marketPrice is intentionally excluded - only used in API call

  const handleRetry = useCallback(() => {
    loadedRequestRef.current = null;
    setError(null);
    setErrorTitle(null);
    setInfoMessage(null);
    setLoading(true);
    
    const loadDepreciation = async () => {
      try {
        const result = await getDepreciation({
          ...request,
          horizon_years: 6,
          market_price: marketPrice && marketPrice > 0 ? marketPrice : null,  // Pass market price (yellow) to align baseline with price card
        });
        if (mountedRef.current) {
          setData(result);
          trackEvent('depreciation_loaded', { prediction_id: predictionId });
        }
      } catch (err) {
        if (mountedRef.current) {
          const { kind, message } = formatDepreciationError(err, language);
          if (kind === 'insufficient') {
            setInfoMessage(message);
            setError(null);
            setErrorTitle(null);
          } else {
            setErrorTitle(null);
            setError(message);
          }
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };
    
    loadDepreciation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, predictionId, language]); // marketPrice is used inside but doesn't need to trigger re-fetch

  const handleClose = useCallback((open) => {
    if (!open) {
      onClose();
    }
  }, [onClose]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{point.year_label}</p>
          <p className="text-lg font-mono font-bold">{formatTHB(point.value)}</p>
          {point.cumulative_depreciation > 0 && (
            <p className="text-sm text-muted-foreground">
              -{point.cumulative_depreciation}% {getTranslation('depreciation.fromNew', language)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col overflow-hidden"
        data-testid="depreciation-modal"
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-primary" />
              <DialogTitle className="font-heading">
                {getTranslation('depreciation.title', language)}
              </DialogTitle>
            </div>
            {data && (
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'chart' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('chart')}
                  data-testid="chart-view-button"
                >
                  {getTranslation('depreciation.chart', language)}
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  data-testid="table-view-button"
                >
                  {getTranslation('depreciation.table', language)}
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p>{getTranslation('depreciation.loading', language)}</p>
            </div>
          )}

          {infoMessage && !loading && !data && !error && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Info className="w-8 h-8" />
              <p className="font-semibold">Depreciation unavailable</p>
              <p className="text-sm text-center max-w-md">
                {infoMessage}
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-destructive">
              <AlertCircle className="w-8 h-8" />
              {errorTitle ? (
                <>
                  <p className="font-semibold">{errorTitle}</p>
                  <p className="text-sm text-center max-w-md">{error}</p>
                </>
              ) : (
                <p>{error}</p>
              )}
              <Button variant="outline" size="sm" onClick={handleRetry}>
                {getTranslation('depreciation.tryAgain', language)}
              </Button>
            </div>
          )}

          {data && !loading && !error && (
            <>
              {viewMode === 'chart' ? (
                <div className="h-[350px] w-full" data-testid="depreciation-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={data.series}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="year_label" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickFormatter={(value) => `฿${(value / 1000000).toFixed(1)}M`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        fill="url(#colorValue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="overflow-auto max-h-[350px]" data-testid="depreciation-table">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{getTranslation('depreciation.year', language)}</TableHead>
                        <TableHead className="text-right">{getTranslation('depreciation.estimatedValue', language)}</TableHead>
                        <TableHead className="text-right">{getTranslation('depreciation.annualDepreciation', language)}</TableHead>
                        <TableHead className="text-right">{getTranslation('depreciation.totalDepreciation', language)}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.series.map((point) => (
                        <TableRow key={point.year}>
                          <TableCell className="font-medium">{point.year_label}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatTHB(point.value)}
                          </TableCell>
                          <TableCell className="text-right">
                            {point.year === 0 ? '-' : formatPercent(point.depreciation_rate)}
                          </TableCell>
                          <TableCell className="text-right">
                            {point.year === 0 ? '-' : `${point.cumulative_depreciation}%`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Year-by-Year Breakdown - Only show in chart view */}
              {viewMode === 'chart' && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-semibold text-foreground mb-3">{getTranslation('depreciation.breakdownTitle', language)}</h4>
                  <div className="space-y-2">
                    {data.series.map((point, index) => {
                      if (index === 0) return null; // Skip "Now" (year 0)
                      
                      const prevPoint = data.series[index - 1];
                      const priceChange = prevPoint.value - point.value;
                      const percentChange = prevPoint.value > 0 
                        ? ((priceChange / prevPoint.value) * 100).toFixed(1)
                        : '0.0';
                      
                      return (
                        <div 
                          key={point.year}
                          className="p-3 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">
                                {getTranslation('depreciation.yearPrefix', language)} {point.year} ({point.year_label})
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {getTranslation('depreciation.valueDropsPrefix', language)}{' '}
                                <span className="font-mono font-semibold text-status-good">{formatTHB(prevPoint.value)}</span>{' '}
                                {getTranslation('depreciation.valueDropsTo', language)}{' '}
                                <span className="font-mono font-semibold">{formatTHB(point.value)}</span>
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-sm font-bold text-status-high">
                                -{percentChange}%
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatTHB(priceChange)} {getTranslation('depreciation.lost', language)}
                              </p>
                            </div>
                          </div>
                          {point.cumulative_depreciation < 0 && (
                            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/30">
                              {getTranslation('depreciation.totalFromInitial', language)} <span className="font-semibold">{point.cumulative_depreciation}%</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border/50">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">{getTranslation('depreciation.initialValue', language)}</p>
                    <p className="font-mono font-bold">{formatTHB(data.initial_value)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{getTranslation('depreciation.after6Years', language)}</p>
                    <p className="font-mono font-bold">
                      {formatTHB(data.series[data.series.length - 1]?.value)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{getTranslation('depreciation.totalDepreciation', language)}</p>
                    <p className="font-mono font-bold text-status-high">
                      {data.total_depreciation}%
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex-shrink-0 text-sm text-muted-foreground text-center pt-2 border-t border-border">
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

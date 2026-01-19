import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, TrendingDown } from 'lucide-react';
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
  LineChart, 
  Line, 
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
import { track } from '@/lib/analytics';
import { EVENT_TYPES } from '@/lib/types';

export const DepreciationModal = ({ isOpen, onClose, request, predictionId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'table'

  useEffect(() => {
    if (isOpen && request) {
      loadDepreciation();
    }
  }, [isOpen, request]);

  const loadDepreciation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getDepreciation({
        ...request,
        horizon_years: 6,
      });
      setData(result);
      track(EVENT_TYPES.DEPRECIATION_LOADED, { prediction_id: predictionId }, predictionId);
    } catch (err) {
      console.error('Failed to load depreciation:', err);
      setError('Failed to load depreciation data. Please try again.');
      track(EVENT_TYPES.DEPRECIATION_ERROR, { 
        prediction_id: predictionId,
        error: err.message 
      }, predictionId);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{point.year_label}</p>
          <p className="text-lg font-mono font-bold">{formatTHB(point.value)}</p>
          {point.cumulative_depreciation > 0 && (
            <p className="text-sm text-muted-foreground">
              -{point.cumulative_depreciation}% from new
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden"
        data-testid="depreciation-modal"
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-primary" />
              <DialogTitle className="font-heading">
                Depreciation Forecast
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
                  Chart
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  data-testid="table-view-button"
                >
                  Table
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-[400px]">
          {loading && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p>Loading depreciation forecast...</p>
            </div>
          )}

          {error && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-destructive">
              <AlertCircle className="w-8 h-8" />
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={loadDepreciation}>
                Try Again
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
                        <TableHead>Year</TableHead>
                        <TableHead className="text-right">Estimated Value</TableHead>
                        <TableHead className="text-right">Annual Depreciation</TableHead>
                        <TableHead className="text-right">Total Depreciation</TableHead>
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
                            {point.year === 0 ? '-' : `-${formatPercent(point.depreciation_rate)}`}
                          </TableCell>
                          <TableCell className="text-right">
                            {point.year === 0 ? '-' : `-${point.cumulative_depreciation}%`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Summary */}
              <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border/50">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Initial Value</p>
                    <p className="font-mono font-bold">{formatTHB(data.initial_value)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">After 6 Years</p>
                    <p className="font-mono font-bold">
                      {formatTHB(data.series[data.series.length - 1]?.value)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Depreciation</p>
                    <p className="font-mono font-bold text-status-high">
                      -{data.total_depreciation}%
                    </p>
                  </div>
                </div>
              </div>
            </>
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

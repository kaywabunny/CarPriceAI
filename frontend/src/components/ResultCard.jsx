import { useState } from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  Target, 
  Info, 
  BarChart3, 
  LineChart as LineChartIcon, 
  Copy, 
  Check,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatTHB, formatPercent, getConfidenceLevel } from '@/lib/utils';
import { track, trackCtaClick } from '@/lib/analytics';
import { EVENT_TYPES } from '@/lib/types';

export const ResultCard = ({ 
  result, 
  request, 
  onViewGraph, 
  onViewDepreciation,
  predictionId 
}) => {
  const [copied, setCopied] = useState(false);
  
  const confidenceInfo = result.confidence 
    ? getConfidenceLevel(result.confidence) 
    : null;

  const handleCopy = async () => {
    const text = `Car: ${request.make} ${request.model} ${request.trim || ''} (${request.year})
Mileage: ${request.mileage_km_num.toLocaleString()} km

Price Estimate:
• Good Deal: ${formatTHB(result.green_low)} - ${formatTHB(result.green_high)}
• Fair Price: ${formatTHB(result.yellow)}
• Overpriced: ${formatTHB(result.red_low)} - ${formatTHB(result.red_high)}

Confidence: ${formatPercent(result.confidence, true)}
Based on: ${result.sample_size} comparable listings`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      trackCtaClick('copy_result', { prediction_id: predictionId });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleViewGraph = () => {
    track(EVENT_TYPES.GRAPH_OPENED, { prediction_id: predictionId }, predictionId);
    onViewGraph();
  };

  const handleViewDepreciation = () => {
    track(EVENT_TYPES.DEPRECIATION_OPENED, { prediction_id: predictionId }, predictionId);
    onViewDepreciation();
  };

  return (
    <Card 
      className="border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden animate-fade-in"
      data-testid="result-card"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-heading font-bold text-lg">Price Estimate</h3>
          </div>
          {confidenceInfo && (
            <Badge 
              variant="outline" 
              className={`${confidenceInfo.bgColor} ${confidenceInfo.color} border-current/20`}
            >
              {confidenceInfo.label}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {request.make} {request.model} {request.trim && `• ${request.trim}`} • {request.year} • {request.mileage_km_num.toLocaleString()} km
        </p>
      </div>

      <CardContent className="p-6">
        {/* Price Gauge Visual */}
        <div className="mb-6">
          <PriceGauge result={result} />
        </div>

        {/* Price Bands */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Green Band - Good Deal */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="p-4 rounded-lg bg-status-good/5 border border-status-good/20 cursor-help"
                  data-testid="green-band"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-status-good" />
                    <span className="text-sm font-medium text-status-good">Good Deal</span>
                  </div>
                  <div className="font-mono text-xl font-bold text-foreground">
                    {formatTHB(result.green_median)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatTHB(result.green_low)} - {formatTHB(result.green_high)}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>Prices in this range are below market average. Great opportunity for buyers!</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Yellow Band - Fair Price */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="p-4 rounded-lg bg-status-fair/5 border border-status-fair/20 cursor-help relative"
                  data-testid="yellow-band"
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <Badge className="bg-status-fair text-white text-xs">
                      Market Price
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-2 mt-2">
                    <Target className="w-4 h-4 text-status-fair" />
                    <span className="text-sm font-medium text-status-fair">Fair Price</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-foreground">
                    {formatTHB(result.yellow)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Typical market value
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>This is the typical market price for this vehicle. A fair deal for both buyers and sellers.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Red Band - Overpriced */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="p-4 rounded-lg bg-status-high/5 border border-status-high/20 cursor-help"
                  data-testid="red-band"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-status-high" />
                    <span className="text-sm font-medium text-status-high">Overpriced</span>
                  </div>
                  <div className="font-mono text-xl font-bold text-foreground">
                    {formatTHB(result.red_median)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatTHB(result.red_low)} - {formatTHB(result.red_high)}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>Prices in this range are above market average. Consider negotiating or looking elsewhere.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <Info className="w-4 h-4" />
                  <span>
                    Based on {result.sample_size || 'N/A'} listings
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Number of similar vehicles used to calculate this estimate</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {result.estimate_basis && (
            <span className="text-xs px-2 py-1 bg-muted rounded-full">
              {result.estimate_basis === 'based_on_comparable_listings' 
                ? 'Comparable Listings' 
                : 'Market Trends'}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            data-testid="view-graph-button"
            onClick={handleViewGraph}
            className="flex-1 min-w-[140px]"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            View Price Graph
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-testid="view-depreciation-button"
            onClick={handleViewDepreciation}
            className="flex-1 min-w-[140px]"
          >
            <LineChartIcon className="w-4 h-4 mr-2" />
            View Depreciation
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-testid="copy-result-button"
            onClick={handleCopy}
            className="min-w-[100px]"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-status-good" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Price Gauge Component
const PriceGauge = ({ result }) => {
  const { green_low, green_high, yellow, red_low, red_high } = result;
  
  // Calculate positions (as percentages)
  const minPrice = green_low * 0.95;
  const maxPrice = red_high * 1.05;
  const range = maxPrice - minPrice;
  
  const greenStart = ((green_low - minPrice) / range) * 100;
  const greenEnd = ((green_high - minPrice) / range) * 100;
  const yellowPos = ((yellow - minPrice) / range) * 100;
  const redStart = ((red_low - minPrice) / range) * 100;
  const redEnd = ((red_high - minPrice) / range) * 100;

  return (
    <div className="relative" data-testid="price-gauge">
      {/* Background bar */}
      <div className="h-4 rounded-full bg-muted overflow-hidden flex">
        {/* Green section */}
        <div 
          className="h-full bg-status-good/80"
          style={{ width: `${greenEnd}%` }}
        />
        {/* Yellow section (market price) */}
        <div 
          className="h-full bg-status-fair/80"
          style={{ width: `${redStart - greenEnd}%` }}
        />
        {/* Red section */}
        <div 
          className="h-full bg-status-high/80"
          style={{ width: `${100 - redStart}%` }}
        />
      </div>

      {/* Fair price marker */}
      <div 
        className="absolute top-0 w-1 h-6 bg-foreground rounded-full -translate-x-1/2"
        style={{ left: `${yellowPos}%` }}
      />
      
      {/* Labels */}
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>Lower</span>
        <span className="font-medium text-foreground">Fair Price</span>
        <span>Higher</span>
      </div>
    </div>
  );
};

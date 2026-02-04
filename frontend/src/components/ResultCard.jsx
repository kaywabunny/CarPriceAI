import { useState } from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  Target, 
  Info, 
  BarChart3, 
  LineChart as LineChartIcon, 
  FileText,
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
import { formatTHB, formatPercent, getConfidenceLevel, getPriceSizeClass } from '@/lib/utils';
import { PRICE_BAND_COPY, PRICE_GAUGE_COPY } from '@/lib/priceBandConfig';
import { trackEvent } from '@/lib/businessAnalytics';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { getCrvHondaDataQuality } from '@/guards/getCrvHondaDataQuality';
import { getKicksUiNote } from '@/guards/getKicksUiNote';
import { getLeafUiNotices } from '@/guards/getLeafUiNotices';
import { getMarchUiNote } from '@/guards/getMarchUiNote';
import { getTerraUiNote } from '@/guards/getTerraUiNote';
import { getTeslaUiNote } from '@/guards/getTeslaUiNote';
import { getToyotaSportsFallbackBanner } from '@/guards/getToyotaSportsFallbackBanner';
import { getOraGoodCatLimitedNotice } from '@/guards/getOraGoodCatLimitedNotice';
import { getPorscheLuxuryLimitedNotice } from '@/guards/getPorscheLuxuryLimitedNotice';
import { getXTrailUiNotices } from '@/guards/getXTrailUiNotices';
import { PriceReportModal } from '@/components/PriceReportModal';

export const ResultCard = ({ 
  result, 
  request, 
  onViewGraph, 
  onViewDepreciation,
  predictionId 
}) => {
  const { language } = useLanguage();
  const [showPriceReport, setShowPriceReport] = useState(false);
  
  const confidenceInfo = result.confidence 
    ? getConfidenceLevel(result.confidence) 
    : null;

  const crvBanner = getCrvHondaDataQuality(result, { make: request?.make, model: request?.model });
  const kicksNote = getKicksUiNote(result, {
    make: request?.make,
    model: request?.model,
    submodel: request?.submodel ?? request?.trim,
  });
  const leafNotices = getLeafUiNotices(result, {
    make: request?.make,
    model: request?.model,
    year: request?.year,
  });
  const marchNote = getMarchUiNote(result, { make: request?.make, model: request?.model });
  const terraNote = getTerraUiNote(result, { make: request?.make, model: request?.model });
  const teslaNote = getTeslaUiNote(result, { make: request?.make, model: request?.model });
  const toyotaSportsBanner = getToyotaSportsFallbackBanner(result, {
    make: request?.make,
    model: request?.model,
    year: request?.year,
  });
  const oraGoodCatNotice = getOraGoodCatLimitedNotice(result, {
    make: request?.make,
    model: request?.model,
  });
  const porscheLuxuryNotice = getPorscheLuxuryLimitedNotice(result, {
    make: request?.make,
    model: request?.model,
  });
  const xtrailNotices = getXTrailUiNotices(result, {
    make: request?.make,
    model: request?.model,
    submodel: request?.submodel ?? request?.trim,
  });

  const makeNorm = request?.make != null ? String(request.make).trim().toUpperCase() : '';
  const modelNorm = request?.model != null ? String(request.model).trim().toUpperCase() : '';
  const isDmax = makeNorm === 'ISUZU' && modelNorm === 'D-MAX';
  const showDmaxNote =
    isDmax &&
    ((result.sample_size != null && result.sample_size < 5) ||
      result.ui_notice === 'extremely_limited_data' ||
      (result.estimate_basis && String(result.estimate_basis).toLowerCase().startsWith('fallback')) ||
      (result.confidence != null && Number(result.confidence) <= 0.35));

  const isMux = makeNorm === 'ISUZU' && modelNorm === 'MU-X';
  const collapsedGreen =
    (result.green_low != null && result.green_median != null && Number(result.green_low) === Number(result.green_median)) ||
    (result.green_median != null && result.green_high != null && Number(result.green_median) === Number(result.green_high));
  const showMuxNote =
    isMux &&
    ((result.sample_size != null && result.sample_size <= 3) ||
      (result.confidence != null && Number(result.confidence) <= 0.35) ||
      result.ui_notice === 'limited_market_data' ||
      result.ui_notice === 'extremely_limited_data' ||
      (result.estimate_basis && String(result.estimate_basis).toLowerCase().includes('fallback')) ||
      collapsedGreen);

  const isKiaCarnival = makeNorm === 'KIA' && modelNorm === 'CARNIVAL';
  const showKiaCarnivalNote =
    isKiaCarnival &&
    (result.estimate_basis === 'fallback_no_comparables' || result.sample_size === 0);

  const isKiaEv6 = makeNorm === 'KIA' && modelNorm === 'EV6';
  const mileageKm = result.mileage_km_num ?? request?.mileage_km_num;
  const showEv6HighMileageNote = isKiaEv6 && (mileageKm != null && Number(mileageKm) >= 200000);

  const showSamplesInHeader = showDmaxNote || showMuxNote || kicksNote || leafNotices?.banner || terraNote || teslaNote;

  // Get translated confidence label
  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.75) return getTranslation('confidence.good', language);
    if (confidence >= 0.50) return getTranslation('confidence.moderate', language);
    return getTranslation('confidence.low', language);
  };

  const handleOpenPriceReport = () => {
    setShowPriceReport(true);
  };

  const handleViewGraph = () => {
    // Track view_price_graph event
    trackEvent('view_price_graph', request, result);
    onViewGraph();
  };

  const handleViewDepreciation = () => {
    // Track view_depreciation event
    trackEvent('view_depreciation', request, result);
    onViewDepreciation();
  };

  return (
    <>
    <Card 
      className="border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden animate-fade-in"
      data-testid="result-card"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-heading font-bold text-lg">{getTranslation('result.title', language)}</h3>
          </div>
          <div className="flex items-center gap-2">
            {confidenceInfo && (
              <Badge 
                variant="outline" 
                className={`${confidenceInfo.bgColor} ${confidenceInfo.color} border-current/20`}
              >
                {getConfidenceLabel(result.confidence)}
              </Badge>
            )}
            {showSamplesInHeader && (
              <span className="text-xs text-muted-foreground">
                {getTranslation('result.samplesLabel', language)}: {result.sample_size ?? 'N/A'}
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {request?.make} {request?.model} {request?.trim ? `• ${request.trim}` : ''} • {request?.year} • {request?.mileage_km_num != null ? Number(request.mileage_km_num).toLocaleString() : '—'} km
        </p>
      </div>

      <CardContent className="p-6">
        {/* Price Gauge Visual */}
        <div className="mb-8">
          <PriceGauge result={result} language={language} />
        </div>

        {/* Honda CR-V only: data quality banner (subtle, per row) */}
        {crvBanner && (
          <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2" data-testid="crv-data-quality-banner">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
            <div>
              <p className="font-medium text-foreground/90">{getTranslation(crvBanner.titleKey, language)}</p>
              <p className="mt-0.5">{getTranslation(crvBanner.messageKey, language)}</p>
            </div>
          </div>
        )}

        {/* Lexus ES: model-specific notice when ui_notice starts with lexus_es_ (above price bands, short, neutral) */}
        {result.ui_notice && String(result.ui_notice).startsWith('lexus_es_') && (
          <div className="mb-4 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2" data-testid="lexus-es-notice">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
            <p>
              {result.ui_notice_detail ||
                (result.ui_notice === 'lexus_es_no_listings'
                  ? getTranslation('result.lexusEsNoListings.message', language)
                  : getTranslation('result.lexusEsLowSample.message', language))}
            </p>
          </div>
        )}

        {/* NISSAN LEAF only: fallback / no comparables banner ABOVE price bands (Samples shown in header when banner) */}
        {leafNotices?.banner && (
          <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2" data-testid="leaf-fallback-banner">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
            <div>
              <p className="font-medium text-foreground/90">{getTranslation(leafNotices.banner.titleKey, language)}</p>
              <p className="mt-0.5">{getTranslation(leafNotices.banner.messageKey, language)}</p>
            </div>
          </div>
        )}

        {/* Toyota sports cars (86, GR86, SUPRA): fallback + year >= 2022 + confidence <= 0.25 — banner + slight band opacity */}
        {toyotaSportsBanner && (
          <div className="mb-4 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2" data-testid="toyota-sports-fallback-banner">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
            <p>{getTranslation(toyotaSportsBanner.messageKey, language)}</p>
          </div>
        )}

        {/* Price Bands (slightly faded when Toyota sports fallback banner is shown — visual cue only, prices unchanged) */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-4 ${toyotaSportsBanner ? 'opacity-90' : ''}`}>
          {/* Green Band - Good Deal */}
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <div 
                  className="p-4 rounded-lg bg-status-good/5 border border-status-good/20 cursor-help transition-shadow hover:shadow-md overflow-hidden"
                  data-testid="green-band"
                >
                  <div className="flex items-center gap-2 mb-2 min-w-0">
                    <TrendingDown className="w-4 h-4 text-status-good flex-shrink-0" />
                    <span className="text-sm font-medium text-status-good leading-tight break-words">
                      {getTranslation('band.green.title', language)}
                    </span>
                  </div>
                  <div className={`font-mono tabular-nums font-bold text-foreground whitespace-nowrap min-w-0 ${getPriceSizeClass(result.green_median)}`}>
                    {formatTHB(result.green_median)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatTHB(result.green_low)} - {formatTHB(result.green_high)}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                className="max-w-[280px] p-3 text-sm z-[100]"
                sideOffset={24}
                align="center"
              >
                <p>{getTranslation('band.green.tooltip', language)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Yellow Band - Fair Price */}
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <div 
                  className="p-4 rounded-lg bg-status-fair/5 border border-status-fair/20 cursor-help relative transition-shadow hover:shadow-md overflow-hidden"
                  data-testid="yellow-band"
                >
                  <div className="flex items-center gap-2 mb-2 min-w-0">
                    <Target className="w-4 h-4 text-status-fair flex-shrink-0" />
                    <span className="text-sm font-medium text-status-fair leading-tight break-words">
                      {getTranslation('band.yellow.title', language)}
                    </span>
                  </div>
                  <div className={`font-mono tabular-nums font-bold text-foreground whitespace-nowrap min-w-0 ${getPriceSizeClass(result.yellow)}`}>
                    {formatTHB(result.yellow)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {getTranslation('result.typicalMarketValue', language)}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                className="max-w-[280px] p-3 text-sm z-[100]"
                sideOffset={24}
                align="center"
              >
                <p>{getTranslation('band.yellow.tooltip', language)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Red Band - Higher Price */}
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <div 
                  className="p-4 rounded-lg bg-status-high/5 border border-status-high/20 cursor-help transition-shadow hover:shadow-md overflow-hidden"
                  data-testid="red-band"
                >
                  <div className="flex items-center gap-2 mb-2 min-w-0">
                    <TrendingUp className="w-4 h-4 text-status-high flex-shrink-0" />
                    <span className="text-sm font-medium text-status-high leading-tight break-words">
                      {getTranslation('band.red.title', language)}
                    </span>
                  </div>
                  <div className={`font-mono tabular-nums font-bold text-foreground whitespace-nowrap min-w-0 ${getPriceSizeClass(result.red_median)}`}>
                    {formatTHB(result.red_median)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatTHB(result.red_low)} - {formatTHB(result.red_high)}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                className="max-w-[280px] p-3 text-sm z-[100]"
                sideOffset={24}
                align="center"
              >
                <p>{getTranslation('band.red.tooltip', language)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* ISUZU D-MAX only: limited-listings note (directly under price bands, subtle) */}
        {showDmaxNote && (
          <div className="mb-4 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2" data-testid="dmax-limited-note">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
            <p>{getTranslation('result.dmaxLimitedNote.message', language)}</p>
          </div>
        )}

        {/* ISUZU MU-X only: limited-listings note (directly under price bands, subtle) */}
        {showMuxNote && (
          <div className="mb-4 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2" data-testid="mux-limited-note">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
            <p>{getTranslation('result.muxLimitedNote.message', language)}</p>
          </div>
        )}

        {/* KIA CARNIVAL only: fallback / no comparables notice */}
        {showKiaCarnivalNote && (
          <div className="mb-4 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2" data-testid="kia-carnival-fallback-note">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
            <p>{getTranslation('result.kiaCarnivalFallbackNote.message', language)}</p>
          </div>
        )}

        {/* ORA GOOD CAT only: limited EV market data notice when fallback_no_comparables (UI-only, no pricing change) */}
        {oraGoodCatNotice && (
          <div className="mb-4 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2" data-testid="ora-goodcat-limited-notice">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
            <div>
              <p className="font-medium mb-1 text-foreground/90">{getTranslation(oraGoodCatNotice.titleKey, language)}</p>
              <p>{getTranslation(oraGoodCatNotice.bodyKey, language)}</p>
            </div>
          </div>
        )}

        {/* Porsche luxury models (Panamera, Macan, Cayenne, 718, 911, Taycan): limited trim-level data info (UI-only, neutral style) */}
        {porscheLuxuryNotice && (
          <div className="mb-4 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2" data-testid="porsche-luxury-limited-notice">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
            <p>{getTranslation(porscheLuxuryNotice.messageKey, language)}</p>
          </div>
        )}

        {/* KIA EV6 only: EV high-mileage note when mileage >= 200000 km */}
        {showEv6HighMileageNote && (
          <div className="mb-4 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2" data-testid="ev6-high-mileage-note">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
            <p>{getTranslation('result.ev6HighMileageNote.message', language)}</p>
          </div>
        )}

        {/* NISSAN KICKS only: limited-data note (E-POWER vs petrol) + optional E-POWER vs petrol clarification */}
        {kicksNote && (
          <div className="mb-4 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2" data-testid="kicks-limited-note">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
            <div>
              <p>{getTranslation(kicksNote.messageKey, language)}</p>
              {kicksNote.secondaryMessageKey && (
                <p className="mt-1.5 text-muted-foreground/90">{getTranslation(kicksNote.secondaryMessageKey, language)}</p>
              )}
            </div>
          </div>
        )}

        {/* NISSAN MARCH only: sparse-data info note under bands (no pricing change) */}
        {marchNote && (
          <div className="mb-4 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2" data-testid="march-limited-note">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
            <p>{getTranslation(marchNote.messageKey, language)}</p>
          </div>
        )}

        {/* NISSAN TERRA only: sparse-data info note under bands (no pricing change); Samples shown in header when note shown */}
        {terraNote && (
          <div className="mb-4 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2" data-testid="terra-limited-note">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
            <p>{getTranslation(terraNote.messageKey, language)}</p>
          </div>
        )}

        {/* Tesla (all models): sparse-data info note under bands when listings are limited; Samples shown in header when note shown */}
        {teslaNote && (
          <div className="mb-4 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2" data-testid="tesla-limited-note">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
            <p>{getTranslation(teslaNote.messageKey, language)}</p>
          </div>
        )}

        {/* NISSAN X-TRAIL only: limited-data notice and optional trim note under bands; tooltip when bandwidth_clamped */}
        {xtrailNotices && (xtrailNotices.messageKey || xtrailNotices.trimNoteKey) && (
          <div className="mb-4 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2" data-testid="xtrail-limited-note">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
            <div>
              {xtrailNotices.messageKey && (
                <p>{getTranslation(xtrailNotices.messageKey, language)}</p>
              )}
              {xtrailNotices.trimNoteKey && (
                <p className={xtrailNotices.messageKey ? 'mt-1.5' : ''}>{getTranslation(xtrailNotices.trimNoteKey, language)}</p>
              )}
            </div>
          </div>
        )}

        {/* NISSAN LEAF only: EV wide-range and high-mileage notes UNDER price bands */}
        {leafNotices?.notes?.length > 0 && (
          <div className="mb-4 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2" data-testid="leaf-notes">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
            <div>
              {leafNotices.notes.map((key) => (
                <p key={key} className={leafNotices.notes.indexOf(key) > 0 ? 'mt-1.5' : ''}>
                  {getTranslation(key, language)}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <Info className="w-4 h-4" />
                  <span>
                    {getTranslation('result.basedOn', language)} {result.sample_size || 'N/A'} {getTranslation('result.listings', language)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                className="max-w-[280px] p-3 text-sm z-[100]"
                sideOffset={20}
                align="start"
              >
                <p>
                  {result.sample_size === 0 || result.estimate_basis === 'fallback_no_comparables'
                    ? getTranslation('result.fallbackTooltip', language)
                    : getTranslation('result.basedOnTooltip', language)}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {result.estimate_basis && (
            <span className="text-xs px-2 py-1 bg-muted rounded-full">
              {result.estimate_basis === 'based_on_comparable_listings' 
                ? getTranslation('result.comparableListings', language)
                : getTranslation('result.marketTrends', language)}
            </span>
          )}
          {xtrailNotices?.tooltipKey && (
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <span className="cursor-help inline-flex items-center text-muted-foreground/80" data-testid="xtrail-bandwidth-tooltip">
                    <Info className="w-3.5 h-3.5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] p-2 text-xs z-[100]" sideOffset={8}>
                  <p>{getTranslation(xtrailNotices.tooltipKey, language)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {oraGoodCatNotice && (
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <span className="cursor-help inline-flex items-center text-muted-foreground/80" data-testid="ora-goodcat-limited-tooltip">
                    <Info className="w-3.5 h-3.5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px] p-3 text-xs z-[100]" sideOffset={8}>
                  <p className="font-medium mb-1">{getTranslation(oraGoodCatNotice.titleKey, language)}</p>
                  <p>{getTranslation(oraGoodCatNotice.bodyKey, language)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {result.mg_sparse_fallback_applied && (
            <span className="text-[10px] text-muted-foreground/70" data-testid="mg-sparse-fallback-debug">
              {getTranslation('result.mgSparseFallbackDebug', language)}
            </span>
          )}
        </div>

        {/* Optional informational notices */}
        {result.ui_notice === 'high_spec_variance' && (
          <div className="mb-6 rounded-md border border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">
              {getTranslation('result.sClassVariance.title', language)}
            </p>
            <p>
              {getTranslation('result.sClassVariance.bodyLine1', language)}{' '}
              {getTranslation('result.sClassVariance.bodyLine2', language)}
            </p>
          </div>
        )}

        {result.ui_notice === 'commercial_vehicle_pricing' && (
          <div className="mb-6 rounded-md border border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">
              {getTranslation('result.sprinterNote.title', language)}
            </p>
            <p>{getTranslation('result.sprinterNote.body', language)}</p>
          </div>
        )}

        {/* No comparables (sample_size === 0 / fallback): stronger warning + sample size 0 + suggestion */}
        {(result.data_quality === 'no_comparables' ||
          (result.ui_notice === 'extremely_limited_data' &&
            (result.sample_size === 0 || result.estimate_basis === 'fallback_no_comparables'))) && (
          <div className="mb-6 rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-muted-foreground" data-testid="no-comparables-warning">
            <p className="font-medium mb-1 text-foreground/90">
              {getTranslation('result.noComparables.title', language)}: {getTranslation('result.noComparables.message', language)}
            </p>
            <p className="mb-1">{getTranslation('result.noComparables.sampleSize', language)}</p>
            <p className="italic mt-2">{getTranslation('result.noComparables.suggestion', language)}</p>
          </div>
        )}

        {/* Extremely limited data (e.g. sample_size === 1) but not no-comparables */}
        {result.ui_notice === 'extremely_limited_data' &&
          result.data_quality !== 'no_comparables' &&
          result.sample_size !== 0 &&
          result.estimate_basis !== 'fallback_no_comparables' && (
          <div className="mb-6 rounded-md border border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">
              {getTranslation('result.extremelyLimitedData.title', language)}
            </p>
            <p>{getTranslation('result.extremelyLimitedData.body', language)}</p>
          </div>
        )}

        {result.ui_notice === 'limited_market_data' && (
          <div className="mb-6 rounded-md border border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">
              {getTranslation('result.limitedMarketData.title', language)}
            </p>
            <p>{getTranslation('result.limitedMarketData.body', language)}</p>
          </div>
        )}

        {/* BMW aggregate models only: informational note (exact make/model match, no substring) */}
        {request?.make === 'BMW' && (request?.model === 'SERIES 3' || request?.model === 'SERIES 5') && (
          <div className="mb-6 rounded-md border border-border/50 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground flex items-start gap-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
            <p>{getTranslation('result.bmwAggregateNote.message', language)}</p>
          </div>
        )}

        {/* BMW X-Series / X3 sanity warning: check_market_data (not a blocker) */}
        {result.ui_notice === 'check_market_data' && (
          <div className="mb-6 rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-xs text-muted-foreground flex items-start gap-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
            <p>{getTranslation(result.ui_notice_message_key || 'result.checkMarketData.message', language)}</p>
          </div>
        )}

        {/* Chevrolet sparse data footnote (only when already flagged as limited/extremely limited) */}
        {result.ui_footnote_key && (
          <p className="mb-6 text-xs text-muted-foreground italic">
            {getTranslation(result.ui_footnote_key, language)}
          </p>
        )}

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
            {getTranslation('result.viewPriceGraph', language)}
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-testid="view-depreciation-button"
            onClick={handleViewDepreciation}
            className="flex-1 min-w-[140px]"
          >
            <LineChartIcon className="w-4 h-4 mr-2" />
            {getTranslation('result.viewDepreciation', language)}
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-testid="price-report-button"
            onClick={handleOpenPriceReport}
            className="min-w-[100px]"
          >
            <FileText className="w-4 h-4 mr-2" />
            {getTranslation('report.priceReport', language)}
          </Button>
        </div>
      </CardContent>
    </Card>

    <PriceReportModal
      isOpen={showPriceReport}
      onClose={() => setShowPriceReport(false)}
      result={result}
      request={request}
      onViewDepreciation={onViewDepreciation}
    />
    </>
  );
};

// Price Gauge Component — safe when band values are missing
const PriceGauge = ({ result, language }) => {
  const green_low = result?.green_low != null ? Number(result.green_low) : NaN;
  const green_high = result?.green_high != null ? Number(result.green_high) : NaN;
  const yellow = result?.yellow != null ? Number(result.yellow) : NaN;
  const red_low = result?.red_low != null ? Number(result.red_low) : NaN;
  const red_high = result?.red_high != null ? Number(result.red_high) : NaN;

  const hasValidBands =
    !isNaN(green_low) &&
    !isNaN(green_high) &&
    !isNaN(yellow) &&
    !isNaN(red_low) &&
    !isNaN(red_high);

  if (!hasValidBands) {
    return (
      <div className="relative py-2" data-testid="price-gauge">
        <div className="h-4 rounded-full bg-muted flex items-center justify-center">
          <span className="text-xs text-muted-foreground">{getTranslation('band.yellow.badge', language)}</span>
        </div>
      </div>
    );
  }

  // Calculate positions (as percentages)
  const minPrice = Math.max(0, green_low * 0.95);
  const maxPrice = red_high * 1.05;
  const range = Math.max(maxPrice - minPrice, 1);

  const greenEnd = Math.max(0, Math.min(100, ((green_high - minPrice) / range) * 100));
  const yellowPos = Math.max(0, Math.min(100, ((yellow - minPrice) / range) * 100));
  const redStart = Math.max(0, Math.min(100, ((red_low - minPrice) / range) * 100));

  const orangeStart = greenEnd;
  const orangeEnd = redStart;
  const fairPct = orangeStart < orangeEnd ? (orangeStart + orangeEnd) / 2 : 50;

  const pointerPct = Math.max(3, Math.min(97, yellowPos));
  const fairPctClamped = Math.max(3, Math.min(97, fairPct));

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className="relative cursor-help" data-testid="price-gauge">
            {/* Market Price badge - positioned above the white pointer */}
            <div 
              className="absolute -top-8 left-1/2 -translate-x-1/2 z-10"
              style={{ left: `${pointerPct}%` }}
            >
              <Badge className="bg-status-fair text-white text-sm whitespace-nowrap px-4 py-1.5 font-medium">
                {getTranslation('band.yellow.badge', language)}
              </Badge>
            </div>
            
            {/* Background bar */}
            <div className="h-4 rounded-full bg-muted overflow-hidden flex relative">
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
              
              {/* Fair price marker (white pointer) */}
              <div 
                className="absolute top-0 w-1 h-6 bg-foreground rounded-full -translate-x-1/2"
                style={{ left: `${yellowPos}%` }}
              />
            </div>
            
            {/* Labels */}
            <div className="relative mt-2 text-xs text-muted-foreground">
              <span className="absolute left-0">{getTranslation('gauge.lower', language)}</span>
              <span 
                className="absolute font-medium text-foreground -translate-x-1/2"
                style={{ left: `${fairPctClamped}%` }}
              >
                {getTranslation('gauge.fairPrice', language)}
              </span>
              <span className="absolute right-0">{getTranslation('gauge.higher', language)}</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-[300px] p-3 text-sm z-[100]"
          sideOffset={20}
          align="center"
        >
          <p>{getTranslation('gauge.tooltip', language)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

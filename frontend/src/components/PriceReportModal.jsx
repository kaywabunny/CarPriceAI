import { useRef, useCallback, useState, useEffect } from 'react';
import { FileText, Download, LineChart as LineChartIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { formatTHB, formatPercent } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { getDepreciation, getPriceGraph } from '@/lib/api';

function isBandOrderValid(result) {
  if (!result) return true;
  const g = (v) => (v != null ? Number(v) : NaN);
  const gl = g(result.green_low);
  const gm = g(result.green_median);
  const gh = g(result.green_high);
  const y = g(result.yellow);
  const rl = g(result.red_low);
  const rm = g(result.red_median);
  const rh = g(result.red_high);
  if ([gl, gm, gh, y, rl, rm, rh].some((n) => isNaN(n))) return true;
  return gl <= gm && gm <= gh && gh <= y && y <= rl && rl <= rm && rm <= rh;
}

function getEstimateBasisKey(basis) {
  if (!basis) return null;
  const b = String(basis).toLowerCase();
  if (b.includes('comparable') || b === 'based_on_comparable_listings') return 'report.estimateBasisComparable';
  if (b.includes('market') || b === 'market_trends') return 'report.estimateBasisMarketTrends';
  if (b.includes('fallback') || b === 'fallback_no_comparables') return 'report.estimateBasisFallback';
  return null;
}

/** Report-only: derive confidence tier for messaging. */
function getReportConfidenceTier(sampleSize, estimateBasis) {
  const ss = sampleSize ?? 0;
  const basis = (estimateBasis ?? '').toLowerCase();
  if (basis.includes('fallback_no_comparables')) return 'low';
  if (ss <= 1) return 'low';
  if (ss <= 4) return 'medium';
  return 'high';
}

function formatDepreciationError(err, language) {
  const rawMessage = err?.message || '';
  const lower = rawMessage.toLowerCase();
  const isInsufficient =
    lower.includes('insufficient amount of data') ||
    lower.includes('need at least 30') ||
    lower === 'invalid request: bad request' ||
    lower === 'bad request';
  if (isInsufficient) return { kind: 'unavailable', message: getTranslation('report.depreciationUnavailable', language) };
  return { kind: 'error', message: rawMessage || getTranslation('depreciation.error', language) };
}

export const PriceReportModal = ({
  isOpen,
  onClose,
  result,
  request,
  onViewDepreciation,
}) => {
  const { language } = useLanguage();
  const printRef = useRef(null);
  const [depreciationData, setDepreciationData] = useState(null);
  const [depreciationLoading, setDepreciationLoading] = useState(false);
  const [depreciationError, setDepreciationError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const loadedDepreciationKey = useRef(null);

  // Fetch depreciation when modal opens with this request
  useEffect(() => {
    if (!isOpen || !request || !result) return;
    const key = `${request.make}-${request.model}-${request.year}-${request.mileage_km_num ?? ''}`;
    if (loadedDepreciationKey.current === key) return;
    loadedDepreciationKey.current = key;
    setDepreciationData(null);
    setDepreciationError(null);
    setDepreciationLoading(true);
    getDepreciation({
      ...request,
      horizon_years: 6,
      market_price: result.yellow != null && result.yellow > 0 ? result.yellow : null,
    })
      .then((data) => {
        if (data && (data.series?.length > 0 || data.total_depreciation != null)) {
          setDepreciationData(data);
        } else {
          setDepreciationError({ kind: 'unavailable', message: getTranslation('report.depreciationUnavailable', language) });
        }
      })
      .catch((err) => {
        setDepreciationError(formatDepreciationError(err, language));
      })
      .finally(() => {
        setDepreciationLoading(false);
      });
  }, [isOpen, request, result, language]);

  useEffect(() => {
    if (!isOpen) {
      loadedDepreciationKey.current = null;
    }
  }, [isOpen]);

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;
    const prevTitle = document.title;
    document.title = getTranslation('report.priceReport', language);
    /* Clone report into a body-attached div so print CSS can show only that */
    const clone = document.createElement('div');
    clone.className = 'print-only-report price-report';
    clone.setAttribute('aria-hidden', 'true');
    clone.innerHTML = printRef.current.innerHTML;
    document.body.appendChild(clone);
    document.body.classList.add('printing-price-report');
    const onAfterPrint = () => {
      const el = document.querySelector('.print-only-report');
      if (el) el.remove();
      document.body.classList.remove('printing-price-report');
      document.title = prevTitle;
      window.removeEventListener('afterprint', onAfterPrint);
    };
    window.addEventListener('afterprint', onAfterPrint);
    window.print();
  }, [language]);

  const handleDownloadPdf = useCallback(async () => {
    if (!printRef.current || !request) return;
    setPdfLoading(true);
    let chartBlobUrl = null;
    let wrapper = null;
    const cleanup = () => {
      if (chartBlobUrl) try { URL.revokeObjectURL(chartBlobUrl); } catch (_) {}
      if (wrapper?.parentNode) wrapper.remove();
      setPdfLoading(false);
    };
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      chartBlobUrl = await getPriceGraph(request);
      wrapper = document.createElement('div');
      wrapper.setAttribute('aria-hidden', 'true');
      wrapper.className = 'price-report';
      wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:595px;max-width:595px;background:#fff;color:#111;padding:40px;box-sizing:border-box;';
      wrapper.innerHTML = printRef.current.innerHTML;
      wrapper.querySelectorAll('[data-pdf-exclude]').forEach((el) => el.remove());
      document.body.appendChild(wrapper);
      // Expand scrollable area so full content is visible for capture (no bottom cutoff)
      const printArea = wrapper.querySelector('.price-report-print-area');
      const reportBody = wrapper.querySelector('.price-report-body');
      if (printArea) {
        printArea.style.overflow = 'visible';
        printArea.style.minHeight = 'auto';
      }
      if (reportBody) {
        reportBody.style.maxHeight = 'none';
        reportBody.style.overflow = 'visible';
        reportBody.style.height = 'auto';
      }
      wrapper.querySelectorAll('[data-depreciation-table]').forEach((el) => {
        el.style.maxHeight = 'none';
        el.style.overflow = 'visible';
      });
      wrapper.querySelectorAll('[data-depreciation-chart]').forEach((el) => {
        el.style.overflow = 'visible';
      });
      const chartSlot = wrapper.querySelector('[data-chart-slot]');
      if (chartSlot && chartBlobUrl) {
        chartSlot.innerHTML = '';
        chartSlot.style.minHeight = '180px';
        const img = document.createElement('img');
        img.src = chartBlobUrl;
        img.alt = getTranslation('report.priceChartTitle', language);
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        await new Promise((resolve, reject) => {
          if (img.complete) resolve();
          else { img.onload = resolve; img.onerror = reject; }
        });
        chartSlot.appendChild(img);
      }
      // Let layout reflow; extra delay so Recharts depreciation chart is fully painted
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 400));

      const margin = 10;
      const pageW = 210 - margin * 2;
      const pageH = 297 - margin * 2;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Strict 3-page PDF: capture each .reportPage section separately
      const pageSelectors = ['.reportPage--1', '.reportPage--2', '.reportPage--3'];
      for (let i = 0; i < pageSelectors.length; i++) {
        const pageEl = wrapper.querySelector(pageSelectors[i]);
        if (!pageEl) continue;
        const pageContainer = document.createElement('div');
        pageContainer.setAttribute('aria-hidden', 'true');
        pageContainer.className = 'price-report price-report-pdf';
        pageContainer.style.cssText = 'position:fixed;left:-9999px;top:0;width:595px;max-width:595px;background:#fff;color:#111827;padding:40px;box-sizing:border-box;';
        pageContainer.appendChild(pageEl.cloneNode(true));
        if (i === 0) pageContainer.querySelector('.price-report-page1-header')?.classList.remove('hidden');
        document.body.appendChild(pageContainer);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const pageCanvas = await html2canvas(pageContainer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
        });
        pageContainer.remove();
        let imgW = pageW;
        let imgH = (pageCanvas.height / pageCanvas.width) * pageW;
        if (imgH > pageH) {
          imgW = pageW * (pageH / imgH);
          imgH = pageH;
        }
        if (i > 0) doc.addPage();
        doc.addImage(pageCanvas.toDataURL('image/png'), 'PNG', margin, margin, imgW, imgH);
      }

      doc.save(`price-report-${request.make}-${request.model}-${request.year}.pdf`);
    } catch (err) {
      console.warn('PDF save failed, falling back to print:', err);
      handlePrint();
    } finally {
      cleanup();
    }
  }, [language, request, handlePrint]);

  const handleViewDepreciation = useCallback(() => {
    onClose();
    if (typeof onViewDepreciation === 'function') {
      onViewDepreciation();
    }
  }, [onClose, onViewDepreciation]);

  if (!result || !request) return null;

  const vehicleSummary = [
    request.make,
    request.model,
    request.trim ? request.trim : null,
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();
  const year = request.year;
  const mileage = request.mileage_km_num != null
    ? Number(request.mileage_km_num).toLocaleString(language === 'th' ? 'th-TH' : 'en')
    : '—';
  const generatedDate = new Date().toLocaleString(language === 'th' ? 'th-TH' : 'en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  const bandOrderInvalid = !isBandOrderValid(result);
  const showLowDataWarning =
    (result.sample_size != null && result.sample_size <= 3) ||
    result.estimate_basis === 'fallback_no_comparables';
  const basisKey = getEstimateBasisKey(result.estimate_basis);
  const confidenceTier = getReportConfidenceTier(result.sample_size, result.estimate_basis);
  const basisLabel = basisKey ? getTranslation(basisKey, language) : '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border border-border bg-background"
        onPointerDownOutside={(e) => e.target === e.currentTarget && onClose()}
      >
        <div ref={printRef} className="price-report price-report-print-area flex flex-col flex-1 min-h-0 overflow-hidden" data-price-report="true">
          {/* Header — single close is provided by DialogContent (no extra X here) */}
          <DialogHeader className="price-report-header px-6 py-4 border-b border-border shrink-0 print:hidden">
            <div className="reportHeaderTitleRow flex items-center gap-2 min-w-0 pr-8">
              <FileText className="reportHeaderIcon w-5 h-5 text-primary shrink-0" />
              <DialogTitle className="reportHeaderTitle text-lg font-semibold">
                {getTranslation('report.title', language)}
              </DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {vehicleSummary} • {year} • {mileage} km
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {getTranslation('report.generatedOnLabel', language, { date: generatedDate })}
            </p>
          </DialogHeader>

          {/* Scrollable body — continuous scroll on screen; print CSS enforces 3-page split */}
          <div className="price-report-body flex-1 min-h-0 overflow-y-auto overflow-x-hidden print:max-h-none print:overflow-visible print:h-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
            <div className="px-6 py-4 space-y-6">
              {/* ========== PAGE 1: How to use + price bands + band explanations ========== */}
              <section className="reportPage reportPage--1">
                {/* Header (duplicated for print page 1) */}
                <div className="price-report-page1-header print:block hidden print:!block">
                  <div className="reportHeaderTitleRow">
                    <FileText className="reportHeaderIcon" />
                    <h1 className="reportHeaderTitle text-lg font-semibold text-foreground">{getTranslation('report.title', language)}</h1>
                  </div>
                  <p className="reportHeaderMeta text-sm text-muted-foreground mt-1">{vehicleSummary} • {year} • {mileage} km</p>
                  <p className="reportHeaderMeta text-xs text-muted-foreground mt-0.5">{getTranslation('report.generatedOnLabel', language, { date: generatedDate })}</p>
                </div>
                <hr className="reportDivider" />

                {/* How to use this price report */}
                <section className="report-block">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    {getTranslation('report.section.howToUse', language)}
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                    <li>{getTranslation('report.howToUse.bullet1', language)}</li>
                    <li>{getTranslation('report.howToUse.bullet2', language)}</li>
                    <li>{getTranslation('report.howToUse.bullet3', language)}</li>
                  </ul>
                  {confidenceTier === 'low' && (
                    <p className="text-sm text-amber-600 dark:text-amber-500 mt-3 font-medium">
                      {getTranslation('report.howToUse.lowDataAddOn', language)}
                    </p>
                  )}
                </section>
                <hr className="reportDivider" />

                {/* Price band cards — pastel cards + aligned grid */}
                <section className="report-block report-cards-section">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    {getTranslation('report.sectionPriceEstimate', language)}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="report-card reportBandCard bandCard bandCard--green p-3 rounded-xl">
                      <div className="bandCardInner">
                        <p className="reportBandTitle reportCardTitle text-xs font-medium text-status-good line-clamp-2">{getTranslation('report.band.green.titleShort', language)}</p>
                        <p className="reportPriceValue font-mono font-bold leading-tight">{formatTHB(result.green_median)}</p>
                        <div className="bandSubtext bandSubtext--placeholder" aria-hidden="true" />
                        <p className="reportPriceRange priceRange text-xs leading-tight">{formatTHB(result.green_low)} – {formatTHB(result.green_high)}</p>
                      </div>
                    </div>
                    <div className="report-card reportBandCard bandCard bandCard--yellow p-3 rounded-xl">
                      <div className="bandCardInner">
                        <p className="reportBandTitle reportCardTitle text-xs font-medium text-status-fair line-clamp-2">{getTranslation('report.band.yellow.titleShort', language)}</p>
                        <p className="reportPriceValue font-mono font-bold leading-tight">{formatTHB(result.yellow)}</p>
                        <div className="bandSubtext min-h-[22px] flex items-center">
                          <p className="text-xs text-muted-foreground">{getTranslation('result.typicalMarketValue', language)}</p>
                        </div>
                        <p className="reportPriceRange priceRange text-xs leading-tight invisible" aria-hidden="true">&#8203;</p>
                      </div>
                    </div>
                    <div className="report-card reportBandCard bandCard bandCard--red p-3 rounded-xl">
                      <div className="bandCardInner">
                        <p className="reportBandTitle reportCardTitle text-xs font-medium text-status-high line-clamp-2">{getTranslation('report.band.red.titleShort', language)}</p>
                        <p className="reportPriceValue font-mono font-bold leading-tight">{formatTHB(result.red_median)}</p>
                        <div className="bandSubtext bandSubtext--placeholder" aria-hidden="true" />
                        <p className="reportPriceRange priceRange text-xs leading-tight">{formatTHB(result.red_low)} – {formatTHB(result.red_high)}</p>
                      </div>
                    </div>
                  </div>
                  {bandOrderInvalid && (
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                      {getTranslation('report.bandOrderInvalid', language)}
                    </p>
                  )}
                </section>

                {/* What these bands mean */}
                <section className="report-block">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    {getTranslation('report.section.whatItMeans', language)}
                  </h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li>
                      <span className="font-medium text-status-good">{getTranslation('report.band.green.title', language)}: </span>
                      {getTranslation('report.band.green.explain', language)}
                    </li>
                    <li>
                      <span className="font-medium text-status-fair">{getTranslation('report.band.yellow.title', language)}: </span>
                      {getTranslation('report.band.yellow.explain', language)}
                    </li>
                    <li>
                      <span className="font-medium text-status-high">{getTranslation('report.band.red.title', language)}: </span>
                      {getTranslation('report.band.red.explain', language)}
                      {confidenceTier === 'low' && (
                        <> {getTranslation('report.band.red.lowDataExtra', language)}</>
                      )}
                    </li>
                  </ul>
                </section>

                {/* Important Notice (page 1) */}
                <section className="report-block rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    {getTranslation('report.importantHeading', language)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {getTranslation('report.importantBody', language)}
                  </p>
                </section>
              </section>

              {/* ========== PAGE 2: Bar chart + confidence block only ========== */}
              <section className="reportPage reportPage--2">
                <section id="report-chart-insert" data-chart-insert className="report-block report-chart-block">
                  <h3 className="reportChartTitle text-sm font-semibold text-foreground mb-3">
                    {getTranslation('report.priceChartTitle', language)}
                  </h3>
                  <div data-chart-slot className="reportChartSlot min-h-[120px] w-full flex items-center justify-center bg-muted/30 rounded-lg text-muted-foreground text-sm print:min-h-[180px]">
                    <span className="print:hidden">{getTranslation('report.priceChartIncludedInPdf', language)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {getTranslation('report.priceChartCaption', language)}
                  </p>
                </section>

                {/* Data & reliability (confidence) — page 2: mini-table */}
                <section className="report-block report-reliability-block">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    {getTranslation('report.section.dataAndReliability', language)}
                  </h3>
                  <div className="reportReliabilityTable text-sm">
                    <div className="reportReliabilityRow">
                      <span className="reportReliabilityLabel">{getTranslation('report.data.labelBasedOn', language)}:</span>
                      <span>{(result.sample_size ?? 0).toLocaleString(language === 'th' ? 'th-TH' : 'en')} listings</span>
                    </div>
                    {basisLabel && (
                      <div className="reportReliabilityRow">
                        <span className="reportReliabilityLabel">{getTranslation('report.data.labelBasis', language)}:</span>
                        <span>{basisLabel}</span>
                      </div>
                    )}
                    {result.confidence != null && (
                      <div className="reportReliabilityRow">
                        <span className="reportReliabilityLabel">{getTranslation('report.data.labelConfidence', language)}:</span>
                        <span>{(result.confidence * 100).toFixed(1)}%</span>
                      </div>
                    )}
                    <div className="reportReliabilityRow">
                      <span className="reportReliabilityLabel">{getTranslation('report.data.labelTier', language)}:</span>
                      <span>{getTranslation(`report.confidenceTier.${confidenceTier}`, language)}</span>
                    </div>
                  </div>
                  {(confidenceTier === 'low' || confidenceTier === 'medium') && (
                    <p className="text-amber-600 dark:text-amber-500 font-medium mt-3 text-sm">
                      {confidenceTier === 'low'
                        ? getTranslation('report.confidenceNote.low', language)
                        : getTranslation('report.confidenceNote.medium', language)}
                    </p>
                  )}
                  {(result.ui_notice === 'limited_market_data' || result.ui_notice === 'extremely_limited_data') && (
                    <Badge variant="outline" className="text-amber-600 border-amber-500/50 mt-2">
                      {result.ui_notice === 'extremely_limited_data'
                        ? getTranslation('result.extremelyLimitedData.title', language)
                        : getTranslation('result.limitedMarketData.title', language)}
                    </Badge>
                  )}
                </section>
              </section>

              {/* ========== PAGE 3: Depreciation chart + table + explanation ========== */}
              <section className="reportPage reportPage--3">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  {getTranslation('report.sectionDepreciation', language)}
                </h3>
                {depreciationLoading && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {getTranslation('report.depreciationLoading', language)}
                  </p>
                )}
                {!depreciationLoading && depreciationError && (
                  <p className="text-sm text-muted-foreground">
                    {depreciationError.message}
                  </p>
                )}
                {!depreciationLoading && depreciationData && (
                  <>
                    <p className="text-sm text-muted-foreground mb-2">
                      {getTranslation('report.depreciationSummary', language, {
                        make: request.make,
                        model: request.model,
                        year: request.year,
                        totalDepreciation: depreciationData.total_depreciation != null
                          ? Math.abs(Number(depreciationData.total_depreciation))
                          : (depreciationData.series?.length > 1
                            ? Math.abs(Number(depreciationData.series[depreciationData.series.length - 1]?.cumulative_depreciation ?? 0))
                            : '—'),
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      {getTranslation('report.depreciationExplanation', language)}
                    </p>
                    <div className="mb-4 h-[220px] w-full min-h-0" data-depreciation-chart>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={depreciationData.series ?? []}
                          margin={{ top: 12, right: 16, left: 12, bottom: 12 }}
                        >
                          <defs>
                            <linearGradient id="reportDeprValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis
                            dataKey="year_label"
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                          />
                          <YAxis
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                            tickFormatter={(v) => `฿${(v / 1000000).toFixed(1)}M`}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            fill="url(#reportDeprValue)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="overflow-auto max-h-[240px] mb-3" data-depreciation-table>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-muted-foreground">{getTranslation('depreciation.year', language)}</TableHead>
                            <TableHead className="text-right text-muted-foreground">{getTranslation('depreciation.estimatedValue', language)}</TableHead>
                            <TableHead className="text-right text-muted-foreground">{getTranslation('depreciation.annualDepreciation', language)}</TableHead>
                            <TableHead className="text-right text-muted-foreground">{getTranslation('depreciation.totalDepreciation', language)}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(depreciationData.series ?? []).map((point) => (
                            <TableRow key={point.year}>
                              <TableCell className="font-medium">{point.year_label}</TableCell>
                              <TableCell className="text-right font-mono text-sm">{formatTHB(point.value)}</TableCell>
                              <TableCell className="text-right text-sm">{point.year === 0 ? '—' : formatPercent(point.depreciation_rate)}</TableCell>
                              <TableCell className="text-right text-sm">{point.year === 0 ? '—' : `${point.cumulative_depreciation}%`}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleViewDepreciation}
                      className="w-full sm:w-auto"
                    >
                      <LineChartIcon className="w-4 h-4 mr-2" />
                      {getTranslation('report.viewDepreciation', language)}
                    </Button>
                  </>
                )}
                {!depreciationLoading && !depreciationError && !depreciationData && (
                  <p className="text-sm text-muted-foreground">
                    {getTranslation('report.depreciationUnavailable', language)}
                  </p>
                )}
              </section>
            </div>
          </div>

          {/* Sticky footer (excluded from PDF) */}
          <DialogFooter className="px-6 py-4 border-t border-border shrink-0 bg-background print:hidden" data-pdf-exclude>
            <Button variant="outline" onClick={onClose}>
              {getTranslation('report.close', language)}
            </Button>
            <Button onClick={handleDownloadPdf} disabled={pdfLoading}>
              {pdfLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              {getTranslation('report.downloadPdf', language)}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

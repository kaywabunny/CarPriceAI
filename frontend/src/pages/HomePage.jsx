import { useState, useEffect } from 'react';
import { AlertCircle, Car, Gauge } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PredictionForm } from '@/components/PredictionForm';
import { ResultCard } from '@/components/ResultCard';
import { ResultErrorBoundary } from '@/components/ResultErrorBoundary';
import { GraphModal } from '@/components/GraphModal';
import { DepreciationModal } from '@/components/DepreciationModal';
import { predictPrice } from '@/lib/api';
import { trackEvent } from '@/lib/businessAnalytics';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { applyUiNoticesBMWX3 } from '@/guards/applyUiNoticesBMWX3';
import { applyBmwXSuvSafeguard } from '@/guards/applyBmwXSuvSafeguard';

export default function HomePage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [request, setRequest] = useState(null);
  const [predictionId, setPredictionId] = useState(null);
  
  // Modal states
  const [showGraph, setShowGraph] = useState(false);
  const [showDepreciation, setShowDepreciation] = useState(false);

  useEffect(() => {
    trackEvent('page_view');
  }, []);

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setRequest(formData);

    const startTime = Date.now();

    try {
      const apiPayload = {
        make: formData.make,
        model: formData.model,
        year: formData.year,
        mileage_km_num: formData.mileage_km_num,
        trim: formData.trim || null,
      };

      const response = await predictPrice(apiPayload);
      const latency = Date.now() - startTime;

      // Normalize: backend may return single result object or { results, count }
      const rawResult =
        response &&
        response.results &&
        Array.isArray(response.results) &&
        response.results.length === 1
          ? response.results[0]
          : response;

      const processed = applyBmwXSuvSafeguard(
        applyUiNoticesBMWX3(rawResult, formData),
        formData
      );
      setResult(processed);
      setPredictionId(
        (rawResult && rawResult.prediction_id) || response.prediction_id || null
      );

      // Track search_submit event with vehicle and result data
      trackEvent('search_submit', formData, rawResult || response);

    } catch (err) {
      console.error('Prediction failed:', err);
      setError(err.message || 'Failed to get price prediction. Please try again.');
      
      // Track search_submit even on error (with vehicle data only)
      trackEvent('search_submit', formData, null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" data-testid="home-page">
      {/* Hero Section */}
      <section className="relative py-12 md:py-20 px-4 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        
        <div className="max-w-5xl mx-auto relative">
          {/* Header */}
          <div className="text-center mb-10 md:mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-4">
              <Gauge className="w-4 h-4" />
              <span>{getTranslation('hero.aiPowered', language)}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-black tracking-tight mb-4">
              {getTranslation('hero.title', language)}
              <span className="block text-primary">{getTranslation('hero.titleHighlight', language)}</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
              {getTranslation('hero.subtitle', language)}
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Left: Form */}
            <div className="animate-fade-in">
              <PredictionForm onSubmit={handleSubmit} isLoading={loading} />
            </div>

            {/* Right: Results */}
            <div className="space-y-4">
              <ResultErrorBoundary language={language}>
              {loading && (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-lg animate-pulse">
                  <Gauge className="w-12 h-12 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">{language === 'th' ? 'กำลังวิเคราะห์ข้อมูลตลาด...' : 'Analyzing market data...'}</p>
                </div>
              )}

              {error && !loading && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {result && !loading && (
                <>
                  {(result.status === 'unsupported_model' || result.status === 'pricing_unavailable') ? (
                    <Alert className="animate-fade-in">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <h3 className="font-semibold">{getTranslation('result.unsupported.title', language)}</h3>
                          <p className="text-sm text-muted-foreground">
                            {result.error === 'model_not_in_production' || result.ui_notice === 'model_not_in_production'
                              ? (result.reason === 'Ferrari 296 GTB was not in production for the selected year'
                                ? getTranslation('result.unsupported.ferrari296GtbNotInProduction', language)
                                : getTranslation('result.unsupported.modelNotInProduction', language))
                              : result.ui_notice === 'model_not_produced_in_selected_year'
                              ? getTranslation('result.unsupported.modelNotProducedInSelectedYear', language)
                              : result.ui_notice === 'pricing_unavailable_insufficient_data'
                              ? getTranslation('result.pricingUnavailableInsufficientData', language)
                              : result.reason === 'BYD Dolphin was not produced in the selected year'
                              ? getTranslation('result.unsupported.bydDolphinNotProduced', language)
                              : result.reason === 'This model was not produced in the selected year'
                              ? getTranslation('result.unsupported.modelNotProducedYear', language)
                              : result.reason === 'This model was discontinued and renamed to GLE-CLASS'
                              ? getTranslation('result.unsupported.modelDiscontinuedRenamed', language)
                              : result.reason === 'This model was discontinued and renamed to SLC-CLASS'
                              ? getTranslation('result.unsupported.modelDiscontinuedRenamedSLC', language)
                              : result.reason === 'Insufficient market data for this model and year' && request?.make === 'BENTLEY' && request?.model === 'FLYING SPUR'
                              ? (result.message || getTranslation('result.unsupported.bentleyFlyingSpur', language))
                              : result.reason === 'Insufficient market data for this model and year'
                              ? getTranslation('result.unsupported.modelYear', language)
                              : (result.message || getTranslation('result.unsupported.message', language))}
                          </p>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : (result.green_median != null || result.yellow != null || result.red_median != null) ? (
                    <ResultCard
                      result={result}
                      request={request}
                      predictionId={predictionId}
                      onViewGraph={() => setShowGraph(true)}
                      onViewDepreciation={() => setShowDepreciation(true)}
                    />
                  ) : (
                    <Alert variant="destructive" className="animate-fade-in">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>{getTranslation('error.priceEstimate', language)}</AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              {!result && !loading && !error && (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-lg text-center">
                  <Car className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium text-foreground mb-1">{language === 'th' ? 'พร้อมประเมินราคา' : 'Ready to Price'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {language === 'th' ? 'กรอกรายละเอียดรถยนต์ของคุณเพื่อรับการประเมินราคาทันที' : 'Fill in your car details to get an instant price estimate'}
                  </p>
                </div>
              )}
              </ResultErrorBoundary>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 border-t border-border/50 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-heading font-bold text-center mb-8">{getTranslation('howItWorks.title', language)}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              step="1"
              title={getTranslation('howItWorks.step1.title', language)}
              description={getTranslation('howItWorks.step1.description', language)}
            />
            <FeatureCard
              step="2"
              title={getTranslation('howItWorks.step2.title', language)}
              description={getTranslation('howItWorks.step2.description', language)}
            />
            <FeatureCard
              step="3"
              title={getTranslation('howItWorks.step3.title', language)}
              description={getTranslation('howItWorks.step3.description', language)}
            />
          </div>
        </div>
      </section>

      {/* Modals */}
      <GraphModal
        isOpen={showGraph}
        onClose={() => setShowGraph(false)}
        request={request}
        predictionId={predictionId}
      />

      <DepreciationModal
        isOpen={showDepreciation}
        onClose={() => setShowDepreciation(false)}
        request={request}
        predictionId={predictionId}
        marketPrice={result?.yellow}  // Pass market price (yellow) to align depreciation baseline
      />
    </div>
  );
}

// Feature Card Component
const FeatureCard = ({ step, title, description }) => (
  <div className="p-6 rounded-lg bg-background border border-border/50 text-center">
    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-heading font-bold flex items-center justify-center mx-auto mb-4">
      {step}
    </div>
    <h3 className="font-heading font-bold mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

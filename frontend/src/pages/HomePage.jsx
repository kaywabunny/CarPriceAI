import { useState, useEffect } from 'react';
import { AlertCircle, Car, Gauge } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PredictionForm } from '@/components/PredictionForm';
import { ResultCard } from '@/components/ResultCard';
import { GraphModal } from '@/components/GraphModal';
import { DepreciationModal } from '@/components/DepreciationModal';
import { predictPrice } from '@/lib/api';
import { trackPriceCheckSubmit, trackEvent } from '@/lib/privateAnalytics';

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [request, setRequest] = useState(null);
  const [predictionId, setPredictionId] = useState(null);
  
  // Modal states
  const [showGraph, setShowGraph] = useState(false);
  const [showDepreciation, setShowDepreciation] = useState(false);

  useEffect(() => {
    trackEvent('page_view', { page: 'home' });
  }, []);

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setRequest(formData);

    // Track the price check submission
    trackPriceCheckSubmit(formData);

    const startTime = Date.now();

    try {
      const response = await predictPrice(formData);
      const latency = Date.now() - startTime;
      
      setResult(response);
      setPredictionId(response.prediction_id);
      
      trackEvent('price_check_success', {
        ...formData,
        prediction_id: response.prediction_id,
        latency_ms: latency,
      });

    } catch (err) {
      console.error('Prediction failed:', err);
      setError(err.message || 'Failed to get price prediction. Please try again.');
      
      trackEvent('price_check_error', {
        ...formData,
        error: err.message,
      });
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
              <span>AI-Powered Pricing</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-black tracking-tight mb-4">
              Know Your Car's
              <span className="block text-primary">True Value</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
              Get instant, accurate price estimates for used cars in Thailand. 
              Powered by machine learning and real market data.
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
              {loading && (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-lg animate-pulse">
                  <Gauge className="w-12 h-12 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">Analyzing market data...</p>
                </div>
              )}

              {error && !loading && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {result && !loading && (
                <ResultCard
                  result={result}
                  request={request}
                  predictionId={predictionId}
                  onViewGraph={() => setShowGraph(true)}
                  onViewDepreciation={() => setShowDepreciation(true)}
                />
              )}

              {!result && !loading && !error && (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-lg text-center">
                  <Car className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium text-foreground mb-1">Ready to Price</h3>
                  <p className="text-sm text-muted-foreground">
                    Fill in your car details to get an instant price estimate
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 border-t border-border/50 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-heading font-bold text-center mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              step="1"
              title="Enter Details"
              description="Select your car's make, model, year, and mileage from our comprehensive database."
            />
            <FeatureCard
              step="2"
              title="Get Estimate"
              description="Our ML model analyzes thousands of listings to calculate fair market value."
            />
            <FeatureCard
              step="3"
              title="Make Decisions"
              description="Use price bands to negotiate better deals or set competitive asking prices."
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

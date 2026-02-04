import { useState, useEffect, useCallback } from 'react';
import { Car, Gauge, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { getMakes, getModels, getTrims } from '@/lib/api';
import { getYearOptions, isTrimValidForYear } from '@/lib/utils';
import { track } from '@/lib/analytics';
import { EVENT_TYPES } from '@/lib/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/translations';

const NONE_VALUE = '__NONE__';

export const PredictionForm = ({ onSubmit, isLoading }) => {
  const { language } = useLanguage();
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [trims, setTrims] = useState([]);
  const [loadingMakes, setLoadingMakes] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingTrims, setLoadingTrims] = useState(false);

  const [formData, setFormData] = useState({
    make: '',
    model: '',
    trim: '',
    year: '',
    mileage: '',
  });

  const [errors, setErrors] = useState({});

  const MAX_SUPPORTED_YEAR = 2025; // Pricing unavailable for future years beyond 2025
  const yearOptions = getYearOptions(1990);

  // Load makes on mount
  useEffect(() => {
    const loadMakes = async () => {
      try {
        const data = await getMakes();
        setMakes(data);
      } catch (error) {
        console.error('Failed to load makes:', error);
      } finally {
        setLoadingMakes(false);
      }
    };
    loadMakes();
  }, []);

  // Load models when make changes
  useEffect(() => {
    if (formData.make && formData.make !== NONE_VALUE) {
      setLoadingModels(true);
      setModels([]);
      setTrims([]);
      setFormData(prev => ({ ...prev, model: '', trim: '' }));
      
      getModels(formData.make)
        .then(data => setModels(data))
        .catch(err => console.error('Failed to load models:', err))
        .finally(() => setLoadingModels(false));
    } else {
      setModels([]);
      setTrims([]);
    }
  }, [formData.make]);

  // Load trims when model changes
  useEffect(() => {
    if (formData.make && formData.model && formData.make !== NONE_VALUE && formData.model !== NONE_VALUE) {
      setLoadingTrims(true);
      setTrims([]);
      setFormData(prev => ({ ...prev, trim: '' }));
      
      getTrims(formData.make, formData.model)
        .then(data => setTrims(data))
        .catch(err => console.error('Failed to load trims:', err))
        .finally(() => setLoadingTrims(false));
    } else {
      setTrims([]);
    }
  }, [formData.make, formData.model]);

  // Auto-clamp year if somehow > 2025 (e.g., cached state or URL param)
  useEffect(() => {
    if (formData.year) {
      const yearNum = parseInt(formData.year, 10);
      if (!isNaN(yearNum) && yearNum > MAX_SUPPORTED_YEAR) {
        setFormData(prev => ({ ...prev, year: MAX_SUPPORTED_YEAR.toString() }));
      }
    }
  }, [formData.year]);

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  const validate = () => {
    const newErrors = {};
    
    if (!formData.make) {
      newErrors.make = getTranslation('form.error.make', language);
    }
    if (!formData.model && formData.make !== NONE_VALUE) {
      newErrors.model = getTranslation('form.error.model', language);
    }
    if (!formData.year) {
      newErrors.year = getTranslation('form.error.year', language);
    } else {
      const yearNum = parseInt(formData.year, 10);
      if (yearNum > MAX_SUPPORTED_YEAR) {
        newErrors.year = getTranslation('form.error.yearFuture', language) || `Pricing not available for future model years. Maximum supported year is ${MAX_SUPPORTED_YEAR}.`;
      }
    }
    if (!formData.mileage) {
      newErrors.mileage = getTranslation('form.error.mileage', language);
    } else if (isNaN(formData.mileage) || Number(formData.mileage) < 1000) {
      newErrors.mileage = getTranslation('form.error.mileageInvalid', language);
    } else if (Number(formData.mileage) > 450000) {
      newErrors.mileage = getTranslation('form.error.mileageMax', language);
    }

    if (
      formData.make &&
      formData.model &&
      formData.trim &&
      formData.trim !== NONE_VALUE &&
      formData.year
    ) {
      if (!isTrimValidForYear(formData.make, formData.model, formData.trim, formData.year)) {
        newErrors.trimYear = getTranslation('form.trimNotProduced', language);
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
};

  const trimInvalidForYear =
    Boolean(
      formData.make &&
      formData.model &&
      formData.trim &&
      formData.trim !== NONE_VALUE &&
      formData.year &&
      !isTrimValidForYear(formData.make, formData.model, formData.trim, formData.year)
    );

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    // Enforce 450k cap on mileage
    const mileage = Math.min(parseInt(formData.mileage, 10), 450000);
    // Enforce 2025 cap on year (clamp to 2025 if somehow > 2025)
    const year = Math.min(parseInt(formData.year, 10), MAX_SUPPORTED_YEAR);

    const submitData = {
      make: formData.make === NONE_VALUE ? null : formData.make,
      model: formData.model === NONE_VALUE ? null : formData.model,
      trim: formData.trim === NONE_VALUE || !formData.trim ? null : formData.trim,
      year: year,
      mileage_km_num: mileage,
    };

    track(EVENT_TYPES.PREDICT_SUBMITTED, submitData);
    onSubmit(submitData);
  };

  const handleReset = () => {
    setFormData({
      make: '',
      model: '',
      trim: '',
      year: '',
      mileage: '',
    });
    setErrors({});
    setModels([]);
    setTrims([]);
  };

  return (
    <Card className="border border-border/50 bg-card/50 backdrop-blur-sm" data-testid="prediction-form-card">
      <CardContent className="p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Car className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold tracking-tight">{getTranslation('form.title', language)}</h2>
            <p className="text-sm text-muted-foreground">{getTranslation('form.subtitle', language)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Make */}
          <div className="space-y-2">
            <Label htmlFor="make" className="text-sm font-medium">
              {getTranslation('form.make', language)} <span className="text-destructive">{getTranslation('form.required', language)}</span>
            </Label>
            <Select
              value={formData.make}
              onValueChange={(value) => handleChange('make', value)}
              disabled={loadingMakes}
            >
              <SelectTrigger 
                id="make" 
                data-testid="make-select"
                className={errors.make ? 'border-destructive' : ''}
              >
                <SelectValue placeholder={loadingMakes ? getTranslation('form.loading', language) : getTranslation('form.selectBrand', language)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE} className="text-muted-foreground">
                  {getTranslation('form.none', language)}
                </SelectItem>
                {makes.map((make) => (
                  <SelectItem key={make} value={make}>
                    {make}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.make && <p className="text-xs text-destructive">{errors.make}</p>}
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label htmlFor="model" className="text-sm font-medium">
              {getTranslation('form.model', language)} {formData.make !== NONE_VALUE && <span className="text-destructive">{getTranslation('form.required', language)}</span>}
            </Label>
            <Select
              value={formData.model}
              onValueChange={(value) => handleChange('model', value)}
              disabled={!formData.make || loadingModels || formData.make === NONE_VALUE}
            >
              <SelectTrigger 
                id="model" 
                data-testid="model-select"
                className={errors.model ? 'border-destructive' : ''}
              >
                <SelectValue placeholder={
                  loadingModels ? getTranslation('form.loading', language) : 
                  !formData.make ? getTranslation('form.selectBrandFirst', language) : 
                  formData.make === NONE_VALUE ? getTranslation('form.na', language) :
                  getTranslation('form.selectModel', language)
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE} className="text-muted-foreground">
                  {getTranslation('form.none', language)}
                </SelectItem>
                {models.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.model && <p className="text-xs text-destructive">{errors.model}</p>}
          </div>

          {/* Trim */}
          <div className="space-y-2">
            <Label htmlFor="trim" className="text-sm font-medium">
              {getTranslation('form.trim', language)} <span className="text-muted-foreground text-xs">({getTranslation('form.trimOptional', language).replace('Select trim (optional)', '').trim() || 'optional'})</span>
            </Label>
            <Select
              value={formData.trim}
              onValueChange={(value) => handleChange('trim', value)}
              disabled={!formData.model || loadingTrims || formData.model === NONE_VALUE}
            >
              <SelectTrigger 
                id="trim" 
                data-testid="trim-select"
              >
                <SelectValue placeholder={
                  loadingTrims ? getTranslation('form.loading', language) : 
                  !formData.model ? getTranslation('form.selectModelFirst', language) : 
                  formData.model === NONE_VALUE ? getTranslation('form.na', language) :
                  trims.length === 0 ? getTranslation('form.noTrimsAvailable', language) :
                  getTranslation('form.selectTrim', language)
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE} className="text-muted-foreground">
                  {getTranslation('form.none', language)}
                </SelectItem>
                {trims.map((trim) => (
                  <SelectItem key={trim} value={trim}>
                    {trim}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {trimInvalidForYear && (
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1" role="alert">
                {getTranslation('form.trimNotProduced', language)}
              </p>
            )}
          </div>

          {/* Year and Mileage Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Year */}
            <div className="space-y-2">
              <Label htmlFor="year" className="text-sm font-medium">
                {getTranslation('form.year', language)} <span className="text-destructive">{getTranslation('form.required', language)}</span>
              </Label>
              <Select
                value={formData.year}
                onValueChange={(value) => handleChange('year', value)}
              >
                <SelectTrigger 
                  id="year" 
                  data-testid="year-select"
                  className={errors.year ? 'border-destructive' : ''}
                >
                  <SelectValue placeholder={getTranslation('form.selectYear', language)} />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.year && <p className="text-xs text-destructive">{errors.year}</p>}
            </div>

            {/* Mileage */}
            <div className="space-y-2">
              <Label htmlFor="mileage" className="text-sm font-medium">
                {getTranslation('form.mileage', language)} <span className="text-destructive">{getTranslation('form.required', language)}</span>
              </Label>
              <div className="relative">
                <Input
                  id="mileage"
                  data-testid="mileage-input"
                  type="number"
                  min="1000"
                  max="450000"
                  step="1000"
                  placeholder={getTranslation('form.mileagePlaceholder', language)}
                  value={formData.mileage}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow any input - validation will handle errors
                    handleChange('mileage', value);
                  }}
                  onBlur={(e) => {
                    // Validate on blur to show error immediately when user leaves field
                    const value = e.target.value;
                    if (value && (isNaN(value) || Number(value) < 1000 || Number(value) > 450000)) {
                      const newErrors = { ...errors };
                      if (!value) {
                        newErrors.mileage = getTranslation('form.error.mileage', language);
                      } else if (Number(value) < 1000) {
                        newErrors.mileage = getTranslation('form.error.mileageInvalid', language);
                      } else if (Number(value) > 450000) {
                        newErrors.mileage = getTranslation('form.error.mileageMax', language);
                      }
                      setErrors(newErrors);
                    }
                  }}
                  className={`pr-12 ${errors.mileage ? 'border-destructive' : ''}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  km
                </span>
              </div>
              {errors.mileage && <p className="text-xs text-destructive">{errors.mileage}</p>}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              data-testid="predict-button"
              className="flex-1 h-11 font-semibold"
              disabled={isLoading || trimInvalidForYear}
            >
              {isLoading ? (
                <>
                  <Gauge className="w-4 h-4 mr-2 animate-spin" />
                  {language === 'th' ? 'กำลังคำนวณ...' : 'Calculating...'}
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  {getTranslation('form.getEstimate', language)}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid="reset-button"
              onClick={handleReset}
              disabled={isLoading}
              title={getTranslation('form.reset', language)}
              className="h-11"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

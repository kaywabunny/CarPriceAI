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
import { getYearOptions } from '@/lib/utils';
import { track } from '@/lib/analytics';
import { EVENT_TYPES } from '@/lib/types';

const NONE_VALUE = '__NONE__';

export const PredictionForm = ({ onSubmit, isLoading }) => {
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

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  const validate = () => {
    const newErrors = {};
    
    if (!formData.make) {
      newErrors.make = 'Please select a make';
    }
    if (!formData.model && formData.make !== NONE_VALUE) {
      newErrors.model = 'Please select a model';
    }
    if (!formData.year) {
      newErrors.year = 'Please select a year';
    }
    if (!formData.mileage) {
      newErrors.mileage = 'Please enter mileage';
    } else if (isNaN(formData.mileage) || Number(formData.mileage) < 0) {
      newErrors.mileage = 'Please enter a valid mileage';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    const submitData = {
      make: formData.make === NONE_VALUE ? null : formData.make,
      model: formData.model === NONE_VALUE ? null : formData.model,
      trim: formData.trim === NONE_VALUE || !formData.trim ? null : formData.trim,
      year: parseInt(formData.year, 10),
      mileage_km_num: parseInt(formData.mileage, 10),
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
            <h2 className="text-lg font-heading font-bold tracking-tight">Find Your Car's Value</h2>
            <p className="text-sm text-muted-foreground">Enter your vehicle details below</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Make */}
          <div className="space-y-2">
            <Label htmlFor="make" className="text-sm font-medium">
              Brand / Make <span className="text-destructive">*</span>
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
                <SelectValue placeholder={loadingMakes ? 'Loading...' : 'Select brand'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE} className="text-muted-foreground">
                  None / Not sure
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
              Model {formData.make !== NONE_VALUE && <span className="text-destructive">*</span>}
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
                  loadingModels ? 'Loading...' : 
                  !formData.make ? 'Select brand first' : 
                  formData.make === NONE_VALUE ? 'N/A' :
                  'Select model'
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE} className="text-muted-foreground">
                  None / Not sure
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
              Trim / Series <span className="text-muted-foreground text-xs">(optional)</span>
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
                  loadingTrims ? 'Loading...' : 
                  !formData.model ? 'Select model first' : 
                  formData.model === NONE_VALUE ? 'N/A' :
                  trims.length === 0 ? 'No trims available' :
                  'Select trim (optional)'
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE} className="text-muted-foreground">
                  None / Not sure
                </SelectItem>
                {trims.map((trim) => (
                  <SelectItem key={trim} value={trim}>
                    {trim}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year and Mileage Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Year */}
            <div className="space-y-2">
              <Label htmlFor="year" className="text-sm font-medium">
                Year <span className="text-destructive">*</span>
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
                  <SelectValue placeholder="Select year" />
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
                Mileage (km) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="mileage"
                  data-testid="mileage-input"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="e.g. 50000"
                  value={formData.mileage}
                  onChange={(e) => handleChange('mileage', e.target.value)}
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
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Gauge className="w-4 h-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Get Price Estimate
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid="reset-button"
              onClick={handleReset}
              disabled={isLoading}
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

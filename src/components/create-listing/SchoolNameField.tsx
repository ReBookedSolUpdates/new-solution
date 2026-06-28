import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SOUTH_AFRICAN_SCHOOLS, validateSchoolName } from '@/constants/schoolNames';

const OTHER_VALUE = '__other__';

interface Props {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  labelSize?: string;
}

export const SchoolNameField: React.FC<Props> = ({
  value, onChange, error, required = true, labelSize = 'text-base',
}) => {
  const isKnown = useMemo(
    () => !value || SOUTH_AFRICAN_SCHOOLS.includes(value),
    [value],
  );
  const [mode, setMode] = useState<'select' | 'custom'>(isKnown ? 'select' : 'custom');
  const [custom, setCustom] = useState<string>(isKnown ? '' : value);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (mode === 'custom') {
      onChange(custom);
    }
  }, [custom, mode]);

  const customError = mode === 'custom' && (touched || error)
    ? validateSchoolName(custom)
    : null;

  return (
    <div>
      <Label className={`${labelSize} font-medium`}>
        School Name {required && <span className="text-red-500">*</span>}
      </Label>
      <Select
        value={mode === 'custom' ? OTHER_VALUE : (value || '')}
        onValueChange={(v) => {
          if (v === OTHER_VALUE) {
            setMode('custom');
            onChange(custom);
          } else {
            setMode('select');
            onChange(v);
          }
        }}
      >
        <SelectTrigger className={error ? 'border-red-500' : ''}>
          <SelectValue placeholder="Select your school" />
        </SelectTrigger>
        <SelectContent>
          {SOUTH_AFRICAN_SCHOOLS.filter((s) => s !== 'Other / Not Listed').map((school) => (
            <SelectItem key={school} value={school}>{school}</SelectItem>
          ))}
          <SelectItem value={OTHER_VALUE}>Other — type school name…</SelectItem>
        </SelectContent>
      </Select>

      {mode === 'custom' && (
        <div className="mt-2">
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="e.g. Bryanston High School"
            className={customError ? 'border-red-500' : ''}
          />
          {customError && (
            <p className="text-sm text-red-500 mt-1">{customError}</p>
          )}
          {!customError && (
            <p className="text-xs text-gray-500 mt-1">
              Include words like "High School", "Academy", "Hoërskool", etc.
            </p>
          )}
        </div>
      )}

      {error && !customError && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};
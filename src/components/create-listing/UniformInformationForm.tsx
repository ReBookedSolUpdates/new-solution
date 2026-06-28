import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { UniformFormData } from '@/types/listing';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProvinceSelect } from './ProvinceSelect';
import { SchoolNameField } from './SchoolNameField';

interface UniformInformationFormProps {
  formData: UniformFormData;
  errors: Record<string, string>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSelectChange: (name: string, value: string) => void;
}

const UNIFORM_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '6', '7', '8', '9', '10', '11', '12', '13', '14', 'Other'];
const GRADES = ['N/A', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const CONDITIONS = ['New', 'Good', 'Better', 'Average', 'Below Average'];

export const UniformInformationForm = ({
  formData, errors, onInputChange, onSelectChange,
}: UniformInformationFormProps) => {
  const isMobile = useIsMobile();
  const inputSize = isMobile ? 'h-12 text-base' : '';
  const labelSize = isMobile ? 'text-sm' : 'text-base';

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <Label htmlFor="u-title" className={`${labelSize} font-medium`}>
          Item Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="u-title"
          name="title"
          value={formData.title}
          onChange={onInputChange}
          placeholder="e.g. Grey Boys Shorts, White School Shirt"
          className={`${errors.title ? 'border-red-500' : ''} ${inputSize}`}
          style={{ fontSize: isMobile ? '16px' : undefined }}
        />
        {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="u-description" className={`${labelSize} font-medium`}>
          Description <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="u-description"
          name="description"
          value={formData.description}
          onChange={onInputChange}
          placeholder="Describe the item's condition, any wear, sizing notes, etc."
          rows={isMobile ? 3 : 4}
          className={`${errors.description ? 'border-red-500' : ''} ${isMobile ? 'text-base' : ''}`}
          style={{ fontSize: isMobile ? '16px' : undefined }}
        />
        {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
      </div>

      {/* School Name (required) */}
      <SchoolNameField
        value={formData.schoolName || ''}
        onChange={(v) => onSelectChange('schoolName', v)}
        error={errors.schoolName}
        labelSize={labelSize}
      />

      {/* Gender */}
      <div>
        <Label className={`${labelSize} font-medium`}>
          Gender <span className="text-gray-400">(Optional)</span>
        </Label>
        <Select value={formData.gender || ''} onValueChange={(v) => onSelectChange('gender', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            {['Male', 'Female', 'Unisex'].map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Size */}
      <div>
        <Label className={`${labelSize} font-medium`}>
          Size <span className="text-gray-400">(Optional)</span>
        </Label>
        <Select value={formData.size || ''} onValueChange={(v) => onSelectChange('size', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            {UNIFORM_SIZES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Color */}
      <div>
        <Label htmlFor="u-color" className={`${labelSize} font-medium`}>
          Color <span className="text-gray-400">(Optional)</span>
        </Label>
        <Input
          id="u-color"
          name="color"
          value={formData.color || ''}
          onChange={onInputChange}
          placeholder="e.g. White, Navy Blue, Grey"
          className={inputSize}
          style={{ fontSize: isMobile ? '16px' : undefined }}
        />
      </div>

      {/* Grade */}
      <div>
        <Label className={`${labelSize} font-medium`}>
          Grade <span className="text-gray-400">(Optional)</span>
        </Label>
        <Select value={formData.grade || ''} onValueChange={(v) => onSelectChange('grade', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select grade (if applicable)" />
          </SelectTrigger>
          <SelectContent>
            {GRADES.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Condition */}
      <div>
        <Label className={`${labelSize} font-medium`}>
          Condition <span className="text-red-500">*</span>
        </Label>
        <Select value={formData.condition} onValueChange={(v) => onSelectChange('condition', v)}>
          <SelectTrigger className={errors.condition ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select condition" />
          </SelectTrigger>
          <SelectContent>
            {CONDITIONS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.condition && <p className="text-sm text-red-500 mt-1">{errors.condition}</p>}
      </div>

      {/* Province */}
      <ProvinceSelect
        value={formData.province || ''}
        onChange={(v) => onSelectChange('province', v)}
        error={errors.province}
      />
    </div>
  );
};

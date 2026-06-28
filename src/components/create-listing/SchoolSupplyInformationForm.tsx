import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SchoolSupplyFormData } from '@/types/listing';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProvinceSelect } from './ProvinceSelect';
import { SchoolNameField } from './SchoolNameField';

interface SchoolSupplyInformationFormProps {
  formData: SchoolSupplyFormData;
  errors: Record<string, string>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSelectChange: (name: string, value: string) => void;
}

const GRADES = ['N/A', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const CONDITIONS = ['New', 'Good', 'Better', 'Average', 'Below Average'];
const SUBJECTS = [
  'Accounting', 'Agricultural Sciences', 'Art', 'Biology', 'Business Studies',
  'Chemistry', 'Computer Applications Technology (CAT)', 'Consumer Studies',
  'Design', 'Dramatic Arts', 'Economics', 'Engineering Graphics & Design (EGD)',
  'English', 'French', 'Geography', 'History', 'Hospitality Studies',
  'Information Technology (IT)', 'Life Orientation', 'Life Sciences',
  'Mathematics', 'Mathematical Literacy', 'Music', 'Physical Sciences',
  'Religion Studies', 'Technical Mathematics', 'Technical Sciences',
  'Tourism', 'Zulu', 'Afrikaans', 'Xhosa', 'Setswana', 'Sesotho',
  'General / Multi-Subject', 'Other',
].sort();

export const SchoolSupplyInformationForm = ({
  formData, errors, onInputChange, onSelectChange,
}: SchoolSupplyInformationFormProps) => {
  const isMobile = useIsMobile();
  const inputSize = isMobile ? 'h-12 text-base' : '';
  const labelSize = isMobile ? 'text-sm' : 'text-base';

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <Label htmlFor="s-title" className={`${labelSize} font-medium`}>
          Item Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="s-title"
          name="title"
          value={formData.title}
          onChange={onInputChange}
          placeholder="e.g. Casio FX-991 Calculator, Cricket Bat, EGD Drawing Board"
          className={`${errors.title ? 'border-red-500' : ''} ${inputSize}`}
          style={{ fontSize: isMobile ? '16px' : undefined }}
        />
        {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="s-description" className={`${labelSize} font-medium`}>
          Description <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="s-description"
          name="description"
          value={formData.description}
          onChange={onInputChange}
          placeholder="Describe the item — what it is, its condition, any accessories included, etc."
          rows={isMobile ? 3 : 4}
          className={`${errors.description ? 'border-red-500' : ''} ${isMobile ? 'text-base' : ''}`}
          style={{ fontSize: isMobile ? '16px' : undefined }}
        />
        {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
      </div>

      {/* Subject */}
      <div>
        <Label className={`${labelSize} font-medium`}>
          Subject <span className="text-gray-400">(Optional)</span>
        </Label>
        <Select value={formData.subject || ''} onValueChange={(v) => onSelectChange('subject', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select subject (if applicable)" />
          </SelectTrigger>
          <SelectContent>
            {SUBJECTS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {/* School Name (required) */}
      <SchoolNameField
        value={formData.schoolName || ''}
        onChange={(v) => onSelectChange('schoolName', v)}
        error={errors.schoolName}
        labelSize={labelSize}
      />

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

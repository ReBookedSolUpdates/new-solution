// Phone validation utilities for South African numbers
export const validateSAPhoneNumber = (phone: string): boolean => {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // SA numbers: +27XXXXXXXXX or 0XXXXXXXXX
  return /^(\+27|0)\d{9}$/.test(cleaned);
};

export const normalizeZAPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('0')) {
    return '+27' + cleaned.slice(1);
  }
  if (cleaned.startsWith('27') && !cleaned.startsWith('+27')) {
    return '+' + cleaned;
  }
  return cleaned;
};

export const getShippingLabel = async (orderId: string) => {
  console.warn("getShippingLabel is not yet implemented", orderId);
  return null;
};

export const calculateShippingCost = (weight: number, distance: number) => {
  return weight * 0.5 + distance * 0.1;
};

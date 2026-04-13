// Stub module for shipping utilities
export const getShippingLabel = async (orderId: string) => {
  console.warn("getShippingLabel is not yet implemented", orderId);
  return null;
};

export const calculateShippingCost = (weight: number, distance: number) => {
  return weight * 0.5 + distance * 0.1;
};

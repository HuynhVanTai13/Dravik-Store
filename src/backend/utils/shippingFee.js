// src/backend/utils/shippingFee.js

export function calculateShippingFee(addressString) {
  if (!addressString) return 30000;

  const address = addressString.toLowerCase();

  if (address.includes("hồ chí minh") || address.includes("tphcm") || address.includes("hcm")) {
    return 10000;
  }

  if (address.includes("hà nội")) {
    return 20000;
  }

  return 30000; // các tỉnh còn lại
}

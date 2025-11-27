export const PRIMARY_COLOR = '#3194A0';

export const CURRENCIES = [
  { label: "Indian Rupee (INR)", value: "INR" },
  { label: "US Dollar (USD)", value: "USD" },
  { label: "Euro (EUR)", value: "EUR" },
  { label: "British Pound (GBP)", value: "GBP" },
  { label: "Singapore Dollar (SGD)", value: "SGD" },
  { label: "Australian Dollar (AUD)", value: "AUD" },
  { label: "Canadian Dollar (CAD)", value: "CAD" },
];

export const STATES = [
  "Maharashtra", "Karnataka", "Delhi", "Tamil Nadu", "Telangana", "Gujarat", "West Bengal", "Rajasthan", "Kerala"
];

// Initial empty states for reducers or loading
export const INITIAL_CLIENT_STATE = { 
  name: '', 
  gstin: '', 
  address: '', 
  city: '', 
  state: 'Maharashtra', 
  country: 'India',
  contacts: [{ name: '', email: '', phone: '' }]
};
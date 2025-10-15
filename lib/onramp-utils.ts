/**
 * Onramp utility functions and constants
 */

// Currency symbols for common currencies
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  KRW: "₩",
  INR: "₹",
  RUB: "₽",
  BRL: "R$",
  CAD: "C$",
  AUD: "A$",
  CHF: "CHF",
  HKD: "HK$",
  SGD: "S$",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  PLN: "zł",
  ZAR: "R",
  MXN: "Mex$",
  AED: "د.إ",
  THB: "฿",
  TRY: "₺",
};

// Payment method descriptions
export const PAYMENT_METHOD_DESCRIPTIONS: Record<string, string> = {
  CARD: "Debit or Credit Card (Available in most countries)",
  ACH_BANK_ACCOUNT: "Bank Transfer (ACH) - US only",
  APPLE_PAY: "Apple Pay - Available on iOS devices",
  GOOGLE_PAY: "Google Pay - Available on Android devices",
  SEPA: "SEPA Bank Transfer - Europe only",
  card: "Debit or Credit Card (Available in most countries)",
  ach: "Bank Transfer (ACH) - US only",
  apple_pay: "Apple Pay - Available on iOS devices",
  google_pay: "Google Pay - Available on Android devices",
  sepa: "SEPA Bank Transfer - Europe only",
};

// Asset-network compatibility mapping
export const ASSET_NETWORK_MAP: Record<string, string[]> = {
  ETH: ["ethereum", "base", "optimism", "arbitrum", "polygon"],
  USDC: [
    "ethereum",
    "base",
    "optimism",
    "arbitrum",
    "polygon",
    "solana",
    "avalanche-c-chain",
    "unichain",
    "aptos",
    "bnb-chain",
  ],
  BTC: ["bitcoin", "bitcoin-lightning"],
  SOL: ["solana"],
  MATIC: ["polygon", "ethereum"],
  AVAX: ["avalanche-c-chain"],
  USDT: [
    "ethereum",
    "base",
    "optimism",
    "arbitrum",
    "polygon",
    "solana",
    "tron",
  ],
  DAI: ["ethereum", "base", "optimism", "arbitrum", "polygon"],
  WETH: ["ethereum", "base", "optimism", "arbitrum", "polygon"],
  WBTC: ["ethereum", "base", "optimism", "arbitrum", "polygon"],
};

// Supported networks
export const NETWORKS = [
  { id: "ethereum", name: "Ethereum" },
  { id: "base", name: "Base" },
  { id: "optimism", name: "Optimism" },
  { id: "polygon", name: "Polygon" },
  { id: "arbitrum", name: "Arbitrum" },
  { id: "avalanche-c-chain", name: "Avalanche" },
  { id: "solana", name: "Solana" },
  { id: "bitcoin", name: "Bitcoin" },
  { id: "bitcoin-lightning", name: "Bitcoin Lightning" },
  { id: "unichain", name: "Unichain" },
  { id: "aptos", name: "Aptos" },
  { id: "bnb-chain", name: "BNB Chain" },
  { id: "tron", name: "TRON" },
];

// Supported payment currencies
export const PAYMENT_CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "PLN", name: "Polish Złoty" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "ZAR", name: "South African Rand" },
  { code: "INR", name: "Indian Rupee" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "ILS", name: "Israeli New Shekel" },
  { code: "AED", name: "UAE Dirham" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "KRW", name: "South Korean Won" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "THB", name: "Thai Baht" },
].sort((a, b) => a.name.localeCompare(b.name));

// Supported payment methods
export const PAYMENT_METHODS = [
  {
    id: "CARD",
    name: "Debit Card",
    description: "Available in 90+ countries",
  },
  {
    id: "ACH_BANK_ACCOUNT",
    name: "Bank Transfer (ACH)",
    description: "US only",
  },
  { id: "APPLE_PAY", name: "Apple Pay", description: "US only" },
  { id: "GOOGLE_PAY", name: "Google Pay", description: "Available on Android" },
  { id: "SEPA", name: "SEPA Bank Transfer", description: "Europe only" },
];

// Country names mapping
export const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  ES: "Spain",
  IT: "Italy",
  NL: "Netherlands",
  BE: "Belgium",
  AU: "Australia",
  JP: "Japan",
  KR: "South Korea",
  SG: "Singapore",
  HK: "Hong Kong",
  CH: "Switzerland",
  AT: "Austria",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  IE: "Ireland",
  PT: "Portugal",
  PL: "Poland",
  CZ: "Czech Republic",
  HU: "Hungary",
  GR: "Greece",
  TR: "Turkey",
  IL: "Israel",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  IN: "India",
  TH: "Thailand",
  MY: "Malaysia",
  PH: "Philippines",
  ID: "Indonesia",
  VN: "Vietnam",
  TW: "Taiwan",
  BR: "Brazil",
  MX: "Mexico",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  PE: "Peru",
  ZA: "South Africa",
  NZ: "New Zealand",
};

// Create country list for dropdowns
export const COUNTRY_LIST = Object.entries(COUNTRY_NAMES)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

// US States
export const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" },
];

/**
 * Helper function to get currency symbol
 */
export const getCurrencySymbol = (currencyCode: string): string => {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
};

/**
 * Get default network for an asset
 */
export const getDefaultNetworkForAsset = (asset: string): string => {
  if (!ASSET_NETWORK_MAP[asset] || ASSET_NETWORK_MAP[asset].length === 0) {
    return "ethereum"; // Default fallback
  }
  return ASSET_NETWORK_MAP[asset][0]; // Return first compatible network
};

/**
 * Check if asset is compatible with network
 */
export const isAssetCompatibleWithNetwork = (
  asset: string,
  network: string
): boolean => {
  return ASSET_NETWORK_MAP[asset]?.includes(network) || false;
};

/**
 * Get compatible networks for an asset
 */
export const getCompatibleNetworksForAsset = (asset: string): string[] => {
  return ASSET_NETWORK_MAP[asset] || [];
};

/**
 * Generate onramp URL parameters
 */
export interface OnrampURLParams {
  appId?: string; // Project ID
  addresses: Array<{ address: string; blockchains: string[] }>;
  defaultAsset: string;
  defaultPaymentMethod: string;
  presetFiatAmount?: string;
  fiatCurrency?: string;
  presetCryptoAmount?: string;
  defaultNetwork?: string;
  quoteId?: string;
  redirectUrl?: string;
  enableGuestCheckout?: boolean;
  sessionToken?: string;
  country?: string;
  state?: string;
}

/**
 * Generate onramp URL
 */
export const generateOnrampURL = (params: OnrampURLParams): string => {
  const baseUrl = "https://pay.coinbase.com/buy/select-asset";
  const urlParams = new URLSearchParams();

  // Required parameters
  if (params.appId) urlParams.append("appId", params.appId);
  urlParams.append("addresses", JSON.stringify(params.addresses));
  urlParams.append("defaultAsset", params.defaultAsset);
  urlParams.append("defaultPaymentMethod", params.defaultPaymentMethod);

  // Amount logic
  if (
    params.defaultPaymentMethod === "CRYPTO_ACCOUNT" &&
    params.presetCryptoAmount
  ) {
    urlParams.append("presetCryptoAmount", params.presetCryptoAmount);
  } else if (params.presetFiatAmount && params.fiatCurrency) {
    urlParams.append("presetFiatAmount", params.presetFiatAmount);
    urlParams.append("fiatCurrency", params.fiatCurrency);
  }

  // Optional parameters
  if (params.defaultNetwork)
    urlParams.append("defaultNetwork", params.defaultNetwork);
  if (params.quoteId) urlParams.append("quoteId", params.quoteId);
  if (params.redirectUrl) urlParams.append("redirectUrl", params.redirectUrl);
  if (params.enableGuestCheckout !== undefined) {
    urlParams.append(
      "enableGuestCheckout",
      params.enableGuestCheckout.toString()
    );
  }
  if (params.sessionToken)
    urlParams.append("sessionToken", params.sessionToken);
  if (params.country) urlParams.append("country", params.country);
  if (params.state) urlParams.append("state", params.state);

  return `${baseUrl}?${urlParams.toString()}`;
};

/**
 * Fetch cryptocurrency prices (mock implementation)
 * In a real implementation, this would call a price API
 */
export const fetchCryptoPrices = async (): Promise<Record<string, number>> => {
  // Mock prices - in production, replace with actual API calls
  return {
    ETH: 3500,
    USDC: 1,
    BTC: 67000,
    SOL: 140,
    MATIC: 0.8,
    AVAX: 35,
    USDT: 1,
    DAI: 1,
    WETH: 3500,
    WBTC: 67000,
    UNI: 8,
    LINK: 15,
    AAVE: 90,
    ATOM: 8,
    DOGE: 0.1,
    SHIB: 0.00002,
    XRP: 0.5,
    LTC: 80,
    BCH: 300,
    APE: 1.5,
    XLM: 0.1,
    FIL: 5,
    NEAR: 5,
    ALGO: 0.15,
    MANA: 0.4,
    SAND: 0.4,
    TRX: 0.1,
  };
};

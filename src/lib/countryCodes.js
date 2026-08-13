// Country codes with the correct national phone number length (digits after
// the country code, not counting it). Used to validate phone input and to
// show the right placeholder/maxlength per country.
//
// Note: these are the standard mobile number lengths for each country.
// BD numbers are 10 digits after +880 (e.g. 1XXXXXXXXX).
// IN numbers are 10 digits after +91 (e.g. 9XXXXXXXXX).
export const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", name: "India", digits: 10, example: "9XXXXXXXXX" },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh", digits: 10, example: "1XXXXXXXXX" },
  { code: "+1", flag: "🇺🇸", name: "USA/Canada", digits: 10, example: "2015550123" },
  { code: "+44", flag: "🇬🇧", name: "UK", digits: 10, example: "7400123456" },
  { code: "+971", flag: "🇦🇪", name: "UAE", digits: 9, example: "501234567" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia", digits: 9, example: "512345678" },
  { code: "+60", flag: "🇲🇾", name: "Malaysia", digits: 9, example: "123456789" },
  { code: "+65", flag: "🇸🇬", name: "Singapore", digits: 8, example: "81234567" },
  { code: "+61", flag: "🇦🇺", name: "Australia", digits: 9, example: "412345678" },
  { code: "+92", flag: "🇵🇰", name: "Pakistan", digits: 10, example: "3001234567" },
];

export function getCountryConfig(code) {
  return COUNTRY_CODES.find((c) => c.code === code) || COUNTRY_CODES[0];
}

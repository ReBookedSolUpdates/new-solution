// Curated list of South African schools. Not exhaustive — users can also type a
// custom school name (validated via validateSchoolName).
const RAW_SCHOOLS: string[] = [
  // Western Cape — Cape Town & surrounds
  'Bishops (Diocesan College)', "Rondebosch Boys' High School",
  "Wynberg Boys' High School", "Wynberg Girls' High School",
  'South African College Schools (SACS)', 'Groote Schuur High School',
  'Westerford High School', 'Constantia High School',
  "Herschel Girls' School", "Rustenburg Girls' High School",
  'Springfield Convent School', "St Cyprian's School",
  'Reddam House Constantia', 'Reddam House Atlantic Seaboard',
  'Reddam House Tokai', 'Camps Bay High School', 'Sea Point High School',
  'Pinelands High School', 'Cape Town High School', 'Fairmont High School',
  'Hoërskool Stellenberg', 'Hoërskool Bellville', 'Hoërskool D.F. Malan',
  'Hoërskool Tygerberg', 'Hoërskool Jan van Riebeeck',
  'Hoërskool Strand', 'Hoërskool Hottentots-Holland',
  'Paul Roos Gimnasium', 'Bloemhof Girls High School', 'Rhenish Girls High School',
  'Paarl Boys High School', 'Paarl Girls High School', 'Paarl Gimnasium',
  'Hoërskool Boland Landbou', 'Worcester Gimnasium',
  'Outeniqua High School', 'York High School (George)',
  // Gauteng — Johannesburg
  "St John's College (Johannesburg)", 'King Edward VII School',
  'St Stithians College', 'Bryanston High School', 'Randpark High School',
  'Northcliff High School', 'Parktown Boys High School',
  'Parktown Girls High School', 'Jeppe High School for Boys',
  'Jeppe High School for Girls', 'Roedean School (SA)',
  "St Mary's School Waverley", 'Crawford College Sandton',
  'Crawford College Lonehill', 'Crawford College North Coast',
  'Reddam House Bedfordview', 'Reddam House Waterfall',
  'Hyde Park High School', 'Sandown High School',
  'Sandringham High School', 'Greenside High School',
  'Linden High School', 'Pinnacle College Kyalami',
  'St Peter\'s College', 'St David\'s Marist Inanda',
  'Redhill School', 'St Andrew\'s School for Girls',
  'Hoërskool Florida', 'Hoërskool Randburg', 'Hoërskool Linden',
  // Gauteng — Pretoria
  'Pretoria Boys High School', 'Pretoria High School for Girls',
  'Waterkloof High School', 'Hoërskool Waterkloof',
  'Afrikaans Hoër Seunskool (Affies)', 'Afrikaanse Hoër Meisieskool',
  'Menlopark High School', 'Hoërskool Menlopark',
  'Hoërskool Garsfontein', 'Hoërskool Eldoraigne', 'Hoërskool Centurion',
  'Hoërskool Zwartkop', 'Hoërskool Wonderboom',
  'Cornwall Hill College', 'Southdowns College',
  // KwaZulu-Natal
  'Kearsney College', 'Michaelhouse', 'Hilton College',
  "St Mary's Diocesan School for Girls", 'Clifton College',
  'Durban High School', 'Durban Girls High School',
  'Westville Boys High School', 'Westville Girls High School',
  'Northwood School', 'Glenwood High School', 'Glenwood Boys High School',
  'Maritzburg College', 'Pietermaritzburg Girls High School',
  'Voortrekker High School', 'Hoërskool Pietermaritzburg',
  'Crawford College La Lucia', 'Reddam House Umhlanga',
  // Eastern Cape
  'Grey High School', 'Pearson High School', 'Victoria Park High School',
  'St Andrew\'s College (Grahamstown)', 'Kingswood College',
  'Diocesan School for Girls (DSG)', 'Collegiate Girls High School',
  'Alexander Road High School', 'Woodridge College',
  'Selborne College', 'Hudson Park High School', 'Stirling High School',
  'Clarendon High School for Girls', 'Queen\'s College Boys High',
  'Queenstown Girls High School', 'Dale College',
  // Free State
  'Grey College (Bloemfontein)', 'St Andrew\'s School (Bloemfontein)',
  'Eunice High School', 'Sentraal Hoërskool',
  'Hoërskool Jim Fouché', 'Hoërskool Sand du Plessis',
  // Mpumalanga
  'Hoërskool Bergvlam', 'Hoërskool Nelspruit', 'Penryn College',
  'Uplands College', 'Hoërskool Lydenburg',
  // Limpopo
  'Hoërskool Pietersburg', 'Hoërskool Frans du Toit',
  'Capricorn High School', 'Mitchell House',
  // North West
  'Hoërskool Rustenburg', 'Hoërskool Klerksdorp',
  'Hoërskool Potchefstroom Gimnasium', 'Hoërskool Wesvalia',
  // Northern Cape
  'Diamantveld Hoërskool', 'Kimberley Boys High School',
  'Kimberley Girls High School',
  // Catch-all
  'Other / Not Listed',
];

export const SOUTH_AFRICAN_SCHOOLS: string[] = Array.from(new Set(RAW_SCHOOLS)).sort();

const SCHOOL_KEYWORDS = [
  'school', 'academy', 'college', 'high', 'primary', 'secondary',
  'prep', 'preparatory', 'gymnasium', 'gimnasium',
  'hoërskool', 'hoerskool', 'laerskool', 'skool',
  'institute', 'kollege',
];

/**
 * Validate a custom (typed) school name. Returns null if valid, error string otherwise.
 */
export function validateSchoolName(value: string): string | null {
  const v = (value || '').trim();
  if (v.length < 6) return 'School name is too short — please enter the full name';
  // Must contain a known school keyword
  const lower = v.toLowerCase();
  if (!SCHOOL_KEYWORDS.some((k) => lower.includes(k))) {
    return 'Please include the full school name (e.g. "High School", "Academy", "Hoërskool")';
  }
  // Block obvious nonsense — must have at least two word tokens
  const tokens = v.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return 'Please enter the full school name';
  return null;
}

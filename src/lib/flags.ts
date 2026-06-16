// Maps FIFA's 3-letter team codes (used by football-data.org) to ISO-3166
// alpha-2 codes (used by flagcdn.com and most flag image services).
// Covers all 2026 World Cup confederations/qualifiers + common historical teams.

export const FIFA_TO_ISO: Record<string, string> = {
  // CONCACAF (hosts + region)
  USA: "us", CAN: "ca", MEX: "mx", CRC: "cr", PAN: "pa", JAM: "jm",
  HON: "hn", CUW: "cw", GLP: "gp", SLV: "sv", GUA: "gt", TRI: "tt",
  HAI: "ht",

  // CONMEBOL
  BRA: "br", ARG: "ar", URU: "uy", COL: "co", ECU: "ec", PAR: "py",
  PER: "pe", CHI: "cl", VEN: "ve", BOL: "bo",

  // UEFA
  ENG: "gb-eng", FRA: "fr", ESP: "es", GER: "de", ITA: "it", POR: "pt",
  NED: "nl", BEL: "be", CRO: "hr", SUI: "ch", DEN: "dk", POL: "pl",
  SRB: "rs", WAL: "gb-wls", SCO: "gb-sct", AUT: "at", UKR: "ua",
  SWE: "se", NOR: "no", IRL: "ie", NIR: "gb-nir", TUR: "tr", GRE: "gr",
  HUN: "hu", CZE: "cz", SVK: "sk", SVN: "si", ROU: "ro", BIH: "ba",
  ALB: "al", ISL: "is", RUS: "ru", FIN: "fi", ISR: "il", GEO: "ge",
  KOS: "xk", LUX: "lu", MNE: "me", MKD: "mk", BUL: "bg", CYP: "cy",
  EST: "ee", LVA: "lv", LTU: "lt", MLT: "mt", AND: "ad", FRO: "fo",
  GIB: "gi", LIE: "li", SMR: "sm", MDA: "md", ARM: "am", AZE: "az",
  BLR: "by", KAZ: "kz",

  // CAF (Africa)
  RSA: "za", NGA: "ng", EGY: "eg", MAR: "ma", SEN: "sn", TUN: "tn",
  ALG: "dz", CMR: "cm", GHA: "gh", CIV: "ci", MLI: "ml", COD: "cd",
  ZAM: "zm", UGA: "ug", BFA: "bf", CPV: "cv", GAB: "ga", GNB: "gw",
  RWA: "rw", BEN: "bj", MOZ: "mz", NAM: "na", ZIM: "zw", KEN: "ke",
  ETH: "et", GUI: "gn", ANG: "ao", COG: "cg", GAM: "gm", TAN: "tz",
  LBY: "ly", SUD: "sd", MTN: "mr", CHA: "td", NER: "ne", TOG: "tg",
  EQG: "gq", BDI: "bi", LBR: "lr", SLE: "sl", SOM: "so", DJI: "dj",
  COM: "km", SEY: "sc", MAD: "mg", MWI: "mw", BOT: "bw", LES: "ls",
  SWZ: "sz", ERI: "er", SSD: "ss", STP: "st",

  // AFC (Asia)
  JPN: "jp", KOR: "kr", AUS: "au", IRN: "ir", KSA: "sa", QAT: "qa",
  UAE: "ae", IRQ: "iq", CHN: "cn", UZB: "uz", JOR: "jo", OMA: "om",
  SYR: "sy", BHR: "bh", KUW: "kw", VIE: "vn", THA: "th", IND: "in",
  IDN: "id", PHI: "ph", MAS: "my", SGP: "sg", PRK: "kp", HKG: "hk",
  TPE: "tw", KGZ: "kg", TJK: "tj", TKM: "tm", AFG: "af", PAK: "pk",
  BAN: "bd", NEP: "np", LBN: "lb", PLE: "ps", YEM: "ye", MDV: "mv",
  MYA: "mm", LAO: "la", CAM: "kh", BRU: "bn", TLS: "tl", MNG: "mn",
  GUM: "gu", MAC: "mo",

  // OFC (Oceania)
  NZL: "nz", FIJ: "fj", PNG: "pg", SOL: "sb", VAN: "vu", NCL: "nc",
  TAH: "pf", SAM: "ws", TGA: "to", COK: "ck", ASA: "as", VIR: "vi",
}

/** Get the ISO alpha-2 code for a FIFA team code, or null if unknown. */
export function fifaToIso(fifaCode: string): string | null {
  return FIFA_TO_ISO[fifaCode.toUpperCase()] ?? null
}

/** Build a flagcdn.com URL for a given FIFA code at a given pixel width. */
export function flagUrl(fifaCode: string, width: 80 | 160 | 320 = 320): string | null {
  const iso = fifaToIso(fifaCode)
  if (!iso) return null
  return `https://flagcdn.com/w${width}/${iso}.png`
}

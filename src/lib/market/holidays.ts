/**
 * US stock market (NYSE/Nasdaq) holidays and early closes.
 * Source: NYSE published holiday calendar. Update once a year.
 */
export const US_MARKET_HOLIDAYS: Record<string, string> = {
  "2026-01-01": "New Year's Day",
  "2026-01-19": "Martin Luther King Jr. Day",
  "2026-02-16": "Presidents' Day",
  "2026-04-03": "Good Friday",
  "2026-05-25": "Memorial Day",
  "2026-06-19": "Juneteenth",
  "2026-07-03": "Independence Day (observed)",
  "2026-09-07": "Labor Day",
  "2026-11-26": "Thanksgiving",
  "2026-12-25": "Christmas Day",
  "2027-01-01": "New Year's Day",
  "2027-01-18": "Martin Luther King Jr. Day",
  "2027-02-15": "Presidents' Day",
  "2027-03-26": "Good Friday",
  "2027-05-31": "Memorial Day",
  "2027-06-18": "Juneteenth (observed)",
  "2027-07-05": "Independence Day (observed)",
  "2027-09-06": "Labor Day",
  "2027-11-25": "Thanksgiving",
  "2027-12-24": "Christmas Day (observed)",
};

/** Days the US market closes early, at 1pm New York time. */
export const US_EARLY_CLOSES: Record<string, string> = {
  "2026-11-27": "Day after Thanksgiving",
  "2026-12-24": "Christmas Eve",
  "2027-11-26": "Day after Thanksgiving",
};

export function isMarketHoliday(day: string) {
  return day in US_MARKET_HOLIDAYS;
}

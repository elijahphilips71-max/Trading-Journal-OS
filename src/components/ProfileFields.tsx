import type { Profile } from "@/lib/types";

/** First name, starting balance, start date and risk %. Used by onboarding and settings. */
export function ProfileFields({ profile }: { profile: Profile }) {
  return (
    <>
      <div className="field text">
        <label htmlFor="display_name">First name</label>
        <input id="display_name" name="display_name" autoComplete="given-name" defaultValue={profile.display_name ?? ""} required />
      </div>
      <div className="field">
        <label htmlFor="starting_balance">Starting balance (£, pretend money)</label>
        <input id="starting_balance" name="starting_balance" inputMode="decimal" defaultValue={profile.starting_balance} required />
      </div>
      <div className="field">
        <label htmlFor="start_date">Start date (day 1 of your 3 months)</label>
        <input id="start_date" name="start_date" type="date" defaultValue={profile.start_date} required />
      </div>
      <div className="field">
        <label htmlFor="risk_pct">Risk per trade (%)</label>
        <input id="risk_pct" name="risk_pct" inputMode="decimal" defaultValue={profile.risk_pct} required />
        <span className="muted text-xs" style={{ lineHeight: 1.4 }}>
          The most you&apos;re willing to lose on one trade, as a share of your account. 1% of £500 is £5.
        </span>
      </div>
    </>
  );
}

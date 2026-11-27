# OS Journal — build plan (one PR each)

Each step should end with something Elijah can click and try. Do them in order.

1. **Scaffold.** Set up the repo, stack, design tokens, fonts, logo and app icons, a mobile tab bar and desktop sidebar with empty screens, and `.env.example`. Add CI that runs lint, typecheck and tests.
2. **Login and sync (Supabase).** Connect the Supabase project and build the login screen from `design/Login.dc.html`: email + password, a magic link, forgot/reset password, email confirmation, protected routes with middleware redirect, log out, and first-login onboarding. Add a profile with starting balance (£500), start date and risk settings, the database schema from SPEC §6 with row-level security, and seed data containing the starter rules plus one starter setup.
3. **Trading maths.** Write a pure module covering position size, R, P&L, balance and the 4 targets, with full unit tests.
4. **Quick add and trades.** Build the Quick add form with live auto-calc, the trades list with filters, trade detail, closing a trade, and edit and delete.
5. **Home and goal progress.** Build the "Road to a real account" card, the balance, open and recent trades, and the 30-trade bar.
6. **Screenshots.** Add upload and paste (Ctrl+V) on trades, with storage and display on trade detail.
7. **AI coach v1.** Add a review on close (grade, what went well, fix next time) and "Ask the coach" chat about a trade.
8. **Screenshot auto-fill.** Use vision extraction to fill the Quick add form, with a confirmation step.
9. **Stats.** Build the tiles, equity curve, calendar, by-setup bars and the AI patterns card.
10. **Playbook.** Build Step 1 Bias (saved daily plan), Step 2 Setup with the annotated example and live results, and editable setups and rules.
11. **Trade today?** Show market hours and holidays in UK time, the day timeline with best windows, the economic calendar, earnings, the verdict, and the 08:00 push notification. This step needs the data provider choice from SPEC §8.
12. **CSV import.** Build the TradingView Paper Trading importer, which needs a real sample export from Elijah, plus fill matching, dedupe, preview and "needs details" flags.
13. **Dad's view.** Build the share settings and the public read-only `/r/<token>` page.
14. **PWA and polish.** Make the app installable, add offline-friendly logging (queue and sync), empty states, and loading and error states.

Before step 2, Elijah creates a free Supabase project and gives you its URL and anon key. He adds the service role key to the hosting environment variables himself, and it never goes in chat or git. Before step 11, ask Elijah to pick a news and earnings data provider and add its key. Before step 12, ask him for a sample CSV.

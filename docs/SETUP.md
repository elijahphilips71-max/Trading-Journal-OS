# Setting up OS Journal (one-off)

You only do this once. It takes about 10 minutes.

## 1. Supabase (login and database)
1. Open your **os-journal** project at supabase.com.
2. Go to **SQL Editor → New query**. Open `supabase/migrations/0001_init.sql` from this repo, copy everything, paste it in and press **Run**. You should see "Success. No rows returned".
   Later steps may add more files to `supabase/migrations/`. Run each new one the same way, in number order.
3. Go to **Authentication → URL Configuration**:
   - **Site URL**: your app's address, e.g. `https://os-journal.vercel.app`
   - **Redirect URLs**: add `https://os-journal.vercel.app/**` and `http://localhost:3000/**`
4. Go to **Project Settings → API** and copy the **Project URL** and the **anon public** key.

## 2. Hosting (Vercel, free)
1. Sign in at vercel.com with GitHub and **Import** the `trading-journal-os` repository.
2. Under **Environment Variables**, add:
   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | the Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon public key |
   | `NEXT_PUBLIC_SITE_URL` | your Vercel address, e.g. `https://os-journal.vercel.app` |
   | `SUPABASE_SERVICE_ROLE_KEY` | the **service_role** key (secret: only ever paste it here) |
   | `ANTHROPIC_API_KEY` | your Claude API key (for the AI coach, from console.anthropic.com) |
3. Press **Deploy**. Every pull request also gets its own preview link, so you can try a change before merging it.

## 3. Running it on your laptop (optional)
```
cp .env.example .env.local   # then fill in the values
npm install
npm run dev
```
Open http://localhost:3000.

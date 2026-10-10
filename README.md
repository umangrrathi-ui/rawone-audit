# RAWONE Free Audit Tool

Business owner Instagram handle + Google Maps link daalta hai → ~30-45 sec mein score, findings, 3 quick wins → screen + WhatsApp. ₹299 pe 36-post deep audit + 30-din plan.

Next.js 15 (App Router, JS) · Supabase · Apify · OpenAI Responses API · WhatsApp Cloud API · Cashfree PG. VPS pe PM2 + Nginx. Deploy ke liye `DEPLOY.md`.

## Folder map

```
app/page.js                  landing + form + progress (components/AuditForm, Progress)
app/r/[id]/page.js           report page (components/Report.jsx)
app/api/audit/route.js       POST: validate → cache/limits → row → pipeline in background
app/api/audit/[id]/route.js  GET: status for progress polling
app/api/whatsapp/route.js    Meta webhook: verify + bot logic (REPORT code / STOP / replies)
app/api/pay/create           Cashfree order → payment_session_id
app/api/pay/webhook          signature verify → paid → deep report
lib/apify.js                 IG + GMB scrape (parallel, 40s timeout, 1 retry)
lib/instagram.js, gmb.js     metrics + rule-based flags
lib/benchmarks.js            ⚠️ industry table — placeholders until researched
lib/score.js                 0-100 score exactly per plan
lib/ai.js                    system prompt + strict JSON schema
lib/pipeline.js              free audit orchestration
lib/deep.js                  ₹299 deep audit (36 posts, 30 reviews, 30-day plan)
lib/whatsapp.js, alert.js    send text/template, 24h window, team alerts (WA + n8n webhook)
lib/cashfree.js              orders + webhook signature
lib/mock.js                  demo report, no keys needed
supabase/schema.sql          tables + leads_export view
```

## Local setup

```bash
npm install
npm run mock        # no keys needed
# open http://localhost:3000/r/00000000-0000-0000-0000-000000000000
# MOCK_PAID=1 npm run mock   → full ₹299 section bhi dikhega
```

Real run:

1. Supabase → SQL editor → `supabase/schema.sql` paste karke run.
2. `cp .env.example .env` → keys bharo (minimum: APIFY_TOKEN, OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
3. Field names confirm karo: `npm run test:scrape -- rawonedesign "https://maps.app.goo.gl/XXXX"`. Koi field mismatch dikhe toh sirf `lib/instagram.js` / `lib/gmb.js` mein mapping badlo.
4. End-to-end: `npm run test:pipeline -- rawonedesign "<maps link>" restaurant` → report URL print hoga.
5. `npm run dev` → form se try karo.

WhatsApp webhook local test: `npx ngrok http 3000` (ya `cloudflared tunnel --url http://localhost:3000`) → wo https URL Meta webhook config mein `/api/whatsapp` ke saath daalo → apne phone se `REPORT <code>` bhejo. `.env` mein `APP_URL` ko bhi tunnel URL kar do.

Cashfree: `CASHFREE_ENV=sandbox` rakho, sandbox keys use karo. Sandbox webhook bhi tunnel URL pe aayega.

## Ab tak kya bacha hai (launch se pehle)

- [ ] **Benchmarks** — `lib/benchmarks.js` mein abhi placeholder numbers hain (report "general SMB benchmark" dikhati hai). Research prompt chalao, har industry ka `er`, `rating`, `reviews`, `source` bharo aur `verified: true` karo.
- [ ] **WhatsApp utility template** `audit_report_ready` approve karwao: `Hi {{1}}, your Instagram and Google audit for {{2}} is ready: {{3}}`. (24 ghante baad wali delivery isi se jaati hai — mainly ₹299 deep report ke liye.)
- [ ] `WA_APP_SECRET` set karo (webhook signature check). Bina iske koi bhi fake message bhej sakta hai.
- [ ] `STRATEGY_CALL_URL` — Calendly/Cal.com link. Khaali raha toh WhatsApp chat khulega.
- [ ] `ALERT_WEBHOOK_URL` — n8n webhook → email/Google Sheet. WhatsApp alert tabhi jaata hai jab alert number ne 24h mein bot ko message kiya ho.

## Launch checklist

- [ ] 20 real handles (5 clinic, 5 restaurant, 5 school, 5 jewellery/retail) — numbers Instagram app se manually match.
- [ ] Edge cases: private account, galat handle, 0 posts, likes hidden, GMB link na diya, GMB search-page link (form reject karega), Maps short link.
- [ ] Timing: 20 reports ka average + slowest. 60s+ ho toh `APIFY_TIMEOUT_SECS` / Apify memory check.
- [ ] Luna vs sol: 5 handles pe `OPENAI_MODEL` badal ke findings side-by-side padho.
- [ ] Load: 20 form submit ek saath (alag numbers/handles).
- [ ] WhatsApp: `REPORT CODE`, galat code, sirf `REPORT`, `STOP`, `START`, report ke baad normal reply, report running ke time `REPORT CODE`.
- [ ] Cashfree sandbox poora flow → live mein `PRICE_INR=1` se real ₹1 test → wapas 299.
- [ ] Phone pe report: Android Chrome + iPhone Safari, light + dark.
- [ ] Apify usage limit $45, OpenAI monthly limit.
- [ ] Supabase → `leads_export` view → Export CSV.

## Ops notes

- Same Instagram handle 24 ghante mein dobara aaye → purani report (Apify bill nahi).
- 1 audit per WhatsApp number per 24h; 8 audits per IP per hour; Nginx pe extra 20 req/min.
- Report page `noindex` hai. URL mein UUID hai, guess nahi ho sakta.
- Team alert types (n8n webhook `kind`): `lead`, `reply`, `paid`, `deep_failed`.

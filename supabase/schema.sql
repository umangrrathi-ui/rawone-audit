-- RAWONE Free Audit Tool — run once in Supabase SQL editor

create table if not exists audits (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,            -- RX7K2P, WhatsApp ke liye
  created_at timestamptz default now(),
  name text, whatsapp text, industry text,
  ig_handle text not null, gmb_url text,
  status text default 'running',        -- running | done | failed
  step text,                            -- progress screen ke liye
  ig_raw jsonb, gmb_raw jsonb,
  metrics jsonb, score int, ai jsonb,
  wa_verified boolean default false,
  paid boolean default false, deep jsonb,
  error text,
  -- extra columns used by the app
  ip text,
  order_id text,                        -- Cashfree order id
  deep_status text,                     -- null | running | done | failed
  deep_error text,
  paid_at timestamptz
);
create index if not exists audits_handle_idx on audits (ig_handle, created_at desc);
create index if not exists audits_whatsapp_idx on audits (whatsapp, created_at desc);
create index if not exists audits_order_idx on audits (order_id);
alter table audits enable row level security;  -- koi public policy nahi, sirf server access

-- WhatsApp contacts: 24h window tracking + opt-out
create table if not exists wa_contacts (
  phone text primary key,               -- digits with country code, e.g. 9198XXXXXXXX
  name text,
  last_inbound_at timestamptz,
  opted_out boolean default false,
  last_audit_id uuid references audits(id) on delete set null,
  report_sent boolean default false,
  last_autoreply_at timestamptz,
  updated_at timestamptz default now()
);
alter table wa_contacts enable row level security;

-- Every inbound WhatsApp message (for the team to read back)
create table if not exists wa_messages (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  phone text, wa_message_id text unique, body text, direction text default 'in'
);
alter table wa_messages enable row level security;

-- Leads export view (Supabase → Table editor → leads_export → Export CSV)
create or replace view leads_export with (security_invoker = true) as
select created_at, name, whatsapp, industry, ig_handle, gmb_url, score,
       wa_verified, paid, paid_at, code,
       'https://audit.rawone.co.in/r/' || id as report_url
from audits
where status = 'done'
order by created_at desc;

-- anon/authenticated ko kuch nahi chahiye: sirf server (service_role) access
revoke all on audits, wa_contacts, wa_messages, leads_export from anon, authenticated;

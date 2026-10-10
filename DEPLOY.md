# Deploy — audit.rawone.co.in (Hostinger VPS, Docker + existing n8n Traefik)

**Actual setup (Oct 2026):** VPS pe n8n ka Traefik (Docker) 80/443 sambhalta hai — network `root_default`, cert resolver `mytlschallenge`. Host Node v18 hai, isliye app Docker container mein chalta hai (reviewflow jaisa). PM2/Nginx wala section neeche sirf reference ke liye hai.

## Fresh install

```bash
# 0. (ek baar) extra swap — build ke time RAM tight hai
fallocate -l 2G /swapfile2 && chmod 600 /swapfile2 && mkswap /swapfile2 && swapon /swapfile2
echo '/swapfile2 none swap sw 0 0' >> /etc/fstab

# 1. code
cd /root && git clone https://github.com/umangrrathi-ui/rawone-audit.git
cd rawone-audit
cp .env.example .env && nano .env && chmod 600 .env

# 2. build + run
docker compose up -d --build
docker logs -f rawone-audit
```

## Update
```bash
cd /root/rawone-audit && git pull && docker compose up -d --build && docker image prune -f
```

## .env change ke baad
```bash
docker compose up -d --force-recreate
```

---

## (Reference) PM2 + Nginx setup — sirf agar kabhi Traefik na ho


App same VPS pe chalega jahan n8n hai. App port **3000** sirf `127.0.0.1` pe sunta hai; Nginx bahar se 80/443 leke andar bhejta hai.

## 0. Pehle check karo (5 min)

```bash
ssh root@<VPS_IP>
sudo ss -tlnp | grep -E ':80|:443|:3000|:5678'
docker ps 2>/dev/null
```

- **3000 already busy?** → `ecosystem.config.cjs` mein `-p 3000` ko `-p 3100` karo aur Nginx conf mein bhi.
- **80/443 pe `docker-proxy` / Traefik / Caddy baitha hai** (n8n ka Hostinger template aksar Traefik use karta hai) → Nginx install mat karo. Neeche "Option B" follow karo.
- **80/443 free hai ya already Nginx hai** → "Option A".

## 1. DNS

Hostinger hPanel → Domains → rawone.co.in → DNS: `A` record, name `audit`, value = VPS IP, TTL 300. Check: `dig +short audit.rawone.co.in`.

## 2. Node 20+ aur PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo npm i -g pm2
node -v   # v22.x
```

## 3. Code

```bash
sudo mkdir -p /var/www && cd /var/www
git clone git@github.com:umangrrathi-ui/rawone-audit.git   # private repo (deploy key ya PAT)
cd rawone-audit
cp .env.example .env && nano .env      # saari keys yahin. Kabhi GitHub pe nahi.
chmod 600 .env
npm ci
npm run build
mkdir -p logs
```

## 4. PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd     # jo command print ho, wo copy-paste karke chalao
pm2 logs rawone-audit --lines 50
curl -I http://127.0.0.1:3000     # 200 aana chahiye
```

## 5A. Nginx + SSL (agar 80/443 free / Nginx already hai)

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo cp deploy/rawone-proxy.conf /etc/nginx/snippets/rawone-proxy.conf
sudo cp deploy/nginx-audit.rawone.co.in.conf /etc/nginx/sites-available/audit.rawone.co.in
sudo ln -s /etc/nginx/sites-available/audit.rawone.co.in /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d audit.rawone.co.in --redirect -m umangrrathi@gmail.com --agree-tos -n
```

## 5B. Agar n8n ka Traefik 80/443 pakad ke baitha hai

Nginx mat lagao. Traefik ko file-provider route do (n8n wale `docker-compose.yml` ke folder mein):

```yaml
# traefik dynamic config, e.g. ./traefik/rawone-audit.yml (Traefik container mein file provider mount hona chahiye)
http:
  routers:
    rawone-audit:
      rule: Host(`audit.rawone.co.in`)
      entryPoints: [websecure]
      service: rawone-audit
      tls: { certResolver: mytlschallenge }   # n8n compose mein jo resolver naam hai wahi
  services:
    rawone-audit:
      loadBalancer:
        servers: [{ url: "http://host.docker.internal:3000" }]
```

Is case mein app ko `127.0.0.1` ki jagah docker bridge pe sunna padega: `ecosystem.config.cjs` mein `-H 127.0.0.1` → `-H 172.17.0.1`, aur Traefik service mein `extra_hosts: ["host.docker.internal:host-gateway"]`. Ye setup thoda tricky hai — `docker ps` ka output Claude ko dikhao, exact config bana dega.

## 6. Firewall

```bash
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw enable && sudo ufw status
```

3000 bahar se band rahega (app waise bhi sirf localhost pe sunta hai). Hostinger panel ka firewall bhi on ho toh wahan bhi same 3 ports.

## 7. Webhooks register karo

- **Meta:** App → WhatsApp → Configuration → Callback URL `https://audit.rawone.co.in/api/whatsapp`, Verify token = `.env` ka `WA_VERIFY_TOKEN` → Verify and save → `messages` field subscribe.
- **Cashfree:** Dashboard → Developers → Webhooks → `https://audit.rawone.co.in/api/pay/webhook` (Payment events). `notify_url` har order ke saath bhi jaata hai, isliye ye optional backup hai.

## 8. Update

```bash
cd /var/www/rawone-audit && git pull && npm ci && npm run build && pm2 reload rawone-audit
```

## Troubleshooting

| Problem | Check |
|---|---|
| 502 Bad Gateway | `pm2 status`, `pm2 logs rawone-audit` |
| Report "failed" | Supabase → audits → `error` aur `ai._error` column |
| WhatsApp reply nahi aata | `pm2 logs` mein `[wa]` lines; Meta webhook "Test" button; `WA_TOKEN` expire to nahi |
| Payment ke baad full report nahi aayi | Supabase `deep_status` / `deep_error`; Cashfree dashboard → webhook logs |

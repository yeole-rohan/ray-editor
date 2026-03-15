#!/usr/bin/env bash
# =============================================================================
# RayEditor VPS Setup Script
# Run once on a fresh Ubuntu 22.04 / 24.04 VPS as root.
# Usage: curl -fsSL https://raw.githubusercontent.com/yeole-rohan/ray-editor/main/scripts/vps-setup.sh | bash
# =============================================================================

set -euo pipefail

DOMAIN="ray-editor.rohanyeole.com"
WEBROOT="/var/www/ray-editor"
NGINX_CONF="/etc/nginx/sites-available/ray-editor"
DEPLOY_USER="deploy"

echo "▶ Updating packages..."
apt-get update -qq && apt-get upgrade -y -qq

echo "▶ Installing Nginx + Certbot..."
apt-get install -y -qq nginx certbot python3-certbot-nginx ufw

# ─── Firewall ─────────────────────────────────────────────────────────────────
echo "▶ Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# ─── Deploy user ──────────────────────────────────────────────────────────────
echo "▶ Creating deploy user..."
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$DEPLOY_USER"
fi
mkdir -p "/home/$DEPLOY_USER/.ssh"
chmod 700 "/home/$DEPLOY_USER/.ssh"
# Paste the deploy public key below (or set via environment variable DEPLOY_PUBKEY)
if [ -n "${DEPLOY_PUBKEY:-}" ]; then
  echo "$DEPLOY_PUBKEY" >> "/home/$DEPLOY_USER/.ssh/authorized_keys"
  chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
  chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
fi

# Allow deploy user to reload nginx without password
echo "$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx, /usr/sbin/nginx -t" \
  > /etc/sudoers.d/deploy-nginx
chmod 440 /etc/sudoers.d/deploy-nginx

# ─── Web root ─────────────────────────────────────────────────────────────────
echo "▶ Creating web root $WEBROOT..."
mkdir -p "$WEBROOT"
chown -R "$DEPLOY_USER:www-data" "$WEBROOT"
chmod -R 755 "$WEBROOT"

# ─── Nginx config ─────────────────────────────────────────────────────────────
echo "▶ Writing Nginx config..."
cat > "$NGINX_CONF" <<NGINXEOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Redirect HTTP → HTTPS (certbot will update this block)
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    root $WEBROOT;
    index index.html;

    # ── SSL (certbot fills these in) ──────────────────────────────────────────
    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # ── Security headers ──────────────────────────────────────────────────────
    add_header X-Frame-Options        "SAMEORIGIN"   always;
    add_header X-Content-Type-Options "nosniff"      always;
    add_header Referrer-Policy        "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy     "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self';"
        always;

    # ── Caching ───────────────────────────────────────────────────────────────
    location ~* \.(css|js|woff2?|ttf|eot|svg|ico|png|jpg|webp|avif)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location = /index.html {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # ── Gzip ──────────────────────────────────────────────────────────────────
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    # ── Misc ──────────────────────────────────────────────────────────────────
    location = /favicon.svg { access_log off; }
    location = /robots.txt  { access_log off; }
    error_page 404 /index.html;
}
NGINXEOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/ray-editor
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

# ─── SSL certificate ──────────────────────────────────────────────────────────
echo "▶ Obtaining SSL certificate for $DOMAIN..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
  --email admin@rohanyeole.com --redirect

# ─── Auto-renew cron ──────────────────────────────────────────────────────────
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") \
  | sort -u | crontab -

echo ""
echo "✅ VPS setup complete!"
echo "   Site will be live at https://$DOMAIN after first GitHub Actions deploy."
echo ""
echo "Next steps:"
echo "  1. Add these GitHub repository secrets:"
echo "     VPS_HOST  = $(hostname -I | awk '{print $1}')"
echo "     VPS_USER  = $DEPLOY_USER"
echo "     VPS_SSH_KEY = <private key matching the public key you added>"
echo ""
echo "  2. Push to main branch to trigger auto-deploy."

# 🚀 DigitalOcean Deployment Guide

This guide walks you through deploying the NoteApp backend to a DigitalOcean droplet with NGINX, PM2, and Let's Encrypt SSL.

---

## 📋 Prerequisites

- DigitalOcean account
- Domain name pointing to your droplet (e.g., `note-api.chaewon.ca`)
- SSH key for authentication
- GitHub repository with this code

---

## 1️⃣ Create DigitalOcean Droplet

1. **Create a new droplet:**
   - OS: **Ubuntu 22.04 LTS** (recommended)
   - Plan: **Basic** ($6/month or higher)
   - Datacenter: Choose closest to your users
   - Authentication: **SSH keys** (add your public key)
   - Hostname: `noteapp-backend`

2. **Note your droplet IP address** (e.g., `143.198.147.166`)

3. **Configure DNS:**
   - Go to your domain registrar (or Cloudflare)
   - Add an **A record**:
     - Name: `notep-api` (for `note-api.chaewon.ca`)
     - Value: Your droplet IP address
     - TTL: 300 (or default)
   - Wait for DNS propagation (5-30 minutes)

---

## 2️⃣ Initial Server Setup

SSH into your droplet:

```bash
ssh root@YOUR_DROPLET_IP
```

### Update system packages

```bash
apt update && apt upgrade -y
```

### Install Node.js (v20.x)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version  # Should show v20.x.x
npm --version
```

### Install PM2 globally

```bash
npm install -g pm2
pm2 startup systemd  # Follow the command it outputs
```

### Install NGINX

```bash
apt install -y nginx
systemctl status nginx  # Should be active
```

### Install Git

```bash
apt install -y git
```

---

## 3️⃣ Deploy Application Code

### Clone repository

```bash
cd /root
git clone https://github.com/YOUR_USERNAME/noteapp-backend.git
cd noteapp-backend
```

### Install dependencies

```bash
npm install --production
```

### Create .env file

```bash
nano .env
```

Add the following (update with your values):

```env
# PORT
PORT=3001

# ADDRESS (0.0.0.0 to accept external connections)
SERVER_ADDRESS=0.0.0.0

# FRONTEND_URL
FRONTEND_URL=https://note-app-woad-five.vercel.app

# MONGODB_URI
MONGODB_URI="mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster.mongodb.net/Note?retryWrites=true&w=majority"
TEST_MONGODB_URI="mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster.mongodb.net/Note_test?retryWrites=true&w=majority"

# JWT_SECRET (generate strong secrets!)
SECRET="YOUR_RANDOM_SECRET_HERE"
COLLAB_SECRET="YOUR_COLLAB_SECRET_HERE"
```

**💡 Tip:** Generate strong secrets with: `openssl rand -base64 32`

Save and exit (Ctrl+X, Y, Enter)

### Start with PM2

```bash
pm2 start pm2.config.js
pm2 save
pm2 list  # Should show 'note-api' running
```

---

## 4️⃣ Configure NGINX

### Copy NGINX configuration

```bash
cp /root/noteapp-backend/nginx.conf /etc/nginx/sites-available/noteapp
```

### Create initial config (without SSL for certbot)

Edit the config temporarily:

```bash
nano /etc/nginx/sites-available/noteapp
```

**Temporarily comment out SSL sections** (lines with `ssl_certificate`, `listen 443`, etc.) - we'll add these after getting the certificate.

Or use this simplified version first:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.chaewon.ca;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Enable the site

```bash
ln -s /etc/nginx/sites-available/noteapp /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl reload nginx
```

### Test HTTP access

Visit `http://note-api.chaewon.ca` in your browser. You should see your API response.

---

## 5️⃣ Setup SSL with Let's Encrypt

### Install Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### Obtain SSL certificate

```bash
certbot --nginx -d note-api.chaewon.ca
```

Follow the prompts:
- Enter your email
- Agree to Terms of Service
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

Certbot will automatically configure NGINX with SSL!

### Verify SSL

Visit `https://note-api.chaewon.ca` - you should see a valid SSL certificate.

### Auto-renewal

Certbot sets up auto-renewal automatically. Test it:

```bash
certbot renew --dry-run
```

---

## 6️⃣ Configure Firewall (UFW)

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

---

## 7️⃣ Setup GitHub Actions CI/CD

### Generate SSH key for GitHub Actions

On your **local machine** (not the droplet):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy
```

### Add public key to droplet

```bash
# Copy the public key
cat ~/.ssh/github_actions_deploy.pub

# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Add to authorized_keys
nano ~/.ssh/authorized_keys
# Paste the public key on a new line
```

### Add private key to GitHub Secrets

1. Copy the **private key**:
   ```bash
   cat ~/.ssh/github_actions_deploy
   ```

2. Go to GitHub repository → **Settings** → **Secrets and variables** → **Actions**

3. Click **New repository secret**:
   - Name: `DROPLET_SSH_KEY`
   - Value: Paste the entire private key

### Update deploy.yml

Edit `.github/workflows/deploy.yml` and update the IP address:

```yaml
ssh -o StrictHostKeyChecking=no root@YOUR_NEW_DROPLET_IP << 'EOF'
```

### Test deployment

Commit and push to trigger the workflow:

```bash
git add .
git commit -m "Deploy to new DigitalOcean droplet"
git push origin main
```

Check **Actions** tab in GitHub to see the deployment progress.

---

## 8️⃣ Monitoring & Maintenance

### View PM2 logs

```bash
pm2 logs note-api
pm2 logs note-api --lines 100
```

### Restart application

```bash
pm2 restart note-api
```

### View NGINX logs

```bash
tail -f /var/log/nginx/noteapp_access.log
tail -f /var/log/nginx/noteapp_error.log
```

### System monitoring

```bash
pm2 monit           # Real-time monitoring
htop                # System resources
df -h               # Disk usage
free -h             # Memory usage
```

### Update dependencies

```bash
cd /root/noteapp-backend
git pull origin main
npm install --production
pm2 restart note-api
```

---

## 🔧 Troubleshooting

### Application won't start

```bash
pm2 logs note-api --err --lines 50
# Check for missing .env variables or MongoDB connection issues
```

### NGINX errors

```bash
nginx -t                          # Test config syntax
systemctl status nginx
tail -f /var/log/nginx/error.log
```

### SSL certificate issues

```bash
certbot certificates              # List certificates
certbot renew --dry-run          # Test renewal
```

### Port conflicts

```bash
netstat -tulpn | grep :3001      # Check what's using port 3001
netstat -tulpn | grep :1234      # Check Hocuspocus port
```

### WebSocket connection issues

Check NGINX WebSocket proxy settings and ensure:
- `proxy_http_version 1.1;`
- `proxy_set_header Upgrade $http_upgrade;`
- `proxy_set_header Connection "upgrade";`

---

## 🎯 Post-Deployment Checklist

- [ ] Droplet created and SSH accessible
- [ ] Domain DNS pointing to droplet
- [ ] Node.js and PM2 installed
- [ ] Application code cloned and dependencies installed
- [ ] `.env` file configured with production values
- [ ] PM2 running the application
- [ ] NGINX installed and configured
- [ ] SSL certificate obtained and auto-renewal tested
- [ ] Firewall configured
- [ ] GitHub Actions SSH key added and workflow tested
- [ ] Application accessible at `https://api.chaewon.ca`
- [ ] WebSocket connections working (Socket.IO + Hocuspocus)

---

## 📚 Additional Resources

- [DigitalOcean Initial Server Setup](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-22-04)
- [PM2 Production Guide](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [NGINX Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Let's Encrypt with Certbot](https://certbot.eff.org/instructions?ws=nginx&os=ubuntufocal)

---

🎉 **Your backend should now be live at `https://note-api.chaewon.ca`!**

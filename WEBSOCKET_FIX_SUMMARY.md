# WebSocket Connection Issues - Resolution Summary

## Issue 1: HTTP → HTTPS Redirect Breaking WebSocket Handshake

**Problem:** NGINX was configured to redirect all HTTP traffic to HTTPS with a 301 redirect:
```nginx
location / {
    return 301 https://$server_name$request_uri;
}
```

**Impact:** WebSocket upgrade requests (ws://) received HTTP 301 redirects, which WebSocket clients cannot follow. This caused "upstream prematurely closed connection" errors in the logs.

**Error Messages:**
```
upstream prematurely closed connection while reading response header from upstream
no live upstreams while connecting to upstream
```

### Solution: Add WebSocket Proxy Locations to HTTP Server Block

Added explicit WebSocket proxy locations to the port 80 server block so ws:// connections are handled directly instead of being redirected:

```nginx
server {
    listen 80;
    server_name note-api.chaewon.ca;

    # WebSocket endpoints must be proxied directly (not redirected)
    # WebSockets can't follow HTTP 301 redirects
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    location /collab {
        proxy_pass http://127.0.0.1:1234/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    location /hocuspocus {
        proxy_pass http://127.0.0.1:1234/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Redirect all other non-WebSocket traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}
```

---

## Issue 2: NGINX Location Path Mismatch for `/hocuspocus`

**Problem:** The NGINX location block was configured with a trailing slash (`/hocuspocus/`), but the client was connecting to `/hocuspocus` (without trailing slash).

**Impact:** Requests to `wss://note-api.chaewon.ca/hocuspocus` were not matching the NGINX location block, causing connection failures.

**Original Config:**
```nginx
location /hocuspocus/ {  # Note the trailing slash
    proxy_pass http://127.0.0.1:1234/;
}
```

### Solution: Fix `/hocuspocus` Location Path

Changed the location from `/hocuspocus/` to `/hocuspocus` (removed trailing slash) to match client connection URLs:

```nginx
# Before (incorrect):
location /hocuspocus/ {
    proxy_pass http://127.0.0.1:1234/;
}

# After (correct):
location /hocuspocus {
    proxy_pass http://127.0.0.1:1234/;
}
```

**Note:** This fix was applied in **both** the HTTP (port 80) and HTTPS (port 443) server blocks.

---

## Issue 3: Missing WebSocket Proxy Configuration in HTTP Server Block

**Problem:** The HTTP (port 80) server block only had a redirect rule and Let's Encrypt challenge handler, with no WebSocket proxy locations.

**Impact:** Even if clients tried to connect via ws:// (unencrypted WebSocket), they would get redirected to HTTPS and fail.

### Solution: Add WebSocket Endpoints to HTTP Block

See **Issue 1 Solution** above - the same fix addresses this issue. The HTTP server block now has dedicated WebSocket proxy locations for `/socket.io/`, `/collab`, and `/hocuspocus` before the catch-all redirect.

---

## Issue 4: Path Handling for `/collab` Endpoint

**Problem:** The `/collab` location was missing a trailing slash in the `proxy_pass` directive, which could cause path resolution issues with the Hocuspocus server.

**Original Config:**
```nginx
location /collab {
    proxy_pass http://127.0.0.1:1234;  # Missing trailing slash
}
```

### Solution: Fix `/collab` Proxy Pass Path

Added trailing slash to the `proxy_pass` directive for proper path resolution:

```nginx
# Before:
proxy_pass http://127.0.0.1:1234;

# After:
proxy_pass http://127.0.0.1:1234/;
```

**Note:** This fix was applied in **both** the HTTP and HTTPS server blocks.

---

## Complete NGINX WebSocket Configuration Reference

### Required Headers for WebSocket Support:

```nginx
proxy_http_version 1.1;                    # Required for WebSocket protocol
proxy_set_header Upgrade $http_upgrade;    # Tells backend this is a WebSocket upgrade
proxy_set_header Connection "upgrade";     # Confirms the connection upgrade
proxy_set_header Host $host;               # Preserves the original host header
proxy_set_header X-Real-IP $remote_addr;   # Passes client IP to backend
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

### Recommended Timeout Settings for Long-Lived Connections:

```nginx
proxy_connect_timeout 7d;
proxy_send_timeout 7d;
proxy_read_timeout 7d;
```

---

## Deployment Steps

1. **Copy the updated configuration:**
   ```bash
   cp /root/noteapp-backend/nginx.conf /etc/nginx/sites-available/noteapp
   ```

2. **Test the configuration:**
   ```bash
   nginx -t
   ```

3. **Reload NGINX:**
   ```bash
   systemctl reload nginx
   ```

4. **Verify backend is listening on correct ports:**
   ```bash
   netstat -tulpn | grep -E ':(3001|1234)'
   ```

5. **Check PM2 status:**
   ```bash
   pm2 list
   ```

---

## Client-Side Connection Examples

### For Socket.IO connections:
```javascript
// Use wss:// for WebSocket over HTTPS
const socket = io('wss://note-api.chaewon.ca', {
  transports: ['websocket']  // Prefer WebSocket transport
});
```

### For Hocuspocus/Yjs connections:
```javascript
const provider = new HocuspocusProvider({
  url: 'wss://note-api.chaewon.ca/hocuspocus',  // Note: no trailing slash needed now
  name: documentName,
  token: 'your-jwt-token-here',  // Required if authentication is enabled
});
```

---

## Debugging Commands

### Check NGINX error logs:
```bash
tail -f /var/log/nginx/noteapp_error.log
```

### Check backend application logs:
```bash
pm2 logs note-api
```

### Test WebSocket connection locally on the server:
```bash
# Check if ports are open
netstat -tulpn | grep -E ':(3001|1234)'
```

### Browser DevTools debugging:
1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Click on a WebSocket request
4. Check the "Messages" tab for connection errors
5. Look for authentication failures if tokens are required

---

## Root Cause Summary

The primary issue was that **NGINX's HTTP→HTTPS redirect was intercepting WebSocket upgrade requests**. WebSocket handshake happens over HTTP initially, and if the server responds with a 301 redirect, the WebSocket client cannot follow it (WebSocket protocol doesn't support redirects).

The solution was to **proxy WebSocket endpoints directly from the HTTP server block** before the redirect rule, allowing ws:// and wss:// connections to both work properly.

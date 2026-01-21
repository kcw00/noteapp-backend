# 🔐 GitHub Secrets Configuration

This document lists all the GitHub secrets required for the CI/CD pipeline.

## Required Secrets

Go to: **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### 1. `DROPLET_SSH_KEY`

**Purpose:** Private SSH key for deploying to the DigitalOcean droplet

**How to generate:**

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# Copy the PRIVATE key
cat ~/.ssh/github_actions_deploy
```

**Setup:**
1. Copy the **entire private key** (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)
2. Add it to GitHub Secrets as `DROPLET_SSH_KEY`
3. Add the **public key** to your droplet:
   ```bash
   # Copy public key
   cat ~/.ssh/github_actions_deploy.pub

   # SSH to droplet
   ssh root@YOUR_DROPLET_IP

   # Add to authorized_keys
   nano ~/.ssh/authorized_keys
   # Paste the public key on a new line
   ```

---

### 2. `DROPLET_IP`

**Purpose:** IP address of your DigitalOcean droplet

**Value:** Your droplet's IP address (e.g., `143.198.147.166`)

**How to find:**
- DigitalOcean Dashboard → Droplets → Click on your droplet → Copy the IPv4 address

**Setup:**
1. Copy your droplet's IP address
2. Add it to GitHub Secrets as `DROPLET_IP`

---

## Verification

After adding the secrets, verify them in:
- GitHub Repository → Settings → Secrets and variables → Actions

You should see:
- ✅ `DROPLET_SSH_KEY`
- ✅ `DROPLET_IP`

---

## Testing the Deployment

After setting up the secrets:

1. Make a small change to your code
2. Commit and push:
   ```bash
   git add .
   git commit -m "test: trigger deployment"
   git push origin main
   ```
3. Check the **Actions** tab in GitHub
4. The deployment workflow should run successfully

---

## Troubleshooting

### "Permission denied (publickey)"

- The public key is not added to the droplet's `~/.ssh/authorized_keys`
- The private key in GitHub Secrets is incorrect or incomplete

### "Host key verification failed"

- The workflow uses `StrictHostKeyChecking=no` to bypass this
- If still failing, SSH to the droplet manually first from the same network

### Workflow doesn't trigger

- Check that the workflow file is in `.github/workflows/deploy.yml`
- Ensure you're pushing to the `main` branch (or change the branch in the workflow)

---

## Security Best Practices

- ✅ Never commit private keys to the repository
- ✅ Use SSH keys specifically for CI/CD (not your personal keys)
- ✅ Rotate SSH keys periodically
- ✅ Use strong secrets for JWT tokens (generate with `openssl rand -base64 32`)
- ✅ Keep `.env` file in `.gitignore`

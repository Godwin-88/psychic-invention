# Free Hosting Alternatives Guide (2026)

## Overview

Since GitHub account is flagged, here are the best **completely free** alternatives for hosting your derivatives pricing engine.

---

## 🏆 Option 1: Hugging Face Spaces + Upstash Redis (Recommended)

### Hugging Face Spaces (Web API)

**Free Tier:**
- ✅ Unlimited CPU hours (CPU Basic tier)
- ✅ 10GB storage
- ✅ Public or private spaces
- ✅ Custom domains (on paid plans)

**Limitations:**
- ⚠️ Goes to sleep after 48 hours of inactivity (wakes on request)
- ⚠️ No persistent storage (use Upstash for Redis)
- ⚠️ Public repos only for free tier

**Setup Steps:**

1. **Create Hugging Face Account:**
   - Visit: https://huggingface.co/join
   - Sign up with email (no GitHub required)

2. **Create New Space:**
   - Go to: https://huggingface.co/new-space
   - **Space Name:** `pricing-engine-api`
   - **License:** MIT
   - **Space SDK:** Select **Docker**
   - **Visibility:** Public (free tier)
   - Click **Create Space**

3. **Configure Docker Space:**
   - In your new Space, click **Files** → **Add file** → **Upload files**
   - Upload: `Dockerfile.hf` (rename to `Dockerfile`)
   - Upload all project files

4. **Add Environment Variables:**
   - Go to **Settings** → **Variables**
   - Add:
     ```
     REDIS_URL=redis://your-upstash-redis-url
     CACHE_TTL_L1=30
     CACHE_TTL_L2=300
     CACHE_TTL_L3=3600
     ```

5. **Deploy:**
   - Click **Deploy** → Space will build automatically
   - Wait 5-10 minutes for build
   - Your API will be at: `https://huggingface.co/spaces/YOUR-USERNAME/pricing-engine-api`

### Upstash Redis (Cache)

**Free Tier:**
- ✅ 10,000 commands/day
- ✅ 256MB memory
- ✅ Global replication
- ✅ REST API + Redis protocol

**Setup Steps:**

1. **Create Upstash Account:**
   - Visit: https://upstash.com
   - Sign up with email

2. **Create Redis Database:**
   - Click **Create Database**
   - **Name:** `pricing-engine-cache`
   - **Region:** Choose closest to you
   - **TLS:** Enabled
   - **Eviction:** No eviction (free tier)
   - Click **Create**

3. **Get Connection String:**
   - Copy the **UPSTASH_REDIS_REST_URL**
   - Format: `https://xxx-xxx.region.redis.upstash.io`

4. **Add to Hugging Face:**
   - In your Space Settings → Variables
   - Add `REDIS_URL` with the Upstash URL

### Pros & Cons

| Feature | Hugging Face + Upstash |
|---------|------------------------|
| **Cost** | ✅ 100% Free |
| **Setup Time** | ✅ 15 minutes |
| **Uptime** | ⚠️ Sleeps after 48h inactive |
| **Performance** | ✅ Good for demos |
| **Scalability** | ⚠️ Limited on free tier |
| **Best For** | ✅ Demos, testing, portfolio |

---

## 🥈 Option 2: Oracle Cloud Free Tier (Best for Production)

### Oracle Cloud Always Free

**Free Tier:**
- ✅ 2 ARM VMs (up to 24GB RAM total)
- ✅ 4 AMD VMs (1GB RAM each)
- ✅ 200GB block storage
- ✅ Always free (no credit card expiry)

**Setup Steps:**

1. **Create Oracle Cloud Account:**
   - Visit: https://www.oracle.com/cloud/free/
   - Sign up (requires credit card but never charged)

2. **Create VM Instance:**
   - Console → **Compute** → **Instances**
   - **Create Instance**
   - **Image:** Ubuntu 22.04
   - **Shape:** VM.Standard.A1.Flex (1 OCPU, 6GB RAM)
   - **Boot Volume:** 50GB
   - **Networking:** Public subnet
   - **SSH Keys:** Generate or upload

3. **Connect to VM:**
   ```bash
   ssh -i your-key.pem ubuntu@YOUR-IP
   ```

4. **Install Dependencies:**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Python
   sudo apt install python3.11 python3.11-venv python3-pip -y
   
   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
   source $HOME/.cargo/env
   
   # Install Redis
   sudo apt install redis-server -y
   sudo systemctl enable redis
   sudo systemctl start redis
   ```

5. **Deploy Application:**
   ```bash
   # Clone your repo (use alternative Git hosting)
   git clone https://your-git-provider.com/username/psychic-invention.git
   cd psychic-invention
   
   # Setup Python venv
   python3.11 -m venv venv
   source venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   maturin develop --release
   ```

6. **Configure Redis:**
   ```bash
   # Edit Redis config
   sudo nano /etc/redis/redis.conf
   
   # Set:
   bind 0.0.0.0
   requirepass YOUR_PASSWORD
   ```

7. **Run with Gunicorn:**
   ```bash
   gunicorn app.main:app \
     -w 2 \
     -k uvicorn.workers.UvicornWorker \
     --bind 0.0.0.0:8000
   ```

### Pros & Cons

| Feature | Oracle Cloud |
|---------|--------------|
| **Cost** | ✅ Always Free |
| **Setup Time** | ⚠️ 30-45 minutes |
| **Uptime** | ✅ 99.9% SLA |
| **Performance** | ✅ Excellent |
| **Scalability** | ✅ Good |
| **Best For** | ✅ Production, long-term |

---

## 🥉 Option 3: Fly.io

### Fly.io Free Tier

**Free Tier:**
- ✅ 3 shared VMs (256MB each)
- ✅ 3GB persistent volume
- ✅ Free allowance: ~$5/month credit

**Setup Steps:**

1. **Install Fly CLI:**
   ```bash
   # macOS/Linux
   curl -L https://fly.io/install.sh | sh
   
   # Windows (WSL)
   curl -L https://fly.io/install.sh | sh
   ```

2. **Sign Up:**
   ```bash
   fly auth signup
   ```

3. **Deploy:**
   ```bash
   # Initialize
   fly launch --name pricing-engine
   
   # Add Redis
   fly redis create
   
   # Deploy
   fly deploy
   ```

### Pros & Cons

| Feature | Fly.io |
|---------|--------|
| **Cost** | ✅ ~$5/month (free credit) |
| **Setup Time** | ✅ 15 minutes |
| **Uptime** | ✅ Good |
| **Performance** | ✅ Good |
| **Best For** | ✅ Small production apps |

---

## 🥉 Option 4: Google Cloud Run

### Google Cloud Run Free Tier

**Free Tier:**
- ✅ 2 million requests/month
- ✅ 360,000 GB-seconds memory
- ✅ 180,000 vCPU-seconds

**Setup Steps:**

1. **Create Google Cloud Account:**
   - Visit: https://cloud.google.com/free
   - Sign up ($300 free credit for 90 days)

2. **Enable Cloud Run:**
   ```bash
   gcloud services enable run.googleapis.com
   ```

3. **Build Container:**
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT-ID/pricing-engine
   ```

4. **Deploy:**
   ```bash
   gcloud run deploy pricing-engine \
     --image gcr.io/PROJECT-ID/pricing-engine \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

### Pros & Cons

| Feature | Google Cloud Run |
|---------|------------------|
| **Cost** | ✅ Free tier + $300 credit |
| **Setup Time** | ✅ 20 minutes |
| **Uptime** | ✅ Excellent |
| **Performance** | ✅ Excellent |
| **Best For** | ✅ Production with variable traffic |

---

## 🔧 Alternative Git Hosting (Since GitHub Flagged)

Since your GitHub account is flagged, use these alternatives:

### 1. **GitLab** (Recommended)
- **Free:** Unlimited private repos
- **CI/CD:** Included free
- **URL:** https://gitlab.com

### 2. **Bitbucket**
- **Free:** 5 private repos
- **CI/CD:** 50 minutes/month
- **URL:** https://bitbucket.org

### 3. **Codeberg** (Open Source)
- **Free:** Unlimited private repos
- **Open Source:** Yes
- **URL:** https://codeberg.org

---

## 📊 Comparison Table

| Provider | Cost | Uptime | Setup | Best For |
|----------|------|--------|-------|----------|
| **Hugging Face + Upstash** | Free | ⚠️ 95% | 15 min | Demos, Portfolio |
| **Oracle Cloud** | Free | ✅ 99.9% | 45 min | Production |
| **Fly.io** | ~$5/mo | ✅ 99.9% | 15 min | Small Production |
| **Google Cloud Run** | Free tier | ✅ 99.95% | 20 min | Variable Traffic |

---

## 🚀 Recommended Setup (For You)

**Since GitHub is flagged, I recommend:**

### For Demo/Portfolio:
```
Hugging Face Spaces (API) + Upstash Redis (Cache)
```

**Steps:**
1. Create Hugging Face account (email signup)
2. Create Upstash Redis database
3. Upload `Dockerfile.hf` as `Dockerfile`
4. Add `REDIS_URL` environment variable
5. Deploy!

### For Production:
```
Oracle Cloud Free Tier (VM + Redis)
```

**Steps:**
1. Create Oracle Cloud account
2. Create ARM VM instance
3. Install Python, Rust, Redis
4. Deploy application
5. Configure Redis caching

---

## 📝 Quick Start Commands

### Hugging Face Spaces:
```bash
# 1. Create Dockerfile
cp Dockerfile.hf Dockerfile

# 2. Upload to Hugging Face Spaces
# Via web interface: https://huggingface.co/new-space

# 3. Add environment variables in Settings
REDIS_URL=redis://your-upstash-url
```

### Oracle Cloud:
```bash
# SSH to VM
ssh -i key.pem ubuntu@YOUR-IP

# Install dependencies
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip redis-server -y
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Setup
source $HOME/.cargo/env
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
maturin develop --release

# Run
gunicorn app.main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

---

## 🔗 Useful Links

- **Hugging Face Spaces:** https://huggingface.co/spaces
- **Upstash Redis:** https://upstash.com
- **Oracle Cloud Free:** https://www.oracle.com/cloud/free/
- **Fly.io:** https://fly.io
- **Google Cloud Run:** https://cloud.google.com/run
- **GitLab:** https://gitlab.com
- **Codeberg:** https://codeberg.org

---

**Last Updated:** 2026-03-04
**Status:** All options verified as free tier available

# Hướng dẫn Deploy — SiteCheck.net SERP Tracker

Hướng dẫn deploy lên Ubuntu 24.04 LTS với PM2.

## 1. Chuẩn bị server

### 1.1 Cập nhật hệ thống

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential
```

### 1.2 Cài Node.js 20.x

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x.x
npm -v
```

### 1.3 Cài PM2 toàn cầu

```bash
sudo npm install -g pm2
pm2 startup
# PM2 sẽ in ra một lệnh sudo, hãy chạy lệnh đó để tự động khởi động cùng hệ điều hành
```

### 1.4 Cài Chrome

```bash
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update
sudo apt install -y google-chrome-stable
google-chrome --version
```

### 1.5 Cài MongoDB 7

```bash
# Import key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Thêm source
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org

# Khởi động
sudo systemctl start mongod
sudo systemctl enable mongod
mongod --version
```

### 1.6 Cài Redis 7

```bash
sudo apt install -y redis-server

# Cấu hình: mở /etc/redis/redis.conf
# Đặt: supervised systemd
# Đặt: maxmemory 256mb
# Đặt: maxmemory-policy allkeys-lru
sudo systemctl restart redis-server
sudo systemctl enable redis-server
redis-cli ping   # PONG
```

## 2. Deploy ứng dụng

### 2.1 Tạo user deploy

```bash
sudo useradd -m -s /bin/bash deploy
sudo su - deploy
```

### 2.2 Clone source code

```bash
cd ~
git clone <repo-url> sitecheck
cd sitecheck
```

### 2.3 Cài dependencies

```bash
npm ci
```

### 2.4 Cấu hình môi trường

```bash
cp .env.example .env
nano .env
```

Cấu hình `.env`:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/sitecheck
REDIS_URL=redis://localhost:6379

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<generate-32-char-random-string>

# Admin — email của tài khoản admin đầu tiên
ADMIN_EMAILS=admin@yourdomain.com

# Chrome
CHROME_PATH=/usr/bin/google-chrome-stable

# Crawler
USER_PROFILE_SLOTS=20

# Captcha (tuỳ chọn)
TWO_CAPTCHA_API_KEY=
TWO_CAPTCHA_ENABLED=false

# App
PORT=3000
```

Tạo `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

### 2.5 Build

```bash
# Build Next.js app
npm run build

# Build worker
npm run worker:build
```

### 2.6 Tạo thư mục dữ liệu worker

```bash
mkdir -p worker/user_data
```

### 2.7 Tạo admin user đầu tiên

```bash
# Vào MongoDB shell tạo user admin
mongosh sitecheck --eval '
db.users.insertOne({
  name: "Admin",
  email: "admin@yourdomain.com",
  password: "'$(node -e "const bcrypt=require('bcryptjs');console.log(bcrypt.hashSync('CHANGE_ME_PASSWORD',10))")'",
  isAdmin: true,
  disabled: false,
  createdAt: new Date(),
  updatedAt: new Date()
})
'
```

### 2.8 Khởi động qua PM2

```bash
cd ~/sitecheck
pm2 start ecosystem.config.js
```

Kiểm tra:

```bash
pm2 status
pm2 logs
```

Output mong đợi:

```
┌────┬──────────────────┬─────────┬─────────┐
│ id │ name             │ status  │ cpu     │
├────┼──────────────────┼─────────┼─────────┤
│ 0  │ sitecheck-app    │ online  │ 0%      │
│ 1  │ sitecheck-worker │ online  │ 0%      │
└────┴──────────────────┴─────────┴─────────┘
```

### 2.9 Lưu PM2 config (tự động khởi động lại khi reboot)

```bash
pm2 save
```

## 3. Cấu hình Nginx (Reverse Proxy)

### 3.1 Cài Nginx

```bash
sudo apt install -y nginx
```

### 3.2 Cấu hình virtual host

```bash
sudo nano /etc/nginx/sites-available/sitecheck
```

Nội dung:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sitecheck /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3.3 SSL với Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Cập nhật `NEXTAUTH_URL` trong `.env`:

```env
NEXTAUTH_URL=https://your-domain.com
```

Restart:

```bash
pm2 restart all
```

## 4. Quản lý

### PM2 Commands

```bash
pm2 status                    # Trạng thái tiến trình
pm2 logs                      # Xem tất cả logs
pm2 logs sitecheck-worker     # Logs worker
pm2 restart all               # Restart tất cả
pm2 restart sitecheck-worker  # Restart worker
pm2 stop all                  # Dừng tất cả
pm2 monit                     # Monitor CPU/RAM
```

### Update ứng dụng

```bash
cd ~/sitecheck
git pull origin main
npm ci
npm run build
npm run worker:build
pm2 restart all
```

### Xem logs crawler

```bash
pm2 logs sitecheck-worker --lines 100
```

## 5. Monitoring

### PM2 Plus (tuỳ chọn)

```bash
pm2 register
# Làm theo hướng dẫn để kết nối PM2 dashboard
```

### Kiểm tra sức khoẻ

```bash
curl http://localhost:3000/api/health
```

### Cron dọn dẹp (tuỳ chọn)

Thêm vào crontab để dọn profile cũ:

```bash
crontab -e
```

```
0 3 * * * find /home/deploy/sitecheck/worker/user_data -type d -mtime +7 -exec rm -rf {} + 2>/dev/null
```

## 6. Backup

### MongoDB

```bash
# Backup
mongodump --db sitecheck --out /backup/mongo/$(date +%Y%m%d)

# Restore
mongorestore --db sitecheck /backup/mongo/20240101/sitecheck
```

### Cron backup hàng ngày

```bash
sudo nano /etc/cron.d/sitecheck-backup
```

```
0 2 * * * deploy mongodump --db sitecheck --out /backup/mongo/$(date +\%Y\%m\%d)
```

## 7. Troubleshooting

### Worker không pick up job

```bash
pm2 logs sitecheck-worker --lines 50
# Kiểm tra Redis kết nối
redis-cli ping
# Kiểm tra MongoDB kết nối
mongosh sitecheck --eval "db.adminCommand('ping')"
```

### Chrome crash

```bash
# Kiểm tra Chrome hoạt động
google-chrome --headless --no-sandbox --dump-dom https://google.com
# Thiếu thư viện chia sẻ
sudo apt install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 libasound2
```

### App không start

```bash
pm2 logs sitecheck-app --lines 50
# Kiểm tra .env
cat .env | grep -v "^#" | grep -v "^$"
# Kiểm tra port conflict
sudo lsof -i :3000
```

### Memory cao

```bash
pm2 monit
# Tăng max_memory_restart trong ecosystem.config.js nếu cần
```

# SiteCheck.net — SERP Tracker

Theo dõi thứ hạng tên miền trên Google SERP. Hỗ trợ nhiều workspace, tự động crawl qua hàng loạt từ khóa, theo dõi vị trí và xu hướng theo thời gian.

## Kiến trúc

```
┌─────────────┐     ┌──────────────┐     ┌─────────┐
│  Next.js App │────▶│   MongoDB    │     │  Redis  │
│  (Port 3000) │     │  (Port 27017)│     │(6379)   │
└─────────────┘     └──────────────┘     └────┬────┘
                                               │
┌─────────────┐     ┌──────────────┐           │
│ BullMQ Worker│────▶│ Headless     │◀──────────┘
│ (PM2 managed)│     │ Chrome       │
└─────────────┘     └──────────────┘
```

- **Next.js 16** — App Router, SSR, API routes
- **MongoDB 7** — dữ liệu (users, workspaces, keywords, results)
- **Redis 7** — BullMQ job queue
- **BullMQ Worker** — crawl Google SERP qua puppeteer-real-browser
- **PM2** — quản lý tiến trình production

## Tính năng

- Quản lý nhiều workspace, mỗi workspace có domain riêng
- Danh sách từ khóa với crawl tự động
- Theo dõi vị trí SERP + xu hướng (tăng/giảm/mới/mất)
- Xuất CSV kết quả
- Admin panel: quản lý user, proxy, cấu hình crawler
- Timeout detection + cancel/kill job
- Hỗ trợ proxy xoay theo quốc gia
- Tích hợp 2Captcha (tuỳ chọn)

## Yêu cầu

| Thành phần | Phiên bản |
|------------|-----------|
| Node.js    | 20.x      |
| MongoDB    | 7.x       |
| Redis      | 7.x       |
| Chrome/Chromium | ổn định |
| PM2        | toàn cầu  |

## Chạy nhanh (Development)

```bash
# Cài đặt
npm install

# Khởi động MongoDB + Redis (Docker)
docker compose up -d

# Cấu hình môi trường
cp .env.example .env
# Chỉnh .env theo cấu hình cục bộ

# Chạy app
npm run dev

# Chạy worker (terminal khác)
npm run worker
```

Truy cập http://localhost:3000

## Build & Production

```bash
# Build Next.js
npm run build

# Build worker
npm run worker:build

# Khởi động qua PM2
npm run pm2:start

# Xem logs
npm run pm2:logs

# Dừng
npm run pm2:stop
```

## Biến môi trường

| Biến                  | Bắt buộc | Mặc định                        | Mô tả                              |
|-----------------------|----------|---------------------------------|------------------------------------|
| `MONGODB_URI`         | Có       | —                               | Chuỗi kết nối MongoDB              |
| `REDIS_URL`           | Có       | —                               | Chuỗi kết nối Redis                |
| `NEXTAUTH_URL`        | Có       | —                               | URL gốc của ứng dụng               |
| `NEXTAUTH_SECRET`     | Có       | —                               | Secret JWT (tối thiểu 32 ký tự)    |
| `ADMIN_EMAILS`        | Có       | —                               | Email admin, phân cách bằng dấu phẩy |
| `PORT`                | Không    | `3000`                          | Cổng Next.js                       |
| `CHROME_PATH`         | Không    | `/usr/bin/google-chrome-stable` | Đường dẫn Chrome                   |
| `USER_PROFILE_SLOTS`  | Không    | `50`                            | Số profile trình duyệt đồng thời   |
| `TWO_CAPTCHA_API_KEY` | Không    | —                               | API key 2Captcha                   |
| `TWO_CAPTCHA_ENABLED` | Không    | `false`                         | Bật giải captcha                   |

## Cấu trúc thư mục

```
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Trang chính + admin
│   ├── (auth)/             # Đăng nhập / đăng ký
│   └── api/                # API routes
├── components/             # React components
├── lib/                    # Services, auth, DB
├── models/                 # Mongoose models
├── worker/                 # BullMQ worker + crawler
│   └── crawler/            # SERP crawler engine
├── types/                  # TypeScript types
├── docker-compose.yml      # MongoDB + Redis
├── ecosystem.config.js     # PM2 config
└── .env.example            # Mẫu biến môi trường
```

## Deploy

Xem hướng dẫn chi tiết: [docs/deployment-guide.md](docs/deployment-guide.md)

## License

Private

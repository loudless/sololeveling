# 🗡️ Solo Leveling — Daily Quest Tracker

Telegram Mini App трекер тренировок в стиле Solo Leveling.

## Быстрый старт (dev)

```bash
npm install
npm run dev
```

Откроется на `http://localhost:5173`. В браузере работает с localStorage как фоллбэк.

## Сборка

```bash
npm run build
```

Готовый билд — `dist/`.

## Деплой на VPS (nginx)

1. Собери и залей:

```bash
npm run build
scp -r dist/* user@your-server:/var/www/solo-leveling/
```

2. nginx конфиг:

```nginx
server {
    listen 443 ssl;
    server_name solo-leveling.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/solo-leveling.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/solo-leveling.your-domain.com/privkey.pem;

    root /var/www/solo-leveling;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

3. SSL (обязательно для Telegram Mini Apps):

```bash
certbot --nginx -d solo-leveling.your-domain.com
```

## Настройка бота в Telegram

1. [@BotFather](https://t.me/BotFather) → `/newbot` или существующий
2. `/newapp` → укажи URL: `https://solo-leveling.your-domain.com`
3. Или `/setmenubutton` → URL + текст "Daily Quest"

## CI/CD (GitHub Actions)

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - name: Deploy
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          source: "dist/*"
          target: "/var/www/solo-leveling"
          strip_components: 1
```

## Хранение данных

- **Telegram**: CloudStorage API (серверное, до 4KB/ключ, привязано к паре бот+юзер)
- **Браузер (dev)**: localStorage фоллбэк
- История — последние 90 дней (лимиты CloudStorage)

## Стек

- Vite + React
- Telegram Web App SDK
- CloudStorage + haptic feedback

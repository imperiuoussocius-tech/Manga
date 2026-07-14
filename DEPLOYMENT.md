# ENT Deployment Guide

This document covers how to run, package, and deploy the ENT site.

## 1. Local development

```bash
cd /workspaces/Manga
npm install
node server.js
```

Open http://localhost:3000.

## 2. Production-style run

Use a process manager or a hosting service such as Render, Railway, Fly.io, or a VPS.

Example with PM2:

```bash
npm install -g pm2
pm2 start server.js --name ent
```

## 3. Docker deployment

```bash
cd /workspaces/Manga
docker build -t ent-site .
docker run -p 3000:3000 ent-site
```

## 4. Deploying the ZIP bundle

1. Upload the archive file named `ent-site.zip` to your host.
2. Extract it.
3. Install dependencies:

```bash
npm install
```

4. Start the server:

```bash
node server.js
```

## 5. Environment notes

The current build uses a local fallback catalog and generated chapter image placeholders. For live scraping of new manga/manhwa/manhua titles, replace the fallback logic in [lib/scraper.js](lib/scraper.js) with your preferred source integration.

## 6. Verification

Check the health endpoint:

```bash
curl http://127.0.0.1:3000/api/health
```

Expected response:

```json
{"ok":true,"service":"ENT"}
```

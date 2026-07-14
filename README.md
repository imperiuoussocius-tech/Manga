# ENT

ENT is a portable manga, manhwa, and manhua discovery site with a lightweight Node.js backend and a browser-based reader experience.

## Features
- Catalog refresh endpoint with fallback sample data
- Search and filter by manga/manhwa/manhua
- Chapter selection and image viewer
- ZIP export workflow for offline use

## Run locally
```bash
npm install
node server.js
```

Then open http://localhost:3000.

## Build and deploy elsewhere
1. Upload the project folder or the generated zip archive.
2. Install dependencies with `npm install`.
3. Start the app with `node server.js`.

The archive generated for distribution is `ent-site.zip`.

For full deployment steps, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Container deployment
```bash
docker build -t ent-site .
docker run -p 3000:3000 ent-site
```

## GitHub Actions
A basic workflow is included at [.github/workflows/deploy.yml](.github/workflows/deploy.yml) to run tests and smoke-check the server on push and pull request.

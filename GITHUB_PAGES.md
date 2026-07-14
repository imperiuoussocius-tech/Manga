# GitHub hosting guide

## Option 1: GitHub Pages (static)

1. Push the repository to GitHub.
2. Open the repository settings.
3. Go to Pages.
4. Choose the main branch and the root folder.
5. Save.
6. In the Pages section, enter your custom domain: `paneldrift.com.ng`.
7. Wait for GitHub to verify the DNS settings.
8. Add the following DNS records in your Dotifi DNS panel:
   - A record: `@` → `185.199.108.153`
   - A record: `@` → `185.199.109.153`
   - A record: `@` → `185.199.110.153`
   - A record: `@` → `185.199.111.153`
   - CNAME record: `www` → `<your-github-username>.github.io`

The site is served from the public folder, so the main entry point is:

- [public/index.html](public/index.html)

## Option 2: GitHub + local Node server

If you want the server-side API as well, deploy the repository to a host that supports Node.js, such as Render or Railway.

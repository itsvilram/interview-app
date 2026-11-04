# Interview App

Small full stack app: **Node.js + Express API**, **plain HTML/JS frontend**, **Supabase (Postgres)** database, deployed on **AWS EC2**.

```
Browser (public/)  --fetch-->  Express API (server.js)  --supabase-js-->  Supabase Postgres
```

## Run locally

1. In Supabase, open **SQL Editor**, paste `schema.sql` and click **Run**.
2. Copy `.env.example` to `.env`, then fill in `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
3. `npm install`
4. `npm run dev`, then open http://localhost:3000

## API

| Method | Path | Body | Result |
|---|---|---|---|
| GET | /api/health | – | `{ ok: true }` |
| GET | /api/items | – | list, newest first |
| POST | /api/items | `{ "title": "..." }` | 201 + new item |
| PATCH | /api/items/:id | `{ "title"?: "...", "done"?: true }` | updated item |
| DELETE | /api/items/:id | – | 204 |

Errors come back as `{ "error": "message" }` with 400, 404 or 500.

## Deploy on AWS EC2

**Quick way (scripts):**
1. On your laptop, run `npm run push`. It creates the GitHub repo, pushes, and prints an EC2 command.
2. Launch the instance (step 1 below), open EC2 Instance Connect, and paste the printed command. It asks for your Supabase URL and key once.
3. To redeploy after changes, run `npm run push` again, then paste the same command on EC2.

**Manual way:**

1. **EC2 → Launch instance**
   - AMI: **Amazon Linux 2023**. Type: **t3.micro** (or whichever type says "Free tier eligible").
   - Key pair: *Proceed without a key pair* (we connect in the browser).
   - Network settings → Edit → add an inbound rule: **Custom TCP, port 3000, source 0.0.0.0/0**. Keep SSH 22.
2. Select the instance, click **Connect**, then **EC2 Instance Connect**, then **Connect**. This opens a browser terminal.
3. Run:
   ```bash
   sudo dnf install -y git
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
   source ~/.bashrc
   nvm install 22
   git clone https://github.com/<your-user>/<your-repo>.git app && cd app
   npm ci --omit=dev
   nano .env        # paste SUPABASE_URL, SUPABASE_SECRET_KEY, PORT=3000; save with Ctrl+O, Enter, Ctrl+X
   npm install -g pm2
   pm2 start server.js --name app
   pm2 save
   ```
4. Open `http://<EC2-public-IPv4>:3000`. Use **http**, not https.

Redeploy after a change: `cd app && git pull && npm ci --omit=dev && pm2 restart app`.
Logs: `pm2 logs app`.

## Design decisions (talking points)

- **Browser → my API → database, never browser → database.** The Supabase secret key lives only in the server's `.env`. It is in `.gitignore` and never shipped to the browser.
- **Row Level Security is on with no policies.** The public key can't touch the table. Only the backend's secret key can.
- **Validation on the server.** Never trust the client: title must be 1–200 characters, id must be a positive integer. The database also has a `check` constraint as a second layer.
- **XSS-safe rendering.** The frontend uses `textContent`, not `innerHTML`, for user data.
- **Fail fast.** The server refuses to start if env vars are missing.
- **One deployable.** Express serves both the API and the static frontend, so there's one server, one URL and no CORS issues.
- **pm2** keeps the process running and restarts it if it crashes.
- **What I'd add with more time:** HTTPS (ALB or CloudFront in front, or a domain plus Let's Encrypt), auth (Supabase Auth), pagination, tests, CI/CD, and running on port 80 behind nginx.

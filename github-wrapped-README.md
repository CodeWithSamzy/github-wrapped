# GitHub Wrapped

A year-in-review for developers. Sign in with GitHub, and get a scrollable
set of stat cards about your year of coding, plus a shareable image card you
can post anywhere.

Live: **https://githubwrapped-app.vercel.app** - built by
[@codewithsamzy](https://github.com/codewithsamzy).

## What it does

- **Sign in with GitHub** (OAuth, read-only scopes).
- **Pulls your last 12 months of activity** from GitHub's GraphQL API.
- **Shows animated stat cards**, one idea per slide:
  - Total contributions and commits
  - Busiest month and busiest day of the week
  - Longest contribution streak
  - Top languages, as a percentage breakdown
  - Most active repositories
  - Stars received and new followers
- **Generates a shareable image card** with your headline stats, ready to
  download or post.
- **Gives every result a public link** (`/wrapped/<username>`) so the card
  can be viewed without signing in again.

## How the numbers are calculated

| Stat | Source |
|---|---|
| Total commits / contributions | GraphQL `contributionsCollection` (`totalCommitContributions`, `contributionCalendar.totalContributions`) |
| Busiest month / weekday | Grouped from the daily `contributionCalendar` |
| Longest streak | Computed in this app: the longest run of consecutive days with at least one contribution |
| Top languages | Language byte counts per repository, summed across repos and converted to percentages |
| Top repositories | `commitContributionsByRepository` |
| Stars / followers | Standard user and repository fields |

Streaks and monthly totals depend on how "a day" is defined. This app uses
UTC dates from GitHub's calendar, so numbers may differ slightly from your
local-time expectations.

## Limitations

- **Private contributions:** GitHub only exposes them as a count, and only if
  you've enabled *Include private contributions on my profile* in your GitHub
  settings. They show up in totals and the calendar, but with no repository or
  language detail.
- **One-year window:** the GraphQL `contributionsCollection` covers at most
  one year per query, so this is a rolling last-12-months view.
- **Language percentages** measure bytes of code in repositories you own or
  contribute to, which is not the same as time spent.

## Architecture

```
Browser ──▶ Next.js app ──▶ GitHub OAuth ──▶ access token
                │
                ├──▶ GitHub GraphQL API (contributions, repos, languages)
                │
                ├──▶ stats module (streaks, months, language percentages)
                │
                ├──▶ stat card slides (React + CSS transitions)
                │
                └──▶ share card route (HTML/CSS ──▶ PNG)
```

## Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Auth:** Auth.js with the GitHub provider
- **Data:** GitHub GraphQL API
- **Share image:** `@vercel/og` (Satori) rendering HTML/CSS to PNG
- **Storage (optional):** Postgres (Neon) to cache computed results, so
  public links don't re-hit the GitHub API on every view

## Setup

1. **Clone and install**
   ```bash
   git clone <your-repo-url>
   cd github-wrapped
   npm install
   ```
2. **Create a GitHub OAuth app** at
   `https://github.com/settings/developers` → *New OAuth App*.
   - Homepage URL: `http://localhost:3000`
   - Callback URL: `http://localhost:3000/api/auth/callback/github`
3. **Create your env file** by copying `.env.example` to `.env` and filling in:
   ```
   AUTH_SECRET=            # generate with: npx auth secret
   AUTH_GITHUB_ID=
   AUTH_GITHUB_SECRET=
   DATABASE_URL=           # only if you enable result caching
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
4. **(Optional) Bundle a font for the share card**
   ```bash
   npm run fonts
   ```
   The card renderer checks `public/fonts` first, then the font bundled with
   Next.js, then `CARD_FONT_URL` if you set one. Nothing about rendering the
   PNG requires network access.
5. **Run it**
   ```bash
   npm run dev
   ```
6. Open `http://localhost:3000`, click **Connect GitHub**, and approve.

## Privacy

- The app requests the minimum scope needed to read your profile and
  contribution data.
- Access tokens are used only to fetch your stats and are not stored beyond
  your session.
- Public result links expose only the aggregate stats shown on the card, never
  repository contents.

## Routes

| Route | What it does |
|---|---|
| `/` | Landing page. Signed-in visitors are built and redirected to their public page. |
| `/wrapped/<username>` | The scroll deck. Serves a fresh snapshot, else rebuilds from GitHub. |
| `/api/wrapped/<username>/card` | The 1200x630 PNG share card (`next/og` + Satori). |
| `/api/auth/[...nextauth]` | Auth.js OAuth endpoints. |
| `/api/cron/prune` | TTL sweep for stored snapshots. Bearer-authenticated, scheduled in `vercel.json`. |

## Deploy

Vercel is the shortest path. Two things differ from local development:

- **Production needs its own callback URL.** A GitHub OAuth app accepts up to
  10 callback URLs, so you can add the production one to the same app you use
  locally (open the app, click *Add callback URL*). Use a separate app only if
  you want the two kept apart.
- **Serverless instances do not share memory.** Without `DATABASE_URL` the
  snapshot cache is per-instance and is lost on every redeploy, so public links
  keep rebuilding from GitHub. Set it for anything real.

### 1. Ship it

On Windows, `deploy.ps1` in the repo root does the linking, the environment
variables and the redeploys for you:

```powershell
.\deploy.ps1           # sign in, link the project, deploy, print the URL
.\deploy.ps1 -Finish   # after creating the production OAuth app
```

Doing it by hand is equivalent:

```bash
vercel          # first run links or creates the project
vercel --prod
```

Or push to a Git host and import the repo at `vercel.com/new`. Note the URL you
get (`https://<project>.vercel.app`) or your custom domain.

GitHub Wrapped itself is deployed at `https://githubwrapped-app.vercel.app`.
Two more `*.vercel.app` aliases point at the same project:
`mygithubwrapped.vercel.app` and `my-year-in-code.vercel.app`.

### 2. Point GitHub at the production URL

At `https://github.com/settings/developers`, open your OAuth app and add:

- Homepage URL: `https://<your-domain>`
- Authorization callback URL: `https://<your-domain>/api/auth/callback/github`

Keep the `http://localhost:3000/api/auth/callback/github` entry too, so local
and production share one app. Only make a second app if you would rather they
did not share a client secret.

### 3. Environment variables

Set these in Vercel -> Project -> Settings -> Environment Variables:

| Variable | Value |
|---|---|
| `AUTH_SECRET` | random 32-byte string (`npx auth secret`) |
| `AUTH_GITHUB_ID` | production OAuth app client ID |
| `AUTH_GITHUB_SECRET` | production OAuth app client secret |
| `NEXT_PUBLIC_APP_URL` | `https://<your-domain>` |
| `DATABASE_URL` | Postgres connection string (Neon's pooled URL works) |
| `GITHUB_PUBLIC_TOKEN` | read-only token, so signed-out visitors can view wrappeds |
| `CRON_SECRET` | random string; guards `/api/cron/prune` |

`WRAPPED_SNAPSHOT_TTL_HOURS` and `CARD_FONT_URL` are optional.

Without `GITHUB_PUBLIC_TOKEN` the landing page hides the lookup form, and
`/wrapped/<username>` only works for snapshots that are already cached.

### 4. Cron

`vercel.json` registers a daily sweep of expired snapshots at
`/api/cron/prune`. Once `CRON_SECRET` is set on the project, Vercel sends it as
a bearer token automatically, so there is nothing else to wire up.

## Roadmap

- [x] GitHub OAuth sign-in
- [x] GraphQL query for contributions, repos, and languages
- [x] Stats module (streaks, busiest month and weekday, language percentages)
- [x] Unit tests for the streak and aggregation logic
- [x] Animated stat card slides
- [x] Share card image generation
- [x] Public `/wrapped/<username>` pages with caching
- [x] Rate-limit handling for GitHub API calls
- [x] Deploy - live at https://githubwrapped-app.vercel.app

## Credits

Built by [@codewithsamzy](https://github.com/codewithsamzy).

Inspired by the "Wrapped" format popularized by Spotify. Not affiliated with
or endorsed by GitHub or Spotify.

## License

MIT

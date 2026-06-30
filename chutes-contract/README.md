# ChutesContract

A trustless AI contract analyzer. Users sign in with their [Chutes](https://chutes.ai) account, upload a contract, and review a clause-by-clause risk breakdown produced by a six-stage agent pipeline — risk scores, plain-English translations, and negotiation-ready rewrites.

Authentication uses **Sign in with Chutes** (OAuth 2.0 + PKCE), so API usage is billed to the signed-in user's Chutes account and no API keys live in the browser.

> **Status:** The auth flow is fully wired up. The contract analyses are currently served from mock data in `lib/contractData.ts`, and the upload modal validates files but does not yet send them to a backend. See [Current limitations](#current-limitations).

## Tech stack

- **Next.js 16** (App Router) — note: this is a breaking-change release; see `AGENTS.md`
- **React 19**
- **TypeScript 5**
- **Tailwind CSS v4**

## Getting started

### Prerequisites

- Node.js 20+
- A Chutes account and a registered OAuth app (see [Registering an OAuth app](#registering-an-oauth-app))

### Install

```bash
npm install
```

### Configure environment

Copy the example file and fill in your values:

```bash
cp env.local.example .env.local
```

| Variable | Description |
| --- | --- |
| `CHUTES_API_KEY` | Your Chutes API key (used to register OAuth apps; not required at runtime). |
| `CHUTES_OAUTH_CLIENT_ID` | OAuth app client id (`cid_...`). |
| `CHUTES_OAUTH_CLIENT_SECRET` | OAuth app client secret (`csc_...`) — keep server-side only. |
| `NEXT_PUBLIC_APP_URL` | Base URL of this app, e.g. `http://localhost:3000`. Used to build the redirect URI. |
| `CHUTES_OAUTH_REDIRECT_URI` | Full callback URL, e.g. `http://localhost:3000/api/auth/chutes/callback`. Must match a `redirect_uri` registered on your OAuth app. |

### Run

```bash
npm run dev      # start the dev server on http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
```

## How authentication works

The app implements the OAuth 2.0 Authorization Code flow with PKCE against the Chutes IDP.

1. **`GET /api/auth/chutes/login`** — generates a PKCE verifier/challenge and a CSRF `state`, stores them in short-lived `httpOnly` cookies, then redirects the browser to the Chutes web auth page (`https://chutes.ai/auth`) with the IDP authorize URL passed as `redirect_to`.
2. The user picks a login method — **Google, GitHub, Hotkey, or Fingerprint** — and authorizes the app.
3. **`GET /api/auth/chutes/callback`** — verifies `state`, exchanges the authorization code for tokens, fetches the user profile, stores the session in an `httpOnly` cookie, and redirects to `/dashboard`.
4. **`GET /api/auth/chutes/session`** — returns the current user, or `401` if the session is missing/expired. The `useChutesSession` hook polls this on the client.
5. **`POST /api/auth/chutes/logout`** — clears the session cookie.

### Why login routes through `chutes.ai/auth`

The Chutes IDP `/idp/authorize` page only shows the **Fingerprint** and **Hotkey** tabs directly; **Google** and **GitHub** are hidden behind a "More login options" link. The login route redirects through `https://chutes.ai/auth?redirect_to=<authorize_url>` so social logins are presented up front. After the user authenticates, Chutes hands control back into the standard OAuth `/authorize` flow, keeping PKCE and `state` intact.

### Registering an OAuth app

```bash
curl -X POST "https://api.chutes.ai/idp/apps" \
  -H "Authorization: Bearer $CHUTES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ChutesContract",
    "description": "AI contract analyzer",
    "redirect_uris": ["http://localhost:3000/api/auth/chutes/callback"],
    "homepage_url": "http://localhost:3000",
    "allowed_scopes": ["openid", "profile", "chutes:invoke"]
  }'
```

The response includes your `client_id` and `client_secret`. Add every environment you deploy to (e.g. your production URL) to `redirect_uris`.

See the [official Sign in with Chutes docs](https://chutes.ai/docs/sign-in-with-chutes/overview) for more.

## Project structure

```
app/
  api/auth/chutes/
    login/route.ts      # start OAuth flow (redirect to Chutes web auth)
    callback/route.ts   # exchange code for tokens, set session cookie
    session/route.ts    # return current user
    logout/route.ts     # clear session cookie
  dashboard/
    layout.tsx          # sidebar with contract list + sign out
    page.tsx            # contract grid + upload modal
    [id]/page.tsx       # contract detail with 6-stage agent pipeline
  page.tsx              # landing / sign-in screen
hooks/
  useChutesSession.ts   # client hook for session state + logout
lib/
  chutesAuth.ts         # OAuth config, PKCE helpers, token + userinfo calls
  serverAuth.ts         # session cookie encode/decode helpers
  contractData.ts       # contract types + mock analysis data
```

## Features

- **Sign in with Chutes** via Google, GitHub, Hotkey, or Fingerprint.
- **Dashboard** listing analyzed contracts with overall risk badges (GREEN / AMBER / RED) and flag counts.
- **Contract detail** view tracing six agent stages: Document Parser, Clause Extractor, Risk Scorer, Plain-English Translator, Negotiation Advisor, and Summary Agent.
- **Per-clause analysis**: original text, risk level with reasoning, plain-English explanation, and a suggested rewrite.
- **Upload modal** with drag-and-drop and `.txt` / `.pdf` / `.docx` validation.

## Current limitations

- Contract analyses come from static mock data in `lib/contractData.ts`. There is no live document-analysis backend yet.
- The upload modal validates the file and logs it to the console (`handleUploadSubmit`) but does not upload or process it.
- Sessions are stored as base64-encoded JSON in an `httpOnly` cookie. Base64 is encoding, not encryption — avoid putting anything beyond the access/refresh tokens and basic profile here, and consider signing or encrypting the cookie before production.
- Dashboard routes are not yet guarded server-side; they render regardless of session. Add a session check (e.g. via `getServerSession`) before relying on this for access control.

## License

See [LICENSE](../LICENSE).

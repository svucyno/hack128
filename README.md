# LevelUp LMS

A neon-themed LMS prototype with student and teacher portals, onboarding flows, and an OTP email backend.

## Features
- Intro animation + landing page
- Firebase email/password auth for registration and login
- User profiles stored in Firebase Realtime Database under `users/{uid}`
- Student dashboard + profile
- Teacher dashboard + course builder
- Resend-based email OTP service

## Tech Stack
- React + Vite
- Firebase Auth + Realtime Database
- Node/Express (OTP service)

## Local Setup
```bash
npm install
npm run dev
```

`npm run dev` starts the frontend from `levelup/`.

Frontend Firebase config:
```bash
cp levelup/.env.example levelup/.env
```

Then fill `levelup/.env` with your Firebase project values.

In Firebase Console, enable:
- Authentication > Sign-in method > Email/Password
- Realtime Database

Recommended Realtime Database rules are in `levelup/database.rules.json`.

Server (OTP service):
```bash
npm run dev:server
```

The OTP server expects a `levelup/server/.env` file with at least:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (optional, defaults to `onboarding@resend.dev`)
- `FIREBASE_DATABASE_URL` (if Firebase writes are needed)
- `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_SERVICE_ACCOUNT_FILE` (if Firebase admin is needed)

## Notes
- Secrets are stored in `.env` files and excluded from git.
- Service account JSON is excluded from git.
- Passwords are handled by Firebase Authentication and are not stored in Realtime Database.

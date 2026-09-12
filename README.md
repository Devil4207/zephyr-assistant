# Zephyr Assistant

A browser voice assistant starter with a secure Node.js backend.

## Requirements

- Node.js 18 or newer
- A modern browser
- HTTPS when deployed
- An AI provider API key for real AI responses

## Install

```bash
npm install
```

Copy the environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your new private API key.

Start the application:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

## Important security rules

Never place API keys in:

- `index.html`
- `public/app.js`
- `public/styles.css`
- Any frontend JavaScript file

Only place them in `.env` or your hosting provider's private environment-variable settings.

## Browser microphone requirements

Microphone access works on:

- `localhost`
- HTTPS websites

It usually does not work on ordinary unsecured HTTP hosting.

## Current capabilities

- Browser speech recognition
- Browser speech synthesis
- Multilingual interface
- Website opening commands
- Browser-local memory
- Text chat
- Secure backend AI proxy
- Image-generation endpoint scaffold

## Example commands

- Open YouTube
- Open Gmail
- Open Google Drive
- Open Google Calendar
- Remember that I like jazz
- Remember my favorite color is blue

## Production login

The included login is only a local demonstration. Replace it with:

- Google OAuth
- Auth0
- Clerk
- Firebase Authentication
- Supabase Auth

Do not collect real passwords using the demo form.

## Google Workspace

Real Gmail, Calendar, Drive, Docs, and Sheets actions require:

1. A Google Cloud project
2. OAuth consent configuration
3. OAuth client credentials
4. Requested scopes
5. A backend token-management flow
6. User authorization

Do not request broad Google scopes unless they are necessary.

## Phone control

A website may open links and use browser permissions, but unrestricted phone control requires a native Android/iOS application with platform-specific permissions.

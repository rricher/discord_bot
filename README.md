# Discord Music Bot

A Discord bot that joins voice channels and plays audio from YouTube and SoundCloud URLs. Supports playlists, queuing, and playback controls.

## Commands

| Command | Description |
|---------|-------------|
| `/play <url>` | Play a YouTube or SoundCloud URL in your voice channel. Supports playlists. |
| `/pause` | Pause the current track |
| `/resume` | Resume the paused track |
| `/skip` | Skip to the next track in the queue |
| `/queue` | Show the current queue |
| `/stop` | Stop playback and disconnect from voice |

## Architecture

- **Express** handles Discord HTTP interactions (slash commands)
- **discord.js** gateway client manages voice channel connections
- **yt-dlp** extracts audio streams from YouTube/SoundCloud
- **Deno** is used by yt-dlp for JavaScript signature solving (required for YouTube)
- **@discordjs/voice** handles audio playback

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Docker](https://www.docker.com/) and Docker Compose (for containerized deployment)
- A [Discord application](https://discord.com/developers/applications) with a bot token

## Environment Variables

Create a `.env` file in the project root:

```env
APP_ID=your_discord_app_id
DISCORD_TOKEN=your_bot_token
PUBLIC_KEY=your_discord_app_public_key
```

## Local Development

Install dependencies:

```bash
npm install
```

Register slash commands with Discord:

```bash
npm run register
```

Start the bot:

```bash
npm start
```

The bot listens on port `3000`. Discord requires a public HTTPS endpoint to deliver interactions. Use [ngrok](https://ngrok.com/) to tunnel traffic locally:

```bash
ngrok http 3000
```

Set the **Interactions Endpoint URL** in your [Discord app settings](https://discord.com/developers/applications) to `https://your-ngrok-url.ngrok.io/interactions`.

## Docker

Build and run with Docker Compose:

```bash
docker compose up -d --build
```

The bot expects a `cookies.txt` file (Netscape format) mounted at `/app/cookies.txt` for YouTube authentication. This is required on cloud servers where YouTube bot detection is more aggressive.

```bash
# cookies.txt is mounted via docker-compose.yml volume
# Export from your browser using a cookies.txt extension
```

## Production Deployment (EC2)

The bot is deployed on AWS EC2 behind an nginx reverse proxy that handles SSL automatically via Let's Encrypt.

### Proxy setup

The `proxy` project (lives separately at `~/projects/proxy/`) must be running first:

```bash
cd ~/projects/proxy
docker compose up -d
```

This creates the shared `proxy` Docker network and handles HTTPS for all services.

### Bot deployment

```bash
cd ~/projects/discord_bot
cp .env.example .env   # fill in your credentials
# place cookies.txt in the project root
docker compose up -d --build
```

### CI/CD

Pushing to `main` automatically deploys to EC2 via GitHub Actions. Configure these secrets in your GitHub repository:

| Secret | Value |
|--------|-------|
| `EC2_HOST` | EC2 public IP or hostname |
| `EC2_USER` | SSH username (e.g. `ec2-user`) |
| `EC2_SSH_KEY` | Private SSH key contents |

## Bot Permissions

When adding the bot to a server, it requires:

- `applications.commands`
- `bot` with the following permissions:
  - Connect
  - Speak
  - Send Messages

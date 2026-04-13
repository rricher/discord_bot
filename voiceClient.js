import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
} from '@discordjs/voice';
import { spawn } from 'child_process';
import { existsSync, createWriteStream, chmodSync, statSync } from 'fs';
import { Readable } from 'stream';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const YTDLP = join(__dirname, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

// Auto-download yt-dlp binary on first run
if (!existsSync(YTDLP) || statSync(YTDLP).isDirectory()) {
  console.log('Downloading yt-dlp...');
  const releaseRes = await fetch('https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest', {
    headers: { 'User-Agent': 'discord-music-bot' },
  });
  const release = await releaseRes.json();
  const assetName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp_linux';
  const asset = release.assets.find((a) => a.name === assetName);
  const downloadRes = await fetch(asset.browser_download_url);
  await new Promise((resolve, reject) => {
    const file = createWriteStream(YTDLP);
    Readable.fromWeb(downloadRes.body).pipe(file);
    file.on('finish', resolve);
    file.on('error', reject);
  });
  if (process.platform !== 'win32') chmodSync(YTDLP, '755');
  console.log('yt-dlp ready.');
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// guildId -> { queue: string[], player, connection, current: string|null, aborted: boolean }
const guildData = new Map();

client.once('clientReady', () => {
  console.log(`Voice client ready as ${client.user.tag}`);
});

client.on('error', (err) => console.error('Discord gateway error:', err));

client.login(process.env.DISCORD_TOKEN);

export function getUserVoiceChannel(guildId, userId) {
  const guild = client.guilds.cache.get(guildId);
  return guild?.voiceStates.cache.get(userId)?.channel ?? null;
}

function playNext(guildId) {
  const data = guildData.get(guildId);
  if (!data || data.aborted || data.queue.length === 0) {
    if (data && !data.aborted) {
      data.current = null;
      data.connection.destroy();
      guildData.delete(guildId);
    }
    return;
  }

  const url = data.queue.shift();
  data.current = url;

  const proc = spawn(YTDLP, [
    url,
    '-f', 'bestaudio/best',
    '-o', '-',
    '--no-playlist',
    '-q',
    '--cookies', join(__dirname, 'cookies.txt'),
    '--extractor-args', 'youtube:player_client=tv',
    `--js-runtimes=node:${process.execPath}`,
  ]);
  proc.stderr.on('data', (d) => console.error('yt-dlp:', d.toString().trim()));

  const resource = createAudioResource(proc.stdout);
  data.player.play(resource);
}

export function play(guildId, channel, url) {
  let data = guildData.get(guildId);

  if (!data) {
    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    connection.subscribe(player);
    player.on(AudioPlayerStatus.Idle, () => playNext(guildId));
    player.on('error', (err) => {
      console.error('Player error:', err.message);
      playNext(guildId);
    });

    data = { queue: [], player, connection, current: null, aborted: false };
    guildData.set(guildId, data);
  }

  const isIdle = data.player.state.status === AudioPlayerStatus.Idle;
  data.queue.push(url);

  if (isIdle) {
    playNext(guildId);
    return { nowPlaying: true };
  }

  return { nowPlaying: false, position: data.queue.length };
}

export function stop(guildId) {
  const data = guildData.get(guildId);
  if (!data) return false;
  data.aborted = true;
  data.queue = [];
  guildData.delete(guildId);
  data.player.stop();
  data.connection.destroy();
  return true;
}

export function pause(guildId) {
  const data = guildData.get(guildId);
  if (!data) return false;
  return data.player.pause();
}

export function resume(guildId) {
  const data = guildData.get(guildId);
  if (!data) return false;
  return data.player.unpause();
}

export function skip(guildId) {
  const data = guildData.get(guildId);
  if (!data) return false;
  data.player.stop();
  return true;
}

export function getQueue(guildId) {
  const data = guildData.get(guildId);
  return {
    current: data?.current ?? null,
    queue: [...(data?.queue ?? [])],
  };
}

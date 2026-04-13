import 'dotenv/config';
import express from 'express';
import {
  InteractionResponseType,
  InteractionType,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { DiscordRequest } from './utils.js';
import * as voiceClient from './voiceClient.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  const { type, data } = req.body;

  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "/play <url>" — join voice channel and stream audio
    if (name === 'play') {
      const url = data.options?.find((o) => o.name === 'url')?.value;
      const { guild_id, member, token } = req.body;

      const channel = voiceClient.getUserVoiceChannel(guild_id, member.user.id);
      if (!channel) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'You need to be in a voice channel first.' },
        });
      }

      res.send({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE });

      voiceClient.play(guild_id, channel, url)
        .then(({ nowPlaying, position, count }) => {
          const tracked = count > 1 ? ` (${count} tracks)` : '';
          const msg = nowPlaying
            ? `Now playing${tracked}: ${url}`
            : `Added to queue at position ${position}${tracked}: ${url}`;
          return DiscordRequest(`webhooks/${process.env.APP_ID}/${token}/messages/@original`, {
            method: 'PATCH',
            body: { content: msg },
          });
        })
        .catch((err) => {
          console.error('Play error:', err);
          DiscordRequest(`webhooks/${process.env.APP_ID}/${token}/messages/@original`, {
            method: 'PATCH',
            body: { content: `Failed to play: ${url}` },
          }).catch(console.error);
        });

      return;
    }

    // "/stop" — clear queue and disconnect
    if (name === 'stop') {
      const stopped = voiceClient.stop(req.body.guild_id);
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: stopped ? 'Stopped and disconnected.' : 'Nothing is playing.' },
      });
    }

    // "/pause"
    if (name === 'pause') {
      const ok = voiceClient.pause(req.body.guild_id);
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: ok ? 'Paused.' : 'Nothing is playing.' },
      });
    }

    // "/resume"
    if (name === 'resume') {
      const ok = voiceClient.resume(req.body.guild_id);
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: ok ? 'Resumed.' : 'Nothing is paused.' },
      });
    }

    // "/skip"
    if (name === 'skip') {
      const ok = voiceClient.skip(req.body.guild_id);
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: ok ? 'Skipped.' : 'Nothing is playing.' },
      });
    }

    // "/queue"
    if (name === 'queue') {
      const { current, queue } = voiceClient.getQueue(req.body.guild_id);
      if (!current && queue.length === 0) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'The queue is empty.' },
        });
      }
      const lines = [];
      if (current) lines.push(`**Now playing:** ${current}`);
      if (queue.length > 0) {
        lines.push('**Up next:**');
        queue.forEach((url, i) => lines.push(`${i + 1}. ${url}`));
      }
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: lines.join('\n') },
      });
    }

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});

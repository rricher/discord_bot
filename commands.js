import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

const PLAY_COMMAND = {
  name: 'play',
  description: 'Play audio from a YouTube or SoundCloud URL in your voice channel',
  options: [
    {
      type: 3,
      name: 'url',
      description: 'YouTube or SoundCloud URL',
      required: true,
    },
  ],
  type: 1,
  integration_types: [0],
  contexts: [0],
};

const STOP_COMMAND = {
  name: 'stop',
  description: 'Stop playback and disconnect from voice',
  type: 1,
  integration_types: [0],
  contexts: [0],
};

const PAUSE_COMMAND = {
  name: 'pause',
  description: 'Pause the current track',
  type: 1,
  integration_types: [0],
  contexts: [0],
};

const RESUME_COMMAND = {
  name: 'resume',
  description: 'Resume the paused track',
  type: 1,
  integration_types: [0],
  contexts: [0],
};

const SKIP_COMMAND = {
  name: 'skip',
  description: 'Skip to the next track in the queue',
  type: 1,
  integration_types: [0],
  contexts: [0],
};

const QUEUE_COMMAND = {
  name: 'queue',
  description: 'Show the current queue',
  type: 1,
  integration_types: [0],
  contexts: [0],
};

const ALL_COMMANDS = [
  PLAY_COMMAND,
  STOP_COMMAND,
  PAUSE_COMMAND,
  RESUME_COMMAND,
  SKIP_COMMAND,
  QUEUE_COMMAND,
];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);

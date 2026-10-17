import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AlarmTone } from '../types';

// Map tone IDs to bundled WAV assets
const TONE_ASSETS: Record<Exclude<AlarmTone, 'none'>, any> = {
  radar: require('../../assets/sounds/radar.wav'),
  classic: require('../../assets/sounds/classic.wav'),
  chime: require('../../assets/sounds/chime.wav'),
  bell: require('../../assets/sounds/bell.wav'),
};

export interface ToneOption {
  id: AlarmTone;
  label: string;
  description: string;
  icon: string;
}

export const AVAILABLE_TONES: ToneOption[] = [
  {
    id: 'radar',
    label: 'Urgent Radar',
    description: 'Pulsing frequency chirp designed to pierce through background noise',
    icon: 'radio-outline',
  },
  {
    id: 'classic',
    label: 'Digital Alarm',
    description: 'Crisp electronic alarm beeps reminiscent of classic bedside clocks',
    icon: 'alarm-outline',
  },
  {
    id: 'chime',
    label: 'Gentle Chime',
    description: 'Ascending melodic chime for mindful, stress-free reminders',
    icon: 'musical-notes-outline',
  },
  {
    id: 'bell',
    label: 'Service Bell',
    description: 'Double resonant metallic bell rings that command immediate attention',
    icon: 'notifications-outline',
  },
  {
    id: 'none',
    label: 'Voice / Vibration Only',
    description: 'No tone playback; rely solely on spoken nagging and haptic pulses',
    icon: 'volume-mute-outline',
  },
];

let activePlayer: any = null;
let isAlarmActive = false;
let speechLoopTimer: any = null;
let previewTimer: any = null;

// Voice nagging phrases to randomize or cycle through
const NAG_PHRASES = [
  (title: string) => `Attention! Your task, ${title}, is overdue. Time to get it done!`,
  (title: string) => `Naggy reminder: ${title} needs your attention right now!`,
  (title: string) => `Don't put it off. Complete ${title} today!`,
  (title: string) => `Still waiting on: ${title}. Let's take action!`,
];

/**
 * Configure global audio mode so alarms play clearly even if device is in silent mode
 */
export const configureAudioMode = async (): Promise<void> => {
  try {
    if (Platform.OS !== 'web') {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'duckOthers',
      });
    }
  } catch {
    // Ignore audio mode configuration failure if unsupported
  }
};

/**
 * Start playing the persistent alarm sound and repeating text-to-speech voice nagging
 */
export const startAlarmSoundAndSpeech = async ({
  taskTitle,
  tone = 'radar',
  voiceEnabled = true,
  volume = 1.0,
}: {
  taskTitle: string;
  tone?: AlarmTone;
  voiceEnabled?: boolean;
  volume?: number;
}): Promise<void> => {
  // Always silence prior playback first
  await stopAlarmSoundAndSpeech();

  isAlarmActive = true;
  await configureAudioMode();

  // 1. Start Tone Playback
  if (tone !== 'none' && TONE_ASSETS[tone]) {
    try {
      const asset = TONE_ASSETS[tone];
      activePlayer = createAudioPlayer(asset, {
        updateInterval: 500,
        keepAudioSessionActive: true,
      });

      activePlayer.loop = true;
      activePlayer.volume = Math.max(0, Math.min(1, volume));
      activePlayer.play();
    } catch {
      // Audio playback fallback
    }
  }

  // 2. Start Spoken Nagging
  if (voiceEnabled && taskTitle) {
    let phraseIndex = 0;

    const speakNextNag = () => {
      if (!isAlarmActive) return;

      const getPhrase = NAG_PHRASES[phraseIndex % NAG_PHRASES.length];
      const spokenText = getPhrase(taskTitle);
      phraseIndex++;

      try {
        Speech.speak(spokenText, {
          rate: 0.95,
          pitch: 1.05,
          volume: Math.max(0.1, Math.min(1, volume)),
          onDone: () => {
            if (isAlarmActive) {
              // Wait 10 seconds before nagging again
              speechLoopTimer = setTimeout(speakNextNag, 10000);
            }
          },
          onError: () => {
            if (isAlarmActive) {
              speechLoopTimer = setTimeout(speakNextNag, 12000);
            }
          },
        });
      } catch {
        // Speech synthesis failed or unsupported
      }
    };

    // Begin speaking after a brief 1.5s delay to let the initial alarm tone ring
    speechLoopTimer = setTimeout(speakNextNag, 1500);
  }
};

/**
 * Immediately stop all tone playback, voice nagging, and timers
 */
export const stopAlarmSoundAndSpeech = async (): Promise<void> => {
  isAlarmActive = false;

  if (speechLoopTimer) {
    clearTimeout(speechLoopTimer);
    speechLoopTimer = null;
  }

  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }

  // Stop Text-to-speech
  try {
    await Speech.stop();
  } catch {
    // Ignore speech stop errors
  }

  // Stop and release AudioPlayer
  if (activePlayer) {
    try {
      activePlayer.pause();
      if (typeof activePlayer.remove === 'function') {
        activePlayer.remove();
      }
    } catch {
      // Ignore player release errors
    } finally {
      activePlayer = null;
    }
  }
};

/**
 * Play a short 3-second preview of an alarm tone (used in Settings)
 */
export const previewAlarmTone = async (tone: AlarmTone, volume = 1.0): Promise<void> => {
  await stopAlarmSoundAndSpeech();

  if (tone === 'none' || !TONE_ASSETS[tone]) return;

  try {
    await configureAudioMode();
    const asset = TONE_ASSETS[tone];
    activePlayer = createAudioPlayer(asset, { keepAudioSessionActive: false });
    activePlayer.loop = true;
    activePlayer.volume = Math.max(0, Math.min(1, volume));
    activePlayer.play();

    previewTimer = setTimeout(async () => {
      await stopAlarmSoundAndSpeech();
    }, 3000);
  } catch {
    // Audio preview failed
  }
};

/**
 * Speak a short voice nagging sample (used in Settings)
 */
export const previewVoiceNag = async (taskTitle = 'Pay electricity bill', volume = 1.0): Promise<void> => {
  await stopAlarmSoundAndSpeech();

  try {
    Speech.speak(`Attention! Your task, ${taskTitle}, is overdue. Time to get it done!`, {
      rate: 0.95,
      pitch: 1.05,
      volume: Math.max(0.1, Math.min(1, volume)),
    });
  } catch {
    // Speech preview failed
  }
};

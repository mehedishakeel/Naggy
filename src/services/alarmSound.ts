import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AlarmTone, NaggyPersona } from '../types';

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

export interface PersonaOption {
  id: NaggyPersona;
  label: string;
  tagline: string;
  description: string;
  icon: string;
}

export const AVAILABLE_PERSONAS: PersonaOption[] = [
  {
    id: 'coach',
    label: 'Friendly Coach',
    tagline: 'Upbeat & Motivating',
    description: 'Empowering nudges that celebrate your momentum and keep you focused',
    icon: 'fitness-outline',
  },
  {
    id: 'mom',
    label: 'Sarcastic Mom',
    tagline: 'Playful Guilt-Trips',
    description: 'Loving guilt-trips and witty banter that make procrastination impossible',
    icon: 'heart-half-outline',
  },
  {
    id: 'sergeant',
    label: 'Drill Sergeant',
    tagline: 'Zero Excuses',
    description: 'Urgent, high-command directives designed to shock you into rapid execution',
    icon: 'shield-outline',
  },
];

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

// Persona-driven spoken phrase collections
export const PERSONA_PHRASES: Record<NaggyPersona, ((title: string) => string)[]> = {
  coach: [
    (title: string) => `You've got this! Time to tackle: ${title}. Let's make today count!`,
    (title: string) => `Friendly nudge: ${title} is ready for you. Knock it out and feel great!`,
    (title: string) => `Focus mode! Complete ${title} right now and keep your streak alive!`,
    (title: string) => `Champions take action. Finish ${title} and conquer the day!`,
  ],
  mom: [
    (title: string) => `Still haven't done ${title}? I'm not mad, I'm just disappointed.`,
    (title: string) => `Oh, look who's ignoring ${title} again! Do I have to do everything myself?`,
    (title: string) => `You said you'd do ${title} an hour ago. Put the phone down and get to it!`,
    (title: string) => `Don't make me tell you twice. Finish ${title} right now!`,
  ],
  sergeant: [
    (title: string) => `ATTENTION! Task ${title} is OVERDUE! DROP AND COMPLETE IT NOW!`,
    (title: string) => `NO EXCUSES! Move your hands and execute ${title} immediately!`,
    (title: string) => `DO YOU HEAR ME?! Task ${title} requires combat focus! EXECUTE!`,
    (title: string) => `MISSION CRITICAL: ${title} will NOT complete itself! MOVE, MOVE, MOVE!`,
  ],
};

const PERSONA_VOICE_CONFIGS: Record<NaggyPersona, { rate: number; pitch: number }> = {
  coach: { rate: 0.98, pitch: 1.08 },
  mom: { rate: 0.92, pitch: 1.15 },
  sergeant: { rate: 1.08, pitch: 0.88 },
};

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
  persona = 'coach',
}: {
  taskTitle: string;
  tone?: AlarmTone;
  voiceEnabled?: boolean;
  volume?: number;
  persona?: NaggyPersona;
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

  // 2. Start Spoken Nagging with selected Persona
  if (voiceEnabled && taskTitle) {
    let phraseIndex = 0;
    const phrases = PERSONA_PHRASES[persona] || PERSONA_PHRASES.coach;
    const voiceConfig = PERSONA_VOICE_CONFIGS[persona] || PERSONA_VOICE_CONFIGS.coach;

    const speakNextNag = () => {
      if (!isAlarmActive) return;

      const getPhrase = phrases[phraseIndex % phrases.length];
      const spokenText = getPhrase(taskTitle);
      phraseIndex++;

      try {
        Speech.speak(spokenText, {
          rate: voiceConfig.rate,
          pitch: voiceConfig.pitch,
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
 * Speak a short voice nagging sample based on selected Persona (used in Settings)
 */
export const previewVoiceNag = async (
  taskTitle = 'Review project proposal',
  volume = 1.0,
  persona: NaggyPersona = 'coach'
): Promise<void> => {
  await stopAlarmSoundAndSpeech();

  const phrases = PERSONA_PHRASES[persona] || PERSONA_PHRASES.coach;
  const samplePhrase = phrases[0](taskTitle);
  const voiceConfig = PERSONA_VOICE_CONFIGS[persona] || PERSONA_VOICE_CONFIGS.coach;

  try {
    Speech.speak(samplePhrase, {
      rate: voiceConfig.rate,
      pitch: voiceConfig.pitch,
      volume: Math.max(0.1, Math.min(1, volume)),
    });
  } catch {
    // Speech preview failed
  }
};

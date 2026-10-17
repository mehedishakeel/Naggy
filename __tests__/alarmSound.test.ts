import * as Speech from 'expo-speech';
import { createAudioPlayer } from 'expo-audio';
import {
  AVAILABLE_TONES,
  startAlarmSoundAndSpeech,
  stopAlarmSoundAndSpeech,
  previewAlarmTone,
  previewVoiceNag,
} from '../src/services/alarmSound';

describe('Alarm Sound & Voice Nagging Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(async () => {
    await stopAlarmSoundAndSpeech();
    jest.useRealTimers();
  });

  test('AVAILABLE_TONES has required tone definitions including silent/voice-only', () => {
    const ids = AVAILABLE_TONES.map((t) => t.id);
    expect(ids).toContain('radar');
    expect(ids).toContain('classic');
    expect(ids).toContain('chime');
    expect(ids).toContain('bell');
    expect(ids).toContain('none');
  });

  test('startAlarmSoundAndSpeech starts tone audio player and speaks task title', async () => {
    await startAlarmSoundAndSpeech({
      taskTitle: 'Pay Rent Now',
      tone: 'radar',
      voiceEnabled: true,
      volume: 0.8,
    });

    expect(createAudioPlayer).toHaveBeenCalled();
    const mockPlayer = (createAudioPlayer as jest.Mock).mock.results[0].value;
    expect(mockPlayer.loop).toBe(true);
    expect(mockPlayer.volume).toBe(0.8);
    expect(mockPlayer.play).toHaveBeenCalled();

    // Advance fake timer to trigger the initial speech delay (1500ms)
    jest.advanceTimersByTime(1600);

    expect(Speech.speak).toHaveBeenCalledWith(
      expect.stringContaining('Pay Rent Now'),
      expect.objectContaining({
        volume: 0.8,
      })
    );
  });

  test('startAlarmSoundAndSpeech skips audio player when tone is none', async () => {
    await startAlarmSoundAndSpeech({
      taskTitle: 'Silent Task',
      tone: 'none',
      voiceEnabled: true,
      volume: 1.0,
    });

    expect(createAudioPlayer).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1600);
    expect(Speech.speak).toHaveBeenCalledWith(
      expect.stringContaining('Silent Task'),
      expect.anything()
    );
  });

  test('stopAlarmSoundAndSpeech halts player and speech synthesis immediately', async () => {
    await startAlarmSoundAndSpeech({
      taskTitle: 'Urgent meeting',
      tone: 'bell',
      voiceEnabled: true,
      volume: 1.0,
    });

    const mockPlayer = (createAudioPlayer as jest.Mock).mock.results[0].value;

    await stopAlarmSoundAndSpeech();

    expect(mockPlayer.pause).toHaveBeenCalled();
    expect(mockPlayer.remove).toHaveBeenCalled();
    expect(Speech.stop).toHaveBeenCalled();
  });

  test('previewAlarmTone starts preview and auto-stops after timer', async () => {
    await previewAlarmTone('chime', 0.5);

    expect(createAudioPlayer).toHaveBeenCalled();
    const mockPlayer = (createAudioPlayer as jest.Mock).mock.results[0].value;
    expect(mockPlayer.play).toHaveBeenCalled();

    // Advance 3100ms
    await jest.advanceTimersByTimeAsync(3100);

    expect(mockPlayer.pause).toHaveBeenCalled();
  });

  test('previewVoiceNag invokes Speech.speak with sample title', async () => {
    await previewVoiceNag('Review pull request', 0.9);

    expect(Speech.speak).toHaveBeenCalledWith(
      expect.stringContaining('Review pull request'),
      expect.objectContaining({
        volume: 0.9,
      })
    );
  });
});

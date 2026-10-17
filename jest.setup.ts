jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', granted: true, canAskAgain: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', granted: true, canAskAgain: true }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('test-notification-id'),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  dismissNotificationAsync: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(),
  getPresentedNotificationsAsync: jest.fn().mockResolvedValue([]),
  AndroidNotificationPriority: { MAX: 'max', HIGH: 'high', DEFAULT: 'default', LOW: 'low', MIN: 'min' },
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock('expo-file-system', () => ({
  Paths: { document: '/mock/documents' },
  File: jest.fn().mockImplementation(() => ({
    exists: false,
    create: jest.fn(),
    write: jest.fn(),
    delete: jest.fn(),
    uri: 'file:///mock/documents/test.json',
  })),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (obj: any) => obj.ios },
  AppState: { addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }) },
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn().mockReturnValue({
    execSync: jest.fn(),
    getFirstSync: jest.fn(),
    getAllSync: jest.fn().mockReturnValue([]),
    runSync: jest.fn(),
    withTransactionSync: jest.fn((cb: any) => cb()),
  }),
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    name: 'Naggy',
    version: '1.0.2',
  },
}));

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
  isSpeakingAsync: jest.fn().mockResolvedValue(false),
  getAvailableVoicesAsync: jest.fn().mockResolvedValue([]),
}));

jest.mock('expo-audio', () => {
  const mockPlayer = {
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    loop: false,
    volume: 1.0,
    playing: false,
  };
  return {
    createAudioPlayer: jest.fn(() => mockPlayer),
    useAudioPlayer: jest.fn(() => mockPlayer),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  };
});


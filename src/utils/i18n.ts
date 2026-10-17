export type Language = 'en' | 'bn';

export const translations = {
  en: {
    // Brand
    appName: 'Naggy',
    tagline: 'We nag. You get things done.',

    // Onboarding
    onboardingTitle1: 'Never forget what matters',
    onboardingDesc1: 'Daily routines, medications, habits, and deadlines handled effortlessly.',
    onboardingTitle2: 'Persistent reminders that actually work',
    onboardingDesc2: 'Dismissing is not finishing. Naggy keeps nagging until you mark the task done.',
    onboardingTitle3: 'Pure simplicity, zero fluff',
    onboardingDesc3: 'No complicated dashboards or gamification. Just pure, focused execution.',
    getStarted: 'Get Started',
    skip: 'Skip',
    enableNotifications: 'Enable Notifications',
    notificationsExplained: 'Naggy requires notification permission to remind you when tasks are due and keep nudging you until complete.',
    permissionGranted: 'Notifications are enabled',
    permissionDenied: 'Notifications are disabled. Tap to configure in settings.',

    // Tabs & Navigation
    tabToday: 'Today',
    tabAgenda: 'Agenda',
    tabInbox: 'Lists',
    tabSettings: 'Settings',

    // Home / Today
    greetingMorning: 'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening: 'Good evening',
    overdue: 'Overdue',
    today: 'Today',
    laterToday: 'Later Today',
    upcoming: 'Upcoming',
    completed: 'Completed',
    noTasksToday: 'No tasks scheduled for today',
    noTasksTodaySub: 'Enjoy your free time, or tap + to plan ahead.',
    allDone: 'All clear! Great job today 🎉',
    dailyProgress: 'Daily Progress',

    // Task Actions
    addTask: 'Add Task',
    createTask: 'New Task',
    editTask: 'Edit Task',
    taskDetails: 'Task Details',
    quickAddPlaceholder: 'What needs to get done? (e.g. Exercise every day at 6pm)',
    titlePlaceholder: 'Task title',
    notesPlaceholder: 'Add notes or details...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    duplicate: 'Duplicate',
    snooze: 'Snooze',
    reschedule: 'Reschedule',
    markDone: 'Done',
    reopen: 'Reopen',
    undo: 'Undo',
    taskCompletedUndo: 'Task completed',
    taskDeletedUndo: 'Task deleted',

    // Priorities
    priorityNone: 'None',
    priorityLow: 'Low',
    priorityNormal: 'Normal',
    priorityHigh: 'High',
    priorityUrgent: 'Urgent',

    // Recurrence
    repeat: 'Repeat',
    repeatNone: 'Does not repeat',
    repeatDaily: 'Every day',
    repeatWeekdays: 'Every weekday (Mon-Fri)',
    repeatWeekends: 'Every weekend (Sat-Sun)',
    repeatWeekly: 'Every week',
    repeatMonthly: 'Every month',
    repeatYearly: 'Every year',
    repeatCustom: 'Custom...',
    thisOccurrenceOnly: 'This occurrence only',
    allOccurrences: 'All occurrences in series',
    recurrenceSeriesAlert: 'This is a recurring task. How would you like to apply your change?',

    // Persistent Reminders
    reminders: 'Reminders',
    nagInterval: 'Nagging Interval',
    remindAtDue: 'At due time',
    intervalNone: 'Off',
    interval5m: 'Every 5 minutes',
    interval10m: 'Every 10 minutes',
    interval15m: 'Every 15 minutes',
    interval30m: 'Every 30 minutes',
    interval60m: 'Every 60 minutes',
    escalateReminders: 'Escalate frequency if ignored',
    escalateDesc: 'Reminds more frequently after 1 hour of being overdue',
    snoozeOptions: 'Snooze for',
    snooze5m: '5 minutes',
    snooze15m: '15 minutes',
    snooze30m: '30 minutes',
    snooze1h: '1 hour',
    snoozeTomorrow: 'Tomorrow morning',

    // Subtasks
    subtasks: 'Subtasks',
    addSubtask: 'Add a subtask...',

    // Lists
    lists: 'Lists',
    inbox: 'Inbox',
    newList: 'New List',
    editList: 'Edit List',
    deleteList: 'Delete List',
    deleteListConfirm: 'Do you want to delete this list and all its tasks, or move the tasks to Inbox?',
    deleteListWithTasks: 'Delete List & Tasks',
    moveTasksToInbox: 'Move Tasks to Inbox',

    // Search
    search: 'Search',
    searchPlaceholder: 'Search tasks, notes, lists...',
    noSearchResults: 'No matching tasks found',

    // Settings
    settings: 'Settings',
    appearance: 'Appearance',
    themeSystem: 'System default',
    themeLight: 'Light',
    themeDark: 'Dark',
    notifications: 'Notifications',
    persistentReminders: 'Persistent Nagging',
    defaultInterval: 'Default Nag Interval',
    defaultSnooze: 'Default Snooze',
    quietHours: 'Quiet Hours',
    quietHoursDesc: 'Pause persistent reminders during sleep hours',
    missedPolicy: 'Missed Recurring Policy',
    missedKeepOverdue: 'Keep as overdue',
    missedSkip: 'Skip to next occurrence',
    missedRescheduleToday: 'Reschedule for today',
    dataPortability: 'Data & Backup',
    exportBackup: 'Export Backup (JSON)',
    exportCSV: 'Export Tasks to CSV',
    importBackup: 'Import Backup (JSON)',
    importConfirm: 'This will merge or restore tasks from backup. Proceed?',
    clearCompleted: 'Clear Completed Tasks',
    clearCompletedConfirm: 'Are you sure you want to permanently delete all completed tasks?',
    resetAllData: 'Reset All Data',
    resetWarning: 'This will delete all tasks, lists, and settings. This cannot be undone.',
    about: 'About',
    version: 'Version',
    openSourceLicenses: 'Open-Source Licenses',
    privacyPolicy: 'Privacy & Security (Local-First)',
    privacyDesc: 'Naggy stores all data locally on your device. No cloud sync, no tracking, no ads.',
  },
  bn: {
    // Bangla translations
    appName: 'Naggy',
    tagline: 'আমরা মনে করিয়ে দেব। আপনি কাজ শেষ করবেন।',
    onboardingTitle1: 'গুরুত্বপূর্ণ দায়িত্ব কখনো ভুলবেন না',
    onboardingDesc1: 'নিয়মিত রুটিন, ওষুধ, অভ্যাস এবং সময়সীমা সহজে সামলান।',
    onboardingTitle2: 'স্থায়ী রিমাইন্ডার যা সত্যিই কাজ করে',
    onboardingDesc2: 'নোটিফিকেশন সরিয়ে দিলে কাজ শেষ হয় না। যতক্ষণ না সম্পন্ন করছেন, নাগি মনে করাবে।',
    onboardingTitle3: 'পরম সরলতা',
    onboardingDesc3: 'কোনো বাড়তি ঝামেলা নেই। কেবল সরাসরি কাজের অগ্রগতি।',
    getStarted: 'শুরু করুন',
    skip: 'এড়িয়ে যান',
    enableNotifications: 'নোটিফিকেশন চালু করুন',
    tabToday: 'আজ',
    tabAgenda: 'এজেন্ডা',
    tabInbox: 'তালিকা',
    tabSettings: 'সেটিংস',
    greetingMorning: 'শুভ সকাল',
    greetingAfternoon: 'শুভ দুপুর',
    greetingEvening: 'শুভ সন্ধ্যা',
    overdue: 'বাকি পড়ে আছে',
    today: 'আজ',
    laterToday: 'আজকের পরে',
    upcoming: 'আসন্ন',
    completed: 'সম্পন্ন',
    noTasksToday: 'আজকের কোনো কাজ নির্ধারিত নেই',
    allDone: 'সব কাজ শেষ! চমৎকার! 🎉',
    dailyProgress: 'আজকের অগ্রগতি',
    addTask: 'কাজ যোগ করুন',
    createTask: 'নতুন কাজ',
    editTask: 'সম্পাদনা করুন',
    taskDetails: 'কাজের বিবরণ',
    quickAddPlaceholder: 'কী করতে চান? (যেমন: প্রতিদিন সন্ধ্যা ৬টায় ব্যায়াম)',
    titlePlaceholder: 'কাজের শিরোনাম',
    notesPlaceholder: 'নোট বা বিবরণ লিখুন...',
    save: 'সংরক্ষণ',
    cancel: 'বাতিল',
    delete: 'মুছে ফেলুন',
    duplicate: 'অনুলিপি',
    snooze: 'স্নুজ',
    reschedule: 'পুনঃনির্ধারণ',
    markDone: 'সম্পন্ন',
    reopen: 'পুনরায় চালু',
    undo: 'পূর্বাবস্থায় ফেরান',
    priorityNone: 'নেই',
    priorityLow: 'কম',
    priorityNormal: 'সাধারণ',
    priorityHigh: 'বেশি',
    priorityUrgent: 'জরুরি',
    repeat: 'পুনরাবৃত্তি',
    reminders: 'রিমাইন্ডার',
    search: 'অনুসন্ধান',
    settings: 'সেটিংস',
    appearance: 'আবির্ভাব',
    notifications: 'নোটিফিকেশন',
    dataPortability: 'ডাটা ও ব্যাকআপ',
    about: 'সম্পর্কে',
  },
};

let currentLanguage: Language = 'en';

export const setLanguage = (lang: Language) => {
  currentLanguage = lang;
};

export const getLanguage = (): Language => {
  return currentLanguage;
};

export const t = (key: keyof typeof translations.en): string => {
  const dict = translations[currentLanguage] || translations.en;
  return (dict as any)[key] || translations.en[key] || String(key);
};

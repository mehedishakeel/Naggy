<div align="center">

  <img src="assets/logo.png" alt="Naggy Logo" width="108" height="108" style="border-radius: 24px; box-shadow: 0 8px 24px rgba(255, 90, 69, 0.25);" />

  # Naggy

  **We nag. You get things done.**

  A minimalist, persistent to-do app with full-screen alarms and persistent notifications.<br />
  Designed for people who postpone, snooze, or forget ordinary reminders.

  [![Release](https://img.shields.io/badge/Release-v1.0-FF5A43.svg)](https://github.com/mehedishakeel/Naggy/releases/latest)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-brightgreen.svg)](#)
  [![Expo](https://img.shields.io/badge/Expo-SDK%2057-000.svg?logo=expo)](https://expo.dev)
  [![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB.svg?logo=react)](https://reactnative.dev)
  [![Tests](https://img.shields.io/badge/Tests-49%20Passed-success.svg)](__tests__/)
  [![GitHub Pages](https://img.shields.io/badge/Website-Live-FF5A43.svg)](https://mehedishakeel.github.io/Naggy/)

  <br />

  <p align="center">
    <a href="https://github.com/mehedishakeel/Naggy/releases/latest"><b>📥 Download Latest APK</b></a> •
    <a href="https://mehedishakeel.github.io/Naggy/"><b>🌐 Visit Website</b></a> •
    <a href="#-quick-start-for-developers"><b>🛠 Developer Guide</b></a> •
    <a href="#-the-signature-feature-persistent-nagging"><b>⏰ The Nag Engine</b></a>
  </p>

</div>

---

## 📖 Table of Contents

- [The Defining Principle](#-the-defining-principle)
- [Key Features](#-key-features)
- [How to Install (Android APK)](#-how-to-install-android-apk)
- [In-App GitHub Updates](#-in-app-github-updates)
- [The Nag Engine (How It Works)](#-the-signature-feature-persistent-nagging)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Quick Start for Developers](#-quick-start-for-developers)
- [Running Tests & QA](#-running-tests--qa)
- [Building the Android APK](#-building-the-android-apk)
- [Privacy & Data Ownership](#-privacy--data-ownership)
- [Contributing & License](#-contributing--license)

---

## 🎯 The Defining Principle

Standard reminder apps show one notification. You swipe it away, forget, and the task disappears forever. Naggy is built on an uncompromising rule:

> **Dismissal is not completion.**<br />
> **Opening a notification is not completion.**<br />
> **Snoozing is not completion.**<br />
> **A task remains incomplete until you explicitly complete it.**

When a task reaches its scheduled time, Naggy continues nudging you according to your configured reminder interval (1m, 2m, 5m, 10m, 15m, 30m, 60m) until you explicitly check it off.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 🚨 **Full-Screen Alarm Nagging** | Wakes your screen like an alarm clock with pulsating halos, tactile haptics, and instant action buttons (`✓ Mark as Done`, `Snooze`, `Dismiss`). |
| 🔁 **Custom Nag Intervals** | Set persistence from rapid testing (`1m`, `2m`) to standard schedules (`5m`, `15m`, `30m`, `1h`). |
| ⏰ **Exact Time Assignment** | Pick exact due times with interactive steppers (`-` / `+`), quick presets (09:00, 12:00, 18:00, 21:00), or offset chips (`+1m`, `+5m`, `+1h`). |
| 💬 **Natural Language Fast-Add** | Type *"Take vitamins in 5 minutes"* or *"Pay electricity bill tomorrow at 10 AM"* to auto-populate dates, times, and recurrences. |
| 🔄 **Intelligent Recurrence** | Daily, Weekdays, Weekends, Weekly, Monthly, and Yearly schedules that **only advance** after verified completion. |
| 🚀 **In-App GitHub Updates** | Check for updates directly inside **Settings > About & Updates** and download new APKs with one tap. |
| 🔒 **100% Local-First SQLite** | Zero accounts, zero analytics, zero cloud lock-in. Complete offline privacy. |
| 📦 **Data Portability** | One-tap JSON backup/restore and human-readable CSV spreadsheet export. |
| 🎨 **Refined Minimalist Design** | Things- & Linear-inspired calm palette, dark mode support, and fluid animations. |

---

## 📥 How to Install (Android APK)

Naggy can be installed directly on any Android device running Android 8.0+:

1. **Download:** Grab the latest `Naggy.apk` or `Naggy-v1.0.4.apk` from [GitHub Releases](https://github.com/mehedishakeel/Naggy/releases/latest).
2. **Open:** Open the downloaded `.apk` file from your browser downloads or file manager.
3. **Allow Installation:** If prompted with *"For your security, your phone is not allowed to install unknown apps from this source"*, tap **Settings** and enable **"Allow from this source"**.
4. **Grant Permissions:** Launch Naggy and allow **Notification** and **Alarm** permissions so persistent alerts can wake your screen.

---

## 🚀 In-App GitHub Updates

Naggy has a built-in update engine connected to GitHub Releases:

1. Open **Settings** tab.
2. Scroll to the **About & Updates** card.
3. Tap **"Check for App Updates"**.
4. If a newer release is found, Naggy will display the release notes and a direct **"Download APK"** button that downloads the update immediately.

---

## ⏰ The Signature Feature: Persistent Nagging

### Rolling Window Scheduler & OS Limits
Mobile operating systems strictly enforce background execution limits:
- **iOS:** Enforces a hard limit of 64 scheduled local notifications per application.
- **Android:** Subject to battery optimization (Doze mode), notification importance channels, and exact alarm quotas.

To guarantee high delivery reliability without hitting system quotas:
1. **Rolling Window Batches:** Naggy dynamically computes and schedules a rolling batch of reminders for the most urgent tasks.
2. **Foreground & Event Reconciliation:** Every time the app launches, returns to the foreground, or task state changes, Naggy reconciles its schedule: obsolete triggers are canceled, delivered shade banners are dismissed, and rolling batches are replenished.
3. **Notification Shade Dismissal:** When you complete or delete a task, Naggy removes any visible notifications from your Android shade/tray immediately.

---

## 🏗 Architecture & Tech Stack

```
Naggy/
├── src/
│   ├── app/                      # Expo Router screens & layouts
│   │   ├── (tabs)/
│   │   │   ├── index.tsx         # Today / Home view with overdue & nag triggers
│   │   │   ├── agenda.tsx        # 14-day Agenda timeline
│   │   │   ├── inbox.tsx         # Lists, tags, and category manager
│   │   │   └── settings.tsx      # Preferences, backup, & update checker
│   │   ├── task/
│   │   │   ├── new.tsx           # Quick-add & full task creation with steppers
│   │   │   └── [id].tsx          # Task details, checklist, & alarm preview
│   │   ├── alarm.tsx             # Standalone Full-Screen Alarm route
│   │   └── _layout.tsx           # Global providers & FullScreenAlarmModal mount
│   ├── components/               # Reusable UI components
│   │   ├── FullScreenAlarmModal.tsx # Full-screen pulsating alarm screen
│   │   ├── TaskItem.tsx          # Interactive task row with checkboxes
│   │   ├── QuickAddBar.tsx       # Natural-language quick input bar
│   │   └── ProgressBar.tsx       # Daily completion progress indicator
│   ├── context/                  # Application state
│   │   ├── TaskContext.tsx       # Task actions, undo stack, & SQLite bridge
│   │   ├── NotificationContext.tsx # Foreground alarms & notification listeners
│   │   ├── ThemeContext.tsx      # Dynamic light/dark styling
│   │   └── SettingsContext.tsx   # User configuration persistence
│   ├── database/                 # SQLite persistence layer
│   │   └── index.ts              # SQLite queries, indexes, and migrations
│   ├── services/                 # Native service integrations
│   │   ├── notifications.ts      # Bounded notification scheduler & channels
│   │   └── updates.ts            # GitHub Releases API semver checker
│   └── utils/                    # Pure domain logic
│       ├── date.ts               # Date math, relative descriptions, steppers
│       ├── nlp.ts                # Natural language parser (+1h, in 5m, etc.)
│       ├── recurrence.ts         # Recurrence calculation engine
│       └── backup.ts             # JSON and CSV export/import validators
├── docs/                         # GitHub Pages static landing website
│   ├── index.html                # Single-page website
│   ├── styles.css                # Responsive stylesheet
│   └── app.js                    # Interactive live phone simulator
├── __tests__/                    # Automated Jest Unit Test Suite (33 tests)
├── .github/workflows/
│   └── release-apk.yml           # Automated Android APK build & GitHub Release CI
└── app.json                      # Expo configuration & native permissions
```

---

## 🛠 Quick Start for Developers

### Prerequisites
- **Node.js** (v18 or newer)
- **npm** or **bun**
- (Optional) **Android Studio** / **Xcode** if testing native development builds locally

### Installation
```bash
# Clone the repository
git clone https://github.com/mehedishakeel/Naggy.git
cd Naggy

# Install dependencies
npm install
```

### Running the Dev Server
```bash
# Start Expo development server
npx expo start

# Run on Android emulator / device
npx expo start --android

# Run on iOS simulator
npx expo start --ios

# Run on Web browser
npx expo start --web
```

---

## 🧪 Running Tests & QA

Naggy maintains a comprehensive test suite covering recurrence rules, natural-language parsing, backup schemas, version comparison, and notification schedules.

```bash
# Run unit tests (Jest)
npm test

# Run strict TypeScript typecheck
npx tsc --noEmit

# Run ESLint validation
npx eslint src

# Run Expo configuration diagnostics
npx expo-doctor
```

---

## 🤖 Building the Android APK

### Automated Cloud Builds (GitHub Actions)
Every time a new tag (e.g. `v1.0.4`) is pushed to `master`, GitHub Actions automatically runs `.github/workflows/release-apk.yml`:
1. Sets up JDK 17 and Gradle.
2. Runs tests and typechecks.
3. Generates native code via `npx expo prebuild --platform android`.
4. Compiles the APK via `./gradlew assembleRelease`.
5. Uploads `Naggy.apk` directly to GitHub Releases.

### Local APK Build
If you have the Android SDK installed locally:
```bash
# 1. Prebuild Android native project
npx expo prebuild --platform android

# 2. Build Release APK with Gradle
cd android
./gradlew assembleRelease

# 3. Locate the compiled APK at:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## 🔒 Privacy & Data Ownership

- **100% Local-First:** Your data never leaves your device. All tasks, notes, checklists, and preferences live exclusively inside your private SQLite database.
- **Zero Third-Party Trackers:** No analytics SDKs, advertising frameworks, or cloud tracking.
- **Full Data Ownership:** Export your entire database to JSON or CSV at any time from **Settings > Data & Storage**.

---

## 📄 Contributing & License

Contributions, bug reports, and suggestions are welcome!

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with ❤️ using React Native and Expo.</sub><br />
  <sub><b>Naggy</b> — We nag. You get things done.</sub>
</div>

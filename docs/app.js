// Naggy Landing Page Interactivity
document.addEventListener('DOMContentLoaded', () => {
  // 1. Theme Management (Light / Dark)
  const themeToggle = document.getElementById('theme-toggle');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem('naggy_theme');

  const currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeIcon(currentTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const active = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', active);
      localStorage.setItem('naggy_theme', active);
      updateThemeIcon(active);
    });
  }

  function updateThemeIcon(theme) {
    if (!themeToggle) return;
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  }

  // 2. Interactive Phone Simulator
  const triggerAlarmBtn = document.getElementById('sim-trigger-alarm');
  const alarmOverlay = document.getElementById('alarm-overlay');
  const alarmCompleteBtn = document.getElementById('alarm-complete-btn');
  const alarmSnoozeBtn = document.getElementById('alarm-snooze-btn');
  const alarmDismissBtn = document.getElementById('alarm-dismiss-btn');
  const dismissToast = document.getElementById('dismiss-toast');
  const dismissToastText = document.getElementById('dismiss-toast-text');
  const taskCards = document.querySelectorAll('.task-card');

  // Trigger Full Screen Alarm Modal
  if (triggerAlarmBtn && alarmOverlay) {
    triggerAlarmBtn.addEventListener('click', () => {
      alarmOverlay.classList.add('active');
    });
  }

  // Alarm Actions
  if (alarmCompleteBtn) {
    alarmCompleteBtn.addEventListener('click', () => {
      alarmOverlay.classList.remove('active');
      const medTask = document.getElementById('task-med');
      if (medTask) {
        medTask.classList.add('completed');
      }
      showToast('🎉 Task completed! All nagging notifications cleared.');
    });
  }

  if (alarmSnoozeBtn) {
    alarmSnoozeBtn.addEventListener('click', () => {
      alarmOverlay.classList.remove('active');
      showToast('💤 Snoozed for 10 minutes. Naggy will resume soon.');
    });
  }

  if (alarmDismissBtn) {
    alarmDismissBtn.addEventListener('click', () => {
      alarmOverlay.classList.remove('active');
      showToast('⚠️ Dismissed ≠ Done! Naggy will nag again in 5 minutes.');
    });
  }

  // Task Card Click (Toggle completed)
  taskCards.forEach((card) => {
    card.addEventListener('click', (e) => {
      // Toggle completion state
      card.classList.toggle('completed');
    });
  });

  function showToast(message) {
    if (!dismissToast || !dismissToastText) return;
    dismissToastText.textContent = message;
    dismissToast.classList.add('show');
    setTimeout(() => {
      dismissToast.classList.remove('show');
    }, 4500);
  }
});

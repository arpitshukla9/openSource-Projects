/**
 * CodePulse Dashboard - Webview Script
 */

// Get VSCode API
const vscode = acquireVsCodeApi();

// Chart instances
let weeklyChart = null;
let languageChart = null;

// Auto-refresh interval
let refreshInterval = null;

// DOM elements
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const saveGoalsBtn = document.getElementById('save-goals-btn');
const pauseThresholdSlider = document.getElementById('pause-threshold');
const pauseThresholdValue = document.getElementById('pause-threshold-value');

// Event listeners
settingsBtn.addEventListener('click', () => {
  const isVisible = settingsPanel.style.display !== 'none';
  settingsPanel.style.display = isVisible ? 'none' : 'block';
});

pauseThresholdSlider.addEventListener('input', (e) => {
  pauseThresholdValue.textContent = e.target.value + 's';
});

saveGoalsBtn.addEventListener('click', saveSettings);

// Listen for messages from extension
window.addEventListener('message', (event) => {
  const message = event.data;

  switch (message.type) {
    case 'statsUpdate':
      updateDashboard(message.payload);
      break;
    case 'goalsUpdated':
      loadSettings();
      break;
    case 'settingsUpdate':
      populateSettings(message.payload);
      break;
  }
});

// Request initial stats on load
window.addEventListener('load', () => {
  vscode.postMessage({ type: 'requestStats' });
  startAutoRefresh();

  // Auto-request every 5 seconds
  refreshInterval = setInterval(() => {
    vscode.postMessage({ type: 'requestStats' });
  }, 5000);
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

/**
 * Update dashboard with stats
 */
function updateDashboard(data) {
  if (!data) return;

  const {
    today,
    week,
    records,
    streak,
    goals,
  } = data;

  // Today Card
  if (today) {
    document.getElementById('today-active-time').textContent = formatDuration(
      today.totalActiveSeconds
    );
    document.getElementById('today-words').textContent = formatNumber(today.totalWords);
    document.getElementById('today-characters').textContent = formatNumber(today.totalCharacters);
    document.getElementById('today-lines').textContent = formatNumber(today.totalLines);

    // Goal progress (time)
    const goalSeconds = (goals?.dailyActiveMinutes || 60) * 60;
    const percentage = Math.min(100, Math.round((today.totalActiveSeconds / goalSeconds) * 100));
    document.getElementById('goal-percentage').textContent = percentage;
    document.getElementById('goal-minutes').textContent = goals?.dailyActiveMinutes || 60;
    document.getElementById('goal-progress-bar').style.width = percentage + '%';

    // Word goal progress
    const wordGoal = goals?.dailyWords || 1000;
    const wordPercentage = Math.min(100, Math.round((today.totalWords / wordGoal) * 100));
    document.getElementById('word-goal-current').textContent = formatNumber(today.totalWords);
    document.getElementById('word-goal-target').textContent = formatNumber(wordGoal);
    document.getElementById('word-progress-bar').style.width = wordPercentage + '%';

    // Date
    const dateObj = new Date(today.date);
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    const friendlyDate = dateObj.toLocaleDateString('en-US', options);
    document.getElementById('today-date').textContent = friendlyDate;
  }

  // Streak
  if (streak) {
    document.getElementById('streak-current').textContent = streak.current;
    document.getElementById('freezes-available').textContent = streak.freezesAvailable;
    document.getElementById('total-days').textContent = streak.totalDaysActive;
  }

  // Personal Records
  if (records) {
    document.getElementById('best-words').textContent = formatNumber(records.bestDailyWords);
    document.getElementById('best-words-date').textContent = formatDate(
      records.bestDailyWordsDate
    );
    document.getElementById('best-hours').textContent = formatDuration(
      records.bestDailyActiveSeconds
    );
    document.getElementById('best-hours-date').textContent = formatDate(
      records.bestStreakEndDate
    );
    document.getElementById('best-streak').textContent = records.bestStreak;
    document.getElementById('longest-session').textContent = formatDuration(
      records.longestSingleSession
    );
  }

  // Weekly Chart
  if (week && Array.isArray(week)) {
    updateWeeklyChart(week, goals);
  }

  // Language Breakdown
  if (week && Array.isArray(week)) {
    updateLanguageChart(week);
  }

  // Load settings
  loadSettings();
}

/**
 * Update weekly bar chart
 */
function updateWeeklyChart(weekData, goals) {
  const ctx = document.getElementById('weeklyChart');
  if (!ctx) return;

  const labels = weekData.map((day) => {
    const date = new Date(day.date);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  });

  const data = weekData.map((day) => Math.round(day.totalActiveSeconds / 60)); // Convert to minutes
  const goalMinutes = (goals?.dailyActiveMinutes || 60);
  const goalData = Array(weekData.length).fill(goalMinutes);

  // Color bars: green if goal hit, amber if partial, grey if zero
  const colors = weekData.map((day) => {
    if (day.totalActiveSeconds === 0) return '#666666';
    if (day.goalHit) return '#07b000';
    return '#dca700';
  });

  if (weeklyChart) {
    weeklyChart.destroy();
  }

  weeklyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Active Time (minutes)',
          data,
          backgroundColor: colors,
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: 'Daily Goal',
          data: goalData,
          type: 'line',
          borderColor: '#007acc',
          borderDash: [5, 5],
          fill: false,
          tension: 0,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: 'rgba(200, 200, 200, 0.7)',
          },
          grid: {
            color: 'rgba(100, 100, 100, 0.1)',
          },
        },
        x: {
          ticks: {
            color: 'rgba(200, 200, 200, 0.7)',
          },
          grid: {
            display: false,
          },
        },
      },
    },
  });
}

/**
 * Update language breakdown chart and list
 */
function updateLanguageChart(weekData) {
  // Aggregate language data
  const languageTotals = {};

  for (const day of weekData) {
    for (const [lang, seconds] of Object.entries(day.languageBreakdown || {})) {
      languageTotals[lang] = (languageTotals[lang] || 0) + seconds;
    }
  }

  // Get top 5 languages
  const sorted = Object.entries(languageTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (sorted.length === 0) {
    document.getElementById('language-list').innerHTML = '<p>No language data yet.</p>';
    return;
  }

  // Update donut chart (simplified - just show list if Chart.js has issues)
  const listHtml = sorted
    .map(
      ([lang, seconds]) =>
        `<div class="language-item">
      <span class="language-name">${capitalizeLanguage(lang)}</span>
      <span class="language-time">${formatDuration(seconds)}</span>
    </div>`
    )
    .join('');

  document.getElementById('language-list').innerHTML = listHtml;
}

/**
 * Load current settings into UI
 */
function loadSettings() {
  vscode.postMessage({ type: 'requestSettings' });
  // Settings will be populated from extension
}

/**
 * Populate settings form with values
 */
function populateSettings(goals) {
  if (!goals) return;
  
  document.getElementById('daily-goal').value = goals.dailyActiveMinutes || 60;
  document.getElementById('daily-word-goal').value = goals.dailyWords || 1000;
  document.getElementById('pause-threshold').value = goals.pauseThresholdSeconds || 10;
  document.getElementById('pause-threshold-value').textContent = (goals.pauseThresholdSeconds || 10) + 's';
  document.getElementById('enable-freeze-reminder').checked = goals.reminderEnabled !== false;
}

/**
 * Save settings
 */
function saveSettings() {
  const goals = {
    dailyActiveMinutes: parseInt(document.getElementById('daily-goal').value, 10) || 60,
    dailyWords: parseInt(document.getElementById('daily-word-goal').value, 10) || 1000,
    pauseThresholdSeconds: parseInt(document.getElementById('pause-threshold').value, 10) || 10,
    reminderEnabled: document.getElementById('enable-freeze-reminder').checked,
  };

  vscode.postMessage({ type: 'saveGoals', payload: goals });
}

/**
 * Start auto-refresh (placeholder for future enhancements)
 */
function startAutoRefresh() {
  // Already handled by window.load event
}

// ─── Utility Functions ────────────────────────────────

/**
 * Format seconds to "Hh Mm" format
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format number with thousands separator
 */
function formatNumber(num) {
  return num.toLocaleString();
}

/**
 * Format date string (YYYY-MM-DD) to short format (Mar 15)
 */
function formatDate(dateStr) {
  if (!dateStr || dateStr.length < 10) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Capitalize language names
 */
function capitalizeLanguage(lang) {
  const capitalMap = {
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    python: 'Python',
    java: 'Java',
    csharp: 'C#',
    cpp: 'C++',
    c: 'C',
    ruby: 'Ruby',
    php: 'PHP',
    go: 'Go',
    rust: 'Rust',
    kotlin: 'Kotlin',
    swift: 'Swift',
    html: 'HTML',
    css: 'CSS',
    json: 'JSON',
    yaml: 'YAML',
    sql: 'SQL',
    markdown: 'Markdown',
  };

  return capitalMap[lang] || lang.charAt(0).toUpperCase() + lang.slice(1);
}

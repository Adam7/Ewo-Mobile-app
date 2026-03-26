const appData = {
  goals: [
    { id: 'skin', title: 'Чистая кожа', desc: 'Базовый уход, сон, питание, без агрессивных практик.', emoji: '✨' },
    { id: 'hair', title: 'Здоровые волосы', desc: 'Режим ухода + привычки для укрепления.', emoji: '💇' },
    { id: 'cut', title: 'Похудение', desc: 'Умеренный дефицит + движение без экстремальных диет.', emoji: '🏃' },
    { id: 'bulk', title: 'Набор массы', desc: 'Профицит калорий, тренировки и восстановление.', emoji: '💪' }
  ],
  tips: [
    { id: 1, category: 'skin', title: 'SPF каждый день', text: 'Солнцезащита снижает риск пигментации и фотостарения.', premium: false },
    { id: 2, category: 'skin', title: 'Стабильный вечерний уход', text: 'Мягкое очищение и увлажнение работают лучше резких средств.', premium: true },
    { id: 3, category: 'hair', title: 'Термо-защита обязательна', text: 'Используй защиту перед феном и стайлером.', premium: false },
    { id: 4, category: 'hair', title: 'План питания для волос', text: 'Добавь белок, железо и омега-3 в регулярный рацион.', premium: true },
    { id: 5, category: 'cut', title: 'Дефицит 300–400 ккал', text: 'Умеренный дефицит безопаснее и стабильнее.', premium: false },
    { id: 6, category: 'cut', title: 'Система тарелки', text: '½ овощи, ¼ белок, ¼ сложные углеводы.', premium: true },
    { id: 7, category: 'bulk', title: 'Белок в каждом приёме', text: 'Регулярный белок помогает восстановлению и росту.', premium: false },
    { id: 8, category: 'bulk', title: 'Прогрессия нагрузок', text: 'Постепенно увеличивай рабочий вес/повторы.', premium: true }
  ]
};

const todayKey = new Date().toISOString().slice(0, 10);

const state = {
  activeGoal: localStorage.getItem('active_goal') || '',
  tier: GlowUpLogic.sanitizeTier(localStorage.getItem('tier') || 'free'),
  isAgeConfirmed: localStorage.getItem('age_confirmed') === 'true',
  level: localStorage.getItem('profile_level') || 'beginner',
  dailyTime: localStorage.getItem('profile_daily_time') || '15',
  completionByDate: GlowUpLogic.normalizeCompletionByDate(
    JSON.parse(localStorage.getItem('completion_by_date') || '{}')
  )
};

let isRemoteSyncInProgress = false;
let dirtyDays = new Set([todayKey]);
let profileDirty = true;
let subscriptionDirty = true;
let unsubscribeAuthListener = null;
let localUpdatedAt = localStorage.getItem('local_updated_at') || null;
let lastRemoteSyncedAt = localStorage.getItem('last_remote_synced_at') || null;
let syncRetryTimer = null;



function markLocalUpdated() {
  localUpdatedAt = new Date().toISOString();
  localStorage.setItem('local_updated_at', localUpdatedAt);
}

function scheduleRetrySync() {
  if (syncRetryTimer) return;
  syncRetryTimer = setTimeout(() => {
    syncRetryTimer = null;
    void trySaveRemoteSnapshot();
  }, 5000);
}

function applySnapshot(snapshot) {
  if (!snapshot) return;

  if (snapshot.remoteUpdatedAt && localUpdatedAt && snapshot.remoteUpdatedAt < localUpdatedAt && (profileDirty || subscriptionDirty || dirtyDays.size > 0)) {
    return;
  }
  state.activeGoal = snapshot.activeGoal || state.activeGoal;
  state.tier = GlowUpLogic.sanitizeTier(snapshot.tier || state.tier);
  state.isAgeConfirmed = Boolean(snapshot.isAgeConfirmed);
  state.level = snapshot.level || state.level;
  state.dailyTime = String(snapshot.dailyTime || state.dailyTime);
  state.completionByDate = GlowUpLogic.normalizeCompletionByDate(snapshot.completionByDate || state.completionByDate);
  dirtyDays = new Set([todayKey]);
  profileDirty = false;
  subscriptionDirty = false;
}

async function tryLoadRemoteSnapshot() {
  if (!window.GlowUpSupabase || !window.GlowUpSupabase.hasConfig()) return;
  try {
    const snapshot = await window.GlowUpSupabase.fetchRemoteSnapshot();
    applySnapshot(snapshot);
  } catch (error) {
    console.warn('Remote sync load failed:', error);
  }
}

async function trySaveRemoteSnapshot() {
  if (isRemoteSyncInProgress) return;
  if (!window.GlowUpSupabase || !window.GlowUpSupabase.hasConfig()) return;

  try {
    isRemoteSyncInProgress = true;
    const result = await window.GlowUpSupabase.saveRemoteSnapshot(state, {
      dirtyDays: Array.from(dirtyDays),
      saveProfile: profileDirty,
      saveSubscription: subscriptionDirty
    });
    if (result?.ok) {
      dirtyDays.clear();
      profileDirty = false;
      subscriptionDirty = false;
      lastRemoteSyncedAt = result.syncedAt || lastRemoteSyncedAt;
      if (lastRemoteSyncedAt) localStorage.setItem('last_remote_synced_at', lastRemoteSyncedAt);
    } else {
      scheduleRetrySync();
    }
  } catch (error) {
    console.warn('Remote sync save failed:', error);
    scheduleRetrySync();
  } finally {
    isRemoteSyncInProgress = false;
  }
}



function setupAuthListener() {
  if (!window.GlowUpSupabase || !window.GlowUpSupabase.hasConfig()) return;
  if (unsubscribeAuthListener) unsubscribeAuthListener();

  unsubscribeAuthListener = window.GlowUpSupabase.onAuthStateChange(async (user) => {
    await refreshAuthStatus();
    if (user) {
      await tryLoadRemoteSnapshot();
      renderGoals();
      renderFilter();
      renderTips();
      renderPlan();
      hydrateOnboardingFields();
      updateStats();
    }
  });
}

async function init() {
  await tryLoadRemoteSnapshot();
  if (!state.completionByDate[todayKey]) state.completionByDate[todayKey] = [];
  renderGoals();
  renderFilter();
  renderTips();
  renderPlan();
  bindEvents();
  hydrateOnboardingFields();
  updateStats();
  await refreshAuthStatus();
  setupAuthListener();
  if (!state.isAgeConfirmed) openAgeGate();
  persistState();
}

function persistState() {
  localStorage.setItem('active_goal', state.activeGoal);
  localStorage.setItem('tier', state.tier);
  localStorage.setItem('age_confirmed', String(state.isAgeConfirmed));
  localStorage.setItem('profile_level', state.level);
  localStorage.setItem('profile_daily_time', String(state.dailyTime));
  localStorage.setItem('completion_by_date', JSON.stringify(state.completionByDate));
  markLocalUpdated();
  void trySaveRemoteSnapshot();
}

function getCompletedToday() { return state.completionByDate[todayKey] || []; }
function setCompletedToday(taskIds) { state.completionByDate[todayKey] = taskIds; }

function renderGoals() {
  const grid = document.getElementById('goalsGrid');
  grid.innerHTML = '';
  appData.goals.forEach((goal) => {
    const card = document.createElement('button');
    card.className = `goal-card ${state.activeGoal === goal.id ? 'active' : ''}`;
    card.innerHTML = `<span class="emoji">${goal.emoji}</span><h3>${goal.title}</h3><p>${goal.desc}</p>`;
    card.addEventListener('click', () => {
      state.activeGoal = goal.id;
      profileDirty = true;
      renderGoals();
      renderTips();
      renderFilter();
      renderPlan();
      updateStats();
      persistState();
    });
    grid.appendChild(card);
  });
}

function renderFilter() {
  const filter = document.getElementById('categoryFilter');
  filter.innerHTML = '<option value="all">Все категории</option>';
  appData.goals.forEach((goal) => {
    const option = document.createElement('option');
    option.value = goal.id;
    option.textContent = goal.title;
    filter.appendChild(option);
  });
  filter.value = state.activeGoal || 'all';
}

function renderTips() {
  const selected = document.getElementById('categoryFilter').value || 'all';
  const tipsGrid = document.getElementById('tipsGrid');
  const filtered = appData.tips.filter((tip) => selected === 'all' || tip.category === selected);
  tipsGrid.innerHTML = '';

  filtered.forEach((tip) => {
    const locked = tip.premium && !GlowUpLogic.hasPremiumAccess(state.tier);
    const item = document.createElement('article');
    item.className = `tip-card ${locked ? 'locked' : ''}`;

    if (locked) {
      item.innerHTML = `<h3>${tip.title} 🔒</h3><p>Премиум-совет доступен на Plus/Pro.</p><button class="unlock-btn">Открыть доступ</button>`;
      item.querySelector('.unlock-btn').addEventListener('click', openSubscriptionModal);
    } else {
      item.innerHTML = `<h3>${tip.title}</h3><p>${tip.text}</p>`;
    }

    tipsGrid.appendChild(item);
  });
}

function renderPlan() {
  const plan = GlowUpLogic.buildPlan(state);
  const completed = getCompletedToday();
  const list = document.getElementById('planList');
  list.innerHTML = '';

  plan.forEach((task, idx) => {
    const taskId = `task-${idx}`;
    const checked = completed.includes(taskId);
    const row = document.createElement('label');
    row.className = 'plan-item';
    row.innerHTML = `<input type="checkbox" data-id="${taskId}" ${checked ? 'checked' : ''} /><span>${task}</span>`;
    list.appendChild(row);
  });
}

function updateStats() {
  const planSize = GlowUpLogic.buildPlan(state).length;
  const completedToday = getCompletedToday().length;
  document.getElementById('completedToday').textContent = `${Math.min(completedToday, planSize)}/${planSize}`;
  document.getElementById('streakValue').textContent = String(GlowUpLogic.calculateStreak(state.completionByDate, todayKey, 4));
  document.getElementById('accessLevel').textContent = state.tier.toUpperCase();
  document.getElementById('currentPlanBadge').textContent = `Тариф: ${state.tier.toUpperCase()}`;
  document.getElementById('profileLabel').textContent = `${state.level}, ${state.dailyTime}м`;

  const active = appData.goals.find((goal) => goal.id === state.activeGoal);
  document.getElementById('activeGoalLabel').textContent = active ? active.title : 'Не выбрана';
}

function openSubscriptionModal() { document.getElementById('subscriptionModal').classList.remove('hidden'); }
function closeSubscriptionModal() { document.getElementById('subscriptionModal').classList.add('hidden'); }
function openAgeGate() { document.getElementById('ageGateModal').classList.remove('hidden'); }
function closeAgeGate() { document.getElementById('ageGateModal').classList.add('hidden'); }
function openOnboardingModal() { document.getElementById('onboardingModal').classList.remove('hidden'); }
function closeOnboardingModal() { document.getElementById('onboardingModal').classList.add('hidden'); }
function openAuthModal() { document.getElementById('authModal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }

async function refreshAuthStatus() {
  const status = document.getElementById('authStatus');
  const authButton = document.getElementById('authButton');

  if (!window.GlowUpSupabase || !window.GlowUpSupabase.hasConfig()) {
    status.textContent = 'Гость';
    authButton.textContent = 'Войти';
    return;
  }

  const user = await window.GlowUpSupabase.getUser();
  if (user?.email) {
    status.textContent = user.email;
    authButton.textContent = 'Аккаунт';
  } else {
    status.textContent = 'Гость';
    authButton.textContent = 'Войти';
  }
}


function hydrateOnboardingFields() {
  document.getElementById('levelSelect').value = state.level;
  document.getElementById('timeSelect').value = state.dailyTime;
}



function exportUserData() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    activeGoal: state.activeGoal,
    tier: state.tier,
    isAgeConfirmed: state.isAgeConfirmed,
    level: state.level,
    dailyTime: state.dailyTime,
    completionByDate: state.completionByDate
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `glowup-backup-${todayKey}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importUserData(file) {
  if (!file) return;
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result || '{}'));
      state.activeGoal = payload.activeGoal || '';
      state.tier = GlowUpLogic.sanitizeTier(payload.tier || 'free');
      state.isAgeConfirmed = Boolean(payload.isAgeConfirmed);
      state.level = payload.level || 'beginner';
      state.dailyTime = String(payload.dailyTime || '15');
      state.completionByDate = GlowUpLogic.normalizeCompletionByDate(payload.completionByDate || {});
      if (!state.completionByDate[todayKey]) state.completionByDate[todayKey] = [];
      dirtyDays = new Set(Object.keys(state.completionByDate));
      profileDirty = true;
      subscriptionDirty = true;

      renderGoals();
      renderFilter();
      renderTips();
      renderPlan();
      hydrateOnboardingFields();
      updateStats();
      persistState();
      alert('Данные успешно импортированы.');
    } catch (error) {
      alert('Не удалось импортировать файл. Проверь формат JSON.');
    }
  };

  reader.readAsText(file, 'utf-8');
}

function resetAllData() {
  if (!confirm('Точно удалить весь прогресс и настройки?')) return;
  localStorage.removeItem('active_goal');
  localStorage.removeItem('tier');
  localStorage.removeItem('age_confirmed');
  localStorage.removeItem('profile_level');
  localStorage.removeItem('profile_daily_time');
  localStorage.removeItem('completion_by_date');
  window.location.reload();
}

function bindEvents() {
  document.getElementById('categoryFilter').addEventListener('change', renderTips);
  document.getElementById('subscriptionButton').addEventListener('click', openSubscriptionModal);
  document.getElementById('authButton').addEventListener('click', openAuthModal);
  document.getElementById('closeModal').addEventListener('click', closeSubscriptionModal);
  document.getElementById('openOnboardingButton').addEventListener('click', openOnboardingModal);
  document.getElementById('closeOnboardingButton').addEventListener('click', closeOnboardingModal);
  document.getElementById('exportDataButton').addEventListener('click', exportUserData);
  document.getElementById('resetAllButton').addEventListener('click', resetAllData);
  document.getElementById('importDataInput').addEventListener('change', (e) => importUserData(e.target.files && e.target.files[0]));
  document.getElementById('closeAuthButton').addEventListener('click', closeAuthModal);
  document.getElementById('sendMagicLinkButton').addEventListener('click', async () => {
    const email = document.getElementById('authEmailInput').value.trim();
    if (!email) { alert('Введите email'); return; }
    const result = await window.GlowUpSupabase.signInWithEmail(email);
    alert(result.message || (result.ok ? 'Письмо отправлено' : 'Ошибка входа'));
  });
  document.getElementById('signOutButton').addEventListener('click', async () => {
    const result = await window.GlowUpSupabase.signOut();
    alert(result.message || (result.ok ? 'Вышли из аккаунта' : 'Ошибка выхода'));
    await refreshAuthStatus();
  });

  document.getElementById('subscriptionModal').addEventListener('click', (e) => {
    if (e.target.id === 'subscriptionModal') closeSubscriptionModal();
  });
  document.getElementById('onboardingModal').addEventListener('click', (e) => {
    if (e.target.id === 'onboardingModal') closeOnboardingModal();
  });
  document.getElementById('authModal').addEventListener('click', (e) => {
    if (e.target.id === 'authModal') closeAuthModal();
  });

  document.querySelectorAll('.tier-btn').forEach((button) => {
    button.addEventListener('click', () => {
      state.tier = button.dataset.tier;
      subscriptionDirty = true;
      persistState();
      renderTips();
      updateStats();
      closeSubscriptionModal();
    });
  });

  document.getElementById('saveOnboardingButton').addEventListener('click', () => {
    state.level = document.getElementById('levelSelect').value;
    state.dailyTime = document.getElementById('timeSelect').value;
    profileDirty = true;
    setCompletedToday([]);
    dirtyDays.add(todayKey);
    renderPlan();
    updateStats();
    persistState();
    closeOnboardingModal();
  });

  document.getElementById('planList').addEventListener('change', (e) => {
    if (!e.target.matches('input[type="checkbox"]')) return;
    const taskId = e.target.dataset.id;
    const completed = new Set(getCompletedToday());
    if (e.target.checked) completed.add(taskId); else completed.delete(taskId);
    setCompletedToday(Array.from(completed));
    dirtyDays.add(todayKey);
    persistState();
    updateStats();
  });

  document.getElementById('resetDayButton').addEventListener('click', () => {
    setCompletedToday([]);
    dirtyDays.add(todayKey);
    renderPlan();
    persistState();
    updateStats();
  });

  document.getElementById('confirmAgeButton').addEventListener('click', () => {
    state.isAgeConfirmed = true;
    profileDirty = true;
    persistState();
    closeAgeGate();
  });
}

function scrollToSection(sectionId) {
  document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
}

window.scrollToSection = scrollToSection;
window.addEventListener('DOMContentLoaded', () => {
  void init();
});

(function (global) {
  function hasPremiumAccess(tier) {
    return tier === 'plus' || tier === 'pro';
  }

  function sanitizeTier(tier) {
    if (tier === 'plus' || tier === 'pro' || tier === 'free') return tier;
    return 'free';
  }

  function normalizeCompletionByDate(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

    const result = {};

    Object.entries(value).forEach(([dateKey, tasks]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
      if (!Array.isArray(tasks)) return;
      result[dateKey] = Array.from(new Set(tasks.filter((task) => typeof task === 'string')));
    });

    return result;
  }

  function calculateStreak(completionByDate, todayKey, minTasksPerDay) {
    const normalized = normalizeCompletionByDate(completionByDate);
    const threshold = Number.isFinite(minTasksPerDay) ? minTasksPerDay : 1;

    let streak = 0;
    let cursor = new Date(`${todayKey}T00:00:00Z`);

    while (!Number.isNaN(cursor.getTime())) {
      const key = cursor.toISOString().slice(0, 10);
      const done = normalized[key] || [];

      if (done.length >= threshold) {
        streak += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  function buildPlan(profile) {
    const safeProfile = profile || {};
    const goal = safeProfile.activeGoal || '';
    const level = safeProfile.level || 'beginner';
    const time = Number(safeProfile.dailyTime || 15);

    const plan = ['Вода: минимум 6 стаканов', 'Сон не позже 23:30', 'Записать 1 улучшение дня'];

    if (goal === 'skin') plan.push('Утренний и вечерний уход без пропусков');
    if (goal === 'hair') plan.push('Уход за волосами по типу кожи головы');
    if (goal === 'cut') plan.push('Дефицит калорий в безопасном диапазоне');
    if (goal === 'bulk') plan.push('Белок в каждом основном приёме пищи');

    if (level === 'beginner') plan.push('Лёгкая активность 10–15 минут');
    if (level === 'intermediate') plan.push('Тренировка/активность 25–35 минут');
    if (level === 'advanced') plan.push('Фокус-тренировка 40+ минут с техникой');

    if (time >= 30) plan.push('15 минут обучения или чтения');
    if (time >= 45) plan.push('Подготовка еды на завтра');
    if (time >= 60) plan.push('Растяжка/восстановление 10 минут');

    return plan;
  }

  const api = {
    hasPremiumAccess,
    sanitizeTier,
    normalizeCompletionByDate,
    calculateStreak,
    buildPlan
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  global.GlowUpLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);

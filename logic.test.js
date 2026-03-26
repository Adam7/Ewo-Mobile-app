const test = require('node:test');
const assert = require('node:assert/strict');

const {
  hasPremiumAccess,
  sanitizeTier,
  normalizeCompletionByDate,
  calculateStreak,
  buildPlan
} = require('./logic');

test('hasPremiumAccess works for tiers', () => {
  assert.equal(hasPremiumAccess('free'), false);
  assert.equal(hasPremiumAccess('plus'), true);
  assert.equal(hasPremiumAccess('pro'), true);
});


test('sanitizeTier normalizes unknown values to free', () => {
  assert.equal(sanitizeTier('free'), 'free');
  assert.equal(sanitizeTier('plus'), 'plus');
  assert.equal(sanitizeTier('vip'), 'free');
});

test('normalizeCompletionByDate drops invalid data and de-duplicates tasks', () => {
  const result = normalizeCompletionByDate({
    '2026-03-26': ['task-1', 'task-1', 'task-2'],
    invalid: ['task-1'],
    '2026-03-27': 'nope'
  });

  assert.deepEqual(result, {
    '2026-03-26': ['task-1', 'task-2']
  });
});

test('calculateStreak counts backward from today using threshold', () => {
  const data = {
    '2026-03-26': ['a', 'b', 'c', 'd', 'e'],
    '2026-03-25': ['a', 'b', 'c', 'd', 'e'],
    '2026-03-24': ['a', 'b']
  };

  assert.equal(calculateStreak(data, '2026-03-26', 5), 2);
  assert.equal(calculateStreak(data, '2026-03-26', 2), 3);
});

test('buildPlan adapts to goal level and time', () => {
  const plan = buildPlan({ activeGoal: 'bulk', level: 'advanced', dailyTime: '60' });

  assert.ok(plan.includes('Белок в каждом основном приёме пищи'));
  assert.ok(plan.includes('Фокус-тренировка 40+ минут с техникой'));
  assert.ok(plan.includes('Растяжка/восстановление 10 минут'));
});

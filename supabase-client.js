(function (global) {
  const CONFIG_KEY = 'glowup_supabase_config';

  function getConfig() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
      if (!parsed.url || !parsed.anonKey) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function createClient() {
    const config = getConfig();
    if (!config) return null;
    if (!global.supabase || typeof global.supabase.createClient !== 'function') return null;

    return global.supabase.createClient(config.url, config.anonKey);
  }

  async function getCurrentUser(client) {
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data?.user || null;
  }

  async function fetchRemoteSnapshot() {
    const client = createClient();
    if (!client) return null;

    const user = await getCurrentUser(client);
    if (!user) return null;

    const { data: profile } = await client
      .from('profiles')
      .select('active_goal, age_confirmed, level, daily_time, updated_at')
      .eq('id', user.id)
      .maybeSingle();

    const { data: subscription } = await client
      .from('subscription_state')
      .select('tier, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: progressRows } = await client
      .from('daily_progress')
      .select('day, completed_task_ids, updated_at')
      .eq('user_id', user.id)
      .limit(120);

    const completionByDate = {};
    const timestamps = [];

    if (profile?.updated_at) timestamps.push(profile.updated_at);
    if (subscription?.updated_at) timestamps.push(subscription.updated_at);

    (progressRows || []).forEach((row) => {
      completionByDate[row.day] = Array.isArray(row.completed_task_ids) ? row.completed_task_ids : [];
      if (row.updated_at) timestamps.push(row.updated_at);
    });

    const remoteUpdatedAt = timestamps.sort().at(-1) || null;

    return {
      activeGoal: profile?.active_goal || '',
      isAgeConfirmed: Boolean(profile?.age_confirmed),
      level: profile?.level || 'beginner',
      dailyTime: String(profile?.daily_time || 15),
      tier: subscription?.tier || 'free',
      completionByDate,
      remoteUpdatedAt
    };
  }

  async function saveRemoteSnapshot(state, options = {}) {
    const client = createClient();
    if (!client) return { ok: false };

    const user = await getCurrentUser(client);
    if (!user) return { ok: false };

    const today = new Date().toISOString();
    const saveProfile = options.saveProfile !== false;
    const saveSubscription = options.saveSubscription !== false;
    const dirtyDays = Array.isArray(options.dirtyDays) ? options.dirtyDays : Object.keys(state.completionByDate || {});

    if (saveProfile) {
      await client.from('profiles').upsert({
        id: user.id,
        active_goal: state.activeGoal || null,
        age_confirmed: Boolean(state.isAgeConfirmed),
        level: state.level,
        daily_time: Number(state.dailyTime || 15),
        updated_at: today
      });
    }

    if (saveSubscription) {
      await client.from('subscription_state').upsert({
        user_id: user.id,
        tier: state.tier,
        updated_at: today
      });
    }

    for (const day of dirtyDays) {
      const completed = (state.completionByDate || {})[day] || [];
      await client.from('daily_progress').upsert({
        user_id: user.id,
        day,
        completed_task_ids: Array.isArray(completed) ? completed : [],
        updated_at: today
      });
    }

    return { ok: true, syncedAt: today };
  }


  async function signInWithEmail(email) {
    const client = createClient();
    if (!client || !email) return { ok: false, message: 'Supabase not configured.' };

    const { error } = await client.auth.signInWithOtp({ email });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'Magic link sent.' };
  }

  async function signOut() {
    const client = createClient();
    if (!client) return { ok: false, message: 'Supabase not configured.' };
    const { error } = await client.auth.signOut();
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'Signed out.' };
  }

  async function getUser() {
    const client = createClient();
    if (!client) return null;
    return getCurrentUser(client);
  }


  function onAuthStateChange(callback) {
    const client = createClient();
    if (!client || typeof callback !== 'function') return () => {};

    const { data } = client.auth.onAuthStateChange(async () => {
      const user = await getCurrentUser(client);
      callback(user);
    });

    return () => {
      try {
        data?.subscription?.unsubscribe();
      } catch {
        // no-op
      }
    };
  }

  function setConfig(url, anonKey) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, anonKey }));
  }

  global.GlowUpSupabase = {
    fetchRemoteSnapshot,
    saveRemoteSnapshot,
    signInWithEmail,
    signOut,
    getUser,
    onAuthStateChange,
    setConfig,
    hasConfig: () => Boolean(getConfig())
  };
})(typeof window !== 'undefined' ? window : globalThis);

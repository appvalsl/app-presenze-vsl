export async function getSupabase() {
  const cfg = window.APP_CONFIG || {};
  const url = cfg.SUPABASE_URL;
  const anonKey = cfg.SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes('TUO-PROGETTO') || anonKey.includes('INCOLLA_QUI')) {
    throw new Error('Config Supabase mancante o placeholder lasciati in js/config.js');
  }

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error('Libreria Supabase non caricata correttamente');
  }

  return window.supabase.createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

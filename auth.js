// Shared Supabase helpers
let _sb = null;
function configured(){
  return window.SUPABASE_URL && !window.SUPABASE_URL.startsWith("PASTE") &&
         window.SUPABASE_ANON_KEY && !window.SUPABASE_ANON_KEY.startsWith("PASTE");
}
function sb(){
  if(!_sb && configured() && window.supabase){
    _sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }
  return _sb;
}
async function getSession(){
  const c = sb(); if(!c) return null;
  const { data } = await c.auth.getSession();
  return data.session || null;
}
async function logout(){
  const c = sb(); if(c) await c.auth.signOut();
  location.href = "index.html";
}

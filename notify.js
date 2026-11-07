const Notify = (() => {
  let db = null, me = null, dms = [], grps = [], baseTitle = document.title;

  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const key = (kind, id) => 'sh_seen_' + me + '_' + kind + '_' + id;
  const baseKey = () => 'sh_base_' + me;

  function base() {
    let b = get(baseKey());
    if (!b) { b = new Date().toISOString(); set(baseKey(), b); }
    return b;
  }
  const seenAt = (kind, id) => Date.parse(get(key(kind, id)) || base());

  function countFor(kind, id) {
    const list = kind === 'dm' ? dms : grps;
    const s = seenAt(kind, id);
    return list.filter(m => (kind === 'dm' ? m.sender_id : m.group_id) === id && Date.parse(m.created_at) > s).length;
  }

  function total() {
    const a = dms.filter(m => Date.parse(m.created_at) > seenAt('dm', m.sender_id)).length;
    const b = grps.filter(m => Date.parse(m.created_at) > seenAt('grp', m.group_id)).length;
    return a + b;
  }

  function paint() {
    const n = total();
    document.title = n > 0 ? '(' + n + ') ' + baseTitle : baseTitle;
    const badge = document.getElementById('msgBadge');
    if (badge) {
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.style.display = n > 0 ? 'inline-flex' : 'none';
    }
  }

  async function refresh() {
    if (!db || !me) return;
    const a = await db.from('messages').select('sender_id,created_at')
      .eq('recipient_id', me).order('created_at', { ascending: false }).limit(300);
    const b = await db.from('group_messages').select('group_id,sender_id,created_at')
      .neq('sender_id', me).order('created_at', { ascending: false }).limit(300);
    dms = a.data || [];
    grps = b.data || [];
    paint();
  }

  function markRead(kind, id, ts) {
    const k = key(kind, id);
    const cur = Date.parse(get(k) || 0) || 0;
    const next = Math.max(cur, ts ? Date.parse(ts) : 0, Date.now());
    set(k, new Date(next).toISOString());
    paint();
  }

  function start(client, userId) {
    db = client; me = userId; baseTitle = document.title;
    base();
    refresh();
    db.channel('notify-' + me)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'recipient_id=eq.' + me }, refresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages' }, p => {
        if (p.new && p.new.sender_id !== me) refresh();
      })
      .subscribe();
  }

  return { start, refresh, markRead, countFor };
})();

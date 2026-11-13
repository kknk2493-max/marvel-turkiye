/* ==========================================================================
   Micup giriş köprüsü — Google Apps Script (JSONP + nonce)
   ========================================================================== */

const CLIENT_ID      = '1568872958460952576';
const CLIENT_SECRET  = PropertiesService.getScriptProperties().getProperty('MICUP_CLIENT_SECRET'); // Apps Script > Proje ayarları > Komut dosyası özellikleri
const ALLOWED_ORIGIN = 'https://kknk2493-max.github.io';

const TOKEN_URL  = 'https://micup.gg/api/v1/oauth2/token';
const ME_URL     = 'https://micup.gg/api/v1/users/@me';
const GUILDS_URL = 'https://micup.gg/api/v1/users/@me/guilds';
const CACHE_TTL  = 600; // saniye

const SA_EMAIL = "firebase-adminsdk-fbsvc@marvel-turkiye-e53d8.iam.gserviceaccount.com";
const BOT_TOKEN = PropertiesService.getScriptProperties().getProperty('mcup_bot_token'); // Komut dosyası özelliklerinde
const SA_KEY   = (PropertiesService.getScriptProperties().getProperty('SA_KEY') || '').replace(/\\n/g, '\n'); // servis hesabı JSON'undaki private_key değeri
const FB_AUDIENCE = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

function b64urlBytes(bytes){ return Utilities.base64EncodeWebSafe(bytes); }
function b64urlStr(str){ return Utilities.base64EncodeWebSafe(Utilities.newBlob(str,'UTF-8').getBytes()); }

/* ---- Firestore REST (service account ile, kurallari bypass eder) ---- */
const FS_BASE = 'https://firestore.googleapis.com/v1/projects/marvel-turkiye-e53d8/databases/(default)/documents';
const ADMIN_MICUP = ['1567559341597790213']; // bu micup id'leri wipe/del yapabilir
let _saTok = null, _saTokExp = 0;
function saAccessToken(){
  const now = Math.floor(Date.now()/1000);
  if (_saTok && now < _saTokExp - 60) return _saTok;
  const header = {alg:'RS256', typ:'JWT'};
  const payload = {iss:SA_EMAIL, scope:'https://www.googleapis.com/auth/datastore', aud:'https://oauth2.googleapis.com/token', iat:now, exp:now+3600};
  const unsigned = b64urlStr(JSON.stringify(header))+'.'+b64urlStr(JSON.stringify(payload));
  const sig = Utilities.computeRsaSha256Signature(unsigned, SA_KEY);
  const jwt = unsigned+'.'+b64urlBytes(sig);
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', { method:'post', contentType:'application/x-www-form-urlencoded',
    payload:'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion='+jwt, muteHttpExceptions:true });
  const j = JSON.parse(r.getContentText()||'{}');
  if (!j.access_token) throw new Error('SA token alinamadi: '+(j.error||r.getResponseCode()));
  _saTok = j.access_token; _saTokExp = now + (j.expires_in||3600);
  return _saTok;
}
function fsReq(method, path, body){
  const opt = { method: method, headers: { Authorization: 'Bearer ' + saAccessToken() }, muteHttpExceptions: true };
  if (body) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(body); }
  return UrlFetchApp.fetch(FS_BASE + path, opt);
}
function fsList(coll, pageToken){
  let u = '/' + coll + '?pageSize=300' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
  const r = fsReq('get', u, null);
  if (r.getResponseCode() >= 400) throw new Error('FS list ' + r.getResponseCode() + ': ' + String(r.getContentText()).slice(0,200));
  const j = JSON.parse(r.getContentText());
  return { docs: j.documents || [], next: j.nextPageToken || null };
}
function fsCommit(writes){
  // writes: [{update:{name,fields}} | {delete:name}]
  for (let i=0;i<writes.length;i+=400){
    const r = fsReq('post', ':commit', { writes: writes.slice(i,i+400) });
    if (r.getResponseCode() >= 400) throw new Error('FS commit ' + r.getResponseCode() + ': ' + String(r.getContentText()).slice(0,300));
  }
}
function isAdminMicup(id){ return ADMIN_MICUP.indexOf(String(id||'')) >= 0; }

/* ---------- haftalik siralama: Pazar 00:00 - Cumartesi 23:59 (Istanbul) ---------- */
function weekSunday(offsetDays){
  const t = new Date(Date.now() + 3*3600e3); // Istanbul
  const sun = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() - t.getUTCDay() + offsetDays));
  return sun.toISOString().slice(0,10);
}
/* ---------- sezon: 4 hafta, Pazar 00:00 (Istanbul) baslar. Sezon 01 = 1-28 Kasim 2026 (kimlik '2026-11') ---------- */
const SEASON_ANCHOR = Date.UTC(2026, 9, 31, 21, 0, 0);
function seasonOfSunday(sundayIso){
  const ms = Date.parse(sundayIso + 'T00:00:00Z') - 3*3600e3;
  const no = Math.max(1, Math.floor((ms - SEASON_ANCHOR) / (28*864e5)) + 1), pad = ('0' + no).slice(-2);
  return { no: no, id: no === 1 ? '2026-11' : 'S' + pad, label: 'Sezon ' + pad };
}
function weeklyReset(force){
  const t = new Date(Date.now() + 3*3600e3);
  if (!force && (t.getUTCDay() !== 0 || t.getUTCHours() >= 12)) return { skip: 'sadece pazar ilerisaat' };
  const prev = weekSunday(-7), cur = weekSunday(0);
  const base = 'projects/marvel-turkiye-e53d8/databases/(default)/documents';
  const prevS = seasonOfSunday(prev), curS = seasonOfSunday(cur), seasonEnded = prevS.no !== curS.no;
  let best = null, pt = null, n = 0;
  const writes = [], seasonRows = [];
  do {
    const l = fsList('users', pt); pt = l.next;
    for (const d of l.docs) { n++;
      const f = d.fields || {};
      const str = k => f[k] && f[k].stringValue;
      const num = k => +(f[k] && (f[k].integerValue || f[k].doubleValue) || 0);
      let wp = 0;
      if (str('wk') === prev) wp = num('wp');
      else { const lw = f.lastWeek && f.lastWeek.mapValue && f.lastWeek.mapValue.fields; if (lw && lw.id && lw.id.stringValue === prev) wp = +(lw.wp && lw.wp.integerValue || 0); }
      if (wp > 0 && (!best || wp > best.wp)) best = { uid: d.name.split('/').pop(), name: str('name') || 'Oyuncu', avatar: str('avatar') || '', wp };
      // bu hafta (Pazar 00:00'dan sonra) puan almış oyuncunun yeni puanı silinmesin
      const upd = {}, mask = [];
      if (str('wk') !== cur) { upd.wk = { stringValue: cur }; upd.wp = { integerValue: '0' }; mask.push('wk','wp'); }
      if (seasonEnded) {
        let sp = 0;
        if (str('season') === prevS.id) sp = num('sp');
        else { const ls = f.lastSeason && f.lastSeason.mapValue && f.lastSeason.mapValue.fields; if (ls && ls.id && ls.id.stringValue === prevS.id) sp = +(ls.sp && (ls.sp.integerValue || ls.sp.doubleValue) || 0); }
        if (sp > 0) seasonRows.push({ uid: d.name.split('/').pop(), name: str('name') || 'Oyuncu', avatar: str('avatar') || '', sp: sp });
        if (str('season') !== curS.id) {
          upd.season = { stringValue: curS.id }; upd.sp = { integerValue: '0' }; mask.push('season','sp');
          if (sp > 0) { upd.lastSeason = { mapValue: { fields: { id: { stringValue: prevS.id }, sp: { integerValue: String(sp) } } } }; mask.push('lastSeason'); }
        }
      }
      if (mask.length) writes.push({ update: { name: d.name, fields: upd }, updateMask: { fieldPaths: mask } });
    }
  } while (pt);
  for (let i = 0; i < writes.length; i += 400) {
    const r = fsReq('post', ':commit', { writes: writes.slice(i, i+400) });
    if (r.getResponseCode() >= 400) throw new Error('reset ' + r.getResponseCode() + ': ' + String(r.getContentText()).slice(0,200));
  }
  if (best) {
    const ex = fsReq('get', '/weeks/' + prev, null);
    if (ex.getResponseCode() === 404) {
      fsCommit([{ update: { name: base + '/weeks/' + prev, fields: {
        winner: { mapValue: { fields: { uid: { stringValue: best.uid }, name: { stringValue: best.name }, avatar: { stringValue: best.avatar }, wp: { integerValue: String(best.wp) } } } },
        closedAt: { timestampValue: new Date().toISOString() }, by: { stringValue: 'system' } } } }]);
      fsCommit([{ update: { name: base + '/announcements/' + Utilities.getUuid(), fields: {
        title: { stringValue: "⭐ Haftanın Marvel'ı: " + best.name },
        text: { stringValue: 'Geçen haftayı ' + best.wp.toLocaleString('tr-TR') + ' puanla birinci bitirdi. Tebrikler!\nYeni hafta başladı, bu hafta sıra sende.' },
        pinned: { booleanValue: false }, by: { stringValue: 'system' }, byName: { stringValue: 'Marvel Türkiye' },
        created: { timestampValue: new Date().toISOString() } } } }]);
    }
  }
  // sezon bittiyse: ilk 3'u kaydet ve duyur ("Sezonun Marvel'i")
  let seasonTop = null;
  if (seasonEnded && seasonRows.length) {
    seasonRows.sort((a, b) => b.sp - a.sp); seasonTop = seasonRows.slice(0, 3);
    const exS = fsReq('get', '/seasons/' + prevS.id, null);
    if (exS.getResponseCode() === 404) {
      const topVal = { arrayValue: { values: seasonTop.map(t => ({ mapValue: { fields: { uid: { stringValue: t.uid }, name: { stringValue: t.name }, avatar: { stringValue: t.avatar }, sp: { integerValue: String(t.sp) } } } })) } };
      fsCommit([{ update: { name: base + '/seasons/' + prevS.id, fields: { top: topVal, label: { stringValue: prevS.label }, closedAt: { timestampValue: new Date().toISOString() }, by: { stringValue: 'system' } } } }]);
      const medal = ['🥇', '🥈', '🥉'];
      fsCommit([{ update: { name: base + '/announcements/' + Utilities.getUuid(), fields: {
        title: { stringValue: "👑 Sezonun Marvel'ı: " + seasonTop[0].name },
        text: { stringValue: seasonTop.map((t, i) => medal[i] + ' ' + t.name + ' — ' + t.sp.toLocaleString('tr-TR') + ' puan').join('\n') + '\n\n' + prevS.label + ' bitti, ' + curS.label + ' başladı. Sezon ve hafta puanları sıfırlandı!' },
        pinned: { booleanValue: true }, by: { stringValue: 'system' }, byName: { stringValue: 'Marvel Türkiye' },
        created: { timestampValue: new Date().toISOString() } } } }]);
    }
  }
  // Micup'ta "Haftanin Marvel'i" rolu: bul veya olustur, yeni kazanana ver, eskisinden al
  let roleInfo = null;
  try {
    if (best && BOT_TOKEN) {
      const micupId = String(best.uid).indexOf('micup_') === 0 ? String(best.uid).slice(6) : null;
      if (micupId) {
        const API = 'https://micup.gg/api/v1/guilds/' + GUILD_ID;
        let roles = [];
        const g1 = UrlFetchApp.fetch(API, { headers: botHeaders(), muteHttpExceptions: true });
        if (g1.getResponseCode() < 400) { try { roles = JSON.parse(g1.getContentText()).roles || []; } catch (e) {} }
        let role = roles.filter(r => /haftan.*marvel/i.test(r.name || ''))[0];
        if (!role) {
          const cr = UrlFetchApp.fetch(API + '/roles', { method: 'post',
            headers: Object.assign(botHeaders(), { 'Content-Type': 'application/json' }),
            payload: JSON.stringify({ name: "Haftanın Marvel'ı", color: 16766720, hoist: false, mentionable: false }),
            muteHttpExceptions: true });
          if (cr.getResponseCode() < 300) { try { const nd = JSON.parse(cr.getContentText()); role = nd.id ? { id: nd.id } : (nd.role || nd); } catch (e) {} }
          if (!role || !role.id) {
            const g2 = UrlFetchApp.fetch(API, { headers: botHeaders(), muteHttpExceptions: true });
            if (g2.getResponseCode() < 400) { try { roles = JSON.parse(g2.getContentText()).roles || []; } catch (e) {} }
            role = roles.filter(r => /haftan.*marvel/i.test(r.name || ''))[0];
          }
        }
        if (role && role.id) {
          try {
            const mr0 = fsReq('get', '/stats/weekRole', null);
            if (mr0.getResponseCode() === 200) {
              const old = JSON.parse(mr0.getContentText());
              const om = old.fields && old.fields.micup && old.fields.micup.stringValue;
              if (om && om !== micupId) {
                UrlFetchApp.fetch(API + '/members/' + om + '/roles/' + role.id, { method: 'delete', headers: botHeaders(), muteHttpExceptions: true });
              }
            }
          } catch (e) {}
          const ar = UrlFetchApp.fetch(API + '/members/' + micupId + '/roles/' + role.id, { method: 'put', headers: botHeaders(), muteHttpExceptions: true });
          roleInfo = { code: ar.getResponseCode(), micup: micupId };
          fsCommit([{ update: { name: 'projects/marvel-turkiye-e53d8/databases/(default)/documents/stats/weekRole', fields: {
            micup: { stringValue: micupId }, week: { stringValue: cur },
            at: { timestampValue: new Date().toISOString() } } } }]);
        } else roleInfo = { err: 'rol bulunamadi/olusturulamadi' };
      }
    }
  } catch (e) { roleInfo = { err: String(e).slice(0, 150) }; }
  return { ok: true, prev: prev, cur: cur, best: best ? best.name : null, bestWp: best ? best.wp : 0, n: n, role: roleInfo, season: seasonEnded ? { ended: prevS.label, top: seasonTop ? seasonTop.map(t => t.name) : [] } : null };
}
function ensureWeekTrigger(){
  try {
    const c = CacheService.getScriptCache();
    if (c.get('mt_trig_ok')) return;
    const trs = ScriptApp.getProjectTriggers();
    if (!trs.some(t => t.getHandlerFunction() === 'weeklyReset')) {
      ScriptApp.newTrigger('weeklyReset').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(0).nearMinute(5).create();
    }
    c.put('mt_trig_ok', '1', 21600);
  } catch (e) {}
}

function makeCustomToken(uid, claims){
  const now = Math.floor(Date.now()/1000);
  const header  = {alg:'RS256', typ:'JWT'};
  const payload = {iss:SA_EMAIL, sub:SA_EMAIL, aud:FB_AUDIENCE, iat:now, exp:now+3600, uid:uid, claims:claims||{}};
  const unsigned = b64urlStr(JSON.stringify(header))+'.'+b64urlStr(JSON.stringify(payload));
  const sig = Utilities.computeRsaSha256Signature(unsigned, SA_KEY);
  return unsigned+'.'+b64urlBytes(sig);
}



const GUILD_NAME_RE = /marvel\s*t[üu]rk[iİı]ye/i;
const GUILD_ID = '1567516267286888448'; // Marvel Turkiye sunucu ID'si

function botHeaders() { return { Authorization: 'Bot ' + BOT_TOKEN }; }

// herhangi bir micup kullanicisinin sunucudaki rollerini bot ile cek
function fetchRolesFor(uid) {
  if (!BOT_TOKEN || !uid) return null;
  const ck = 'mcup_role_' + uid;
  const hit = CacheService.getScriptCache().get(ck);
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  try {
    const mr = UrlFetchApp.fetch('https://micup.gg/api/v1/guilds/' + GUILD_ID + '/members/' + uid, { headers: botHeaders(), muteHttpExceptions: true });
    if (mr.getResponseCode() >= 400) return { error: 'HTTP ' + mr.getResponseCode() };
    const mem = JSON.parse(mr.getContentText());
    const rids = Array.isArray(mem.roles) ? mem.roles : [];
    if (!rids.length) { const out = { roles: [] }; CacheService.getScriptCache().put(ck, JSON.stringify(out), 120); return out; }
    const gr = UrlFetchApp.fetch('https://micup.gg/api/v1/guilds/' + GUILD_ID, { headers: botHeaders(), muteHttpExceptions: true });
    let rlist = [];
    if (gr.getResponseCode() < 400) { const gd = JSON.parse(gr.getContentText()); rlist = Array.isArray(gd.roles) ? gd.roles : []; }
    const byId = {}; rlist.forEach(r => { byId[r.id] = r; });
    const roles = rids.map(id => { const d = byId[id]; return d ? { id: id, name: d.name, color: d.color || 0, position: d.position || 0 } : { id: id, name: 'Rol ' + id, color: 0, position: 0 }; })
      .sort((a, b) => (b.position || 0) - (a.position || 0)).slice(0, 10);
    const out = { roles: roles };
    CacheService.getScriptCache().put(ck, JSON.stringify(out), 120);
    return out;
  } catch (e) { return { error: String(e) }; }
}

function fetchProfile(h) {
  const mr = UrlFetchApp.fetch(ME_URL, { headers: h, muteHttpExceptions: true });
  if (mr.getResponseCode() >= 400) throw new Error('Profil alinamadi (HTTP ' + mr.getResponseCode() + ')');
  const user = JSON.parse(mr.getContentText());

  let guilds = null, memberCount = null, guildRaw = null, guildDetailRaw = null, guildDetailCode = 0, memberRoles = null, memberHttp = null;
  try {
    const gr = UrlFetchApp.fetch(GUILDS_URL + '?with_counts=true', { headers: h, muteHttpExceptions: true });
    if (gr.getResponseCode() < 400) guilds = JSON.parse(gr.getContentText());
  } catch (err) {}

  if (Array.isArray(guilds)) {
    const g = guilds.find(x => GUILD_NAME_RE.test(x.name || ''));
    if (g) {
      guildRaw = g;
      memberCount = g.approximate_member_count || g.member_count || null;
      // once guild detayindan gercek toplam uye sayisini al
      if (g.id) {
        try {
          const d = UrlFetchApp.fetch('https://micup.gg/api/v1/guilds/' + g.id, { headers: h, muteHttpExceptions: true });
          guildDetailCode = d.getResponseCode();
          if (d.getResponseCode() < 400) {
            const gd = JSON.parse(d.getContentText());
            guildDetailRaw = gd;
            memberCount = gd.approximate_member_count || gd.member_count || memberCount;
          } else {
            guildDetailRaw = { _http: d.getResponseCode(), _body: String(d.getContentText()).slice(0, 300) };
          }
        } catch (err2) { guildDetailRaw = { _err: String(err2) }; }
      }
      // son care: liste verisi (presence = cevrimici sayisi olabilir, toplama en son)
      if (!memberCount) memberCount = g.approximate_presence_count || null;
      // uyenin sunucudaki rolleri (profil gosterimi icin) — birkac endpoint dene
      if (g.id) {
        const uid = user.id;
        const eps = [];
        if (BOT_TOKEN) eps.push({ ep: '/api/v1/guilds/' + g.id + '/members/' + uid, hdr: { Authorization: 'Bot ' + BOT_TOKEN } });
        eps.push(
          { ep: '/api/v1/guilds/' + g.id + '/members/@me', hdr: h },
          { ep: '/api/v1/guilds/' + g.id + '/members/' + uid, hdr: h },
          { ep: '/api/v1/users/@me/guilds/' + g.id + '/member', hdr: h },
          { ep: '/api/v1/users/@me/guilds/' + g.id, hdr: h },
        );
        let mem = null; const codes = [];
        for (const it of eps) {
          try {
            const r = UrlFetchApp.fetch('https://micup.gg' + it.ep, { headers: it.hdr, muteHttpExceptions: true });
            codes.push(r.getResponseCode());
            if (r.getResponseCode() < 400) { mem = JSON.parse(r.getContentText()); break; }
          } catch (eE) { codes.push('x'); }
        }
        memberHttp = codes.join(',');
        if (mem) {
          try {
            const rlist = (guildDetailRaw && Array.isArray(guildDetailRaw.roles)) ? guildDetailRaw.roles : [];
            const byId = {}; rlist.forEach(r => { byId[r.id] = r; });
            let rids = Array.isArray(mem.roles) ? mem.roles : (mem.role_ids || mem.roleIds || []);
            memberRoles = rids.map(r => {
              if (typeof r === 'object' && r) { const id = r.id || r.role_id; const d = byId[id]; return { id: id, name: (d && d.name) || r.name || ('Rol ' + id), color: (d && d.color != null) ? d.color : (r.color != null ? r.color : 0), position: (d && d.position) || r.position || 0 }; }
              const id = r; const d = byId[id]; return d ? { id: id, name: d.name, color: d.color, position: d.position } : { id: id, name: 'Rol ' + id, color: 0, position: 0 };
            }).sort((a, b) => (b.position || 0) - (a.position || 0)).slice(0, 8);
          } catch (eR) {}
        }
      }
    }
  }
  return { user: user, guilds: guilds, memberCount: memberCount, guildRaw: guildRaw, guildDetail: guildDetailRaw, guildDetailCode: guildDetailCode, memberRoles: memberRoles, memberHttp: memberHttp };
}

function doPost(e) {
  let nonce = '';
  try {
    const b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    nonce = String(b.nonce || '');
    if (!nonce) throw new Error('Eksik nonce');

    // baska bir micup kullanicisinin rolleri (bot token ile)
    if (b.action === 'roles') {
      const rres = fetchRolesFor(String(b.micup_id || ''));
      CacheService.getScriptCache().put('mcup_' + nonce, JSON.stringify(rres || { roles: [] }), 120);
      return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
    }

    // admin islemleri: wipe (herkesin econ sifirla), del (duyuru/cekilis sil), weekreset (haftalik puan) — sadece admin micup id
    if (b.action === 'wipe' || b.action === 'wipeall' || b.action === 'del' || b.action === 'weekreset') {
      if (!isAdminMicup(b.micup_id)) { CacheService.getScriptCache().put('mcup_' + nonce, JSON.stringify({ error: 'Admin degilsin' }), CACHE_TTL); return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT); }
      if (b.action === 'weekreset') {
        try { const r = weeklyReset(!!b.force); CacheService.getScriptCache().put('mcup_' + nonce, JSON.stringify(r), CACHE_TTL); }
        catch (err) { CacheService.getScriptCache().put('mcup_' + nonce, JSON.stringify({ error: String(err.message || err) }), CACHE_TTL); }
        return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
      }
      try {
        if (b.action === 'wipe' || b.action === 'wipeall') {
          const wipeTs = new Date().toISOString();
          const all = b.action === 'wipeall';
          PropertiesService.getScriptProperties().setProperty('mcup_econ_reset', String(Date.now()));
          const skipUid = 'micup_' + String(b.micup_id || '');
          const fields = all
            ? { points:{integerValue:'0'}, xp:{integerValue:'0'}, coins:{integerValue:'0'}, wp:{integerValue:'0'}, sp:{integerValue:'0'},
                cards:{mapValue:{fields:{}}}, frames:{arrayValue:{values:[]}}, frame:{nullValue:null},
                ach:{mapValue:{fields:{}}}, showcase:{arrayValue:{values:[]}}, st:{mapValue:{fields:{}}},
                nameColor:{nullValue:null}, champ:{mapValue:{fields:{}}}, wkWon:{mapValue:{fields:{}}},
                econReset:{timestampValue:wipeTs}, progReset:{timestampValue:wipeTs} }
            : { points:{integerValue:'0'}, xp:{integerValue:'0'}, coins:{integerValue:'0'}, econReset:{timestampValue:wipeTs} };
          const mask = Object.keys(fields);
          let done = 0, pt = null;
          do {
            const l = fsList('users', pt); pt = l.next;
            const writes = l.docs.filter(d => !(all && d.name && d.name.endsWith('/' + skipUid))).map(d => ({ update: { name: d.name, fields: fields }, updateMask: { fieldPaths: mask } }));
            if (writes.length) { fsCommit(writes); done += writes.length; }
          } while (pt);
          // stats/public economyReset
          const statName = 'projects/marvel-turkiye-e53d8/databases/(default)/documents/stats/public';
          fsCommit([{ update: { name: statName, fields: { economyReset: { timestampValue: wipeTs } } }, updateMask: { fieldPaths: ['economyReset'] } }]);
          CacheService.getScriptCache().put('mcup_' + nonce, JSON.stringify({ ok: true, n: done }), CACHE_TTL);
        } else {
          const coll = String(b.coll || ''), id = String(b.id || '');
          if (['announcements','raffles'].indexOf(coll) < 0 || !/^[\w-]+$/.test(id)) throw new Error('Gecersiz istek');
          if (coll === 'raffles') {
            let pt = null;
            do { const l = fsList('raffles/' + id + '/entries', pt); pt = l.next;
              if (l.docs.length) fsCommit(l.docs.map(d => ({ delete: d.name })));
            } while (pt);
          }
          fsCommit([{ delete: 'projects/marvel-turkiye-e53d8/databases/(default)/documents/' + coll + '/' + id }]);
          CacheService.getScriptCache().put('mcup_' + nonce, JSON.stringify({ ok: true }), CACHE_TTL);
        }
      } catch (err) { CacheService.getScriptCache().put('mcup_' + nonce, JSON.stringify({ error: String(err.message || err) }), CACHE_TTL); }
      return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
    }

    let accessToken = null;
    if (b.action === 'refresh' && b.access_token) {
      accessToken = b.access_token;
    } else if (b.action === 'friends') {
      accessToken = b.access_token || null; // arkadas dali token'i kendi icinde kullaniyor
    } else {
      if (!b.code || !b.code_verifier || !b.redirect_uri) throw new Error('Eksik alan');
      const tr = UrlFetchApp.fetch(TOKEN_URL, {
        method: 'post',
        contentType: 'application/x-www-form-urlencoded',
        payload: {
          grant_type: 'authorization_code',
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code: b.code,
          redirect_uri: b.redirect_uri,
          code_verifier: b.code_verifier,
        },
        muteHttpExceptions: true,
      });
      const tokText = tr.getContentText() || '{}';
      const tok = JSON.parse(tokText);
      if (tr.getResponseCode() >= 400 || !tok.access_token) {
        throw new Error((tok.error_description || tok.error || ('token HTTP ' + tr.getResponseCode())));
      }
      accessToken = tok.access_token;
    }
    // arkadas listesi: sadece Marvel sunucusunda olan Micup arkadaslari
    if (b.action === 'friends' && b.access_token) {
      const fck = 'mcup_fr_' + b.access_token;
      const fhit = CacheService.getScriptCache().get(fck);
      if (fhit) { CacheService.getScriptCache().put('mcup_' + nonce, fhit, CACHE_TTL); return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT); }
      const fh = { Authorization: 'Bearer ' + b.access_token };
      const fdbg = {};
      let gid = null;
      try {
        const gr = UrlFetchApp.fetch(GUILDS_URL + '?with_counts=true', { headers: fh, muteHttpExceptions: true });
        fdbg.guilds = gr.getResponseCode();
        if (gr.getResponseCode() < 400) { const gl = JSON.parse(gr.getContentText()); const g = (Array.isArray(gl) ? gl : []).find(x => GUILD_NAME_RE.test(x.name || '')); gid = g && g.id; }
      } catch (eG) { fdbg.guilds = 'x'; }
      fdbg.gid = gid || null;
      let memberIds = null;
      if (gid) {
        const mtries = [];
        if (BOT_TOKEN) mtries.push({ ep: 'https://micup.gg/api/v1/guilds/' + gid + '/members?limit=1000', hdr: { Authorization: 'Bot ' + BOT_TOKEN } });
        mtries.push({ ep: 'https://micup.gg/api/v1/guilds/' + gid + '/members?limit=1000', hdr: fh });
        for (const mt of mtries) {
          try {
            const gm = UrlFetchApp.fetch(mt.ep, { headers: mt.hdr, muteHttpExceptions: true });
            fdbg.members = (fdbg.members ? fdbg.members + ',' : '') + gm.getResponseCode();
            if (gm.getResponseCode() < 400) { const ml = JSON.parse(gm.getContentText()); const arr = Array.isArray(ml) ? ml : (ml.members || ml.data || []); memberIds = new Set(arr.map(m => { const u = m.user || m; return u.id || m.id; }).filter(Boolean)); fdbg.memberN = memberIds.size; break; }
          } catch (eM2) { fdbg.members = (fdbg.members ? fdbg.members + ',' : '') + 'x'; }
        }
      }
      let rels = null; const relCodes = [];
      for (const ep of ['relationships', 'friends']) {
        try { const r = UrlFetchApp.fetch('https://micup.gg/api/v1/users/@me/' + ep, { headers: fh, muteHttpExceptions: true }); relCodes.push(r.getResponseCode()); if (r.getResponseCode() < 400) { rels = JSON.parse(r.getContentText()); break; } } catch (eR) { relCodes.push('x'); }
      }
      fdbg.rel = relCodes.join(',');
      const rarr = Array.isArray(rels) ? rels : (rels && (rels.friends || rels.data || rels.users || rels.relationships)) || [];
      const friends = rarr.map(r => r.user || r).filter(u => u && u.id && u.username && (!memberIds || memberIds.has(u.id)))
        .map(u => ({ id: u.id, username: u.username, global_name: u.global_name || null, avatar: u.avatar || null })).slice(0, 100);
      const fout = JSON.stringify({ friends: friends, dbg: fdbg });
      CacheService.getScriptCache().put('mcup_' + nonce, fout, CACHE_TTL);
      CacheService.getScriptCache().put(fck, fout, 60);
      return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
    }

    // tazeleme istekleri icin kisa sureli onbellek: ayni token'a 15sn icinde Micup API'ye tekrar gitme
    const rfKey = (b.action === 'refresh' && b.access_token) ? 'mcup_rf_' + b.access_token : null;
    if (rfKey) { const hit = CacheService.getScriptCache().get(rfKey); if (hit) { CacheService.getScriptCache().put('mcup_' + nonce, hit, CACHE_TTL); return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT); } }

    // canli sayac icin tokeni sakla (su an gecerli olan)
    try { PropertiesService.getScriptProperties().setProperty('mcup_at', accessToken); } catch (eT) {}

    const h = { Authorization: 'Bearer ' + accessToken };
    const prof = fetchProfile(h);
    if (prof.memberCount) { try { PropertiesService.getScriptProperties().setProperty('mcup_member_count', String(prof.memberCount)); } catch (e0) {} }

    let customToken = null, ctErr = '';
    try { customToken = makeCustomToken('micup_' + prof.user.id, { micup:true, username:prof.user.username, name:(prof.user.global_name||prof.user.username) }); }
    catch (err) { ctErr = String((err && err.message) || err); if (!customToken) customToken = null; }
    if (!customToken && !ctErr) ctErr = 'token null dondu';

    const out = JSON.stringify({
      user: prof.user, guilds: prof.guilds, memberCount: prof.memberCount, memberRoles: prof.memberRoles, memberHttp: prof.memberHttp,
      guildRaw: prof.guildRaw, guildDetail: prof.guildDetail, guildDetailCode: prof.guildDetailCode,
      customToken: customToken, ctErr: ctErr, access_token: accessToken
    });
    CacheService.getScriptCache().put('mcup_' + nonce, out, CACHE_TTL);
    if (rfKey) CacheService.getScriptCache().put(rfKey, out, 15);

  } catch (err) {
    if (nonce) CacheService.getScriptCache().put('mcup_' + nonce, JSON.stringify({ error: String(err.message || err) }), CACHE_TTL);
  }
  return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e) {
  ensureWeekTrigger();
  const cb = /^[A-Za-z_$][\w$]*$/.test(e.parameter.callback || '') ? e.parameter.callback : 'cb';
  // herkese acik uye sayaci: mumkunse canli tazele (60sn onbellek), yoksa son bilinen
  if (e.parameter.count) {
    const props = PropertiesService.getScriptProperties();
    let n = +(props.getProperty('mcup_member_count') || 0) || null;
    const lock = LockService.getScriptLock();
    if (lock.tryLock(4000)) {
      try {
        const live = CacheService.getScriptCache().get('mc_cnt_live');
        if (live) { n = +live; }
        else {
          const tok = props.getProperty('mcup_at');
          if (tok) {
            const gr = UrlFetchApp.fetch(GUILDS_URL + '?with_counts=true', { headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true });
            if (gr.getResponseCode() < 400) {
              const list = JSON.parse(gr.getContentText());
              const g = Array.isArray(list) && list.find(x => GUILD_NAME_RE.test(x.name || ''));
              const cnt = g && (g.approximate_member_count || g.member_count || g.approximate_presence_count || null);
              if (cnt) {
                CacheService.getScriptCache().put('mc_cnt_live', String(cnt), 10);
                props.setProperty('mcup_member_count', String(cnt));
                n = cnt;
              }
            }
          }
        }
      } catch (e2) {} finally { lock.releaseLock(); }
    } else {
      const live = CacheService.getScriptCache().get('mc_cnt_live');
      if (live) n = +live;
    }
    return ContentService.createTextOutput(cb + '(' + JSON.stringify({ memberCount: n }) + ');').setMimeType(ContentService.MimeType.JS);
  }
  // herkese acik ekonomi sifirlama damgasi (misafirler dahil)
  if (e.parameter.ereset) {
    const t = +(PropertiesService.getScriptProperties().getProperty('mcup_econ_reset') || 0);
    return ContentService.createTextOutput(cb + '(' + JSON.stringify({ t: t }) + ');').setMimeType(ContentService.MimeType.JS);
  }
  const nonce = String(e.parameter.get || '');
  let data = null;
  if (nonce) {
    // doPost ayni anda calisiyor olabilir; sonuc onbellege dusene kadar bekle
    for (let i = 0; i < 25; i++) {
      data = CacheService.getScriptCache().get('mcup_' + nonce);
      if (data) break;
      Utilities.sleep(1000);
    }
    if (data) CacheService.getScriptCache().remove('mcup_' + nonce);
  }
  if (!data) data = '{"error":"Kopru yanit vermedi, tekrar dene"}';
  return ContentService.createTextOutput(cb + '(' + data + ');').setMimeType(ContentService.MimeType.JS);
}

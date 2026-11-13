
/* ========================= SONUÇ PAYLAŞIMI + KART EKONOMİSİ (sat/ver/takas) + İSTATİSTİK SENKRONU ========================= */
(function(){
  /* --- script0 kapsamindan export edilemeyenler icin guvenli fallback'ler --- */
  const _$=(window.$)||((q,r=document)=>r.querySelector(q)), _$$=(window.$$)||((q,r=document)=>[...r.querySelectorAll(q)]);
  const prog=window.prog||function(){ let o={xp:0,points:0,lastDaily:'',streak:0}; try{ o=Object.assign(o,JSON.parse(localStorage.getItem('mt_prog')||'{}')); }catch(e){} return o; };
  let saveProg=window.saveProg||function(o){ try{ localStorage.setItem('mt_prog',JSON.stringify(o)); }catch(e){} };
  const myCards=window.myCards||function(){ return prog().cards||{}; };
  const setCards=window.setCards||function(c,show){ const s=prog(); s.cards=c; if(show)s.showcase=show; saveProg(s); };
  const toast=function(t,x){ try{ if(typeof window.__toast==='function') window.__toast(t,x); }catch(e){} };
  const openModal=window.openModal||function(){};
  const swap=window.swap||function(h){ const b=document.getElementById('mBody'); if(b)b.innerHTML=h; };
  const mBody=window.mBody||document.getElementById('mBody');
  const esc=window.esc||function(x){ return String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); };
  const SFX=window.SFX||{play(){},sfx(){},unlock(){},mVol:1,sVol:1};
  const FB=window.FB||{ready:false,user:null,admin:false,db:null,auth:null};
  const AUTH=window.AUTH||{user:null,mode:'none'};
  const G=window.G||null;
  const HEROES_CG=window.HEROES_CG||[];
  const HERO_BY=window.HERO_BY||{};
  const cardFace=window.cardFace||function(){ return ''; };
  const syncCards=window.syncCards||async function(){};
  const renderShop=window.renderShop||function(){};
  const burst=window.burst||function(){};
  const avatarHTML=window.avatarHTML||function(){ return ''; };
  const buzz=window.buzz||function(){};
  const RAR=window.RAR||{};
  const S=window.S||function(){};
  const $=_$, $$=_$$;

  const st=document.createElement('style'); st.textContent=`
  .shr{display:grid;gap:12px;justify-items:center;text-align:center}
  .shr .pv{width:min(300px,70vw);border:5px solid var(--inkc);border-radius:10px;box-shadow:7px 7px 0 var(--inkc);overflow:hidden;background:#0d0b14}
  .colx{display:grid;gap:10px}
  .colx .hd{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .colx .hd b{font-family:var(--display);font-size:30px;letter-spacing:.03em}
  .colx .cgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(86px,1fr));gap:10px}
  .colx .ck{position:relative;border:3px solid var(--inkc);border-radius:8px;background:var(--s1);padding:4px;cursor:pointer;aspect-ratio:5/7;display:grid;place-items:center;overflow:hidden}
  .colx .ck img{width:100%;height:100%;object-fit:cover;display:block}
  .colx .ck.lock{opacity:.45;cursor:default}
  .colx .ck.sel{outline:4px solid var(--gold);outline-offset:2px}
  .colx .ck i{position:absolute;right:4px;bottom:4px;font-style:normal;font:800 11px var(--mono);background:var(--inkc);color:var(--gold);padding:1px 6px;border-radius:99px}
  .colx .ck s{position:absolute;left:4px;top:4px;color:var(--gold);font-size:14px;text-decoration:none}
  .colact{border:4px solid var(--inkc);border-radius:8px;background:var(--s2);padding:14px;display:grid;gap:10px;box-shadow:5px 5px 0 var(--inkc)}
  .colact .chd{display:flex;gap:12px;align-items:center}
  .colact .chd img{width:64px;height:90px;object-fit:cover;border:3px solid var(--inkc);border-radius:6px}
  .colact .chd b{font-family:var(--display);font-size:24px;display:block;line-height:1}
  .colact .chd small{color:var(--dim);font-family:var(--mono);font-size:11px;letter-spacing:.1em}
  .colact .rowb{flex-wrap:wrap}
  .colact .rowb .btn,.colact .rowb .ghost{flex:1;min-width:120px}
  .trd{display:grid;gap:10px}
  .trd .tri{display:flex;gap:12px;align-items:center;background:var(--s2);border:3px solid var(--inkc);border-radius:8px;padding:10px 12px;flex-wrap:wrap}
  .trd .tri img{width:44px;height:62px;object-fit:cover;border:2px solid var(--inkc);border-radius:5px}
  .trd .tri .tx{flex:1;min-width:140px}
  .trd .tri .tx b{display:block}
  .trd .tri .tx small{color:var(--dim);font-size:12px}
  .trd .tri .ac{display:flex;gap:8px;flex-wrap:wrap}`;
  document.head.appendChild(st);

  /* ================= SONUÇ KARTI PAYLAŞIMI ================= */
  const RAR2={b:'#C8834A',g:'#D5DAE4',a:'#FFB627',e:'#FF3B4E'};
  function drawShare(o){
    const W=640,H=860,c=document.createElement('canvas'); c.width=W;c.height=H; const x=c.getContext('2d');
    const bg=x.createLinearGradient(0,0,0,H); bg.addColorStop(0,'#1a1030');bg.addColorStop(.55,'#2a0f1e');bg.addColorStop(1,'#0d0b14'); x.fillStyle=bg; x.fillRect(0,0,W,H);
    x.strokeStyle='rgba(255,255,255,.05)'; x.lineWidth=2;
    for(let i=0;i<14;i++){ x.beginPath(); x.moveTo(0,i*70+((i*37)%30)); x.lineTo(W,i*70+((i*53)%30)); x.stroke(); }
    x.textAlign='center';
    x.fillStyle='#FF3B4E'; x.font='900 30px "Big Shoulders Display",Impact,sans-serif'; x.fillText('MARVEL',W/2,86);
    x.fillStyle='#FFD34A'; x.font='900 44px "Big Shoulders Display",Impact,sans-serif'; x.fillText('TÜRKİYE',W/2,136);
    x.fillStyle='#fff'; x.font='700 26px "Big Shoulders Display",sans-serif'; x.fillText(o.title||'Sonuç',W/2,196);
    x.fillStyle='#9aa'; x.font='600 17px monospace'; x.fillText(o.sub||'',W/2,228);
    const rows=(o.rows||[]).slice(0,8); const y0=290, rh=56;
    rows.forEach((r,i)=>{ const y=y0+i*rh, me=r.me||r.id===o.me, col=me?'#FFD34A':'#e8edf5';
      x.fillStyle=me?'rgba(255,211,77,.12)':'rgba(255,255,255,.04)'; x.fillRect(40,y-34,W-80,rh-8);
      if(me){ x.strokeStyle='#FFD34A';x.lineWidth=3;x.strokeRect(40,y-34,W-80,rh-8); }
      x.fillStyle=col; x.font='800 24px "Big Shoulders Display",sans-serif'; x.textAlign='left'; x.fillText(`${i+1}. ${String(r.name||'?').slice(0,22)}`,62,y+4);
      x.textAlign='right'; x.fillStyle='#FFD34A'; x.font='800 24px "Big Shoulders Display",sans-serif';
      x.fillText((r.pts!=null?('+'+r.pts+' puan'):('+'+r.n+' doğru')),W-62,y+4);
      x.textAlign='center'; });
    x.fillStyle='#FFD34A'; x.font='800 30px "Big Shoulders Display",sans-serif'; x.fillText(o.badge||(o.win?'🏆 ŞAMPİYON!':'MAÇ BİTTİ'),W/2,H-90);
    x.fillStyle='#667'; x.font='600 14px monospace'; x.fillText('marvel-turkiye · fan community',W/2,H-56);
    return c;
  }
  async function shareResult(o){
    const c=drawShare(o);
    const text=`${o.title||'Marvel Türkiye'} — ${o.badge||(o.win?'Şampiyon!':'Sonuç')} ${(o.rows||[]).map((r,i)=>`${i+1}. ${r.name} ${r.pts!=null?'+'+r.pts+'p':'+'+r.n}`).join(' · ')}`;
    try{ const blob=await new Promise(r=>c.toBlob(r,'image/png')); if(blob&&navigator.canShare&&navigator.canShare({files:[new File([blob],'sonuc.png',{type:'image/png'})]})){
      await navigator.share({files:[new File([blob],'sonuc.png',{type:'image/png'})],title:o.title||'Marvel Türkiye',text}); toast('Paylaşıldı','Sonuç kartın gönderildi.'); return; } }catch(e){ if(e&&e.name==='AbortError') return; }
    try{ const a=document.createElement('a'); a.href=c.toDataURL('image/png'); a.download='marvel-sonuc.png'; a.click(); }catch(e){}
    try{ await navigator.clipboard.writeText(text); toast('Sonuç indirildi','Görsel kaydedildi, metin panoda — yapıştırıp paylaşabilirsin.'); }
    catch(e){ toast('Sonuç hazır','Görsel indirildi — onu paylaşabilirsin.'); }
  }
  window.shareResult=shareResult;

  /* ================= KART EKONOMİSİ ================= */
  const SELL={b:20,g:50,a:150,e:500};
  const myName=()=>AUTH.user?(AUTH.user.display||AUTH.user.username):(localStorage.getItem('mt_name')||'Oyuncu');
  const sellP=h=>SELL[h.r]||20;
  function addCoins(n){ const s=prog(); s.coins=Math.max(0,(s.coins||0)+Math.round(n)); saveProg(s); window.renderShop&&renderShop(); if(FB.ready&&FB.user) FB.db.collection('users').doc(FB.user.uid).set({coins:s.coins},{merge:true}).catch(()=>{}); return s.coins; }
  function decCard(id){ const c=myCards(); if(!c[id]) return false; if(--c[id]<=0) delete c[id]; setCards(c); return true; }
  function incCard(id){ const c=myCards(); c[id]=(c[id]||0)+1; setCards(c); }

  /* --- istatistik senkronu: her ilerleme değişiminde buluta da yaz --- */
  let sT=null;
  function syncExtra(){ clearTimeout(sT); sT=setTimeout(()=>{ if(!(FB.ready&&FB.user)) return; const s=prog();
    FB.db.collection('users').doc(FB.user.uid).set({st:s.st||{},nCards:Object.keys(s.cards||{}).length,cg:window.CGSTATS?CGSTATS.raw():null},{merge:true}).catch(()=>{}); },2000); }
  const _sp=saveProg; saveProg=function(s){ _sp(s); syncExtra(); };
  (function w(){ if(FB.ready&&FB.auth){ FB.auth.onAuthStateChanged(async u=>{ if(!u) return;
    try{ const d=(await FB.db.collection('users').doc(u.uid).get()).data()||{}; if(d.cg&&window.CGSTATS) CGSTATS.merge(d.cg); }catch(e){} }); } else setTimeout(w,800); })();

  /* --- arkadaş listesi (hediye/takas için) --- */
  async function myFriends(){ if(!(FB.ready&&FB.user)) return []; const uid=FB.user.uid, out=[];
    for(const f of ['from','to']){ try{ const q=await FB.db.collection('friendReqs').where(f,'==',uid).get();
      q.docs.forEach(d=>{ const x=d.data(); if(x.status!=='accepted') return; const o=f==='from'?{uid:x.to,name:x.toName,avatar:x.toAvatar}:{uid:x.from,name:x.fromName,avatar:x.fromAvatar}; if(o.uid&&o.uid!==uid) out.push(o); }); }catch(e){} }
    const m={}; out.forEach(f=>{ if(!m[f.uid]) m[f.uid]=f; }); return Object.values(m); }
  const fbOK=()=>FB.ready&&FB.user;

  /* --- koleksiyon (yeniden: işlem paneli eklendi) --- */
  let selId=null,colF='all',colS='r',colQ='';
  function openCollection(){
    const c=myCards(), show=(prog().showcase||[]).filter(id=>c[id]);
    const order={e:0,a:1,g:2,b:3}; const list=[...HEROES_CG].sort((x,y)=>order[x.r]-order[y.r]);
    openModal('Koleksiyonum'); selId=null;
    const own=Object.keys(c).length;
    swap(`<div class="colx"><div class="hd"><b>${own}<small style="font-family:var(--mono);color:var(--dim)">/${HEROES_CG.length}</small></b>
        <span class="mono dim" style="flex:1">Profil vitrinine en fazla 3 kart. Karta dokun, işlem yap.</span>
        <button class="ghost" id="colTr" type="button">⇄ Takas teklifleri</button><button class="ghost" id="colDup" type="button" hidden></button></div>
      <div class="bar" style="height:10px;background:var(--s2);border:2px solid var(--inkc);border-radius:99px;overflow:hidden"><i style="display:block;height:100%;width:${Math.round(own/HEROES_CG.length*100)}%;background:var(--gold)"></i></div>
      <div class="rowb" style="gap:8px;flex-wrap:wrap;margin:10px 0">
        <button class="ghost colF" data-f="all" type="button" style="padding:8px 14px">Tümü</button>
        <button class="ghost colF" data-f="own" type="button" style="padding:8px 14px">Sahip olduklarım</button>
        <button class="ghost colF" data-f="miss" type="button" style="padding:8px 14px">Koleksiyonda yok</button>
        <button class="ghost colF" data-f="rare" type="button" style="padding:8px 14px">⭐ Nadir+</button>
        <button class="ghost colF" data-f="dup" type="button" style="padding:8px 14px">♻ Kopyalar</button>
        <select id="colSort" class="field" style="margin-left:auto;padding:8px 12px;font-size:13px">
          <option value="r">Nadirlik</option><option value="n">İsim (A-Z)</option><option value="c">En çok olan</option><option value="p">Güç (toplam)</option>
        </select></div>
      <input class="field" id="colQ" placeholder="🔍 Kahraman ara…" autocomplete="off" value="" style="height:44px;font-size:15px;margin-bottom:10px">
      <div class="cgrid" id="colGrid"></div>
      <div id="colAct"></div>
      <p class="dim" style="margin:0;font-size:13px">Kartlar günlük şans çarkından, mağaza paketlerinden ve hediyelerden düşer. Kopya kartlarını coin karşılığı satabilir, kartlarını arkadaşına hediye edebilir ya da arkadaşınla takas edebilirsin.</p></div>`);
    $$('.ck[data-id]').forEach(b=>b.onclick=()=>{ selId=b.dataset.id; SFX.play('click'); const c2=myCards();
      $$('.ck[data-id]').forEach(x=>x.classList.toggle('sel',x.dataset.id===selId));
      drawAct(selId,c2); });
    const tr=$('#colTr'); tr&&(tr.onclick=()=>{ SFX.play('click'); if(!fbOK()) return openLogin(); drawTrades(); });
    $$('.colF').forEach(b=>b.onclick=()=>{ colF=b.dataset.f; SFX.play('click'); $$('.colF').forEach(x=>x.style.opacity=x===b?'1':'.55'); drawGrid(); });
    $$('.colF').forEach(x=>x.style.opacity=x.dataset.f===colF?'1':'.55');
    const cs=$('#colSort'); cs&&(cs.onchange=()=>{ colS=cs.value; SFX.play('click'); drawGrid(); });
    const cq=$('#colQ'); if(cq){ cq.value=colQ; cq.oninput=()=>{ colQ=cq.value.toLocaleLowerCase('tr').trim(); drawGrid(); }; }
    drawGrid();
    const dp=$('#colDup'); if(dp){ const dl=HEROES_CG.filter(h=>(c[h.id]||0)>1), dn=dl.reduce((n,h)=>n+c[h.id]-1,0), dv=dl.reduce((n,h)=>n+(c[h.id]-1)*sellP(h),0);
      if(dn>0){ dp.hidden=false; dp.textContent=`♻ Kopyaları sat (${dn}) +${dv.toLocaleString('tr-TR')} 🪙`; let arm=false;
        dp.onclick=()=>{ if(!arm){ arm=true; dp.textContent=`Emin misin? ${dn} kart → +${dv.toLocaleString('tr-TR')} 🪙`; SFX.play('click'); setTimeout(()=>{ arm=false; },3000); return; }
          const c2=myCards(); let got=0,n=0; HEROES_CG.forEach(h=>{ const k=c2[h.id]||0; if(k>1){ got+=(k-1)*sellP(h); n+=k-1; c2[h.id]=1; } }); setCards(c2); addCoins(got); if(window.syncCards) syncCards();
          SFX.play('win'); buzz&&buzz([20,40,20]); toast('Kopyalar satıldı',`${n} kart → +${got.toLocaleString('tr-TR')} coin`); openCollection(); }; } }
    setTimeout(settleTrades,400);
  }
  function drawGrid(){
    const c=myCards(), g=$('#colGrid'); if(!g) return;
    const show=(prog().showcase||[]).filter(id=>c[id]);
    let list=[...HEROES_CG];
    if(colF==='own') list=list.filter(h=>c[h.id]);
    else if(colF==='miss') list=list.filter(h=>!c[h.id]);
    else if(colF==='rare') list=list.filter(h=>c[h.id]&&(h.r==='a'||h.r==='e'));
    else if(colF==='dup') list=list.filter(h=>(c[h.id]||0)>1);
    if(colQ) list=list.filter(h=>h.ad.toLocaleLowerCase('tr').includes(colQ));
    const RO={e:0,a:1,g:2,b:3};
    if(colS==='n') list.sort((x,y)=>x.ad.localeCompare(y.ad,'tr'));
    else if(colS==='c') list.sort((x,y)=>(c[y.id]||0)-(c[x.id]||0));
    else if(colS==='p') list.sort((x,y)=>y.s.reduce((a,b)=>a+b,0)-x.s.reduce((a,b)=>a+b,0));
    else list.sort((x,y)=>RO[x.r]-RO[y.r]);
    if(!list.length){ g.innerHTML=`<p class="dim" style="grid-column:1/-1;text-align:center;padding:24px">${colQ?'Bu isimde kahraman bulunamadı.':colF==='dup'?'Kopya kartın yok.':'Bu filtrede kart yok.'}</p>`; return; }
    g.innerHTML=list.map(h=>c[h.id]?`<button type="button" class="ck r-${h.r}${selId===h.id?' sel':''}" data-id="${h.id}"><img alt="${esc(h.ad)}" src="${cardFace(h)}"><i class="mono">x${c[h.id]}</i>${show.includes(h.id)?'<s>★</s>':''}</button>`:`<div class="ck lock r-${h.r}"><span>?</span><i class="mono">${RAR[h.r][0]}</i></div>`).join('')||'<p class="dim" style="grid-column:1/-1;text-align:center;padding:40px">Bu filtrede kart yok.</p>';
    $$('.ck[data-id]',g).forEach(b=>b.onclick=()=>{ selId=b.dataset.id; SFX.play('click'); const c2=myCards();
      $$('.ck[data-id]',g).forEach(x=>x.classList.toggle('sel',x.dataset.id===selId));
      drawAct(selId,c2); });
  }
  function drawAct(id,c){
    const box=$('#colAct'); if(!box) return; const h=HERO_BY[id]; if(!h) return;
    const cnt=c[id]||0, sh=(prog().showcase||[]), inShow=sh.includes(id), canShow=!inShow&&sh.length<3;
    box.innerHTML=`<div class="colact"><div class="chd"><img src="${cardFace(h)}" alt="${esc(h.ad)}"><div><b style="color:${RAR[h.r][1]}">${esc(h.ad)}</b><small>${RAR[h.r][0]} · x${cnt}</small></div></div>
      <div class="rowb">
        <button class="ghost" id="caV" type="button" ${canShow||inShow?'':'disabled'}>${inShow?'Vitrinden çıkar':'Vitrine koy'}</button>
        <button class="btn p" id="caS" type="button" ${cnt>1?'':'disabled'}><span class="bl"><span>Sat +${sellP(h)} 🪙</span><span>${cnt>1?'Sat +'+sellP(h)+' 🪙':'Kopyan yok'}</span></span></button>
        <button class="ghost" id="caG" type="button">🎁 Arkadaşına ver</button>
        <button class="ghost" id="caT" type="button">⇄ Takas teklif et</button>
      </div><p class="dim" style="margin:0;font-size:12px">Satmak için en az 2 kopyan olmalı, biri koleksiyonunda kalır. Hediye ve takas sadece arkadaşlarınla yapılır.</p></div>`;
    $('#caV').onclick=()=>{ if(!canShow&&!inShow) return; const s=prog(); let sh2=(s.showcase||[]).filter(x=>c[x]);
      if(inShow) sh2=sh2.filter(x=>x!==id); else sh2.push(id); setCards(c,sh2); SFX.play('confirm'); openCollection(); };
    const sb=$('#caS'); let armed=false;
    sb.onclick=()=>{ if(cnt<=1) return; if(!armed){ armed=true; sb.querySelector('.bl').innerHTML=`<span>Emin misin? +${sellP(h)} 🪙</span><span>Emin misin?</span>`; setTimeout(()=>{ if(armed){armed=false; const b2=$('#caS'); b2&&b2.querySelector('.bl')&&(b2.querySelector('.bl').innerHTML=`<span>Sat +${sellP(h)} 🪙</span><span>Sat +${sellP(h)} 🪙</span>`); }},2600); return; }
      armed=false; if(!decCard(id)) return; addCoins(sellP(h)); SFX.play('win'); buzz&&buzz([20,40,20]); toast('Kart satıldı',`${h.ad} → +${sellP(h)} coin`); openCollection(); };
    $('#caG').onclick=()=>pickFriend('ver',id,h);
    $('#caT').onclick=()=>pickFriend('takas',id,h);
  }
  /* --- arkadaş seçici --- */
  async function pickFriend(mode,hid,h){
    if(!fbOK()) return toast('Giriş gerekli','Hediye ve takas için Micup ile giriş yapmalısın.');
    const list=await myFriends();
    if(!list.length) return toast('Arkadaşın yok','Önce sıralamadan birinin profilinden arkadaş ekle.');
    openModal(mode==='ver'?'Hediye gönder':'Takas teklif et');
    swap(`<div class="trd"><p class="dim" style="margin:0">Göndereceğin kart: <b style="color:var(--fg)">${esc(h.ad)}</b> (${RAR[h.r][0]}). ${mode==='ver'?'Kart koleksiyonundan çıkar ve arkadaşına geçer.':'Arkadaşın aynı nadirlikte bir kartını verirse takas olur. O zamana kadar kartın emanette bekler.'}</p>
      <div class="fr-list">${list.map(f=>`<div class="fr-row"><span class="avw">${avatarHTML({display:f.name,avatar:f.avatar},34)}</span><div class="tx"><b>${esc(f.name||'Oyuncu')}</b></div><div class="ac"><button class="btn p sm" data-f="${f.uid}" data-n="${esc(f.name||'Oyuncu')}" type="button"><span class="bl"><span>${mode==='ver'?'Gönder':'Teklif et'}</span><span>${mode==='ver'?'Gönder':'Teklif et'}</span></span></button></div></div>`).join('')}</div>
      <div class="rowb"><button class="ghost" id="pfBack" type="button">← Geri</button></div></div>`);
    $('#pfBack').onclick=()=>openCollection();
    $$('[data-f]',mBody).forEach(b=>b.onclick=async()=>{ const fid=b.dataset.f, fname=b.dataset.n; b.disabled=true;
      if(!(myCards()[hid]>0)){ toast('Kart yok','Bu kart artık sende değil.'); return openCollection(); }
      decCard(hid);
      try{ if(mode==='ver'){
          await FB.db.collection('gifts').add({to:fid,from:FB.user.uid,fromName:myName(),kind:'card',hero:hid,amount:1,msg:'',claimed:false,at:firebase.firestore.FieldValue.serverTimestamp()});
          SFX.play('confirm'); toast('Hediye gönderildi',`${fname} kartı gördüğünde koleksiyonuna eklenir.`); }
        else {
          await FB.db.collection('trades').add({from:FB.user.uid,fromName:myName(),to:fid,toName:fname,give:hid,wantRar:h.r,status:'pending',escrow:true,at:firebase.firestore.FieldValue.serverTimestamp()});
          SFX.play('confirm'); toast('Takas teklifi gönderildi',`${fname} kabul edene kadar kartın emanette bekler. İptal edersen geri gelir.`); }
        if(window.syncCards) syncCards(); openCollection();
      }catch(e){ incCard(hid); b.disabled=false; toast('Gönderilemedi',String(e.code||e.message)); } });
  }
  /* --- takas teklifleri --- */
  async function drawTrades(){
    openModal('Takas teklifleri');
    swap(`<div class="trd"><p class="dim" style="margin:0">Yükleniyor…</p></div>`);
    let inc=[],out=[];
    try{ const uid=FB.user.uid;
      const qi=await FB.db.collection('trades').where('to','==',uid).get(); inc=qi.docs.map(d=>({id:d.id,...d.data()})).filter(t=>t.status==='pending');
      const qo=await FB.db.collection('trades').where('from','==',uid).get(); out=qo.docs.map(d=>({id:d.id,...d.data()})).filter(t=>t.status==='pending');
    }catch(e){}
    const cardOf=id=>HERO_BY[id];
    swap(`<div class="trd"><div class="hd"><b style="font-family:var(--display);font-size:24px">Takas teklifleri</b><span class="mono dim" style="flex:1">1 kart ↔ 1 kart, aynı nadirlik</span><button class="ghost" id="trBack" type="button">← Koleksiyon</button></div>
      <span class="mono dim">Gelen teklifler</span>
      <div class="fr-list">${inc.length?inc.map(t=>{ const g=cardOf(t.give); return `<div class="tri">${g?`<img src="${cardFace(g)}" alt="">`:''}<div class="tx"><b>${esc(t.fromName||'Oyuncu')}</b><small>${g?esc(g.ad)+' ('+RAR[g.r][0]+') veriyor':''} · karşılığında ${RAR[t.wantRar]?RAR[t.wantRar][0]:'?'} istiyor</small></div><div class="ac"><button class="btn p sm" data-pick="${t.id}" type="button"><span class="bl"><span>Kart seç</span><span>Kart seç</span></span></button><button class="ghost" data-rej="${t.id}" type="button">Reddet</button></div></div>`;}).join(''):'<p class="dim" style="margin:0">Bekleyen teklif yok.</p>'}</div>
      <span class="mono dim">Gönderdiğin teklifler</span>
      <div class="fr-list">${out.length?out.map(t=>{ const g=cardOf(t.give); return `<div class="tri">${g?`<img src="${cardFace(g)}" alt="">`:''}<div class="tx"><b>${esc(t.toName||'Oyuncu')}</b><small>${g?esc(g.ad):'—'} · ${RAR[t.wantRar]?RAR[t.wantRar][0]:'?'} istiyor · bekliyor</small></div><div class="ac"><button class="ghost" data-can="${t.id}" type="button">İptal et, kartı geri al</button></div></div>`;}).join(''):'<p class="dim" style="margin:0">Açık teklifin yok.</p>'}</div></div>`);
    $('#trBack').onclick=()=>openCollection();
    $$('[data-can]',mBody).forEach(b=>b.onclick=async()=>{ b.disabled=true; const t0=out.find(t=>t.id===b.dataset.can);
      try{ const ref=FB.db.collection('trades').doc(b.dataset.can), cur=(await ref.get()).data()||{};
        if(cur.status!=='pending'){ toast('Teklif değişmiş','Arkadaşın az önce cevap verdi.'); await settleTrades(); return drawTrades(); }
        await ref.set({status:'cancelled',got:true},{merge:true}); if(cur.escrow){ incCard(cur.give); if(window.syncCards) syncCards(); toast('Teklif iptal edildi','Kartın koleksiyonuna geri döndü.'); }
        SFX.play('click'); drawTrades(); }catch(e){ b.disabled=false; toast('Olmadı',String(e.code||e.message)); } });
    $$('[data-rej]',mBody).forEach(b=>b.onclick=async()=>{ b.disabled=true; try{ await FB.db.collection('trades').doc(b.dataset.rej).set({status:'rejected'},{merge:true}); SFX.play('click'); toast('Teklif reddedildi','Kart sahibine geri döner.'); drawTrades(); }catch(e){ b.disabled=false; toast('Olmadı',String(e.code||e.message)); } });
    $$('[data-pick]',mBody).forEach(b=>b.onclick=()=>pickTradeCard(b.dataset.pick,inc.find(t=>t.id===b.dataset.pick)));
  }
  function pickTradeCard(tid,tr){
    const c=myCards(), opts=HEROES_CG.filter(h=>h.r===tr.wantRar&&(c[h.id]||0)>0);
    openModal('Karşılık kartı seç');
    swap(`<div class="trd"><p class="dim" style="margin:0"><b style="color:var(--fg)">${esc(tr.fromName||'Oyuncu')}</b> senin <b style="color:var(--gold)">${esc((HERO_BY[tr.give]||{}).ad||'?')}</b> kartına karşılık ${RAR[tr.wantRar]?RAR[tr.wantRar][0]:'?'} nadirliğinde bir kart istiyor. Hangisini veriyorsun?</p>
      <div class="cgrid">${opts.length?opts.map(h=>`<button type="button" class="ck r-${h.r}" data-g="${h.id}"><img src="${cardFace(h)}" alt="${esc(h.ad)}"><i class="mono">x${c[h.id]}</i></button>`).join(''):'<p class="dim">Bu nadirlikte kartın yok — takası kabul edemezsin.</p>'}</div>
      <div class="rowb"><button class="ghost" id="pcBack" type="button">← Geri</button></div></div>`);
    $('#pcBack').onclick=()=>drawTrades();
    $$('.ck[data-g]',mBody).forEach(b=>b.onclick=()=>acceptTrade(tid,tr,b.dataset.g));
  }
  async function acceptTrade(tid,tr,giveId){
    const g=HERO_BY[giveId]; if(!g) return;
    try{
      const ref=FB.db.collection('trades').doc(tid), cur=(await ref.get()).data()||{};
      if(cur.status!=='pending') throw new Error('Bu teklif artık geçerli değil');
      if(!(myCards()[giveId]>0)) throw new Error('Kartın artık sende yok');
      await ref.set({status:'done',pick:giveId,doneAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
      decCard(giveId); incCard(tr.give); if(window.syncCards) syncCards();
      SFX.play('win'); burst&&burst(true); toast('Takas tamam!',`${(HERO_BY[tr.give]||{}).ad||'Kart'} artık senin.`);
      openCollection();
    }catch(e){ toast('Takas olmadı',String(e.message||e.code||e)); drawTrades(); }
  }
  /* --- biten takasları kapat: teklif eden taraf karşılık kartını (ya da reddedilince kendi kartını) alır --- */
  let stBusy=false, stTold=false;
  async function settleTrades(){ if(!fbOK()||stBusy) return; stBusy=true;
    try{ const uid=FB.user.uid, q=await FB.db.collection('trades').where('from','==',uid).get(); let ch=false;
      for(const d of q.docs){ const t=d.data(); if(t.got||!['done','rejected'].includes(t.status)) continue;
        await d.ref.set({got:true},{merge:true});
        if(t.status==='done'){ if(!t.escrow) decCard(t.give); if(HERO_BY[t.pick]){ incCard(t.pick); toast('Takas tamamlandı ⇄',`${t.toName||'Arkadaşın'} sana ${HERO_BY[t.pick].ad} kartını verdi.`); SFX.play('win'); } }
        else if(t.escrow){ incCard(t.give); toast('Takas reddedildi',`${(HERO_BY[t.give]||{}).ad||'Kartın'} koleksiyonuna geri döndü.`); }
        ch=true; }
      if(ch){ if(window.syncCards) syncCards(); if($('#colGrid')) drawGrid(); }
      if(!stTold){ stTold=true; const qi=await FB.db.collection('trades').where('to','==',uid).get(); const n=qi.docs.filter(d=>d.data().status==='pending').length;
        if(n) toast('Takas teklifin var ⇄',`${n} teklif bekliyor: Koleksiyonum → Takas teklifleri.`); }
    }catch(e){} stBusy=false; }
  (function w(){ if(FB.ready&&FB.auth){ FB.auth.onAuthStateChanged(u=>{ stTold=false; if(u) setTimeout(settleTrades,7000); }); } else setTimeout(w,900); })();
  window.openCollection=openCollection; window.__ekoCol=openCollection;
})();

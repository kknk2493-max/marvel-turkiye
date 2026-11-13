
(function(){
/* online bağlantı: birden çok STUN sunucusu (farklı ağlardaki oyuncular birbirini daha kolay bulsun) */
(function(){ const P=window.Peer; if(typeof P!=='function'||P.__mt) return; const ICE={config:{iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302']},{urls:'stun:stun.cloudflare.com:3478'}]}};
  const W=function(id,opt){ if(id&&typeof id==='object'){ opt=id; id=undefined; } const o=Object.assign({},ICE,opt||{}); return new P(id,o); };
  W.prototype=P.prototype; W.__mt=1; try{ window.Peer=W; }catch(e){} })();
window.__scoreUp=(d,v,S,W,periods)=>{ const inc=firebase.firestore.FieldValue.increment, f=(cur,x)=>x>=0?inc(x):Math.max(0,(cur||0)+x); const up={points:f(d.points,v)};
  if(periods){ if(d.season===S||(d.season&&d.season>S)) up.sp=f(d.sp,v); else { up.season=S; up.sp=Math.max(0,v); if(d.season) up.lastSeason={id:d.season,sp:d.sp||0}; }
    if(d.wk===W||(d.wk&&d.wk>W)) up.wp=f(d.wp,v); else { up.wk=W; up.wp=Math.max(0,v); if(d.wk) up.lastWeek={id:d.wk,wp:d.wp||0}; } } return up; };
const ASSETS={sfx:'audio/sfx.mp3',music:'audio/music.mp3'}; const fetchBuf=u=>fetch(u).then(r=>{ if(!r.ok) throw new Error('ses yüklenemedi'); return r.arrayBuffer(); });
const G=window.gsap, ST=window.ScrollTrigger; if(G&&ST) G.registerPlugin(ST);
const MTSET=(()=>{ try{ return JSON.parse(localStorage.getItem('mt_set')||'{}')||{}; }catch(e){ return {}; } })(); // kullanıcı ayarları (Ayarlar penceresi)
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches||MTSET.anim===false;
const fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
const isMob=()=>matchMedia('(max-width:820px)').matches;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const buzz=p=>{ if(MTSET.vib===false) return; try{navigator.vibrate&&navigator.vibrate(p);}catch(e){}};
/* RAVONİA açılış renkleri: bg = arka plan, glow = ışık/kıvılcım rengi */
const RAVONIA_COLORS={bg:'#000000',glow:'#E5262E'};


/* =========================================================
   SES TASARIMI — yankı odası, stereo, FM zil, ortam pedi.
   Seviyeler bilinçli olarak düşük: arayüz sesleri hissedilir, rahatsız etmez.
   ========================================================= */
const SFX=(()=>{
  let ac=null,bus=null,verb=null,nb=null,on=true,amb=null;
  try{on=localStorage.getItem('mt_snd')!=='0';}catch(e){}
  function ctx(){
    if(!ac){
      const C=window.AudioContext||window.webkitAudioContext; if(!C) return null; ac=new C();
      const comp=ac.createDynamicsCompressor(); comp.threshold.value=-18; comp.knee.value=14; comp.ratio.value=3.5; comp.attack.value=.004; comp.release.value=.2;
      const out=ac.createGain(); out.gain.value=.8;
      const hs=ac.createBiquadFilter(); hs.type='highshelf'; hs.frequency.value=8000; hs.gain.value=-4;
      const ls=ac.createBiquadFilter(); ls.type='highpass'; ls.frequency.value=28;
      bus=ac.createGain(); bus.gain.value=.75;
      verb=ac.createConvolver(); const len=ac.sampleRate*2.6, ir=ac.createBuffer(2,len,ac.sampleRate);
      for(let c=0;c<2;c++){const d=ir.getChannelData(c); for(let i=0;i<len;i++){const t=i/len; d[i]=(Math.random()*2-1)*Math.pow(1-t,3.6)*(i<ac.sampleRate*.018?0:1);}}
      verb.buffer=ir; const vg=ac.createGain(); vg.gain.value=.28; const vlp=ac.createBiquadFilter(); vlp.type='lowpass'; vlp.frequency.value=5200; const vhp=ac.createBiquadFilter(); vhp.type='highpass'; vhp.frequency.value=180;
      verb.connect(vhp); vhp.connect(vlp); vlp.connect(vg); vg.connect(comp);
      bus.connect(comp); comp.connect(ls); ls.connect(hs); hs.connect(out); out.connect(ac.destination);
    }
    if(ac.state==='suspended') ac.resume(); return ac;
  }
  function noiseBuf(a){ if(nb) return nb; nb=a.createBuffer(2,a.sampleRate*2,a.sampleRate);
    for(let c=0;c<2;c++){const d=nb.getChannelData(c); let b0=0,b1=0,b2=0; for(let i=0;i<d.length;i++){const w=Math.random()*2-1; b0=.99765*b0+w*.099; b1=.963*b1+w*.2965; b2=.57*b2+w*1.0527; d[i]=(b0+b1+b2+w*.1848)*.16;}} return nb; }
  function route(node,t,{pan=0,panTo=null,dur=.3,wet=.2}={}){
    let last=node; if(ac.createStereoPanner){const p=ac.createStereoPanner(); p.pan.setValueAtTime(pan,t); if(panTo!==null) p.pan.linearRampToValueAtTime(panTo,t+dur); node.connect(p); last=p;}
    last.connect(bus); if(wet>0){const s=ac.createGain(); s.gain.value=wet; last.connect(s); s.connect(verb);}
  }
  function env(g,t,a,peak,dur){g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(.0001,t+dur);}
  function osc(f,dur,o={}){
    const a=ctx(); if(!a||!on) return; const t=a.currentTime+(o.delay||0);
    const x=a.createOscillator(), g=a.createGain(); x.type=o.type||'sine'; x.frequency.setValueAtTime(f,t); if(o.detune) x.detune.value=o.detune;
    if(o.to) x.frequency.exponentialRampToValueAtTime(Math.max(20,o.to),t+(o.glide||dur));
    env(g,t,o.a||.004,o.vol||.1,dur); let n=x;
    if(o.lp){const f2=a.createBiquadFilter(); f2.type='lowpass'; f2.frequency.setValueAtTime(o.lp,t); if(o.lpTo) f2.frequency.exponentialRampToValueAtTime(o.lpTo,t+dur); f2.Q.value=o.q||.7; x.connect(f2); n=f2;}
    n.connect(g); route(g,t,{pan:o.pan||0,wet:o.wet??.15,dur}); x.start(t); x.stop(t+dur+.05);
  }
  function noise(dur,o={}){
    const a=ctx(); if(!a||!on) return; const t=a.currentTime+(o.delay||0);
    const s=a.createBufferSource(); s.buffer=noiseBuf(a); const f=a.createBiquadFilter(); f.type=o.type||'bandpass'; f.Q.value=o.q||.8;
    f.frequency.setValueAtTime(o.from||1000,t); f.frequency.exponentialRampToValueAtTime(o.to||o.from||1000,t+dur*(o.sweep||1));
    const g=a.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(o.vol||.1,t+dur*(o.peakAt??.4)); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(f); f.connect(g); route(g,t,{pan:o.pan||0,panTo:o.panTo??null,dur,wet:o.wet??.2}); s.start(t,Math.random()); s.stop(t+dur+.05);
  }
  function bell(f,dur,o={}){
    const a=ctx(); if(!a||!on) return; const t=a.currentTime+(o.delay||0);
    const c=a.createOscillator(), m=a.createOscillator(), mg=a.createGain(), g=a.createGain();
    c.frequency.value=f; m.frequency.value=f*(o.ratio||3.5); mg.gain.setValueAtTime(f*(o.index||1.8),t); mg.gain.exponentialRampToValueAtTime(f*.04,t+dur*.5);
    m.connect(mg); mg.connect(c.frequency); env(g,t,.002,o.vol||.06,dur); c.connect(g); route(g,t,{pan:o.pan||0,wet:o.wet??.4,dur});
    c.start(t); m.start(t); c.stop(t+dur+.05); m.stop(t+dur+.05);
  }
  function pad(f,dur,o={}){[-7,0,6].forEach((dt,i)=>osc(f,dur,{type:'sawtooth',detune:dt,vol:o.vol||.02,a:o.a||.25,lp:o.lp||500,lpTo:o.lpTo||2400,q:.9,delay:o.delay||0,pan:(i-1)*.45,wet:.45}));}
  function ambient(start){ return;
    const a=ctx(); if(!a) return;
    if(start&&!amb&&on){
      const g=a.createGain(); g.gain.setValueAtTime(0,a.currentTime); g.gain.linearRampToValueAtTime(.022,a.currentTime+4);
      const lp=a.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=420; lp.Q.value=.6;
      const lfo=a.createOscillator(), lg=a.createGain(); lfo.frequency.value=.06; lg.gain.value=180; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
      const os=[55,82.41,110,164.81].map((f,i)=>{const o=a.createOscillator(); o.type=i<2?'sawtooth':'triangle'; o.frequency.value=f; o.detune.value=(i%2?5:-5); o.connect(lp); o.start(); return o;});
      lp.connect(g); route(g,a.currentTime,{wet:.6,dur:1});
      amb={g,os,lfo};
    } else if(!start&&amb){
      const {g,os,lfo}=amb; amb=null; const t=a.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value,t); g.gain.linearRampToValueAtTime(0,t+.8);
      setTimeout(()=>{os.forEach(o=>o.stop());lfo.stop();},900);
    }
  }
  const fx={
    hover(){noise(.025,{from:4800,q:7,vol:.022,peakAt:.1,wet:0});},
    click(){noise(.02,{from:2600,q:4,vol:.09,peakAt:.05,wet:.06}); osc(880,.05,{to:560,vol:.035,wet:.05});},
    whoosh(d=1){noise(.62,{from:160,to:2400,sweep:.9,q:1.1,vol:.26,peakAt:.72,pan:-.7*d,panTo:.7*d,wet:.3}); noise(.55,{from:3000,to:7000,type:'highpass',vol:.03,peakAt:.8,pan:-.5*d,panTo:.5*d,wet:.1});},
    thump(){osc(74,.7,{to:38,glide:.5,vol:.32,wet:.08}); noise(.3,{from:700,to:90,type:'lowpass',vol:.12,peakAt:.03,wet:.35}); osc(220,.9,{vol:.01,wet:.7}); osc(330,.9,{vol:.007,wet:.7,pan:.4});},
    whooshOut(d=1){noise(.5,{from:2400,to:220,q:1,vol:.16,peakAt:.18,pan:.2*d,panTo:.8*d,wet:.35});},
    open(){noise(.35,{from:700,to:5200,type:'highpass',vol:.07,peakAt:.9,wet:.35}); bell(1318.5,1,{delay:.3,vol:.035,index:1.1}); bell(1975.5,1.1,{delay:.33,vol:.022,pan:.35,index:.9});},
    close(){noise(.22,{from:3200,to:500,vol:.06,peakAt:.15,wet:.25});},
    correct(){[659.25,830.61,987.77,1318.5].forEach((f,i)=>bell(f,1.2,{delay:i*.06,vol:.06,pan:-.45+i*.3,index:1.4})); noise(.7,{from:7500,type:'highpass',vol:.025,delay:.2,peakAt:.2,wet:.7});},
    wrong(){osc(196,.28,{type:'triangle',lp:700,vol:.11,wet:.15}); osc(146.83,.42,{type:'triangle',lp:600,vol:.12,delay:.13,wet:.2}); noise(.08,{from:300,q:2,vol:.05,peakAt:.05});},
    tick(n=5){const hi=n<=2; noise(.03,{from:hi?2900:2100,q:10,vol:.16,peakAt:.04,wet:.12}); osc(hi?2100:1600,.04,{vol:.035,wet:.08});},
    reveal(){bell(987.77,.9,{vol:.05,ratio:2,index:1.2}); noise(.32,{from:2500,to:8000,type:'highpass',vol:.03,peakAt:.6,wet:.45});},
    toast(){bell(1318.5,.8,{vol:.045,index:1}); bell(1760,1,{delay:.09,vol:.04,pan:.3,index:1});},
    login(){fx.thump(); pad(220,1.6,{delay:.05,vol:.016}); pad(329.63,1.6,{delay:.05,vol:.012}); bell(1318.5,1.4,{delay:.2,vol:.04}); bell(1760,1.4,{delay:.28,vol:.03,pan:.4});},
    win(){
      fx.thump();
      pad(261.63,.55,{delay:.04,vol:.022}); pad(329.63,.55,{delay:.04,vol:.018}); pad(392,.55,{delay:.04,vol:.018});
      pad(349.23,.4,{delay:.5,vol:.02}); pad(440,.4,{delay:.5,vol:.017});
      pad(523.25,2.2,{delay:.82,vol:.026,lpTo:4200}); pad(659.25,2.2,{delay:.82,vol:.02,lpTo:4200}); pad(783.99,2.2,{delay:.82,vol:.018,lpTo:4200}); osc(130.81,2.2,{delay:.82,vol:.06,wet:.3});
      [1046.5,1318.5,1568,2093].forEach((f,i)=>bell(f,1.6,{delay:.88+i*.07,vol:.03,pan:-.5+i*.33,index:1}));
    },
  };
  /* --- Gömülü ses dosyaları: tek dosyada tüm efektler (sprite) + döngü müziği --- */
  const MAP={"intro": [0.0, 4.9], "whoosh": [5.05, 0.875], "slam": [6.075, 2.0], "flip": [8.226, 0.421], "deal": [8.797, 0.486], "cardhit": [9.434, 0.538], "win": [10.121, 2.85], "lose": [13.121, 2.124], "tie": [15.395, 1.419], "thunder": [16.964, 2.655], "smash": [19.769, 2.267], "beam": [22.186, 2.294], "portal": [24.631, 2.832], "web": [27.613, 0.629], "shield": [28.392, 2.0], "slash": [30.542, 0.637], "magic": [31.33, 2.398], "cosmic": [33.878, 2.888], "zap": [36.916, 0.891], "coin": [37.958, 1.022], "riser": [39.129, 2.486], "key": [41.765, 0.037], "fire": [41.953, 2.065], "arrow": [44.168, 0.665], "boom": [44.983, 2.969], "spark": [48.101, 0.71], "confirm": [48.961, 0.416], "swap": [49.527, 0.561], "turn": [50.237, 1.313], "join": [51.701, 1.186], "reveal": [53.036, 2.29]};
  const GAIN={intro:1,whoosh:.5,slam:.62,flip:.55,deal:.45,cardhit:.6,win:.7,lose:.55,tie:.5,thunder:.9,smash:.9,beam:.8,portal:.75,web:.7,shield:.7,slash:.75,magic:.7,cosmic:.9,zap:.7,coin:.5,riser:.55,key:.3,fire:.8,arrow:.75,boom:.9,spark:.55,confirm:.6,swap:.5,turn:.6,join:.6,reveal:.7,hover:.35,click:.55,open:.55,close:.5,success:.6,invalid:.55,unlock:.6};
  const FALL={flip:()=>fx.click(),deal:()=>fx.click(),swap:()=>fx.click(),confirm:()=>fx.toast(),turn:()=>fx.toast(),join:()=>fx.toast(),cardhit:()=>fx.thump(),slam:()=>fx.thump(),reveal:()=>fx.reveal(),win:()=>fx.win(),lose:()=>fx.wrong(),tie:()=>fx.wrong(),coin:()=>fx.correct(),whoosh:()=>fx.whoosh(),riser:()=>fx.open(),key:()=>fx.hover(),spark:()=>fx.click(),
    thunder:()=>fx.thump(),smash:()=>fx.thump(),beam:()=>fx.open(),web:()=>fx.whoosh(),portal:()=>fx.reveal(),shield:()=>fx.thump(),slash:()=>fx.whoosh(),magic:()=>fx.reveal(),cosmic:()=>fx.thump(),zap:()=>fx.click(),fire:()=>fx.whoosh(),arrow:()=>fx.whoosh(),boom:()=>fx.thump(),intro:()=>fx.thump()};
  let sprite=null,loading=null,mBuf=null,mLoading=null,mSrc=null,mGain=null,musicOn=true,mVol=.6,sVol=.85,playingMusic=false;
  try{musicOn=localStorage.getItem('mt_music')!=='0'; const mv=localStorage.getItem('mt_mvol'); if(mv!==null) mVol=+mv; const sv=localStorage.getItem('mt_svol'); if(sv!==null) sVol=+sv;}catch(e){}
  const b64buf=s=>{const bin=atob(s); const u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u.buffer;};
  const decode=(a,buf)=>new Promise((res,rej)=>{const p=a.decodeAudioData(buf,res,rej); if(p&&p.then) p.then(res,rej);});
  function load(){ if(loading) return loading; const a=ctx(); if(!a) return Promise.resolve(); loading=fetchBuf(ASSETS.sfx).then(buf=>decode(a,buf)).then(b=>{sprite=b;}).catch(()=>{}); return loading; }
  function sample(name,o={}){
    const a=ctx(); if(!a||!on||!sprite||!MAP[name]) return false;
    const [off,dur]=MAP[name]; const s=a.createBufferSource(); s.buffer=sprite; s.playbackRate.value=o.rate||1;
    const g=a.createGain(); g.gain.value=(GAIN[name]||.6)*(o.vol??1); s.connect(g); let n=g;
    if(o.pan&&a.createStereoPanner){const p=a.createStereoPanner(); p.pan.value=o.pan; g.connect(p); n=p;}
    n.connect(bus); s.start(a.currentTime+(o.delay||0),off+.026,dur); return true;
  }
  function sfx(name,o){ if(!on) return; if(!sample(name,o)) { try{FALL[name]&&FALL[name]();}catch(e){} } }
  function mLevel(){return musicOn&&on?mVol*.55:0;}
  async function startMusic(){
    const a=ctx(); if(!a||!on||!musicOn) return false;
    if(!mGain){mGain=a.createGain(); mGain.gain.value=0; mGain.connect(a.destination);}
    if(!mBuf){ if(!mLoading) mLoading=fetchBuf(ASSETS.music).then(buf=>decode(a,buf)).then(b=>{mBuf=b;}).catch(()=>{}); await mLoading; if(!mBuf) return false; }
    if(!mSrc){ mSrc=a.createBufferSource(); mSrc.buffer=mBuf; mSrc.loop=true; mSrc.connect(mGain); mSrc.start(); }
    const t=a.currentTime; mGain.gain.cancelScheduledValues(t); mGain.gain.setValueAtTime(mGain.gain.value,t); mGain.gain.linearRampToValueAtTime(mLevel(),t+2.5); playingMusic=true; document.documentElement.classList.add('music-on');
    return true;
  }
  function fadeMusic(v,d=.6){ if(!mGain||!ac) return; const t=ac.currentTime; mGain.gain.cancelScheduledValues(t); mGain.gain.setValueAtTime(mGain.gain.value,t); mGain.gain.linearRampToValueAtTime(v,t+d); }
  function stopMusic(){ fadeMusic(0,.6); playingMusic=false; document.documentElement.classList.remove('music-on'); }
  function applyVol(){ if(bus) bus.gain.value=.75*sVol; if(playingMusic) fadeMusic(mLevel(),.15); }
  // TÜRKİYE yazısının elektrik cızırtısı
  function zapTR(){ if(!on||!ac) return; if(!sample('spark',{rate:.85+Math.random()*.4,vol:.45+Math.random()*.25,pan:(Math.random()-.5)*.6})){ for(let i=0;i<6;i++) noise(.02,{from:3000+Math.random()*4000,q:6,vol:.06,peakAt:.1,delay:i*.04+Math.random()*.03,wet:.05}); } }
  const ALIAS={hover:()=>sample('hover',{vol:.5}),click:()=>sample('click',{vol:.7}),correct:()=>sample('success'),wrong:()=>sample('invalid'),login:()=>sample('unlock'),win:()=>sample('win'),open:()=>sample('open',{vol:.7}),close:()=>sample('close',{vol:.7}),toast:()=>sample('turn',{vol:.55}),reveal:()=>sample('unlock',{vol:.6}),whoosh:d=>sample('whoosh',{pan:.2*(d||1)}),thump:()=>sample('slam',{vol:.8}),whooshOut:d=>sample('whoosh',{vol:.6,rate:.85,pan:.4*(d||1)})};
  let unlocked=false;
  return {
    play(n,arg){try{ if(ALIAS[n]&&ALIAS[n](arg)) return; fx[n]&&fx[n](arg);}catch(e){}},
    sample, sfx, load, zapTR,
    unlock(){ if(!on) return; ctx(); applyVol(); load(); if(!unlocked){unlocked=true; startMusic();} },
    startMusic, get on(){return on;}, get musicOn(){return musicOn;}, get mVol(){return mVol;}, get sVol(){return sVol;},
    setMusicVol(v){mVol=v; try{localStorage.setItem('mt_mvol',v);}catch(e){} if(v>0&&!musicOn){musicOn=true; try{localStorage.setItem('mt_music','1');}catch(e){} startMusic();} applyVol();},
    setSfxVol(v){sVol=v; try{localStorage.setItem('mt_svol',v);}catch(e){} applyVol();},
    toggleMusic(){musicOn=!musicOn; try{localStorage.setItem('mt_music',musicOn?'1':'0');}catch(e){} if(musicOn) startMusic(); else stopMusic(); return musicOn;},
    toggle(){on=!on; try{localStorage.setItem('mt_snd',on?'1':'0');}catch(e){} if(on){ctx(); applyVol(); load(); startMusic(); fx.click();} else stopMusic(); return on;}};
})();

/* ========================= MICUP HESAP BAĞLAMA (OAuth2 + PKCE) =========================
   1) Micup › Ayarlar › Uygulamalar › "Uygulama oluştur"
   2) OAuth2 bölümüne yönlendirme adresi olarak bu sayfanın adresini ekle (ör. https://kullanici.github.io/marvel/)
   3) Uygulamanın ID'sini aşağıdaki clientId alanına yapıştır. Gizli anahtar (secret) GEREKMEZ, sayfaya koyma. */
const MICUP_CONFIG={
  clientId:'1568872958460952576',
  tokenProxy:(()=>{try{return localStorage.getItem('mt_micup_proxy')||'https://script.google.com/macros/s/AKfycbylT04_S-Rk054V2f08JtZSPXDQdgj80hYlyZMj55sK84vHyrQjuFDwGjqDGQgfc_BT0g/exec';}catch(e){return 'https://script.google.com/macros/s/AKfycbxjv1k2z7KkRiVUW_WMF4nPJe8evio0rZrG_V5rxsmL4mEbdhFxYuXwtuplDJbqUEjZlw/exec';}})(),  // ← Cloudflare Worker adresi: 'https://micup-giris.KULLANICI.workers.dev'
  redirectUri:location.origin+location.pathname,
  scope:'identify guilds',
  authorizeUrl:'https://micup.gg/oauth2/authorize',
  tokenUrl:'https://micup.gg/api/v1/oauth2/token',
  meUrl:'https://micup.gg/api/v1/users/@me',
  guildsUrl:'https://micup.gg/api/v1/users/@me/guilds',
  serverName:/marvel\s*t[üu]rk[iİı]ye/i,
  avatar:(id,hash)=>`https://media.micup.gg/avatars/${id}/${hash}.png?size=128`,
};
const AUTH={user:null,mode:'none'};
const b64url=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function pkcePair(){ const v=b64url(crypto.getRandomValues(new Uint8Array(32))); const c=b64url(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))); return {v,c}; }
async function micupLogin(){
  if(!MICUP_CONFIG.clientId||!MICUP_CONFIG.tokenProxy){ return openSetup(); }
  if(location.protocol==='file:'){ toast('Önce siteyi yayınla','Micup girişi, dosya bilgisayardan açıldığında çalışmaz. Siteyi GitHub Pages, Netlify ya da itch.io\'ya yükle.'); return; }
  if(!crypto.subtle){ toast('Tarayıcı desteklemiyor','Güvenli bağlantı (https) gerekiyor.'); return; }
  const {v,c}=await pkcePair(); const state=b64url(crypto.getRandomValues(new Uint8Array(16)));
  try{sessionStorage.setItem('mt_pkce',JSON.stringify({v,state,back:location.hash}));}catch(e){}
  const u=new URL(MICUP_CONFIG.authorizeUrl);
  u.search=new URLSearchParams({client_id:MICUP_CONFIG.clientId,response_type:'code',redirect_uri:MICUP_CONFIG.redirectUri,scope:MICUP_CONFIG.scope,state,code_challenge:c,code_challenge_method:'S256'}).toString();
  SFX.play('login'); setTimeout(()=>{location.href=u.toString();},250);
}
function openMemberGate(){
  openModal('Marvel Türkiye sunucusu');
  swap(`<div class="lg"><div class="lh">${micupMark}<div><h3>Sunucuya katılman gerek</h3><p class="dim" style="margin:6px 0 0">Bu site Marvel Türkiye topluluğu içindir. Devam etmek için Micup'teki <b>Marvel Türkiye</b> sunucusuna katıl.</p></div></div>
    <a class="btn p" href="https://micup.gg/invite/2txF6WE7" target="_blank" rel="noopener" style="justify-content:center"><span class="bl"><span>Sunucuya katıl</span><span>Sunucuya katıl</span></span></a>
    <button class="btn g" id="mgRe" type="button" style="justify-content:center"><span class="bl"><span>Katıldım, tekrar dene</span><span>Katıldım, tekrar dene</span></span></button>
    <button class="ghost" id="mgOut" type="button" style="justify-content:center">Çıkış yap</button></div>`);
  $('#mgRe').onclick=async()=>{ const tok=(()=>{try{return localStorage.getItem('mt_micup_token')||''}catch(e){return ''}})(); if(!tok) return micupLogin();
    const j=await micupExchange({action:'refresh',access_token:tok}).catch(()=>null);
    try{ console.log('MCUP-DBG-R',JSON.stringify({mc:j&&j.memberCount,g:j&&j.guildRaw,d:j&&j.guildDetail,c:j&&j.guildDetailCode})); }catch(e){}
    if(!j||!j.user) return toast('Bağlanamadı','Tekrar dene.');
    AUTH.user.member=(()=>{const g=Array.isArray(j.guilds)?j.guilds.find(x=>/marvel\s*t[üu]rk[iİı]ye/i.test(x.name||'')):null;return g?true:false;})();
    try{localStorage.setItem('mt_user',JSON.stringify(AUTH.user));}catch(e){}
    if(j.memberCount>0&&FB.ready&&FB.user) FB.db.collection('stats').doc('public').set({micupMembers:j.memberCount},{merge:true}).catch(()=>{});
    if(AUTH.user.member===false) return toast('Henüz katılmamışsın','Sunucuya katılıp tekrar dene.');
    closeModal(); SFX.play('confirm'); toast('Hoş geldin',AUTH.user.display+' — üyeliğin onaylandı.'); renderUser(); };
  $('#mgOut').onclick=()=>{ if(FB.ready&&FB.user) FB.auth.signOut().catch(()=>{}); AUTH.user=null; AUTH.mode='none'; try{localStorage.removeItem('mt_user');localStorage.removeItem('mt_micup_token');}catch(e){} renderUser(); renderBoards(); closeModal(); };
}
function micupExchange(b){
  return (async()=>{
    const nonce='n'+Date.now().toString(36)+Math.random().toString(36).slice(2,10);
    const ctrl=new AbortController(); const to=setTimeout(()=>ctrl.abort(),30000);
    try{
      const pr=fetch(MICUP_CONFIG.tokenProxy,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({...b,nonce})}).catch(()=>{});
      await pr;
      const r=await fetch(MICUP_CONFIG.tokenProxy+'?get='+encodeURIComponent(nonce)+'&callback=cb');
      const t=await r.text();
      const m=t.match(/cb\((\{[\s\S]*\})\)/);
      if(!m) throw new Error('Kopru yanit vermedi');
      return JSON.parse(m[1]);
    }finally{ clearTimeout(to); }
  })();
}
async function micupCallback(){
  const q=new URLSearchParams(location.search); const code=q.get('code'), st=q.get('state'), err=q.get('error');
  if(!code&&!err) return false;
  let saved=null; try{saved=JSON.parse(sessionStorage.getItem('mt_pkce')||'null'); sessionStorage.removeItem('mt_pkce');}catch(e){}
  history.replaceState(null,'',location.pathname+(saved&&saved.back||''));
  if(err){ toast('Micup bağlantısı iptal edildi','İstersen tekrar deneyebilirsin.'); return false; }
  if(!saved||saved.state!==st){ toast('Micup bağlantısı','Güvenlik doğrulaması tutmadı, tekrar dene.'); return false; }
  try{
    const j=await micupExchange({code,code_verifier:saved.v,redirect_uri:MICUP_CONFIG.redirectUri});
    try{ console.log('MCUP-DBG',JSON.stringify({mc:j.memberCount,ct:!!j.customToken,ce:j.ctErr||'',mh:j.memberHttp,mr:(j.memberRoles||[]).length,g:j.guildRaw,d:j.guildDetail,c:j.guildDetailCode})); }catch(e){}
    if(!j||!j.user) throw new Error((j&&j.error)||'Baglanti hatasi');
    const u=j.user; const member=Array.isArray(j.guilds)?j.guilds.some(g=>MICUP_CONFIG.serverName.test(g.name||'')):null;
    AUTH.user={id:u.id,username:u.username,display:u.global_name||u.username,avatar:u.avatar?MICUP_CONFIG.avatar(u.id,u.avatar):null,member,micup:true,roles:j.memberRoles||null}; AUTH.mode='micup';
    try{localStorage.setItem('mt_user',JSON.stringify(AUTH.user));}catch(e){}
    if(j.access_token){ try{localStorage.setItem('mt_micup_token',j.access_token);}catch(e){} }
    if(j.customToken){ try{sessionStorage.setItem('mt_ct',j.customToken);}catch(e){} try{sessionStorage.setItem('mt_mcnt',String(j.memberCount||0));}catch(e){}
      (async()=>{ for(let i=0;i<60;i++){ try{ if(window.firebase&&firebase.apps&&firebase.apps.length&&FB.auth){ await FB.auth.signInWithCustomToken(j.customToken); try{sessionStorage.removeItem('mt_ct');}catch(e){} if(j.memberCount>0&&FB.db) FB.db.collection('stats').doc('public').set({micupMembers:j.memberCount},{merge:true}).catch(()=>{}); return; } }catch(e){ console.warn('Micup-Firebase baglanti hatasi',e); try{toast('Bulut senkronu kurulamadi','Micup girisin oldu ama Firebase baglantisi hatasi: '+String(e&&e.code||e.message||e));}catch(_){ } return; } await new Promise(r=>setTimeout(r,500)); } })();
    }
    if(j.memberCount>0){ try{sessionStorage.setItem('mt_mcnt',String(j.memberCount));}catch(e){} }
    SFX.play('login');
    if(AUTH.user.member===false){ openMemberGate(); return true; }
    toast('Micup hesabın bağlandı',`Hoş geldin, ${AUTH.user.display}`);
    return true;
  }catch(e){ toast('Micup bağlanamadı',String(e.message||e)); return false; }
}
async function loadMe(tok){
  const h={Authorization:'Bearer '+tok.access};
  const r=await fetch(MICUP_CONFIG.meUrl,{headers:h}); if(!r.ok) throw new Error('Profil alınamadı (HTTP '+r.status+')');
  const u=await r.json(); let member=null;
  try{ const g=await fetch(MICUP_CONFIG.guildsUrl,{headers:h}); if(g.ok){ const list=await g.json(); member=Array.isArray(list)&&list.some(x=>MICUP_CONFIG.serverName.test(x.name||'')); } }catch(e){}
  AUTH.user={id:u.id,username:u.username,display:u.global_name||u.display_name||u.username,avatar:u.avatar?MICUP_CONFIG.avatar(u.id,u.avatar):null,member,micup:true};
  AUTH.mode='micup'; try{localStorage.setItem('mt_user',JSON.stringify(AUTH.user));}catch(e){}
}
async function initAuth(){
  try{ const s=JSON.parse(localStorage.getItem('mt_user')||'null'); if(s){ AUTH.user=s; AUTH.mode=s.micup?'micup':'guest'; } }catch(e){}
  await micupCallback();
  // Kayıtlı Micup oturumu varsa profili tazele (avatar/isim değişmiş olabilir)
  renderUser(); renderBoards();
  // uye sayacini duzenli tazele (Micup token'i varsa)
  let _nmOnce=false;
  async function refreshMicupProfile(){
  try{ const tok=localStorage.getItem('mt_micup_token'); if(!tok||!(AUTH.user&&AUTH.user.micup)) return;
    const j=await micupExchange({action:'refresh',access_token:tok}); if(!j||!j.user) return; _rlc++; if(_rlc%6===0) console.log('MT-ROLES',JSON.stringify({mh:j.memberHttp,mr:j.memberRoles,ur:AUTH.user&&AUTH.user.roles,ct:!!j.customToken,ce:j.ctErr}));
    const u=j.user, disp=u.global_name||u.username, av=u.avatar?MICUP_CONFIG.avatar(u.id,u.avatar):null; let ch=false;
    if(AUTH.user.username!==u.username){AUTH.user.username=u.username;ch=true}
    if(AUTH.user.display!==disp){AUTH.user.display=disp;ch=true}
    if(AUTH.user.avatar!==av){AUTH.user.avatar=av;ch=true}
    const nr=j.memberRoles||null; if(JSON.stringify(AUTH.user.roles||null)!==JSON.stringify(nr)){AUTH.user.roles=nr;ch=true}
    if(ch){ try{localStorage.setItem('mt_user',JSON.stringify(AUTH.user));}catch(e){} renderUser(); renderBoards(); toast('Profil güncellendi','Micup bilgilerin siteye yansıdı.'); }
    if(FB.ready&&FB.user&&FB.user.uid&&FB.db&&AUTH.user.micup&&(!_nmOnce||ch)){ _nmOnce=true; const up2={name:disp,micupName:u.username}; if(av) up2.avatar=av; FB.db.collection('users').doc(FB.user.uid).set(up2,{merge:true}).catch(()=>{}); }
    if(j.memberCount>0&&FB.ready&&FB.db) FB.db.collection('stats').doc('public').set({micupMembers:j.memberCount},{merge:true}).catch(()=>{});
  }catch(e){}
}
setInterval(()=>{ if(!document.hidden&&Date.now()-_actT<180e3) refreshMicupProfile(); },300e3); setTimeout(refreshMicupProfile,3000);
}
function roleChips(u){ if(!u||!u.roles||!u.roles.length) return ''; return '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">'+u.roles.map(r=>{ const c=r.color?('#'+(r.color>>>0).toString(16).padStart(6,'0')):'#e52528'; return '<span class="mono" style="font-size:11px;padding:2px 9px;border:2px solid var(--inkc);border-radius:4px;background:'+c+';color:#fff;white-space:nowrap">'+esc(r.name)+'</span>'; }).join('')+'</div>'; }
function avatarHTML(u,size){
  if(u&&u.avatar&&!/^https?:/.test(u.avatar)){ const mid=String(u.uid||u.id||'').replace(/^micup_/,''), h=String(u.avatar); if(/^\d{5,25}$/.test(mid)&&/^[\w.-]+$/.test(h)) u={...u,avatar:'https://media.micup.gg/avatars/'+mid+'/'+h+'.png?size=128'}; }
  const ini=esc(((u.display||u.username||'?').trim()[0]||'?').toLocaleUpperCase('tr'));
  const st=size?` style="width:${size}px;height:${size}px;font-size:${Math.round(size*.45)}px"`:'';
  return `<span class="av"${st}>${ini}${u.avatar?`<img src="${esc(u.avatar)}" alt="" onerror="this.remove()">`:''}</span>`;
}
const ptsKey=()=>'mt_pts_'+(AUTH.user?(AUTH.user.id||AUTH.user.username):'anon');
function myStats(){
  const ids=new Set(); const u=AUTH.user;
  if(u){ [u.id,u.uid,u.username,u.display].forEach(x=>{ if(x){ const v=String(x); ids.add(v); ids.add(v.replace(/^micup_/,'')); ids.add('micup_'+v.replace(/^micup_/,'')); } }); }
  try{ const mn=localStorage.getItem('mt_name'); if(mn) ids.add(mn); }catch(e){}
  if(typeof FB!=='undefined'&&FB.user&&FB.user.uid) ids.add(FB.user.uid);
  let best=null;
  for(const id of ids){ try{ const v=JSON.parse(localStorage.getItem('mt_pts_'+id)||'null'); if(v&&(!best||(v.points||0)>(best.points||0))) best=v; }catch(e){} }
  return best||{points:0,best:0,games:0};
}
const myTotal=()=>myStats().points, myBest=()=>myStats().best;
function renderUser(){
  const slot=$('#authSlot'), u=AUTH.user;
  if(u&&FB.ready&&!FB.user&&!u.guest){ AUTH.user=null; try{localStorage.removeItem('mt_user')}catch(e){} }
  if(!AUTH.user){slot.innerHTML=`<button class="login" id="loginBtn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5M10 16l4-4-4-4M14 12H3"/></svg><span class="lt">Giriş yap</span></button>`; $('#loginBtn').onclick=openLogin; return;}
  slot.innerHTML=`<button class="chip" id="chipBtn" type="button" aria-label="Hesabım">${avatarHTML(u)}<span class="cn"><b class="${window.ncOf?ncOf(u):''}">${esc(u.display||u.username)}</b><small class="${u.micup||u.google?'vf':'pv'}">${u.micup?'● Micup':u.google?'● Google':'● Misafir'} · ${((typeof FB!=='undefined'&&FB.ready&&FB.user&&typeof FB.myPts==='number')?FB.myPts:myTotal()).toLocaleString('tr-TR')} puan</small></span></button>`;
  $('#chipBtn').onclick=openAccount;
}
const micupMark=`<svg viewBox="0 0 44 44" aria-hidden="true"><rect x="1.5" y="1.5" width="41" height="41" rx="6" fill="#15151F" stroke="#07060b" stroke-width="3"/><path d="M12 30V16l10 9 10-9v14" fill="none" stroke="#EEEAE2" stroke-width="3"/></svg>`;
const check=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M4 12l5 5L20 6"/></svg>`;
// herkese acik Micup uye sayaci: kopru ?count ucu + Firestore yedek
async function loadMemberCount(){
  let n=0;
  try{ const r=await fetch(MICUP_CONFIG.tokenProxy+'?count=1&callback=cb',{cache:'no-store'}); const t=await r.text(); const m=t.match(/cb\((\{[\s\S]*?\})\)/); if(m){ const j=JSON.parse(m[1]); if(j.memberCount>0) n=j.memberCount; } }catch(e){}
  if(!n){ try{ if(FB.ready&&FB.db){ const d=await FB.db.collection('stats').doc('public').get(); const v=(d.exists&&d.data().micupMembers)||0; if(v>0) n=v; } }catch(e){} }
  if(!n) return;
  const h=$('#hMembers'); if(h) h.innerHTML=n.toLocaleString('tr-TR')+'<small>üye</small>';
  const mc=$('#mcCnt'); if(mc&&mc.dataset.done!=='1') mc.textContent=n.toLocaleString('tr-TR')+' Marvel Türkiye üyesi bu sitede';
}
setInterval(()=>{ if(!document.hidden) loadMemberCount(); },600000); window.loadMemberCount=loadMemberCount;
let _uyeFriends={},_rlc=0;
async function syncMicupFriends(fl){
  if(!(FB.ready&&FB.user)||!AUTH.user||!AUTH.user.micup) return;
  const me=FB.user.uid,myN=AUTH.user.display||AUTH.user.username,myA=AUTH.user.avatar||null;
  for(const f of (fl||[]).slice(0,40)){
    const fid='micup_'+f.id; if(fid===me) continue;
    try{
      const ud=await FB.db.collection('users').doc(fid).get(); if(!ud.exists) continue;
      const d=ud.data(), tN=d.name||f.global_name||f.username, tA=d.avatar||null;
      const i1=me+'_'+fid,i2=fid+'_'+me;
      const r1=await FB.db.collection('friendReqs').doc(i1).get().catch(()=>null);
      const r2=await FB.db.collection('friendReqs').doc(i2).get().catch(()=>null);
      if((r1&&r1.exists)||(r2&&r2.exists)) continue;
      const at=firebase.firestore.FieldValue.serverTimestamp();
      await FB.db.collection('friendReqs').doc(i1).set({from:me,to:fid,fromName:myN,fromAvatar:myA,toName:tN,toAvatar:tA,status:'accepted',at:at,micup:true});
      await FB.db.collection('friendReqs').doc(i2).set({from:fid,to:me,fromName:tN,fromAvatar:tA,toName:myN,toAvatar:myA,status:'accepted',at:at,micup:true});
    }catch(e){}
  }
}
async function refreshSiteFriends(){
  try{ const tok=localStorage.getItem('mt_micup_token'); if(!tok||!(AUTH.user&&AUTH.user.micup)){ _uyeFriends={}; return; }
    const j=await micupExchange({action:'friends',access_token:tok}); const fl=(j&&j.friends)||[]; console.log('MT-FRIENDS',JSON.stringify({n:fl.length,dbg:j&&j.dbg}));
    _uyeFriends={}; fl.forEach(f=>{_uyeFriends['micup_'+f.id]=f;});
    await syncMicupFriends(fl);
  }catch(e){}
}
async function renderToplulukMeta(){
  const grid=$('#uyeGrid'); if(!grid||!FB.ready||!FB.db) return;
  let meta=$('#uyeMeta'); if(!meta){ meta=document.createElement('div'); meta.id='uyeMeta'; meta.style.cssText='width:100%;display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:10px'; grid.parentNode.insertBefore(meta,grid); }
  let cnt=null; try{ const c=await FB.db.collection('users').count().get(); cnt=c.data().count; }catch(e){}
  if(cnt==null){ try{ const q=await FB.db.collection('users').limit(500).get(); cnt=q.size; }catch(e){} }
  const aids=new Set(FIXED_ADMIN_UIDS||[]);
  try{ const aq=await FB.db.collection('admins').get(); aq.docs.forEach(d=>aids.add(d.id)); }catch(e){}
  const admins=[];
  for(const uid of aids){ try{ const sn=await FB.db.collection('users').doc(uid).get(); if(sn.exists){ const u=sn.data(); admins.push({uid,name:u.name||u.display||'Yönetici',avatar:u.avatar}); } }catch(e){} }
  meta.innerHTML=`<span class="mono" style="font-size:13px;color:var(--gold)">👥 Siteye katılanlar: <b>${cnt!=null?cnt.toLocaleString('tr-TR'):'…'}</b></span>${admins.length?`<span class="mono" style="font-size:12px;color:var(--dim)">Yöneticiler:</span><span style="display:inline-flex;gap:6px;align-items:center">${admins.map(a=>`<button type="button" data-pf2="${a.uid}" title="${esc(a.name)} — profilini aç" style="background:none;border:2px solid var(--gold);border-radius:50%;cursor:pointer;padding:0;line-height:0">${avatarHTML({display:a.name,avatar:a.avatar},34)}</button>`).join('')}</span>`:''}`;
  $$('[data-pf2]',meta).forEach(b=>b.onclick=()=>{ SFX.play('click'); openProfile(b.dataset.pf2,{}); });
}
async function renderSiteMembers(){
  const grid=$('#uyeGrid'); if(!grid) return;
  renderToplulukMeta();
  if(!(FB.ready&&FB.db)) return;
  try{
    let q; try{ q=await FB.db.collection('users').orderBy('seen','desc').limit(24).get(); }catch(e1){ q=await FB.db.collection('users').limit(100).get(); }
    const rows=q.docs.map(d=>({uid:d.id,...d.data()})).filter(u=>u.micup&&(u.name||u.display)).sort((a,b)=>(b.seen&&b.seen.toMillis?b.seen.toMillis():0)-(a.seen&&a.seen.toMillis?a.seen.toMillis():0)).slice(0,24);
    if(!rows.length){ grid.innerHTML='<p class="dim" style="grid-column:1/-1">Henüz siteye katılan Micup üyesi yok — ilk sen ol!</p>'; return; }
    grid.innerHTML=rows.map(u=>{ const fr=_uyeFriends[u.uid]; const av=u.avatar?'<img src="'+esc(u.avatar)+'" alt="" loading="lazy" onerror="this.remove()">':''; const ini=esc((((u.name||u.display||'?')+'')[0]||'?').toUpperCase()); return '<button type="button" class="panel" data-up="'+esc(u.uid)+'" style="display:grid;gap:8px;justify-items:center;padding:14px 10px;text-align:center"><span class="av" style="width:52px;height:52px;font-size:22px">'+ini+av+(fr?'<i style="position:absolute;bottom:-4px;right:-4px;font-style:normal;font-size:15px">⭐</i>':'')+'</span><b class="mono" style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%">'+esc(u.name||u.display)+(fr?' <small class="dim">★ arkadaş</small>':'')+'</b><small class="mono dim">Micup üyesi</small></button>'; }).join('');
    $$('#uyeGrid [data-up]').forEach(b=>b.onclick=()=>{ SFX.play('click'); window.openProfile&&window.openProfile(b.dataset.up,{}); });
  }catch(e){ grid.innerHTML='<p class="dim" style="grid-column:1/-1">Üyeler yüklenemedi.</p>'; }
}
setInterval(()=>{ if(!document.hidden) refreshSiteFriends(); },120e3); setTimeout(refreshSiteFriends,5000);
setInterval(()=>{ if(!document.hidden) renderSiteMembers(); },240e3); setTimeout(renderSiteMembers,6000);
setTimeout(async()=>{ try{ const tok=localStorage.getItem('mt_micup_token'); if(!tok){ console.log('MT-ROLES token yok'); return; } const j=await micupExchange({action:'refresh',access_token:tok}); console.log('MT-ROLES',JSON.stringify({mh:j&&j.memberHttp,mr:j&&j.memberRoles,ur:AUTH.user&&AUTH.user.roles,ct:!!(j&&j.customToken),ce:j&&j.ctErr})); }catch(e){ console.log('MT-ROLES-HATA',String(e&&e.message||e)); } },8000);
setInterval(async()=>{ try{ if(FB.admin||!(FB.ready&&FB.user)) return; const a=await FB.db.collection('admins').doc(FB.user.uid).get(); if(a.exists){ FB.admin=true; if(typeof updAdminBtn==='function') updAdminBtn(); if(typeof renderAll==='function') renderAll(); toast&&toast('Yetki güncellendi','Artık adminsın.'); } }catch(e){} },60000);
setInterval(()=>{ try{ const _micup=AUTH.user&&AUTH.user.micup, _id=AUTH.user&&AUTH.user.id, _adm=FIXED_ADMIN_UIDS.includes('micup_'+_id); if(_micup&&_adm){ FB.admin=true; updAdminBtn(); } console.log('MT-ADMIN',JSON.stringify({micup:_micup,id:_id,admCheck:_adm,fbAdmin:FB.admin,fbUser:FB.user&&FB.user.uid})); }catch(e){ console.log('MT-ADMIN-HATA',e.message); } },3000);
function openLogin(){
  openModal('Hesap · Giriş');
  const mc=MICUP_CONFIG.clientId&&MICUP_CONFIG.tokenProxy;
  swap(`<div class="lg">
    <div class="lh">${micupMark}<div><h3>Micup ile giriş</h3><p class="dim" style="margin:6px 0 0">Micup hesabınla tek tıkla gir. Puanın, levelin ve ödüllerin her cihazda seninle gelir; online odalara ve arkadaş sistemine bağlanırsın.</p></div></div>
    <ul><li>${check}Sıralamada adınla görünürsün</li><li>${check}Günlük ödül, level ve çekilişlere katılırsın</li><li>${check}Micup rolün ve sunucu üyeliğin profilde görünür</li></ul>
    <button class="btn p" id="mcGo" type="button" style="justify-content:center"><span class="bl"><span>Micup ile giriş</span><span>Micup ile giriş</span></span></button>
    <p class="dim mono" id="mcCnt" style="margin:0;text-align:center"></p>
    <div class="or mono dim">ya da</div>
    <form class="guess" id="gstForm"><label for="gstName" style="position:absolute;left:-9999px">Misafir adı</label><input class="field" id="gstName" maxlength="18" placeholder="Misafir olarak: adını yaz" autocomplete="off"><button class="btn g" type="submit"><span class="bl"><span>Misafir</span><span>Misafir</span></span></button></form>
  </div>`);
  const m=$('#mcGo'); m&&(m.onclick=mc?micupLogin:()=>toast('Micup kurulum gerekli','Önce Micup bağlantısı kurulmalı.'));
  (async()=>{ const el=$('#mcCnt'); if(!el)return;
    // once herkese acik kopru sayaci (Firestone gerekmez), yoksa Firestore
    try{ const r=await fetch(MICUP_CONFIG.tokenProxy+'?count=1&callback=cb',{cache:'no-store'}); const t=await r.text(); const m=t.match(/cb\((\{[\s\S]*\})\)/); if(m){ const n=JSON.parse(m[1]).memberCount; if(n>0){ el.textContent=n+' Marvel Türkiye üyesi'; return; } } }catch(e){}
    try{ if(FB.ready&&FB.db){ const d=await FB.db.collection('stats').doc('public').get(); const n=(d.exists&&d.data().micupMembers)||0; if(n>0) el.textContent=n+' Marvel Türkiye üyesi bu sitede'; } }catch(e){} })();
  $('#gstForm').onsubmit=e=>{e.preventDefault(); const n=$('#gstName').value.trim().slice(0,18); if(n.length<2) return;
    AUTH.user={username:n,display:n,avatar:null,guest:true}; AUTH.mode='guest'; try{localStorage.setItem('mt_user',JSON.stringify(AUTH.user)); localStorage.setItem('mt_name',n);}catch(e){}
    SFX.play('login'); buzz([20,40,30]); renderUser(); renderBoards(); closeModal(); toast('Hoş geldin, '+n,'Misafir olarak girdin. Micup ile girersen puanların kaybolmaz.');};
}
function openSetup(){
  openModal('Micup · Kurulum');
  swap(`<div class="lg"><div class="lh">${micupMark}<div><h3>Bir kerelik kurulum</h3><p class="dim" style="margin:6px 0 0">Micup girişini açmak için sitenin sahibi şunları bir kez yapar. Ziyaretçiler sonra tek tıkla girer.</p></div></div>
    <ol class="steps2">
      <li>Siteyi yayınla (ör. <b>app.netlify.com/drop</b>). Sitenin adresi: <code>${esc(MICUP_CONFIG.redirectUri)}</code></li>
      <li>Micup › <b>Ayarlar › Uygulamalar › Uygulama oluştur</b>. OAuth2 bölümüne yönlendirme adresi olarak yukarıdaki adresi ekle. Uygulama ID'sini ve gizli anahtarı (secret) kopyala.</li>
      <li>Cloudflare'de ücretsiz bir <b>Worker</b> aç, verdiğim <b>micup-giris-worker.js</b> kodunu yapıştır. Ayarlarına <code>MICUP_CLIENT_ID</code>, <code>MICUP_CLIENT_SECRET</code> ve <code>ALLOWED_ORIGIN</code> değişkenlerini gir.</li>
      <li>Uygulama ID'sini ve Worker adresini aşağıya yapıştır.</li></ol>
    <form id="cidF" style="display:grid;gap:8px"><label class="mono dim" for="cidIn">Uygulama ID</label><input class="field" id="cidIn" placeholder="ör. 1294...." autocomplete="off" inputmode="numeric" value="${esc(MICUP_CONFIG.clientId)}">
      <label class="mono dim" for="pxIn">Worker adresi</label><input class="field" id="pxIn" placeholder="https://micup-giris.....workers.dev" autocomplete="off" value="${esc(MICUP_CONFIG.tokenProxy)}">
      <button class="btn p" type="submit" style="justify-content:center"><span class="bl"><span>Kaydet ve dene</span><span>Kaydet ve dene</span></span></button></form>
    <div class="note">Gizli anahtar (secret) <b>sadece Worker'a</b> girilir, bu sayfaya ve kimseye verilmez. Herkes için açmak istersen ID'yi ve Worker adresini geliştiricine gönder, dosyaya yazsın.</div>
    <div class="rowb"><button class="ghost" id="stBack" type="button">Geri</button></div></div>`);
  $('#stBack').onclick=openLogin;
  $('#cidF').onsubmit=e=>{e.preventDefault(); const v=$('#cidIn').value.trim(), px=$('#pxIn').value.trim().replace(/\/+$/,'');
    if(!/^\d{5,25}$/.test(v)) return toast('Geçersiz ID','Uygulama ID\'si sadece rakamlardan oluşur.');
    if(!/^https:\/\/[^\s]+$/.test(px)) return toast('Geçersiz adres','Worker adresi https:// ile başlamalı.');
    MICUP_CONFIG.clientId=v; MICUP_CONFIG.tokenProxy=px; try{localStorage.setItem('mt_micup_cid',v); localStorage.setItem('mt_micup_proxy',px);}catch(e){}
    toast('Kaydedildi','Micup onay ekranına yönlendiriliyorsun…'); setTimeout(micupLogin,700);};
}
function openAccount(){
  const u=AUTH.user, s=myStats();
  openModal('Hesap');
  swap(`<div class="lg"><div class="lh">${avatarHTML(u,64)}<div><h3>${esc(u.display||u.username)}</h3><p class="mono ${u.micup?'vf':'pv'}" style="margin:8px 0 0">${u.google?'Google ile bağlı'+(u.micupName?' · Micup: @'+esc(u.micupName):''):u.micup?'@'+esc(u.username)+' · Micup ile bağlı'+(u.member===true?' · Marvel Türkiye üyesi':u.member===false?' · sunucuya henüz katılmamış':''):'Misafir hesap'}</p>${u.micup?'<p class="mono dim" style="margin:2px 0 0;font-size:11px">Micup ID: '+esc(String(u.id||''))+' <button type="button" id="cpMic" data-mid="'+esc(String(u.id||'').replace(/^micup_/,''))+'" style="font-size:10px;padding:2px 8px">📋 Kopyala</button></p>':''}${u.micup?roleChips(u):''}</div></div>
    <ul><li>Sezon puanı <b id="acSp" style="color:var(--gold);margin-left:auto">${s.points.toLocaleString('tr-TR')}</b></li><li>Hafta puanı <b id="acWp" style="color:var(--fg);margin-left:auto">—</b></li><li>Toplam puan <b id="acPts" style="color:var(--fg);margin-left:auto">—</b></li><li>En iyi oyun <b style="color:var(--fg);margin-left:auto">${s.best.toLocaleString('tr-TR')}</b></li><li>Oynanan oyun <b style="color:var(--fg);margin-left:auto">${s.games}</b></li></ul>
<div class="rowb">${u.micup||u.google?'':'<button class="btn p" id="acLink" type="button"><span class="bl"><span>Micup ile giriş</span><span>Micup ile giriş</span></span></button>'}<button class="ghost" id="outBtn" type="button">${u.micup||u.google?'Çıkış yap':'Çıkış yap'}</button></div></div>`);
  const l=$('#acLink'); l&&(l.onclick=openLogin);
$('#outBtn').onclick=()=>{ if(FB.ready&&FB.user) FB.auth.signOut().catch(()=>{}); AUTH.user=null; AUTH.mode='none'; try{localStorage.removeItem('mt_user'); localStorage.removeItem('mt_micup_token');}catch(e){} renderUser(); renderBoards(); closeModal();};
}
function submitScore(game,score){
  const s=myStats(); s.points=Math.max(0,s.points+score); s.best=Math.max(s.best,score); s.games++;
  try{localStorage.setItem(ptsKey(),JSON.stringify(s));}catch(e){}
  if(AUTH.user){ try{ const b=JSON.parse(localStorage.getItem('mt_board')||'{}'); const k=AUTH.user.display||AUTH.user.username; b[k]=b[k]||{name:k,avatar:AUTH.user.avatar,points:0,matches:0}; if(game!=='cards'&&game!=='daily'){ b[k].points=(b[k].points||0)+score; } b[k].avatar=AUTH.user.avatar||b[k].avatar; b[k].me=true; localStorage.setItem('mt_board',JSON.stringify(b)); }catch(e){} }
  renderUser(); renderBoards();
}
async function getBoard(){
  let b={}; try{b=JSON.parse(localStorage.getItem('mt_board')||'{}');}catch(e){}
  const me=AUTH.user&&(AUTH.user.display||AUTH.user.username);
  const myPts=myStats().points||0;
  return Object.values(b).map(r=>({username:r.name,display:r.name,avatar:r.avatar,points:r.me?myPts:(r.points||0),me:r.name===me})).sort((a,b)=>b.points-a.points);
}
setInterval(()=>{ if(document.hidden) return; try{renderBoards();}catch(e){} },120000);
async function renderBoards(){
  const rows=await getBoard();
  const mini=$('#mini');
  mini.innerHTML=rows.length?rows.slice(0,4).map((r,i)=>`<div class="mrow${r.me?' me':''}"><span class="rk">${String(i+1).padStart(2,'0')}</span><span class="nm">${avatarHTML(r,28)}<span class="${window.ncOf?ncOf(r):''}">${esc(r.display)}</span></span><span class="pt">${(r.points||0).toLocaleString('tr-TR')}</span></div>`).join('')
    :`<div class="empty"><span class="mono">Sıralama</span><b>Tablo henüz boş</b><span>Sezonun ilk puanını sen al.</span></div>`;
  $('#lb').innerHTML=`<div class="lrow head mono"><span>Sıra</span><span>Oyuncu</span><span>Rol</span><span style="text-align:right">Puan</span></div>`+
    (rows.length?rows.map((r,i)=>`<div class="lrow${i===0?' r1':''}${r.me?' me':''}"><span class="rk">${String(i+1).padStart(2,'0')}</span><span class="nm">${avatarHTML(r)}<div><b class="${window.ncOf?ncOf(r):''}">${esc(r.display)}</b><small>${r.me?'sen':'birlikte oynadın'}</small></div></span><span>${window.wkTag?wkTag(r,i):(i===0?'<span class="role">Lider</span>':'')}</span><span class="pt">${(r.points||0).toLocaleString('tr-TR')}</span></div>`).join('')
    :`<div class="empty"><span class="mono">${window.SEASON?SEASON().label:'Sezon 01'}</span><b>Henüz kimse puan almadı</b><span>${AUTH.user?'Bir oyun oyna, adın burada görünsün.':'Micup\'ı bağla, oyna, adın burada görünsün.'}</span></div>`);
  $('#lbSub').textContent='Bu cihazda oynadığın maçlar ve odalarda birlikte oynadığın oyuncular. Sunucu eklenince tüm topluluk tek tabloda olacak.';
}

/* ========================= Yumuşak kaydırma ========================= */
let lenis=null;
if(window.Lenis&&!reduce&&fine&&MTSET.smooth!==false){
  lenis=new Lenis({duration:1.15,easing:t=>Math.min(1,1.001-Math.pow(2,-10*t)),smoothWheel:true});
  if(ST) lenis.on('scroll',ST.update);
  if(G) G.ticker.add(t=>lenis.raf(t*1000)); else {const raf=t=>{lenis.raf(t);requestAnimationFrame(raf);}; requestAnimationFrame(raf);}
  if(G) G.ticker.lagSmoothing(0);
}
if(lenis) lenis.options.prevent=n=>{try{const e=n&&n.target?n.target:n;return !!(e&&e.closest&&e.closest('.mbox,#lobby,.rv-log,.achatLog,.cgrid,.fr-list,.rb-l,.gc-l,[data-lenis-prevent]'));}catch(_){return false;}};
const toTop=()=>{lenis?lenis.scrollTo(0,{immediate:true}):window.scrollTo(0,0);};
setInterval(()=>{ if(document.body.style.overflow==='hidden'){ const m=document.getElementById('modal'),a=document.getElementById('arena'); if((!m||m.hidden)&&(!a||a.hidden)){ document.body.style.overflow=''; lenis&&lenis.start(); } } },800);

/* ========================= Yönlendirme + perde ========================= */
const VIEWS=['ana','oyunlar','siralama','magaza'];
const NAMES={ana:'Ana Sayfa',oyunlar:'Oyunlar',siralama:'Sıralama',magaza:'Mağaza'};
let current=null,busy=false;
function show(v,noEnter){
  $$('.view').forEach(el=>el.classList.toggle('on',el.id==='v-'+v));
  $$('nav a').forEach(a=>a.classList.toggle('on',a.dataset.go===v));
  current=v; toTop(); if(ST) ST.refresh(); if(!noEnter) enter(v);
}
function go(v,dir){
  if(!VIEWS.includes(v)) v='ana';
  if(v===current||busy) return;
  try{ askQuit(()=>{ try{ const _m=document.getElementById('modal'); if(_m&&!_m.hidden&&typeof closeModal==='function') closeModal(); const _a=document.getElementById('arena'); if(_a&&!_a.hidden&&typeof LOBBY!=='undefined'&&LOBBY.close) LOBBY.close(); }catch(e){} }); }catch(e){}
  if(!G||reduce||current===null){show(v);return;}
  busy=true;
  const d=dir||(VIEWS.indexOf(v)>VIEWS.indexOf(current)?1:-1);
  $('#cIx').textContent=`${String(VIEWS.indexOf(v)+1).padStart(2,'0')} / 04`; $('#cTt').textContent=NAMES[v];
  SFX.play('whoosh',d); buzz(10);
  G.timeline({defaults:{ease:'expo.inOut'},onComplete:()=>{busy=false;G.set('#curtain',{autoAlpha:0});}})
   .set('#curtain',{autoAlpha:1})
   .set('#curtain .pn',{clipPath:'inset(100% 0% 0% 0%)'})
   .set('#curtain .edge',{top:'100%',opacity:1})
   .set(['#cTt','#cIx'],{yPercent:110,rotation:7,scale:1.5})
   .set('#curtain .bar2 i',{scaleX:0,transformOrigin:'left'})
   .to('main',{y:-60,opacity:.4,scale:1.06,filter:'hue-rotate(30deg) saturate(1.7)',duration:.7,ease:'power3.in'},0)
   .fromTo('#pgflash',{opacity:0},{opacity:.9,duration:.16},0).to('#pgflash',{opacity:0,duration:.8,ease:'power2.out'},'<.1')
   .to('#curtain .pn',{clipPath:'inset(0% 0% 0% 0%)',duration:.75},0)
   .to('#curtain .edge',{top:'0%',duration:.75},0)
   .to('#curtain .edge',{opacity:0,duration:.2},'>-.1')
   .add(()=>{SFX.play('thump');buzz([0,8,24,18]);},'-=.12')
   .to('#cIx',{yPercent:0,duration:.6,ease:'expo.out'},'-=.15')
   .to('#cTt',{yPercent:0,rotation:0,scale:1,duration:.75,ease:'expo.out'},'<.05')
   .to('#curtain .bar2 i',{scaleX:1,duration:.5,ease:'power2.inOut'},'<')
   .add(()=>{show(v,true);G.set('main',{y:0,opacity:1,scale:1,filter:'none'});})
   .set('#curtain .bar2 i',{transformOrigin:'right'})
   .to('#curtain .bar2 i',{scaleX:0,duration:.35,ease:'power2.in'})
   .to(['#cTt','#cIx'],{yPercent:-110,duration:.45,ease:'expo.in',stagger:.04},'<')
   .add(()=>SFX.play('whooshOut',d),'<.1')
   .set('#curtain .edge',{top:'100%',opacity:1})
   .to('#curtain .pn',{clipPath:'inset(0% 0% 100% 0%)',duration:.8},'-=.05')
   .to('#curtain .edge',{top:'0%',opacity:0,duration:.8},'<')
   .add(()=>enter(v),'-=.6');
}
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-go]'); if(!a) return;
  e.preventDefault(); SFX.play('click');
  const v=a.dataset.go; if(location.hash!=='#'+v) history.replaceState(null,'','#'+v);
  if(!modal.hidden&&a.closest('#modal')) closeModal();
  go(v);
});
addEventListener('hashchange',()=>go(location.hash.slice(1)));

/* Görünüme girişte koreografi (içerik dinlenik halde görünür; animasyon görünür durumdan başlar ve biter) */
function enter(v){
  if(!G||reduce) return;
  const root=$('#v-'+v);
  if(v==='ana'&&$('.cpage',root)){
    G.fromTo($$('.cp',root),{scale:.82,rotation:()=>(Math.random()-.5)*10,opacity:0},{scale:1,rotation:0,opacity:1,duration:.7,ease:'back.out(1.7)',stagger:.09,clearProps:'transform,opacity'});
    G.fromTo($$('h1 .ln>span',root),{scale:0,rotation:-12},{scale:1,rotation:0,duration:.6,ease:'back.out(2.2)',stagger:.12,delay:.3,clearProps:'transform'});
    G.fromTo($$('.burst,.pow',root),{scale:0,rotation:-90},{scale:1,rotation:0,duration:.7,ease:'back.out(2.5)',delay:.65,clearProps:'transform'});
    G.fromTo($$('.balloon',root),{scale:.4,opacity:0,transformOrigin:'10% 0%'},{scale:1,opacity:1,duration:.5,ease:'back.out(2)',delay:.55,clearProps:'transform,opacity'});
    G.fromTo($$('.ctas .btn',root),{y:30,opacity:0},{y:0,opacity:1,duration:.5,ease:'back.out(2)',stagger:.08,delay:.75,clearProps:'transform,opacity'});
    return;
  }
  const heads=$$('h1 .ln>span, h2',root);
  G.fromTo(heads,{scale:.6,rotation:-6,opacity:0},{scale:1,rotation:0,opacity:1,duration:.55,ease:'back.out(2)',stagger:.08,clearProps:'transform,opacity'});
  if(v==='oyunlar') G.fromTo($$('.card',root),{y:60,scale:.9,opacity:0},{y:0,scale:1,opacity:1,duration:.6,ease:'back.out(1.6)',stagger:.08,delay:.2,clearProps:'transform,opacity'});
  G.fromTo($$('.eyebrow,.lead,.ctas,.sh .mono,.sub',root),{y:20,opacity:0},{y:0,opacity:1,duration:.9,ease:'expo.out',stagger:.06,delay:.15,clearProps:'all'});
  G.fromTo($$('.hud>div,.panel',root),{y:40,opacity:0},{y:0,opacity:1,duration:1,ease:'expo.out',stagger:.07,delay:.25,clearProps:'all'});
  if(v==='siralama') G.fromTo($$('.lrow',root),{x:-20,opacity:0},{x:0,opacity:1,duration:.7,ease:'expo.out',stagger:.04,delay:.35,clearProps:'all'});
}
// h2 maskesi için satır sarmalayıcı
$$('h2').forEach(h=>{const w=document.createElement('span'); w.className='ln'; h.parentNode.insertBefore(w,h); w.appendChild(h);});

/* Kaydırmaya bağlı hareketler */
if(G&&ST&&!reduce){
  G.to('#h1',{yPercent:-18,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});
  G.fromTo('#rail',{scaleX:0},{scaleX:1,ease:'none',scrollTrigger:{trigger:'#steps',start:'top 85%',end:'bottom 60%',scrub:true}});
}
/* Kayan şerit: kaydırma hızına tepki verir */
(function(){
  const tr=$('#marq'); let x=0,v=0,lastY=scrollY;
  function f(){const y=scrollY; v+=(y-lastY)*.04; lastY=y; v*=.9; x-= (reduce?0:.6)+Math.abs(v); const w=tr.scrollWidth/2; if(-x>w) x+=w; tr.style.transform=`translate3d(${x}px,0,0)`; requestAnimationFrame(f);}
  requestAnimationFrame(f);
})();

/* ========================= WebGL portal ========================= */
(function(){
  const cv=$('#gl'); const gl=cv.getContext('webgl',{antialias:false,alpha:false,powerPreference:'high-performance'}); if(!gl) return;
  const vs=`attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const fs=`precision highp float;uniform vec2 r;uniform float t;uniform vec2 m;uniform float wide;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
  void main(){
    vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;
    vec2 c=mix(vec2(0.,.22),vec2(.5,.02),wide)+m*.035;
    vec2 p=uv-c; float d=length(p); float a=atan(p.y,p.x);
    vec2 q=vec2(fbm(uv*1.5+t*.025),fbm(uv*1.5-t*.02+3.1));
    float neb=fbm(uv*2.1+q*2.2+t*.015);
    vec3 col=vec3(.026,.026,.04);
    col+=vec3(.50,.05,.10)*pow(neb,3.2)*1.5;
    col+=vec3(.30,.20,.85)*pow(q.y,3.5)*.55;
    float R=mix(.36,.4,wide);
    float rn=fbm(vec2(a*2.5+t*.5,d*7.-t*1.1));
    float ring=exp(-pow((d-R-(rn-.5)*.06)*26.,2.));
    float sp=pow(fbm(vec2(a*14.-t*1.6,d*22.-t)),7.)*smoothstep(.14,.0,abs(d-R))*9.;
    vec3 gold=vec3(1.,.66,.28), red=vec3(.92,.16,.22);
    col+=mix(red,gold,smoothstep(.35,.75,rn))*ring*1.35;
    col+=gold*sp;
    col+=red*.22*exp(-pow((d-R)*5.,2.));
    col*=mix(.32,1.,smoothstep(R*.6,R*.98,d));
    col+=vec3(.9,.3,.2)*.05*exp(-d*d*8.);
    col*=1.-.55*pow(length(uv*vec2(.75,1.)),2.2);
    col=pow(col,vec3(.95));
    col+=(h(gl_FragCoord.xy+fract(t*7.)*91.)-.5)*.03;
    gl_FragColor=vec4(col,1.);
  }`;
  const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return gl.getShaderParameter(s,gl.COMPILE_STATUS)?s:null;};
  const v=sh(gl.VERTEX_SHADER,vs), f=sh(gl.FRAGMENT_SHADER,fs); if(!v||!f) return;
  const pr=gl.createProgram(); gl.attachShader(pr,v); gl.attachShader(pr,f); gl.linkProgram(pr); if(!gl.getProgramParameter(pr,gl.LINK_STATUS)) return; gl.useProgram(pr);
  const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(pr,'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const uR=gl.getUniformLocation(pr,'r'),uT=gl.getUniformLocation(pr,'t'),uM=gl.getUniformLocation(pr,'m'),uW=gl.getUniformLocation(pr,'wide');
  let W,H,mx=0,my=0,tx=0,ty=0,vis=true;
  function size(){const rc=cv.getBoundingClientRect(); const k=isMob()?.55:Math.min(1,(devicePixelRatio||1)*.75); W=Math.max(2,rc.width*k|0); H=Math.max(2,rc.height*k|0); cv.width=W; cv.height=H; gl.viewport(0,0,W,H);}
  size(); addEventListener('resize',size);
  cv.parentElement.addEventListener('pointermove',e=>{const rc=cv.getBoundingClientRect(); tx=(e.clientX-rc.left)/rc.width-.5; ty=.5-(e.clientY-rc.top)/rc.height;});
  if('IntersectionObserver' in window) new IntersectionObserver(es=>{vis=es[0].isIntersecting;}).observe(cv);
  const t0=performance.now();
  (function loop(now){
    if(vis&&current==='ana'){mx+=(tx-mx)*.04; my+=(ty-my)*.04;
      gl.uniform2f(uR,W,H); gl.uniform1f(uT,reduce?8:(now-t0)/1000); gl.uniform2f(uM,mx,my); gl.uniform1f(uW,W/H>1.25?1:0); gl.drawArrays(gl.TRIANGLES,0,3);}
    requestAnimationFrame(loop);
  })(t0);
})();

/* ========================= Afiş çizimleri ========================= */
$$('[data-art]').forEach(c=>{ const k=+c.dataset.art; c.width=960; c.height=480; });
function drawPosters(){ $$('[data-art]').forEach(c=>{
  const k=+c.dataset.art, x=c.getContext('2d'), w=960, h=480;
  const P=[['#7B5CFF','#FFB627','?','HMM?'],['#FFB627','#FF3B4E','!','DİNG!'],['#FF3B4E','#FFB627','VS','KAPOW!'],['#18B07A','#FFB627','↕','ZIP!'],['#FF2E63','#5AB4FF','✦','POF!'],['#2FBF71','#FFD000','?','GERÇEK?']][k]||['#7B5CFF','#FFB627','?','BAM!'];
  x.fillStyle=P[0]; x.fillRect(0,0,w,h);
  const cx=w*.62, cy=h*.52;
  for(let i=0;i<36;i++){const a0=i/36*Math.PI*2,a1=a0+Math.PI/36; x.fillStyle=i%2?'rgba(255,255,255,.2)':'rgba(0,0,0,.12)'; x.beginPath(); x.moveTo(cx,cy); x.lineTo(cx+Math.cos(a0)*1500,cy+Math.sin(a0)*1500); x.lineTo(cx+Math.cos(a1)*1500,cy+Math.sin(a1)*1500); x.fill();}
  x.fillStyle='rgba(7,6,11,.38)'; for(let yy=0;yy<h+14;yy+=14) for(let xx=0;xx<w+14;xx+=14){const r=Math.max(0,Math.hypot(xx-cx,yy-cy)/620*6-1); if(r>.2){x.beginPath(); x.arc(xx+((yy/14)%2?7:0),yy,r,0,7); x.fill();}}
  const star=(sx,sy,r1,r2,n,fill,lw)=>{x.beginPath(); for(let i=0;i<n*2;i++){const a=i/(n*2)*Math.PI*2-Math.PI/2, r=i%2?r2:r1*(.88+Math.random()*.22); x[i?'lineTo':'moveTo'](sx+Math.cos(a)*r,sy+Math.sin(a)*r*.78);} x.closePath(); x.fillStyle=fill; x.fill(); if(lw){x.lineWidth=lw; x.lineJoin='round'; x.strokeStyle='#07060b'; x.stroke();}};
  star(cx+14,cy+14,260,160,14,'#07060b',0); star(cx,cy,260,160,14,P[1],10);
  x.save(); x.translate(cx,cy+8); x.rotate(-.08); x.font='310px Bangers, Impact, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.lineJoin='round';
  x.fillStyle='#07060b'; x.fillText(P[2],16,18); x.lineWidth=24; x.strokeStyle='#07060b'; x.strokeText(P[2],0,0); x.fillStyle='#fff'; x.fillText(P[2],0,0); x.restore();
  x.save(); x.translate(w*.2,h*.2); x.rotate(-.16); x.font='96px Bangers, Impact, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.lineJoin='round'; x.lineWidth=16; x.strokeStyle='#07060b'; x.strokeText(P[3],0,0); x.fillStyle='#fff'; x.fillText(P[3],0,0); x.restore();
  x.strokeStyle='rgba(7,6,11,.55)'; x.lineCap='round'; for(let i=0;i<14;i++){const y=30+Math.random()*(h-60); x.lineWidth=2+Math.random()*4; x.beginPath(); x.moveTo(-10,y); x.lineTo(60+Math.random()*200,y); x.stroke();}
}); }
(document.fonts?Promise.race([document.fonts.load('100px Bangers'),new Promise(r=>setTimeout(r,2500))]):Promise.resolve()).then(drawPosters,drawPosters);


/* ========================= İmleç, mıknatıs, harf karıştırma, dalga ========================= */
if(fine&&!reduce){
  const cur=$('#cur'), dot=$('#curd'); let cx=-100,cy=-100,rx=-100,ry=-100;
  addEventListener('pointermove',e=>{cx=e.clientX;cy=e.clientY; dot.style.transform=`translate(${cx}px,${cy}px)`;},{passive:true});
  (function f(){rx+=(cx-rx)*.16; ry+=(cy-ry)*.16; cur.style.transform=`translate(${rx}px,${ry}px)`; requestAnimationFrame(f);})();
  let last=null, lastT=0;
  document.addEventListener('pointerover',e=>{const t=e.target.closest('a,button:not([disabled]),.opt,input'); cur.classList.toggle('big',!!t&&!t.matches('input')); const now=performance.now(); if(t&&t!==last&&!t.matches('input')&&!t.closest('.card,.fgame,.cp-feat')&&now-lastT>140){ SFX.play('hover'); lastT=now; } last=t;});
  addEventListener('pointerdown',()=>cur.classList.add('down')); addEventListener('pointerup',()=>cur.classList.remove('down'));
  document.addEventListener('pointermove',e=>{const m=e.target.closest('[data-mag]'); $$('[data-mag]').forEach(el=>{if(el!==m&&el._mag){el._mag=false; G&&G.to(el,{x:0,y:0,duration:.8,ease:'elastic.out(1,.4)'});}});
    if(m&&G){const r=m.getBoundingClientRect(); m._mag=true; G.to(m,{x:(e.clientX-r.left-r.width/2)*.25,y:(e.clientY-r.top-r.height/2)*.35,duration:.4,ease:'power3.out'});}},{passive:true});
  const CH='ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0123456789';
  $$('[data-scr]').forEach(a=>{const tn=[...a.childNodes].find(n=>n.nodeType===3); if(!tn) return; const orig=tn.textContent; let busyS=false;
    a.addEventListener('pointerenter',()=>{if(busyS) return; busyS=true; let f=0; const iv=setInterval(()=>{f++; tn.textContent=orig.split('').map((c,i)=>c===' '?' ':(i<f/1.6?orig[i]:CH[Math.random()*CH.length|0])).join(''); if(f/1.6>=orig.length){clearInterval(iv); tn.textContent=orig; busyS=false;}},28);});});
}
document.addEventListener('pointerdown',e=>{
  SFX.unlock();
  const t=e.target.closest('.btn,.opt,.ghost,.tabbar a,.login,.snd,.chip'); if(!t||t.disabled) return;
  const r=t.getBoundingClientRect(), s=Math.max(r.width,r.height)*2.2, rp=document.createElement('span');
  rp.className='rip'; rp.style.cssText=`width:${s}px;height:${s}px;left:${e.clientX-r.left-s/2}px;top:${e.clientY-r.top-s/2}px`;
  t.appendChild(rp); setTimeout(()=>rp.remove(),720);
  if(e.pointerType==='touch') buzz(6);
});
{const btn=$('#sndBtn'), pop=$('#sndPop'), vm=$('#volM'), vs=$('#volS');
  vm.value=Math.round(SFX.mVol*100); vs.value=Math.round(SFX.sVol*100); $('#volMv').textContent=vm.value; $('#volSv').textContent=vs.value;
  btn.addEventListener('click',e=>{e.stopPropagation(); SFX.unlock(); pop.hidden=!pop.hidden; btn.setAttribute('aria-expanded',!pop.hidden); SFX.play('click'); if(!pop.hidden) G&&G.fromTo(pop,{y:-8,opacity:0},{y:0,opacity:1,duration:.3,ease:'expo.out'});});
  document.addEventListener('click',e=>{ if(!pop.hidden&&!e.target.closest('.sndwrap')){pop.hidden=true; btn.setAttribute('aria-expanded','false');} });
  vm.addEventListener('input',()=>{SFX.setMusicVol(vm.value/100); $('#volMv').textContent=vm.value;});
  vs.addEventListener('input',()=>{SFX.setSfxVol(vs.value/100); $('#volSv').textContent=vs.value;});
  vs.addEventListener('change',()=>SFX.sfx('confirm'));
  $('#muteAll').onclick=()=>{vm.value=0; vs.value=0; SFX.setMusicVol(0); SFX.setSfxVol(0); $('#volMv').textContent=0; $('#volSv').textContent=0;};}

/* ========================= Pencere (modal / alt sayfa) ========================= */
const modal=$('#modal'), mBody=$('#mBody'), mTitle=$('#mTitle'), mbox=$('.mbox');
let cleanup=null;
function openModal(title){
  if(cleanup){cleanup();cleanup=null;}
  mTitle.textContent=title; const was=modal.hidden; modal.hidden=false; document.body.style.overflow='hidden'; lenis&&lenis.stop();
  if(!was) return;
  SFX.play('open'); buzz(12);
  if(G&&!reduce){
    G.fromTo(modal,{opacity:0},{opacity:1,duration:.4,ease:'power2.out'});
    if(isMob()) G.fromTo(mbox,{yPercent:100},{yPercent:0,duration:.75,ease:'expo.out'});
    else G.fromTo(mbox,{y:30,clipPath:'inset(50% 0% 50% 0%)'},{y:0,clipPath:'inset(0% 0% 0% 0%)',duration:.8,ease:'expo.out'});
  }
}
/* ---- Firestore okuma önbelleği (kota): aynı liste sorgusu kısa sürede tekrar sorulursa buluta gitmez ---- */
let _actT=Date.now(); ['pointerdown','keydown','touchstart'].forEach(e=>addEventListener(e,()=>{ _actT=Date.now(); },{passive:true,capture:true}));
const FSC={}; window.__fsBust=(n)=>{ for(const k in FSC) if(!n||k.startsWith(n)) delete FSC[k]; };
function fsCache(db){ const TTL={users:480e3,raffles:300e3,seasons:900e3,weeks:900e3,stats:600e3,announcements:180e3,admins:600e3}, real=db.collection.bind(db);
  const cget=(key,ttl,run)=>()=>{ const c=FSC[key], idle=Date.now()-_actT>180e3||document.hidden; if(c&&(Date.now()-c.t<ttl||idle)) return c.p; const p=run(); FSC[key]={t:Date.now(),p}; p.catch(()=>{ delete FSC[key]; }); return p; };
  const wrap=(q,key,ttl)=>new Proxy(q,{get(t,p){
    if(p==='where'||p==='orderBy'||p==='limit'||p==='startAfter') return (...a)=>{ const ok=key&&a.every(v=>v==null||typeof v!=='object'); return wrap(t[p](...a),ok?key+'|'+p+':'+a.join(','):null,ttl); };
    if(p==='get'&&key) return cget(key,ttl,()=>t.get());
    if(p==='count'&&key) return ()=>({get:cget(key+'|count',ttl,()=>t.count().get())});
    if(p==='doc') return (...a)=>{ const d=t.doc(...a); if(!a.length||!(key==='stats'||key==='seasons'||key==='weeks'||key==='admins')) return d; return new Proxy(d,{get(t2,p2){ if(p2==='get') return cget(key+'/'+a[0],ttl,()=>t2.get()); const v=t2[p2]; return typeof v==='function'?v.bind(t2):v; }}); };
    const v=t[p]; return typeof v==='function'?v.bind(t):v; }});
  db.collection=n=>TTL[n]?wrap(real(n),n,TTL[n]):real(n); }
/* ---- oyun çıkış cezası ---- */
let GACT=null;
function armGame(id,pen){ GACT={id,pen,done:false}; }
function gameDone(){ if(GACT) GACT.done=true; }
function applyPenalty(id,pen){
  try{
    const st=myStats(); const cut=pen;
    if(cut>0) submitScore(id,-cut);
    if(id==='cards'){ const c=Math.floor(cut/2); if(c>0) setCoins(Math.max(0,(coins()||0)-c)); }
  }catch(e){}
}
function askQuit(cb){
  const g=GACT;
  if(!g||g.done){ cb&&cb(); return; }
  const old=document.getElementById('quitAsk'); if(old) old.remove();
  const d=document.createElement('div'); d.id='quitAsk';
  d.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:20px';
  d.innerHTML='<div style="background:#16161f;border:1px solid #3a3a48;border-radius:18px;padding:26px;max-width:340px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)"><b style="font-size:20px">Emin misin?</b><p style="color:var(--dim);margin:10px 0 18px">Oyundan çıkarsan <b style="color:#ff4d5e">−'+g.pen+' puan</b>'+(g.id==='cards'?' ve <b style="color:#ff4d5e">−'+Math.floor(g.pen/2)+' coin</b>':'')+' gider.</p><div style="display:flex;gap:10px;justify-content:center"><button id="qNo" class="btn p" type="button" style="flex:1">Vazgeç</button><button id="qYes" class="btn g" type="button" style="flex:1;border-color:#ff4d5e;color:#ff4d5e">Çık · −'+g.pen+'</button></div></div>';
  document.body.appendChild(d);
  d.querySelector('#qNo').onclick=()=>{d.remove();};
  d.querySelector('#qYes').onclick=()=>{d.remove(); GACT=null; applyPenalty(g.id,g.pen); cb&&cb();};
}
function closeModal(){
  if(modal.hidden) return;
  if(GACT&&!GACT.done){ askQuit(()=>closeModal()); return; }
  if(cleanup){cleanup();cleanup=null;}
  SFX.play('close');
  let _fin=false; const done=()=>{ if(_fin) return; _fin=true; modal.hidden=true;document.body.style.overflow='';mBody.innerHTML='';mbox.style.transform='';mbox.style.transition='';G&&G.set(mbox,{clearProps:'transform,clipPath'});lenis&&lenis.start(); }; setTimeout(done,900);
  if(G&&!reduce){G.to(mbox,isMob()?{yPercent:100,duration:.45,ease:'expo.in'}:{y:20,clipPath:'inset(50% 0% 50% 0%)',duration:.45,ease:'expo.in'}); G.to(modal,{opacity:0,duration:.35,delay:.12,onComplete:done});} else done();
}
$('#mClose').onclick=closeModal;
modal.addEventListener('click',e=>{if(e.target===modal) closeModal();});
addEventListener('keydown',e=>{if(e.key==='Escape') closeModal();});
function swap(html){mBody.innerHTML=html; if(G&&!reduce) G.fromTo(mBody.children,{y:16,opacity:0},{y:0,opacity:1,duration:.6,stagger:.05,ease:'expo.out',clearProps:'all'});}
function toast(title,txt){
  SFX.play('toast'); const t=$('#toast'); $('#toastTxt').innerHTML=`<b>${esc(title)}</b>${esc(txt)}`; t.hidden=false;
  if(G&&!reduce) G.fromTo(t,{y:20,opacity:0,clipPath:'inset(0 100% 0 0)'},{y:0,opacity:1,clipPath:'inset(0 0% 0 0)',duration:.7,ease:'expo.out'});
  clearTimeout(toast.t); toast.t=setTimeout(()=>{ if(G&&!reduce) G.to(t,{opacity:0,y:10,duration:.4,onComplete:()=>t.hidden=true}); else t.hidden=true; },5600);
}
// Mobil: aşağı çekerek kapat
let dy0=null; const mtop=$('.mtop');
mtop.addEventListener('touchstart',e=>{if(!isMob()) return; dy0=e.touches[0].clientY; mbox.style.transition='none';},{passive:true});
mtop.addEventListener('touchmove',e=>{if(dy0===null) return; const d=Math.max(0,e.touches[0].clientY-dy0); mbox.style.transform=`translateY(${d}px)`;},{passive:true});
mtop.addEventListener('touchend',e=>{if(dy0===null) return; const d=e.changedTouches[0].clientY-dy0; dy0=null;
  if(d>110){mbox.style.transition='';closeModal();} else {mbox.style.transition='transform .45s cubic-bezier(.2,1.3,.4,1)'; mbox.style.transform=''; setTimeout(()=>mbox.style.transition='',460);}});
// Mobil: yatay kaydırma ile sayfa değiştir
let sx=0,sy=0,st=0;
document.addEventListener('touchstart',e=>{if(!modal.hidden) return; const t=e.touches[0]; sx=t.clientX; sy=t.clientY; st=Date.now();},{passive:true});
document.addEventListener('touchend',e=>{if(!modal.hidden||!st) return; const t=e.changedTouches[0], dx=t.clientX-sx, dy=t.clientY-sy, fast=Date.now()-st<650; st=0;
  if(fast&&Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.7){const i=VIEWS.indexOf(current)+(dx<0?1:-1); if(i>=0&&i<VIEWS.length){history.replaceState(null,'','#'+VIEWS[i]); go(VIEWS[i],dx<0?1:-1);} else buzz(20);}},{passive:true});

/* ========================= Oyunlar ========================= */
const GN={guess:'Ben Kimim?',quiz:'Bilgi Yarışması',hl:'Yüksek mi Düşük mü',mem:'Kahraman Hafızası',real:'Gerçek mi Sahte mi?'};
function confirmGame(g,fn){
  openModal(GN[g]||'Oyun');
  const guest=!AUTH.user||AUTH.user.guest||!AUTH.user.micup||!(FB.ready&&FB.user);
  swap('<div style="text-align:center;padding:8px 0"><p class="dim" style="margin:0 0 12px">Oyun başlasın mı? Kuralları modalın içinde göreceksin.</p>'+(guest?'<p style="margin:0 0 14px;color:var(--gold);font-weight:700">⚠ Micup bağlı değilsin — puanların sıralamaya yazılmayabilir. Sağ üstteki giriş butonundan bağlanabilirsin.</p>':'')+'<div class="rowb" style="justify-content:center;gap:10px"><button class="ghost" id="cgNo" type="button">Vazgeç</button><button class="btn p" id="cgYes" type="button"><span class="bl"><span>Başla</span><span>Başla</span></span></button></div></div>');
  const no=$('#cgNo'),yes=$('#cgYes'); if(no)no.onclick=()=>{SFX.play('click');closeModal();}; if(yes)yes.onclick=()=>{SFX.play('click');closeModal();setTimeout(fn,1000);};
}
$$('[data-game]').forEach(c=>c.addEventListener('click',()=>{SFX.play('click'); const g=c.dataset.game; const fn={guess:startGuess,quiz:startQuiz,hl:startHL,mem:startMemory,real:startReal,cards:()=>CG.open()}[g]; if(!fn) return; if(g==='cards'){ fn(); } else confirmGame(g,fn); }));
const norm=s=>s.toLocaleLowerCase('tr').replace(/ı/g,'i').replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u').replace(/[^a-z0-9]/g,'');
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
const HEROES=[
 {ad:'Iron Man',alt:['demir adam','tony stark','ironman','tony'],ip:['Dahi bir mucit ve milyarder.','Göğsündeki enerji kaynağı onu hayatta tutuyor.','İlk zırhını bir mağarada, hurdalardan yaptı.','Şirketinin adı Stark Industries.','Bir basın toplantısında gizli kimliğini kendisi açıkladı.']},
 {ad:'Thor',alt:['thor odinson'],ip:["Bir tanrı, ama Dünya'yı çok seviyor.",'Gök gürültüsü ve şimşek onun işi.',"Asgard'dan geliyor.",'Babası Odin.','Silahını yalnızca layık olan kaldırabilir.']},
 {ad:'Black Panther',alt:['kara panter','tchalla','t challa','siyah panter'],ip:['Bir krallığın hükümdarı.','Gücünü kalp biçimli bir bitkiden alıyor.','Ülkesi kendini dünyadan saklayan teknolojik bir ulus.','Kostümü vibranyumdan.',"Gerçek adı T'Challa."]},
 {ad:'Doctor Strange',alt:['doktor strange','stephen strange','dr strange','strange'],ip:['Eskiden ünlü bir beyin cerrahıydı.','Bir araba kazasında ellerini ağır yaraladı.',"Kamar-Taj'da eğitim aldı.",'Pelerini kendi aklıyla hareket ediyor.',"Zaman Taşı'nın koruyucusuydu."]},
 {ad:'Spider-Man',alt:['örümcek adam','orumcek adam','peter parker','spiderman','spider man'],ip:['Lisedeyken süper güç kazandı.','Onu halası büyüttü.',"New York'un Queens semtinde yaşıyor.",'Onu radyoaktif bir böcek ısırdı.','"Büyük güç, büyük sorumluluk getirir."']},
 {ad:'Loki',alt:['loki laufeyson'],ip:['Hileleri ve yalanlarıyla ünlü.',"Aslında Buz Devleri'nin soyundan geliyor.",'Odin onu evlat edindi.','New York saldırısını o başlattı.','Yaramazlık tanrısı.']},
 {ad:'Hulk',alt:['bruce banner','banner','yesil dev'],ip:['Bir bilim insanı, gama ışınlarında uzman.','Bir deney kazası onu değiştirdi.','Sinirlenince kontrolü kaybediyor.','Rengi yeşile dönüyor.','"Hulk ezer!"']},
 {ad:'Scarlet Witch',alt:['wanda','wanda maximoff','kizil cadi'],ip:["Sokovia'da doğdu.",'İkiz kardeşi çok hızlı koşuyordu.','Güçleri Zihin Taşı ile ortaya çıktı.','Bir kasabayı bir televizyon dizisine çevirdi.','Gerçek adı Wanda Maximoff.']},
 {ad:'Kaptan Amerika',alt:['captain america','steve rogers','kaptan amerika','cap'],ip:['İkinci Dünya Savaşı sırasında gönüllü oldu.','Zayıf bir gençken bir serumla güçlendi.','Yıllarca buzun içinde uyudu.','En iyi arkadaşı Bucky.','Yuvarlak kalkanını bumerang gibi fırlatır.']},
 {ad:'Black Widow',alt:['kara dul','natasha romanoff','natasha','natasa'],ip:['Çok küçük yaşta özel bir programda eğitildi.','Rus kökenli bir ajan.',"Kırmızı Oda'dan kaçtı.",'Hawkeye ile yakın arkadaş.','Gerçek adı Natasha Romanoff.']},
 {ad:'Thanos',alt:['titan'],ip:["Titan gezegeninden geliyor.",'Evrenin yarısını yok etmek istedi.','Kızları Gamora ve Nebula.','Altın bir eldiven taşıyor.','Bir parmak şıklatmasıyla her şeyi değiştirdi.']},
 {ad:'Groot',alt:['grut'],ip:['Bir ağaç türünden geliyor.','Çok az kelime biliyor.','En yakın arkadaşı bir rakun.','Kendini feda edip yeniden filizlendi.','"Ben Groot\'um."']},
 {ad:'Rocket',alt:['rocket raccoon','roket','rakun'],ip:['Deneylerle değiştirilmiş bir hayvan.','Silah ve patlayıcı uzmanı.','Kendisine "rakun" denmesinden nefret ediyor.',"Galaksinin Koruyucuları'ndan.",'En yakın arkadaşı Groot.']},
 {ad:'Ant-Man',alt:['karinca adam','scott lang','antman','ant man'],ip:['Eskiden hırsızdı.','Bir takımla boyutunu değiştirebiliyor.','Kuantum alemine sıkıştı kaldı.','Karıncalarla konuşabiliyor.','Gerçek adı Scott Lang.']},
 {ad:'Hawkeye',alt:['sahin goz','clint barton','clint'],ip:['Hiç ıskalamaz.','Süper gücü yok, sadece çok iyi nişancı.','Çiftliğinde gizli bir ailesi var.','Black Widow ile eski ortak.','Ok ve yay kullanır.']},
 {ad:'Star-Lord',alt:['peter quill','starlord','star lord','quill'],ip:["Çocukken Dünya'dan kaçırıldı.",'Eski bir kasetçalarla müzik dinler.','Uzay korsanları tarafından büyütüldü.',"Galaksinin Koruyucuları'nın lideri.",'Gerçek adı Peter Quill.']},
 {ad:'Vision',alt:['vizyon'],ip:['Bir yapay zekâdan doğdu.','Alnında bir taş taşıyor.','Duvarların içinden geçebiliyor.','Wanda ile bir ilişkisi var.','Tony Stark ve Bruce Banner yarattı.']},
 {ad:'Kaptan Marvel',alt:['captain marvel','carol danvers','carol'],ip:['Eskiden bir savaş pilotuydu.','Bir uzay enerjisiyle güç kazandı.','Kree ırkıyla birlikte yaşadı.','Nick Fury ile 90\'larda tanıştı.','Gerçek adı Carol Danvers.']},
 {ad:'Wolverine',alt:['logan','volverin'],ip:['Çok uzun yıllardır yaşıyor.','Yaraları çok hızlı iyileşiyor.','İskeleti adamantiumla kaplandı.',"X-Men'in en sert üyesi.",'Ellerinden üç pençe çıkıyor.']},
 {ad:'Deadpool',alt:['wade wilson','dedpul'],ip:['Çok fazla konuşuyor.','Dördüncü duvarı yıkıp izleyiciyle konuşur.','Yüzü yaralı, maske takıyor.','İki kılıç taşıyor.','Gerçek adı Wade Wilson.']},
];
const QS=[
 ["Kaptan America's kalkanı hangi metalden yapılmıştır?",['Vibranyum','Adamantium','Uru','Titanyum'],0,1],
 ["Thor'un çekicisinin adı nedir?",['Stormbreaker','Mjölnir','Gungnir','Jarnbjorn'],1,1],
 ["Wakanda'nın kralı kimdir?",['Killmonger',"M'Baku","T'Challa",'Okoye'],2,1],
 ["Tony Stark'ın ilk yapay zekâ asistanının adı nedir?",['F.R.I.D.A.Y.','Ultron','Vision','J.A.R.V.I.S.'],3,2],
 ['Thanos kaç Sonsuzluk Taşı topladı?',['Altı','Beş','Yedi','Dört'],0,1],
 ["Peter Parker New York'un hangi semtinde yaşar?",['Brooklyn','Queens','Harlem','Bronx'],1,2],
 ["Hulk'un insan halinin adı nedir?",['Steve Rogers','Clint Barton','Bruce Banner','Scott Lang'],2,1],
 ["Doctor Strange'in Zaman Taşı'nı taşıyan kolyesinin adı nedir?",['Kara Kitap',"Agamotto'nun Gözü",'Darkhold','Kozmik Küp'],1,3],
 ["Loki'yi evlat edinen Asgard kralı kimdir?",['Heimdall','Bor','Odin','Surtur'],2,2],
 ['Groot hep hangi cümleyi söyler?',["Ben Groot'um","Ben Rocket'ım",'Ağaç gibiyim','Galaksi bizim'],0,1],
 ["Wolverine'in iskeleti hangi metalle kaplıdır?",['Vibranyum','Adamantium','Çelik','Titanyum'],1,2],
 ["Black Widow'un gerçek adı nedir?",['Natasha Romanoff','Yelena Belova','Wanda Maximoff','Maria Hill'],0,2],
 ["Galaksinin Koruyucuları'nın lideri kimdir?",['Drax','Rocket','Star-Lord','Gamora'],2,2],
 ["Thanos'un evlatlık kızlarından biri kimdir?",['Valkyrie','Gamora','Mantis','Shuri'],1,2],
 ["Ant-Man hangi aleme sıkışıp kalmıştı?",['Kuantum','Ayna','Karanlık','Astral'],0,3],
 ["Vision'ın alnındaki taş hangisidir?",['Güç','Ruh','Zihin','Uzay'],2,3],
 ["Shuri hangi ülkenin prensesidir?",['Sokovia','Latveria','Wakanda','Genosha'],2,1],
 ["Kaptan Marvel'in gerçek adı nedir?",['Carol Danvers','Monica Rambeau','Jessica Jones','Jennifer Walters'],0,2],
 ["Tony Stark'ın şirketinin adı nedir?",['Oscorp','Stark Industries','Hammer Industries','Roxxon'],1,1],
 ["Nick Fury hangi teşkilatın başındadır?",['Hydra','A.I.M.','S.H.I.E.L.D.','Kree'],2,1],
 ["Thor'un kardeşi kimdir?",['Loki','Odin','Heimdall','Balder'],0,1],
 ["Hawkeye hangi silahı kullanır?",['Kalkan','Ok ve yay','Çekiç','Pençe'],1,1],
 ["Spider-Man'in halasının adı nedir?",['May','Martha','Mary','Peggy'],0,2],
 ["Deadpool'un gerçek adı nedir?",['Wade Wilson','Logan','Eddie Brock','Frank Castle'],0,2],
 ["Steve Rogers'ın en yakın arkadaşı kimdir?",['Sam Wilson','Bucky Barnes','Tony Stark','Peggy Carter'],1,3],
 ["Ultron'u kim yarattı?",['Hank Pym','Tony Stark ve Bruce Banner','Thanos','Hydra'],1,3],
 ["Scarlet Witch'in ikiz kardeşi kimdir?",['Pietro','Vision','Magneto','Kang'],0,2],
 ["Doctor Strange eğitimini nerede aldı?",['Asgard','Wakanda','Kamar-Taj','Sokovia'],2,3],
 ["Rocket hangi hayvana benzer?",['Kedi','Rakun','Tilki','Gelincik'],1,1],
 ["Sonsuzluk Taşlarını tutan altın eldivenin adı nedir?",['Sonsuzluk Eldiveni','Kozmik Kılıf','Titan Zırhı','Gölge Eli'],0,2],
 ["Iron Man'in sivil adı kimdir?",['Bruce Wayne','Tony Stark','Clark Kent','Matt Murdock'],1,1],
 ["Hawkeye'nin gerçek adı nedir?",['Clint Barton','Steve Rogers','Thaddeus Ross','Bill Foster'],0,1],
 ["Thor'un babasının adı nedir?",['Odin','Loki','Surtur','Balder'],0,1],
 ["Loki'nin gerçek adı nedir?",['Laufeysohn','Heimdall','Surtur','Fenris'],0,3],
 ["Hela'nın kardeşi kimdir?",['Thor','Loki','Balder','Heimdall'],1,2],
 ["Vision'ı kim yarattı?",['Tony Stark','Bruce Banner','Hank Pym','Nick Fury'],1,2],
 ["Falcon'ın kanatları neyle güçlenir?",['Jet motoru','Kuantum','Kree teknolojisi','Titanyum'],2,2],
 ["Winter Soldier'ın gerçek adı nedir?",['Bucky Barnes','James Buchanan Barnes','Steve Rogers','John Walker'],1,3],
 ["Koruyucular'ın en küçük üyesi kimdir?",['Rocket','Groot','Drax','Mantis'],3,2],
 ["Star-Lord'un çaldığı enstrüman nedir?",['Gitar','Keman','Piyano','Davul'],0,1],
 ["Yondu'nun gemisinin adı nedir?",['Dark Aster','Milano','Benatar','Q-ship'],1,2],
 ["The Collector hangi yerde yaşar?",['Knowhere','Morag','Xandar','Ego'],0,2],
 ["Adam Warlock'un gücünün kaynağı nedir?",['Ruh Taşı','Kozmik Güç','Kree DNA','Titan'],1,3],
 ["Eternals'ın en güçlü üyesi kimdir?",['Ikaris','Kingo','Sprite','Sersi'],0,3],
 ["Celestial'lar ne yapar?",['Gezegen yutar','İnsan sever','Savaşır','Uçar'],0,3],
 ["Black Knight'in kılıcının adı nedir?",['Ebony Blade','Darkhold','Stormbreaker','Jarnbjorn'],0,3],
 ["Moon Knight'in kaç farklı kişiliği vardır?",['2','3','4','5'],1,3],
 ["Blade hangi topluluğa aittir?",['Avengers','Defenders','X-Men','Guardians'],1,2],
 ["X-Men'in kurucusu kimdir?",['Professor X','Magneto','Cyclops','Storm'],0,1],
 ["Magneto'nun asıl adı nedir?",['Erik Lehnsherr','Max Eisenhardt','Charles Xavier','Victor Creed'],0,3],
 ["Wolverine'in memleketi neresidir?",['Kanada','ABD','Japonya','Rusya'],0,1],
 ["Jean Grey'in gücü nedir?",['Ateş','Zihin','Işın','Zaman'],1,2],
 ["Cyclops'in gözlüğü ne işe yarar?",['Görüş','Işınları engeller','Zırh','Uyku'],1,2],
 ["Storm'un gücü nedir?",['Hava kontrolü','Toprak','Ateş','Su'],0,1],
 ["Beast'in en belirgin yeteneği nedir?",['Dövüş','Zeka','Uçma','Kuvvet'],1,1],
 ["Rogue'un gücü nedir?",['Emme','Ateş','Işın','Zaman'],0,2],
 ["Gambit'in kartları ne sağlar?",['Şans','Ateş','Buz','Yıldırım'],0,2],
 ["Deadpool'in iyileşmesi neden kaynaklanır?",['Doğal','Mutant gen','Kree','Sihir'],1,2],
 ["Punisher'in silahı nedir?",['Tabanca','Tüfek','Kılıç','Bomba'],1,1],
 ["Jessica Jones'un gücü nedir?",['Uçma','Dayanıklılık','Işın','Zaman'],1,2],
 ["Luke Cage'in gücü nedir?",['Kuvvet ve dayanıklılık','Uçma','Zeka','Ateş'],0,1],
 ["Iron Fist'in gücü nedir?",['Ateş','Chi','Zaman','Kalkan'],1,3],
 ["Daredevil'in duyusu nedir?",['Işık','Ses','Koku','Tat'],1,1],
 ["Spider-Man'in örümceği hangi türdendir?",['Karadul','Radyoaktif','Kozmik','Zehirli'],1,2],
 ["Miles Morales'in yeteneği nedir?",['Alev','Faz','Işın','Zaman'],1,3],
 ["Eye of Agamotto'nun rengi nedir?",['Yeşil','Kırmızı','Mavi','Siyah'],0,1],
 ["Ant-Man hangi takıma aittir?",['Avengers','X-Men','Guardians','Defenders'],0,1],
 ["Wasp'in gerçek adı nedir?",['Janet van Dyne','Hope van Dyne','Peggy Carter','Sharon Carter'],0,2],
 ["Quicksilver'in gücü nedir?",['Işık','Hız','Zaman','Işın'],1,1],
 ["Scarlet Witch'in taşı hangisidir?",['Zihin','Ruh','Güç','Yok'],1,2],
 ["Agatha Harkness'in gücü nedir?",['Büyü','Ateş','Işın','Kuvvet'],0,3],
 ["Ulysses Klaue'nun silahı nedir?",['Kedi pençesi','Top','Kılıç','Ok'],0,3],
 ["Ulysses Klaue nereli değildir?",['Güney Afrika','Sokovia','Almanya','İtalya'],2,3],
 ["Killmonger'in hedefi nedir?",['Wakanda','Asgard','Sokovia','Xandar'],0,2],
 ["Wakanda'nın sınırında ne bulunur?",['Vibranyum','Adamantium','Altın','Kükürt'],0,2],
 ["Shuri'nin rolü nedir?",['Bilim insanı','Savaşçı','Kraliçe','Doktor'],0,1],
 ["Okoye'nin görevi nedir?",['Dünyayı korumak','Savaş','Casusluk','Doktorluk'],0,2],
 ["Ravager'ların eski lideri kimdir?",['Yondu','Rocket','Drax','Kraken'],0,2],
 ["Kraken nedir?",['Ahtapot','Balina','Köpek','Yılan'],0,2],
 ["Black Knight'i ilk kılan kişi kimdir?",['Arthur','Lancelot','Gawain','Merlin'],0,2],
 ["Black Knight'in efendisi kimdir?",['Dane Whitman','Arthur','Loki','Odin'],0,3],
 ["Inhumans'ın lideri kimdir?",['Black Bolt','Lockjaw','Karnak','Medusa'],0,3],
 ["Black Bolt'un gücü nedir?",['Ses','Göz','Zihin','Zaman'],0,3],
 ["Kree'lerin lideri kimdir?",['Ronan','Carol Danvers','Yon-Rogg','Griffin'],0,2],
 ["Supreme Intelligence nedir?",['Kree lideri','Robot','Taş','Kral'],0,3],
 ["Celestial Tiamut hangi gezegene dönüşür?",['Mars','Venüs','Dünya','Ay'],2,3],
 ["Eternals'ın gezegeni hangi yıldız sistemindedir?",['Tiamut','Olympus','Xandar','Aetheria'],0,2],
 ["Kree-Skrull savaşı hangi filmde görülür?",['Captain Marvel','Guardians','Ant-Man','Spider-Man'],0,2],
 ["Knowhere'de ne bulunur?",['Maden','Deniz','Orman','Şehir'],0,2],
 ["Morag'da ne bulunur?",['Orb','Taş','Kitap','Kılıç'],0,3],
 ["Xandar'ın kralı kimdir?",['Nova Prime','Yondu','Ego','Kree'],0,2],
 ["Nova Corps'un gücü nedir?",['Uçuş','Işın','Kuvvet','Zaman'],0,1],
 ["Hela'nın elementi nedir?",['Ateş','Buz','Zihin','Toprak'],1,3],
 ["Surtur'un elementi nedir?",['Ateş','Buz','Zihin','Su'],0,1],
 ["Malekith'in elementi nedir?",['Karanlık','Ateş','Işın','Zaman'],0,2],
 ["Ancient One'un gerçek kimliği nedir?",['Korkuluk','Çoklu Evren Koruyucusu','Robot','Tanrıça'],1,3],
 ["Dormammu'nun alanı neresidir?",['Karanlık Boyut','Ayna','Kuantum','Ruh'],0,3],
 ["Kaecilius'in hedefi nedir?",['Kamar-Taj','Wakanda','Asgard','Sokovia'],0,3],
 ["Wong'un rolü nedir?",['Kütüphane','Hizmetli','Doktor','Avcı'],0,1],
 ["Baron Mordo'nun gücü nedir?",['Büyü','Kılıç','Işın','Kuvvet'],0,2],
 ["Multiverse'teki en güçlü varlık hangisidir?",['Dormammu','Thanos','Doctor Strange','Ancient One'],0,3],
 ["Watcher'lar ne yapar?",['Gözlem','Savaş','Yönetim','Yok etme'],0,3],
 ["Galactus nedir?",['Gezegen yiyen','Kahraman','Kral','Robot'],0,2],
 ["Silver Surfer'in gücü nedir?",['Kozmik güç','Ateş','Işın','Zaman'],0,3],
 ["Thor'un yeni silahı hangisidir?",['Stormbreaker','Mjölnir','Gungnir','Jarnbjorn'],0,2],
 ["Moon Knight hangi takıma aittir?",['Defenders','Avengers','X-Men','Guardians'],0,2],
 ["Ms. Marvel'in yeteneği nedir?",['Işık','Elastikiyet','Kuvvet','Zaman'],0,2],
 ["She-Hulk'un değişimi hangi gazdandır?",['Gamma','Radyasyon','Kuantum','Işın'],0,2],
 ["Hulk'un yeşil olmasının sebebi nedir?",['Radyasyon','Gen','Işın','Kirlilik'],0,2],
 ["Sentry'nin gücü nedir?",['Sonsuz güç','Uçuş','Kuvvet','Zaman'],0,3],
 ["Kang'in ana tehdit alanı nedir?",['Zaman yolculuğu','Işın','Kuvvet','Zihin'],0,3],
 ["TVA'nın açılımı nedir?",['Zaman Varyans Otoritesi','Süreklilik','Kuantum','Ruh'],0,3],
 ["Sylvie'nin gücü nedir?",['Büyü','Işın','Kuvvet','Zaman'],0,2],
 ["Weapon X programı ne yapar?",['Adamantium','Vibranium','Klon','Robot'],0,2],
 ["Vibranium en çok nerede bulunur?",['Wakanda','Asgard','Sokovia','Atlantis'],0,1],
 ["Adamantium hangi metallerden oluşur?",['Vibranyum ve demir','Meteor','Deniz','Uzay'],0,3],
 ["Uru metali nerede bulunur?",['Asgard','Wakanda','Sokovia','Xandar'],0,2],
 ["Mjölnir'in sahibi kimdir?",['Thor','Odin','Loki','Hela'],0,1],
 ["Stormbreaker'i kim dövdü?",['Eitri','Odin','Surtur','Hela'],0,3],
 ["Eitri kimdir?",['Cüce demirci','Dev','Ejderha','Tanrı'],0,3],
 ["Bifrost'u kim korur?",['Heimdall','Odin','Thor','Loki'],0,1],
 ["Asgard'in yıkımına ne sebep oldu?",['Surtur','Hela','Loki','Thanos'],0,1],
 ["New Asgard nerede kuruldu?",['Norveç','İsviçre','Kanada','İngiltere'],0,2],
 ["Sakaar'ın kraliçesi kimdir?",['Valkyrie','Hela','Sif','Frigga'],0,2],
 ["Valkyrie'nin silahı nedir?",['Mızrak','Kılıç','Balta','Çekiç'],0,1],
 ["Sif'in silahı nedir?",['Kılıç','Balta','Mızrak','Top'],0,1],
 ["Jane Foster'in rolü nedir?",['Astrofizikçi','Asgard halkı','Doktor','Avcı'],0,2],
 ["Darcy Lewis'in rolü nedir?",['Bilim insanı','Asgard halkı','Mühendis','Pilot'],0,1],
 ["Frigga'nın rolü nedir?",["Odin'in eşi","Hela'nın kızı",'Savaşçı','Kral'],0,2],
 ["Mysterio'nun gerçek adı nedir?",['Quentin Beck','Norman Osborn','Victor Von Doom','Otto Octavius'],0,3],
 ["Green Goblin'in gerçek adı nedir?",['Norman Osborn','Harry Osborn','Otto Octavius','Jigsaw'],0,1],
 ["Doctor Octopus'in silahı nedir?",['Robot kollar','Kılıç','Top','Zehir'],0,1],
 ["Vulture'un gerçek adı nedir?",['Adrian Toomes','Norman Osborn','Electro','Rhino'],0,3],
 ["Electro'nun gücü nedir?",['Yıldırım','Ateş','Su','Toprak'],0,2],
 ["Sandman'in gücü nedir?",['Kum','Su','Toprak','Cam'],0,2],
 ["Lizard'in hali nedir?",['Sürüngen','Kuş','Balık','Yılan'],0,1],
 ["Rhino'nun zırhı nedir?",['Demir','Çelik','Titan','Altın'],0,2],
 ["Venom'un gücü nedir?",['Simbiotik','Ateş','Kuvvet','Işın'],0,2],
 ["Morbius'un gücü nedir?",['Vampir','Zombi','Büyücü','Dev'],0,2],
 ["Scorpion'un gücü nedir?",['Kum','Zehir','Ateş','Toprak'],0,2],
 ["Hydra'nın sembolü nedir?",['Kafatası','Yılan','Kurt','Kartal'],1,2],
 ["S.H.I.E.L.D.'in sembolü nedir?",['Kartal','Kalkan','Yıldız','Kurt'],1,1],
 ["A.I.M.'in sembolü nedir?",['Arı','Yılan','Kartal','Kurt'],0,2],
 ["Helmut Zemo'nun hedefi nedir?",['Avengers','S.H.I.E.L.D.','Hydra','Kree'],0,2],
 ["Namor'un ülkesi hangisidir?",['Talokan','Wakanda','Asgard','Atlantis'],0,3],
 ["Talokan'ın lideri kimdir?",['Namor','T\'Challa','Orm','Aquaman'],0,2],
 ["Riri Williams'in gücü nedir?",['Zırh','Işın','Kuvvet','Zaman'],0,2],
 ["Ironheart'in zırhı hangi renktedir?",['Kırmızı-altın','Mavi','Siyah','Yeşil'],0,2],
 ["Shuri Black Panther oldu mu?",['Evet','Hayır','Sadece filmde','Sadece dizide'],0,3],
 ["Quantum Realm'de ne bulunur?",['Zaman','Uzay','Ruh','Kuantum'],0,3],
 ["Kang'in merkezi neresidir?",['Kuantum','Ruh','Zaman','Kara'],0,3],
 ["Eternals'ın lideri kimdir?",['Ikaris','Kingo','Sprite','Sersi'],0,3],
 ["Nebula'nın biyolojik durumu nedir?",['Kasıtlı hasar görmüş','Doğal','Klon','Robot'],0,3],
 ["Gamora'nın babası kimdir?",['Ego','Thanos','Ronan','Korath'],1,2],
 ["Star-Lord'un gerçek adı nedir?",['Peter Quill','T\'Challa','Scott Summers','Matt Murdock'],0,2],
 ["Rocket'in gerçek adı nedir?",['Rocket','89P13','Lylla','Teefs'],1,3],
 ["Drax'in ailesini kim öldürdü?",['Thanos','Ronan','Ego','Collector'],1,3],
 ["Yondu'nun mavi adamı kimdir?",['Kraken','Kraken','Taserface','Ayrish'],2,3],
 ["Mantis'in gücü nedir?",['Zihin okuma','Alev','Işın','Zaman'],0,3],
 ["Doctor Strange'in pelerinini veren kişi kimdir?",['Ancient One','Kaecilius','Dormammu','Wong'],0,3],
 ["Hulk hangi gezegenden gelir?",['Sakaar','Xandar','Knowhere','Morag'],0,2],
 ["Kaptan Marvel'in filmdeki düşmanı kimdir?",['Yon-Rogg','Ronan','Malekith','Ultron'],0,2],
 ["Groot'un gezegeninin adı nedir?",['Planet X','Xandar','Morag','Hala'],0,3],
 ["Drax'in silahı neye benzer?",['Kılıç','Bıçak','Balta','Top'],1,2],
 ["Odin'in gözünü kaybettiği olay nedir?",['Savaş','Körlük laneti','Surtur','Hela'],1,3],
 ["Thanos'un gemisinin adı nedir?",['Sanctuary II','Dark Aster','Benatar','Dreadnought'],0,3],
 ["Vision'ın taşı hangisidir?",['Güç','Zihin','Ruh','Uzay'],1,2],
 ["Loki'nin taşı hangisidir?",['Zihin','Ruh','Güç','Yok'],0,2],
 ["Kamar-Taj hangi boyutta yer alır?",['Ayna boyutu','Kuantum','Ruh','Karanlık'],0,3],
 ["Heimdall'in görevi nedir?",['Bifröst\'ü izlemek','Savaş','Casusluk','Krallık'],0,1],
 ["Bifrost nedir?",['Gökkuşağı köprüsü','Kılıç','Taş','Gemi'],0,1],
 ["Sokovia Antlaşması neyi kapsar?",['Avengers tescili','Savaş','Krallık','Barış'],0,2],
 ["Hydra'nın SHIELD içindeki lideri kimdir?",['Nick Fury','Alexander Pierce','Crossbones','Baron Zemo'],1,3],
 ["Weapon X programının amacı nedir?",['Adamantium iskelet','Klon','Robot','Zırh'],0,2],
 ["X-Men'in karşıt grubu hangisidir?",['Avengers','Guardians','Brotherhood','Defenders'],2,2],
 ["Professor X'in gücü nedir?",['Zihin','Işın','Kuvvet','Uçuş'],0,1],
 ["Spider-Man'in örümcek ısırığı nereden gelir?",['Karadul','Radyoaktif','Kozmik','Zehirli'],1,2],
 ["Eternals'taki Celestial'ların amacı nedir?",['Gezegen ekmek','Savaş','Keşif','Yaşam'],0,3],
 ["Agamotto'nun Gözü'nün rengi nedir?",['Yeşil','Kırmızı','Mavi','Siyah'],0,1],
 ["Kree'lerin savaşı kimlerleydi?",['Skrull','X-Men','Avengers','Darkhold'],0,2],
];
/* ---- Yüksek mi Düşük mü ---- */
function startHL(){
  openModal('04 · Yüksek mi Düşük mü');
  swap(`<div class="ghud mono"><span>Mod seç</span></div>
    <div class="opts" style="grid-template-columns:1fr">
      <button class="opt" id="hlSolo" type="button"><span class="mono">01</span>Tek başına<span class="dim" style="display:block;font-size:12px;font-weight:400;margin-top:4px">Serini koru, rekor kır</span></button>
      <button class="opt" id="hlDu" type="button"><span class="mono">02</span>Arkadaşınla yarış<span class="dim" style="display:block;font-size:12px;font-weight:400;margin-top:4px">Aynı deste · ilk 12 doğru kazanır · online</span></button>
    </div>`);
  $('#hlSolo').onclick=()=>{SFX.play('click');window.__MT_SOLO=0.5; swap(`<div class="ghud mono"><span>Soru sayısı</span></div><div class="opts" style="grid-template-columns:1fr 1fr"><button class="opt" id="hlN5" type="button"><span class="mono">5</span>5 SORU<span class="dim" style="display:block;font-size:12px;font-weight:400;margin-top:4px">Doğru +100 · yanlış −100</span></button><button class="opt" id="hlN10" type="button"><span class="mono">10</span>10 SORU<span class="dim" style="display:block;font-size:12px;font-weight:400;margin-top:4px">Doğru +50 · yanlış −50</span></button></div>`); $('#hlN5').onclick=()=>hlSolo(5); $('#hlN10').onclick=()=>hlSolo(10); };
  $('#hlDu').onclick=()=>{SFX.play('click'); DUEL.open();};
}
function hlSolo(n){
  n=n||10; const per=Math.round(500/n), ded=n<=5?100:50;
  let deck=shuffle(HEROES_CG.map(h=>h.id)), cur=deck.pop(), done=false, answered=0, score=0;
  armGame('hl',50);
  document.fonts&&document.fonts.load('30px Bangers').catch(()=>{});
  function draw(){
    const st=Math.random()*5|0, a=HERO_BY[cur];
    if(!deck.length) deck=shuffle(HEROES_CG.map(h=>h.id).filter(x=>x!==cur));
    const nx=deck.pop(), b=HERO_BY[nx];
    swap(`<div class="ghud mono"><span>Soru <b>${answered+1}/${n}</b></span><span>Puan <b>${score}</b></span><span>Özellik <b>${STATS[st]}</b></span></div>
      <div class="hl2"><div class="hlc"><img src="${cardFace(a)}" alt="${esc(a.ad)}"></div><div class="hlq"><b>${esc(b.ad)}</b><span class="mono dim">${STATS[st]} değeri ${esc(a.ad)}'dan</span>
      <div class="timer" id="hltmr"><i id="hlbar"></i></div>
      <div class="rowb" style="flex-direction:column"><button class="btn p" id="hlUp" type="button"><span class="bl"><span>Yüksek ↑</span><span>Yüksek ↑</span></span></button><button class="btn g" id="hlDn" type="button"><span class="bl"><span>Düşük ↓</span><span>Düşük ↓</span></span></button></div></div>
      <div class="hlc back" id="hlNext"><div class="hcflip"><div class="f">${CARD_BACK_HTML}</div><div class="b"><img src="${cardFace(b)}" alt=""></div></div></div></div><div class="fb" id="fb"></div>`);
    const TL=n<=5?8:10;
    const hbar=$('#hlbar'); if(hbar){hbar.style.transition='none';hbar.style.transform='scaleX(1)';requestAnimationFrame(()=>requestAnimationFrame(()=>{hbar.style.transition='transform '+TL+'s linear';hbar.style.transform='scaleX(0)';}));}
    let ht=null; const stopT=()=>{if(ht){clearTimeout(ht);ht=null;}};
    const go=(up,to)=>{ if(done) return; done=true; stopT(); const hb=$('#hlbar'); if(hb)hb.style.transition='none'; const ok=!to&&(up?b.s[st]>=a.s[st]:b.s[st]<=a.s[st]); SFX.sfx('flip'); G.to('#hlNext .hcflip',{rotationY:180,duration:.6,ease:'power3.inOut'});
      setTimeout(()=>{ const fb=$('#fb'); answered++;
        if(ok){ score+=per; SFX.play('correct'); buzz([16,40,16]); fb.className='fb ok'; fb.textContent=`Doğru +${per} (${b.s[st]} — ${a.s[st]}) · ${answered}/${n}`; burst(); }
        else { score-=ded; SFX.play('wrong'); buzz(60); fb.className='fb no'; fb.textContent=`${to?'Süre doldu — bilemedin':'Yanlış'} −${ded} (doğrusu ${b.s[st]} — ${a.s[st]}) · ${answered}/${n}`; }
        setTimeout(()=>{ if(answered>=n) finish('hl','Yüksek mi Düşük mü',score,500); else {cur=nx; done=false; draw();} },1200); },650); };
    ht=setTimeout(()=>{ if(!done) go(false,true); },TL*1000+60);
    $('#hlUp').onclick=()=>go(true,false); $('#hlDn').onclick=()=>go(false,false);
  }
  draw();
}
/* ---- Hafıza ---- */
function startMemory(){
  openModal('05 · Kahraman Hafızası');
  swap(`<div class="ghud mono"><span>Zorluk seç</span></div>
    <p class="q" style="text-align:center">Ne kadar çift kart çevirmeceksin? Hızlı bitirirsen çok puan, uzatırsan puanın erir — çok uzatırsa eksiye düşebilirsin.</p>
    <div class="opts" style="grid-template-columns:1fr 1fr 1fr 1fr">
      ${[6,8,10,12].map(n=>`<button class="opt" type="button" data-p="${n}"><span class="mono">${n*2}</span>${n} ÇİFT<span class="dim" style="display:block;font-size:11px;font-weight:400;margin-top:4px">${n} çift kart</span></button>`).join('')}
    </div>`);
  $$('[data-p]',mBody).forEach(b=>b.onclick=()=>{SFX.play('click');memGame(+b.dataset.p);});
}
function memGame(pairs){
  pairs=pairs||6; const ids=shuffle(HEROES_CG.map(h=>h.id)).slice(0,pairs); const cards=shuffle([...ids,...ids]); let open=[],found=0,moves=0,lock=false,miss=0; const t0=Date.now(); armGame('mem',40);
  openModal('05 · Kahraman Hafızası');
  document.fonts&&document.fonts.load('30px Bangers').catch(()=>{});
  swap(`<div class="ghud mono"><span>Hamle <b id="mvs">0</b></span><span>Bulunan <b id="fnd">0</b>/${pairs}</span><span>Süre <b id="tm">0</b> sn</span></div>
    <div class="mem">${cards.map((id,i)=>`<button class="mc" type="button" data-i="${i}" aria-label="Kart ${i+1}"><div class="hcflip"><div class="f">${CARD_BACK_HTML}</div><div class="b"><img src="${cardFace(HERO_BY[id])}" alt=""></div></div></button>`).join('')}</div>`);
  const iv=setInterval(()=>{const e=$('#tm'); if(e) e.textContent=Math.round((Date.now()-t0)/1000); else clearInterval(iv);},500); cleanup=()=>clearInterval(iv);
  $$('.mc',mBody).forEach(b=>b.onclick=()=>{
    if(lock||b.classList.contains('ok')||open.includes(b)) return;
    SFX.sfx('flip'); G.to(b.querySelector('.hcflip'),{rotationY:180,duration:.45,ease:'power3.inOut'}); open.push(b);
    if(open.length===2){ moves++; $('#mvs').textContent=moves; lock=true; const [x,y]=open;
      if(cards[x.dataset.i]===cards[y.dataset.i]){ setTimeout(()=>{ x.classList.add('ok'); y.classList.add('ok'); SFX.play('correct'); burst(); found++; $('#fnd').textContent=found; open=[]; lock=false;
          if(found===pairs){ clearInterval(iv); const sec=Math.round((Date.now()-t0)/1000); const pts=Math.max(-400,Math.round(200+pairs*30-sec*5-miss*30-Math.max(0,moves-pairs*2)*10)); setTimeout(()=>finish('mem','Kahraman Hafızası',pts,400),700);} },450); }
      else { miss=Math.min(10,miss+1); setTimeout(()=>{ SFX.sfx('swap'); [x,y].forEach(c=>G.to(c.querySelector('.hcflip'),{rotationY:0,duration:.45,ease:'power3.inOut'})); open=[]; lock=false; },900); }
    }
  });
}

/* ---- Gerçek mi, Sahte mi? ---- */

const REAL_FAKE=['Captain Canada','Iron Turk','Silver Falcon','Night Claw','Dark Templar','Captain Nebula','Steel Viper','Quantum Kid','Lord Mimic','Captain Comet','Iron Pharaoh','Star Viking','Lady Kraken','Doctor Galaxy','Captain Thunder','Nightshade','Steel Serpent','Agent Zero','Baron Blitz','Queen Mirage'];
const REAL_EXTRA=['Scarlet Witch','Wanda Maximoff','Pietro Maximoff','Quicksilver','Loki','Hela','Surtur','Karnilla','Malekith','Cyclops','Jean Grey','Rogue','Gambit','Nightcrawler','Shadowcat','Kitty Pryde','Iceman','Beast','Cable','X-23','Laura Kinney','Luke Cage','Jessica Jones','Iron Fist','Daredevil','Punisher','Ghost Rider','Blade','Moon Knight','Hellstrom','Nova','Adam Warlock','Gamora','Drax','Rocket Raccoon','Groot','Mantis','Ego','Kraglin','Yondu','Peter Quill','Nick Fury','Maria Hill','Phil Coulson','Jasper Sitwell','Peggy Carter','Bucky Barnes','Sam Wilson','James Rhodes','War Machine','JARVIS','E.D.I.T.H','Frigga','Odin','Heimdall','Sif','Volstagg','Fandral','Hogun','Balder','Hermod','Angela','Karnak','Ultron','Kang','Kang the Conqueror','MODOK','Mysterio','Vulture','Rhino','Electro','Sandman','Lizard','Doctor Octopus','Green Goblin','Kraven','Chameleon','Shocker','Scorpion','Hammerhead','Bullseye','Kingpin','Wilson Fisk','Jigsaw','Crossbones','Batroc','Baron Zemo','Red Skull','Arnim Zola','Victor Von Doom','Doom','Magneto','Mystique','Apocalypse','Sentinel','Asteroid M','Kronos','Annihilus','Galactus','Silver Surfer','Terrax','Blastaar','Gladiator','Mentor','Absorbing Man','Ajak','Agent Carter','Agent 13','Sharon Carter','Peggy Carter','Dum-E','Vision','Ultron Prime','Victor Mancha','Sentry','Aether','Grim Reaper','Lady Deathstrike','Omega Red','Sabretooth','Rictor','Shatterstar','Boomer','Anole','Nocturne','Banshee','Cannonball','Sunspot','Wolfsbane','Husk','Cannonball','Longshot','Dazzler','Magma','Warpath','Cypher','Tarantula','Multiple Man','Madame Web','Jessica Drew','Spider-Woman','Spider-Gwen','Ganke Lee','Spider-Man 2099','Miguel O Hara','Spider-Punk','Spider-Noir','Spider-Ham','Peni Parker','Spider-Man India','Arana','Spider-Man Noir','Venomized','Knull','Scream','Phage','Toxin','Scream','Agony','Lasher','Riot','Phage','Sentry','Machine Man','A Life Fantastic','Blastaar','The Watcher','Uatu','Eternity','Infinity','Death','Oblivion','Grandmaster','The Collector','Taneleer Tivan','Nova Prime','Irani Rael','Drax the Destroyer','Mantis','Quill','Yondu Udonta','Stakar Ogord','Ayesha','Karnak','Sersi','Druig','Makkari','Phastos','Black Knight','Cersei','Eros','Starfox','Kang','Immortus','Rama-Tut','Conqueror Kang','Victor Timely','He Who Remains','Miss Minutes','OB','Casey','C-20','Vote','Sylvie','Laufeyson','Mobius','Hunter B-15','Ravonna Renslayer','Victor Timely','He Who Remains','Alioth','Victor Von Doom','Denis','Natasha Romanoff','Yelena Belova','Taskmaster','Ghost','Ava Starr','Sharon Carter','Peggy Carter','Edwin Jarvis','Franklin Richards','Reed Richards','Susan Storm','Johnny Storm','Ben Grimm','The Thing','Human Torch','Invisible Woman','Mole Man','The Watcher','Uatu the Watcher','Adam Warlock','Gamora','Nebula','Drax','Rocket','Groot','Mantis','Peter Quill','Yondu','Kraglin','Stakar','Taserface','Ravagers','Nova Corps','Corpsman','Irani','Quill','Yondu','Ravager','Yondu Udonta','Stakar Ogord','Ayesha','Karnak','Sersi','Druig','Phastos','Black Knight','Cersei','Eros','Starfox','Kang','Immortus','Rama-Tut','Victor Timely','He Who Remains','Miss Minutes','OB','Casey','C-20','Vote','Sylvie','Laufeyson','Mobius','Hunter B-15','Ravonna Renslayer','Alioth','Denis','Natasha Romanoff','Yelena Belova','Taskmaster','Ghost','Ava Starr','Sharon Carter','Peggy Carter','Edwin Jarvis','Franklin Richards','Reed Richards','Susan Storm','Johnny Storm','Ben Grimm','The Thing','Human Torch','Invisible Woman','Mole Man','The Watcher','Uatu','Adam Warlock','Gamora','Nebula','Drax','Rocket','Groot','Mantis','Peter Quill','Yondu','Kraglin','Stakar','Taserface'];
const _FP=['Captain','Iron','Steel','Night','Dark','Star','Lord','Lady','Agent','Doctor','Baron','Queen','Prince','Silver','Golden','Crimson','Atomic','Quantum','Cyber','Neo','Ultra','Hyper','Dragon','Shadow','Storm','Thunder','Blazing','Frozen','Savage','Mystic','Cosmic','Lunar','Solar','Blood','Ghost','Phantom','Specter','Wraith','Reaper','Hunter','Stalker','Nomad','Voyager','Skull','Bone','Rust','Venom','Toxin','Nova','Comet','Blitz','Frost','Grim','Dread','Onyx','Ember','Ash','Cinder','Pyre','Rune','Hex','Jinx','Vex','Rift','Flux','Surge','Volt','Ion','Zero','Seven','Nine','Prime','Alpha','Omega','Duke','Sage','Mole','Toad','Newt','Wren','Lark','Finch','Heron','Crane','Ibis','Kestrel','Osprey','Raven','Crow','Magpie','Jay','Sparrow','Swift','Owl','Condor','Petrel','Tern','Gull','Skua','Cormorant','Pelican','Egret','Bittern','Spoonbill','Flamingo','Stork','Whooping','Dusk','Dawn'];
const _FS=['Canada','Turk','Viper','Falcon','Claw','Templar','Nebula','Pharaoh','Viking','Kraken','Galaxy','Comet','Widow','Hawk','Wolf','Tiger','Lion','Bear','Eagle','Shark','Snake','Scorpion','Rhino','Bull','Titan','Colossus','Hunter','Ranger','Pilot','Fang','Strike','Force','Guard','Blade','Saber','Lance','Axe','Hammer','Shield','Armor','Wing','Bolt','Spark','Flame','Murk','Murk','Shade','Shade','Pyre','Rune','Jinx','Rift','Surge','Volt','Ion','Zero','Seven','Nine','Prime','Alpha','Omega','Duke','Sage','Mole','Toad','Newt','Wren','Lark','Finch','Heron','Crane','Ibis','Kestrel','Osprey','Raven','Crow','Magpie','Jay','Sparrow','Swift','Owl','Condor','Petrel','Tern','Gull','Skua','Cormorant','Pelican','Egret','Bittern','Spoonbill','Flamingo','Stork','Dusk','Dawn'];
const FAKE_POOL=(()=>{ const out=new Set(REAL_FAKE); let g=0; while(out.size<240&&g++<8000){ out.add(_FP[(Math.random()*_FP.length)|0]+' '+_FS[(Math.random()*_FS.length)|0]); } return [...out]; })();
function startReal(){ armGame('real',25);
  const EN={cap:'Captain America',cmarvel:'Captain Marvel',profx:'Professor X',msmarvel:'Ms. Marvel'};const REAL=[...new Set(HEROES_CG.map(h=>EN[h.id]||h.ad).concat(REAL_EXTRA))];
  const qs=shuffle([...shuffle(REAL).slice(0,2).map(ad=>({ad,ok:1})),...shuffle(REAL_EXTRA).slice(0,3).map(ad=>({ad,ok:1})),...shuffle(FAKE_POOL).slice(0,5).map(ad=>({ad,ok:0}))]);
  let qi=0,score=0,iv=null;
  openModal('06 · Gerçek mi, Sahte mi?');
  cleanup=()=>clearInterval(iv);
  function q(){
    const it=qs[qi], start=performance.now(); let done=false;
    swap(`<div class="ghud mono"><span>Soru <b>${qi+1}/10</b></span><span>Skor <b>${score}</b></span><span>Süre <b id="rsec">7</b> sn</span></div>
      <div class="timer" id="rtmr"><i id="rbar"></i></div>
      <div class="realcard"><span class="mono dim">Bu isim</span><b>${esc(it.ad)}</b></div>
      <div class="opts"><button class="opt" id="rYes" type="button"><span class="mono">✓</span>Gerçek</button><button class="opt" id="rNo" type="button"><span class="mono">✗</span>Sahte</button></div>
      <div class="fb" id="fb"></div>`);
    const bar=$('#rbar'); bar.style.transition='transform 7s linear'; requestAnimationFrame(()=>requestAnimationFrame(()=>bar.style.transform='scaleX(0)'));
    const pick=guess=>{ if(done) return; done=true; clearInterval(iv); bar.style.transition='none';
      const el=(performance.now()-start)/1000, hit=guess===it.ok;
      const fb=$('#fb');
      if(hit){ const p=18+Math.ceil(Math.max(0,7-el)); score+=p; SFX.play('correct'); buzz([16,40,16]); fb.className='fb ok'; fb.textContent=`Doğru! ${it.ad} ${it.ok?'gerçek bir Marvel kahramanı':'gerçek değil'}. +${p} puan`; burst(); }
      else { SFX.play('wrong'); buzz(60); score=Math.max(-250,score-25); fb.className='fb no'; fb.textContent=`${guess===-2?'Süre doldu':'Yanlış'} −25: ${it.ad} ${it.ok?'gerçek bir Marvel kahramanı':'gerçek değil'}.`; }
      $$('#rYes,#rNo',mBody).forEach(b=>b.disabled=true);
      setTimeout(()=>{qi++; qi<qs.length?q():finish('real','Gerçek mi, Sahte mi?',score,250);},1300);
    };
    clearInterval(iv); iv=setInterval(()=>{const left=Math.max(0,7-(performance.now()-start)/1000), c=Math.ceil(left), s=$('#rsec'); if(s) s.textContent=c; if(left<=0) pick(-2);},150);
    $('#rYes').onclick=()=>pick(1); $('#rNo').onclick=()=>pick(0);
  }
  q();
}
function startGuess(){
  const rounds=pickHeroes(); let ri=0,score=0,shown=1,gMax=0,gPen=0; armGame('guess',100);
  openModal('01 · Ben Kimim?');
  function round(){
    const h=rounds[ri]; shown=1; gMax+=360; draw();
    function draw(){
      const pts=360-(shown-1)*40;
      swap(`<div class="ghud mono"><span>Tur <b>${ri+1}/3</b></span><span>Skor <b>${score}</b></span><span>Bu tur <b>${pts}</b></span></div>
        <ul class="clues">${h.ip.map((c,i)=>i<shown?`<li><span class="mono">İpucu ${i+1}</span><span>${c}</span></li>`:`<li class="lock"><span class="mono">İpucu ${i+1}</span><span>Kilitli</span></li>`).join('')}</ul>
        <form class="guess" id="gf"><label for="gIn" style="position:absolute;left:-9999px">Tahminin</label><input class="field" id="gIn" autocomplete="off" placeholder="Kahramanın adı" list="heroList"><button class="btn p" type="submit" style="height:56px"><span class="bl"><span>Tahmin et</span><span>Tahmin et</span></span></button></form>
        <datalist id="heroList">${HEROES.map(x=>`<option value="${x.ad}">`).join('')}</datalist>
        <div class="rowb"><button class="ghost" id="more" type="button" ${shown>=5?'disabled':''}>İpucu aç · −100</button><button class="ghost" id="pass" type="button">Pas geç</button></div>
        <div class="fb" id="fb"></div>`);
      const inp=$('#gIn'); if(!isMob()) setTimeout(()=>inp.focus(),60);
      $('#gf').onsubmit=e=>{e.preventDefault(); const g=norm(inp.value); if(!g) return;
        const ok=[h.ad,...h.alt].some(n=>norm(n)===g), fb=$('#fb');
        if(ok){SFX.play('correct'); buzz([16,40,16]); score+=pts; fb.className='fb ok'; fb.textContent=`Doğru, ${h.ad}. +${pts} puan`; burst(); setTimeout(next,1200);}
        else{SFX.play('wrong'); buzz(60); fb.className='fb no'; score-=50; fb.textContent='Olmadı −50 puan, tekrar dene.'; G&&!reduce&&G.fromTo('#gf',{x:-8},{x:0,duration:.5,ease:'elastic.out(1,.3)'}); inp.select();}
      };
      $('#more').onclick=()=>{if(shown<5){SFX.play('reveal');buzz(8);shown++;draw();}};
      $('#pass').onclick=()=>{SFX.play('wrong'); score-=100; const fb=$('#fb'); fb.className='fb no'; fb.textContent=`Pas geçildi −100 · Cevap: ${h.ad}`; setTimeout(next,1200);};
    }
  }
  function next(){ri++; ri<rounds.length?round():finish('guess','Ben Kimim?',gMax?Math.max(-1000,Math.round(score/gMax*1000)):0,1000);}
  round();
}
function startQuiz(){
  openModal('02 · Bilgi Yarışması');
  swap(`<div class="ghud mono"><span>Bilgi Yarışması</span><span>Hazır mısın?</span></div>
    <p class="q" style="text-align:center">Zorluk seç ve tek başına oyna ya da arkadaşlarınla online yarış!</p>
    <div class="opts" style="grid-template-columns:1fr 1fr 1fr 1fr">
      <button class="opt" type="button" data-d="1"><span class="mono">1</span>KOLAY</button>
      <button class="opt" type="button" data-d="2"><span class="mono">2</span>ORTA</button>
      <button class="opt" type="button" data-d="3"><span class="mono">3</span>ZOR</button>
      <button class="opt" type="button" data-d="mix"><span class="mono">★</span>KARIŞIK</button>
    </div>
    <div class="opts" style="grid-template-columns:1fr 1fr;margin-top:12px">
      <button class="opt" type="button" id="qzHost"><span class="mono">🌐</span>ONLINE KUR</button>
      <button class="opt" type="button" id="qzJoin"><span class="mono">🔗</span>ODAYA KATIL</button>
    </div>`);
  $$('.opt[data-d]',mBody).forEach(b=>b.onclick=()=>{ SFX.play('click'); runQuiz(pickQuiz(b.dataset.d)); });
  $('#qzHost').onclick=()=>{ SFX.play('click'); QZ.host(); };
  $('#qzJoin').onclick=()=>{ SFX.play('click'); QZ.joinAsk(); };
}
function runQuiz(qs,onEnd){
  onEnd=onEnd||(sc=>finish('quiz','Bilgi Yarışması',sc,1000));
  let qi=0,score=0,iv=null,qMax=0;
  cleanup=()=>clearInterval(iv); armGame('quiz',100);
  function q(){
    const [txt,opts,ans,diff]=qs[qi], order=shuffle(opts.map((o,i)=>i)); let start=performance.now(), done=false,lastSec=99,hintUsed=false; const _qm=100; qMax+=_qm;
    swap(`<div class="ghud mono"><span>Soru <b>${qi+1}/${qs.length}</b></span><span>Skor <b>${score}</b></span><span>Süre <b id="sec">15</b> sn</span></div>
      <div class="timer" id="tmr"><i id="bar"></i></div>
      <span class="qdiff d${diff||1}">${['','KOLAY','ORTA','ZOR'][diff||1]}</span><p class="q">${txt}</p>
      <div class="opts">${order.map((oi,k)=>`<button class="opt" type="button" data-i="${oi}"><span class="mono">${'ABCD'[k]}</span>${opts[oi]}</button>`).join('')}</div>
      <div class="fb" id="fb"></div>`);
    const bar=$('#bar'); bar.style.transition='transform 15s linear'; requestAnimationFrame(()=>requestAnimationFrame(()=>bar.style.transform='scaleX(0)'));
    clearInterval(iv); iv=setInterval(()=>{const left=Math.max(0,15-(performance.now()-start)/1000), c=Math.ceil(left), s=$('#sec'); if(s) s.textContent=c;
      if(c<=5&&c>0&&c!==lastSec){lastSec=c; SFX.play('tick',c); buzz(5); const tm=$('#tmr'); tm&&tm.classList.add('hot');} if(left<=0) tOut();},150);
    $$('.opt',mBody).forEach(b=>b.onclick=()=>pick(+b.dataset.i));
    function tOut(){
      if(false){
        const wrong=order.filter(oi=>oi!==ans);
        if(wrong.length>=2){
          hintUsed=true;
          wrong.slice(0,2).forEach(oi=>{const b=$$('.opt',mBody).find(x=>+x.dataset.i===oi); if(b){b.disabled=true;b.style.opacity=.25;b.style.textDecoration='line-through';}});
          const f=$('#fb'); if(f){f.className='fb ok';f.textContent='Süre doldu — ipucu: 2 şık elendi, +5 sn';}
          start=performance.now()-10000;
          const bar2=$('#bar'); if(bar2){bar2.style.transition='none';bar2.style.transform='scaleX(1)';requestAnimationFrame(()=>requestAnimationFrame(()=>{bar2.style.transition='transform 5s linear';bar2.style.transform='scaleX(0)';}));}
          SFX.play('reveal'); return;
        }
      }
      pick(-1);
    }
    function pick(i){
      if(done) return; done=true; clearInterval(iv);
      const el=(performance.now()-start)/1000; bar.style.transition='none';
      $$('.opt',mBody).forEach(b=>{b.disabled=true; const v=+b.dataset.i; if(v===ans) b.classList.add('right'); else if(v===i) b.classList.add('wrong');});
      const fb=$('#fb');
      if(i===ans){const p=Math.round(50+Math.max(0,15-el)/15*50); score+=p; SFX.play('correct'); buzz([16,40,16]); fb.className='fb ok'; fb.textContent=`Doğru. +${p} puan`; burst();}
      else{SFX.play('wrong'); buzz(60); score=Math.max(-400,score-Math.round(_qm*.4)); fb.className='fb no'; fb.textContent=(i===-1?'Süre doldu — ':'Yanlış — ')+`−${Math.round(_qm*.4)} puan`;}
      setTimeout(()=>{qi++; qi<qs.length?q():onEnd(qMax?Math.round(score/qMax*1000):0);},1400);
    }
  }
  q();
}
/* ---------- Online quiz (PeerJS) ---------- */
const QZ=(()=>{ let peer=null,conn=null,conns={},players=[],res={},qs=null,tmr=null,started=false,isHost=false,code=null,phase='menu';
  const nm=()=>(AUTH.user&&(AUTH.user.display||AUTH.user.username))||'Misafir';
  const st=t=>{ const e=$('#qzSt'); if(e) e.textContent=t; };
  function reset(){ try{conn&&conn.close();}catch(e){} try{peer&&peer.destroy();}catch(e){} peer=null;conn=null;conns={};players=[];res={};qs=null;started=false;isHost=false;code=null;phase='menu'; clearTimeout(tmr); }
  function lobbyHTML(mid){
    return `<div class="ghud mono"><span>🌐 Online Yarış</span><span>${players.length} oyuncu</span></div>
      ${mid}
      <div class="opts" style="grid-template-columns:1fr">${players.map((p,i)=>`<div class="opt" style="cursor:default;display:flex;gap:10px;align-items:center"><span class="mono">${i+1}.</span><span style="flex:1;text-align:left">${esc(p.name)}${p.host?' 👑':''}</span></div>`).join('')||'<p class="dim">Oyuncu bekleniyor…</p>'}</div>
      <div class="fb" id="qzSt"></div>`;
  }
  function draw(){
    if(isHost) swap(lobbyHTML(`<div class="q" style="text-align:center;font-size:24px;letter-spacing:5px">${code}</div><p class="dim" style="text-align:center">Bu kodu arkadaşlarına ver, sonra zorluğu seç</p>
      <div class="opts" style="grid-template-columns:1fr 1fr 1fr 1fr">${[[1,'KOLAY'],[2,'ORTA'],[3,'ZOR'],['mix','KARIŞIK']].map(([d,t])=>`<button class="opt" type="button" data-hd="${d}"><span class="mono">${d==='mix'?'★':d}</span>${t}</button>`).join('')}</div>`));
    else swap(lobbyHTML(`<p class="q" style="text-align:center">Odaya bağlanıldı, host bekliyor…</p>`));
    const bk=$('#qzBack'); if(bk) bk.onclick=()=>{ SFX.play('click'); reset(); startQuiz(); };
    $$('[data-hd]',mBody).forEach(b=>b.onclick=()=>{ SFX.play('click'); hostStart(b.dataset.hd); });
  }
  function host(){
    reset(); isHost=true; phase='lobby'; let tries=0;
    const mk=()=>{ code='QZ'+Math.random().toString(36).slice(2,6).toUpperCase(); peer=new Peer('mtrq-'+code); wire(); };
    mk();
    function wire(){
      peer.on('open',()=>{ players=[{id:peer.id,name:nm(),host:true}]; draw(); });
      peer.on('connection',c=>{ conns[c.peer]=c; c.on('data',m=>onMsg(c,m)); c.on('close',()=>{ delete conns[c.peer]; players=players.filter(p=>p.id!==c.peer); if(phase==='lobby') draw(); }); });
      peer.on('error',e=>{ if(e.type==='unavailable-id'&&tries++<5){ try{peer.destroy();}catch(_){} mk(); } else st('Bağlantı hatası: '+e.type); });
    }
    function onMsg(c,m){
      if(m.e==='hello'){ if(!players.find(p=>p.id===c.peer)){ players.push({id:c.peer,name:String(m.name||'Oyuncu').slice(0,18),host:false}); c.send({e:'lobby',players,code}); if(phase==='lobby') draw(); } }
      else if(m.e==='res'){ res[c.peer]={name:m.name,score:m.score}; checkEnd(); }
    }
  }
  function joinAsk(){
    reset(); isHost=false; phase='join';
    swap(`<div class="ghud mono"><span>🔗 Odaya katıl</span></div>
      <p class="q" style="text-align:center">Host'un verdiği kodu yaz:</p>
      <div class="opts"><input id="qzCode" maxlength="8" placeholder="QZ1234" style="text-align:center;font-size:22px;letter-spacing:3px;text-transform:uppercase"></div>
      <div class="opts" style="grid-template-columns:1fr"><button class="opt" type="button" id="qzGo">KATIL</button></div>
      <div class="fb" id="qzSt"></div>`);
    $('#qzGo').onclick=()=>{ const c=$('#qzCode').value.trim().toUpperCase(); if(!c){st('Kod gerekli');return;} SFX.play('click'); join(c); };
  }
  function join(c){
    phase='guestwait';
    peer=new Peer();
    peer.on('open',()=>{
      conn=peer.connect('mtrq-'+c,{reliable:true});
      conn.on('open',()=>{ conn.send({e:'hello',name:nm()}); });
      conn.on('data',m=>{
        if(m.e==='lobby'){ players=m.players||[]; draw(); }
        else if(m.e==='go'){ qs=m.qs; started=true; phase='playing'; playQs(); }
        else if(m.e==='end'){ phase='done'; showBoard(m.board||[]); }
      });
      conn.on('close',()=>{ if(phase!=='done') st('Bağlantı koptu'); });
    });
    peer.on('error',e=>st('Bağlantı hatası: '+e.type));
  }
  function hostStart(d){
    if(!isHost||started) return;
    qs=pickQuiz(d==='mix'?'mix':d); started=true; phase='playing';
    Object.values(conns).forEach(c=>{ try{c.send({e:'go',qs});}catch(e){} });
    playQs();
    tmr=setTimeout(endNow,120000);
  }
  function playQs(){
    runQuiz(qs,sc=>{
      if(isHost){ res['host']={name:nm(),score:sc}; checkEnd(); }
      else if(conn&&conn.open){ try{conn.send({e:'res',name:nm(),score:sc});}catch(e){} }
      phase='done-wait'; gameDone(); showWaiting();
    });
  }
  function showWaiting(){
    swap(`<div class="ghud mono"><span>🌐 Online Yarış</span></div>
      <div class="end"><span class="mono dim">Cevapın kaydedildi</span><div class="big">⏳</div><p>Diğer oyuncular bekleniyor…</p></div>
      <div class="fb" id="qzSt"></div>`);
  }
  function checkEnd(){
    if(!isHost||phase!=='playing') return;
    const need=Math.max(0,players.length-1);
    const guestRes=Object.keys(res).length-1; // host kendi res'i hariç
    if(guestRes>=need) endNow();
  }
  function endNow(){
    if(phase==='ended') return; phase='ended'; clearTimeout(tmr);
    const board=Object.values(res).sort((a,b)=>b.score-a.score).slice(0,8);
    Object.values(conns).forEach(c=>{ try{c.send({e:'end',board});}catch(e){} });
    showBoard(board);
  }
  function showBoard(b){
    const medals=['🥇','🥈','🥉'];
    swap(`<div class="ghud mono"><span>🌐 Sonuçlar</span></div>
      <div class="opts" style="grid-template-columns:1fr">${b.map((p,i)=>`<div class="opt" style="cursor:default;display:flex;gap:10px;align-items:center"><span style="font-size:20px">${medals[i]||`<span class="mono">${i+1}.</span>`}</span><span style="flex:1;text-align:left">${esc(p.name)}</span><b class="mono" style="color:var(--gold)">${p.score}</b></div>`).join('')||'<p class="dim">Sonuç yok</p>'}</div>
      <div class="opts" style="grid-template-columns:1fr 1fr;margin-top:12px"><button class="opt" type="button" id="qzMenu">ANA MENÜ</button><button class="opt" type="button" id="qzClose">KAPAT</button></div>`);
    $('#qzMenu').onclick=()=>{ SFX.play('click'); reset(); startQuiz(); };
    $('#qzClose').onclick=()=>{ SFX.play('click'); reset(); closeModal(); };
  }
  return {host,joinAsk,reset};
})();

function finish(id,name,score,max){
  gameDone(); score=Math.max(-300,Math.round(score||0)); // yanlışlar eksi yazar, en fazla −300
  cleanup&&cleanup(); cleanup=null; SFX.play('win'); buzz([24,50,24,50,80]);
  submitScore(id,score);
  const who=AUTH.user?esc(AUTH.user.display||AUTH.user.username):null;
  swap(`<div class="end"><span class="mono dim">${name} · Bitti</span><div class="big" id="final">0</div><p>puan${who?` · ${who} hesabına yazıldı`:''}</p>
    ${who?'':'<p style="font-size:14px">Puanın sıralamaya girsin istiyorsan Micup ile giriş yap.</p>'}
    <div class="rowb"><button class="btn p" id="again" type="button" style="height:50px"><span class="bl"><span>Tekrar oyna</span><span>Tekrar oyna</span></span></button>${who?'<a class="btn g" href="#siralama" data-go="siralama" style="height:50px"><span class="bl"><span>Sıralama</span><span>Sıralama</span></span></a>':'<button class="btn g" id="lgn" type="button" style="height:50px"><span class="bl"><span>Giriş yap</span><span>Giriş yap</span></span></button>'}</div></div>`);
  const f=$('#final'); if(G&&!reduce){const o={v:0}; G.to(o,{v:score,duration:1.6,ease:'expo.out',onUpdate:()=>f.textContent=Math.round(o.v)});} else f.textContent=score;
  $('#again').onclick=()=>{({guess:startGuess,quiz:startQuiz,hl:startHL,mem:startMemory,real:startReal}[id]||startGuess)();};
  const l=$('#lgn'); if(l) l.onclick=openLogin;
  if(score>=max*.6) setTimeout(()=>toast('Güçlü skor','Sezon sonunda ilk 3\'e girersen şampiyon çerçevesini kazanırsın.'),900);
  burst(true);
}
function burst(big){ if(MTSET.fx===false) return;
  if(reduce||!G) return;
  const r=mbox.getBoundingClientRect(), n=big?36:18;
  for(let i=0;i<n;i++){
    const s=document.createElement('i'); const c=['#E7B24B','#E3283D','#EEEAE2'][i%3]; const w=Math.random()<.5?2:6;
    s.style.cssText=`position:fixed;z-index:95;left:${r.left+r.width/2}px;top:${r.top+r.height*.45}px;width:${w}px;height:${w===2?14:6}px;background:${c};pointer-events:none`;
    document.body.appendChild(s);
    G.to(s,{x:(Math.random()-.5)*(big?620:380),y:(Math.random()-.75)*(big?460:300),rotation:Math.random()*540,opacity:0,duration:1.1+Math.random()*.7,ease:'expo.out',onComplete:()=>s.remove()});
  }
}

/* ========================= DÜELLO: Yüksek mi Düşük online 1v1 =========================
   Host desteyi karıştırıp iki tarafa da aynı sırayla gönderir. İlk 12 doğru cevaplayan kazanır.
   Yanlış cevap = elenme (izlemeye devam edersin); iki taraf da elenirse çok doğru yapan kazanır. */
const DUEL=(()=>{
  const D={peer:null,conn:null,host:false,id:null,code:null,deck:null,pos:0,cur:null,nxt:null,score:0,bust:false,over:true,qn:10,
    opp:{id:null,name:'Rakip',n:0,bust:false}};
  const WIN=12;
  const myName=()=>AUTH.user?(AUTH.user.display||AUTH.user.username):(localStorage.getItem('mt_name')||'Oyuncu');
  const randCode=()=>Array.from({length:5},()=>'ABCDEFGHJKLMNPRSTUVYZ23456789'[Math.random()*29|0]).join('');
  const peerOk=()=>typeof window.Peer==='function';
  function leave(silent){ try{D.conn&&D.conn.close()}catch(e){} try{D.peer&&D.peer.destroy()}catch(e){} D.peer=D.conn=null; D.deck=null; D.over=true; if(!silent) menu(); }
  function menu(){
    leave(true); D.over=true;
    openModal('Düello · Yüksek mi Düşük');
    swap(`<div class="duel"><p class="dim" style="margin:0">Aynı deste iki oyuncuya da gider. <b>İlk ${D.qn} doğru cevaplayan</b> kazanır. Yanlış cevap elenmektir; ikiniz de elenirseniz çok doğru yapan kazanır.</p>
      ${AUTH.user?'':`<label class="mono dim" for="dName">Oyuncu adın</label><input class="field" id="dName" maxlength="18" placeholder="Adını yaz" value="${esc(localStorage.getItem('mt_name')||'')}" autocomplete="off">`}
      <div class="opts" style="grid-template-columns:1fr"><button class="opt" id="dCreate" type="button"><span class="mono">01</span>Oda kur<span class="dim" style="display:block;font-size:12px;font-weight:400;margin-top:4px">5 haneli kod çıkar, arkadaşın girer</span></button>
      <button class="opt" id="dJoin" type="button"><span class="mono">02</span>Koda katıl<span class="dim" style="display:block;font-size:12px;font-weight:400;margin-top:4px">Arkadaşının verdiği kodu yaz</span></button></div>
      <div class="opts" style="grid-template-columns:1fr 1fr;margin-top:10px"><button class="opt" id="dQ5" type="button" style="opacity:.75"><span class="mono">5</span>5 SORU</button><button class="opt" id="dQ10" type="button" style="outline:2px solid var(--gold)"><span class="mono">10</span>10 SORU</button></div>
      ${peerOk()?'':'<p class="dim" style="margin:0;font-size:13px">Bağlantı kütüphanesi yüklenemedi, interneti kontrol et.</p>'}</div>`);
    $('#dQ5')&&($('#dQ5').onclick=()=>{D.qn=5;SFX.play('click');$('#dQ5').style.outline='2px solid var(--gold)';$('#dQ10').style.outline='';});
    $('#dQ10')&&($('#dQ10').onclick=()=>{D.qn=10;SFX.play('click');$('#dQ10').style.outline='2px solid var(--gold)';$('#dQ5').style.outline='';});
    $('#dCreate').onclick=()=>{ if(!(FB.ready&&FB.user)) return openLogin(); const n=name(); if(!n) return nudge(); if(!peerOk()) return toast('Açılamadı','Bağlantı kütüphanesi yüklenemedi.'); create(n); };
    $('#dJoin').onclick=()=>{ if(!(FB.ready&&FB.user)) return openLogin(); const n=name(); if(!n) return nudge(); joinForm(n); };
  }
  const name=()=>AUTH.user?myName():($('#dName')?.value||'').trim();
  function nudge(){ const f=$('#dName'); if(f){f.focus(); G.fromTo(f,{x:-8},{x:0,duration:.5,ease:'elastic.out(1,.3)'}); SFX.play('wrong');} }
  function waiting(code){
    swap(`<div class="duel"><span class="ocode">Rakip kodu</span><div class="code">${code}</div><p class="dim" style="margin:0;text-align:center">Bu kodu arkadaşına gönder. Katılınca oyun otomatik başlar.</p><div class="rowb" style="justify-content:center"><button class="ghost" id="dCancel" type="button">İptal</button></div></div>`);
    $('#dCancel').onclick=()=>{leave();};
  }
  function joinForm(n){
    swap(`<div class="duel"><span class="ocode">Düello</span><h3 style="margin:0;text-align:center">Kodu yaz</h3>
      <form class="guess" id="df"><label for="dCode" style="position:absolute;left:-9999px">Oda kodu</label><input class="field code-in" id="dCode" maxlength="5" placeholder="ABCDE" autocomplete="off" style="text-transform:uppercase"><button class="btn p" type="submit"><span class="bl"><span>Katıl</span><span>Katıl</span></span></button></form>
      <div class="rowb" style="justify-content:center"><button class="ghost" id="dBack" type="button">Geri</button></div></div>`);
    $('#dCode').focus(); $('#dBack').onclick=menu;
    $('#df').onsubmit=e=>{e.preventDefault(); const c=$('#dCode').value.trim().toUpperCase(); if(c.length!==5) return; join(n,c);};
  }
  function create(n){
    leave(true); D.host=true; D.code=randCode(); D.id=null; D.opp={id:null,name:'Rakip',n:0,bust:false};
    waiting(D.code); cleanup=()=>leave(true);
    const peer=new Peer('mduel-'+D.code.toLowerCase()); D.peer=peer;
    peer.on('open',id=>{ D.id=id; });
    peer.on('connection',c=>{ c.on('open',()=>{ D.conn=c; }); c.on('data',d=>onData(d,c.peer));
      c.on('close',()=>{ if(D.conn===c){ toast('Rakip ayrıldı','Düello iptal edildi.'); leave(); } }); });
    peer.on('error',err=>{ if(err.type==='unavailable-id'){ peer.destroy(); create(n); } else toast('Bağlantı hatası',String(err.type||err)); });
  }
  function join(n,code){
    leave(true); D.host=false; D.code=code; D.id=null; D.opp={id:null,name:'Rakip',n:0,bust:false};
    swap(`<div class="duel"><span class="mono dim">Odaya bağlanılıyor…</span></div>`); cleanup=()=>leave(true);
    const peer=new Peer(); D.peer=peer;
    peer.on('open',id=>{ D.id=id; const c=peer.connect('mduel-'+code.toLowerCase(),{reliable:true}); D.conn=c;
      c.on('open',()=>{ c.send({t:'hello',name:n}); SFX.sfx('join'); });
      c.on('data',d=>onData(d));
      c.on('close',()=>{ if(D.conn===c){ toast('Bağlantı koptu','Oda kapandı ya da internetin gitti.'); leave(); } }); });
    peer.on('error',err=>{ toast(err.type==='peer-unavailable'?'Oda bulunamadı':'Bağlantı hatası',err.type==='peer-unavailable'?'Kodu kontrol et, host hâlâ açık mı?':String(err.type||err)); leave(); });
  }
  function send(m){ D.conn&&D.conn.open&&D.conn.send(m); }
  function onData(d,peer){
    if(d.t==='hello'){ D.opp.name=String(d.name||'Rakip').slice(0,18);
      if(D.host){ D.opp.id=peer; const ids=shuffle(HEROES_CG.map(h=>h.id)); D.deck=ids; send({t:'deck',ids,qn:D.qn}); send({t:'opp',name:myName()}); startGame(); }
      return; }
    if(d.t==='opp'){ D.opp.name=String(d.name||'Rakip').slice(0,18); return; }
    if(d.t==='deck'){ if(d.ids) D.deck=d.ids; if(d.qn) D.qn=d.qn; startGame(); return; }
    if(d.t==='p'||d.t==='b'){ D.opp.n=d.n|0; D.opp.bust=d.t==='b'; updOpp(); if(D.host) hostEndCheck(); return; }
    if(d.t==='end'){ finishDuel(d); return; }
  }
  function startGame(){ armGame('hl',50);
    D.pos=0; D.cur=null; D.nxt=null; D.score=0; D.bust=false; D.over=false; D.opp.n=0; D.opp.bust=false;
    cleanup=()=>leave(true);
    next();
  }
  function next(){
    if(D.over||!D.deck) return;
    if(D.pos>=D.deck.length){ D.deck=D.deck.slice().reverse(); D.pos=0; }
    if(D.cur==null) D.cur=D.deck[D.pos++];
    D.nxt=D.deck[D.pos++];
    const st=D.pos%5, a=HERO_BY[D.cur], b=HERO_BY[D.nxt];
    swap(`<div class="ghud mono"><span>Doğru <b>${D.score}</b>/${D.qn||10}</span><span>Özellik <b>${STATS[st]}</b></span><span class="dim">${esc(D.opp.name||'Rakip')}${D.bust?' · elendi, izliyorsun':''}</span></div>
      <div class="oppbar"><div class="ob"><span>${esc(D.opp.name||'Rakip')}</span><span id="oppN">${D.opp.n} doğru</span></div><div class="obar"><i id="oppBar"></i></div></div>
      <div class="hl2${D.bust?' hlbust':''}"><div class="hlc"><img src="${cardFace(a)}" alt="${esc(a.ad)}"></div><div class="hlq"><b>${esc(b.ad)}</b><span class="mono dim">${STATS[st]} değeri ${esc(a.ad)}'dan</span>
      <div class="rowb" style="flex-direction:column"><button class="btn p" id="hlUp" type="button"><span class="bl"><span>Yüksek ↑</span><span>Yüksek ↑</span></span></button><button class="btn g" id="hlDn" type="button"><span class="bl"><span>Düşük ↓</span><span>Düşük ↓</span></span></button></div></div>
      <div class="hlc back" id="hlNext"><div class="hcflip"><div class="f">${CARD_BACK_HTML}</div><div class="b"><img src="${cardFace(b)}" alt=""></div></div></div></div><div class="fb" id="fb"></div>`);
    updOpp();
    const go=up=>{ if(D.over||D.bust) return; const ok=up?b.s[st]>=a.s[st]:b.s[st]<=a.s[st]; SFX.sfx('flip'); G.to('#hlNext .hcflip',{rotationY:180,duration:.6,ease:'power3.inOut'});
      setTimeout(()=>{ const fb=$('#fb');
        if(ok){ D.score++; SFX.play('correct'); buzz([16,40,16]); fb.className='fb ok'; fb.textContent=`Doğru: ${b.s[st]} — ${a.s[st]} · ${D.score}/${D.qn||10}`; burst(); send({t:'p',n:D.score}); D.cur=D.nxt; if(D.host) hostEndCheck(); setTimeout(next,1100); }
        else { D.bust=true; SFX.play('wrong'); buzz(60); fb.className='fb no'; fb.textContent=`Yanlış: ${b.ad} ${b.s[st]}, ${a.ad} ${a.s[st]} — elendin`; send({t:'b',n:D.score}); $$('.hl2',mBody).forEach(x=>x.classList.add('hlbust')); if(D.host) hostEndCheck(); setTimeout(()=>{ D.cur=D.nxt; next(); },1600); }
      },650); };
    $('#hlUp').onclick=()=>go(true); $('#hlDn').onclick=()=>go(false);
  }
  function updOpp(){ const n=$('#oppN'), b=$('#oppBar'); if(n) n.textContent=D.opp.n+' doğru'+(D.opp.bust?' · elendi':''); if(b) b.style.width=Math.min(100,D.opp.n/(D.qn||10)*100)+'%'; }
  function hostEndCheck(){ // bitiş kararını yalnız host verir
    if(!D.host||D.over) return;
    const meWin=D.score>=(D.qn||10), opWin=D.opp.n>=(D.qn||10), bothOut=D.bust&&D.opp.bust;
    if(!meWin&&!opWin&&!bothOut) return;
    D.over=true; let win=null;
    if(meWin&&opWin) win=D.score===D.opp.n?null:(D.score>D.opp.n?D.id:D.opp.id);
    else if(meWin) win=D.id; else if(opWin) win=D.opp.id;
    else win=D.score===D.opp.n?null:(D.score>D.opp.n?D.id:D.opp.id);
    send({t:'end',win,mine:D.score,opp:D.opp.n,mid:D.id,oid:D.opp.id});
    finishDuel({win,mine:D.score,opp:D.opp.n,mid:D.id,oid:D.opp.id});
  }
  function finishDuel(d){
    D.over=true; cleanup=()=>leave(true);
    const iWon=d.win===D.id, draw=!d.win;
    const myN=d.mid===D.id?d.mine:d.opp, opN=d.mid===D.id?d.opp:d.mine;
    const myPts=iWon?500:(draw?250:0); gameDone();
    submitScore('hl',Math.max(-300,myPts));try{const _s=prog();_s.st=_s.st||{};_s.st.won=_s.st.won||{};_s.st.won.hl=(_s.st.won.hl||0)+(iWon?1:0);saveProg(_s);}catch(e){};
    const opName=esc(D.opp.name||'Rakip');
    swap(`<div class="end"><span class="mono dim">Düello · bitti</span><b style="color:${iWon?'var(--gold)':draw?'var(--fg)':'var(--red)'}">${iWon?'Kazandın!':draw?'Berabere':'Kaybettin'}</b>
      <div class="duel" style="text-align:center">
      <div class="ob" style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)"><span>${opName}</span><span>${opN} doğru</span></div>
      <div class="ob" style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)"><span>Sen</span><span>${myN} doğru</span></div></div>
      <p class="dim" style="margin:0">+${myPts} puan sıralamaya yazıldı</p>
      <div class="rowb"><button class="btn p" id="dAgain" type="button" style="height:50px"><span class="bl"><span>Yeni düello</span><span>Yeni düello</span></span></button><button class="ghost" id="dShr" type="button" style="height:50px">📤 Paylaş</button><button class="btn g" id="dClose" type="button" style="height:50px"><span class="bl"><span>Kapat</span><span>Kapat</span></span></button></div></div>`);
    $('#dAgain').onclick=()=>menu(); $('#dClose').onclick=()=>closeModal(); const _ds=$('#dShr'); _ds&&(_ds.onclick=()=>window.shareResult&&shareResult({title:'Düello · Yüksek mi Düşük',win:iWon,badge:iWon?'🏆 DÜELLO ŞAMPİYONU!':draw?'🤝 BERABERE':'MAÇ BİTTİ',rows:[{name:opName,n:opN},{name:'Sen',n:myN,me:true}]}));
    SFX.play(iWon?'win':'lose'); if(iWon){SFX.sfx('intro',{vol:.4}); burst(true);}
  }
  return {open:menu,leave};
})();

/* ========================= Sezon geri sayımı (Pazar 23:59, İstanbul) ========================= */
function seasonEnd(){const now=new Date(); const t=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),20,59,59)); // 23:59:59 TR = 20:59:59 UTC
  let add=(7-t.getUTCDay())%7; t.setUTCDate(t.getUTCDate()+add); if(t<=now) t.setUTCDate(t.getUTCDate()+7); return t;}
function tickCd(){
  const ms=seasonEnd()-new Date(); const d=Math.floor(ms/864e5), h=Math.floor(ms/36e5)%24, m=Math.floor(ms/6e4)%60, s=Math.floor(ms/1e3)%60;
  const p=n=>String(n).padStart(2,'0'); const b=$$('#cd b'); b[0].textContent=d; b[1].textContent=p(h); b[2].textContent=p(m); b[3].textContent=p(s);
  { const w=Math.max(0,(window.weekEnd?weekEnd():seasonEnd())-new Date()), wd=Math.floor(w/864e5), wh=Math.floor(w/36e5)%24, wm=Math.floor(w/6e4)%60; $('#hCd').innerHTML=`${wd}<small>g</small> ${p(wh)}<small>s</small> ${p(wm)}<small>d</small>`; }
}
tickCd(); setInterval(tickCd,1000);



/* =====================================================================
   KAHRAMAN KARTLARI — 2-4 oyuncu, online oda (PeerJS) veya botlarla.
   Kural: Turun lideri kartını ve özelliğini seçer. Diğerleri sırayla kart atar.
   Kartlar açılır, o özellikte en yüksek olan ortadaki tüm kartları alır. Berabere → kartlar ortada kalır.
   Kartı bitmeyen son oyuncu kazanır. Her maçta ilk turu başlatan oyuncu sırayla değişir.
   ===================================================================== */
const STATS=['GÜÇ','HIZ','ZEKA','DAYANIKLILIK','ENERJİ'];
const RAR={b:['BRONZ','#C8834A'],g:['GÜMÜŞ','#D5DAE4'],a:['ALTIN','#FFB627'],e:['EFSANE','#FF3B4E']};
const HEROES_CG=[
 ['ironman','Iron Man','#FFB627','beam','a',[72,80,96,70,82],'VUUM!'],
 ['thor','Thor','#5AB4FF','thunder','e',[94,78,58,88,82],'KRAKA-BUM!'],
 ['hulk','Hulk','#3DDC97','smash','a',[99,64,48,98,81],'GÜM!'],
 ['spider','Spider-Man','#FF3B4E','web','g',[66,94,86,70,74],'FIŞŞ!'],
 ['strange','Doctor Strange','#FF8A3D','portal','a',[55,68,93,70,98],'VORP!'],
 ['cap','Kaptan Amerika','#4A7BFF','shield','g',[78,76,82,90,62],'KLANG!'],
 ['panther','Black Panther','#9B6BFF','slash','g',[80,90,84,82,64],'ŞRAK!'],
 ['wanda','Scarlet Witch','#FF2E63','magic','e',[58,70,82,70,99],'VİUUU!'],
 ['loki','Loki','#6BE36B','magic','g',[60,74,96,64,90],'PUF!'],
 ['thanos','Thanos','#B06BFF','cosmic','e',[97,60,86,96,58],'ÇAT!'],
 ['widow','Black Widow','#FF5A5A','zap','b',[62,92,88,66,72],'ZZZT!'],
 ['cmarvel','Kaptan Marvel','#FFD34A','beam','e',[86,92,66,78,78],'FUUŞ!'],
 ['wolverine','Wolverine','#FFD000','slash','a',[84,78,60,99,66],'SNİKT!'],
 ['deadpool','Deadpool','#E5262E','slash','g',[72,84,64,98,70],'ŞLAK!'],
 ['vision','Vision','#FFCF3D','beam','a',[78,74,94,82,66],'ZİİNG!'],
 ['antman','Ant-Man','#FF4D4D','portal','b',[60,84,84,64,90],'ZIPP!'],
 ['hawkeye','Hawkeye','#8A5CFF','arrow','b',[64,86,88,70,72],'TAK!'],
 ['starlord','Star-Lord','#FF7A2E','zap','b',[66,80,76,72,86],'PİV PİV!'],
 ['rocket','Rocket','#FF9E3D','boom','g',[52,86,97,58,88],'KABUM!'],
 ['groot','Groot','#8BD45A','smash','g',[92,44,50,99,90],'KRRAK!'],
 ['storm','Storm','#BFE3FF','thunder','a',[62,84,80,68,98],'ÇATIRT!'],
 ['ghostrider','Ghost Rider','#FF6A00','fire','a',[90,88,56,94,70],'FUOOŞ!'],
 ['magneto','Magneto','#C43BFF','cosmic','a',[68,62,92,70,99],'VUMMM!'],
 ['shangchi','Shang-Chi','#FF3B4E','boom','g',[80,96,80,82,62],'BAM!'],
 ['venom','Venom','#3A3A55','web','a',[90,82,54,92,72],'SLURP!'],
 ['ultron','Ultron','#C9CED8','beam','e',[86,74,95,90,52],'BZZZT!'],
 ['falcon','Falcon','#E5262E','arrow','b',[62,96,74,66,78],'FŞŞŞ!'],
 ['bucky','Winter Soldier','#6F86A8','zap','g',[84,80,70,88,62],'KRAK!'],
 ['gamora','Gamora','#3DDC97','slash','g',[76,90,78,80,64],'ŞİNG!'],
 ['drax','Drax','#7A8C9A','smash','b',[90,60,40,94,80],'GÜM!'],
 ['mantis','Mantis','#9FE870','magic','b',[44,66,82,60,96],'HUŞŞ!'],
 ['shuri','Shuri','#B06BFF','beam','g',[56,74,99,62,90],'ZAP!'],
 ['shehulk','She-Hulk','#2FBF71','smash','g',[95,66,82,92,58],'BAM!'],
 ['moonknight','Moon Knight','#E8E8F0','slash','g',[78,84,70,90,72],'ŞAK!'],
 ['msmarvel','Ms. Marvel','#FF3B4E','boom','b',[72,80,76,74,92],'POW!'],
 ['surfer','Silver Surfer','#D5DAE4','cosmic','e',[84,98,72,86,58],'VIUŞ!'],
 ['nickfury','Nick Fury','#3A3A55','zap','g',[60,70,97,72,64],'KLİK!'],
 ['nebula','Nebula','#5A7BC4','slash','g',[74,82,80,88,66],'ŞİNK!'],
 ['hela','Hela','#2FBF71','slash','e',[94,80,82,96,92],'ŞRAK-ŞRAK!'],
 ['valkyrie','Valkyrie','#D5DAE4','slash','g',[82,84,70,84,66],'HİYAA!'],
 ['okoye','Okoye','#E5262E','arrow','g',[76,90,80,82,60],'ŞVUT!'],
 ['killmonger','Killmonger','#C9A227','slash','a',[84,86,88,84,66],'ŞRAK!'],
 ['warmachine','War Machine','#7A8C9A','boom','g',[82,72,74,90,80],'RA-TA-TA!'],
 ['wasp','Wasp','#FFD000','zap','b',[56,96,82,60,80],'BZZT!'],
 ['yelena','Yelena','#E8E8F0','zap','b',[62,88,82,70,64],'TAK!'],
 ['katebishop','Kate Bishop','#9B5CFF','arrow','b',[54,84,84,62,70],'FİUV!'],
 ['yondu','Yondu','#4A7BFF','arrow','g',[60,82,72,76,84],'FİÜÜÜT!'],
 ['wong','Wong','#FF8A3D','portal','g',[66,62,86,80,92],'VUMP!'],
 ['daredevil','Daredevil','#B5121B','slash','g',[74,90,86,86,62],'PAT!'],
 ['punisher','Punisher','#3A3A55','boom','b',[78,74,78,90,58],'BANG!'],
 ['blade','Blade','#2A2A3A','slash','a',[84,90,78,92,70],'ŞAK!'],
 ['cyclops','Cyclops','#E5262E','beam','g',[64,74,84,72,94],'ZAAAP!'],
 ['phoenix','Phoenix','#FF6A00','fire','e',[90,80,88,84,99],'FUAAAŞ!'],
 ['profx','Profesör X','#9B6BFF','magic','a',[40,40,99,60,98],'HMMM!'],
 ['gambit','Gambit','#FF3B9A','zap','g',[62,86,80,70,86],'BOOM!'],
 ['rogue','Rogue','#3DDC97','smash','g',[84,80,70,90,80],'ŞAP!'],
 ['beast','Beast','#4A7BFF','smash','b',[86,82,94,84,58],'GRAAH!'],
 ['iceman','Iceman','#BFE3FF','beam','b',[60,78,72,74,90],'KRİSS!'],
 ['adamwarlock','Adam Warlock','#FFB627','cosmic','a',[84,82,74,88,92],'VUUŞ!'],
 ['mysterio','Mysterio','#3DDC97','magic','b',[48,66,92,58,84],'PUF!'],
 ['goblin','Green Goblin','#5BAA2E','boom','a',[80,84,90,82,70],'HA-HA-HA!'],
 ['docock','Doctor Octopus','#6B8E23','smash','a',[86,62,96,84,70],'KLANK!'],
 ['redskull','Red Skull','#B5121B','cosmic','a',[74,66,88,76,72],'HAİL!'],
 ['kang','Kang','#6BE36B','portal','e',[78,80,98,84,90],'ZAMAN!'],
 ['doom','Doctor Doom','#2E7D32','magic','e',[86,64,99,94,96],'DOOM!'],
 ['dormammu','Dormammu','#FF4D00','fire','e',[96,60,84,99,99],'PAZARLIK!'],
 ['galactus','Galactus','#7A3CFF','cosmic','e',[99,40,90,99,99],'YUTARIM!'],
 /* ---- v9 yeni kartlar ---- */
 ['miles','Miles Morales','#E5262E','web','g',[70,95,84,68,80],'ZİP!'],
 ['gwen','Spider-Gwen','#FF6FA5','web','a',[66,92,80,70,78],'FİŞŞ!'],
 ['america','America Chavez','#FFD34A','portal','a',[74,80,88,78,90],'YILDIZ!'],
 ['echo','Echo','#3DDC97','slash','g',[78,74,70,88,72],'ŞAK!'],
 ['elektra','Elektra','#C43BFF','slash','a',[70,88,76,80,74],'ŞRAK!'],
 ['luke','Luke Cage','#FFD000','smash','g',[92,70,66,95,70],'GÜM!'],
 ['jessica','Jessica Jones','#4A7BFF','zap','b',[58,86,88,66,78],'BZZT!'],
 ['ironfist','Iron Fist','#FF6A00','fire','a',[80,90,78,86,68],'ŞAK!'],
 ['maria','Maria Hill','#C9CED8','arrow','b',[62,84,92,70,66],'FİİT!'],
 ['emma','Emma Frost','#BFE3FF','magic','a',[50,60,95,72,90],'KRİSTAL!'],
 ['colossus','Colossus','#4A7BFF','smash','g',[90,68,60,96,74],'GÜM!'],
 ['nightcrawler','Nightcrawler','#3DDC97','portal','g',[72,86,78,82,84],'POOF!'],
 ['magik','Magik','#B06BFF','magic','g',[68,74,90,74,88],'LİMİT!'],
 ['mystique','Mystique','#3A3A55','magic','g',[64,80,86,78,86],'ŞAŞ!'],
 ['lizard','Lizard','#8BD45A','smash','a',[88,72,54,94,78],'GÜM!'],
 ['moleman','Mole Man','#C9A227','smash','b',[86,50,44,98,82],'GÜM!'],
 ['carnage','Carnage','#E5262E','slash','a',[86,84,60,90,72],'ŞRAK!'],
 ['kingpin','Kingpin','#2E2E3A','cosmic','a',[80,62,90,82,70],'GÜÇ!'],
 ['electro','Electro','#5AB4FF','zap','a',[56,80,94,62,96],'VUMM!'],
 ['apocalypse','Apocalypse','#7A3CFF','smash','e',[95,78,80,98,90],'ÇAT!'],
 ['nova','Nova','#4A7BFF','beam','a',[82,88,70,66,92],'FİİT!'],
 ['ego','Ego','#B06BFF','cosmic','e',[96,55,80,95,60],'VUMMM!'],
 ['karnak','Karnak','#FFD34A','smash','g',[70,85,72,80,60],'KRAK!'],
 ['sersi','Sersi','#7B5CFF','magic','g',[62,78,80,74,88],'FŞŞŞ!'],
 ['druig','Druig','#6BE36B','magic','g',[55,80,85,68,90],'HUŞŞ!'],
 ['phastos','Phastos','#FF8A3D','fire','a',[75,70,82,72,95],'VORP!'],
 ['blackknight','Black Knight','#D5DAE4','slash','a',[88,72,60,90,58],'ŞAK!'],
 ['cersei','Cersei','#FF2E63','magic','g',[60,75,78,70,86],'FŞŞŞ!'],
 ['eros','Eros','#FF5A5A','zap','g',[68,82,70,64,80],'ZAP!'],
 ['starfox','Starfox','#5AB4FF','arrow','b',[64,80,74,60,78],'FİŞ!'],
 ['kraglin','Kraglin','#C8834A','smash','b',[72,60,58,78,55],'GÜM!'],
 ['stakar','Stakar Ogord','#FFB627','smash','b',[70,62,60,75,52],'BAM!'],
 ['ayesha','Ayesha','#B06BFF','magic','a',[80,70,75,72,85],'VİUUU!'],
 ['taskmaster','Taskmaster','#9B6BFF','slash','a',[85,88,78,70,55],'ŞAK!'],
 ['modok','MODOK','#D5DAE4','zap','a',[60,55,95,55,80],'BZZZT!'],
 ['crossbones','Crossbones','#7B5CFF','slash','b',[74,70,68,72,50],'ŞİNG!'],
 ['zemo','Baron Zemo','#4A7BFF','zap','b',[66,72,70,64,60],'ZİP!'],
 ['jigsaw','Jigsaw','#C8834A','slash','b',[68,66,60,72,55],'ŞAK!'],
 ['rhino','Rhino','#9B9B9B','smash','b',[85,55,45,92,50],'KABUM!'],
 ['vulture','Vulture','#7A7A7A','slash','b',[72,68,60,70,48],'FİŞ!'],
 ['sandman','Sandman','#D5DAE4','smash','b',[80,50,55,90,60],'POOF!'],
 ['absorber','Absorbing Man','#C8834A','smash','b',[82,60,50,88,55],'KABUM!'],
 ['kraven','Kraven','#2E8B57','slash','b',[76,78,62,74,50],'HİYAA!'],
 ['chameleon','Chameleon','#6BE36B','magic','b',[55,80,75,60,85],'FŞŞŞ!'],
 ['shocker','Shocker','#FFD34A','zap','b',[60,85,68,58,72],'ZİP!'],
 ['scorpion','Scorpion','#FF3B4E','slash','b',[78,80,55,66,52],'ŞİNG!'],
 ['hammerhead','Hammerhead','#C8834A','smash','b',[80,58,50,85,48],'KABUM!'],
 ['bullseye','Bullseye','#D5DAE4','slash','b',[70,92,60,55,55],'TAK!'],
 ['blob','The Blob','#FF8A3D','smash','b',[88,35,40,95,50],'GÜM!'],
 ['titanium','Titanium Man','#9B9B9B','smash','b',[90,45,55,90,45],'KABUM!'],
 ['gargoyle','Grey Gargoyle','#8A8A8A','smash','b',[85,50,55,88,50],'KRİSS!'],
 ['quasar','Quasar','#FFD34A','beam','a',[78,80,75,70,90],'FUUŞ!'],
 ['bluemarvel','Blue Marvel','#4A7BFF','smash','a',[92,60,65,85,75],'KABUM!'],
 ['terrax','Terrax','#FF3B4E','smash','a',[90,72,60,85,60],'BOOM!'],
 ['blastaar','Blastaar','#9B6BFF','smash','b',[80,75,65,80,60],'GÜM!'],
 ['mentor','Mentor','#7B5CFF','magic','b',[65,80,75,70,85],'FŞŞŞ!'],
 ['gladiator','Gladiator','#FF8A3D','slash','b',[82,70,60,78,55],'ŞAK!'],
 ['beta','Beta Ray Bill','#5AB4FF','smash','a',[88,75,65,85,60],'KABUM!'],
 ['herald','Herald','#D5DAE4','magic','b',[70,75,80,72,88],'VİUUU!'],
 ['silverclaw','Silverclaw','#D5DAE4','slash','b',[75,80,65,70,55],'ŞİNG!'],
 ['bloodaxe','Bloodaxe','#FF2E63','slash','b',[78,72,60,74,52],'ŞAK!'],
 ['darwin','Darwin','#6BE36B','magic','b',[50,85,80,60,88],'FŞŞŞ!'],
 ['domino','Domino','#FF8A3D','magic','b',[60,88,72,62,80],'KLİK!'],
 ['shatterstar','Shatterstar','#FF3B4E','slash','b',[80,85,60,65,58],'ŞAK!'],
 ['bobby','Bobby Drake','#5AB4FF','zap','b',[70,82,68,60,75],'ZAP!'],
 ['clea','Clea','#FF2E63','magic','a',[55,75,85,60,95],'VİUUU!'],
 ['justice','Justice','#4A7BFF','beam','b',[72,80,70,68,75],'FİŞ!'],
 ['mockingbird','Mockingbird','#D5DAE4','slash','b',[72,85,75,65,60],'TAK!'],
 ['capbritain','Captain Britain','#FF3B4E','smash','a',[85,80,75,80,55],'ŞAK!'],
 ['sunspot','Sunspot','#FF8A3D','fire','b',[78,82,60,62,70],'PAT!'],
 ['cannonball','Cannonball','#FFB627','smash','b',[80,60,50,82,55],'KABUM!'],
 ['havok','Havok','#FF8A3D','fire','b',[80,70,65,70,75],'PAT!'],
 ['polaris','Polaris','#5AB4FF','beam','b',[65,85,70,68,85],'FİŞ!'],
 ['pixie','Pixie','#FF2E63','magic','b',[58,82,78,60,88],'FŞŞŞ!'],
 ['hothead','Hothead','#FF3B4E','fire','b',[82,78,55,68,60],'PAT!'],
 ['strongguy','Strong Guy','#C8834A','smash','b',[85,70,55,80,50],'GÜM!'],
 ['jubilee','Jubilee','#FFD34A','zap','b',[62,88,72,58,78],'ZİP!'],
 ['dazzler','Dazzler','#FF5A5A','magic','b',[55,80,75,65,85],'VİUUU!'],
 ['anole','Anole','#6BE36B','magic','b',[60,85,75,62,82],'FŞŞŞ!'],
 ['shiver','Shiver','#5AB4FF','magic','b',[50,80,82,60,88],'FŞŞŞ!'],
 ['banshee','Banshee','#D5DAE4','magic','b',[55,82,78,60,86],'FŞŞŞ!'],
 ['spiderwoman','Spider-Woman','#FF3B4E','web','g',[70,88,80,62,75],'FIŞŞ!'],
 ['arachne','Arachne','#8A2BE2','web','b',[62,85,78,60,82],'FŞŞŞ!'],
 ['silk','Silk','#FFD34A','web','g',[66,90,80,58,80],'FIŞŞ!'],
 ['spidergirl','Spider-Girl','#FF8A3D','web','b',[68,86,78,60,78],'FIŞŞ!'],
 ['miguel','Spider-Man 2099','#4A7BFF','web','a',[80,92,84,66,70],'FIŞŞ!'],
 ['peniparker','Peni Parker','#FF2E63','web','b',[60,88,82,58,80],'FŞŞŞ!'],
 ['arana','Arana','#6BE36B','web','b',[58,84,80,56,85],'FŞŞŞ!'],
 ['spiderpunk','Spider-Punk','#FF3B4E','web','b',[75,90,70,60,65],'BAM!'],
 ['knull','Knull','#7A3CFF','cosmic','e',[97,70,88,95,60],'ÇAT!'],
 ['scream','Scream','#9B6BFF','magic','b',[55,80,85,60,88],'FŞŞŞ!'],
 ['phage','Phage','#3DDC97','magic','b',[58,78,80,62,86],'FŞŞŞ!'],
 ['riot','Riot','#FF3B4E','magic','b',[70,82,72,66,75],'PAT!'],
 ['agony','Agony','#B06BFF','magic','b',[52,78,84,58,90],'FŞŞŞ!'],
 ['lasher','Lasher','#FF2E63','slash','b',[75,80,65,68,60],'ŞAK!'],
 ['gorr','Gorr','#FF8A3D','slash','a',[88,82,70,78,55],'HİYAA!'],
 ['blackcat','Black Cat','#2B2B2B','slash','g',[72,92,80,60,75],'ŞAK!'],
 ['whitetiger','White Tiger','#D5DAE4','slash','g',[78,86,75,70,62],'ŞAK!'],
 ['tigra','Tigra','#FF8A3D','slash','b',[80,85,68,66,55],'HİYAA!'],
 ['hellcat','Hellcat','#FF2E63','slash','b',[76,88,72,62,70],'ŞAK!'],
 ['nighthawk','Nighthawk','#4A7BFF','beam','b',[72,82,75,68,78],'FİŞ!'],
 ['sasquatch','Sasquatch','#6BE36B','smash','b',[85,60,55,85,50],'GÜM!'],
 ['talisman','Talisman','#FFB627','magic','b',[60,78,80,62,88],'FŞŞŞ!'],
 ['question','The Question','#D5DAE4','magic','b',[65,80,82,64,85],'FŞŞŞ!'],
 ['azrael','Azrael','#7A3CFF','slash','b',[78,84,70,72,60],'ŞAK!'],
 ['boomerang','Boomerang','#C8834A','slash','b',[70,88,75,60,72],'TAK!'],
 ['slapstick','Slapstick','#FFD34A','smash','b',[75,70,55,78,50],'KABUM!'],
 ['radioman','Radioactive Man','#6BE36B','zap','b',[70,80,65,68,75],'ZAP!'],
 ['killershrike','Killer Shrike','#FF3B4E','slash','b',[80,82,62,70,55],'ŞAK!'],
 ['spiderslayer','Spider-Slayer','#4A4A4A','slash','b',[82,80,65,72,58],'ŞAK!'],
 ['morlun','Morlun','#B06BFF','cosmic','a',[90,75,82,88,62],'ÇAT!'],
 ['ezekiel','Ezekiel','#6BE36B','magic','b',[55,82,85,58,88],'FŞŞŞ!'],
 ['benreilly','Ben Reilly','#FF3B4E','web','b',[72,88,80,62,72],'FIŞŞ!'],
 ['kaine','Kaine','#FF8A3D','slash','b',[78,86,68,66,60],'HİYAA!'],
 ['agentvenom','Agent Venom','#2E8B57','cosmic','g',[80,88,78,72,70],'BZZZT!'],
 ['kitty','Kitty Pryde','#FF8A3D','magic','g',[62,90,84,58,80],'FŞŞŞ!'],
 ['multiple','Multiple Man','#4A7BFF','magic','b',[55,80,82,60,85],'FŞŞŞ!'],
 ['madameweb','Madame Web','#7A3CFF','magic','b',[50,78,88,56,92],'FŞŞŞ!'],
 ['northstar','Northstar','#FFD34A','beam','b',[68,84,72,64,80],'FİŞ!'],
 ['aurora','Aurora','#FF2E63','magic','b',[60,80,82,60,86],'FŞŞŞ!'],
 ['husk','Husk','#8A8A8A','smash','b',[85,70,60,88,55],'KABUM!'],
 ['genisvell','Genis-Vell','#5AB4FF','beam','a',[82,85,75,70,80],'FUUŞ!'],
 ['triathlon','Triathlon','#6BE36B','magic','b',[65,82,80,62,84],'FŞŞŞ!'],
 ['saga','Saga','#FF8A3D','magic','b',[70,85,72,64,80],'FŞŞŞ!'],
 ['famine','Famine','#7A3CFF','magic','b',[60,82,84,58,90],'FŞŞŞ!'],
 ['gideon','Gideon','#B06BFF','magic','b',[62,80,85,60,88],'FŞŞŞ!'],
 ['calibration','Calibration','#4A7BFF','beam','b',[68,84,75,66,78],'FİŞ!'],
 ['sabretooth','Sabretooth','#FF8A3D','slash','g',[84,88,60,75,55],'HİYAA!'],
 ['omegared','Omega Red','#C8232C','smash','a',[90,75,65,92,60],'KABUM!'],
 ['deathstrike','Lady Deathstrike','#D5DAE4','slash','g',[80,86,68,78,62],'ŞAK!'],
 ['rictor','Rictor','#FF8A3D','smash','b',[78,84,62,72,60],'GÜM!'],
 ['boomer','Boomer','#FFB627','smash','b',[75,80,65,70,62],'KABUM!'],
 ['nocturne','Nocturne','#2B2B2B','magic','b',[55,85,82,58,88],'FŞŞŞ!'],
 ['wolfsbane','Wolfsbane','#6BE36B','magic','b',[60,80,84,60,86],'FŞŞŞ!'],
 ['cable','Cable','#FF3B4E','slash','a',[88,82,75,80,68],'ŞAK!'],
 ['x23','X-23','#2B2B2B','slash','g',[85,92,70,68,60],'SNİKT!'],
 ['laura','Laura Kinney','#FF8A3D','slash','g',[80,90,75,66,65],'ŞAK!'],
 ['ajaks','Ajak','#FFD34A','beam','a',[78,80,78,72,88],'FUUŞ!'],
 ['goliath','Goliath','#C8834A','smash','b',[88,55,50,90,45],'KABUM!'],
 ['citizenv','Citizen V','#4A7BFF','beam','g',[75,82,70,68,80],'FİŞ!'],
 ['machineman','Machine Man','#9B9B9B','smash','b',[82,75,65,80,55],'KABUM!'],
 ['lifeguard','Lifeguard','#FF3B4E','beam','b',[70,82,72,66,78],'FİŞ!'],
 ['phalanx','Phalanx','#7A3CFF','cosmic','a',[90,60,85,92,55],'ÇAT!'],
 ['eftim','Eternity','#FFD34A','cosmic','e',[99,60,90,98,70],'VUMMM!'],
 ['oblivion','Oblivion','#2B2B2B','cosmic','a',[95,65,88,96,60],'ÇAT!'],
 ['grandmaster','Grandmaster','#9B6BFF','magic','a',[60,80,95,55,90],'FŞŞŞ!'],
 ['collector','The Collector','#C8834A','magic','a',[50,75,95,60,92],'FŞŞŞ!'],
 ['watcher','The Watcher','#D5DAE4','magic','a',[40,70,98,50,95],'FŞŞŞ!'],
 ['jean','Jean Grey','#FF2E63','magic','a',[62,80,95,58,92],'VİUUU!'],
 ['legion','Legion','#4A7BFF','magic','b',[65,82,78,62,85],'FŞŞŞ!'],
 ['julian','Julian Keller','#FF8A3D','magic','b',[60,85,80,60,82],'FŞŞŞ!'],
 ['david','David Haller','#7A3CFF','magic','b',[55,80,88,58,90],'FŞŞŞ!'],
 ['blindfold','Blindfold','#9B6BFF','magic','b',[58,78,85,60,88],'FŞŞŞ!'],
 ['quentin','Quentin Quire','#FF3B4E','magic','b',[70,75,80,62,85],'FŞŞŞ!'],
 ['eva','Eva Belendez','#FF2E63','magic','b',[62,80,82,58,86],'FŞŞŞ!'],
 ['moira','Moira MacTaggett','#FFB627','magic','b',[55,80,84,58,88],'FŞŞŞ!'],
 ['blink','Blink','#5AB4FF','magic','b',[58,88,78,58,82],'FŞŞŞ!'],
 ['warpath','Warpath','#C8834A','slash','b',[80,75,60,75,55],'ŞAK!'],
 ['immortus','Immortus','#9B6BFF','magic','a',[55,80,95,58,92],'FŞŞŞ!'],
 ['rama','Rama-Tut','#D5DAE4','magic','a',[50,75,98,55,95],'FŞŞŞ!'],
 ['victor','Victor Timely','#FF8A3D','magic','b',[65,80,85,60,82],'FŞŞŞ!'],
 ['remains','He Who Remains','#2B2B2B','cosmic','a',[92,60,90,95,62],'ÇAT!'],
 ['minutes','Miss Minutes','#FFD34A','magic','b',[45,80,92,50,90],'FŞŞŞ!'],
 ['ob','O.B.','#D5DAE4','magic','b',[40,75,95,48,92],'FŞŞŞ!'],
 ['casey','Casey','#FF2E63','magic','b',[60,80,82,58,85],'FŞŞŞ!'],
 ['vote','Vote','#4A7BFF','magic','b',[58,82,80,58,84],'FŞŞŞ!'],
 ['sylvie','Sylvie','#B06BFF','magic','a',[68,85,88,62,85],'FŞŞŞ!'],
 ['laufey','Laufeyson','#7A3CFF','magic','b',[70,82,75,65,80],'FŞŞŞ!'],
 ['mobius','Mobius','#5AB4FF','magic','g',[60,80,85,62,88],'FŞŞŞ!'],
 ['hunterb','Hunter B-15','#C8834A','smash','b',[78,80,65,72,60],'GÜM!'],
 ['ravonna','Ravonna','#FF2E63','magic','b',[62,78,85,60,88],'FŞŞŞ!'],
 ['alioth','Alioth','#7A3CFF','cosmic','b',[85,60,88,92,58],'ÇAT!'],
 ['denis','Denis','#9B6BFF','magic','b',[55,80,85,58,90],'FŞŞŞ!'],
 ['mayday','Mayday Parker','#FF8A3D','web','b',[68,88,78,60,75],'FIŞŞ!'],
 ['allblack','All-Black','#2B2B2B','cosmic','g',[85,70,90,88,65],'ÇAT!'],
 ['hercules','Hercules','#FFD34A','smash','a',[90,75,65,85,60],'KABUM!'],
 ['ajax','Ajax','#FF3B4E','smash','b',[80,70,60,78,52],'KABUM!'],
 ['moondragon','Moondragon','#FF2E63','magic','a',[60,80,90,58,95],'VİUUU!'],
 ['korvac','Korvac','#FFD34A','cosmic','e',[98,65,88,96,65],'VUMMM!'],
 ['dragonslayer','Dragonslayer','#FF8A3D','slash','a',[88,80,70,82,58],'ŞAK!'],
 ['nightthrasher','Night Thrasher','#2B2B2B','slash','b',[80,85,68,70,58],'ŞAK!'],
 ['unionjack','Union Jack','#FF3B4E','smash','b',[75,80,70,72,60],'ŞAK!'],
 ['marvelzombie','Marvel Zombie','#6BE36B','smash','b',[82,60,70,90,55],'GÜM!'],
 ['silversamurai','Silver Samurai','#D5DAE4','slash','a',[85,78,72,82,58],'ŞAK!'],
].map(([id,ad,c,fx,r,s,w],i)=>({id,ad,c,fx,r,s,w,no:i+1}));
const HERO_BY=Object.fromEntries(HEROES_CG.map(h=>[h.id,h]));
const FX_SND={beam:'beam',thunder:'thunder',smash:'smash',web:'web',portal:'portal',shield:'shield',slash:'slash',magic:'magic',cosmic:'cosmic',zap:'zap',fire:'fire',arrow:'arrow',boom:'boom'};

/* ---------- El çizimi kart yüzü (Canvas) ---------- */
const CARD_W=360, CARD_H=504, STAT_Y0=300, STAT_DY=37;
const rnd=(a,b)=>a+Math.random()*(b-a);
function rLine(c,x1,y1,x2,y2,w=3,col='#07060b',p=2){c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';for(let k=0;k<p;k++){const o=w*.7;c.beginPath();c.moveTo(x1+rnd(-o,o),y1+rnd(-o,o));c.quadraticCurveTo((x1+x2)/2+rnd(-o*2,o*2),(y1+y2)/2+rnd(-o*2,o*2),x2+rnd(-o,o),y2+rnd(-o,o));c.stroke();}}
function rPoly(c,pts,fill,w=3,col='#07060b',close=true){
  if(fill){c.fillStyle=fill;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));close&&c.closePath();c.fill();}
  for(let i=0;i<pts.length-(close?0:1);i++){const a=pts[i],b=pts[(i+1)%pts.length];rLine(c,a[0],a[1],b[0],b[1],w,col);}
}
function rCircle(c,x,y,r,w=3,col='#07060b',fill){
  if(fill){c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,7);c.fill();}
  c.strokeStyle=col;c.lineWidth=w;for(let k=0;k<2;k++){c.beginPath();const st=rnd(0,6.28);for(let a=0;a<=6.6;a+=.25){const rr=r+rnd(-w*.6,w*.6);const px=x+Math.cos(st+a)*rr,py=y+Math.sin(st+a)*rr;a?c.lineTo(px,py):c.moveTo(px,py);}c.stroke();}
}
function halftone(c,x,y,w,h,col,from=1,to=0,step=9,ang=0){
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.fillStyle=col;
  for(let j=-step;j<h+step;j+=step)for(let i=-step;i<w+step;i+=step){const t=(j/h)*(1-ang)+(i/w)*ang; const r=(from+(to-from)*t)*step*.5; if(r<.3) continue; c.beginPath();c.arc(x+i+((j/step)%2?step/2:0),y+j,r,0,7);c.fill();}
  c.restore();
}
function hatch(c,x,y,w,h,col,gap=7,ang=1){c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.strokeStyle=col;c.lineWidth=1.2;for(let i=-h;i<w+h;i+=gap){c.beginPath();c.moveTo(x+i+rnd(-1,1),y);c.lineTo(x+i+h*ang+rnd(-1,1),y+h);c.stroke();}c.restore();}
function paper(c,w,h,alpha=.08){const id=c.getImageData(0,0,w,h),d=id.data;for(let i=0;i<d.length;i+=4){const n=(Math.random()-.5)*255*alpha;d[i]+=n;d[i+1]+=n;d[i+2]+=n;}c.putImageData(id,0,0);}
function shade(hex,amt){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const f=v=>Math.max(0,Math.min(255,Math.round(v+(amt<0?v*amt:(255-v)*amt))));return `rgb(${f(r)},${f(g)},${f(b)})`;}
function emblem(c,type,cx,cy,s,col){
  const ink='#07060b', light=shade(col,.55), dark=shade(col,-.45);
  if(type==='thunder'){const p=[[cx-s*.15,cy-s*.95],[cx+s*.45,cy-s*.95],[cx+s*.08,cy-s*.15],[cx+s*.42,cy-s*.15],[cx-s*.32,cy+s*.95],[cx-s*.02,cy+s*.08],[cx-s*.38,cy+s*.08]];rPoly(c,p,'#fff8d0',5);rPoly(c,p.map(([x,y])=>[x+6,y+4]),null,2,light);}
  else if(type==='beam'){for(let i=0;i<16;i++){const a=i/16*6.28;rLine(c,cx+Math.cos(a)*s*.55,cy+Math.sin(a)*s*.55,cx+Math.cos(a)*s*1.25,cy+Math.sin(a)*s*1.25,i%2?3:6,i%2?light:'#fff');}rCircle(c,cx,cy,s*.5,5,ink,'#fff');rCircle(c,cx,cy,s*.32,3,ink,light);rCircle(c,cx,cy,s*.14,2,ink,'#fff');}
  else if(type==='smash'){const gy=cy+s*.45; c.strokeStyle='#fff'; for(let k=0;k<3;k++){c.lineWidth=5-k; c.globalAlpha=.9-k*.25; c.beginPath(); c.ellipse(cx,gy,s*(.6+k*.38),s*(.25+k*.16),0,Math.PI,0); c.stroke();} c.globalAlpha=1;
    const g=[[cx-s*1.6,gy]]; for(let x=-1.4;x<=1.4;x+=.14) g.push([cx+x*s,gy+rnd(-s*.1,s*.14)]); g.push([cx+s*1.6,gy]); g.push([cx+s*1.6,cy+s*1.4]); g.push([cx-s*1.6,cy+s*1.4]); rPoly(c,g,dark,5);
    for(let i=0;i<4;i++){const x=cx+rnd(-s*1.1,s*1.1); rLine(c,x,gy,x+rnd(-18,18),gy+s*.7,4);}
    for(let i=0;i<7;i++){const x=cx+rnd(-s*1.2,s*1.2),y=gy-rnd(s*.25,s*1.25),z=rnd(12,26),a=rnd(0,1.5); const q=[[0,0],[z,rnd(-6,6)],[z*rnd(.6,1),z*rnd(.7,1)],[rnd(-6,0),z*rnd(.5,.9)]].map(([px,py])=>[x+px*Math.cos(a)-py*Math.sin(a),y+px*Math.sin(a)+py*Math.cos(a)]); rPoly(c,q,i%3?light:'#e8e8e8',3); rLine(c,x+z*.4,y+z*.4,x+z*.4-rnd(10,26)*(x<cx?-1:1)*.3,y+z+rnd(12,26),2,'rgba(255,255,255,.6)',1);}
    const st=[]; for(let i=0;i<14;i++){const a=Math.PI+i/13*Math.PI, r=i%2?s*.32:s*.62; st.push([cx+Math.cos(a)*r,gy+Math.sin(a)*r]);} rPoly(c,st,'#fff8d0',4);}
  else if(type==='web'){for(let i=0;i<12;i++){const a=i/12*6.28;rLine(c,cx,cy,cx+Math.cos(a)*s*1.4,cy+Math.sin(a)*s*1.2,2.5,'#fff');}for(let r=.25;r<1.3;r+=.25){const pts=[];for(let i=0;i<12;i++){const a=i/12*6.28;pts.push([cx+Math.cos(a)*s*r,cy+Math.sin(a)*s*r*.85]);}rPoly(c,pts,null,2,'#fff');}rCircle(c,cx,cy,s*.12,3,ink,col);}
  else if(type==='portal'){for(let k=0;k<3;k++)rCircle(c,cx,cy,s*(1-k*.22),k?3:6,k%2?light:'#fff');for(let i=0;i<24;i++){const a=i/24*6.28;rLine(c,cx+Math.cos(a)*s*.95,cy+Math.sin(a)*s*.95,cx+Math.cos(a)*s*1.1,cy+Math.sin(a)*s*1.1,3,'#fff');}const st=[];for(let i=0;i<10;i++){const a=i/10*6.28-1.57,r=i%2?s*.22:s*.5;st.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}rPoly(c,st,light,3);}
  else if(type==='shield'){const hx=(x,y,r)=>{const p=[];for(let i=0;i<6;i++){const a=i/6*6.28+.52;p.push([x+Math.cos(a)*r,y+Math.sin(a)*r]);}return p;};rPoly(c,hx(cx,cy,s*1.05),dark,6);rPoly(c,hx(cx,cy,s*.72),col,4);rPoly(c,hx(cx,cy,s*.4),'#fff',4);for(let i=0;i<6;i++){const a=i/6*6.28+.52;rLine(c,cx+Math.cos(a)*s*.4,cy+Math.sin(a)*s*.4,cx+Math.cos(a)*s*1.05,cy+Math.sin(a)*s*1.05,2,ink);}}
  else if(type==='slash'){for(let i=0;i<3;i++){const x=cx-s*.7+i*s*.55;rPoly(c,[[x-s*.15,cy-s*1.05],[x+s*.08,cy-s*1.0],[x+s*.55,cy+s*.95],[x+s*.32,cy+s*1.05]],i===1?'#fff':light,4);}}
  else if(type==='magic'){for(let k=0;k<3;k++){c.strokeStyle=k?light:'#fff';c.lineWidth=k?3:6;c.beginPath();for(let i=0;i<70;i++){const a=i*.22+k*2.1,r=i/70*s*1.25;const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*.8;i?c.lineTo(x+rnd(-1.5,1.5),y+rnd(-1.5,1.5)):c.moveTo(x,y);}c.stroke();}rCircle(c,cx,cy,s*.16,3,ink,'#fff');}
  else if(type==='cosmic'){c.save();c.translate(cx,cy);c.rotate(-.35);c.strokeStyle='#fff';c.lineWidth=5;c.beginPath();c.ellipse(0,0,s*1.25,s*.35,0,0,7);c.stroke();c.restore();rCircle(c,cx,cy,s*.6,5,ink,col);halftone(c,cx-s*.6,cy-s*.6,s*1.2,s*1.2,dark,0,1.1,8,.7);rPoly(c,[[cx,cy-s*.32],[cx+s*.22,cy],[cx,cy+s*.32],[cx-s*.22,cy]],'#fff',3);for(let i=0;i<14;i++){const x=cx+rnd(-s*1.5,s*1.5),y=cy+rnd(-s,s);c.fillStyle='#fff';c.beginPath();c.arc(x,y,rnd(1,3),0,7);c.fill();}}
  else if(type==='zap'){for(let k=0;k<3;k++){const pts=[];let x=cx-s*1.2,y=cy+rnd(-s*.6,s*.6);for(let i=0;i<9;i++){pts.push([x,y]);x+=s*.3;y=cy+rnd(-s*.8,s*.8);}rPoly(c,pts,null,k?3:6,k?light:'#fff',false);}rCircle(c,cx,cy,s*.2,3,ink,'#fff');}
  else if(type==='fire'){for(let k=0;k<5;k++){const x=cx+(k-2)*s*.35,h=s*(1.3-Math.abs(k-2)*.25);c.fillStyle=k%2?'#FFD34A':'#FF6A00';c.beginPath();c.moveTo(x-s*.3,cy+s*.8);c.bezierCurveTo(x-s*.4,cy,x+rnd(-10,10),cy-h*.4,x,cy-h);c.bezierCurveTo(x+s*.2,cy-h*.3,x+s*.45,cy,x+s*.3,cy+s*.8);c.closePath();c.fill();c.strokeStyle=ink;c.lineWidth=3.5;c.stroke();}halftone(c,cx-s*1.2,cy-s*.2,s*2.4,s,'rgba(120,0,0,.5)',0,1,8);}
  else if(type==='arrow'){c.save();c.translate(cx,cy);c.rotate(-.6);rLine(c,-s*1.3,0,s*.9,0,7,ink);rLine(c,-s*1.3,0,s*.9,0,3,'#fff');rPoly(c,[[s*.75,-s*.25],[s*1.3,0],[s*.75,s*.25]],'#fff',4);rPoly(c,[[-s*1.3,0],[-s*1.55,-s*.25],[-s*1.0,-s*.05]],light,3);rPoly(c,[[-s*1.3,0],[-s*1.55,s*.25],[-s*1.0,s*.05]],light,3);for(let i=0;i<4;i++)rLine(c,-s*1.9,(i-1.5)*s*.25,-s*1.55,(i-1.5)*s*.25,2,'#fff');c.restore();}
  else {const pts=[];for(let i=0;i<22;i++){const a=i/22*6.28,r=i%2?s*.6:s*(1.05+rnd(-.15,.2));pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}rPoly(c,pts,'#FFD34A',6);const p2=pts.map(([x,y])=>[cx+(x-cx)*.6,cy+(y-cy)*.6]);rPoly(c,p2,'#fff',3);}
}
const CARD_CACHE={};
function cardFace(h){
  if(CARD_CACHE[h.id]) return CARD_CACHE[h.id];
  const cv=document.createElement('canvas'); cv.width=CARD_W; cv.height=CARD_H; const c=cv.getContext('2d');
  const ink='#07060b', rc=RAR[h.r][1], col=h.c;
  const rr=(x,y,w,hh,r)=>{c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+hh,r);c.arcTo(x+w,y+hh,x,y+hh,r);c.arcTo(x,y+hh,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();};
  rr(0,0,CARD_W,CARD_H,26); c.fillStyle=ink; c.fill();
  // iç kağıt panel
  rr(10,10,CARD_W-20,CARD_H-20,18); const g=c.createLinearGradient(0,0,0,CARD_H); g.addColorStop(0,shade(col,-.35)); g.addColorStop(.55,'#1b1528'); g.addColorStop(1,'#120e1d'); c.fillStyle=g; c.fill();
  c.save(); rr(10,10,CARD_W-20,CARD_H-20,18); c.clip(); halftone(c,10,10,CARD_W-20,CARD_H-20,'rgba(255,255,255,.05)',.2,.9,10,.3); c.restore();
  // sanat penceresi
  const ax=22,ay=70,aw=CARD_W-44,ah=212;
  c.save(); c.beginPath(); c.rect(ax,ay,aw,ah); c.clip();
  const bg=c.createRadialGradient(ax+aw/2,ay+ah/2,10,ax+aw/2,ay+ah/2,aw*.75); bg.addColorStop(0,shade(col,.35)); bg.addColorStop(.5,col); bg.addColorStop(1,shade(col,-.6)); c.fillStyle=bg; c.fillRect(ax,ay,aw,ah);
  const cx=ax+aw/2, cy=ay+ah/2;
  for(let i=0;i<28;i++){const a0=i/28*6.28,a1=a0+.11; c.fillStyle=i%2?'rgba(255,255,255,.16)':'rgba(0,0,0,.18)'; c.beginPath(); c.moveTo(cx,cy); c.lineTo(cx+Math.cos(a0)*400,cy+Math.sin(a0)*400); c.lineTo(cx+Math.cos(a1)*400,cy+Math.sin(a1)*400); c.closePath(); c.fill();}
  halftone(c,ax,ay,aw,ah,'rgba(0,0,0,.35)',0,1.1,9,.35);
  emblem(c,h.fx,cx,cy+4,64,col);
  hatch(c,ax,ay+ah-40,aw,40,'rgba(0,0,0,.35)',6);
  c.restore();
  rPoly(c,[[ax,ay],[ax+aw,ay],[ax+aw,ay+ah],[ax,ay+ah]],null,5);
  // isim bandı
  c.save(); c.translate(CARD_W/2,42); c.rotate(-.025);
  rPoly(c,[[-160,-24],[150,-30],[162,20],[-152,26]],ink,4,ink);
  c.font=`${h.ad.length>12?30:h.ad.length>9?34:38}px Bangers, "Big Shoulders Display", Impact, sans-serif`; c.textAlign='center'; c.textBaseline='middle';
  const UP=/Kaptan/.test(h.ad)?h.ad.toLocaleUpperCase('tr'):h.ad.toUpperCase(); c.lineWidth=6; c.strokeStyle=shade(col,-.5); c.strokeText(UP,0,1); c.fillStyle='#fff'; c.fillText(UP,0,0);
  c.restore();
  // nadirlik & no
  c.save(); c.translate(CARD_W-52,ay+18); c.rotate(.08); rPoly(c,[[-36,-13],[34,-15],[36,13],[-34,14]],rc,3); c.font='bold 15px "IBM Plex Mono", monospace'; c.fillStyle=ink; c.textAlign='center'; c.textBaseline='middle'; c.fillText(RAR[h.r][0],0,1); c.restore();
  c.font='bold 15px "IBM Plex Mono", monospace'; c.fillStyle='rgba(255,255,255,.85)'; c.textAlign='left'; c.fillText('#'+String(h.no).padStart(2,'0'),ax+8,ay+22);
  // özellikler
  for(let i=0;i<5;i++){
    const y=STAT_Y0+i*STAT_DY, v=h.s[i];
    c.font='600 15px Barlow, sans-serif'; c.fillStyle='#cfc8e6'; c.textAlign='left'; c.textBaseline='middle'; c.fillText(STATS[i],28,y+15);
    const bx=150,bw=118,by=y+7,bh=16;
    c.fillStyle='rgba(255,255,255,.07)'; c.fillRect(bx,by,bw,bh);
    const fw=bw*v/100; const bgr=c.createLinearGradient(bx,0,bx+fw,0); bgr.addColorStop(0,shade(col,-.2)); bgr.addColorStop(1,shade(col,.3)); c.fillStyle=bgr; c.fillRect(bx,by,fw,bh);
    hatch(c,bx,by,fw,bh,'rgba(0,0,0,.25)',5);
    rPoly(c,[[bx,by],[bx+bw,by],[bx+bw,by+bh],[bx,by+bh]],null,2,'#07060b');
    c.font='30px Bangers, Impact, sans-serif'; c.textAlign='right'; c.lineWidth=4; c.strokeStyle=ink; c.strokeText(v,CARD_W-26,y+17); c.fillStyle=v>=90?'#FFB627':'#fff'; c.fillText(v,CARD_W-26,y+17);
    if(i<4) rLine(c,26,y+STAT_DY-2,CARD_W-26,y+STAT_DY-2,1,'rgba(255,255,255,.08)',1);
  }
  // alt imza
  c.font='bold 11px "IBM Plex Mono", monospace'; c.fillStyle='rgba(255,255,255,.4)'; c.textAlign='center'; c.fillText('MARVEL TÜRKİYE · SEZON 01',CARD_W/2,CARD_H-22);
  // nadirlik çerçevesi
  c.save(); rr(10,10,CARD_W-20,CARD_H-20,18); c.lineWidth=h.r==='e'?5:3; if(h.r==='e'){const eg=c.createLinearGradient(0,0,CARD_W,CARD_H); eg.addColorStop(0,'#FF3B4E'); eg.addColorStop(.5,'#FFB627'); eg.addColorStop(1,'#7B5CFF'); c.strokeStyle=eg;} else c.strokeStyle=rc; c.stroke(); c.restore();
  paper(c,CARD_W,CARD_H,.06);
  return CARD_CACHE[h.id]=cv.toDataURL('image/jpeg',.9);
}
const FOIL=new Set(HEROES_CG.map(e=>({id:e[0],sc:(e[5]||[]).reduce((a,b)=>a+b,0)})).sort((a,b)=>b.sc-a.sc).slice(0,Math.ceil(HEROES_CG.length*.15)).map(x=>x.id));
const CARD_BACK_HTML=`<div class="cbk"><img class="cblogo" src="img/3bd6897c9c.webp" alt="" draggable="false"><span>MARVEL TÜRKİYE</span></div>`;

(function(){const _cs=document.createElement('style');_cs.textContent="\n#arena[data-theme=\"avengers\"]{background:radial-gradient(1100px 620px at 50% -10%,rgba(40,80,160,.5),transparent 60%),linear-gradient(180deg,#0a1330,#04060f)}\n#arena[data-theme=\"wakanda\"]{background:radial-gradient(1000px 560px at 85% -10%,rgba(90,30,140,.55),transparent 55%),radial-gradient(900px 500px at 8% 105%,rgba(60,15,90,.5),transparent 60%),linear-gradient(180deg,#080316,#03010a)}\n#arena[data-theme=\"asgard\"]{background:radial-gradient(1100px 620px at 50% -15%,rgba(20,110,120,.5),transparent 55%),linear-gradient(180deg,#04181d,#020a0d)}\n.hc.foil .face{position:relative}\n.hc.foil .face::after{content:\"\";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(115deg,transparent 32%,rgba(255,255,255,.55) 46%,rgba(120,200,255,.35) 50%,transparent 64%);background-size:260% 100%;animation:foilmv 3.2s linear infinite;pointer-events:none;mix-blend-mode:screen}\n@keyframes foilmv{to{background-position:-260% 0}}\n.hc.champ .in{animation:champGlow 1.1s ease-in-out infinite}\n@keyframes champGlow{0%,100%{filter:drop-shadow(0 0 6px rgba(255,210,80,.4))}50%{filter:drop-shadow(0 0 24px rgba(255,210,80,.95))}}\n.tm{display:inline-block;width:11px;height:11px;border-radius:50%;border:2px solid #111;margin-right:5px;vertical-align:-1px}\n.tm0{background:var(--gold,#FFB627)}.tm1{background:var(--red,#FF3B4E)}\n";document.head.appendChild(_cs);})();

/* =================== AĞ (PeerJS) =================== */
const NET={peer:null,conns:{},conn:null,isHost:false,code:null,id:null,lastSeen:{},sweep:null,guestT:null};
const randCode=()=>Array.from({length:5},()=>'ABCDEFGHJKLMNPRSTUVYZ23456789'[Math.random()*29|0]).join('');
const peerOk=()=>typeof window.Peer==='function';

/* =================== MOTOR (yalnız odanın kurucusunda çalışır) =================== */
const ENGINE=(()=>{
  let SET={per:0,hand:3,rounds:0,timer:0,feat:2,teams:0,quick:0,theme:'default',ct:1},CFG=null,tmr=null;
  let offer=[0,1];
  let P=[],match=0,round=0,leader=0,pot=[],plays={},order=[],roundOrder=[],turnI=0,stat=null,phase='idle',timer=null,started=false;
  const alive=()=>P.filter(p=>!p.out);
  const total=p=>p.deck.length+p.hand.length;
  function send(ev,to){ // to: 'all' | pid
    const targets=to==='all'?P:P.filter(p=>p.id===to);
    for(const p of targets){ if(p.bot) continue; if(p.id===NET.id) setTimeout(()=>VIEW.ev(ev),0); else { const c=NET.conns[p.id]; c&&c.open&&c.send(ev); } }
  }
  const counts=()=>Object.fromEntries(P.map(p=>[p.id,{deck:p.deck.length,hand:p.hand.length,out:p.out}]));
  const inTurn=pid=>{ if(phase==='team') return order.includes(pid); return order[turnI]===pid; };
  function sendMates(pid){ if(SET.teams!==2) return; const p=P.find(x=>x.id===pid); if(!p) return;
    const pl=plays[pid]; const last=pl?{list:[...(pl.list||[])],stat:pl.stat==null?null:pl.stat}:null; for(const t of P.filter(x=>x.team===p.team&&x.id!==pid&&!x.bot)) send({e:'mate',pid,name:p.name,cards:[...p.hand],last},t.id); }
  const notOk=pid=>!(plays[pid]&&plays[pid].ok);
  function lobby(){ return P.map(p=>({id:p.id,name:p.name,avatar:p.avatar,bot:p.bot,host:p.id===NET.id,team:p.team,tp:p.tp})); }
  function sendLobby(){ const l={e:'lobby',players:lobby(),code:NET.code,started,settings:SET}; send(l,'all'); }
  function setSettings(o){ if(started) return; SET={...SET,...o}; sendLobby(); }
  function setTeam(pid,t){ if(started||(t!==0&&t!==1)) return; const p=P.find(x=>x.id===pid); if(!p) return; if(p.tp===t){ p.tp=null; sendLobby(); return; } if(SET.teams===2&&P.filter(x=>x.tp===t&&x.id!==pid).length>=2) return; p.tp=t; sendLobby(); }
  function addPlayer(id,name,avatar,bot=false){ if(P.length>=4||started) return false; if(P.find(p=>p.id===id)) return true; P.push({id,name:String(name).slice(0,18),avatar:avatar||null,bot,deck:[],hand:[],out:false,pts:0,wins:0,team:0,tp:null,maxd:0}); sendLobby(); return true; }
  function removePlayer(id){ const p=P.find(x=>x.id===id); if(!p) return; send({e:'left',pid:id,name:p.name.replace(' (bot)',''),started},'all'); if(started){ p.bot=true; p.name+=' (bot)'; if(order[turnI]===p.id) botAct(p); } else { P=P.filter(x=>x.id!==id); sendLobby(); } }
  function chat(pid,text,emo,team){ const p=P.find(x=>x.id===pid); if(!p) return; const t=String(text||'').slice(0,120); if(!t.trim()) return;
    if(team&&SET.teams===2){ for(const m of P.filter(x=>x.team===p.team&&!x.bot)) send({e:'chat',pid,name:p.name,text:t,emo:!!emo,team:1},m.id); return; }
    send({e:'chat',pid,name:p.name,text:t,emo:!!emo},'all'); }
  const BOT_LINES={
    start:['Hadi bakalım kim ne kadar bilir','Ben botum ama sizinkilerden iyi oynarım sanki','GG hazır mısınız','Adil bir deste hazırladım','Bugün kimseye haksızlık yok'],
    round:['Bu turun özellikleri komik oldu','Bekle bir dakika','Hah bu kartı beğendim','Şans bana gülümsüyor','Düşünüyorum, sakin','Güçleniyorum burada'],
    turn:['Sıra bende, gerginim','Bir kart seçeceğim','Umarım şanslı kartım var','Sakin ol botum, sakin','Hadi ama ciddiyim'],
    win:['Bu tur benim!','Gördünüz mü onu?','Şanslı kart geldi','Hah!','Bir tur daha böyle'],
    end:['GG iyi maçtı','Rövanş ister misin?','Elim güçlüydü bugün','Kaybettim ama bir dahaki sefere','İyi oyunlardı hepsi']};
  function botSay(p,kind){ if(!p||!p.bot) return; const pool=BOT_LINES[kind]||BOT_LINES.round; const t=pool[Math.random()*pool.length|0];
    setTimeout(()=>{ if(P.includes(p)) chat(p.id,t,false); },700+Math.random()*2400); }
  function botAny(kind){ const bs=alive().filter(p=>p.bot); if(bs.length) botSay(bs[Math.random()*bs.length|0],kind); }
  function specSend(){ const outs=P.filter(p=>p.out&&!p.bot); if(!outs.length) return; const hands=Object.fromEntries(P.filter(p=>!p.out).map(p=>[p.id,[...p.hand]])); outs.forEach(o=>send({e:'spec',hands},o.id)); }
  function addBot(){ const names=['Bot Jarvis','Bot Friday','Bot Ultron','Bot Karen','Bot Edith']; const used=P.map(p=>p.name); const n=names.find(x=>!used.includes(x))||'Bot'; addPlayer('B'+Math.random().toString(36).slice(2,7),n,null,true); }
  function kick(id){ if(started) return; P=P.filter(p=>p.id!==id); const c=NET.conns[id]; if(c){c.send({e:'kicked'}); setTimeout(()=>c.close(),200);} sendLobby(); }
  function start(){
    if(P.length<2) return; if(SET.teams===2&&P.length!==4) SET.teams=0; started=true; match++; try{armGame('cards',80);}catch(e){} round=0; pot=[]; CFG={...SET,ct:SET.ct||1,rounds:SET.quick?Math.min(SET.rounds||15,15):(SET.rounds||0),timer:SET.quick?(SET.timer||10):SET.timer};
    const deck=shuffle(HEROES_CG.map(h=>h.id)); const mx=Math.min(Math.floor(deck.length/P.length),16); const per=SET.per?Math.min(SET.per,mx):mx;
    P.forEach((p,i)=>{p.deck=deck.slice(i*per,(i+1)*per); p.hand=[]; p.out=false; p.pts=0; p.wins=0; p.team=SET.teams===2?((p.tp===0||p.tp===1)?p.tp:-1):0; p.maxd=p.deck.length;});
    if(SET.teams===2){ const un=P.filter(p=>p.team<0||p.team>1); shuffle(un); let c0=P.filter(p=>p.team===0).length,c1=P.filter(p=>p.team===1).length; for(const p of un){ if(c0<=c1){p.team=0;c0++;}else{p.team=1;c1++;} } if(c0!==2||c1!==2){ const ord=shuffle(P.map((_,i)=>i)); ord.forEach((pi,i)=>P[pi].team=i%2); } }
    leader=(match-1)%P.length;
    send({e:'start',players:lobby(),match,leader:P[leader].id,counts:counts(),settings:SET},'all');
    P.filter(p=>p.bot).forEach((p,i)=>setTimeout(()=>botSay(p,'start'),1600+i*1100));
    clearTimeout(timer); timer=setTimeout(nextRound,2600);
  }
  function refill(){ for(const p of alive()){ while(p.hand.length<SET.hand&&p.deck.length) p.hand.push(p.deck.shift()); send({e:'hand',cards:[...p.hand]},p.id);} send({e:'counts',counts:counts()},'all'); specSend(); if(SET.teams===2) P.forEach(p=>sendMates(p.id)); }
  function nextRound(){
    round++; if(round>1){ let i=leader, g=0; do{i=(i+1)%P.length; g++;}while(P[i].out&&g<P.length); leader=i; }
    refill();
    const al=alive(); const td0=P.filter(p=>p.team===0).every(p=>p.out),td1=P.filter(p=>p.team===1).every(p=>p.out); if(al.length<=1||(SET.teams===2&&(td0||td1))||(CFG.rounds>0&&round>CFG.rounds)) return end();
    if(P[leader].out){ let i=leader; do{i=(i+1)%P.length;}while(P[i].out); leader=i; }
    order=[]; for(let k=0;k<P.length;k++){const p=P[(leader+k)%P.length]; if(!p.out&&p.hand.length) order.push(p.id);}
    plays={}; roundOrder=[...order]; stat=null; turnI=0; phase='lead'; const fk=CFG.feat===0?5:(CFG.feat||2); offer=shuffle([0,1,2,3,4]).slice(0,fk).sort();
    setTimeout(()=>{ if(Math.random()<.4) botAny('round'); turn(); },1300);
  }
  function turn(){
    const pid=order[turnI]; const p=P.find(x=>x.id===pid);
    if(!p){ turnI++; if(turnI<order.length){ setTimeout(turn,300); return; } setTimeout(reveal,400); return; }
    send({e:'turn',pid,phase,stat,round,order,timer:CFG.timer,offer},'all');
    clearTimeout(tmr);
    if(p.bot){ if(Math.random()<.13) botSay(p,'turn'); botAct(p); } else if(SET.timer) tmr=setTimeout(()=>{ if(order[turnI]===pid&&(phase==='lead'||phase==='follow')) botAct(p,0,true); },CFG.timer*1000+400);
  }
  function botAct(p,delay,rand){
    setTimeout(()=>{
      if(!inTurn(p.id)||!notOk(p.id)) return;
      const need=Math.min(CFG.ct||1,p.hand.length); if(!need) return;
      const ex=plays[p.id];
      if(ex&&!ex.ok){ // yarım kalmış seçim: tamamla
        const have=ex.list||[]; const missing=need-have.length;
        if(missing>0){ const pool=[...p.hand].filter(id=>!have.includes(id)).sort((a,b)=>(HERO_BY[b].s[stat]||0)-(HERO_BY[a].s[stat]||0)); pool.slice(0,missing).forEach(h=>act(p.id,{a:'pick',hero:h})); }
        if(phase==='lead'&&ex.stat==null){ let bs=offer[0],bv=-1; for(const st of offer){ const sm=(plays[p.id].list||[]).reduce((a,h)=>a+HERO_BY[h].s[st],0); if(sm>bv){bv=sm;bs=st;} } act(p.id,{a:'pickstat',stat:bs}); }
        act(p.id,{a:'confirm'}); return;
      }
      const pickN=(pool)=>{ const ids=shuffle([...pool]).slice(0,need); ids.forEach(h=>act(p.id,{a:'pick',hero:h})); return ids; };
      if(rand){ const ids=pickN(p.hand);
        if(phase==='lead'){ let bs=offer[0],bv=-1; for(const st of offer){ const sm=ids.reduce((a,h)=>a+HERO_BY[h].s[st],0); if(sm>bv){bv=sm;bs=st;} } act(p.id,{a:'pickstat',stat:bs}); }
        setTimeout(()=>act(p.id,{a:'confirm'}),60); return; }
      if(phase==='lead'){ let bs=offer[0],bv=-1;
        for(const st of offer){ const vals=p.hand.map(id=>HERO_BY[id].s[st]).sort((a,b)=>b-a).slice(0,need); const sm=vals.reduce((a,b)=>a+b,0); if(sm>bv){bv=sm;bs=st;} }
        const cands=[...p.hand].sort((a,b)=>HERO_BY[b].s[bs]-HERO_BY[a].s[bs]).slice(0,need);
        cands.forEach(h=>act(p.id,{a:'pick',hero:h})); act(p.id,{a:'pickstat',stat:bs});
        setTimeout(()=>act(p.id,{a:'confirm'}),delay===0?60:650+Math.random()*500); return; }
      const cands=[...p.hand].sort((a,b)=>HERO_BY[b].s[stat]-HERO_BY[a].s[stat]);
      const top=cands.slice(0,need); const rnd=Math.random()<.35?shuffle(cands).slice(0,need):top;
      rnd.forEach(h=>act(p.id,{a:'pick',hero:h})); setTimeout(()=>act(p.id,{a:'confirm'}),delay===0?60:650+Math.random()*500);
    },delay===0?0:900+Math.random()*1100);
  }
  function act(pid,m){
    if(phase!=='lead'&&phase!=='follow'&&phase!=='team') return; if(!inTurn(pid)) return;
    const p=P.find(x=>x.id===pid); if(!p) return;
    if(plays[pid]&&plays[pid].ok) return;
    if(m.a==='pickstat'){ if(m.stat==null){ const pl0=plays[pid]; if(pl0) pl0.stat=null; send({e:'sel',pid},'all'); return; } if(phase!=='lead'||!offer.includes(m.stat)) return;
      const pl=plays[pid]||(plays[pid]={list:[],stat:null,ok:false}); pl.stat=m.stat; send({e:'sel',pid},'all'); return; }
    if(m.a==='pick'){ if(!p.hand.includes(m.hero)) return;
      const pl=plays[pid]||(plays[pid]={list:[],stat:null,ok:false});
      if(m.stat!=null&&phase==='lead'){ if(offer.includes(m.stat)) pl.stat=m.stat; }
      const ix=pl.list.indexOf(m.hero);
      if(ix>=0) pl.list.splice(ix,1); else { const need=Math.min(CFG.ct||1,p.hand.length); if(pl.list.length<need) pl.list.push(m.hero); }
      if(pl.list.length||pl.stat!=null) send({e:'sel',pid},'all'); else delete plays[pid]; return; }
    if(m.a==='confirm'){
      const pl=plays[pid]; if(!pl) return; const need=Math.min(CFG.ct||1,p.hand.length);
      if(pl.list.length<need||(phase==='lead'&&pl.stat==null)) return;
      clearTimeout(tmr); pl.ok=true;
      for(const h of pl.list){ const ix=p.hand.indexOf(h); if(ix>=0) p.hand.splice(ix,1); } sendMates(pid);
      const heroes=[...pl.list];
      send({e:'played',pid,hero:heroes[0],heroes,stat:pl.stat!=null?pl.stat:stat},pid); P.forEach(o=>{ if(o.id!==pid&&!o.bot){ const ev={e:'played',pid,hero:heroes[0],heroes,stat:pl.stat!=null?pl.stat:stat}; if(o.id===NET.id) setTimeout(()=>VIEW.ev(ev),0); else {const c=NET.conns[o.id]; c&&c.open&&c.send(ev);} } });
      if(phase==='lead'){ stat=pl.stat; send({e:'stat',pid,stat},'all');
        if(SET.teams===2){ phase='team'; order=order.slice(1); turnI=0;
          for(const fid of order){ send({e:'turn',pid:fid,phase:'team',stat,round,order:roundOrder,timer:CFG.timer,offer},fid); }
          if(CFG.timer>0) tmr=setTimeout(()=>{ for(const fid of order){ const fp=P.find(x=>x.id===fid); if(fp&&notOk(fid)) botAct(fp,0,true); } },CFG.timer*1000+400);
          order.forEach((fid,i)=>{ const fp=P.find(x=>x.id===fid); if(fp&&fp.bot) setTimeout(()=>botAct(fp),500+i*600); });
          return; }
        phase='follow'; turnI++;
        if(turnI>=order.length) setTimeout(reveal,900); else setTimeout(turn,turnI===1?1500:500); return; }
      if(phase==='team'){ if(order.every(fid=>plays[fid]&&plays[fid].ok)) setTimeout(reveal,900); return; }
      turnI++;
      if(turnI>=order.length) setTimeout(reveal,900); else setTimeout(turn,turnI===1?1500:500);
    }
  }
  function reveal(){
    phase='reveal';
    const ps=roundOrder.map(pid=>{ const pl=plays[pid]||{list:[],stat}; const heroes=pl.list||[]; const v=heroes.reduce((a,h)=>a+(HERO_BY[h]?HERO_BY[h].s[stat]:0),0); return {pid,hero:heroes[0],heroes,v,b:0}; });
    const allHeroes=ps.flatMap(x=>x.heroes||[]);
    let winner=null, winTeam=-1;
    if(SET.teams===2){
      const tv=t=>ps.filter(x=>{const pp=P.find(q=>q.id===x.pid); return pp&&pp.team===t;}).reduce((a,x)=>a+x.v,0);
      const v0=tv(0),v1=tv(1);
      if(v0===v1){ pot.push(...allHeroes); }
      else { winTeam=v0>v1?0:1; const members=P.filter(p=>p.team===winTeam&&!p.out);
        const pool=[...allHeroes,...pot]; pot=[];
        pool.forEach((h,i)=>{ const m=members[i%members.length]; m.deck.push(h); });
        members.forEach(m=>{ if(m.maxd&&m.deck.length>m.maxd) m.deck.length=m.maxd; m.pts+=60; m.wins++; });
        winner=members[0]?members[0].id:null; }
    } else {
      const max=Math.max(...ps.map(x=>x.v)); const top=ps.filter(x=>x.v===max);
      if(top.length===1){ winner=top[0].pid; const w=P.find(x=>x.id===winner); w.deck.push(...allHeroes,...pot); pot=[]; if(w.maxd&&w.deck.length>w.maxd) w.deck.length=w.maxd; w.pts+=60; w.wins++; }
      else pot.push(...allHeroes);
    }
    send({e:'reveal',plays:ps,stat,winner,pot:pot.length,winTeam},'all');
    const wb=winner&&P.find(x=>x.id===winner); if(wb&&wb.bot){ if(Math.random()<.4) botSay(wb,'win'); if(Math.random()<.45) setTimeout(()=>chat(wb.id,['😎','🔥','💪','😂','GG'][Math.random()*5|0],true),5200); }
    const outs=[]; P.forEach(p=>{ if(!p.out&&total(p)===0){p.out=true; outs.push(p.id);} });
    clearTimeout(timer); timer=setTimeout(()=>{ send({e:'counts',counts:counts()},'all'); outs.forEach(id=>send({e:'out',pid:id},'all')); setTimeout(nextRound,outs.length?1600:400); },7600+(P.length-2)*600);
  }
  function end(){
    phase='end'; started=false;
    const rank=[...P].sort((a,b)=>total(b)-total(a)||b.wins-a.wins);
    let winTeam=null;
    if(SET.teams===2){ const d0=P.filter(p=>p.team===0).every(p=>p.out),d1=P.filter(p=>p.team===1).every(p=>p.out);
      if(d0!==d1) winTeam=d0?1:0;
      else { const s0=P.filter(p=>p.team===0).reduce((a,p)=>a+total(p),0),s1=P.filter(p=>p.team===1).reduce((a,p)=>a+total(p),0); winTeam=s0===s1?-1:(s0>s1?0:1); } }
    if(winTeam==null||winTeam<0) rank[0].pts+=500; else P.filter(p=>p.team===winTeam).forEach(p=>p.pts+=500);
    send({e:'end',match,winTeam,ranking:rank.map(p=>({id:p.id,name:p.name,avatar:p.avatar,cards:total(p),pts:p.pts,bot:p.bot,team:p.team}))},'all');
    P.filter(p=>p.bot).slice(0,2).forEach((p,i)=>setTimeout(()=>botSay(p,'end'),2600+i*1400));
    sendLobby();
  }
  function reset(){ clearTimeout(timer); P=[]; match=0; started=false; phase='idle'; }
  return {addPlayer,removePlayer,addBot,kick,start,act,reset,setSettings,chat,get settings(){return SET;},get players(){return P;},get started(){return started;},setTeam,sendLobby};
})();

/* =================== GÖRÜNÜM (her oyuncuda) =================== */
const VIEW=(()=>{ const self={};
  const A=$('#arena'), B=$('#board'), FX=$('#fx'), MSG=$('#amsg'), HINT=$('#ahint'), BAR=$('#abar'), LOB=$('#lobby');
  let offer=[0,1,2,3,4];
  let W=0,H=0,CW=0,CH=0, me=null, players=[], hand=[], slots={}, potEls=[], seats={}, myTurn=false, phase=null, stat=null, sel=null, selStat=null, selList=[], mateHands={}, mateLast={}, queue=Promise.resolve(), playing=false;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const to=(t,v)=>new Promise(r=>G.to(t,{...v,onComplete:r}));
  const S=(n,o)=>SFX.sfx(n,o);
  function dims(){ W=A.clientWidth; H=A.clientHeight; CW=Math.round(Math.max(96,Math.min(196,W*.28,H*.205))); CH=Math.round(CW*1.4); A.style.setProperty('--cw',CW+'px'); A.style.setProperty('--ch',CH+'px'); }
  const SB=()=>parseFloat(getComputedStyle(document.documentElement).paddingBottom)||0;
  const others=()=>{const i=players.findIndex(p=>p.id===me); return players.slice(i+1).concat(players.slice(0,i));};
  function seatPos(k,n){ // k: 0..n-2 (rakipler)
    const top=Math.max(64,H*.09);
    if(n===2) return {x:W/2,y:top};
    if(n===3) return [{x:W*.25,y:top},{x:W*.75,y:top}][k];
    if(W<700) return [{x:W*.22,y:top+112},{x:W/2,y:top},{x:W*.78,y:top+112}][k];
    return [{x:Math.max(70,W*.1),y:H*.36},{x:W/2,y:top},{x:W-Math.max(70,W*.1),y:H*.36}][k];
  }
  const handPos=(i,n)=>({x:W/2-CW/2+(i-(n-1)/2)*Math.min(CW*.86,(W-CW-44)/Math.max(1,n-1)),y:H-CH-SB()-(isMob()?14:26)+Math.abs(i-(n-1)/2)*7,rotation:(i-(n-1)/2)*(n>3?3:5),scale:n>3?(W<700?.78:.88):1,rotationX:0});
  const slotPos=(idx,n)=>{const sc=Math.min(.86,(W-32)/(n*CW*1.08)); const gap=CW*sc*1.08; return {x:W/2-CW/2+(idx-(n-1)/2)*gap,y:H*(W<700&&players.length>3?.47:.43)-CH/2-(isMob()&&players.length<4?20:0),scale:sc,rotation:(idx-(n-1)/2)*2,rotationX:32};};
  const myPilePos=()=>({x:Math.max(12,W*.03),y:H-CH*.7-SB()-30,scale:.5,rotation:-8,rotationX:0});
  function mkCard(heroId,from,up){
    const el=document.createElement('div'); el.className='hc';
    el.innerHTML=`<div class="in"><div class="face">${heroId?`<img alt="" draggable="false" src="${cardFace(HERO_BY[heroId])}">`:''}<div class="srs">${STATS.map((s,i)=>`<button class="sr" data-k="${i}" type="button" tabindex="-1" aria-label="${s}"></button>`).join('')}</div></div><div class="back">${CARD_BACK_HTML}</div></div>`;
    if(heroId&&FOIL.has(heroId)) el.classList.add('foil');
    el.style.setProperty('--sy0',(STAT_Y0/CARD_H*100)+'%'); el.style.setProperty('--sdy',(STAT_DY/CARD_H*100)+'%');
    B.appendChild(el); G.set(el,{...from,transformPerspective:1200}); G.set(el.querySelector('.in'),{rotationY:up?0:180}); el._up=!!up; el._hero=heroId; return el;
  }
  function setFace(el,heroId){ el._hero=heroId; const f=el.querySelector('.face'); if(!f.querySelector('img')) f.insertAdjacentHTML('afterbegin',`<img alt="" draggable="false" src="${cardFace(HERO_BY[heroId])}">`); }
  const flip=(el,up=true,d=.6)=>{el._up=up; S('flip',{rate:.9+Math.random()*.2}); return to(el.querySelector('.in'),{rotationY:up?0:180,duration:d,ease:'power3.inOut'});};
  function layoutHand(d=.5){ hand.forEach((c,i)=>{ if(c===sel) return; G.to(c.el,{...handPos(i,hand.length),zIndex:10+i,duration:d,ease:'expo.out'}); }); }
  function posFor(p){ const n=players.length, meP=players.find(x=>x.id===me);
    const tm=meP&&players.find(x=>x.id!==me&&x.team!=null&&x.team===meP.team);
    if(VIEW._teams&&tm){ const top=Math.max(64,H*.09)+(W<700?92:0);
      if(p.id===tm.id) return {x:W/2,y:top};
      const oi=others().filter(x=>x.id!==tm.id).indexOf(p), sgn=oi===0?-1:1;
      return W<700?{x:W/2+sgn*W*.27,y:top+122}:{x:W/2+sgn*Math.max(95,W*.25),y:H*.4}; }
    return seatPos(others().indexOf(p),n); }
  function buildSeats(){
    $$('.seat',A).forEach(s=>s.remove()); seats={};
    const op=others(), n=players.length;
    op.forEach((p,k)=>{ const s=document.createElement('div'); s.className='seat'; s.innerHTML=`${avatarHTML({display:p.name,username:p.name,avatar:p.avatar},44)}<div class="sn"><b>${p.team===0||p.team===1?`<i class="tm tm${p.team}"></i>`:''}${p.host?'👑 ':''}${esc(p.name)}</b><small class="mono"><span class="cnt">0</span> kart · <span class="stt">bekliyor</span></small></div><div class="ofan" aria-hidden="true"></div>`; A.appendChild(s); const pos=posFor(p); G.set(s,{x:pos.x,y:pos.y,xPercent:-50,yPercent:-50}); seats[p.id]=s; });
    const mine=document.createElement('div'); mine.className='seat mine'; const mp=players.find(p=>p.id===me); mine.innerHTML=`${avatarHTML({display:mp.name,username:mp.name,avatar:mp.avatar},40)}<div class="sn"><b>${mp.team===0||mp.team===1?`<i class="tm tm${mp.team}"></i>`:''}${esc(mp.name)}</b><small class="mono"><span class="cnt">0</span> kart · <span class="stt">sen</span></small></div>`; A.appendChild(mine); seats[me]=mine;
  }
  function seatXY(pid){ if(pid===me){const p=myPilePos(); return {x:p.x+CW*.25,y:p.y+CH*.25};} const s=seats[pid]; if(!s) return {x:W/2,y:0}; const r=s.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; }
  function setStatus(pid,t,cls){ const s=seats[pid]; if(!s) return; s.querySelector('.stt').textContent=t; s.classList.toggle('ready',cls==='ready'); }
  function setTurnGlow(pid){ Object.entries(seats).forEach(([id,s])=>s.classList.toggle('turn',id===pid)); }
  function msg(big,small,color,hold=1.0){
    MSG.innerHTML=`<span class="mt">${esc(big)}</span>${small?`<small>${esc(small)}</small>`:''}`; MSG.style.setProperty('--mc',color||'var(--fg)');
    G.killTweensOf(MSG); return new Promise(r=>G.timeline({onComplete:r}).fromTo(MSG,{opacity:0,scale:1.5,rotation:-4,filter:'blur(10px)'},{opacity:1,scale:1,rotation:-2,filter:'blur(0px)',duration:.45,ease:'expo.out'}).to(MSG,{opacity:0,scale:.92,duration:.3,ease:'power2.in'},'+='+hold));
  }
  const hint=t=>{HINT.textContent=t||''; if(t) G.fromTo(HINT,{opacity:0,y:8},{opacity:1,y:0,duration:.4}); else G.to(HINT,{opacity:0,duration:.2});};
  function shake(power=10,n=8){G.fromTo([B,'#arena .atable'],{x:0,y:0},{x:()=>(Math.random()-.5)*power,y:()=>(Math.random()-.5)*power,duration:.04,repeat:n,yoyo:true,ease:'none',onComplete:()=>G.set([B,'#arena .atable'],{x:0,y:0})});}
  function flash(color,o=.55){const f=document.createElement('div'); f.className='fxflash'; f.style.background=color; FX.appendChild(f); G.fromTo(f,{opacity:o},{opacity:0,duration:.55,ease:'power2.out',onComplete:()=>f.remove()});}
  function svgLayer(){const s=document.createElementNS('http://www.w3.org/2000/svg','svg'); s.setAttribute('class','fxsvg'); s.setAttribute('viewBox',`0 0 ${W} ${H}`); FX.appendChild(s); return s;}
  function particles(x,y,color,n=40,spread=260,implode=false){
    for(let i=0;i<n;i++){const p=document.createElement('i'); p.className='fxp'; p.style.background=color; p.style.color=color; FX.appendChild(p); const a=Math.random()*6.283, d=spread*(.3+Math.random()*.7);
      if(implode) G.fromTo(p,{x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,opacity:0,scale:.5},{x,y,opacity:1,scale:1.4,duration:.7+Math.random()*.3,ease:'power3.in',onComplete:()=>p.remove()});
      else G.fromTo(p,{x,y,opacity:1,scale:1.4},{x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,opacity:0,scale:.3,duration:.8+Math.random()*.5,ease:'expo.out',onComplete:()=>p.remove()});}
  }
  /* tur ve maç kazanma şovu */
  (function(){ if(document.getElementById('cwinCss')) return; const st=document.createElement('style'); st.id='cwinCss'; st.textContent=`
    .cwin{position:absolute;inset:0;z-index:70;pointer-events:none;display:grid;place-items:center;overflow:hidden}
    .cwin .rays{position:absolute;left:50%;top:50%;width:220vmax;height:220vmax;margin:-110vmax 0 0 -110vmax;background:repeating-conic-gradient(from 0deg,var(--wc) 0deg 6deg,transparent 6deg 16deg);-webkit-mask-image:radial-gradient(circle,#000 0,transparent 55%);mask-image:radial-gradient(circle,#000 0,transparent 55%);opacity:.0}
    .cwin .ring{position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px;border-radius:50%;border:10px solid var(--wc);box-shadow:0 0 40px var(--wc)}
    .cwin .wt{position:relative;font-family:var(--display);font-size:clamp(54px,13vw,140px);line-height:.9;letter-spacing:.04em;color:var(--wc);-webkit-text-stroke:4px #07060b;paint-order:stroke fill;text-shadow:7px 7px 0 #07060b,0 0 60px var(--wc);text-align:center;transform:rotate(-5deg)}
    .cwin .wt small{display:block;font-size:.3em;letter-spacing:.2em;color:#fff;-webkit-text-stroke:2px #07060b;margin-top:.25em}
    .cwin .tro{font-size:clamp(90px,22vw,200px);line-height:1;filter:drop-shadow(0 0 40px var(--wc)) drop-shadow(6px 8px 0 #07060b)}
    .cwin .coin{position:absolute;width:34px;height:34px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff6c8,#ffd34d 42%,#c98a12);border:3px solid #07060b}
    .cwin .conf{position:absolute;top:-20px;width:10px;height:16px;border-radius:2px}`; document.head.appendChild(st); })();
  function winShow(text,sub,big){ if(MTSET.fx===false) return; const col=big?'#FFD34D':'#FFB627';
    const o=document.createElement('div'); o.className='cwin'; o.style.setProperty('--wc',col);
    o.innerHTML=`<i class="rays"></i><i class="ring"></i><div style="display:grid;justify-items:center;gap:6px">${big?'<div class="tro">🏆</div>':''}<div class="wt">${esc(text)}${sub?`<small>${esc(sub)}</small>`:''}</div></div>`; A.appendChild(o);
    const rays=o.querySelector('.rays'), ring=o.querySelector('.ring'), wt=o.querySelector('.wt'), tro=o.querySelector('.tro');
    flash(col,.5); shake(big?18:10,big?14:8); buzz(big?[60,40,60,40,140]:[40,40,60]);
    G.fromTo(rays,{opacity:0,rotation:0,scale:.4},{opacity:.6,scale:1,rotation:90,duration:big?2.6:1.5,ease:'power2.out'});
    G.fromTo(ring,{scale:.2,opacity:1},{scale:big?60:36,opacity:0,duration:.9,ease:'expo.out'});
    G.fromTo(wt,{scale:4,opacity:0,rotation:-14},{scale:1,opacity:1,rotation:-5,duration:.55,ease:'back.out(2.2)'});
    if(tro) G.fromTo(tro,{y:-H,rotation:-30},{y:0,rotation:0,duration:.8,ease:'bounce.out',delay:.15});
    const cx=W/2, cy=H*.45; particles(cx,cy,col,big?90:50,big?520:340); particles(cx,cy,'#fff',big?40:22,big?420:260); if(big) setTimeout(()=>particles(cx,cy,'#FF3B4E',60,460),250);
    for(let i=0;i<(big?26:12);i++){ const c=document.createElement('i'); c.className='coin'; o.appendChild(c); const a=Math.random()*6.283, d=(big?260:160)+Math.random()*200;
      G.fromTo(c,{x:0,y:0,scale:.3,rotation:0},{x:Math.cos(a)*d,y:Math.sin(a)*d*.7-60,scale:1,rotation:360*(Math.random()-.5)*3,duration:.9,ease:'expo.out',delay:Math.random()*.15});
      G.to(c,{y:'+=260',opacity:0,duration:.8,ease:'power2.in',delay:1}); }
    if(big){ const CC=['#FF3B4E','#FFD34D','#4AA3FF','#39D98A','#B06BFF','#fff']; for(let i=0;i<110;i++){ const c=document.createElement('i'); c.className='conf'; c.style.left=(Math.random()*100)+'%'; c.style.background=CC[i%CC.length]; o.appendChild(c);
      G.to(c,{y:H+60,x:(Math.random()-.5)*200,rotation:Math.random()*720,duration:2.2+Math.random()*1.8,delay:Math.random()*1.2,ease:'power1.in'}); } SFX.sfx&&SFX.sfx('intro',{vol:.5}); }
    else S('coin',{vol:.7});
    G.to(o,{opacity:0,duration:.45,delay:big?3.6:1.7,onComplete:()=>o.remove()}); }
  function comicWord(text,x,y,color){
    const w=document.createElement('div'); w.className='cword'; w.style.setProperty('--c',color);
    let pts=''; for(let i=0;i<24;i++){const a=i/24*6.283, r=i%2?36:50+Math.random()*10; pts+=`${(50+Math.cos(a)*r).toFixed(1)},${(50+Math.sin(a)*r*.7).toFixed(1)} `;}
    w.innerHTML=`<svg viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="${pts}" fill="#FFD34A" stroke="#07060b" stroke-width="3"/><polygon points="${pts}" fill="url(#ht)" opacity=".35"/></svg><span>${esc(text)}</span>`;
    FX.appendChild(w); const rot=(Math.random()-.5)*24;
    G.fromTo(w,{x,y,xPercent:-50,yPercent:-50,scale:0,rotation:rot-30},{scale:1,rotation:rot,duration:.45,ease:'back.out(2.5)'});
    G.to(w,{scale:1.15,opacity:0,duration:.35,delay:1.3,ease:'power2.in',onComplete:()=>w.remove()});
  }
  const center=el=>{const r=el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};};
  async function effect(wEl,lEl,h){
    const type=h.fx, c=h.c, wc=center(wEl), lc=center(lEl), L=lEl;
    if(type==='thunder'){ const s=svgLayer(); for(let k=0;k<3;k++){ let x=lc.x+(Math.random()-.5)*60, y=-20, d=`M${x} ${y}`; while(y<lc.y){y+=H*.06; x+=(Math.random()-.5)*50; d+=` L${x} ${Math.min(y,lc.y)}`;} d+=` L${lc.x} ${lc.y}`;
        s.insertAdjacentHTML('beforeend',`<path d="${d}" stroke="${c}" stroke-width="16" fill="none" opacity=".4" filter="blur(6px)"/><path d="${d}" stroke="#07060b" stroke-width="7" fill="none"/><path d="${d}" stroke="#fff" stroke-width="3.5" fill="none"/>`); await sleep(60);}
      flash('#bfe3ff',.7); shake(18,10); particles(lc.x,lc.y,c,46,240); G.fromTo(s,{opacity:1},{opacity:0,duration:.6,ease:'steps(6)',onComplete:()=>s.remove()}); G.to(L,{filter:'brightness(3) saturate(0)',duration:.08,yoyo:true,repeat:5}); await sleep(700); G.set(L,{filter:'brightness(.45)'}); }
    else if(type==='smash'){ const p0=G.getProperty(wEl,'x'), q0=G.getProperty(wEl,'y'), s0=G.getProperty(wEl,'scale');
      await to(wEl,{y:q0-H*.16,scale:s0*1.2,rotation:-12,duration:.3,ease:'power2.out'}); await to(wEl,{x:G.getProperty(L,'x'),y:G.getProperty(L,'y'),rotation:0,duration:.15,ease:'power4.in'});
      flash(c,.45); shake(28,12); const ring=document.createElement('div'); ring.className='fxring'; ring.style.borderColor=c; ring.style.left=lc.x+'px'; ring.style.top=lc.y+'px'; FX.appendChild(ring); G.fromTo(ring,{scale:.2,opacity:1},{scale:6,opacity:0,duration:.9,ease:'expo.out',onComplete:()=>ring.remove()});
      particles(lc.x,lc.y,'#bbb',36,300); particles(lc.x,lc.y,c,24,200); G.to(L,{rotation:'+=10',y:'+=16',filter:'brightness(.45)',duration:.3}); await sleep(300); await to(wEl,{x:p0,y:q0,scale:s0,rotation:0,duration:.45,ease:'expo.out'}); }
    else if(type==='beam'){ const dx=lc.x-wc.x, dy=lc.y-wc.y, len=Math.hypot(dx,dy), ang=Math.atan2(dy,dx)*180/Math.PI;
      const ch=document.createElement('div'); ch.className='fxorb'; ch.style.background=`radial-gradient(circle,#fff 0 20%,${c} 45%,transparent 70%)`; ch.style.left=wc.x+'px'; ch.style.top=wc.y+'px'; FX.appendChild(ch); await to(ch,{scale:2.2,duration:.4,ease:'power2.in'});
      const bm=document.createElement('div'); bm.className='fxbeam'; bm.style.cssText=`left:${wc.x}px;top:${wc.y}px;width:${len}px;--c:${c}`; FX.appendChild(bm); G.set(bm,{rotation:ang,transformOrigin:'0% 50%'});
      G.fromTo(bm,{scaleX:0},{scaleX:1,duration:.14,ease:'power2.out'}); flash(c,.35); shake(12,10); G.to(L,{filter:'brightness(2.4) sepia(1) saturate(4) hue-rotate(-20deg)',duration:.1}); await sleep(160); particles(lc.x,lc.y,c,50,260);
      G.to(bm,{scaleY:0,opacity:0,duration:.5,delay:.35,ease:'power2.in',onComplete:()=>bm.remove()}); G.to(ch,{scale:0,opacity:0,duration:.4,delay:.3,onComplete:()=>ch.remove()}); await sleep(650); G.to(L,{filter:'brightness(.4) sepia(.6)',duration:.4}); }
    else if(type==='web'){ const s=svgLayer();
      for(let k=0;k<5;k++){const tx=lc.x+(Math.random()-.5)*lc.w*.7, ty=lc.y+(Math.random()-.5)*lc.h*.7; const ln=document.createElementNS('http://www.w3.org/2000/svg','line'); [['x1',wc.x],['y1',wc.y],['x2',tx],['y2',ty],['stroke','#fff'],['stroke-width','2.5'],['pathLength','1'],['stroke-dasharray','1'],['stroke-dashoffset','1']].forEach(([a,v])=>ln.setAttribute(a,v)); s.appendChild(ln); G.to(ln,{strokeDashoffset:0,duration:.18,delay:k*.07});}
      await sleep(450); let w=''; for(let i=0;i<12;i++){const a=i/12*6.283; w+=`<line x1="${lc.x}" y1="${lc.y}" x2="${lc.x+Math.cos(a)*lc.w*.75}" y2="${lc.y+Math.sin(a)*lc.h*.6}" stroke="#fff" stroke-width="1.6"/>`;}
      for(let r=.15;r<.8;r+=.13){let p='';for(let i=0;i<=12;i++){const a=i/12*6.283;p+=(i?'L':'M')+(lc.x+Math.cos(a)*lc.w*r)+' '+(lc.y+Math.sin(a)*lc.h*r*.8);} w+=`<path d="${p}" stroke="#fff" stroke-width="1.3" fill="none"/>`;}
      const g=document.createElementNS('http://www.w3.org/2000/svg','g'); g.innerHTML=w; s.appendChild(g); G.fromTo(g,{scale:.2,opacity:0,transformOrigin:`${lc.x}px ${lc.y}px`},{scale:1,opacity:.95,duration:.4,ease:'back.out(2)'}); shake(6,6);
      G.to(L,{filter:'brightness(.55) grayscale(.6)',duration:.4}); await sleep(800); G.to(s,{opacity:0,duration:.4,onComplete:()=>s.remove()}); }
    else if(type==='portal'){ const ring=document.createElement('div'); ring.className='fxportal'; ring.style.left=lc.x+'px'; ring.style.top=lc.y+'px'; ring.style.setProperty('--c',c); FX.appendChild(ring);
      G.fromTo(ring,{scale:0,rotation:0},{scale:1,rotation:360,duration:.7,ease:'back.out(1.4)'}); G.to(ring,{rotation:'+=720',duration:2.2,ease:'none'}); particles(lc.x,lc.y,c,40,lc.w*1.1);
      await sleep(450); const s0=G.getProperty(L,'scale'); await to(L,{rotation:'+=540',scale:.1,opacity:.2,duration:.85,ease:'power3.in'}); flash(c,.3); await to(ring,{scale:0,duration:.3,ease:'back.in(2)'}); ring.remove(); G.set(L,{opacity:1,scale:s0*.8,rotation:0,filter:'brightness(.45)'}); }
    else if(type==='shield'){ const hx=document.createElement('div'); hx.className='fxhex'; hx.style.setProperty('--c',c); hx.style.left=wc.x+'px'; hx.style.top=wc.y+'px'; FX.appendChild(hx);
      await to(hx,{scale:1,opacity:1,duration:.3,ease:'back.out(2)',startAt:{scale:.2,opacity:0}}); G.to(hx,{x:lc.x-wc.x,y:lc.y-wc.y,duration:.2,ease:'power3.in'}); await sleep(200);
      flash('#fff',.3); shake(16,8); particles(lc.x,lc.y,c,30,220); G.to(L,{x:'+='+(lc.x>=wc.x?50:-50),rotation:lc.x>=wc.x?18:-18,filter:'brightness(.45)',duration:.35,ease:'power3.out'}); G.to(hx,{scale:2.4,opacity:0,duration:.5,onComplete:()=>hx.remove()}); await sleep(600); }
    else if(type==='slash'){ for(let i=0;i<3;i++){const sl=document.createElement('div'); sl.className='fxslash'; sl.style.setProperty('--c',c); sl.style.left=(lc.x-lc.w*.4+i*lc.w*.28)+'px'; sl.style.top=(lc.y-lc.h*.55)+'px'; sl.style.height=lc.h*1.1+'px'; FX.appendChild(sl); G.set(sl,{rotation:22});
        G.fromTo(sl,{clipPath:'inset(0 0 100% 0)'},{clipPath:'inset(0 0 0% 0)',duration:.12,ease:'power4.in',onComplete:()=>{shake(8,4); G.to(sl,{opacity:0,duration:.5,delay:.3,onComplete:()=>sl.remove()});}}); await sleep(110);}
      particles(lc.x,lc.y,c,30,200); G.to(L,{filter:'brightness(.45)',x:'+=6',duration:.2}); await sleep(550); }
    else if(type==='magic'){ for(let i=0;i<36;i++){const p=document.createElement('i'); p.className='fxp'; p.style.background=i%3?c:'#fff'; p.style.color=c; FX.appendChild(p); const o={a:Math.random()*6.283,r:lc.w*1.2}; G.to(o,{a:o.a+6,r:0,duration:1.1+Math.random()*.4,ease:'power2.in',onUpdate:()=>G.set(p,{x:lc.x+Math.cos(o.a)*o.r,y:lc.y+Math.sin(o.a)*o.r*.8}),onComplete:()=>p.remove()});}
      G.to(L,{filter:`drop-shadow(0 0 20px ${c}) brightness(1.4) hue-rotate(40deg)`,duration:.8}); await sleep(1050); flash(c,.4); shake(10,6); particles(lc.x,lc.y,c,30,240); G.to(L,{filter:'brightness(.45) hue-rotate(40deg)',rotation:'+=8',duration:.3}); await sleep(350); }
    else if(type==='cosmic'){ const v=document.createElement('div'); v.className='fxvig'; v.style.setProperty('--c',c); FX.appendChild(v); G.fromTo(v,{opacity:0},{opacity:1,duration:.5});
      particles(lc.x,lc.y,'#fff',50,Math.max(W,H)*.6,true); particles(lc.x,lc.y,c,40,Math.max(W,H)*.5,true); await sleep(950);
      flash('#fff',.8); shake(32,14); particles(lc.x,lc.y,c,70,360); const ring=document.createElement('div'); ring.className='fxring'; ring.style.borderColor=c; ring.style.left=lc.x+'px'; ring.style.top=lc.y+'px'; FX.appendChild(ring); G.fromTo(ring,{scale:.2,opacity:1},{scale:9,opacity:0,duration:1.1,ease:'expo.out',onComplete:()=>ring.remove()});
      G.to(L,{filter:'brightness(.3) saturate(0)',duration:.3}); G.to(v,{opacity:0,duration:.8,delay:.4,onComplete:()=>v.remove()}); await sleep(650); }
    else if(type==='zap'){ const s=svgLayer(); for(let f=0;f<7;f++){s.innerHTML=''; for(let k=0;k<3;k++){let x=lc.x-lc.w*.5, d=`M${x} ${lc.y+(Math.random()-.5)*lc.h}`; for(let i=0;i<7;i++){x+=lc.w/7; d+=` L${x} ${lc.y+(Math.random()-.5)*lc.h*.9}`;} s.insertAdjacentHTML('beforeend',`<path d="${d}" stroke="${c}" stroke-width="8" opacity=".4" fill="none"/><path d="${d}" stroke="#fff" stroke-width="2" fill="none"/>`);} G.set(L,{x:'+='+((f%2?1:-1)*4)}); await sleep(55);}
      s.remove(); flash(c,.3); particles(lc.x,lc.y,c,24,180); G.to(L,{filter:'brightness(.45)',duration:.2}); await sleep(250); }
    else if(type==='fire'){ for(let i=0;i<46;i++){const p=document.createElement('i'); p.className='fxp fire'; const col=['#FFD34A','#FF6A00','#FF3B4E'][i%3]; p.style.background=col; p.style.color=col; FX.appendChild(p); const sx=lc.x+(Math.random()-.5)*lc.w; G.fromTo(p,{x:sx,y:lc.y+lc.h*.45,scale:1.6+Math.random(),opacity:1},{x:sx+(Math.random()-.5)*40,y:lc.y-lc.h*(.4+Math.random()*.6),scale:.2,opacity:0,duration:.8+Math.random()*.6,delay:Math.random()*.6,ease:'power2.out',onComplete:()=>p.remove()});}
      G.to(L,{filter:'brightness(1.8) sepia(1) saturate(5) hue-rotate(-25deg)',duration:.3}); flash('#FF6A00',.3); shake(10,8); await sleep(1100); G.to(L,{filter:'brightness(.25) sepia(1)',duration:.4}); }
    else if(type==='arrow'){ const ar=document.createElement('div'); ar.className='fxarrow'; ar.style.setProperty('--c',c); FX.appendChild(ar); const ang=Math.atan2(lc.y-wc.y,lc.x-wc.x)*180/Math.PI;
      G.set(ar,{x:wc.x,y:wc.y,rotation:ang}); SFX.sfx('whoosh',{vol:.5,rate:1.6}); await to(ar,{x:lc.x,y:lc.y,duration:.22,ease:'power2.in'}); shake(12,6); flash(c,.25); particles(lc.x,lc.y,c,30,160); G.to(L,{rotation:'+=14',filter:'brightness(.45)',duration:.2}); G.to(ar,{opacity:0,delay:.6,duration:.3,onComplete:()=>ar.remove()}); await sleep(600); }
    else { flash('#FFD34A',.6); shake(26,12); const ring=document.createElement('div'); ring.className='fxring'; ring.style.borderColor='#FFD34A'; ring.style.left=lc.x+'px'; ring.style.top=lc.y+'px'; FX.appendChild(ring); G.fromTo(ring,{scale:.2,opacity:1},{scale:7,opacity:0,duration:.9,ease:'expo.out',onComplete:()=>ring.remove()});
      particles(lc.x,lc.y,'#FFD34A',40,300); particles(lc.x,lc.y,'#FF6A00',40,240); particles(lc.x,lc.y,'#555',20,200); G.to(L,{filter:'brightness(.3)',rotation:'+=12',duration:.2}); await sleep(800); }
  }
  // ---------- olaylar ----------
  function ev(e){ queue=queue.then(()=>handle(e)).catch(err=>console.error(err)); }
  async function handle(e){
    if(e.e==='lobby'){ LOBBY.render(e); return; }
    if(e.e==='kicked'){ toast('Odadan çıkarıldın','Kurucu seni odadan çıkardı.'); LOBBY.leave(); return; }
    if(e.e==='info'){ toast('Oda',e.text); return; }
    if(e.e==='left'){ CHAT.sys(`${e.name} odadan çıktı${e.started?' · yerine bot oynuyor':''}`); toast('Oyuncu ayrıldı',`${e.name} odadan çıktı`); SFX.play('wrong'); const s=seats[e.pid]; if(s){ s.classList.add('left'); s.querySelector('.stt').textContent='çıktı'; } return; }
    if(e.e==='chat'){ CHAT.add(e); const s=e.pid===me?null:seats[e.pid]; if(s&&e.emo) emoPop(s,e.text); return; }
    if(e.e==='spec'){ specView(e.hands); return; }
    if(e.e==='start'){
      try{armGame('cards',80);}catch(e){}
      await (document.fonts?document.fonts.load('38px Bangers').catch(()=>{}):0);
      playing=true; LOB.hidden=true; $$('.aend',A).forEach(x=>x.remove()); B.innerHTML=''; FX.innerHTML=''; hand=[]; slots={}; potEls=[]; sel=null; selStat=null; selList=[]; mateHands={}; mateLast={}; BAR.innerHTML='';
      players=e.players; dims(); buildSeats(); updCounts(e.counts); A.dataset.theme=(e.settings&&e.settings.theme)||'default'; VIEW._teams=!!(e.settings&&e.settings.teams===2); VIEW._ct=((e.settings&&e.settings.ct)||1);
      const pile=document.createElement('div'); pile.className='mypile'; pile.innerHTML=CARD_BACK_HTML+'<b>0</b>'; B.appendChild(pile); G.set(pile,{...myPilePos(),transformOrigin:'0 0'});
      const ld=players.find(p=>p.id===e.leader);
      SFX.sfx('reveal',{vol:.6}); await msg(`Maç ${e.match}`,`${ld.id===me?'İlk turu sen başlatıyorsun':ld.name+' başlatıyor'} · ${players.length} oyuncu`,'var(--gold)',1.2); return;
    }
    if(e.e==='counts'){ updCounts(e.counts); return; }
    if(e.e==='mate'){ mateHands[e.pid]=e.cards||[]; mateLast[e.pid]=e.last||null; renderMate(); return; }
    if(e.e==='hand'){
      const cur=hand.map(h=>h.hero);
      for(const id of e.cards){ if(cur.includes(id)) continue; const el=mkCard(id,{...myPilePos(),zIndex:30},false); hand.push({hero:id,el}); S('deal',{rate:.9+Math.random()*.25,pan:-.3}); layoutHand(.6); await sleep(150); }
      hand=hand.filter(h=>e.cards.includes(h.hero)); await sleep(300);
      for(const h of hand) if(!h.el._up) flip(h.el,true,.5);
      await sleep(350); return;
    }
    if(e.e==='turn'){
      clearInterval(VIEW._ti); if(e.timer){ const end=Date.now()+e.timer*1000; const tb=$('#atimer'); tb.hidden=false; G.fromTo(tb.firstElementChild,{scaleX:1},{scaleX:0,duration:e.timer,ease:'none'}); let last=99; VIEW._ti=setInterval(()=>{ const l=Math.ceil((end-Date.now())/1000); tb.dataset.s=l>0?l+' sn':''; if(e.pid===me&&l<=5&&l>0&&l!==last){last=l; SFX.play('tick',l); buzz(6);} if(l<=0) clearInterval(VIEW._ti); },200); } else $('#atimer').hidden=true;
      phase=e.phase; stat=e.stat; offer=e.offer||[0,1,2,3,4]; myTurn=e.pid===me; setTurnGlow(e.pid);
      Object.keys(seats).forEach(id=>{ if(!e.order.includes(id)) return; const i=e.order.indexOf(id), j=e.order.indexOf(e.pid); setStatus(id,i<j?'hazır':i===j?'seçiyor…':'sırada',i<j?'ready':''); });
      $('#aRound').textContent='TUR '+e.round;
      if(myTurn){ S('turn'); buzz([10,40,10]); const _cn=ctNeed(); if(phase==='lead'){ await msg('Sıra sende',offer.length>=5?'Bu tur istediğin özelliği seçebilirsin':`Bu tur seçebileceğin: ${offer.map(i=>STATS[i]).join(' ya da ')}`,'var(--gold)',.8); hint(_cn>1?`${_cn} kart seç, sonra ${offer.map(i=>STATS[i]).join(' / ')} seç`:`Bir kart seç, sonra ${offer.map(i=>STATS[i]).join(' / ')} seç`); } else { hint(_cn>1?`${_cn} kart seç — ${STATS[stat]} için toplamları karşılaştırılır`:`${STATS[stat]} için bir kart seç`); $$('.hc .sr',B).forEach(x=>x.classList.toggle('hl',+x.dataset.k===stat)); } enablePick(); }
      else { const p=players.find(x=>x.id===e.pid); hint(`${p.name} ${phase==='lead'?'kartını ve özelliğini seçiyor':'kartını seçiyor'}…`); }
      return;
    }
    if(e.e==='sel'){ if(e.pid!==me){ const s=seats[e.pid]; if(s) G.fromTo(s,{scale:1.06},{scale:1,duration:.4}); S('swap',{vol:.35}); } return; }
    if(e.e==='played'){
      const n=players.filter(p=>!p.out).length, order=players.filter(p=>!p.out).map(p=>p.id); const idx=Math.max(0,order.indexOf(e.pid));
      const hs=e.heroes||[e.hero]; const cnt=Math.max(1,hs.length);
      const sp=slotPos(idx,n), from=seatXY(e.pid);
      const g=document.createElement('div'); g.className='slotG'; g._pid=e.pid; g.style.cssText='position:absolute;left:0;top:0;width:0;height:0'; B.appendChild(g);
      const els=[];
      if(e.pid===me){ myTurn=false; disablePick(); hint(''); selList=[]; sel=null;
        for(const hid of hs){ const hh=hand.find(x=>x.hero===hid); if(hh){ hand=hand.filter(x=>x!==hh); g.appendChild(hh.el); hh.el.classList.remove('picked'); $$('.sr',hh.el).forEach(x=>x.classList.remove('hl','on')); els.push(hh.el); } }
        if(!els.length){ g.remove(); return; }
        layoutHand(.5); S('whoosh',{vol:.45,rate:1.2});
      } else {
        const f=seats[e.pid]&&seats[e.pid].querySelector('.ofan'); if(f&&f.lastElementChild){ const lc=f.lastElementChild; G.to(lc,{y:40,opacity:0,duration:.25,onComplete:()=>lc.remove()}); }
        for(let k=0;k<cnt;k++){ const el=mkCard(null,{x:0,y:0,scale:.3,rotation:(k-(cnt-1)/2)*8,rotationX:50,zIndex:k},false); g.appendChild(el); els.push(el); }
        setStatus(e.pid,'hazır','ready'); S('deal',{pan:.2});
        const meP0=players.find(x=>x.id===me), tp0=players.find(x=>x.id===e.pid); const isMate=!!(VIEW._teams&&meP0&&tp0&&meP0.team!=null&&tp0.team===meP0.team&&tp0.id!==meP0.id);
        if(isMate){ els.forEach((el,k)=>{ const hid=hs[k]||hs[0]; try{ setFace(el,hid); flip(el,true,.4); }catch(_){} }); }
      }
      slots[e.pid]=g; g._cards=els; g._up=false;
      const _mp=players.find(x=>x.id===me),_op2=players.find(x=>x.id===e.pid),_seeV=(e.pid===me)||!!(VIEW._teams&&_mp&&_op2&&_mp.team!=null&&_op2.team===_mp.team);
      if(_seeV){ const _st=e.stat!=null?e.stat:stat; els.forEach((el,k)=>{ const hid=hs[k]||hs[0]; const h=HERO_BY[hid]; const v=_st!=null&&h?h.s[_st]:null; if(v==null)return;
        const lb=document.createElement('div'); lb.style.cssText='position:absolute;left:50%;bottom:2px;transform:translateX(-50%);font-size:10px;font-weight:800;color:var(--gold);background:rgba(0,0,0,.72);padding:1px 6px;border-radius:4px;pointer-events:none;z-index:6'; lb.textContent=v; el.appendChild(lb); }); }
      const _ab=seats[e.pid]&&seats[e.pid].querySelector('.afkB'); if(_ab) _ab.remove();
      const gx=sp.x+CW/2, gy=sp.y+CH/2;
      G.set(g,{x:from.x,y:from.y,scale:.3,rotation:0,rotationX:50,transformPerspective:1200,zIndex:20+idx});
      els.forEach(el=>G.set(el,{x:-CW/2,y:-CH/2,scale:1,rotation:0,rotationX:0}));
      await to(g,{x:gx,y:gy,scale:sp.scale,rotation:sp.rotation,rotationX:sp.rotationX,duration:.55,ease:'expo.out'});
      els.forEach((el,k)=>G.to(el,{x:-CW/2+(k-(cnt-1)/2)*CW*.55,y:-CH/2,rotation:(k-(cnt-1)/2)*4,duration:.3,delay:k*.05,ease:'back.out(2)'}));
      S('cardhit',{vol:.6});
      return;
    }
    if(e.e==='stat'){ stat=e.stat; VIEW._teams&&afkArm(); const p=players.find(x=>x.id===e.pid); S('confirm'); await msg(STATS[e.stat],`${e.pid===me?'Senin seçimin':p.name+' seçti'} · en yüksek kazanır`,'var(--gold)',.9); return; }
    if(e.e==='reveal'){
      window.CGSTATS&&CGSTATS.round(e); afkClear();
      hint(''); setTurnGlow(null); clearInterval(VIEW._ti); $('#atimer').hidden=true;
      for(const pl of e.plays){ const el=slots[pl.pid]; if(!el) continue; const cs=el._cards||[el], hs2=pl.heroes||[pl.hero]; cs.forEach((c,k)=>{ if(!c._hero) setFace(c,hs2[k]||pl.hero); }); }
      await sleep(200); S('reveal');
      e.plays.forEach((pl,i)=>{ const el=slots[pl.pid]; if(el) G.to(el,{rotationX:4,y:'-=18',duration:.5,delay:i*.08,ease:'back.out(1.6)'}); }); await sleep(350);
      await Promise.all(e.plays.map((pl,i)=>{ const el=slots[pl.pid]; if(!el||el._up) return Promise.resolve(); const cs=el._cards||[el]; return sleep(i*120).then(()=>Promise.all(cs.map((c,k)=>sleep(k*90).then(()=>flip(c,true,.55))))); }));
      e.plays.forEach(pl=>{ const el=slots[pl.pid]; if(!el) return; (el._cards||[el]).forEach(c=>{ const sr=c.querySelector(`.sr[data-k="${e.stat}"]`); sr&&sr.classList.add('hl'); }); if(pl.b){ const bb=document.createElement('span'); bb.className='bonus'; bb.textContent='+'+pl.b+' SON ŞANS'; (el._cards||[el])[0].appendChild(bb); G.from(bb,{scale:0,rotation:-30,duration:.5,ease:'back.out(3)'}); } G.fromTo(el,{y:'-=10'},{y:'+=10',duration:.4,ease:'back.out(3)'}); });
      await sleep(900);
      if(e.winner){
        const wp=e.plays.find(p=>p.pid===e.winner), wEl=slots[e.winner], h=HERO_BY[wp.hero];
        const winIds=new Set(e.plays.filter(pl=>{ if(VIEW._teams&&e.winTeam>=0){ const pp=players.find(x=>x.id===pl.pid); return pp&&pp.team===e.winTeam; } return pl.pid===e.winner; }).map(pl=>pl.pid));
        const wEls=[...winIds].map(id=>slots[id]).filter(Boolean);
        wEls.forEach((wel,wi)=>{ (wel._cards||[wel]).forEach(c=>c.classList.add('glow','champ')); G.set(wel,{zIndex:60+wi}); const ws=G.getProperty(wel,'scale'); G.to(wel,{scale:ws*1.12,rotationX:0,duration:.9,delay:wi*.1,ease:'back.out(2)'}); });
        S(FX_SND[h.fx]||'boom'); const wc=center(wEl); comicWord(h.w,wc.x,wc.y-CH*.45,h.c);
        const losers=e.plays.filter(p=>!winIds.has(p.pid)).map(p=>slots[p.pid]).filter(Boolean);
        await Promise.all(losers.map((l,i)=>sleep(i*160).then(()=>effect(wEl,l,h))));
        const wn=players.find(p=>p.id===e.winner); const mine=winIds.has(me); const isTm=VIEW._teams&&e.winTeam>=0;
        let sub=`${h.ad} · ${STATS[e.stat]} ${wp.v}${wp.b?' · +8 son şans':''}`;
        if(isTm){ const mt=players.find(x=>x.id===me); if(mt){ const tv=t=>e.plays.filter(pl=>{const pp=players.find(x=>x.id===pl.pid);return pp&&pp.team===t}).reduce((a,pl)=>a+(pl.v||0),0); sub=`${STATS[e.stat]} · Takımın ${tv(mt.team)} - ${tv(1-mt.team)}`; } }
        S(mine?'win':'lose',{vol:.55}); if(mine) winShow(isTm?'TAKIMIN KAZANDI!':'KAZANDIN!',`+${e.plays.reduce((a,p)=>a+((p.heroes||[p.hero]).length),0)} kart senin`,false);
        if(mine&&MTSET.fx!==false) await sleep(1900); else await msg(isTm?(mine?'Takımın kazandı':`${wn.name}'in takımı kazandı`):(mine?'Kazandın':`${wn.name} kazandı`),sub,mine?'var(--gold)':'var(--red)',.8);
        wEls.forEach(wel=>(wel._cards||[wel]).forEach(c=>c.classList.remove('glow')));
        const all=[...e.plays.map(p=>slots[p.pid]).filter(Boolean),...potEls]; potEls=[]; slots={};
        S(mine?'coin':'whoosh',{vol:.6});
        await Promise.all(all.map((el,k)=>{ const pid=el._pid; const dst=(pid&&winIds.has(pid))?seatXY(pid):seatXY(e.winner); return to(el,{x:dst.x,y:dst.y,scale:.25,rotation:0,rotationX:0,opacity:.2,filter:'none',duration:.65,delay:k*.06,ease:'power3.inOut'}); }));
        all.forEach(el=>el.remove()); [...winIds].forEach(id=>{ if(seats[id]) G.fromTo(seats[id],{scale:1.15},{scale:1,duration:.5,ease:'back.out(3)'}); });
      } else {
        S('tie'); await msg('Berabere','Kartlar ortada kalıyor · sonraki turu kazanan hepsini alır','var(--dim)',.9);
        e.plays.forEach(pl=>{ const el=slots[pl.pid]; if(el){ el._pid=null; potEls.push(el); } }); slots={};
        potEls.forEach((el,k)=>G.to(el,{x:W/2-CW/2+k*5,y:H*.2-CH/2+k*3,scale:.42,rotation:k*9-12,rotationX:0,duration:.5,ease:'expo.out'}));
      }
      return;
    }
    if(e.e==='out'){ const p=players.find(x=>x.id===e.pid); if(p){p.out=true; S('lose',{vol:.5}); await msg(e.pid===me?'Elendin':`${p.name} elendi`,e.pid===me?'Maçı izlemeye devam ediyorsun':'Kartı kalmadı','var(--red)',.8); if(seats[e.pid]){ seats[e.pid].classList.add('out'); const r=seats[e.pid].getBoundingClientRect(); particles(r.left+r.width/2,r.top+10,'#FF6B3D',30,300); particles(r.left+r.width/2,r.top+10,'#FFD34D',20,220); } if(e.pid===me){ spectating=true; $('#specbar').hidden=false; } } return; }
    if(e.e==='end'){
      window.CGSTATS&&CGSTATS.end(e);
      spectating=false; $('#specbar').hidden=true; $$('.spc',B).forEach(x=>x.remove());
      try{ hand.forEach(h=>h.el&&h.el.remove()); }catch(e){} hand=[]; slots={}; potEls.forEach(el=>el.remove()); potEls=[]; $$('.slotG,.mypile,.hc',B).forEach(x=>x.remove()); try{G.killTweensOf([B,A]);}catch(e){}
      playing=false; hint(''); BAR.innerHTML=''; $('#atimer').hidden=true; const meR=e.ranking.findIndex(r=>r.id===me), myT=players.find(p=>p.id===me); const win=(e.winTeam!=null&&e.winTeam>=0)?(myT&&myT.team===e.winTeam):meR===0;
      S(win?'win':'lose'); if(win){ winShow(VIEW._teams?'TAKIMIN ŞAMPİYON!':'ŞAMPİYON!','+800 puan',true); }
      const _hum=(e.ranking||[]).filter(p=>!p.bot).length; window.__MT_SOLO=_hum<=1?0.5:1; const mineR=e.ranking[meR]; gameDone();
      if(mineR){ const wt=e.winTeam; const cw=((wt!=null&&wt>=0)?(mineR.team===wt):(meR===0))?800:-200; submitScore('cards',cw); if(cw<0) setTimeout(()=>toast('Maçı kaybettin',`${Math.round(cw*(_hum<=1?.5:1))} puan`),900); if(cw>0) setCoins(Math.max(0,(coins()||0)-Math.floor(cw/2))); }
      recordMatch(e.ranking);
      const _mxp=e.ranking.reduce((a,r)=>!a||r.pts>a.pts?r:a,null); const o=document.createElement('div'); o.className='aend';
      o.innerHTML=`<span class="mono">Maç ${e.match} bitti</span><b style="color:${win?'var(--gold)':'var(--red)'}">${win?'Şampiyon':'Maç bitti'}</b>
        <ol class="rank">${e.ranking.map((r,i)=>`<li${r.id===me?' class="me"':''}><span class="rk">${i+1}</span>${avatarHTML({display:r.name,username:r.name,avatar:r.avatar},32)}<span class="nm">${r.team===0||r.team===1?`<i class="tm tm${r.team}"></i>`:''}${esc(r.name)}</span><span class="mono">${r.cards} kart</span><b>+${r.pts}</b>${r===_mxp?' <span class="mono" style="color:var(--gold);font-size:11px">⭐ MVP</span>':''}</li>`).join('')}</ol>
        <div class="rowb">${NET.isHost?'<button class="btn p" id="aRe" type="button"><span class="bl"><span>Rövanş</span><span>Rövanş</span></span></button>':'<span class="mono dim">Rövanşı oda kurucusu başlatır</span>'}<button class="ghost" id="aShr" type="button">📤 Sonucu paylaş</button><button class="ghost" id="aSt" type="button">📊 İstatistik</button><button class="btn g" id="aLob" type="button"><span class="bl"><span>Lobiye dön</span><span>Lobiye dön</span></span></button></div>`;
      A.appendChild(o); const _dl=win&&MTSET.fx!==false?3.3:0; G.fromTo(o,{opacity:0,scale:.9},{opacity:1,scale:1,duration:.6,delay:_dl,ease:'expo.out'}); G.from($$('.rank li',o),{x:-30,opacity:0,stagger:.08,delay:.3+_dl});
      const re=$('#aRe',o); if(re) re.onclick=()=>{o.remove(); ENGINE.start();};
      $('#aLob',o).onclick=()=>{o.remove(); LOB.hidden=false; if(NET.isHost) ENGINE.sendLobby(); B.innerHTML=''; $$('.seat',A).forEach(s=>s.remove());};
      const _as=$('#aSt',o); _as&&(_as.onclick=()=>{ const st=CGSTATS.summary(), tt=CGSTATS.top(10);
        openModal('Kart İstatistikleri');
        swap(`<div style="display:grid;gap:12px"><div style="background:linear-gradient(135deg,var(--s2),var(--s1));border:3px solid var(--inkc);border-radius:10px;padding:14px;text-align:center"><span class="mono" style="color:var(--gold);font-size:11px;letter-spacing:.2em">KAHraman KARTLARI</span><h3 style="margin:6px 0;font-size:22px">${st.m} maç · ${st.w} galibiyet</h3><p class="dim" style="margin:0;font-size:12px">En çok oynanan: <b>${tt[0]?esc(tt[0].h.ad):'—'}</b> · ${tt[0]?tt[0].p+' tur':''}</p></div>
        <div style="display:grid;gap:6px;max-height:50vh;overflow:auto">${tt.map((x,i)=>`<div style="display:flex;align-items:center;gap:10px;background:var(--s2);border:2px solid var(--inkc);border-radius:8px;padding:8px 10px"><b class="mono" style="width:22px;color:var(--gold)">${i+1}</b><img src="${cardFace(x.h)}" style="width:36px;border-radius:5px;flex:none" alt=""><div style="flex:1;min-width:0"><b style="font-size:13px">${esc(x.h.ad)}</b><div class="mono dim" style="font-size:10px">${x.w} galibiyet / ${x.p} tur</div></div></div>`).join('')||'<p class="dim">Henüz veri yok — maç oynadıkça dolar.</p>'}</div></div>`);
        SFX.play('open'); });
      const _sh=$('#aShr',o); _sh&&(_sh.onclick=()=>window.shareResult&&shareResult({title:'Kahraman Kartları · Maç '+e.match,win,me,badge:win?'🏆 ŞAMPİYON!':'MAÇ BİTTİ',rows:e.ranking.map(r=>({name:String(r.name).replace(' (bot)',''),pts:r.pts,me:r.id===me,bot:r.bot}))}));
      return;
    }
  }
  function fan(pid,n){ const f=seats[pid]&&seats[pid].querySelector('.ofan'); if(!f) return; const cur=f.children.length; if(cur===n) return; f.innerHTML=''; for(let i=0;i<n;i++){ const c=document.createElement('i'); c.className='ohc'; c.innerHTML=CARD_BACK_HTML; const a=(i-(n-1)/2); c.style.transform=`translateX(${a*22}px) translateY(${Math.abs(a)*4}px) rotateZ(${a*9}deg)`; f.appendChild(c); } if(n>cur) G.from([...f.children].slice(cur),{y:-30,opacity:0,stagger:.08,duration:.4,ease:'back.out(2)'}); }
  let spectating=false, watch=null;
  function specView(hands){
    if(!spectating) return; const ids=Object.keys(hands); if(!watch||!hands[watch]) watch=ids[0]; if(!watch) return;
    const bar=$('#specbar'); const p=players.find(x=>x.id===watch);
    bar.innerHTML=`<span class="mono">İzliyorsun:</span>${ids.map(id=>{const q=players.find(x=>x.id===id); return `<button type="button" class="${id===watch?'on':''}" data-w="${id}">${esc(q?q.name:'?')}</button>`;}).join('')}`;
    $$('button',bar).forEach(b=>b.onclick=()=>{watch=b.dataset.w; SFX.play('click'); specView(hands);});
    $$('.spc',B).forEach(x=>x.remove()); const list=hands[watch]||[]; const n=list.length;
    list.forEach((id,i)=>{ const el=mkCard(id,{...handPos(i,n),scale:.82,zIndex:5},true); el.classList.add('spc'); G.from(el,{y:'+=80',opacity:0,duration:.4,delay:i*.05}); });
  }
  function emoPop(s,t){ const r=s.getBoundingClientRect(); const d=document.createElement('div'); d.className='emopop'; d.textContent=t; d.style.left=(r.left+r.width/2)+'px'; d.style.top=(r.top-6)+'px'; A.appendChild(d); G.fromTo(d,{y:0,scale:.2,opacity:0},{y:-46,scale:1,opacity:1,duration:.45,ease:'back.out(3)'}); G.to(d,{y:-80,opacity:0,delay:1.6,duration:.5,onComplete:()=>d.remove()}); SFX.play('hover'); }
  function updCounts(c){ renderMate&&renderMate(); for(const [id,v] of Object.entries(c)){ const s=seats[id]; if(s){ s.querySelector('.cnt').textContent=v.deck+v.hand; if(id!==me) fan(id,v.out?0:v.hand); } if(id===me){ const pl=$('.mypile b',B); if(pl) pl.textContent=v.deck; } } }
  // ---------- seçim ----------
  function enablePick(){
    hand.forEach(h=>{ const el=h.el; el.classList.add('selectable');
      el.onpointerenter=()=>{ if(selList.includes(h)||isMob()) return; G.to(el,{y:handPos(hand.indexOf(h),hand.length).y-CH*.12,duration:.25,ease:'power3.out'}); S('flip',{vol:.25,rate:1.35}); };
      el.onpointerleave=()=>{ if(selList.includes(h)) return; G.to(el,{...handPos(hand.indexOf(h),hand.length),duration:.3,ease:'power3.out'}); };
      el.onclick=ev2=>{ if(ev2.target.closest('.sr')&&selList.includes(h)) return; choose(h); };
      el.onpointerup=ev4=>{ if(ev4.pointerType!=='mouse'&&!selList.includes(h)&&!ev4.target.closest('.sr')){ ev4.preventDefault(); choose(h); } };
      $$('.sr',el).forEach(b=>{ b.classList.toggle('no',phase==='lead'&&!offer.includes(+b.dataset.k)); b.onclick=ev3=>{ if(!selList.includes(h)||phase!=='lead'||!offer.includes(+b.dataset.k)) return; ev3.stopPropagation(); pickStat(+b.dataset.k); }; });
    });
    renderBar();
  }
  function disablePick(){ hand.forEach(h=>{ const el=h.el; el.classList.remove('selectable','picked'); el.onclick=el.onpointerenter=el.onpointerleave=el.onpointerup=null; $$('.sr',el).forEach(b=>{b.onclick=null; b.classList.remove('hl','on','no');}); }); BAR.innerHTML=''; }
  const ctNeed=()=>Math.min(VIEW._ct||1,hand.length);
  function choose(h){
    if(!myTurn) return; const i=selList.indexOf(h); S(i>=0?'swap':'click'); buzz(8);
    if(i>=0){ selList.splice(i,1); h.el.classList.remove('picked'); sendAct({a:'pick',hero:h.hero}); }
    else { const need=ctNeed(); if(selList.length>=need){ const old=selList.shift(); old.el.classList.remove('picked'); sendAct({a:'pick',hero:old.hero}); S('swap'); } selList.push(h); h.el.classList.add('picked'); sendAct({a:'pick',hero:h.hero}); }
    sel=selList[selList.length-1]||null; selStat=phase==='lead'?selStat:stat;
    hand.forEach((x,j)=>{ if(!selList.includes(x)) G.to(x.el,{...handPos(j,hand.length),duration:.3,ease:'power3.out'}); });
    const abTop=H-(CH+40+SB())-(phase==='lead'?128:62); const isc=Math.max(.7,Math.min(1.25,(abTop-80)/CH)); const insp={x:W/2-CW/2,y:abTop-CH*(1+isc)/2-12,scale:isc,rotation:0,zIndex:50};
    selList.forEach((x,k)=>{ G.to(x.el,{...insp,x:insp.x+(k-(selList.length-1)/2)*CW*.9,duration:.4,ease:'expo.out'}); });
    if(phase==='lead'){ hint(selList.length?'Şimdi bir özellik seç':`Kart seç (${ctNeed()} kart)`); $$('.sr',(sel||h).el).forEach(b=>b.classList.toggle('on',+b.dataset.k===selStat)); }
    renderBar();
  }
  function pickStat(k){ selStat=k; S('click'); const se=selList[0]||sel; se&&$$('.sr',se.el).forEach(b=>b.classList.toggle('on',+b.dataset.k===k)); sendAct({a:'pickstat',stat:k}); hint(''); renderBar(); }
  function renderBar(){
    if(!myTurn){ BAR.innerHTML=''; return; }
    const need=ctNeed(), okN=selList.length>=need; const sums=STATS.map((_,i)=>selList.reduce((a,x)=>{const hh=HERO_BY[x.hero];return a+(hh?hh.s[i]:0);},0));
    BAR.innerHTML=`${phase==='lead'&&okN?`<div class="stp">${STATS.map((s,i)=>`<button type="button" class="stb${selStat===i?' on':''}" data-k="${i}" ${offer.includes(i)?'':'disabled'}><span>${s}</span><b>${sums[i]}</b></button>`).join('')}</div>`:''}
      <div class="cfr">${selList.length?`<button class="btn g sm" id="aChg" type="button"><span class="bl"><span>Değiştir</span><span>Değiştir</span></span></button>`:''}<button class="btn p sm" id="aOk" type="button" ${okN&&(phase!=='lead'||selStat!=null)?'':'disabled'}><span class="bl"><span>Onayla${need>1?' ('+selList.length+'/'+need+')':''}</span><span>Onayla</span></span></button></div>`;
    $$('.stb',BAR).forEach(b=>b.onclick=()=>{ if(!b.disabled) pickStat(+b.dataset.k); });
    const ok=$('#aOk',BAR); ok&&(ok.onclick=()=>{ if(ok.disabled) return; S('confirm'); buzz([10,30,20]); sendAct({a:'confirm'}); BAR.innerHTML=''; });
    const ch=$('#aChg',BAR); ch&&(ch.onclick=()=>{ S('swap'); selList.slice().forEach(h=>{ h.el.classList.remove('picked'); sendAct({a:'pick',hero:h.hero}); }); selList=[]; sel=null; if(phase==='lead'){ selStat=null; sendAct({a:'pickstat',stat:null}); } layoutHand(.4); hint(ctNeed()>1?`Kart seç (${ctNeed()} kart)`:phase==='lead'?'Bir kart seç, sonra özellik seç':`${STATS[stat]} için bir kart seç`); renderBar(); });
    G.fromTo(BAR.children,{y:10,opacity:0},{y:0,opacity:1,duration:.3,stagger:.05});
  }
  function mateZoom(id){ const h=HERO_BY[id]; if(!h) return; try{S&&S('click')}catch(_){}
    const v=document.createElement('div'); v.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:300;display:grid;place-items:center;padding:16px';
    v.innerHTML='<div style="background:var(--s2);border:3px solid var(--gold);border-radius:12px;padding:14px;max-width:300px;width:100%;text-align:center"><img src="'+cardFace(h)+'" style="width:100%;border-radius:8px;display:block" alt=""><b style="display:block;margin-top:8px;font-family:var(--display);font-size:20px;letter-spacing:.03em">'+esc(h.n||h.name||h.id)+'</b><div class="mono" style="margin-top:8px;display:grid;grid-template-columns:repeat(5,1fr);gap:5px;font-size:11px">'+STATS.map((sn,i)=>'<span style="background:var(--s1);border:1px solid var(--line2);border-radius:5px;padding:4px 2px">'+sn+'<br><b style="color:var(--gold);font-size:13px">'+h.s[i]+'</b></span>').join('')+'</div><div class="mono dim" style="margin-top:8px;font-size:11px">Kapatmak için dokun</div></div>';
    v.onclick=()=>v.remove(); document.body.appendChild(v); }
  function afkClear(){ clearInterval(VIEW._afkI); VIEW._afkI=null; $$('.afkB',A).forEach(b=>b.remove()); }
  function afkArm(){ afkClear(); VIEW._teamT=Date.now(); VIEW._afkI=setInterval(()=>{ if(!VIEW._teams)return; if(Date.now()-VIEW._teamT<12000)return;
    players.filter(p=>!p.out).forEach(p=>{ if(slots[p.id]) return; const st=seats[p.id]; if(!st) return; let b=st.querySelector('.afkB');
      if(!b){ b=document.createElement('div'); b.className='afkB'; b.textContent='AFK'; b.style.cssText='position:absolute;top:0;right:0;font-size:9px;font-weight:800;background:var(--red);color:#fff;padding:1px 5px;border-radius:4px;z-index:9'; st.appendChild(b); }
      b.style.display=(Math.floor(Date.now()/500)%2)?'block':'none'; }); },500); }
  function renderMate(){ let tb=$('#tmBar'); const meP=players.find(x=>x.id===me); const tm=VIEW._teams&&meP&&players.find(x=>x.id!==me&&x.team!=null&&x.team===meP.team);
    if(!tm){ if(tb) tb.hidden=true; return; }
    if(!tb){ tb=document.createElement('div'); tb.id='tmBar'; tb.style.cssText=(W<700?'top:calc(48px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);flex-direction:column;gap:4px;padding:6px 8px;max-width:96vw;--mtw:38px;':'top:52px;right:14px;flex-direction:row;max-width:calc(50% - 140px);--mtw:'+(W<1000?'48px':'60px')+';')+'position:absolute;z-index:30;display:flex;gap:10px;align-items:center;background:rgba(18,14,30,.94);border:3px solid var(--gold);border-radius:12px;padding:10px 12px;box-shadow:0 8px 24px rgba(0,0,0,.6);'; tb.onclick=ev=>{const im=ev.target.closest&&ev.target.closest('img[data-hid]'); if(im) mateZoom(im.dataset.hid);}; A.appendChild(tb); }
    const cards=mateHands[tm.id]||[];
    tb.innerHTML=(W<700?'<span class="mono" style="font-size:11px;white-space:nowrap">🤝 <b style="color:var(--gold)">'+esc(tm.name)+'</b> · elinde '+cards.length+' kart</span><span style="display:flex;gap:8px;align-items:flex-end">':'<span class="mono" style="font-size:12px;line-height:1.3;white-space:nowrap;text-align:center">🤝 TAKIM ARKADAŞIN<br><b style="font-size:14px;color:var(--gold)">'+esc(tm.name)+'</b><br><span style="opacity:.7">elinde '+cards.length+' kart</span></span><span style="display:contents">')
    +'<span style="display:flex;gap:6px;flex-wrap:nowrap;justify-content:center;align-items:flex-end">'
    +cards.map(id=>{const h=HERO_BY[id]; if(!h) return ''; const v=stat!=null?h.s[stat]:null;
      return '<span style="position:relative;display:inline-block"><img data-hid="'+id+'" src="'+cardFace(h)+'" style="width:var(--mtw,64px);border-radius:7px;border:3px solid var(--gold);display:block;cursor:zoom-in;box-shadow:0 4px 10px rgba(0,0,0,.5)" alt="'+esc(h.n||h.id)+'"><span class="mono" style="position:absolute;left:0;right:0;bottom:0;text-align:center;font-size:13px;font-weight:900;color:var(--gold);background:rgba(0,0,0,.8);border-radius:0 0 5px 5px;padding:1px 0">'+(v!=null?v:'')+'</span></span>';}).join('')
    +'</span>'
    +(function(){const lp=mateLast[tm.id];if(!lp||!lp.list||!lp.list.length)return'';const sn=lp.stat!=null?STATS[lp.stat]:null;
      return '<span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;align-items:center;'+'border-left:2px solid #39d98a;padding-left:6px'+'">'
      +'<span class="mono" style="font-size:11px;align-self:center;text-align:center;color:#39d98a;line-height:1.3">ATTIĞI<br>'+(sn?esc(sn):'')+'</span>'
      +lp.list.map(id=>{const h=HERO_BY[id]; if(!h) return ''; const v=lp.stat!=null?h.s[lp.stat]:null;
        return '<span style="position:relative;display:inline-block"><img data-hid="'+id+'" src="'+cardFace(h)+'" style="width:var(--mtw,64px);border-radius:7px;border:3px solid #39d98a;display:block;cursor:zoom-in;box-shadow:0 0 14px rgba(57,217,138,.5)" alt=""><span class="mono" style="position:absolute;left:0;right:0;bottom:0;text-align:center;font-size:13px;font-weight:900;color:var(--gold);background:rgba(0,0,0,.8);border-radius:0 0 5px 5px;padding:1px 0">'+(v!=null?v:'')+'</span></span>';}).join('')
      +'</span>';})()+'</span>';
  }
  function sendAct(m){ if(NET.isHost) ENGINE.act(me,m); else NET.conn&&NET.conn.open&&NET.conn.send({t:'act',...m}); }
  document.addEventListener('keydown',e=>{ if(!myTurn||!hand||!hand.length) return; if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if(e.key>='1'&&e.key<='9'){ const h=hand[+e.key-1]; if(h){ e.preventDefault(); choose(h); } return; }
    if((e.key==='Enter'||e.key===' ')&&sel){ e.preventDefault(); const ok=$('#aOk'); ok&&!ok.disabled&&ok.click(); } });
  function setMe(id){ me=id; }
  function resize(){ if(A.hidden||!playing) return; dims(); layoutHand(.3); others().forEach(p=>{const s=seats[p.id]; if(s){const pos=posFor(p); G.set(s,{x:pos.x,y:pos.y});}}); }
  addEventListener('resize',resize);
  return {ev,setMe,emoPop,get playing(){return playing;},reset(){queue=Promise.resolve(); playing=false; B.innerHTML=''; FX.innerHTML=''; BAR.innerHTML=''; hint(''); $$('.seat,.aend',A).forEach(s=>s.remove());}};
})();

/* ========================= KART İSTATİSTİKLERİ ========================= */
const CGSTATS=(()=>{
  const KEY='mt_cgstats';
  let d={h:{},m:0,w:0};
  try{ const p=JSON.parse(localStorage.getItem(KEY)||'{}'); d={h:p.h||{},m:p.m||0,w:p.w||0}; }catch(e){}
  const save=()=>{ try{localStorage.setItem(KEY,JSON.stringify(d));}catch(e){} };
  function round(e){ for(const pl of e.plays||[]){ if(!pl.hero) continue; const s=d.h[pl.hero]||(d.h[pl.hero]={p:0,w:0}); s.p++; }
    if(e.winner){ const wp=(e.plays||[]).find(p=>p.pid===e.winner); if(wp&&d.h[wp.hero]) d.h[wp.hero].w++; } save(); }
  function end(e){ d.m++; const me=(e.ranking||[]).findIndex(r=>r.id===NET.id); if(me===0) d.w++; save(); }
  function top(n){ return Object.entries(d.h).map(([id,s])=>({h:HERO_BY[id],...s})).filter(x=>x.h).sort((a,b)=>b.p-a.p||b.w-a.w).slice(0,n||10); }
  function summary(){ const t=top(Infinity), tp=t.reduce((a,x)=>a+x.p,0), tw=t.reduce((a,x)=>a+x.w,0);
    const fav=t.slice().sort((a,b)=>b.w-a.w||b.p-a.p)[0]; return {m:d.m,w:d.w,tp,tw,fav}; }
  return {round,end,top,summary,raw:()=>JSON.parse(JSON.stringify(d)),merge(r){ if(!r) return; for(const k in r.h||{}){ const s=d.h[k]||(d.h[k]={p:0,w:0}), x=r.h[k]||{}; s.p=Math.max(s.p,x.p||0); s.w=Math.max(s.w,x.w||0); } d.m=Math.max(d.m,r.m||0); d.w=Math.max(d.w,r.w||0); save(); }};
})();

/* =================== SOHBET + EMOJİ =================== */
const CHAT=(()=>{
  const box=$('#achat'), log=$('#achatLog'), f=$('#achatF'), inp=$('#achatIn'), tg=$('#achatT'), badge=$('#achatN');
  let unread=0, teamMode=false;
  const nm=()=>AUTH.user?(AUTH.user.display||AUTH.user.username):(localStorage.getItem('mt_name')||'Ben');
  function line(html,cls){ const d=document.createElement('div'); d.className='cl '+(cls||''); d.innerHTML=html; log.appendChild(d); while(log.children.length>60) log.firstChild.remove(); log.scrollTop=log.scrollHeight; if(box.hidden){ unread++; badge.textContent=unread; badge.hidden=false; } }
  function add(e){ line(`<b>${e.team?'🔒 ':''}${esc(e.name)}</b> ${e.emo?`<span class="ce">${esc(e.text)}</span>`:esc(e.text)}`,e.pid===NET.id?'me':''); if(e.pid!==NET.id) SFX.play('hover'); }
  function sys(t){ line(esc(t),'sys'); }
  function send(text,emo){ text=String(text).trim(); if(!text) return; if(NET.isHost) ENGINE.chat(NET.id,text,emo,teamMode); else if(NET.conn&&NET.conn.open) NET.conn.send({t:'chat',text,emo,team:teamMode?1:0}); else toast('Sohbet','Önce bir odaya katıl ya da oda kur.'); }
  f.onsubmit=e=>{e.preventDefault(); send(inp.value,false); inp.value='';};
  $$('#achatE button').forEach(b=>b.onclick=()=>{ send(b.textContent,true); SFX.play('click'); });
  { const tb=document.createElement('button'); tb.type='button'; tb.id='achatTeam'; tb.textContent='🔒'; tb.title='Takım sohbeti — sadece takım arkadaşın görür (2v2)'; tb.style.cssText='position:absolute;bottom:6px;right:44px;width:34px;height:34px;border-radius:8px;border:2px solid var(--line2);background:var(--s2);color:var(--fg);cursor:pointer;font-size:15px;opacity:.55';
    tb.onclick=()=>{ teamMode=!teamMode; tb.style.opacity=teamMode?'1':'.55'; tb.style.borderColor=teamMode?'var(--gold)':'var(--line2)'; tb.title=teamMode?'Takım sohbeti AÇIK — sadece takım arkadaşın görür':'Takım sohbeti — sadece takım arkadaşın görür (2v2)'; SFX.play('click'); };
    f.parentNode.style.position='relative'; f.parentNode.appendChild(tb); }
  tg.onclick=()=>{ box.hidden=!box.hidden; if(!box.hidden){unread=0; badge.hidden=true; log.scrollTop=log.scrollHeight; G.fromTo(box,{y:20,opacity:0},{y:0,opacity:1,duration:.3,ease:'back.out(2)'});} SFX.play('click'); };
  return {add,sys,send};
})();

/* yerel maç kaydı: birlikte oynadığın herkes sıralamaya yazılır */
function recordMatch(ranking){
  try{ const b=JSON.parse(localStorage.getItem('mt_board')||'{}'); ranking.forEach(r=>{ if(r.bot) return; const k=r.name; b[k]=b[k]||{name:r.name,avatar:r.avatar,points:0,matches:0}; b[k].points+=r.pts; b[k].matches++; b[k].avatar=r.avatar||b[k].avatar; }); localStorage.setItem('mt_board',JSON.stringify(b)); }catch(e){}
  renderBoards();
}

/* =================== LOBİ =================== */
const LOBBY=(()=>{
  const A=$('#arena'), L=$('#lobby');
  let mode='menu';
  const myName=()=>AUTH.user?(AUTH.user.display||AUTH.user.username):(localStorage.getItem('mt_name')||'');
  const myAvatar=()=>AUTH.user?AUTH.user.avatar:null;
  function nameField(){ return AUTH.user?`<div class="lme">${avatarHTML(AUTH.user,40)}<div><b>${esc(myName())}</b><small class="mono vf">${AUTH.user.google?'Google ile bağlı':'Micup hesabı bağlı'}</small></div></div>`:`<label class="mono dim" for="lName">Oyuncu adın</label><input class="field" id="lName" maxlength="18" placeholder="Adını yaz" value="${esc(myName())}" autocomplete="off">`; }
  const getName=()=>{ if(AUTH.user) return myName(); const v=($('#lName')?.value||'').trim(); if(v) try{localStorage.setItem('mt_name',v);}catch(e){} return v; };
  function menu(){
    mode='menu';
    L.innerHTML=`<div class="lpanel"><span class="mono" style="color:var(--gold)">03 · Kahraman Kartları</span><h3 class="lt">Masaya otur</h3>
      ${nameField()}
      <div class="lbtns"><button class="lbtn" id="lCreate" type="button"><b>Oda kur</b><span>Arkadaşlarına kod gönder, 2-4 kişi oynayın</span></button>
      <button class="lbtn" id="lJoin" type="button"><b>Odaya katıl</b><span>Arkadaşının verdiği 5 haneli kodu yaz</span></button>
      <button class="lbtn" id="lBots" type="button"><b>Botlarla oyna</b><span>İnternet gerekmez, 1-3 bota karşı</span></button>
      <button class="lbtn" id="lQuick" type="button"><b>Hızlı maç</b><span>2 botla anında kısa maç</span></button></div>
      <div class="rowb"><button class="ghost" id="lStats" type="button">Kart istatistikleri</button></div>
      ${peerOk()?'':'<p class="lnote">Online oda için bağlantı kütüphanesi yüklenemedi. İnternete bağlı olduğundan emin ol. Botlarla oynayabilirsin.</p>'}
      <details class="rules"><summary class="mono">Nasıl oynanır?</summary><p>Her tur sırayla başka bir oyuncu başlatır. O tur rastgele 2 özellik açılır, başlatan bunlardan birini ve kartını seçer. Diğerleri sırayla kart atar; onaylamadan önce kartını değiştirebilirsin. Kartlar açılınca o özellikte en yüksek olan ortadaki tüm kartları alır. Berabere kalırsa kartlar ortada kalır. En az kartı olan oyuncuya +8 "son şans" bonusu gelir. Kartı biten elenir, son kalan kazanır. Her maçta ilk turu başlatan da sırayla değişir.</p></details></div>`;
    $('#lCreate').onclick=()=>{ if(!(FB.ready&&FB.user)) return openLogin(); const n=getName(); if(!n) return nudge(); if(!peerOk()) return toast('Online oda açılamadı','Bağlantı kütüphanesi yüklenemedi.'); create(n); };
    $('#lJoin').onclick=()=>{ if(!(FB.ready&&FB.user)) return openLogin(); const n=getName(); if(!n) return nudge(); joinForm(n); };
    $('#lBots').onclick=()=>{ const n=getName(); if(!n) return nudge(); bots(n); };
    $('#lStats').onclick=()=>{ SFX.play('click'); statsView(); };
    const qt=$('#lQuick'); qt&&(qt.onclick=()=>{ const n=getName(); if(!n) return nudge(); quick(n); });
    G.fromTo('.lpanel',{y:30,opacity:0},{y:0,opacity:1,duration:.6,ease:'expo.out'});
  }
  function nudge(){ const f=$('#lName'); if(f){ f.focus(); G.fromTo(f,{x:-8},{x:0,duration:.5,ease:'elastic.out(1,.3)'}); SFX.play('wrong'); } }
  function room(players,code,isHost,set){
    set=set||ENGINE.settings; if(set.teams===2&&players.length!==4) set.teams=0; if(set.ct>(set.hand||3)) set.ct=set.hand||3; A.dataset.theme=(set&&set.theme)||'default'; if(set.feat==null) set.feat=2; const n=Math.max(2,players.length), mx=Math.min(Math.floor(HEROES_CG.length/n),16);
    const OPTS=[['per','Kişi başı kart',[[4,'4'],[6,'6'],[8,'8'],[0,`Hepsi (${mx})`]]],['hand','Elde kart',[[3,'3'],[4,'4'],[5,'5']]],['rounds','Tur sınırı',[[0,'Sınırsız'],[15,'15'],[30,'30'],[50,'50']]],['timer','Hamle süresi',[[0,'Yok'],[10,'10 sn'],[20,'20 sn'],[40,'40 sn']]],['feat','Tur özelliği',[[0,'Lider seçer'],[1,'1 rastgele'],[2,'2 rastgele'],[3,'3 rastgele'],[4,'4 rastgele']]],['teams','Takım modu',[[0,'Kapalı'],...(players.length===4?[[2,'2v2']]:[])]],['ct','Tur başına kart',[[1,'1 kart'],[2,'2 kart'],[3,'3 kart'],[4,'4 kart']].filter(([v])=>v<=(set.hand||3))],['quick','Hızlı maç',[[0,'Normal'],[1,'Hızlı']]]];
    const THEME_ROW=`<div class="set"><span>Masa ve çevre</span><div class="seg">${[['default','Klasik'],['avengers','🏙️ Avengers Kulesi'],['wakanda','💜 Wakanda'],['asgard','🌈 Asgard'],['space','🪐 Uzay'],['sanctum','🔮 Sanctum']].map(([v,t])=>`<button type="button" data-k="theme" data-v="${v}" class="${(set.theme||'default')===v?'on':''}" ${isHost?'':'disabled'}>${t}</button>`).join('')}</div></div>`;
    const sets=`<div class="sets"><span class="mono" style="color:var(--gold)">Oyun ayarları${isHost?'':' · sadece kurucu değiştirebilir'}</span>${OPTS.map(([k,l,os])=>`<div class="set"><span>${l}</span><div class="seg">${os.map(([v,t])=>`<button type="button" data-k="${k}" data-v="${v}" class="${set[k]===v||(k==='rounds'&&v===0&&!set.rounds)?'on':''}" ${isHost?'':'disabled'}>${t}</button>`).join('')}</div></div>`).join('')}${THEME_ROW}</div>`;
    const _tc0=players.filter(x=>x.tp===0).length,_tc1=players.filter(x=>x.tp===1).length;
    L.innerHTML=`<div class="lpanel"><span class="mono" style="color:var(--gold)">${code?'Oda kodu':'Yerel maç'}</span>
      ${code?`<div class="code"><b id="lCode">${code}</b><button class="ghost" id="lCopy" type="button">Kopyala</button></div><p class="dim" style="margin:0;font-size:14px">Bu kodu Micup sunucusunda arkadaşlarına gönder. Onlar "Odaya katıl" ile girer.</p>`:''}
      <ul class="plist">${[0,1,2,3].map(i=>{const p=players[i]; return p?`<li class="${p.bot?'bot':''}${p.tp===0?' t0':p.tp===1?' t1':''}">${avatarHTML({display:p.name,username:p.name,avatar:p.avatar},36)}<b>${esc(p.name)}</b><span class="mono">${p.host?'👑 Kurucu':p.bot?'Bot':'Oyuncu'}</span>${set.teams===2?`<span class="tpick" style="display:inline-flex;gap:3px"><button type="button" class="tpb${p.tp===0?' on':''}" data-tp="${p.id}" data-v="0" style="font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid ${p.tp===0?'#e33':'var(--line)'};background:${p.tp===0?'rgba(255,60,60,.15)':'transparent'};color:${p.tp===0?'#ff6b6b':'var(--dim)'};cursor:pointer">🔴 RED ${_tc0}/2</button><button type="button" class="tpb${p.tp===1?' on':''}" data-tp="${p.id}" data-v="1" style="font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid ${p.tp===1?'#36c':'var(--line)'};background:${p.tp===1?'rgba(60,120,255,.15)':'transparent'};color:${p.tp===1?'#6aa8ff':'var(--dim)'};cursor:pointer">🔵 BLUE ${_tc1}/2</button></span>`:''}${isHost&&!p.host?`<button class="x sm" data-kick="${p.id}" type="button" aria-label="Çıkar">×</button>`:''}</li>`:`<li class="empty"><span class="mono">Boş koltuk</span></li>`;}).join('')}</ul>
      ${sets}<div class="rowb">${isHost?`<button class="ghost" id="lAddBot" type="button" ${players.length>=4?'disabled':''}>+ Bot ekle</button><button class="btn p" id="lStart" type="button" ${players.length<2?'disabled':''}><span class="bl"><span>Maçı başlat</span><span>Maçı başlat</span></span></button>`:'<span class="mono dim">Kurucu maçı başlatınca oyun açılacak</span>'}<button class="ghost" id="lLeave" type="button">Ayrıl</button></div></div>`;
    const cp=$('#lCopy'); cp&&(cp.onclick=()=>{ navigator.clipboard?.writeText(code).then(()=>toast('Kopyalandı','Oda kodu panoda.')).catch(()=>{const r=document.createRange(); r.selectNode($('#lCode')); getSelection().removeAllRanges(); getSelection().addRange(r);}); SFX.play('click'); });
    $$('[data-kick]',L).forEach(b=>b.onclick=()=>{ENGINE.kick(b.dataset.kick); SFX.play('click');});
    $$('[data-tp]',L).forEach(b=>b.onclick=()=>{ const pid=b.dataset.tp,v=+b.dataset.v; SFX.play('click'); if(NET.isHost) ENGINE.setTeam(pid,v); else if(NET.conn&&NET.conn.open) NET.conn.send({t:'team',pid,team:v}); });
    const ab=$('#lAddBot'); ab&&(ab.onclick=()=>{ENGINE.addBot(); SFX.sfx('join');});
    const st=$('#lStart'); st&&(st.onclick=()=>{ if(st.disabled) return; SFX.play('click'); ENGINE.start(); });
    $$('.seg button',L).forEach(b=>b.onclick=()=>{ if(!isHost) return; SFX.play('click'); const k=b.dataset.k,v=b.dataset.k==='theme'?b.dataset.v:+b.dataset.v; const ns={...ENGINE.settings,[k]:v}; if(k==='hand'&&ns.ct>ns.hand) ns.ct=ns.hand; ENGINE.setSettings(ns); });
    $('#lLeave').onclick=()=>{ askQuit(()=>leave()); };
  }
  function statsView(){
    const s=CGSTATS.summary(), t=CGSTATS.top(12), mx=t.length?t[0].p:1;
    L.innerHTML=`<div class="lpanel"><span class="mono" style="color:var(--gold)">Kahraman Kartları · İstatistik</span>
      <div class="cgstats">
        <div class="cgrow" style="grid-template-columns:1fr 1fr 1fr"><div><b>${s.m}</b><br><small class="mono dim">Maç</small></div><div><b>${s.w}</b><br><small class="mono dim">Galibiyet</small></div><div><b>%${s.m?Math.round(s.w/s.m*100):0}</b><br><small class="mono dim">Kazanma</small></div></div>
        ${s.fav?`<p class="dim" style="margin:0;font-size:13px">En çok tur kazananın: <b style="color:var(--fg)">${esc(s.fav.h.ad)}</b> · ${s.fav.w} tur galibiyeti</p>`:'<p class="dim" style="margin:0;font-size:13px">Henüz istatistik yok — bir maç oyna!</p>'}
        ${t.map((x,i)=>`<div class="cgrow"><span class="cgrk">${i+1}</span><div><b>${esc(x.h.ad)}</b><small class="mono dim"> · ${x.w}/${x.p} tur galibiyeti</small><div class="cgbar"><i style="width:${Math.round(x.p/mx*100)}%"></i></div></div><span class="mono dim">${x.p} el</span></div>`).join('')}
      </div>
      <div class="rowb"><button class="ghost" id="lStatsBack" type="button">← Lobiye dön</button></div></div>`;
    $('#lStatsBack').onclick=()=>{SFX.play('click'); menu();};
    G.fromTo('.lpanel',{y:30,opacity:0},{y:0,opacity:1,duration:.5,ease:'expo.out'});
  }
  let lastCount=0;
  function render(e){ if(e.players.length>lastCount&&lastCount) SFX.sfx('join'); lastCount=e.players.length; if(!VIEW.playing&&!$('.aend',A)) { L.hidden=false; room(e.players,e.code,NET.isHost,e.settings); } }
  function quick(n){
    leave(true); NET.isHost=true; NET.id='H'; NET.code=null; VIEW.setMe('H');
    ENGINE.reset(); ENGINE.setSettings({quick:1,timer:10,rounds:15}); ENGINE.addPlayer('H',n,myAvatar()); ENGINE.addBot(); ENGINE.addBot(); setTimeout(()=>ENGINE.start(),500);
  }
  function bots(n){
    leave(true); NET.isHost=true; NET.id='H'; NET.code=null; VIEW.setMe('H');
    ENGINE.reset(); ENGINE.addPlayer('H',n,myAvatar()); ENGINE.addBot();
  }
  function create(n){
    leave(true); NET.isHost=true; const code=randCode(); NET.code=code;
    L.innerHTML=`<div class="lpanel"><span class="mono dim">Oda açılıyor…</span></div>`;
    const peer=new Peer('mtr-'+code.toLowerCase()); NET.peer=peer;
    peer.on('open',id=>{ NET.id=id; VIEW.setMe(id); ENGINE.reset(); ENGINE.addPlayer(id,n,myAvatar()); SFX.sfx('join');
      NET.sweep=setInterval(()=>{ const now=Date.now(); for(const [cid,c] of Object.entries(NET.conns)){ if(!c.open){ delete NET.conns[cid]; continue; } const t=NET.lastSeen[cid]; if(t&&now-t>45000){ try{c.close()}catch(e){} delete NET.conns[cid]; ENGINE.removePlayer(cid); } else { try{c.send({t:'hb'})}catch(e){} } } },15000); });
    peer.on('connection',c=>{ c.on('open',()=>{ NET.conns[c.peer]=c; NET.lastSeen[c.peer]=Date.now(); }); c.on('data',d=>{ NET.lastSeen[c.peer]=Date.now(); if(d.t==='hello'){ if(!ENGINE.addPlayer(c.peer,d.name||'Oyuncu',d.avatar)) { c.send({e:'info',text:'Oda dolu ya da maç başladı'}); setTimeout(()=>c.close(),300);} } else if(d.t==='act') ENGINE.act(c.peer,d); else if(d.t==='chat') ENGINE.chat(c.peer,d.text,d.emo,d.team); else if(d.t==='settings'){ const s={...d}; delete s.t; ENGINE.setSettings(s); } else if(d.t==='team'){ ENGINE.setTeam(d.pid||c.peer,d.team); } });
      c.on('close',()=>{ delete NET.conns[c.peer]; ENGINE.removePlayer(c.peer); }); });
    peer.on('error',err=>{ if(err.type==='unavailable-id'){ peer.destroy(); create(n); } else toast('Bağlantı hatası',String(err.type||err)); });
  }
  function joinForm(n){
    L.innerHTML=`<div class="lpanel"><span class="mono" style="color:var(--gold)">Odaya katıl</span><h3 class="lt">Kodu yaz</h3>
      <form class="guess" id="jf"><label for="jCode" style="position:absolute;left:-9999px">Oda kodu</label><input class="field code-in" id="jCode" maxlength="5" placeholder="ABCDE" autocomplete="off" style="text-transform:uppercase"><button class="btn p" type="submit"><span class="bl"><span>Katıl</span><span>Katıl</span></span></button></form>
      <div class="rowb"><button class="ghost" id="jBack" type="button">Geri</button></div></div>`;
    $('#jCode').focus(); $('#jBack').onclick=menu;
    $('#jf').onsubmit=ev=>{ ev.preventDefault(); const code=$('#jCode').value.trim().toUpperCase(); if(code.length!==5) return; if(!peerOk()) return toast('Bağlanılamadı','Bağlantı kütüphanesi yüklenemedi.'); join(n,code); };
  }
  function join(n,code){
    leave(true); NET.isHost=false; NET.code=code;
    L.innerHTML=`<div class="lpanel"><span class="mono dim">${code} odasına bağlanılıyor…</span></div>`;
    const peer=new Peer(); NET.peer=peer;
    peer.on('open',id=>{ NET.id=id; VIEW.setMe(id); const c=peer.connect('mtr-'+code.toLowerCase(),{reliable:true}); NET.conn=c;
      c.on('open',()=>{ c.send({t:'hello',name:n,avatar:myAvatar()}); SFX.sfx('join'); });
      let lastRx=Date.now();
      c.on('data',d=>{ lastRx=Date.now(); VIEW.ev(d); });
      NET.guestT=setInterval(()=>{ if(NET.conn!==c){ clearInterval(NET.guestT); return; } if(!c.open) return; if(Date.now()-lastRx>60000){ try{c.close()}catch(e){} } else { try{c.send({t:'ping'})}catch(e){} } },15000);
      c.on('close',()=>{ if(NET.conn===c){ toast('Bağlantı koptu','Oda kapandı ya da internetin gitti.'); VIEW.reset(); menu(); } }); });
    peer.on('error',err=>{ toast(err.type==='peer-unavailable'?'Oda bulunamadı':'Bağlantı hatası',err.type==='peer-unavailable'?'Kodu kontrol et, oda kurucusu hâlâ açık mı?':String(err.type||err)); menu(); });
  }
  function leave(silent){ try{ NET.conn&&NET.conn.close(); }catch(e){} try{ NET.peer&&NET.peer.destroy(); }catch(e){} NET.peer=null; NET.conn=null; NET.conns={}; NET.lastSeen={}; clearInterval(NET.sweep); clearInterval(NET.guestT); NET.sweep=NET.guestT=null; NET.isHost=false; ENGINE.reset(); VIEW.reset(); lastCount=0; if(!silent) menu(); }
  function open(){ const A2=$('#arena'); A2.hidden=false; document.body.style.overflow='hidden'; lenis&&lenis.stop(); SFX.play('open'); G.fromTo(A2,{opacity:0},{opacity:1,duration:.5}); G.fromTo('#arena .felt',{rotationX:85,yPercent:30,scale:.6,opacity:0},{rotationX:54,yPercent:10,scale:1,opacity:1,duration:1.2,ease:'expo.out'}); L.hidden=false; if(!NET.peer&&!ENGINE.started) menu(); }
  function close(){ SFX.play('close'); leave(true); const done=()=>{ $('#arena').hidden=true; document.body.style.overflow=''; lenis&&lenis.start(); }; if(G) G.to('#arena',{opacity:0,duration:.35,onComplete:done}); else done(); }
  $('#aExit').onclick=()=>askQuit(close);
  addEventListener('keydown',e=>{ if(e.key==='Escape'&&!$('#arena').hidden&&!VIEW.playing) askQuit(close); });
  $('#arena').addEventListener('pointermove',e=>{ if(!fine) return; const mx=e.clientX/innerWidth-.5, my=e.clientY/innerHeight-.5; G.to('#arena .felt',{rotationX:54+my*5,rotationZ:mx*-4,duration:1.2,ease:'power2.out',overwrite:'auto'}); },{passive:true});
  // davet linki: ?oda=KOD
  return {open,close,render,leave,menu,join,stats:statsView};
})();
const CG={open:()=>LOBBY.open()};
addEventListener('beforeunload',e=>{ if(NET.peer){ e.preventDefault(); e.returnValue=''; } });

/* ========================= Her etkileşime ses ========================= */
document.addEventListener('keydown',e=>{const t=e.target; if(t&&t.matches&&t.matches('input,textarea')&&((e.key||'').length===1||e.key==='Backspace')) SFX.sample('key',{rate:.8+Math.random()*.4,vol:.9});});
document.addEventListener('focusin',e=>{if(e.target.matches&&e.target.matches('input')) SFX.play('hover');});
{let lastC=null, tC=0; document.addEventListener('pointerover',e=>{ if(e.pointerType!=='mouse') return; const c=e.target.closest('.card:not([disabled]),.fgame,.cp-feat,.lrow:not(.head),.st'); const now=performance.now(); if(c&&c!==lastC&&now-tC>260){ tC=now; if(c.matches('.card,.fgame,.cp-feat')) SFX.sample('flip',{vol:.3,rate:1.15}); else SFX.play('hover'); } if(c) lastC=c; else if(e.target.closest('main')&&!e.target.closest('.card,.fgame,.cp-feat')) lastC=null;});}
if(G&&ST) $$('.sh,.steps,.feat').forEach(el=>ST.create({trigger:el,start:'top 82%',onEnter:()=>SFX.sample('whoosh',{vol:.22,rate:1.35})}));
document.addEventListener('click',e=>{const a=e.target.closest('a[target="_blank"]'); if(a) SFX.play('click');});

/* ========================= TÜRKİYE: elektrik gidip gelme ========================= */
(function zapLoop(){
  const el=$('h1 .o'); if(!el||reduce) return;
  setTimeout(async()=>{
    if(current==='ana'&&document.visibilityState==='visible'&&$('#pre')==null){
      SFX.zapTR(); const frames=4+Math.random()*4|0;
      for(let i=0;i<frames;i++){
        const on=i%2===0; el.classList.toggle('zz',on); el.classList.toggle('zo',!on&&Math.random()<.5); el.style.setProperty('--zx',((Math.random()-.5)*12).toFixed(1)+'px');
        el.querySelector('svg.arc')?.remove();
        if(on&&i<2){ const r=el.getBoundingClientRect(), w=r.width, h=r.height; let p=''; for(let k=0;k<3;k++){ let x=0, d=`M0 ${(h*Math.random()).toFixed(0)}`; while(x<w){x+=w*(.04+Math.random()*.08); d+=` L${x.toFixed(0)} ${(h*(.1+Math.random()*.8)).toFixed(0)}`;} p+=`<path d="${d}" stroke="#5AB4FF" stroke-width="7" opacity=".45" fill="none"/><path d="${d}" stroke="#fff" stroke-width="2" fill="none"/>`; }
          el.insertAdjacentHTML('beforeend',`<svg class="arc" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" preserveAspectRatio="none" aria-hidden="true">${p}</svg>`); }
        await new Promise(r=>setTimeout(r,35+Math.random()*95));
      }
      el.classList.remove('zz','zo'); el.querySelector('svg.arc')?.remove();
    }
    zapLoop();
  },9000+Math.random()*9000);
})();

/* ========================= RAVO — site rehberi (kural tabanlı asistan) =========================
   Sorulara anahtar kelimeyle cevap verir, butonlarla seni doğru yere götürür. İnternet ya da yapay zekâ servisi gerekmez. */
const RAVO=(()=>{
  const W=$('#ravo'), LOG=$('#ravoLog'), F=$('#ravoForm'), IN=$('#ravoIn'), BTN=$('#ravoBtn');
  const n=s=>s.toLocaleLowerCase('tr').replace(/ı/g,'i').replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u');
  const goView=v=>()=>{ if(location.hash!=='#'+v) history.replaceState(null,'','#'+v); go(v); close(); };
  const openGame=g=>()=>{ close(); const fn={guess:startGuess,quiz:startQuiz,hl:startHL,mem:startMemory,real:startReal,cards:()=>CG.open()}[g]; if(fn){ if(g==='cards') fn(); else confirmGame(g,fn); } };
  const A={ana:['Ana sayfaya git',goView('ana')],oyunlar:['Oyunlara git',goView('oyunlar')],siralama:['Sıralamaya git',goView('siralama')],
    cards:['Kahraman Kartları\'nı aç',openGame('cards')],guess:['Ben Kimim?\'i aç',openGame('guess')],quiz:['Bilgi Yarışması\'nı aç',openGame('quiz')],
    hl:['Yüksek mi Düşük mü\'yü aç',openGame('hl')],mem:['Hafıza\'yı aç',openGame('mem')],real:['Gerçek mi Sahte mi?\'i aç',openGame('real')],
    stats:['Kart istatistiklerini aç',()=>{close(); LOBBY.open(); setTimeout(()=>LOBBY.stats&&LOBBY.stats(),500);}],
    privacy:['Çerez ve gizlilik',()=>{close(); window.openCookies&&window.openCookies();}],
    login:['Micup\'ı bağla',()=>{close(); openLogin();}],
    ses:['Ses ayarlarını aç',()=>{close(); setTimeout(()=>$('#sndBtn').click(),300);}],daily:['Günlük ödülü aç',()=>{close(); openDaily();}],sunucu:['Micup sunucusuna katıl',()=>window.open('https://micup.gg/invite/2txF6WE7','_blank','noopener')]};
  const I=[
    {k:['selam','merhaba','slm','naber','hey','sa ','selamun'],r:()=>`Selam${AUTH.user?' '+AUTH.user.display:''}! Ben Ravo, sitenin rehberiyim. Nereye gitmek istersin?`,a:['oyunlar','cards','login']},
    {k:['sen kimsin','nesin','kimsin','ravo'],r:'Ben Ravo, RAVONİA GAME\'in site rehberiyim. Oyunları, kuralları ve Micup girişini anlatırım, seni doğru sayfaya götürürüm.',a:['oyunlar']},
    {k:['ana menu','anamenu','ana sayfa','anasayfa','baslangic','basa don','menu'],r:'Ana sayfa en üstte. Sol üstteki Marvel Türkiye logosuna ya da "01 Ana Sayfa"ya basarak her zaman dönebilirsin. Telefondaysan alttaki ev simgesi.',a:['ana']},
    {k:['arkadas','online','oda','kod','birlikte','katil','multiplayer','4 kisi','iki kisi','beraber'],r:'Arkadaşınla oynamak için: Kahraman Kartları\'nı aç, "Oda kur"a bas. 5 harfli bir kod çıkar, bu kodu Micup\'ta arkadaşlarına gönder. Onlar "Odaya katıl"a basıp kodu yazar. 2-4 kişi oynanır, boş yerlere bot ekleyebilirsin.',a:['cards']},
    {k:['kart','kahraman kart','masa','deste','ozellik'],r:'Kahraman Kartları: Her tur sırayla bir oyuncu başlatır. O tur 2 özellik açılır (ör. Güç ya da Zeka), başlatan birini ve kartını seçer. Diğerleri sırayla kart atar, onaylamadan önce değiştirebilirsin. O özellikte en yüksek olan ortadaki bütün kartları alır. En az kartı olana +8 son şans bonusu gelir, böylece öndeki hep kazanamaz. Kartı biten elenir, son kalan kazanır.',a:['cards']},
    {k:['ben kimim','ipucu','tahmin'],r:'Ben Kimim?: İpuçları tek tek açılır, kahramanın adını yaz. İlk ipucuda bilirsen 500 puan, her yeni ipucu 100 puan düşürür. 3 tur oynanır.',a:['guess']},
    {k:['bilgi','yarisma','soru','quiz','test'],r:'Bilgi Yarışması: Her soru için 15 saniyen var. Ne kadar hızlı doğru cevap verirsen o kadar çok puan alırsın. 6 soru sorulur.',a:['quiz']},
    {k:['yuksek','dusuk','alcak'],r:'Yüksek mi Düşük mü: Elindeki kahramanın bir özelliği gösterilir. Sıradaki kahramanın aynı özelliği daha yüksek mi, daha düşük mü, tahmin et. Her doğru 120 puan, ilk yanlışta biter.',a:['hl']},
    {k:['hafiza','eslestir','eslesme','memory','cift'],r:'Kahraman Hafızası: Kartları ikişer ikişer çevir, aynı kahramanları eşleştir. Ne kadar az hamle ve kısa sürede bitirirsen o kadar çok puan.',a:['mem']},
    {k:['oyun','oyna','ne oynayabilirim','neler var','liste','kac oyun'],r:'6 oyun var: Kahraman Kartları (online 2-4 kişi + arkadaşınla düello), Yüksek mi Düşük mü (online düello da var), Ben Kimim?, Bilgi Yarışması, Kahraman Hafızası ve Gerçek mi Sahte mi?. Hangisini açayım?',a:['cards','hl','guess','quiz','mem','real']},
    {k:['yaris','duel','1v1','iki kisi','birebir','rakip','hizli yaris','karsilikli'],r:'Yüksek mi Düşük mü içinde "Arkadaşınla yarış" var: aynı deste iki oyuncuya da gider, ilk 12 doğru cevaplayan kazanır. Oda kurup 5 haneli kodu arkadaşına gönderirsin, o "Koda katıl" ile girer.',a:['hl']},
    {k:['sahte','gercek','uydurma','hangisi gercek','isim','karakter'],r:'Gerçek mi Sahte mi?: Karşına çıkan ismin gerçek bir Marvel kahramanı mı yoksa uydurma mı olduğunu söyle. 10 soru, hızlı cevap veren daha çok puan alır.',a:['real']},
    {k:['istatistik','istat','kazanma','en iyi kahraman','kart gecmisi','mac sayisi','favori'],r:'Kahraman Kartları istatistiklerini lobideki "Kart istatistikleri" butonundan görebilirsin: kaç maç oynadın, en çok hangi kahramanla tur kazandın, kazanma oranın.',a:['stats','cards']},
    {k:['bot','yapay zeka','kolay mi','zor mu','sans','bonus','neden kaybettim','kaybettim','ezber','hile'],r:'Botlar hile yapmaz ama iyi oynar: seçilen özellikte elindeki en yüksek kartı çoğunlukla seçerler. Senin avantajın +8 "son şans" bonusu — o turda toplam kartı en az olana verilir, bu yüzden az kartla gelen büyük sayılar kazanabilir.',a:['cards']},
    {k:['cerez','kvkk','gizlilik','veri','politika','kisisel veri'],r:'Zorunlu çerezler (giriş ve ilerleme) her zaman aktif, reklam çerezi yok. Google/Micup girişi ve oyun odaları kendi servislerini kullanır. Ayrıntılar için alttaki "Çerez tercihleri"ne ya da bana tekrar sor.',a:['privacy']},
    {k:['mobil','telefon','tablet','cep','kucuk ekran'],r:'Mobilde her şey dokunmatik çalışır: kartlara dokun, alttaki menüden sayfa değiştir. Kahraman Kartları\'nda elini aşağı kaydırarak büyük bakabilirsin, sohbet baloncuklarına dokunarak açılır.',a:['cards']},
    {k:['yardim','yardim et','ne yapabilirim','nasil kullanilir','kullanim'],r:'Başlangıç için: 1) Micup ile giriş yap ya da misafir gir, 2) Oyunlar sayfasından bir oyun seç, 3) Puanların sıralamaya yazılır, her pazar şampiyon belli olur. Takılırsan bana soru sorabilirsin.',a:['oyunlar','login','siralama']},
    {k:['nasil oynanir','kural','kurallar','oynama','aciklama'],r:'Kısaca: Kahraman Kartları\'nda en yüksek özellik kartı alır, Yüksek mi Düşük mü\'de sıradaki kartın değerini tahmin edersin, Ben Kimim?\'de ipuçlarından kahramanı bulursun, Bilgi Yarışması\'nda süreli sorular var, Hafıza\'da eşleştirirsin, Gerçek mi Sahte mi?\'de ismin gerçek olup olmadığını söylersin. Hangisinin detayını istersin?',a:['cards','hl','guess','quiz','mem','real']},
    {k:['duyuru','etkinlik','takvim','haber','duyurular'],r:'Duyurular ve etkinlik takvimi ana sayfada ve Sıralama sayfasında yayınlanıyor. Etkinliklere katılmak ekstra ödül kazanmanı sağlayabilir.',a:['ana','siralama']},
    {k:['avatar','profil resmi','fotograf','isimi degistir','ad degistir','profil'],r:'Sağ üstteki adına bas: profil düzenlemeden ismini ve profil resmini değiştirebilirsin. Misafir modundaysan önce Micup ile giriş yapman gerekir.',a:['login']},
    {k:['micup','giris','hesap','baglan','login','kayit','uye'],r:()=>AUTH.user?`Şu an ${AUTH.user.display} olarak girişlisin${AUTH.user.micup?' (Micup bağlı)':' (misafir)'}. Sağ üstteki adına basınca hesabını görürsün.`:'Sağ üstteki sarı giriş butonuna bas ve Micup ile gir. Sonra hesabına Micup kullanıcı adını yazabilirsin. İstersen misafir olarak da girebilirsin.',a:['login']},
    {k:['siralama','puan','rol','avenger','birinci','lider','tablo'],r:'Oyunlardan kazandığın puanlar sıralamaya yazılır. Her Pazar 00:00\'da haftanın birincisi "Haftanın Marvel\'ı" olur. 4 haftada bir sezon kapanır, ilk 3 şampiyon çerçevesi kazanır.',a:['siralama']},
    {k:['ses','muzik','kis','kapat','sustur','yuksek ses'],r:'Sağ üstteki ses simgesine bas: müzik ve efektler için ayrı ses ayarı var. "Tümünü sustur" ile hepsini kapatabilirsin.',a:['ses']},
    {k:['sunucu','davet','discord','topluluk'],r:'Topluluğumuz Micup\'ta. Davet linkiyle hemen katılabilirsin.',a:['sunucu']},
    {k:['gunluk','odul','sandik','hediye'],r:'Her gün sağ üstteki 🎁 butonuna basıp sandığı açabilirsin. 7 gün üst üste gelirsen ödül büyür.',a:['daily']},
    {k:['level','seviye','xp','tecrube'],r:'Oyun oynadıkça XP kazanırsın ve level atlarsın. Levelin, adının yanında ve Sıralama sayfasında görünüyor.',a:['siralama']},
    {k:['cekilis','kura'],r:'Çekilişler Sıralama sayfasında. Açık bir çekilişe "Katıl" de, adminler süre bitince kazananı çeker.',a:['siralama']},
    {k:['admin','yetkili','yonetici'],r:'Adminler çekiliş açabilir, yeni admin ekleyebilir ve puan verebilir. Admin olunca sağ üstte 🛠 butonu çıkar.',a:['siralama']},
    {k:['tesekkur','sagol','eyv','eyvallah','tamam','super'],r:'Ne demek! Başka bir şey olursa buradayım.',a:['oyunlar']},
  ];
  let lastTopic=null;
  const VAGUE=new Set(['peki','devam','anlat','detay','baska','bunu','onu','evet','tamam','olur','super','harika','guzel','eyvallah','tesekkur','ederim','biraz','daha','onu','peki','ya','mi','mı']);
  function reply(text){
    const raw=String(text||'').trim(), q=n(raw).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
    if(lastTopic&&q&&q.length<30&&q.split(' ').some(w=>VAGUE.has(w))){ const r=lastTopic; return {r:typeof r.r==='function'?r.r():r.r,a:r.a}; }
    const t=' '+q+' '; let best=null,score=0;
    for(const it of I){ let s=0; for(const k of it.k) if(t.includes(n(k))) s+=k.length; if(s>score){score=s;best=it;} }
    if(!best||score<3) return {r:'Bunu tam anlayamadım. Oyunlar, kurallar, arkadaşla oynamak, online düello, istatistikler, Micup girişi ya da sıralama hakkında sorabilirsin. Örn: "düello nasıl oynanır?"',a:['oyunlar','cards','hl','stats','login']};
    lastTopic=best;
    return {r:typeof best.r==='function'?best.r():best.r,a:best.a};
  }
  function bubble(html,who){ const d=document.createElement('div'); d.className='rv-m '+who; d.innerHTML=html; LOG.appendChild(d); LOG.scrollTop=LOG.scrollHeight; G&&G.fromTo(d,{y:12,opacity:0,scale:.95},{y:0,opacity:1,scale:1,duration:.35,ease:'back.out(2)'}); return d; }
  async function say(r,a){
    const typing=bubble('<span class="dots"><i></i><i></i><i></i></span>','bot'); await new Promise(x=>setTimeout(x,450+Math.min(900,r.length*8))); typing.remove();
    bubble(esc(r),'bot'); SFX.play('toast');
    if(a&&a.length){ const row=document.createElement('div'); row.className='rv-acts'; a.forEach(id=>{const [lbl,fn]=A[id]; const b=document.createElement('button'); b.type='button'; b.textContent=lbl; b.onclick=()=>{SFX.play('click'); fn();}; row.appendChild(b);}); LOG.appendChild(row); LOG.scrollTop=LOG.scrollHeight; G&&G.from(row.children,{y:8,opacity:0,stagger:.05,duration:.3}); }
  }
  function ask(text){ if(!text.trim()) return; bubble(esc(text),'me'); const {r,a}=reply(text); say(r,a); }
  let opened=false;
  function open(){ $('#ravoTip').hidden=true; W.hidden=false; BTN.setAttribute('aria-expanded','true'); SFX.play('open'); G&&G.fromTo(W,{y:30,opacity:0,scale:.9,transformOrigin:'0% 0%'},{y:0,opacity:1,scale:1,duration:.45,ease:'back.out(1.8)'});
    if(!opened){ opened=true; say(`Selam${AUTH.user?' '+AUTH.user.display:''}! Ben Ravo. Sana siteyi gezdirebilirim. Ne yapmak istersin?`,['oyunlar','cards','login']); } setTimeout(()=>{ if(!isMob()) IN.focus(); },300); }
  function close(){ if(W.hidden) return; BTN.setAttribute('aria-expanded','false'); G?G.to(W,{y:20,opacity:0,scale:.95,duration:.25,onComplete:()=>W.hidden=true}):W.hidden=true; }
  BTN.onclick=()=>{ SFX.unlock(); W.hidden?open():close(); };
  $('#ravoX').onclick=close;
  F.onsubmit=e=>{e.preventDefault(); const v=IN.value; IN.value=''; ask(v);};
  $$('#ravoChips button').forEach(b=>b.onclick=()=>{SFX.play('click'); ask(b.textContent);});
  // ilk ziyarette küçük bir selam balonu
  setTimeout(()=>{ try{ if(localStorage.getItem('mt_ravo_seen')) return; localStorage.setItem('mt_ravo_seen','1'); }catch(e){}
    const tip=$('#ravoTip'); tip.hidden=false; G&&G.fromTo(tip,{scale:0,opacity:0},{scale:1,opacity:1,duration:.5,ease:'back.out(2.5)'}); setTimeout(()=>{ G?G.to(tip,{opacity:0,duration:.4,onComplete:()=>tip.hidden=true}):tip.hidden=true; },7000); },9000);
  return {open,close,ask};
})();


/* =====================================================================
   FIREBASE: ortak sıralama, admin, çekiliş, günlük ödül, level
   Firebase konsolundaki "firebaseConfig" bilgisini aşağıya yapıştır. Boşken site yerel modda çalışır.
   ===================================================================== */
const FIREBASE_CONFIG={
  apiKey:'AIzaSyClOYAaI04QL_vhIZJGBGzhkh1zq3enknw',
  authDomain:'marvel-turkiye-e53d8.firebaseapp.com',
  projectId:'marvel-turkiye-e53d8',
  storageBucket:'marvel-turkiye-e53d8.firebasestorage.app',
  messagingSenderId:'47837556695',
  appId:'1:47837556695:web:eabb23d3ea1873334ea592',
};
const OWNER_EMAIL='ahterahset@gmail.com'; const FIXED_ADMINS=['kknk2493@gmail.com']; const FIXED_ADMIN_UIDS=['micup_1567559341597790213']; // her zaman admin olanlar // sitenin sahibi: her zaman admin
const FB={ready:false,user:null,admin:false,db:null,auth:null};
/* ---------- level ---------- */
const lvlOf=xp=>Math.floor((Math.sqrt(1+8*Math.max(0,xp)/100)-1)/2)+1;
const xpFor=l=>100*(l-1)*l/2;
function prog(){ let s={xp:0,points:0,lastDaily:'',streak:0}; try{ s=Object.assign(s,JSON.parse(localStorage.getItem('mt_prog')||'{}')); }catch(e){} return s; }
function saveProg(s){ try{ localStorage.setItem('mt_prog',JSON.stringify(s)); }catch(e){} }
const today=()=>{ const d=new Date(Date.now()+3*3600e3); return d.toISOString().slice(0,10); }; // İstanbul günü
function addXP(n,why){
  const s=prog(); const before=lvlOf(s.xp); s.xp+=Math.max(0,Math.round(n)); saveProg(s); const after=lvlOf(s.xp);
  if(FB.ready&&FB.user) FB.db.collection('users').doc(FB.user.uid).set({xp:firebase.firestore.FieldValue.increment(Math.max(0,Math.round(n)))},{merge:true}).catch(()=>{});
  renderLevel(); if(after>before) levelUp(after);
}
function renderLevel(){
  const s=prog(), l=lvlOf(s.xp), a=xpFor(l), b=xpFor(l+1), pct=Math.round((s.xp-a)/(b-a)*100);
  const el=$('#lvlBadge'); if(el){ el.innerHTML=`<b>LV ${l}</b><i style="--p:${pct}%"></i>`; el.title=`${s.xp-a} / ${b-a} XP`; }
  const g=$('#dailyBtn'); if(g) g.classList.toggle('ready',s.lastDaily!==today());
  const lb=$('#lvlBig'); if(lb) lb.innerHTML=`<b>${l}</b><div style="flex:1;display:grid;gap:6px"><span class="mono dim">Level ${l} · ${s.xp-a} / ${b-a} XP</span><div class="bar"><i style="--p:${pct}%"></i></div></div>`;
}
function levelUp(l){
  SFX.play('win'); buzz([30,60,30,60,90]);
  const d=document.createElement('div'); d.className='lvup'; d.innerHTML=`<span>LEVEL UP!</span><b>${l}</b>`; document.body.appendChild(d);
  if(G){ G.fromTo(d,{scale:0,rotation:-30},{scale:1,rotation:-6,duration:.6,ease:'back.out(2.5)'}); G.to(d,{scale:1.3,opacity:0,delay:2,duration:.4,onComplete:()=>d.remove()}); } else setTimeout(()=>d.remove(),2500);
}
/* ---------- günlük ödül ---------- */
function openDaily(){
  const s=prog(), can=s.lastDaily!==today();
  const yest=new Date(Date.now()+3*3600e3-864e5).toISOString().slice(0,10);
  const streak=can?(s.lastDaily===yest?Math.min(7,s.streak+1):1):s.streak;
  const pts=100+(streak-1)*50, xp=50+(streak-1)*25;
  openModal('Günlük ödül');
  swap(`<div class="daily"><div class="chest${can?'':' open'}" id="chest"><span class="lid"></span><span class="box"></span><span class="glow"></span></div>
    <h3>${can?'Günlük ödülün hazır!':'Bugünkü ödülü aldın'}</h3>
    <div class="days">${[1,2,3,4,5,6,7].map(d=>`<span class="${d<streak||(!can&&d===streak)?'got':d===streak&&can?'now':''}"><b>${d}. gün</b>${100+(d-1)*50}</span>`).join('')}</div>
    <p class="dim">${can?`Seri: ${streak}. gün · <b style="color:var(--gold)">+${pts} puan</b> ve <b style="color:var(--gold)">+${xp} XP</b>`:'Yarın yine gel, seri bozulmasın. 7 gün üst üste gelene en büyük ödül.'}</p>
    ${can?'<button class="btn p" id="claim" type="button"><span class="bl"><span>Ödülü aç</span><span>Ödülü aç</span></span></button>':''}</div>`);
  const b=$('#claim'); if(!b) return;
  b.onclick=()=>{ b.disabled=true; const c=$('#chest'); SFX.sfx('riser',{vol:.5});
    if(G) G.timeline().to(c,{x:-6,duration:.05,repeat:9,yoyo:true}).add(()=>{c.classList.add('open'); SFX.sfx('reveal'); burst(true);}).to(c,{scale:1.15,duration:.2,yoyo:true,repeat:1}); else c.classList.add('open');
    const s2=prog(); s2.lastDaily=today(); s2.streak=streak; saveProg(s2);
    setTimeout(()=>{ setCoins((coins()||0)+pts); addXP(xp); toast('Ödül alındı',`+${pts} coin, +${xp} XP`);
      if(FB.ready&&FB.user) FB.db.collection('users').doc(FB.user.uid).set({lastDaily:today(),streak},{merge:true}).catch(()=>{}); renderLevel(); },900); };
}
/* ---------- Firebase yükleme ---------- */
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
async function fbInit(){
  if(!FIREBASE_CONFIG.apiKey) return;
  try{
    const v='10.12.2', base=`https://www.gstatic.com/firebasejs/${v}/`;
    await loadScript(base+'firebase-app-compat.js'); await loadScript(base+'firebase-auth-compat.js'); await loadScript(base+'firebase-firestore-compat.js');
    firebase.initializeApp(FIREBASE_CONFIG); FB.auth=firebase.auth(); FB.db=firebase.firestore(); try{ fsCache(FB.db); }catch(e){} FB.ready=true;
    FB.auth.onAuthStateChanged(async u=>{
      FB.user=u; FB.admin=false; if(AUTH.user&&AUTH.user.micup&&FIXED_ADMIN_UIDS.includes('micup_'+AUTH.user.id)) FB.admin=true;
      if(u){
        FB.admin=[OWNER_EMAIL,...FIXED_ADMINS].map(x=>x.toLowerCase()).includes((u.email||'').toLowerCase())||FIXED_ADMIN_UIDS.includes(u.uid)||(AUTH.user&&AUTH.user.micup&&FIXED_ADMIN_UIDS.includes('micup_'+AUTH.user.id));
        try{ const a=await FB.db.collection('admins').doc(u.uid).get(); if(a.exists) FB.admin=true; }catch(e){}
        const ref=FB.db.collection('users').doc(u.uid); const snap=await ref.get().catch(()=>null); const local=prog(), ls=myStats();
        const cd=snap&&snap.exists?snap.data():{}; if(cd.custom&&AUTH.user&&!AUTH.user.guest&&!AUTH.user.micup){ AUTH.user.display=cd.name||AUTH.user.display; AUTH.user.avatar=cd.avatar||null; } const _isMicupUid=(u.uid||'').startsWith('micup_');
        const name=(cd.custom&&cd.name&&!(AUTH.user&&AUTH.user.micup))?cd.name:(AUTH.user?(AUTH.user.display||AUTH.user.username):(_isMicupUid?(cd.name&&cd.name!=='Oyuncu'?cd.name:'Oyuncu'):(u.displayName||'Oyuncu')));
        const base={name,avatar:(cd.custom&&!(AUTH.user&&AUTH.user.micup))?(cd.avatar||null):((AUTH.user&&AUTH.user.avatar)||u.photoURL||null),micup:!!(AUTH.user&&AUTH.user.micup),seen:firebase.firestore.FieldValue.serverTimestamp()};
        if(!snap||!snap.exists){ FB.myPts=ls.points||0; await ref.set({...base,points:ls.points||0,xp:local.xp||0,lastDaily:local.lastDaily||'',streak:local.streak||0,created:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}).catch(()=>{}); }
        else { const d=snap.data(); await ref.set(base,{merge:true}).catch(()=>{}); const s=prog(); s.xp=Math.max(s.xp,d.xp||0); s.lastDaily=d.lastDaily>s.lastDaily?d.lastDaily:s.lastDaily; s.streak=d.streak||s.streak; saveProg(s);
          try{ if(d.inv){ const iv2=prog(); if(!iv2.inv||typeof iv2.inv!=='object') iv2.inv={boxes:{},packs:{}}; if(!iv2.inv.packs) iv2.inv.packs={}; if(!iv2.inv.boxes||typeof iv2.inv.boxes!=='object'){ const nb={}; if(typeof iv2.inv.boxes==='number'&&iv2.inv.boxes>0) nb.luck=iv2.inv.boxes; iv2.inv.boxes=nb; }
      const cl=d.inv;
      if(cl.boxes&&typeof cl.boxes==='object'){ Object.keys(cl.boxes).forEach(k=>{ iv2.inv.boxes[k]=Math.max(iv2.inv.boxes[k]||0,cl.boxes[k]||0); }); }
      else if(typeof cl.boxes==='number'&&cl.boxes>0){ iv2.inv.boxes.luck=Math.max(iv2.inv.boxes.luck||0,cl.boxes); }
      Object.keys(cl.packs||{}).forEach(k=>{ iv2.inv.packs[k]=Math.max(iv2.inv.packs[k]||0,cl.packs[k]||0); }); saveProg(iv2); } }catch(e){}
          try{ const _k='mt_pts_'+String(u.uid).replace(/^micup_/,''); const _cur=JSON.parse(localStorage.getItem(_k)||'null'); { const _lp=(_cur&&_cur.points)||0, _cp=d.points||0, _np=(typeof d.sp==='number'?d.sp:Math.max(_lp,_cp,d.wp||0)); FB.myPts=_np; if(_np>0) localStorage.setItem(_k,JSON.stringify({points:_np,best:Math.max(_np,(_cur&&_cur.best)||0),games:(_cur&&_cur.games)||0})); } }catch(e){} }
        const _muid=(u.uid||'').startsWith('micup_')?String(u.uid).slice(6):'';
        if(_muid&&(!AUTH.user||AUTH.user.guest||AUTH.user.google)){ const mn=(snap&&snap.exists&&snap.data().micupName)||''; AUTH.user={id:_muid,username:name,display:name,avatar:base.avatar,micup:true,micupName:mn}; AUTH.mode='micup'; try{localStorage.setItem('mt_user',JSON.stringify(AUTH.user));}catch(e){} }
        else if(!AUTH.user||AUTH.user.guest){ const mn=(snap&&snap.exists&&snap.data().micupName)||''; AUTH.user={username:u.displayName||name||'Oyuncu',display:name,avatar:base.avatar,google:true,micupName:mn}; AUTH.mode='google'; try{localStorage.setItem('mt_user',JSON.stringify(AUTH.user));}catch(e){} }
        try{ if(AUTH.user&&AUTH.user.member===true){ const d=snap&&snap.exists?snap.data():{}; if(!d.mcnt){ await ref.set({mcnt:true},{merge:true}); FB.db.collection('stats').doc('public').set({micupMembers:firebase.firestore.FieldValue.increment(1)},{merge:true}).catch(()=>{}); } } }catch(e){}
      }
      renderUser(); renderLevel(); renderBoards(); renderRaffles(); updAdminBtn();
    });
    FB.db.collection('raffles').orderBy('created','desc').limit(10).onSnapshot(()=>renderRaffles(),()=>{});
    try{ const ct=sessionStorage.getItem('mt_ct'); if(ct){ sessionStorage.removeItem('mt_ct'); FB.auth.signInWithCustomToken(ct).catch(e=>console.warn('Micup-Firebase',e)); const mc=sessionStorage.getItem('mt_mcnt'); if(mc&&+mc>0){ FB.db.collection('stats').doc('public').set({micupMembers:+mc},{merge:true}).catch(()=>{}); sessionStorage.removeItem('mt_mcnt'); } } }catch(e){}
  }catch(e){ console.warn('Firebase yüklenemedi',e); toast('Firebase bağlanamadı','Ayarları kontrol et. Site yerel modda çalışıyor.'); }
}
function fbSignIn(){ openLogin(); }
/* ---------- puan ve sıralama: Firebase varsa ortak tablo ---------- */
const _submitLocal=submitScore;
submitScore=function(game,score){ _submitLocal(game,score); if(game!=='daily') addXP(score/8);
  if(FB.ready&&FB.user&&window.mtScoreSync) mtScoreSync(game,score).then(()=>{renderBoards();renderUser();}).catch(()=>{}); };
const _boardLocal=getBoard;
getBoard=async function(){
  if(!FB.ready) return _boardLocal();
  try{ const q=await FB.db.collection('users').orderBy('points','desc').limit(25).get(); const me=FB.user&&FB.user.uid;
    return q.docs.map(d=>{const x=d.data(); return {uid:d.id,username:x.name,display:x.name,avatar:x.avatar,points:x.points||0,me:d.id===me,lvl:lvlOf(x.xp||0)};}); }catch(e){ return _boardLocal(); }
};
const _renderUser=renderUser;
renderUser=function(){ _renderUser(); const chip=$('#chipBtn'); if(chip&&!$('#lvlBadge',chip)){ const s=document.createElement('span'); s.id='lvlBadge'; s.className='lvl'; chip.appendChild(s); } renderLevel(); };
/* ---------- çekilişler ---------- */
async function renderRaffles(){
  const box=$('#raffles'); if(!box) return;
  if(!FB.ready){ box.innerHTML=`<div class="empty"><b>Çekilişler yakında</b><span>Firebase bağlanınca adminler çekiliş açabilecek, sen de tek tıkla katılacaksın.</span></div>`; return; }
  let list=[]; try{ const q=await FB.db.collection('raffles').orderBy('created','desc').limit(10).get(); list=q.docs.map(d=>({id:d.id,...d.data()})).filter(r=>!r.winner); }catch(e){}
  if(!list.length){ box.innerHTML=`<div class="empty"><b>Şu an açık çekiliş yok</b><span>Adminler yeni çekiliş açınca burada görünecek.</span></div>`; return; }
  const me=FB.user&&FB.user.uid;
  const rows=await Promise.all(list.map(async r=>{ let n=0, joined=false; try{ const e=await FB.db.collection('raffles').doc(r.id).collection('entries').get(); n=e.size; joined=!!me&&e.docs.some(x=>x.id===me); }catch(e){}
    const end=r.endsAt&&r.endsAt.toDate?r.endsAt.toDate():null;
    return `<div class="rf${r.winner?' done':''}"><div class="rfh"><span class="cap">${r.winner?'Bitti':'Açık'}</span><b>${esc(r.title||'Çekiliş')}</b></div><p>🎁 ${esc(r.prize||'')}</p>
      <div class="rfm mono">${n} katılımcı${end?` · bitiş ${end.toLocaleDateString('tr-TR')}`:''}</div>
      ${r.winner?`<div class="rfw">🏆 Kazanan: <b>${esc(r.winner)}</b></div>`:`<div class="rowb">${joined?'<span class="mono" style="color:var(--ok)">Katıldın ✓</span>':`<button class="btn p sm" data-join="${r.id}" type="button"><span class="bl"><span>Katıl</span><span>Katıl</span></span></button>`}${FB.admin?`<button class="ghost" data-draw="${r.id}" type="button">Çekilişi yap</button>`:''}</div>`}</div>`; }));
  box.innerHTML=rows.join('');
  $$('[data-join]',box).forEach(b=>b.onclick=async()=>{ if(!FB.user) return fbSignIn(); SFX.play('click');
    await FB.db.collection('raffles').doc(b.dataset.join).collection('entries').doc(FB.user.uid).set({name:AUTH.user?(AUTH.user.display||AUTH.user.username):'Oyuncu',at:firebase.firestore.FieldValue.serverTimestamp()}).catch(e=>toast('Katılamadın',String(e.message||e)));
    SFX.play('correct'); toast('Çekilişe katıldın','Bol şans!'); renderRaffles(); });
  $$('[data-draw]',box).forEach(b=>b.onclick=()=>drawRaffle(b.dataset.draw));
}
async function drawRaffle(id){
  const e=await FB.db.collection('raffles').doc(id).collection('entries').get(); const names=e.docs.map(d=>d.data().name||'Oyuncu');
  if(!names.length) return toast('Katılımcı yok','Henüz kimse katılmadı.');
  const win=names[Math.random()*names.length|0];
  openModal('Çekiliş');
  swap(`<div class="draw"><div class="reel" id="reel">${names[0]}</div><p class="dim">${names.length} katılımcı arasından seçiliyor…</p></div>`);
  const reel=$('#reel'); let i=0; const t0=performance.now();
  await new Promise(res=>{ (function spin(){ const el=performance.now()-t0; reel.textContent=names[i++%names.length]; SFX.play('tick',5); if(el<3200) setTimeout(spin,40+el/22); else res(); })(); });
  reel.textContent=win; reel.classList.add('win'); SFX.play('win'); burst(true);
  await FB.db.collection('raffles').doc(id).set({winner:win,drawnAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}).catch(err=>toast('Kaydedilemedi',String(err.message||err)));
  renderRaffles();
}
/* ---------- admin paneli ---------- */
function updAdminBtn(){ const b=$('#adminBtn'); if(b){ try{ if(AUTH.user&&AUTH.user.micup&&FIXED_ADMIN_UIDS.includes('micup_'+AUTH.user.id)) FB.admin=true; }catch(e){} b.hidden=!FB.admin; } }
function openAdmin(){
  if(!FB.admin) return;
  openModal('Admin paneli');
  swap(`<div class="adm"><div class="tabs2"><button class="on" data-t="r" type="button">Çekiliş aç</button><button data-t="a" type="button">Admin ekle</button><button data-t="p" type="button">Puan ver</button><button data-t="d" type="button">🛠 Yönetim</button></div>
    <form id="admR" class="admf"><label class="mono dim" for="rT">Başlık</label><input class="field" id="rT" maxlength="60" placeholder="Haftalık çekiliş" required>
      <label class="mono dim" for="rP">Ödül</label><input class="field" id="rP" maxlength="80" placeholder="Micup Plus 1 ay" required>
      <label class="mono dim" for="rD">Bitiş tarihi</label><input class="field" id="rD" type="date">
      <button class="btn p" type="submit"><span class="bl"><span>Çekilişi aç</span><span>Çekilişi aç</span></span></button></form>
    <form id="admA" class="admf" hidden><label class="mono dim" for="aE">Yeni admin: Micup ID veya kullanıcı adı</label><input class="field" id="aE" type="text" placeholder="1567559341597790213" required>
      <button class="btn p" type="submit"><span class="bl"><span>Admin yap</span><span>Admin yap</span></span></button><div id="admList" class="mono dim"></div></form>
    <form id="admP" class="admf" hidden><label class="mono dim" for="pN">Oyuncu adı</label><input class="field" id="pN" placeholder="Sıralamadaki adı" required><label class="mono dim" for="pV">Puan (eksi de olur)</label><input class="field" id="pV" type="number" value="100" required>
      <button class="btn p" type="submit"><span class="bl"><span>Uygula</span><span>Uygula</span></span></button></form>
    <div id="admD" class="admf" hidden>
      <label class="mono dim">Tehlikeli işlemler (sadece admin)</label>
      <button class="ghost" id="admWipe" type="button" style="border-color:var(--red)">⚠ Herkesin coin/puan/XP değerini sıfırla</button>
      <button class="ghost" id="admWipeAll" type="button" style="border-color:var(--red)">☠ Herkesin TÜM verisini sil (kart+çerçeve+puan, sen hariç)</button>
      <div style="margin-top:14px"><b class="mono dim" style="font-size:12px">Duyurular</b><div id="admAnn" class="mono dim" style="margin-top:6px;max-height:180px;overflow:auto"></div></div>
      <div style="margin-top:14px"><b class="mono dim" style="font-size:12px">Çekilişler</b><div id="admRaf" class="mono dim" style="margin-top:6px;max-height:180px;overflow:auto"></div></div>
    </div></div>`);
  $$('.tabs2 button',mBody).forEach(b=>b.onclick=()=>{ $$('.tabs2 button',mBody).forEach(x=>x.classList.toggle('on',x===b)); $('#admR').hidden=b.dataset.t!=='r'; $('#admA').hidden=b.dataset.t!=='a'; $('#admP').hidden=b.dataset.t!=='p'; const dd=$('#admD'); dd&&(dd.hidden=b.dataset.t!=='d'); if(b.dataset.t==='d') loadAdmLists(); SFX.play('click'); });
  $('#admR').onsubmit=async e=>{ e.preventDefault(); const d=$('#rD').value; await FB.db.collection('raffles').add({title:$('#rT').value.trim(),prize:$('#rP').value.trim(),endsAt:d?firebase.firestore.Timestamp.fromDate(new Date(d+'T20:59:00Z')):null,created:firebase.firestore.FieldValue.serverTimestamp(),createdBy:FB.user.uid,winner:null}).then(()=>{toast('Çekiliş açıldı','Sıralama sayfasında görünüyor.'); closeModal(); renderRaffles();}).catch(err=>toast('Açılamadı',String(err.message||err))); };
  $('#admA').onsubmit=async e=>{ e.preventDefault(); const em=$('#aE').value.trim().toLowerCase(); let d=null;
    const q=await FB.db.collection('private').where('email','==',em).limit(1).get().catch(()=>null);
    if(q&&!q.empty) d=q.docs[0];
    if(!d){ const q2=await FB.db.collection('users').where('name','==',$('#aE').value.trim()).limit(1).get().catch(()=>null); if(q2&&!q2.empty) d=q2.docs[0]; }
    if(!d){ const raw=$('#aE').value.trim(), digs=raw.replace(/\D/g,''); for(const cand of [raw,'micup_'+raw,digs?'micup_'+digs:null]){ if(!cand) continue; const g=await FB.db.collection('users').doc(cand).get().catch(()=>null); if(g&&g.exists){ d=g; break; } } }
    if(!d) return toast('Bulunamadı','Bu Micup ID veya kullanıcı adı ile siteye giriş yapılmamış.'); await FB.db.collection('admins').doc(d.id).set({email:em,name:d.data().name||'',by:FB.user.uid}).then(()=>toast('Admin eklendi',`${d.data().name||em} artık admin.`)).catch(err=>toast('Eklenemedi',String(err.message||err))); };
  $('#admP').onsubmit=async e=>{ e.preventDefault(); const n=$('#pN').value.trim(), v=parseInt($('#pV').value,10)||0; const q=await FB.db.collection('users').where('name','==',n).limit(1).get().catch(()=>null);
    if(!q||q.empty) return toast('Bulunamadı','Bu isimde oyuncu yok.'); await q.docs[0].ref.set({points:firebase.firestore.FieldValue.increment(v)},{merge:true}).then(()=>{toast('Puan güncellendi',`${n}: ${v>0?'+':''}${v}`); renderBoards();}).catch(err=>toast('Olmadı',String(err.message||err))); };
}
async function loadAdmLists(){
    const _w=$('#admWipe'); if(_w&&!_w.dataset.bound){ _w.dataset.bound='1'; _w.onclick=async()=>{ const b=_w;
      if(!b.dataset.ok){ b.dataset.ok='1'; b.textContent='⚠ GERÇEKTEN SIFIRLA? Tüm coin/puan/XP silinecek — tekrar tıkla'; setTimeout(()=>{delete b.dataset.ok;b.textContent='⚠ Herkesin coin/puan/XP değerini sıfırla';},4000); return; }
      b.disabled=true; b.textContent='Sıfırlanıyor…';
      try{ console.log('MT-WIPE',AUTH.user&&AUTH.user.id); const j=await micupExchange({action:'wipe',micup_id:AUTH.user&&AUTH.user.id}); console.log('MT-WIPE-res',JSON.stringify(j));
        if(!j||j.error) throw new Error((j&&j.error)||'Köprü yanıt vermedi');
        toast('Sıfırlandı',(j.n||0)+' oyuncunun coin/puan/XP değeri 0 yapıldı.'); renderBoards(); loadAdmLists();
      }catch(err){ toast('Hata',String(err.message||err)); }
      b.disabled=false; b.textContent='⚠ Herkesin coin/puan/XP değerini sıfırla'; delete b.dataset.ok; }; }
    const _wa=$('#admWipeAll'); if(_wa&&!_wa.dataset.bound){ _wa.dataset.bound='1'; _wa.onclick=async()=>{ const b=_wa;
      if(!b.dataset.ok){ b.dataset.ok='1'; b.textContent='Emin misin? TÜM oyuncu verileri (kartlar, çerçeveler, coin, puan) SİLİNECEK — tekrar bas'; setTimeout(()=>{ if(b.dataset.ok){ delete b.dataset.ok; b.textContent='☠ Herkesin TÜM verisini sil (kart+çerçeve+puan, sen hariç)'; } },4000); return; }
      b.disabled=true; b.textContent='Siliniyor…';
      try{ console.log('MT-WIPEALL',AUTH.user&&AUTH.user.id); const j=await micupExchange({action:'wipeall',micup_id:AUTH.user&&AUTH.user.id}); console.log('MT-WIPEALL-res',JSON.stringify(j));
        if(!j||j.error) throw new Error((j&&j.error)||'Köprü yanıt vermedi');
        toast('Silindi',(j.n||0)+' oyuncunun tüm oyun verisi sıfırlandı (senin verin korundu).'); renderBoards(); loadAdmLists();
      }catch(err){ toast('Hata',String(err.message||err)); }
      b.disabled=false; b.textContent='☠ Herkesin TÜM verisini sil (kart+çerçeve+puan, sen hariç)'; delete b.dataset.ok; }; }
    try{ const a=await FB.db.collection('announcements').orderBy('created','desc').limit(20).get();
      $('#admAnn').innerHTML=a.empty?'<span>duyuru yok</span>':a.docs.map(d=>{const x=d.data();return '<div style="display:flex;gap:8px;align-items:center;padding:4px 0"><span style="flex:1">'+esc(x.title||'(isimsiz)')+'</span><button class="ghost" data-delann="'+d.id+'" type="button">sil</button></div>';}).join('');
      $$('[data-delann]',mBody).forEach(b=>b.onclick=async()=>{ b.disabled=true; console.log('MT-DEL-ann',b.dataset.delann); try{ const j=await micupExchange({action:'del',coll:'announcements',id:b.dataset.delann,micup_id:AUTH.user&&AUTH.user.id}); console.log('MT-DEL-res',JSON.stringify(j)); if(j&&j.error) toast('Silinemedi',j.error); }catch(e){ console.log('MT-DEL-hata',String(e&&e.message||e)); } loadAdmLists(); }); }catch(e){}
    try{ const r=await FB.db.collection('raffles').orderBy('created','desc').limit(20).get();
      $('#admRaf').innerHTML=r.empty?'<span>çekiliş yok</span>':r.docs.map(d=>{const x=d.data();return '<div style="display:flex;gap:8px;align-items:center;padding:4px 0"><span style="flex:1">'+esc(x.title||'(isimsiz)')+(x.winner?' · bitti':'')+'</span><button class="ghost" data-delraf="'+d.id+'" type="button">sil</button></div>';}).join('');
      $$('[data-delraf]',mBody).forEach(b=>b.onclick=async()=>{ b.disabled=true; console.log('MT-DEL-raf',b.dataset.delraf); try{ const j=await micupExchange({action:'del',coll:'raffles',id:b.dataset.delraf,micup_id:AUTH.user&&AUTH.user.id}); console.log('MT-DEL-res',JSON.stringify(j)); if(j&&j.error) toast('Silinemedi',j.error); }catch(e){ console.log('MT-DEL-hata',String(e&&e.message||e)); } loadAdmLists(); renderRaffles(); }); }catch(e){}
  }
$('#dailyBig').onclick=()=>{ SFX.play('click'); openDaily(); };
$('#dailyBtn').onclick=()=>{ SFX.unlock(); SFX.play('click'); openDaily(); };
$('#adminBtn').onclick=()=>{ SFX.play('click'); openAdmin(); };
$('#raffleSignIn')&&($('#raffleSignIn').onclick=fbSignIn);
renderLevel(); renderRaffles(); fbInit();
/* ---------- site uye sayisi: kilometre tasi duyurulari ---------- */
const MILESTONES=[10,25,50,100,250,500,1000,2500,5000];
async function checkSiteMilestones(){ if(!(FB.ready&&FB.user)||document.hidden) return;
  try{ const col=FB.db.collection('users'); const n=col.count?(await col.count().get()).data().count:(await col.get()).size;
    const ref=FB.db.collection('stats').doc('public'); const sn=await ref.get(); const sd=sn.exists?sn.data():{};
    const last=sd.lastMilestone||0;
    if(n>last){ const hit=MILESTONES.filter(m=>m>last&&m<=n); if(hit.length){
      const top=hit[hit.length-1];
      await ref.set({lastMilestone:top,siteMembers:n},{merge:true}).catch(()=>{});
      await FB.db.collection('announcements').add({title:'🎉 '+top+' kişi siteye üye oldu!',text:'Marvel Türkiye topluluğu büyüyor — '+n+' üye! Sen de arkadaşlarını davet et.',created:firebase.firestore.FieldValue.serverTimestamp()}).catch(()=>{});
      toast('🎉 '+top+' üye!',n+' kişi siteye üye oldu.'); } }
  }catch(e){}
}
setInterval(()=>{ if(!document.hidden) checkSiteMilestones(); },120000); setTimeout(checkSiteMilestones,20000);
/* ekonomi sifirlama: admin sifirlarsa herkesin yerel coin/xp/puan'i de sifirlansin */
let _eresetDone=false;
async function checkEconReset(){
  try{ let ms=0;
    // 1) kopru uzerinden (misafirler dahil herkes)
    try{ const r=await fetch(MICUP_CONFIG.tokenProxy+'?ereset=1&callback=cb',{cache:'no-store'}); const t=await r.text(); const m=t.match(/cb\((\{[\s\S]*?\})\)/); if(m){ const j=JSON.parse(m[1]); ms=Math.max(ms,+(j.t||0)); } }catch(e){}
    // 2) firestore (giris yapanlar icin ek kaynak)
    try{ if(FB.ready&&FB.db){ const sn=await FB.db.collection('stats').doc('public').get(); const ts=sn.exists&&sn.data().economyReset; if(ts){ const v=ts.toMillis?ts.toMillis():+ts; ms=Math.max(ms,v); } } }catch(e){}
    const lm=+(localStorage.getItem('mt_ereset')||0); if(ms<=lm) return;
    const s=prog(); s.xp=0; s.points=0; s.coins=0; saveProg(s);
    try{ const pk=ptsKey(), ps=JSON.parse(localStorage.getItem(pk)||'null'); if(ps){ ps.points=0; ps.best=0; ps.games=0; localStorage.setItem(pk,JSON.stringify(ps)); } }catch(e){}
    try{localStorage.setItem('mt_ereset',String(ms));}catch(e){}
    renderLevel(); if(window.renderShop) renderShop(); renderUser();
  }catch(e){} }
setInterval(()=>{ if(!document.hidden) checkEconReset(); },180000); setTimeout(checkEconReset,15000);

/* ========================= ŞANS ÇARKI + KOLEKSİYON KARTLARI ========================= */
const WHEEL=[
  {t:'150',s:'PUAN',k:'pts',v:150,w:18,c:'#FFB627'},
  {t:'1',s:'KART',k:'card',v:1,w:15,c:'#4A7BFF'},
  {t:'300',s:'PUAN',k:'pts',v:300,w:12,c:'#FF3B4E'},
  {t:'100',s:'XP',k:'xp',v:100,w:13,c:'#3DDC97'},
  {t:'1',s:'KART',k:'card',v:1,w:11,c:'#9B5CFF'},
  {t:'50',s:'XP',k:'xp',v:50,w:10,c:'#5AB4FF'},
  {t:'2',s:'KART',k:'card',v:2,w:7,c:'#39D98A'},
  {t:'500',s:'PUAN',k:'pts',v:500,w:5,c:'#FF8A3D'},
  {t:'3',s:'KART',k:'card',v:3,w:4,c:'#B06BFF'},
  {t:'25',s:'XP',k:'xp',v:25,w:8,c:'#FF5AB4'},
  {t:'750',s:'PUAN',k:'pts',v:750,w:3,c:'#FFD23F'},
  {t:'EFSANE',s:'KART',k:'leg',v:1,w:2,c:'#111'}
];
const RAR_W={b:52,g:30,a:14,e:4};
function myCards(){ const s=prog(); return s.cards||{}; }
function setCards(c,show){ const s=prog(); s.cards=c; if(show) s.showcase=show; saveProg(s);
  if(FB.ready&&FB.user){ const d={cards:c}; if(show) d.showcase=show; FB.db.collection('users').doc(FB.user.uid).set(d,{mergeFields:Object.keys(d)}).catch(()=>{}); } } /* mergeFields: silinen kart bulutta da silinsin */
function pickHero(minR){ const order=['b','g','a','e']; const pool=HEROES_CG.filter(h=>order.indexOf(h.r)>=order.indexOf(minR||'b'));
  let tot=pool.reduce((a,h)=>a+RAR_W[h.r],0), x=Math.random()*tot; for(const h of pool){ x-=RAR_W[h.r]; if(x<=0) return h; } return pool[0]; }
function wheelSVG(){
  const n=WHEEL.length, R=150, a=360/n; let p='';
  WHEEL.forEach((s,i)=>{ const a0=(i*a-90-a/2)*Math.PI/180, a1=((i+1)*a-90-a/2)*Math.PI/180;
    const x0=R+R*Math.cos(a0), y0=R+R*Math.sin(a0), x1=R+R*Math.cos(a1), y1=R+R*Math.sin(a1);
    p+=`<path d="M${R} ${R}L${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}Z" fill="${s.c}" stroke="#07060b" stroke-width="5"/>`;
    p+=`<g transform="rotate(${i*a} ${R} ${R})"><text x="${R}" y="${s.k==='leg'?52:58}" text-anchor="middle" class="wt ${s.k==='leg'?'leg':''}">${s.t}</text><text x="${R}" y="${s.k==='leg'?74:80}" text-anchor="middle" class="ws">${s.s}</text></g>`; });
  for(let i=0;i<n;i++){ const an=(i*a-90-a/2)*Math.PI/180; p+=`<circle cx="${(R+(R-9)*Math.cos(an)).toFixed(1)}" cy="${(R+(R-9)*Math.sin(an)).toFixed(1)}" r="5" class="wbulb"/>`; }
  return `<svg viewBox="-8 -8 316 316" class="wsvg">${p}<circle cx="${R}" cy="${R}" r="${R}" fill="none" stroke="#07060b" stroke-width="10"/></svg>`;
}
openDaily=function(){
  const s=prog(), can=s.lastDaily!==today();
  const yest=new Date(Date.now()+3*3600e3-864e5).toISOString().slice(0,10);
  const streak=can?(s.lastDaily===yest?Math.min(7,s.streak+1):1):s.streak;
  const mult=1;
  openModal('Günlük şans çarkı');
  swap(`<div class="daily wheelbox">
    <div class="days">${[1,2,3,4,5,6,7].map(d=>`<span class="${d<streak||(!can&&d===streak)?'got':d===streak&&can?'now':''}"><b>${d}. gün</b></span>`).join('')}</div>
    <div class="wheel"><div class="wpin"></div><div class="wrot" id="wrot">${wheelSVG()}</div><button class="whub" id="spin" type="button" ${can?'':'disabled'}>${can?'ÇEVİR!':'<span class="cdt" id="whubT">--:--:--</span>'}</button></div>
    <p class="dim">${can?`Seri ${streak}. gün · her gün ödül kazan. 7 gün üst üste gel, seri bozulmasın.`:'Bugün çevirdin. Çark gece yarısı (00:00) yenilenir — o saatte geri gel, seri bozulmasın.'}</p>
    <div class="rowb" style="justify-content:center"><button class="ghost" id="toCol" type="button">Koleksiyonum (${Object.keys(myCards()).length}/${HEROES_CG.length})</button></div></div>`);
  $('#toCol').onclick=()=>openCollection();
  if(!can){ const cd=$('#whubT'); if(cd){ const tick=()=>{ const n=new Date(); n.setHours(24,0,0,0); let ms=n-Date.now(); if(ms<0)ms=0; const h=String(Math.floor(ms/36e5)).padStart(2,'0'),mm=String(Math.floor(ms%36e5/6e4)).padStart(2,'0'),ss=String(Math.floor(ms%6e4/1e3)).padStart(2,'0'); cd.textContent=h+':'+mm+':'+ss; }; tick(); const iv=setInterval(tick,1000); setTimeout(()=>clearInterval(iv),864e5); } }
  const b=$('#spin'); if(!b||!can) return;
  b.onclick=()=>{ b.disabled=true; SFX.unlock&&SFX.unlock();
    const tot=WHEEL.reduce((a,x)=>a+x.w,0); let r=Math.random()*tot, idx=0; for(let i=0;i<WHEEL.length;i++){ r-=WHEEL[i].w; if(r<=0){idx=i;break;} }
    const seg=360/WHEEL.length, target=360*6+(360-idx*seg)+(Math.random()-.5)*seg*.6;
    const rot=$('#wrot'); let last=0; SFX.sfx('riser',{vol:.35});
    const s2=prog(); s2.lastDaily=today(); s2.streak=streak; saveProg(s2);
    if(FB.ready&&FB.user) FB.db.collection('users').doc(FB.user.uid).set({lastDaily:today(),streak},{merge:true}).catch(()=>{});
    const done=()=>{ const w=WHEEL[idx]; $('.wheel').classList.add('won'); SFX.sfx('reveal'); buzz([30,50,30]); burst(true);
      setTimeout(()=>{ if(w.k==='pts'){ const p=Math.round(w.v*mult); setCoins((coins()||0)+p); toast('Çarktan ödül!',`+${p} coin`); closeModal(); }
        else if(w.k==='xp'){ const x=Math.round(w.v*mult); addXP(x); toast('Çarktan ödül!',`+${x} XP`); closeModal(); }
        else { const list=[]; for(let i=0;i<w.v;i++) list.push(pickHero(w.k==='leg'?'e':'b')); packOpen(list); }
        renderLevel(); },900); };
    if(G){ const o={r:0}; G.to(o,{r:target,duration:5.2,ease:'power4.out',onUpdate:()=>{ rot.style.transform=`rotate(${o.r}deg)`; const k=Math.floor((o.r+seg/2)/seg); if(k!==last){ last=k; SFX.play('tick',4); const pin=$('.wpin'); pin&&G.fromTo(pin,{rotation:-22},{rotation:0,duration:.18,ease:'back.out(3)'}); } },onComplete:done}); }
    else { rot.style.transform=`rotate(${target}deg)`; setTimeout(done,300); }
  };
};
/* kart paketi açılışı */
function packOpen(list,pack,fast){
  const c=myCards(); const items=list.map(h=>{ const isNew=!c[h.id]; c[h.id]=(c[h.id]||0)+1; return {h,isNew}; }); setCards(c);
  addXP(40*list.length);
  if(fast){
    swap(`<div class="prow" style="justify-content:center">${items.map(it=>`<div class="pc r-${it.h.r} open out" style="opacity:1"><div class="pin"><div class="pf"><img src="${cardFace(it.h)}" alt="${esc(it.h.ad)}"></div></div>${it.isNew?'<em>YENİ!</em>':`<em class="dup">x${c[it.h.id]}</em>`}</div>`).join('')}</div>
    <p class="dim" style="text-align:center;margin-top:14px">Kartlar anında açıldı.</p>
    <div class="rowb" id="pActs" style="justify-content:center;display:flex"><button class="ghost" id="pAg" type="button">🔁 Tekrar aç</button><button class="ghost" id="pFast" type="button">⚡ Hızlı aç</button><button class="ghost" id="p10" type="button">🃏 10'lu aç · 🪙 2.200</button><button class="btn p" id="pCol" type="button"><span class="bl"><span>Koleksiyona git</span><span>Koleksiyona git</span></span></button></div>`);
    const _ag2=$('#pAg'); _ag2&&(_ag2.onclick=()=>{ if(window.__MT_REPACK) window.__MT_REPACK(pack); });
    const _fa2=$('#pFast'); _fa2&&(_fa2.onclick=()=>{ if(window.__MT_REPACK) window.__MT_REPACK(pack,true); });
    const _t2=$('#p10'); _t2&&(_t2.onclick=()=>{ if(window.__MT_BUY10) window.__MT_BUY10(); });
    const _c2=$('#pCol'); _c2&&(_c2.onclick=()=>openCollection());
    SFX.play('win'); return;
  }
  swap(`
  <div class="popen"><div class="rays"></div>
    <div class="pk ${pack?pack.cls:'pk-std'} big tap" id="pkPack" style="position:relative;overflow:hidden">
      <b>MARVEL</b><small>${pack?esc(pack.n):'ÖDÜL PAKETİ'}</small>
      <div class="pkmouth" id="pkM"></div>
      <div class="pkz" id="pkZ"><div class="zipt">⇅</div></div>
    </div>
    <div class="prow">${items.map((it,i)=>`<div class="pc r-${it.h.r}" data-i="${i}" style="opacity:0"><div class="pin"><div class="pf"><img alt="${esc(it.h.ad)}" src="${cardFace(it.h)}"></div><div class="pb"><span>?</span></div></div>${it.isNew?'<em>YENİ!</em>':`<em class="dup">x${c[it.h.id]}</em>`}</div>`).join('')}</div>
    <p class="dim" id="pTip">Paketi aşağı kaydırarak aç</p>
    <div class="rowb" id="pActs" style="justify-content:center;display:none">${pack?'<button class="ghost" id="pAg" type="button">🔁 Tekrar aç · 🪙 '+pack.price.toLocaleString('tr-TR')+'</button>':'<button class="ghost" id="pAg" type="button">🔁 Tekrar aç</button>'}<button class="ghost" id="pFast" type="button">⚡ Hızlı aç</button><button class="ghost" id="p10" type="button">🃏 10\'lu aç · 🪙 2.200</button><button class="btn p" id="pCol" type="button"><span class="bl"><span>Koleksiyona git</span><span>Koleksiyona git</span></span></button></div>
  </div>`);
  const _ag=$('#pAg'); _ag&&(_ag.onclick=()=>{ if(window.__MT_REPACK){ window.__MT_REPACK(pack); } });
  const _fa=$('#pFast'); _fa&&(_fa.onclick=()=>{ if(window.__MT_REPACK){ window.__MT_REPACK(pack,true); } });
  const _t10=$('#p10'); _t10&&(_t10.onclick=()=>{ if(window.__MT_BUY10){ window.__MT_BUY10(); } });
  $('#pCol').onclick=()=>openCollection();
  const pk=$('#pkPack'), pkZ=$('#pkZ'), pkM=$('#pkM'), tip=$('#pTip'), acts=$('#pActs'); pk.style.touchAction='none';
  const flipCard=el=>{ if(el.classList.contains('open')) return; el.classList.add('open'); SFX.sfx('flip');
    setTimeout(()=>{ SFX.sfx(el._rar==='e'?'cosmic':el._rar==='a'?'reveal':'cardhit'); if(el._rar==='e'||el._rar==='a'){ burst(true); buzz([40,60,40]); } },280); };
  const cards=$$('.pc'); let stage=0, out=0;
  cards.forEach((el,i)=>{ el._rar=items[i].h.r; el.style.transition='none'; el.onclick=()=>{ if(el.classList.contains('out')) flipCard(el); }; });
  // kartlar paketin agzindan slotlarina ucur
  const place=()=>{ const mr=pk.getBoundingClientRect(), mx=mr.left+mr.width/2, my=mr.top+mr.height*.30;
    cards.forEach(el=>{ const r=el.getBoundingClientRect(), dx=mx-(r.left+r.width/2), dy=my-(r.top+r.height/2), rot=(Math.random()-.5)*36;
      el._dx=dx; el._dy=dy; el._rot=rot;
      el.style.transform='translate('+dx+'px,'+dy+'px) scale(.3) rotate('+rot+'deg)'; });
    requestAnimationFrame(()=>cards.forEach(el=>el.style.transition='')); };
  requestAnimationFrame(()=>requestAnimationFrame(place));
  const dispense=()=>{ if(out>=cards.length) return; const el=cards[out++], dx=el._dx||0, dy=el._dy||0, rot=el._rot||0;
    el.style.transition='none'; el.style.opacity='0';
    el.style.transform='translate('+dx+'px,'+dy+'px) scale(.3) rotate('+rot+'deg)'; void el.offsetWidth;
    const done=()=>{ el.style.transition=''; el.style.opacity='1'; el.classList.add('out'); setTimeout(()=>flipCard(el),140); SFX.sfx('whoosh',{vol:.4,rate:.9+Math.random()*.3}); };
    if(el.animate){ const anim=el.animate([
      {transform:'translate('+dx+'px,'+dy+'px) scale(.3) rotate('+rot+'deg)',opacity:0},
      {transform:'translate('+dx+'px,'+(dy-95)+'px) scale(.55) rotate('+(rot*.4)+'deg)',opacity:1,offset:.34},
      {transform:'translate('+(dx*.55)+'px,'+(dy-45)+'px) scale(.85) rotate('+(rot*.12)+'deg)',opacity:1,offset:.62},
      {transform:'translate(0,0) scale(1) rotate(0deg)',opacity:1}
    ],{duration:820,easing:'cubic-bezier(.25,.8,.3,1.05)',fill:'forwards'});
      anim.onfinish=()=>{ try{anim.commitStyles();}catch(e){} anim.cancel(); done(); }; }
    else { el.style.transform='translate(0,0) scale(1) rotate(0deg)'; setTimeout(done,500); } };
  const finish=()=>{ if(tip) tip.textContent='Kartlara dokun, çevir!'; if(acts) acts.style.display='flex'; pk.classList.add('gone'); SFX.sfx('win'); };
  const openZip=()=>{ if(stage!==0) return; stage=1; pkZ.classList.add('off'); pkM.classList.add('on'); pk.classList.remove('tap');
    SFX.sfx('riser',{vol:.5}); buzz([20,40,20]);
    setTimeout(()=>{ if(tip) tip.textContent='Üstüne bas, içinden kart çıkıcak'; stage=2;
      if(fast){ cards.forEach((el,i)=>setTimeout(dispense, i*160)); setTimeout(finish, cards.length*160+1000); }
    },380); };
  // fermuar: tum paketi asagi surukle VEYA dokun
  let dy=0, sy=0, drag=false;
  pk.addEventListener('pointerdown',e=>{ if(stage!==0) return; drag=true; sy=e.clientY; dy=0; pkZ.classList.add('drag'); try{pk.setPointerCapture(e.pointerId)}catch(_){} });
  pk.addEventListener('pointermove',e=>{ if(!drag||stage!==0) return; dy=Math.max(0,e.clientY-sy); pkZ.style.transform='translateY('+Math.min(dy,pk.clientHeight)+'px)'; });
  const endDrag=()=>{ if(!drag) return; drag=false; pkZ.classList.remove('drag'); pkZ.style.transform='';
    if(stage===0&&(dy>90||dy<=12)) openZip(); };
  pk.addEventListener('pointerup',endDrag); pk.addEventListener('pointercancel',endDrag);
  // asama 2: pakete dokun -> 1 kart
  pk.addEventListener('click',e=>{ if(stage!==2||out>=cards.length) return; if(e.target.closest&&e.target.closest('.pc')) return; dispense(); if(out>=cards.length) setTimeout(finish,750); });
  if(fast){ setTimeout(openZip,400); }
}


/* koleksiyon + vitrin */
function openCollection(){
  const c=myCards(), show=(prog().showcase||[]).filter(id=>c[id]);
  const order={e:0,a:1,g:2,b:3}; const list=[...HEROES_CG].sort((x,y)=>order[x.r]-order[y.r]);
  const RCN={e:'EFSANEVİ',a:'EPİK',g:'NADİR',b:'BRONZ'}, RC={e:'#ff3b4e',a:'#ffb627',g:'#d5dae4',b:'#c8834a'};
  const cnt={e:0,a:0,g:0,b:0}; Object.keys(c).forEach(id=>{const h=HERO_BY[id]; if(h&&cnt[h.r]!==undefined)cnt[h.r]++;});
  const own=Object.keys(c).length, total=HEROES_CG.length, pct=Math.round(own/total*100);
  if(!document.getElementById('colCss')){ const st=document.createElement('style'); st.id='colCss'; st.textContent=COL_CSS; document.head.appendChild(st); }
  openModal('Koleksiyonum');
  const cardHTML=h=>c[h.id]?`<button type="button" class="ck r-${h.r}${show.includes(h.id)?' on':''}" data-id="${h.id}" data-r="${h.r}"><span class="ckimg"><img alt="${esc(h.ad)}" src="${cardFace(h)}"></span><i class="mono cnt">×${c[h.id]}</i><s class="star">★</s></button>`:`<div class="ck lock r-${h.r}" data-r="${h.r}"><span>?</span><i class="mono">${RCN[h.r][0]}</i></div>`;
  swap(`<div class="collx">
    <div class="cxhero"><div class="cxht"><span class="mono">KOLEKSİYON</span><span class="mono cxpct">%${pct}</span></div>
      <h3>${own}<small>/${total}</small> kahraman</h3>
      <div class="cxbar"><i style="--p:${pct}%"></i></div>
      <div class="cxstats">${['e','a','g','b'].map(r=>`<div class="cxst" style="--rc:${RC[r]}"><b>${cnt[r]}</b><span>${RCN[r]}</span></div>`).join('')}</div></div>
    <div class="cxfilters"><button class="cxchip on" data-f="all" type="button">Tümü</button>${['e','a','g','b'].map(r=>`<button class="cxchip" data-f="${r}" type="button" style="--rc:${RC[r]}">${RCN[r]}</button>`).join('')}<button class="cxchip" data-f="lock" type="button">Kilitli</button><span class="cxmeta">🃏 ${own} kart sende · ⭐ Vitrin ${show.length}/3</span></div>
    <div class="cgrid" id="cxGrid">${list.map(cardHTML).join('')}</div>
    <p class="dim" style="text-align:center;margin:4px 0 0">Karta dokun → profil vitrinine ekle (en fazla 3). Filtrelerle nadirliğe göre gez.</p></div>`);
  $$('.cxchip').forEach(ch=>ch.onclick=()=>{ SFX.play('click'); $$('.cxchip').forEach(x=>x.classList.remove('on')); ch.classList.add('on'); const f=ch.dataset.f;
    $$('.ck',mBody).forEach(cd=>{ const owned=cd.dataset.id, r=cd.dataset.r; cd.style.display=(f==='all'||r===f||(f==='lock'&&!owned))?'':'none'; }); });
  $$('.ck[data-id]').forEach(b=>b.onclick=()=>cardZoom(b.dataset.id));
  function cardZoom(id){ const h=HERO_BY[id]; if(!h||!c[id]) return; SFX.play('open');
    const s=prog(), on=(s.showcase||[]).includes(id);
    const v=document.createElement('div'); v.className='ckzoom';
    v.innerHTML=`<div class="ckz-in"><div class="ckz-card r-${h.r}${on?' on':''}${FOIL.has(id)?' foil':''}" id="ckzCard"><img src="${cardFace(h)}" alt="${esc(h.ad)}">${on?'<span class="ckz-star">★</span>':''}<span class="ckz-cnt mono">×${c[id]}</span><i class="ckz-shine"></i></div>
    <div class="ckz-info"><b>${esc(h.ad)}</b><span class="mono ckz-rar" style="color:${RC[h.r]}">${RCN[h.r]}</span>
    <div class="ckz-stats">${STATS.map((sn,i)=>`<span>${sn}<b>${h.s[i]}</b></span>`).join('')}</div></div>
    <div class="rowb" style="justify-content:center"><button class="btn p" id="ckzT" type="button"><span class="bl"><span>${on?'Vitrinden çıkar':'Profile ekle'}</span><span>${on?'Vitrinden çıkar':'Profile ekle'}</span></span></button><button class="ghost" id="ckzX" type="button">Kapat</button></div></div>`;
    document.body.appendChild(v); G&&G.fromTo(v,{opacity:0},{opacity:1,duration:.25}); G&&G.fromTo(v.firstElementChild,{scale:.85,y:24},{scale:1,y:0,duration:.45,ease:'back.out(1.8)'});
    const shut=()=>{ G?G.to(v,{opacity:0,duration:.2,onComplete:()=>v.remove()}):v.remove(); };
    v.addEventListener('click',ev=>{ if(ev.target===v) shut(); });
    const zc=v.querySelector('#ckzCard');
    v.addEventListener('mousemove',ev=>{ if(!zc) return; const b=v.getBoundingClientRect(), dx=(ev.clientX-b.left)/b.width-.5, dy=(ev.clientY-b.top)/b.height-.5; zc.style.transform='perspective(900px) rotateY('+(dx*13)+'deg) rotateX('+(-dy*13)+'deg)'; });
    v.addEventListener('mouseleave',()=>{ if(zc) zc.style.transform=''; });
    const cx=v.querySelector('#ckzX'); cx&&(cx.onclick=shut);
    const tg=v.querySelector('#ckzT'); tg&&(tg.onclick=()=>{ let sh=(prog().showcase||[]).filter(x=>c[x]);
      if(sh.includes(id)) sh=sh.filter(x=>x!==id); else { if(sh.length>=3){ toast('Vitrin dolu','En fazla 3 kart koyabilirsin. Önce birini çıkar.'); SFX.sfx('cardhit'); return; } sh.push(id); }
      setCards(c,sh); SFX.sfx(sh.includes(id)?'confirm':'swap'); const now=sh.includes(id);
      v.querySelector('.ckz-card').classList.toggle('on',now);
      const st=v.querySelector('.ckz-star'); if(now&&!st){ const sv=document.createElement('span'); sv.className='ckz-star'; sv.textContent='★'; v.querySelector('.ckz-card').appendChild(sv); } if(!now&&st) st.remove();
      const bl=v.querySelector('#ckzT .bl'); if(bl) bl.innerHTML=`<span>${now?'Vitrinden çıkar':'Profile ekle'}</span><span>${now?'Vitrinden çıkar':'Profile ekle'}</span>`;
      $$('.ck[data-id]').forEach(x=>{ if(x.dataset.id===id) x.classList.toggle('on',now); }); });
  }
}
const COL_CSS=`
.collx{display:flex;flex-direction:column;gap:14px}
.cxhero{position:relative;border-radius:18px;padding:18px;border:1px solid #3a2f5c;background:linear-gradient(135deg,#1a1430,#0d0b16 60%,#241a3f);overflow:hidden}
.cxhero::before{content:"";position:absolute;inset:0;background:radial-gradient(500px 180px at 85% -10%,rgba(255,59,78,.16),transparent),radial-gradient(420px 200px at 0% 120%,rgba(255,182,39,.12),transparent);pointer-events:none}
.cxht{display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1}
.cxhero .mono{color:var(--gold,#ffd34d);letter-spacing:.28em;font-size:10.5px}
.cxpct{font-size:15px!important}
.cxhero h3{margin:8px 0 12px;font-size:26px;position:relative;z-index:1}
.cxhero h3 small{color:var(--dim);font-size:15px;font-weight:400}
.cxbar{height:8px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;margin-bottom:14px;position:relative;z-index:1}
.cxbar i{display:block;height:100%;width:var(--p);border-radius:99px;background:linear-gradient(90deg,#ffb627,#ff3b4e);box-shadow:0 0 14px #ffb62799;transition:width 1s cubic-bezier(.2,.8,.3,1)}
.cxstats{display:flex;gap:8px;flex-wrap:wrap;position:relative;z-index:1}
.cxst{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:6px 12px;text-align:center;min-width:72px}
.cxst b{color:var(--rc);display:block;font-size:14px}
.cxst span{font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:.07em}
.cxfilters{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.cxmeta{margin-left:auto;font-size:11px;font-weight:700;color:var(--dim);background:var(--s2);border:1px solid var(--line2);border-radius:99px;padding:6px 12px;white-space:nowrap}
.cxchip{background:var(--s2);border:1.5px solid var(--line2);border-radius:99px;padding:7px 14px;font-size:12px;font-weight:700;color:var(--dim);cursor:pointer;transition:all .2s}
.cxchip.on{color:var(--fg);border-color:var(--gold,#ffd34d);box-shadow:0 0 14px rgba(255,211,77,.25)}
.cxchip[data-f="e"].on{border-color:#ff3b4e;box-shadow:0 0 14px rgba(255,59,78,.3)}
.cxchip[data-f="a"].on{border-color:#ffb627;box-shadow:0 0 14px rgba(255,182,39,.3)}
.cxchip[data-f="g"].on{border-color:#d5dae4;box-shadow:0 0 14px rgba(213,218,228,.25)}
.cxchip[data-f="b"].on{border-color:#c8834a;box-shadow:0 0 14px rgba(200,131,74,.3)}
.collx .ck .ckimg{display:block;width:100%;height:100%}
.collx .ck .ckimg img{display:block;width:100%;height:100%;object-fit:cover;object-position:top center;filter:brightness(1.08) saturate(1.07)}
.collx .ck .cnt{position:absolute;top:6px;right:6px;font-size:10px;background:rgba(0,0,0,.65);border:1px solid rgba(255,255,255,.18);border-radius:99px;padding:2px 7px;color:#fff;z-index:3}
.collx .ck .star{position:absolute;top:6px;left:6px;color:var(--gold,#ffd34d);font-size:13px;text-decoration:none;z-index:3;filter:drop-shadow(0 0 6px rgba(255,211,77,.8))}
.collx .ck.lock{min-height:120px}
.collx .ck:not(.lock):hover{transform:translateY(-5px) scale(1.05);z-index:3;box-shadow:0 14px 30px rgba(0,0,0,.55)}
.collx .ck.r-e:not(.lock) .ckimg img{box-shadow:0 0 16px rgba(255,59,78,.75)}
.collx .ck.r-a:not(.lock) .ckimg img{box-shadow:0 0 14px rgba(255,182,39,.55)}
.collx .ck.r-g:not(.lock) .ckimg img{box-shadow:0 0 12px rgba(213,218,228,.35)}
.collx .ck.on .ckimg img{box-shadow:0 0 0 3px var(--gold,#ffd34d),0 0 24px rgba(255,211,77,.55)}
.ckzoom{position:fixed;inset:0;background:rgba(4,3,8,.82);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:400;display:grid;place-items:center;padding:18px}
.ckz-in{display:grid;gap:14px;justify-items:center;width:100%;max-width:360px}
.ckz-card{position:relative;width:min(230px,66vw);aspect-ratio:5/7;border-radius:14px;overflow:hidden;border:3px solid var(--line2,#3a3150);box-shadow:0 26px 60px rgba(0,0,0,.65)}
.ckz-card img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block}
.ckz-card.r-e{border-color:#ff3b4e}.ckz-card.r-a{border-color:#ffb627}.ckz-card.r-g{border-color:#d5dae4}.ckz-card.r-b{border-color:#c8834a}
.ckz-card.on{border-color:var(--gold,#ffd34d);box-shadow:0 0 0 3px var(--gold,#ffd34d),0 26px 60px rgba(0,0,0,.65),0 0 44px rgba(255,211,77,.35)}
.ckz-star{position:absolute;top:10px;left:10px;color:var(--gold,#ffd34d);font-size:24px;text-shadow:0 0 10px #000}
.ckz-cnt{position:absolute;top:10px;right:10px;font-size:12px;background:rgba(0,0,0,.72);border:1px solid rgba(255,255,255,.22);border-radius:99px;padding:3px 9px;color:#fff}
.ckz-info{text-align:center;display:grid;gap:6px}
.ckz-info b{font-family:var(--display,'Bangers',Impact,sans-serif);font-size:25px;letter-spacing:.03em}
.ckz-rar{font-size:11px;letter-spacing:.22em}
.ckz-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-top:4px}
.ckz-stats span{background:var(--s2,#1c1729);border:1px solid var(--line2,#3a3150);border-radius:6px;padding:5px 2px;font-size:9px;color:var(--dim)}
.ckz-stats b{display:block;color:var(--gold,#ffd34d);font-size:12px}
.ckz-card{transition:transform .18s ease-out}
.ckz-card.foil .ckz-shine{position:absolute;inset:-40%;background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.34) 50%,transparent 58%);background-size:250% 250%;animation:ckzShine 3.4s linear infinite;pointer-events:none;z-index:4}
@keyframes ckzShine{0%{background-position:130% 0}100%{background-position:-130% 0}}
.ckz-card{animation:ckzFloat 3.6s ease-in-out infinite}
@keyframes ckzFloat{0%,100%{translate:0 0}50%{translate:0 -10px}}
.ckz-card.r-e{border-color:#ff3b4e;box-shadow:0 0 0 2px #ff3b4e,0 0 55px rgba(255,59,78,.55),0 26px 60px rgba(0,0,0,.65)}
.ckz-card.r-a{border-color:#ffb627;box-shadow:0 0 0 2px #ffb627,0 0 45px rgba(255,182,39,.45),0 26px 60px rgba(0,0,0,.65)}
.ckz-card.r-g{border-color:#d5dae4;box-shadow:0 0 0 2px #d5dae4,0 0 35px rgba(213,218,228,.3),0 26px 60px rgba(0,0,0,.65)}
.ckz-card.r-b{border-color:#c8834a;box-shadow:0 0 0 2px #c8834a,0 0 30px rgba(200,131,74,.3),0 26px 60px rgba(0,0,0,.65)}
`;
function showcaseHTML(ids){ ids=(ids||[]).filter(id=>HERO_BY[id]); if(!ids.length) return '';
  return `<div class="vitrin">${ids.map(id=>`<img class="r-${HERO_BY[id].r}" alt="${esc(HERO_BY[id].ad)}" src="${cardFace(HERO_BY[id])}">`).join('')}</div>`; }
/* hesap penceresine vitrin + koleksiyon */
const _openAccount=openAccount;
openAccount=function(){ _openAccount(); const lg=$('.lg'); if(!lg) return; const c=myCards();
  const box=document.createElement('div'); box.className='accol';
  box.innerHTML=`<div class="mono dim" style="display:flex;justify-content:space-between;align-items:center"><span>KART VİTRİNİ</span><span>${Object.keys(c).length}/${HEROES_CG.length} kart</span></div>${showcaseHTML(prog().showcase)||'<p class="dim" style="margin:6px 0">Vitrin boş. Koleksiyonundan 3 kart seç.</p>'}<button class="btn g" id="acCol" type="button" style="justify-content:center"><span class="bl"><span>Koleksiyonum</span><span>Koleksiyonum</span></span></button>`;
  const ul=lg.querySelector('ul'); ul?ul.after(box):lg.appendChild(box);
  $('#acCol').onclick=()=>openCollection(); if(G) G.from(box.querySelectorAll('.vitrin img'),{y:30,rotation:-10,opacity:0,stagger:.08,duration:.5,ease:'back.out(2)'}); };
/* giriş: dosyadan açılınca Google popup çalışmaz */
fbSignIn=function(){ openLogin&&openLogin(); };
/* girişte bulut koleksiyonunu birleştir */
async function syncCards(){ if(!(FB.ready&&FB.user)) return; try{ const d=(await FB.db.collection('users').doc(FB.user.uid).get()).data()||{}; const c=myCards(), r=d.cards||{};
  for(const k in r) c[k]=Math.max(c[k]||0,r[k]); const s=prog(); const sh=(s.showcase&&s.showcase.length?s.showcase:d.showcase)||[]; setCards(c,sh); }catch(e){} }
setTimeout(function w(){ if(FB.ready&&FB.auth){ FB.auth.onAuthStateChanged(u=>{ if(u) setTimeout(syncCards,1500); }); } else setTimeout(w,800); },1000);

/* ========================= Başlangıç ========================= */
const first=VIEWS.includes(location.hash.slice(1))?location.hash.slice(1):'ana';
initAuth();
if(G&&!reduce&&MTSET.intro!==false){
  show(first,true);
  /* ---- RAVONİA GAME açılışı: önce "başlamak için dokun" (sesin çalabilmesi için), sonra sinematik logo ---- */
  const RV=RAVONIA_COLORS;
  const pre=document.getElementById('pre')||document.createElement('div'); pre.id='pre'; pre.removeAttribute('style'); pre.innerHTML='';
  pre.style.cssText=`--rv-bg:${RV.bg};--rv-glow:${RV.glow}`;
  pre.innerHTML=`<canvas id="embers"></canvas><div class="rvglow" id="rvGlowBg"></div><div class="rvflare" id="rvFlare"></div>
    <div class="rvwrap" id="rvWrap">
      <div class="rvem" id="rvEm"><img src="img/2baece8599.webp" alt="" draggable="false"><span class="rvshine" id="rvShine"></span></div>
      <img class="rvwd" id="rvWd" src="img/2327c5fa6a.webp" alt="RAVONİA" draggable="false">
      <img class="rvgm" id="rvGm" src="img/0b89cd3fc8.webp" alt="GAME" draggable="false">
    </div>
    <div class="rvflash" id="rvFlash"></div>
    <button class="rvgate" id="rvGate" type="button"><span class="ring"></span><span class="mono">Başlamak için dokun</span><small class="mono">Sesli deneyim önerilir</small></button>
    <button class="rvskip mono" id="rvSkip" type="button" hidden>Geç</button>`;
  document.body.appendChild(pre);
  G.set(['#rvEm','#rvWd','#rvGm'],{opacity:0});
  // Kor parçacıkları
  const ec=$('#embers'), ex=ec.getContext('2d'); let EW,EH, emb=[], burst=[], eOn=true;
  const eSize=()=>{EW=ec.width=innerWidth*Math.min(2,devicePixelRatio||1); EH=ec.height=innerHeight*Math.min(2,devicePixelRatio||1);}; eSize(); addEventListener('resize',eSize);
  const hexA=a=>{const c=RV.glow.replace('#',''); return `rgba(${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)},${a})`;};
  for(let i=0;i<70;i++) emb.push({x:Math.random(),y:Math.random(),s:.0006+Math.random()*.0016,r:.6+Math.random()*2.2,w:Math.random()*6});
  (function ef(){ if(!eOn) return; ex.clearRect(0,0,EW,EH);
    for(const p of emb){p.y-=p.s; p.x+=Math.sin((p.y+p.w)*8)*.0004; if(p.y<-.02){p.y=1.02;p.x=Math.random();}
      ex.fillStyle=hexA(.25+.5*Math.abs(Math.sin(p.w+p.y*10))); ex.beginPath(); ex.arc(p.x*EW,p.y*EH,p.r*(EW/1400+.5),0,7); ex.fill();}
    for(const b of burst){b.x+=b.vx; b.y+=b.vy; b.vx*=.96; b.vy=b.vy*.96+.12; b.l-=.016;
      if(b.l>0){ex.strokeStyle=b.c.replace('A',b.l); ex.lineWidth=b.w; ex.beginPath(); ex.moveTo(b.x,b.y); ex.lineTo(b.x-b.vx*3,b.y-b.vy*3); ex.stroke();}}
    burst=burst.filter(b=>b.l>0); requestAnimationFrame(ef); })();
  function sparks(){const cx=EW/2, cy=EH*.42; for(let i=0;i<90;i++){const a=Math.random()*Math.PI*2, v=4+Math.random()*16; burst.push({x:cx,y:cy,vx:Math.cos(a)*v,vy:Math.sin(a)*v-3,l:1,w:1+Math.random()*2.5,c:Math.random()<.7?hexA('A'):'rgba(255,220,180,A)'});}}
  // Bekleme ekranı: logo hafif nabız
  G.fromTo('#rvGate .ring',{scale:.8,opacity:.8},{scale:1.6,opacity:0,duration:1.8,repeat:-1,ease:'expo.out'});
  G.to('#rvGlowBg',{opacity:.25,scale:.8,duration:1.2});
  let started=false;
  function play(){
    if(started) return; started=true;
    SFX.unlock(); $('#rvSkip').hidden=false;
    G.to('#rvGate',{opacity:0,scale:.96,duration:.4,onComplete:()=>$('#rvGate').remove()});
    SFX.load().then(()=>{}); // ses yüklenirken animasyon başlar; hazırsa vuruşla aynı anda çalar
    const t0=performance.now(); let introPlayed=false;
    const tryIntro=()=>{ if(introPlayed) return; const late=(performance.now()-t0)/1000; if(late<.35&&SFX.sample('intro')) introPlayed=true; };
    tryIntro(); SFX.load().then(tryIntro);
    const tl=G.timeline({delay:.15,onComplete:()=>{eOn=false; pre.remove();}});
    tl.fromTo('#rvFlare',{xPercent:-140,opacity:0},{xPercent:140,opacity:1,duration:1.3,ease:'power2.inOut'},0)
     .fromTo('#rvEm',{opacity:0,scale:1.9,filter:'blur(24px)'},{opacity:1,scale:1,filter:'blur(0px)',duration:1.1,ease:'expo.in'},.12)
     .add(()=>{sparks(); buzz([0,12,30,20]); if(!introPlayed) SFX.play('thump');},1.22)
     .fromTo('#rvFlash',{opacity:.32},{opacity:0,duration:.28,ease:'power2.out'},1.22)
     .fromTo('#rvWrap',{x:0,y:0},{x:9,y:-6,duration:.035,yoyo:true,repeat:7,ease:'none',immediateRender:false},1.22)
     .fromTo('#rvGlowBg',{opacity:0,scale:.5},{opacity:1,scale:1.15,duration:1.1,ease:'expo.out'},1.22)
     .fromTo('#rvWd',{opacity:0,clipPath:'inset(0 50% 0 50%)',scaleX:1.25,filter:'blur(6px)'},{opacity:1,clipPath:'inset(0 0% 0 0%)',scaleX:1,filter:'blur(0px)',duration:1.0,ease:'expo.out'},1.55)
     .fromTo('#rvGm',{opacity:0,y:30,letterSpacing:'1em'},{opacity:1,y:0,duration:.9,ease:'expo.out'},2.0)
     .fromTo('#rvShine',{backgroundPosition:'130% 0'},{backgroundPosition:'-30% 0',duration:1.2,ease:'power2.inOut'},2.3)
     .to('#rvWrap',{scale:1.05,duration:1.6,ease:'none'},1.8)
     .to('#rvGlowBg',{opacity:.45,duration:1},2.6)
     .to('#rvWrap',{opacity:0,scale:1.35,filter:'blur(14px)',duration:.7,ease:'expo.in'},3.75)
     .to(['#rvGlowBg','#rvSkip','#embers'],{opacity:0,duration:.5},3.8)
     .to(pre,{clipPath:'inset(0% 0% 100% 0%)',duration:.95,ease:'expo.inOut'},4.25)
     .add(()=>enter(first),4.4);
    $('#rvSkip').onclick=e=>{e.stopPropagation(); tl.progress(1);};
  }
  $('#rvGate').addEventListener('click',play);
  pre.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ') play();});
  setTimeout(()=>$('#rvGate')&&$('#rvGate').focus(),50);

} else { show(first); const p0=document.getElementById('pre'); p0&&p0.remove(); }

/* ========================= PROFİL DÜZENLE: isim + profil resmi ========================= */
(function(){
  const st=document.createElement('style'); st.textContent=`
  .pe{display:grid;gap:16px}
  .pe-top{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
  .pe-av{position:relative;width:104px;height:104px;flex:none}
  .pe-av .av{width:104px!important;height:104px!important;font-size:44px!important}
  .pe-av label{position:absolute;right:-4px;bottom:-4px;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--gold);color:#111;cursor:pointer;font-size:18px;box-shadow:0 4px 14px rgba(0,0,0,.4)}
  .pe-btns{display:flex;flex-wrap:wrap;gap:8px}
  .pe-hint{font-size:13px;margin:0}
  .pe-err{color:#ff5a6a;font-size:13px;min-height:1em;margin:0}`;
  document.head.appendChild(st);

  /* resmi kare kırp, 96px webp'e küçült (Firestore'da az yer tutsun) */
  function shrinkImage(file){ return new Promise((res,rej)=>{
    if(!file||!/^image\//.test(file.type)) return rej(new Error('Lütfen bir resim dosyası seç.'));
    if(file.size>8*1024*1024) return rej(new Error('Resim çok büyük (en fazla 8 MB).'));
    const url=URL.createObjectURL(file), img=new Image();
    img.onload=()=>{ const S=96, c=document.createElement('canvas'); c.width=c.height=S; const x=c.getContext('2d');
      const m=Math.min(img.width,img.height); x.imageSmoothingQuality='high';
      x.drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,S,S); URL.revokeObjectURL(url);
      let d=c.toDataURL('image/webp',.8); if(!d.startsWith('data:image/webp')) d=c.toDataURL('image/jpeg',.8); res(d); };
    img.onerror=()=>{ URL.revokeObjectURL(url); rej(new Error('Bu resim açılamadı.')); };
    img.src=url; }); }

  const cleanName=v=>v.replace(/\s+/g,' ').trim();
  function checkName(v){
    if(v.length<2) return 'İsim en az 2 harf olmalı.';
    if(v.length>20) return 'İsim en fazla 20 karakter olabilir.';
    if(!/^[\p{L}\p{N} _.\-]+$/u.test(v)) return 'Sadece harf, rakam, boşluk, nokta, - ve _ kullanabilirsin.';
    return '';
  }

  window.bindNC=function(box){ if(!box) return; const NC=window.NAMECOL||[], own=(window.myNC?window.myNC():(prog().nameColors||[])), cur=prog().nameColor||null;
    box.innerHTML='<p class="mono dim" style="margin:14px 0 8px;font-size:12px">İsim rengin — mağazadan aldıkların:</p><div style="display:flex;gap:8px;flex-wrap:wrap">'+
      '<button type="button" class="ghost" data-nc="" style="font-size:12px'+(cur?'':';outline:2px solid var(--fg)')+'">Yok</button>'+
      NC.filter(c=>own.includes(c[0])).map(c=>'<button type="button" class="ghost nc-'+c[0]+'" data-nc="'+c[0]+'" style="font-size:12px'+(cur===c[0]?';outline:2px solid var(--fg)':'')+'">'+c[1]+'</button>').join('')+'</div>'+
      (own.length?'':'<p class="dim" style="margin:6px 0 0;font-size:12px">Henüz renk yok — mağazadan alabilirsin.</p>');
    box.querySelectorAll('[data-nc]').forEach(b=>b.onclick=()=>{ const s2=prog(); s2.nameColor=b.dataset.nc||null; saveProg(s2); window.syncNC&&window.syncNC(); SFX.play('click'); const _n2=NC.find(c=>c[0]===b.dataset.nc); toast('İsim rengin güncellendi',b.dataset.nc?('Artık '+(_n2?_n2[1]:'')+' rengindesin.'):'Varsayılan renge döndün.'); try{renderUser();renderBoards();}catch(e){} bindNC(box); }); };
  window.openProfileEdit=function(){
    const u=AUTH.user; if(!u) return openLogin&&openLogin();
    if(u.micup){ openModal('Profil');
      swap(`<div class="lg" style="text-align:center"><div class="lh" style="justify-content:center">${avatarHTML(u,72)}</div>
        <h3 style="margin:10px 0 4px">${esc(u.display||u.username)}</h3>
        <p class="mono dim" style="margin:0 0 14px">@${esc(u.username||'')} · Micup ile bağlı</p>
        <p class="dim" style="margin:0 0 10px">İsim ve fotoğrafın <b>Micup hesabından</b> gelir. Micup'te değiştirdiğinde siteye girişte otomatik güncellenir — burada değiştirilemez.</p>
        <div id="peNC"></div>
        <button class="btn p" type="button" id="peMk"><span class="bl"><span>Kapat</span><span>Kapat</span></span></button></div>`);
      const mk=$('#peMk'); mk&&(mk.onclick=()=>{ SFX.play('click'); closeModal(); }); bindNC($('#peNC')); return; }
    let avatar=u.avatar||null; const googlePhoto=FB.user&&FB.user.photoURL;
    openModal('Profili düzenle');
    const draw=()=>{ $('#peAv').innerHTML=avatarHTML({display:$('#peN')?$('#peN').value||u.display:u.display,avatar},104)+'<label for="peF" title="Resim yükle">📷</label>'; };
    swap(`<form class="pe" id="peForm">
      <div class="pe-top"><div class="pe-av" id="peAv"></div>
        <div style="display:grid;gap:8px;flex:1;min-width:200px">
          <input type="file" id="peF" accept="image/*" hidden>
          <div class="pe-btns">
            <label class="ghost" for="peF" style="cursor:pointer">Resim yükle</label>
            ${googlePhoto?'<button class="ghost" id="peG" type="button">Google resmim</button>':''}
            <button class="ghost" id="peX" type="button">Resmi kaldır</button>
          </div>
          <p class="pe-hint dim">Resim kare olarak kırpılır ve küçültülür.</p>
        </div></div>
      <label class="mono dim" for="peN">Görünen isim</label>
      <input class="field" id="peN" maxlength="20" value="${esc(u.display||u.username||'')}" autocomplete="off" required>
      <p class="pe-err" id="peE"></p>
      <div id="peNC"></div>
      <div class="rowb"><button class="btn p" type="submit" id="peS"><span class="bl"><span>Kaydet</span><span>Kaydet</span></span></button>
        <button class="ghost" type="button" id="peC">Vazgeç</button></div>
      ${FB.user?'':'<p class="pe-hint dim">Misafir hesapta değişiklikler sadece bu cihazda kalır. Micup ile girersen her yerde görünür.</p>'}
    </form>`);
    draw();
    $('#peN').oninput=draw; bindNC($('#peNC'));
    $('#peF').onchange=async e=>{ const f=e.target.files[0]; if(!f) return; $('#peE').textContent='';
      try{ avatar=await shrinkImage(f); draw(); SFX.play('click'); }catch(err){ $('#peE').textContent=err.message; } };
    $('#peG')&&($('#peG').onclick=()=>{ avatar=googlePhoto; draw(); SFX.play('click'); });
    $('#peX').onclick=()=>{ avatar=null; draw(); SFX.play('click'); };
    $('#peC').onclick=()=>openAccount();
    $('#peForm').onsubmit=async e=>{ e.preventDefault();
      const name=cleanName($('#peN').value), bad=checkName(name); if(bad){ $('#peE').textContent=bad; SFX.sfx&&SFX.sfx('cardhit'); return; }
      const btn=$('#peS'); btn.disabled=true;
      try{
        if(FB.ready&&FB.user&&name!==u.display){ // başka biri bu ismi kullanıyor mu?
          const q=await FB.db.collection('users').where('name','==',name).limit(2).get();
          if(q.docs.some(d=>d.id!==FB.user.uid)){ $('#peE').textContent='Bu isim başka bir oyuncuda var, başka bir isim seç.'; btn.disabled=false; return; }
        }
        const old=u.display||u.username;
        if(FB.ready&&FB.user) await FB.db.collection('users').doc(FB.user.uid).set({name,avatar:avatar||null,custom:true},{merge:true});
        u.display=name; u.avatar=avatar||null;
        try{ localStorage.setItem('mt_user',JSON.stringify(u)); if(u.guest) localStorage.setItem('mt_name',name);
          const b=JSON.parse(localStorage.getItem('mt_board')||'{}'); if(b[old]&&old!==name){ b[name]=Object.assign(b[old],{name}); delete b[old]; } if(b[name]) b[name].avatar=u.avatar; localStorage.setItem('mt_board',JSON.stringify(b)); }catch(_){}
        SFX.play('confirm'); toast('Profil güncellendi',`Artık ${name} olarak görünüyorsun.`);
        renderUser(); renderBoards(); openAccount();
      }catch(err){ btn.disabled=false; $('#peE').textContent='Kaydedilemedi: '+(err.code||err.message||err); }
    };
  };

  /* hesap penceresine "Profili düzenle" butonu */
  const _oa=openAccount;
  openAccount=function(){ _oa(); const lh=$('.lg .lh'); if(!lh||$('#peOpen')) return;
    const b=document.createElement('button'); b.id='peOpen'; b.type='button'; b.className='ghost'; b.textContent='✎ Profili düzenle'; b.style.marginLeft='auto'; b.style.whiteSpace='nowrap';
    b.onclick=()=>{ SFX.play('click'); openProfileEdit(); }; lh.appendChild(b);
    const av=lh.querySelector('.av'); if(av){ av.style.cursor='pointer'; av.title='Profili düzenle'; av.onclick=b.onclick; } };
})();


/* ========================= DUYURULAR + ETKİNLİK TAKVİMİ ========================= */
(function(){
  const st=document.createElement('style'); st.textContent=`
  .dk-grid{display:grid;grid-template-columns:1fr 1.15fr;gap:20px}
  @media (max-width:860px){.dk-grid{grid-template-columns:1fr}}
  .dk-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .dk-head h3{margin:0;flex:1}
  .dk-add{font-size:14px}
  .an-list,.ev-list{display:grid;gap:12px}
  .an{background:#fffdf4;color:var(--inkc);border:4px solid var(--inkc);box-shadow:5px 5px 0 var(--inkc);border-radius:6px;padding:14px;display:grid;gap:6px;position:relative}
  .an.pin{background:var(--gold)}
  .an h4{margin:0;font-family:var(--display);font-size:24px;letter-spacing:.03em;line-height:1.05;padding-right:30px}
  .an p{margin:0;font-weight:600;line-height:1.45;white-space:normal;word-break:break-word}
  .an .meta{font-size:12px;opacity:.65}
  .an .new{position:absolute;top:-12px;left:12px;background:var(--red);color:#fff;font-family:var(--display);font-size:15px;padding:2px 8px;border:3px solid var(--inkc);transform:rotate(-4deg)}
  .dk-del{position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:50%;border:2px solid currentColor;background:transparent;color:inherit;cursor:pointer;font-size:14px;opacity:.6}
  .dk-del:hover{opacity:1}
  .cal{display:grid;gap:8px}
  .cal-top{display:flex;align-items:center;gap:8px}
  .cal-top b{flex:1;text-align:center;font-family:var(--display);font-size:24px;letter-spacing:.04em;text-transform:uppercase}
  .cal-top button{width:38px;height:38px;border:3px solid var(--inkc);background:var(--s2);color:var(--fg);cursor:pointer;font-size:18px;border-radius:4px}
  .cal-g{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
  .cal-g .wd{font-size:11px;text-align:center;color:var(--dim)}
  .cal-g button{height:44px;border:2px solid transparent;background:var(--s2);color:var(--fg);border-radius:4px;cursor:pointer;font:inherit;font-size:14px;position:relative;padding:0}
  .cal-g button.out{opacity:.3}
  .cal-g button.td{border-color:var(--gold)}
  .cal-g button.sel{background:var(--gold);color:var(--inkc);font-weight:800}
  .cal-g button i{position:absolute;bottom:4px;left:50%;transform:translateX(-50%);display:flex;gap:2px}
  .cal-g button i s{width:6px;height:6px;border-radius:50%;background:var(--red);display:block}
  .ev{display:grid;grid-template-columns:62px 1fr;gap:12px;background:var(--s2);border:3px solid var(--inkc);border-radius:6px;padding:12px;position:relative}
  .ev .dt{display:grid;place-items:center;align-content:center;background:var(--red);color:#fff;border:3px solid var(--inkc);border-radius:4px;line-height:1}
  .ev .dt b{font-family:var(--display);font-size:28px}
  .ev .dt small{font-size:11px;text-transform:uppercase}
  .ev h4{margin:0 0 4px;font-family:var(--display);font-size:21px;letter-spacing:.03em;padding-right:30px}
  .ev p{margin:0 0 6px;font-size:14px;color:var(--dim)}
  .ev .row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px}
  .ev .chip{background:var(--s1);border:2px solid var(--line2);border-radius:99px;padding:2px 10px}
  .ev .chip.soon{background:var(--gold);color:var(--inkc);border-color:var(--inkc);font-weight:800}
  .ev.past{opacity:.55}
  .ev .go{margin-left:auto}
  .ev .go.on{color:var(--ok);border-color:var(--ok)}
  .dkf{display:grid;gap:10px}
  .dkf textarea.field{height:auto;min-height:110px;padding:14px 18px;resize:vertical}
  .dkf .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .dkf select.field{appearance:auto}`;
  document.head.appendChild(st);

  const TYPES={film:['🎬','Film gecesi'],turnuva:['🏆','Turnuva'],micup:['🎙️','Mic up'],oyun:['🎮','Oyun gecesi'],diger:['⭐','Etkinlik']};
  const AY=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const dkey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const nl2br=t=>esc(t||'').replace(/\n/g,'<br>');
  function ago(d){ if(!d) return 'şimdi'; const s=(Date.now()-d)/1000;
    if(s<60) return 'az önce'; if(s<3600) return Math.floor(s/60)+' dk önce'; if(s<86400) return Math.floor(s/3600)+' saat önce';
    if(s<7*86400) return Math.floor(s/86400)+' gün önce'; return d.toLocaleDateString('tr-TR'); }
  function until(d){ const ms=d-Date.now(); const t=d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
    if(ms<-3*3600e3) return ['Bitti','']; if(ms<0) return ['Şu an devam ediyor','soon'];
    const today=dkey(new Date()), tom=dkey(new Date(Date.now()+864e5));
    if(dkey(d)===today) return ['Bugün '+t,'soon']; if(dkey(d)===tom) return ['Yarın '+t,'soon'];
    const g=Math.ceil(ms/864e5); return [g+' gün sonra · '+t,'']; }

  /* ---- ana sayfaya bölüm ---- */
  const sec=document.createElement('section'); sec.className='band'; sec.id='duyurular';
  sec.innerHTML=`<div class="wrap">
    <div class="sh"><div><div class="mono">Sunucudan haberler</div><h2>Duyuru <span class="o">&amp; etkinlik</span></h2></div>
      <p class="sub">Mic up saatleri, film geceleri, turnuvalar. Adminler buraya yazar, sen kaçırmazsın.</p></div>
    <div class="dk-grid">
      <div class="xpanel"><div class="dk-head"><span class="cap">Duyurular</span><h3></h3><button class="ghost dk-add" id="anAdd" type="button" hidden>+ Duyuru yaz</button></div><div class="an-list" id="anList"></div></div>
      <div class="xpanel"><div class="dk-head"><span class="cap">Takvim</span><h3></h3><button class="ghost dk-add" id="evAdd" type="button" hidden>+ Etkinlik ekle</button></div>
        <div class="cal" id="cal"></div><div class="ev-list" id="evList"></div></div>
    </div></div>`;
  const anchor=$('#v-ana .marq')||$('#v-ana section'); anchor&&anchor.after(sec);

  let ANN=[], EVS=[], GOING={}, calMonth=new Date(), selDay=null, annUnsub=null, evUnsub=null;
  calMonth.setDate(1);

  /* ---- duyurular ---- */
  function renderAnn(){
    const box=$('#anList'); if(!box) return;
    if(!FB.ready){ box.innerHTML=`<div class="empty"><b>Duyurular yakında</b><span>Firebase bağlanınca burada görünecek.</span></div>`; return; }
    if(!ANN.length){ box.innerHTML=`<div class="empty"><b>Henüz duyuru yok</b><span>Adminler yazınca ilk burada göreceksin.</span></div>`; return; }
    let seen=0; try{ seen=+localStorage.getItem('mt_ann_seen')||0; }catch(e){}
    const list=[...ANN].sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||b.t-a.t).slice(0,6);
    box.innerHTML=list.map(a=>`<div class="an${a.pinned?' pin':''}" data-aid="${a.id}">${a.t>seen&&seen?'<span class="new">YENİ!</span>':''}
      ${FB.admin?`<button class="dk-del" data-delan="${a.id}" type="button" title="Sil">✕</button>`:''}
      <h4>${a.pinned?'📌 ':''}${esc(a.title||'Duyuru')}</h4><p>${nl2br(a.text)}</p>
      <span class="meta mono">${esc(a.byName||'Admin')} · ${ago(a.t)}<span class="views" title="Bu duyuruyu gören kişi sayısı">👁 ${(a.views||0).toLocaleString('tr-TR')} kişi gördü</span></span></div>`).join('');
    $$('[data-delan]',box).forEach(b=>b.onclick=async()=>{ if(!confirmDel(b)) return;
      await FB.db.collection('announcements').doc(b.dataset.delan).delete().catch(e=>toast('Silinemedi',String(e.code||e.message))); });
    // sayfadan çıkarken "görüldü" say
    const newest=Math.max(...ANN.map(a=>+a.t||0)); setTimeout(()=>{ try{ localStorage.setItem('mt_ann_seen',newest); }catch(e){} },8000);
  }
  // iki kez tıklayınca silsin (tarayıcı confirm penceresi yerine)
  function confirmDel(b){ if(b.dataset.ok) return true; b.dataset.ok=1; b.textContent='?'; b.title='Silmek için tekrar tıkla'; b.style.opacity=1;
    setTimeout(()=>{ delete b.dataset.ok; b.textContent='✕'; },2500); return false; }

  function openAnnForm(){
    openModal('Duyuru yaz');
    swap(`<form class="dkf" id="anF">
      <label class="mono dim" for="anT">Başlık</label><input class="field" id="anT" maxlength="60" placeholder="Bu akşam mic up!" required>
      <label class="mono dim" for="anX">Duyuru</label><textarea class="field" id="anX" maxlength="600" placeholder="Saat 21:00'de genel odada toplanıyoruz…" required></textarea>
      <label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="anP"> 📌 En üste sabitle</label>
      <button class="btn p" type="submit"><span class="bl"><span>Yayınla</span><span>Yayınla</span></span></button></form>`);
    $('#anF').onsubmit=async e=>{ e.preventDefault(); const btn=e.target.querySelector('button'); btn.disabled=true;
      await FB.db.collection('announcements').add({title:$('#anT').value.trim(),text:$('#anX').value.trim(),pinned:$('#anP').checked,
        by:FB.user.uid,byName:AUTH.user?(AUTH.user.display||AUTH.user.username):'Admin',created:firebase.firestore.FieldValue.serverTimestamp()})
        .then(()=>{ SFX.play('confirm'); toast('Duyuru yayınlandı','Ana sayfada herkes görüyor.'); closeModal(); })
        .catch(err=>{ btn.disabled=false; toast('Yayınlanamadı',String(err.code||err.message)); }); };
  }

  /* ---- etkinlikler + takvim ---- */
  function renderCal(){
    const box=$('#cal'); if(!box) return;
    const y=calMonth.getFullYear(), m=calMonth.getMonth(), first=new Date(y,m,1), start=new Date(y,m,1-((first.getDay()+6)%7));
    const byDay={}; EVS.forEach(e=>{ const k=dkey(e.at); (byDay[k]=byDay[k]||[]).push(e); });
    const td=dkey(new Date()); let cells='';
    for(let i=0;i<42;i++){ const d=new Date(start); d.setDate(start.getDate()+i); const k=dkey(d), n=(byDay[k]||[]).length;
      if(i>=35&&d.getMonth()!==m) break;
      cells+=`<button type="button" data-day="${k}" class="${d.getMonth()!==m?'out':''}${k===td?' td':''}${k===selDay?' sel':''}">${d.getDate()}${n?`<i>${'<s></s>'.repeat(Math.min(3,n))}</i>`:''}</button>`; }
    box.innerHTML=`<div class="cal-top"><button type="button" id="calP" aria-label="Önceki ay">‹</button><b>${AY[m]} ${y}</b><button type="button" id="calN" aria-label="Sonraki ay">›</button></div>
      <div class="cal-g">${['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map(w=>`<span class="wd mono">${w}</span>`).join('')}${cells}</div>`;
    $('#calP').onclick=()=>{ calMonth.setMonth(m-1); SFX.play('click'); renderCal(); };
    $('#calN').onclick=()=>{ calMonth.setMonth(m+1); SFX.play('click'); renderCal(); };
    $$('[data-day]',box).forEach(b=>b.onclick=()=>{ selDay=selDay===b.dataset.day?null:b.dataset.day; SFX.play('click'); renderCal(); renderEvs(); });
  }
  function renderEvs(){
    const box=$('#evList'); if(!box) return;
    if(!FB.ready){ box.innerHTML=`<div class="empty"><b>Takvim yakında</b><span>Firebase bağlanınca etkinlikler burada görünecek.</span></div>`; return; }
    let list;
    if(selDay) list=EVS.filter(e=>dkey(e.at)===selDay);
    else list=EVS.filter(e=>e.at>Date.now()-3*3600e3).slice(0,5);
    const head=selDay?`<div class="mono dim">${new Date(selDay+'T12:00').toLocaleDateString('tr-TR',{day:'numeric',month:'long',weekday:'long'})}</div>`:'';
    if(!list.length){ box.innerHTML=head+`<div class="empty"><b>${selDay?'Bu gün etkinlik yok':'Yaklaşan etkinlik yok'}</b><span>${selDay?'Takvimden başka bir gün seç.':'Adminler etkinlik ekleyince burada görünecek.'}</span></div>`; return; }
    const me=FB.user&&FB.user.uid;
    box.innerHTML=head+list.map(e=>{ const [u,cls]=until(e.at), ty=TYPES[e.type]||TYPES.diger, g=GOING[e.id]||{n:0,me:false};
      return `<div class="ev${u==='Bitti'?' past':''}">
        ${FB.admin?`<button class="dk-del" data-delev="${e.id}" type="button" title="Sil">✕</button>`:''}
        <div class="dt"><b>${e.at.getDate()}</b><small>${AY[e.at.getMonth()].slice(0,3)}</small></div>
        <div><h4>${ty[0]} ${esc(e.title)}</h4>${e.desc?`<p>${nl2br(e.desc)}</p>`:''}
          <div class="row"><span class="chip ${cls}">${u}</span><span class="chip">${ty[1]}</span><span class="mono dim">${g.n} kişi katılıyor</span>
          ${u==='Bitti'?'':`<button class="ghost go${g.me?' on':''}" data-go-ev="${e.id}" type="button">${g.me?'Katılıyorum ✓':'Katılacağım'}</button>`}</div></div></div>`; }).join('');
    $$('[data-go-ev]',box).forEach(b=>b.onclick=async()=>{ if(!FB.user) return fbSignIn(); const id=b.dataset.goEv, ref=FB.db.collection('events').doc(id).collection('going').doc(me);
      b.disabled=true; const on=GOING[id]&&GOING[id].me;
      try{ if(on) await ref.delete(); else await ref.set({name:AUTH.user?(AUTH.user.display||AUTH.user.username):'Oyuncu',at:firebase.firestore.FieldValue.serverTimestamp()});
        SFX.play(on?'click':'correct'); if(!on) toast('Katılıyorsun','Etkinlik günü unutma!'); await loadGoing([id]); renderEvs(); }
      catch(err){ b.disabled=false; toast('Olmadı',String(err.code||err.message)); } });
    $$('[data-delev]',box).forEach(b=>b.onclick=async()=>{ if(!confirmDel(b)) return;
      await FB.db.collection('events').doc(b.dataset.delev).delete().catch(e=>toast('Silinemedi',String(e.code||e.message))); });
  }
  async function loadGoing(ids){ const me=FB.user&&FB.user.uid;
    await Promise.all(ids.map(async id=>{ try{ const q=await FB.db.collection('events').doc(id).collection('going').get(); GOING[id]={n:q.size,me:!!me&&q.docs.some(d=>d.id===me)}; }catch(e){} })); }

  function openEvForm(){
    const d=new Date(Date.now()+864e5); d.setHours(21,0,0,0);
    const loc=new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,16);
    openModal('Etkinlik ekle');
    swap(`<form class="dkf" id="evF">
      <label class="mono dim" for="evT">Etkinlik adı</label><input class="field" id="evT" maxlength="60" placeholder="Avengers: Endgame izleme gecesi" required>
      <div class="two"><div style="display:grid;gap:6px"><label class="mono dim" for="evY">Tür</label><select class="field" id="evY">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${v[0]} ${v[1]}</option>`).join('')}</select></div>
        <div style="display:grid;gap:6px"><label class="mono dim" for="evD">Tarih ve saat</label><input class="field" id="evD" type="datetime-local" value="${loc}" required></div></div>
      <label class="mono dim" for="evX">Açıklama (isteğe bağlı)</label><textarea class="field" id="evX" maxlength="400" placeholder="Hangi odada, ne yapacağız, ödül var mı…"></textarea>
      <button class="btn p" type="submit"><span class="bl"><span>Takvime ekle</span><span>Takvime ekle</span></span></button></form>`);
    $('#evF').onsubmit=async e=>{ e.preventDefault(); const btn=e.target.querySelector('button'); const at=new Date($('#evD').value);
      if(isNaN(at)) return toast('Tarih hatalı','Tarih ve saati seç.'); btn.disabled=true;
      await FB.db.collection('events').add({title:$('#evT').value.trim(),type:$('#evY').value,desc:$('#evX').value.trim(),at:firebase.firestore.Timestamp.fromDate(at),
        by:FB.user.uid,created:firebase.firestore.FieldValue.serverTimestamp()})
        .then(()=>{ SFX.play('confirm'); toast('Etkinlik eklendi',at.toLocaleString('tr-TR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})); calMonth=new Date(at.getFullYear(),at.getMonth(),1); closeModal(); })
        .catch(err=>{ btn.disabled=false; toast('Eklenemedi',String(err.code||err.message)); }); };
  }

  function renderAll(){ const a=$('#anAdd'), e=$('#evAdd'); if(a) a.hidden=!FB.admin; if(e) e.hidden=!FB.admin; renderAnn(); renderCal(); renderEvs(); }
  $('#anAdd').onclick=()=>{ SFX.play('click'); openAnnForm(); };
  $('#evAdd').onclick=()=>{ SFX.play('click'); openEvForm(); };

  function listen(){
    if(annUnsub) return;
    annUnsub=FB.db.collection('announcements').orderBy('created','desc').limit(20).onSnapshot(q=>{
      ANN=q.docs.map(d=>{ const x=d.data(); return {id:d.id,...x,t:x.created&&x.created.toDate?+x.created.toDate():Date.now()}; }); renderAnn(); },()=>{});
    const from=new Date(); from.setMonth(from.getMonth()-2);
    evUnsub=FB.db.collection('events').where('at','>=',firebase.firestore.Timestamp.fromDate(from)).orderBy('at').limit(100).onSnapshot(async q=>{
      EVS=q.docs.map(d=>{ const x=d.data(); return {id:d.id,...x,at:x.at.toDate()}; }); await loadGoing(EVS.filter(e=>e.at>Date.now()-864e5).map(e=>e.id)); renderCal(); renderEvs(); },()=>{});
  }
  // admin durumu değişince (giriş/çıkış) butonları güncelle
  const _upd=updAdminBtn; updAdminBtn=function(){ if(AUTH.user&&AUTH.user.micup&&FIXED_ADMIN_UIDS.includes('micup_'+AUTH.user.id)) FB.admin=true; _upd(); renderAll(); if(FB.ready) loadGoing(EVS.map(e=>e.id)).then(renderEvs); };
  renderAll();
  (function wait(){ if(FB.ready&&FB.db){ listen(); renderAll(); } else setTimeout(wait,700); })();
  setInterval(()=>{ if(!document.hidden) renderEvs(); },60000); // "2 saat sonra" yazıları tazelensin
})();


/* ========================= GÜNLÜK GÖREVLER + BAŞARIMLAR / ROZETLER ========================= */
(function(){
  const st=document.createElement('style'); st.textContent=`
  .qlist{display:grid;gap:10px}
  .qi{display:grid;grid-template-columns:44px 1fr auto;gap:12px;align-items:center;background:var(--s2);border:3px solid var(--inkc);border-radius:6px;padding:10px 12px}
  .qi .ic{font-size:26px;text-align:center}
  .qi b{display:block;font-size:15px}
  .qi .qb{height:8px;background:var(--s1);border-radius:99px;overflow:hidden;margin-top:6px}
  .qi .qb i{display:block;height:100%;width:var(--p);background:var(--gold);transition:width .5s}
  .qi small{color:var(--dim);font-size:12px}
  .qi.done{border-color:var(--ok)}
  .qi.claimed{opacity:.5}
  .qi .rw{font-family:var(--display);font-size:18px;color:var(--gold);white-space:nowrap}
  .qbonus{display:flex;align-items:center;gap:10px;padding:10px 12px;border:3px dashed var(--line2);border-radius:6px;font-size:14px}
  .qbonus.on{border-color:var(--gold);border-style:solid}
  .bgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:12px}
  .bd{display:grid;justify-items:center;gap:6px;text-align:center;cursor:pointer;background:none;border:0;color:var(--fg);font:inherit;padding:4px}
  .hx{width:64px;height:72px;display:grid;place-items:center;font-size:30px;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);background:var(--tier);position:relative}
  .hx::after{content:"";position:absolute;inset:5px;clip-path:inherit;background:var(--s1);z-index:0}
  .hx span{position:relative;z-index:1}
  .bd small{font-size:11px;line-height:1.2}
  .bd.lock .hx{filter:grayscale(1);opacity:.35}
  .bd.lock small{color:var(--dim)}
  .t-b{--tier:linear-gradient(135deg,#c98552,#7a4a26)} .t-s{--tier:linear-gradient(135deg,#e9eef5,#8a96a8)} .t-g{--tier:linear-gradient(135deg,#ffe07a,#c98a12)} .t-e{--tier:linear-gradient(135deg,#ff3b4e,#9b5cff,#4a7bff)}
  .bdet{display:grid;justify-items:center;gap:10px;text-align:center;padding:10px 0}
  .bdet .hx{width:110px;height:124px;font-size:54px}
  .bdet .qb{width:min(280px,100%);height:10px;background:var(--s2);border-radius:99px;overflow:hidden}
  .bdet .qb i{display:block;height:100%;width:var(--p);background:var(--gold)}
  .achpop{position:fixed;left:50%;top:84px;z-index:9999;transform:translateX(-50%);display:flex;align-items:center;gap:14px;background:var(--s1);border:4px solid var(--gold);box-shadow:6px 6px 0 var(--inkc);border-radius:8px;padding:12px 18px 12px 12px;width:max-content;max-width:calc(100vw - 32px)}
  .achpop .hx{width:54px;height:60px;font-size:26px;flex:none}
  .achpop .mono{font-size:11px;color:var(--gold)}
  .achpop b{font-family:var(--display);font-size:22px;display:block;letter-spacing:.03em}
  .accach{display:grid;gap:10px}`;
  document.head.appendChild(st);

  /* ---------- sayaçlar ---------- */
  function S(){ const s=prog(); s.st=Object.assign({games:0,cardWins:0,spins:0,qDone:0,qAll:0,per:{},best:{},won:{}},s.st||{}); s.st.per=s.st.per||{}; s.st.best=s.st.best||{}; return s; }
  function QS(s){ const d=today(); if(!s.q||s.q.day!==d) s.q={day:d,c:{},claimed:[],bonus:false}; return s.q; }

  /* ---------- günlük görev havuzu ---------- */
  const NAMES={guess:'Ben Kimim?',quiz:'Bilgi Yarışması',mem:'Kahraman Hafızası',hl:'Yüksek mi Düşük mü',cards:'Kahraman Kartları'};
  const POOL=[
    {id:'play3',ic:'🎮',t:'3 maç oyna',n:3,k:'play',r:200},
    {id:'play5',ic:'🕹️',t:'5 maç oyna',n:5,k:'play',r:350},
    {id:'cardwin',ic:'🃏',t:'Kahraman Kartları\'nda 1 maç kazan',n:1,k:'cardwin',r:300},
    {id:'cards2',ic:'🂠',t:'2 kez Kahraman Kartları oyna',n:2,k:'g_cards',r:200},
    {id:'quiz',ic:'🧠',t:'Bilgi Yarışması\'nda 800+ puan al',n:1,k:'s_quiz_800',r:250},
    {id:'guess',ic:'🕵️',t:'Ben Kimim?\'de 600+ puan al',n:1,k:'s_guess_600',r:250},
    {id:'mem',ic:'🧩',t:'Kahraman Hafızası oyna',n:1,k:'g_mem',r:150},
    {id:'hl',ic:'📈',t:'Yüksek mi Düşük mü oyna',n:1,k:'g_hl',r:150},
    {id:'pts',ic:'💰',t:'Bugün 1.500 puan topla',n:1500,k:'pts',r:300},
    {id:'spin',ic:'🎡',t:'Şans çarkını çevir',n:1,k:'spin',r:100},
    {id:'diff',ic:'🎲',t:'3 farklı oyun oyna',n:3,k:'diff',r:300},
  ];
  function seedRand(str){ let h=2166136261; for(const ch of str){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619); } return ()=>{ h^=h<<13; h^=h>>>17; h^=h<<5; return ((h>>>0)%1e6)/1e6; }; }
  function todays(){ const r=seedRand('mt-'+today()); const a=[...POOL]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    const pick=[a.find(x=>x.k==='play'||x.id==='diff')]; for(const x of a){ if(pick.length>=3) break; if(!pick.includes(x)&&!(x.k==='play'&&pick.some(p=>p.k==='play'))) pick.push(x); } return pick; }
  const BONUS=400;
  const qVal=(q,c)=>q.k==='diff'?Object.keys(c.diff||{}).length:(c[q.k]||0);

  /* ---------- başarımlar ---------- */
  const nCards=()=>Object.keys(myCards()).length;
  const hasLeg=()=>Object.keys(myCards()).some(id=>{ const h=HEROES_CG.find(x=>x.id===id); return h&&h.r==='e'; });
  const ACH=[
    {id:'first',ic:'👣',t:'İlk adım',d:'İlk oyununu oyna',tier:'b',v:s=>s.st.games,n:1},
    {id:'g10',ic:'🎮',t:'Çaylak',d:'10 oyun oyna',tier:'b',v:s=>s.st.games,n:10},
    {id:'g50',ic:'🕹️',t:'Müdavim',d:'50 oyun oyna',tier:'s',v:s=>s.st.games,n:50},
    {id:'g200',ic:'👑',t:'Salonun efsanesi',d:'200 oyun oyna',tier:'g',v:s=>s.st.games,n:200},
    {id:'win1',ic:'🏆',t:'İlk galibiyet',d:'Kahraman Kartları\'nda bir maç kazan',tier:'b',v:s=>s.st.cardWins,n:1},
    {id:'win10',ic:'🃏',t:'Masanın kralı',d:'Kahraman Kartları\'nda 10 maç kazan',tier:'s',v:s=>s.st.cardWins,n:10},
    {id:'win50',ic:'♛',t:'Yenilmez',d:'Kahraman Kartları\'nda 50 maç kazan',tier:'g',v:s=>s.st.cardWins,n:50},
    {id:'streak3',ic:'🔥',t:'Isınıyor',d:'3 gün üst üste günlük ödül al',tier:'b',v:s=>s.streak||0,n:3},
    {id:'streak7',ic:'☄️',t:'7 gün seri',d:'7 gün üst üste günlük ödül al',tier:'g',v:s=>s.streak||0,n:7},
    {id:'c10',ic:'📇',t:'Koleksiyoncu',d:'10 farklı kart topla',tier:'b',v:()=>nCards(),n:10},
    {id:'c25',ic:'🗂️',t:'Arşivci',d:'25 farklı kart topla',tier:'s',v:()=>nCards(),n:25},
    {id:'call',ic:'💎',t:'Tam deste',d:'Tüm kartları topla',tier:'e',v:()=>nCards(),n:()=>HEROES_CG.length},
    {id:'leg',ic:'✨',t:'Efsane eli',d:'Efsanevi bir kart kazan',tier:'g',v:()=>hasLeg()?1:0,n:1},
    {id:'lv5',ic:'⭐',t:'Yükselen yıldız',d:'Level 5 ol',tier:'b',v:s=>lvlOf(s.xp),n:5},
    {id:'lv15',ic:'🌟',t:'Kozmik güç',d:'Level 15 ol',tier:'g',v:s=>lvlOf(s.xp),n:15},
    {id:'quiz',ic:'🧠',t:'Marvel uzmanı',d:'Bilgi Yarışması\'nda 1.200+ puan al',tier:'s',v:s=>s.st.best.quiz||0,n:1200},
    {id:'guess',ic:'🕵️',t:'Dedektif',d:'Ben Kimim?\'de 1.200+ puan al',tier:'s',v:s=>s.st.best.guess||0,n:1200},
    {id:'all5',ic:'🎲',t:'Her şeyi denedim',d:'Salondaki 5 oyunun hepsini oyna',tier:'b',v:s=>Object.keys(s.st.per).filter(k=>NAMES[k]).length,n:5},
    {id:'q1',ic:'📋',t:'Görev adamı',d:'İlk günlük görevini tamamla',tier:'b',v:s=>s.st.qDone,n:1},
    {id:'q30',ic:'🎖️',t:'Görev ustası',d:'30 günlük görev tamamla',tier:'s',v:s=>s.st.qDone,n:30},
    {id:'qall',ic:'🏅',t:'Kusursuz gün',d:'Bir günün tüm görevlerini bitir',tier:'g',v:s=>s.st.qAll,n:1},
  ];
  const nOf=a=>typeof a.n==='function'?a.n():a.n;
  window.ACH_LIST=ACH;

  function hexHTML(a,cls=''){ return `<div class="hx t-${a.tier} ${cls}"><span>${a.ic}</span></div>`; }
  let popQ=[], popping=false;
  function popAch(a){ popQ.push(a); if(!popping) nextPop(); }
  function nextPop(){ const a=popQ.shift(); if(!a){ popping=false; return; } popping=true;
    const d=document.createElement('div'); d.className='achpop'; d.innerHTML=`${hexHTML(a)}<div><span class="mono">BAŞARIM AÇILDI · +100 XP</span><b>${esc(a.t)}</b><small class="dim">${esc(a.d)}</small></div>`;
    document.body.appendChild(d); SFX.sfx?SFX.sfx('reveal'):SFX.play('win'); buzz([30,40,30]);
    if(G){ G.fromTo(d,{y:-120,opacity:0},{y:0,opacity:1,duration:.55,ease:'back.out(2)'}); G.fromTo(d.querySelector('.hx'),{rotation:-200,scale:0},{rotation:0,scale:1,duration:.8,delay:.15,ease:'back.out(2)'});
      G.to(d,{y:-120,opacity:0,delay:3.2,duration:.4,onComplete:()=>{ d.remove(); nextPop(); }}); }
    else setTimeout(()=>{ d.remove(); nextPop(); },3500); }

  let checking=false;
  function checkAch(){ if(checking) return; checking=true;
    try{ const s=S(); s.ach=s.ach||{}; const fresh=[];
      ACH.forEach(a=>{ if(!s.ach[a.id]&&a.v(s)>=nOf(a)){ s.ach[a.id]=Date.now(); fresh.push(a); } });
      if(fresh.length){ saveProg(s);
        if(FB.ready&&FB.user){ const up={}; fresh.forEach(a=>up[a.id]=s.ach[a.id]); FB.db.collection('users').doc(FB.user.uid).set({ach:up},{merge:true}).catch(()=>{}); }
        fresh.forEach(a=>{ popAch(a); }); addXP(100*fresh.length); renderQuests(); }
    } finally{ checking=false; } }

  /* ---------- olay takibi ---------- */
  let rewarding=false;
  function bump(fn){ const s=S(); const q=QS(s); fn(s,q.c); saveProg(s); renderQuests(); setTimeout(checkAch,300); }
  const _sub=submitScore;
  submitScore=function(game,score){ _sub(game,score); if(rewarding) return;
    bump((s,c)=>{ c.pts=(c.pts||0)+Math.max(0,score|0);
      if(game==='daily') return;
      s.st.games++; s.st.per[game]=(s.st.per[game]||0)+1; s.st.best[game]=Math.max(s.st.best[game]||0,score|0);
      c.play=(c.play||0)+1; c['g_'+game]=(c['g_'+game]||0)+1; c.diff=c.diff||{}; c.diff[game]=1;
      [['quiz',800],['guess',600]].forEach(([g,v])=>{ if(game===g&&score>=v) c[`s_${g}_${v}`]=1; });
    }); };
  const _rec=recordMatch;
  recordMatch=function(ranking){ _rec(ranking); try{ const meName=AUTH.user&&(AUTH.user.display||AUTH.user.username);
    if(ranking&&ranking[0]&&!ranking[0].bot&&ranking[0].name===meName) bump((s,c)=>{ s.st.cardWins++; s.st.won=s.st.won||{}; s.st.won.cards=(s.st.won.cards||0)+1; c.cardwin=(c.cardwin||0)+1; }); }catch(e){} };
  const _daily=openDaily;
  openDaily=function(){ const before=prog().lastDaily; _daily(); const b=$('#spin'); if(!b) return;
    const oc=b.onclick; b.onclick=e=>{ oc&&oc(e); if(prog().lastDaily!==before) bump((s,c)=>{ s.st.spins++; c.spin=1; }); }; };
  const _set=setCards; setCards=function(c,show){ _set(c,show); setTimeout(checkAch,600); };

  /* ---------- görev ödülü ---------- */
  function claim(id){ const s=S(), q=QS(s), list=todays(); const t=list.find(x=>x.id===id); if(!t||q.claimed.includes(id)||qVal(t,q.c)<t.n) return;
    q.claimed.push(id); s.st.qDone++; let cn=t.r, msg=`+${t.r} coin, +50 XP`;
    const allNow=list.every(x=>q.claimed.includes(x.id)); if(allNow&&!q.bonus){ q.bonus=true; s.st.qAll++; cn+=BONUS; msg+=` · tüm görevler bonusu +${BONUS} coin!`; }
    saveProg(s); rewarding=true; try{ setCoins((coins()||0)+cn); }finally{ rewarding=false; } addXP(50);
    SFX.play('correct'); burst&&burst(allNow); toast('Görev tamamlandı',msg); renderQuests(); setTimeout(checkAch,400); }

  /* ---------- görev paneli ---------- */
  function questHTML(){ const s=S(), q=QS(s), list=todays();
    const now=new Date(Date.now()+3*3600e3), left=86400-(now.getUTCHours()*3600+now.getUTCMinutes()*60+now.getUTCSeconds());
    return `<div class="qlist">${list.map(t=>{ const v=Math.min(qVal(t,q.c),t.n), done=v>=t.n, cl=q.claimed.includes(t.id);
      const shown=t.k.startsWith('s_')?(done?'✓':'0 / 1'):`${v.toLocaleString('tr-TR')} / ${t.n.toLocaleString('tr-TR')}`;
      return `<div class="qi${done?' done':''}${cl?' claimed':''}"><span class="ic">${t.ic}</span><div><b>${esc(t.t)}</b><div class="qb"><i style="--p:${Math.round(v/t.n*100)}%"></i></div><small>${shown}</small></div>
        ${cl?'<span class="mono dim">Alındı ✓</span>':done?`<button class="btn p sm" data-claim="${t.id}" type="button"><span class="bl"><span>+${t.r}</span><span>+${t.r}</span></span></button>`:`<span class="rw">+${t.r}</span>`}</div>`; }).join('')}
      <div class="qbonus${q.bonus?' on':''}">🏅 <span>Üç görevi de bitir: <b style="color:var(--gold)">+${BONUS} bonus</b>${q.bonus?' · alındı ✓':''}</span></div>
      <small class="mono dim">Yeni görevler ${Math.floor(left/3600)} sa ${Math.floor(left%3600/60)} dk sonra</small></div>`; }
  function bindClaims(root){ $$('[data-claim]',root).forEach(b=>b.onclick=()=>claim(b.dataset.claim)); }
  function renderQuests(){
    const box=$('#questBox'); if(box){ box.innerHTML=questHTML(); bindClaims(box); }
    const m=$('#questModal'); if(m){ m.innerHTML=questHTML(); bindClaims(m); }
    const s=S(), q=QS(s); const ready=todays().some(t=>!q.claimed.includes(t.id)&&qVal(t,q.c)>=t.n);
    const qb=$('#questBtn'); if(qb) qb.classList.toggle('ready',ready||todays().some(t=>!q.claimed.includes(t.id))&&!q.c.play);
  }
  function openQuests(){ openModal('Günlük görevler'); swap(`<div id="questModal"></div>`); renderQuests(); }

  /* sıralama sayfasına görev + rozet paneli */
  const ex=$('#v-siralama .extras');
  if(ex){ const p=document.createElement('div'); p.className='xpanel'; p.innerHTML=`<span class="cap" style="align-self:flex-start">Bugün</span><h3>Günlük görevler</h3><div id="questBox"></div>`; 
    const p2=document.createElement('div'); p2.className='xpanel'; p2.innerHTML=`<div class="dk-head" style="display:flex;align-items:center;gap:10px"><span class="cap">Başarımlar</span><h3 style="flex:1;margin:0" id="achCount"></h3></div><div class="bgrid" id="achGrid"></div>`; ex.appendChild(p2); ex.appendChild(p); }
  /* üst menüye görev butonu */
  const db=$('#dailyBtn'); if(db){ const b=document.createElement('button'); b.className='hbtn'; b.id='questBtn'; b.type='button'; b.setAttribute('aria-label','Günlük görevler'); b.textContent='📋';
    b.onclick=()=>{ SFX.play('click'); openQuests(); }; db.after(b); }

  /* ---------- rozet ızgarası + detay ---------- */
  function achGridHTML(){ const s=S(); s.ach=s.ach||{};
    return ACH.map(a=>`<button class="bd${s.ach[a.id]?'':' lock'}" data-ach="${a.id}" type="button">${hexHTML(a)}<small>${esc(a.t)}</small></button>`).join(''); }
  function renderAch(){ const g=$('#achGrid'); if(!g) return; const s=S(); const n=Object.keys(s.ach||{}).length;
    $('#achCount').textContent=`${n} / ${ACH.length} açıldı`; g.innerHTML=achGridHTML(); $$('[data-ach]',g).forEach(b=>b.onclick=()=>openAch(b.dataset.ach)); }
  function openAch(id){ const a=ACH.find(x=>x.id===id), s=S(), got=s.ach&&s.ach[id], v=Math.min(a.v(s),nOf(a));
    openModal('Başarım'); SFX.play('click');
    swap(`<div class="bdet"><div class="bd${got?'':' lock'}">${hexHTML(a)}</div><h3 style="margin:0">${esc(a.t)}</h3><p class="dim" style="margin:0">${esc(a.d)}</p>
      ${got?`<span class="mono" style="color:var(--ok)">Açıldı · ${new Date(got).toLocaleDateString('tr-TR')}</span>`:`<div class="qb"><i style="--p:${Math.round(v/nOf(a)*100)}%"></i></div><span class="mono dim">${v.toLocaleString('tr-TR')} / ${nOf(a).toLocaleString('tr-TR')}</span>`}
      <span class="mono dim">${{b:'Bronz',s:'Gümüş',g:'Altın',e:'Efsanevi'}[a.tier]} rozet</span></div>`);
    if(got&&G) G.fromTo('.bdet .hx',{rotationY:180,scale:.6},{rotationY:0,scale:1,duration:.8,ease:'back.out(2)'}); }
  const _rq=renderQuests; renderQuests=function(){ _rq(); renderAch(); };

  /* hesap penceresine rozetler */
  const _oa=openAccount;
  openAccount=function(){ _oa(); const lg=$('.lg'); if(!lg||$('.accach',lg)) return; const s=S(); const got=ACH.filter(a=>s.ach&&s.ach[a.id]);
    const box=document.createElement('div'); box.className='accach';
    box.innerHTML=`<div class="mono dim" style="display:flex;justify-content:space-between"><span>ROZETLER</span><span>${got.length}/${ACH.length}</span></div>
      ${got.length?`<div class="bgrid">${got.slice(-8).reverse().map(a=>`<button class="bd" data-ach="${a.id}" type="button">${hexHTML(a)}<small>${esc(a.t)}</small></button>`).join('')}</div>`:'<p class="dim" style="margin:0">Henüz rozet yok. Oyun oyna, görev bitir, rozetleri aç!</p>'}`;
    const after=$('.accol',lg)||$('ul',lg); after?after.after(box):lg.appendChild(box);
    $$('[data-ach]',box).forEach(b=>b.onclick=()=>openAch(b.dataset.ach)); };

  /* giriş yapınca buluttaki rozetleri birleştir */
  (function w(){ if(FB.ready&&FB.auth){ FB.auth.onAuthStateChanged(async u=>{ if(!u) return; try{ const d=(await FB.db.collection('users').doc(u.uid).get()).data()||{};
      const s=S(); s.ach=Object.assign({},d.ach||{},s.ach||{}); saveProg(s); FB.db.collection('users').doc(u.uid).set({ach:s.ach},{merge:true}).catch(()=>{}); renderQuests(); setTimeout(checkAch,800); }catch(e){} }); } else setTimeout(w,800); })();

  renderQuests(); setTimeout(checkAch,2500);
  setInterval(()=>{ if(!document.hidden) renderQuests(); },60000);
})();


const QS_NEW=[["Iron Man'in gerçek adı nedir?", ["Tony Stark", "Steve Rogers", "Peter Quill", "Stephen Strange"], 0, 1], ["Kaptan Amerika'nın gerçek adı nedir?", ["Steve Rogers", "Bucky Barnes", "Sam Wilson", "John Walker"], 0, 1], ["Thor hangi diyardan gelir?", ["Asgard", "Wakanda", "Xandar", "Titan"], 0, 1], ["Thanos hangi gezegenden gelir?", ["Titan", "Vormir", "Sakaar", "Xandar"], 0, 1], ["Iron Man'i hangi oyuncu canlandırdı?", ["Robert Downey Jr.", "Chris Evans", "Chris Hemsworth", "Mark Ruffalo"], 0, 1], ["Thor'u hangi oyuncu canlandırdı?", ["Chris Hemsworth", "Chris Pratt", "Chris Evans", "Tom Hiddleston"], 0, 1], ["Loki'yi hangi oyuncu canlandırdı?", ["Tom Hiddleston", "Tom Holland", "Benedict Cumberbatch", "Paul Rudd"], 0, 1], ["MCU'da Spider-Man'i hangi oyuncu canlandırdı?", ["Tom Holland", "Andrew Garfield", "Tom Hiddleston", "Tobey Maguire"], 0, 1], ["\"Avengers... toplanın!\" diyen kahraman kimdir?", ["Kaptan Amerika", "Iron Man", "Thor", "Nick Fury"], 0, 1], ["\"Ben kaçınılmazım.\" diyen kimdir?", ["Thanos", "Ultron", "Loki", "Hela"], 0, 1], ["\"Wakanda sonsuza dek!\" selamı hangi kahramanla özdeşleşir?", ["Black Panther", "Kaptan Marvel", "Falcon", "Hulk"], 0, 1], ["Sam Wilson'ın ilk kahraman adı nedir?", ["Falcon", "Kış Askeri", "Patriot", "Ronin"], 0, 1], ["James Rhodes'un zırhlı kahraman adı nedir?", ["War Machine", "Falcon", "Ronin", "Vision"], 0, 1], ["Hangisi bir Sonsuzluk Taşı değildir?", ["Ateş Taşı", "Güç Taşı", "Ruh Taşı", "Zaman Taşı"], 0, 1], ["Spider-Man'in MCU'daki en yakın arkadaşı kimdir?", ["Ned", "Harry", "Flash", "Happy"], 0, 1], ["Gamora'nın kız kardeşi kimdir?", ["Nebula", "Mantis", "Shuri", "Hela"], 0, 1], ["X-Men'in kurucusu olan profesör kimdir?", ["Charles Xavier", "Magneto", "Hank McCoy", "Scott Summers"], 0, 1], ["Magneto hangi şeyi kontrol edebilir?", ["Metali", "Ateşi", "Suyu", "Zamanı"], 0, 1], ["Wolverine'in her elinden kaç pençe çıkar?", ["3", "2", "4", "5"], 0, 1], ["Hulk hangi ışınlara maruz kalınca dönüştü?", ["Gama", "Kozmik", "X", "Ultraviyole"], 0, 1], ["Endgame'de Kaptan Amerika hangi silahı kaldırarak herkesi şaşırttı?", ["Mjölnir", "Stormbreaker", "Sonsuzluk Eldiveni", "Kozmik Kılıç"], 0, 1], ["Doctor Strange'e büyü eğitimi veren kimdir?", ["Antik Kişi", "Wong", "Mordo", "Dormammu"], 0, 1], ["Endgame'de parmak şıklatıp Thanos'u yok eden kimdir?", ["Tony Stark", "Thor", "Hulk", "Kaptan Marvel"], 0, 1], ["Ant-Man küçülüp büyümek için neyi kullanır?", ["Pym Parçacıkları", "Vibranyum", "Tesseract", "Gama ışını"], 0, 1], ["Star-Lord'un sevdiği kaset hangisidir?", ["Awesome Mix Vol. 1", "Galaxy Hits", "80'ler Best Of", "Space Rock"], 0, 1], ["MCU'nun ilk filmi hangisidir?", ["Iron Man", "The Incredible Hulk", "Thor", "Captain America: The First Avenger"], 0, 2], ["Thor: Ragnarok'ta Hulk hangi gezegende gladyatördü?", ["Sakaar", "Xandar", "Vormir", "Knowhere"], 0, 2], ["Ruh Taşı hangi gezegendeydi?", ["Vormir", "Titan", "Morag", "Sakaar"], 0, 2], ["Guardians of the Galaxy'de Güç Taşı ilk hangi gezegende bulunur?", ["Morag", "Xandar", "Ego", "Vormir"], 0, 2], ["Thor'un baltası Stormbreaker'ı kim dövdü?", ["Eitri", "Odin", "Tony Stark", "Heimdall"], 0, 2], ["Zihin Taşı ilk olarak neyin içindeydi?", ["Loki'nin asası", "Thor'un çekici", "Thanos'un kılıcı", "Kaptan'ın kalkanı"], 0, 2], ["Uzay Taşı'nın içinde durduğu küpün adı nedir?", ["Tesseract", "Aether", "Küre (Orb)", "Agamotto"], 0, 2], ["Gerçeklik Taşı'nın sıvı haline ne denir?", ["Aether", "Tesseract", "Küre (Orb)", "Nektar"], 0, 2], ["Zaman Taşı hangi renktedir?", ["Yeşil", "Mavi", "Kırmızı", "Mor"], 0, 2], ["Captain America: The Winter Soldier'da Kış Askeri kimdir?", ["Bucky Barnes", "Sam Wilson", "Brock Rumlow", "Alexander Pierce"], 0, 2], ["S.H.I.E.L.D.'ın içine yıllarca gizlice sızmış örgüt hangisidir?", ["Hydra", "A.I.M.", "On Halka", "Kree"], 0, 2], ["Tony Stark'ı Afganistan'da kaçıran örgüt hangisidir?", ["On Halka", "Hydra", "El (The Hand)", "A.I.M."], 0, 2], ["Doctor Strange'in \"pazarlık yapmaya geldim\" dediği varlık kimdir?", ["Dormammu", "Mephisto", "Surtur", "Kaecilius"], 0, 2], ["Spider-Man: No Way Home'da kaç Spider-Man bir araya gelir?", ["3", "2", "4", "5"], 0, 2], ["WandaVision dizisi hangi kasabada geçer?", ["Westview", "Riverdale", "Hawkins", "Smallville"], 0, 2], ["Captain America: Civil War'da Spider-Man kimin tarafındaydı?", ["Iron Man", "Kaptan Amerika", "Hiçbiri", "Zemo"], 0, 2], ["Thanos Ruh Taşı için kimi feda etti?", ["Gamora", "Nebula", "Ebony Maw", "Proxima Midnight"], 0, 2], ["Avengers: Age of Ultron'da hangi şehir havaya kaldırılır?", ["Sokovia", "Wakanda", "Latveria", "Madripoor"], 0, 2], ["Star-Lord'un babası Ego aslında nedir?", ["Yaşayan bir gezegen", "Bir Kree askeri", "Bir Skrull", "Bir Asgardlı"], 0, 2], ["Yondu oklarını nasıl yönetir?", ["Islık çalarak", "Düşünerek", "Kumandayla", "Göz kırparak"], 0, 2], ["Skrull'ların en bilinen yeteneği nedir?", ["Şekil değiştirmek", "Uçmak", "Görünmezlik", "Zaman yolculuğu"], 0, 2], ["Captain America: Civil War'da Avengers'ı birbirine düşüren kimdir?", ["Helmut Zemo", "Thanos", "Ultron", "Red Skull"], 0, 2], ["Thor: Ragnarok'ta Asgard'ı ele geçiren ölüm tanrıçası kimdir?", ["Hela", "Frigga", "Sif", "Valkyrie"], 0, 2], ["Hela'nın Thor ile akrabalığı nedir?", ["Ablası", "Annesi", "Kuzeni", "Teyzesi"], 0, 2], ["Thanos'un şıklatmasından kaç yıl sonra Endgame'deki geri dönüş olur?", ["5", "3", "10", "1"], 0, 2], ["Mysterio aslında kimdir?", ["Kovulmuş eski bir Stark çalışanı", "Başka evrenden bir kahraman", "Bir Skrull", "Bir büyücü"], 0, 2], ["Hawkeye, Endgame'de hangi kimlikle dolaşıyordu?", ["Ronin", "Echo", "Bullseye", "Gölge"], 0, 2], ["Kate Bishop kimin öğrencisi olur?", ["Hawkeye", "Black Widow", "Kaptan Amerika", "Doctor Strange"], 0, 2], ["Ms. Marvel'in gerçek adı nedir?", ["Kamala Khan", "Monica Rambeau", "Kate Bishop", "Riri Williams"], 0, 2], ["Loki dizisinde zamanı denetleyen kurumun adı nedir?", ["TVA", "S.H.I.E.L.D.", "S.W.O.R.D.", "Hydra"], 0, 2], ["Wakanda Forever'da su altı krallığını yöneten kimdir?", ["Namor", "Killmonger", "M'Baku", "Attuma"], 0, 2], ["Falcon and the Winter Soldier'ın sonunda Sam Wilson hangi kimliği alır?", ["Kaptan Amerika", "Kış Askeri", "US Agent", "War Machine"], 0, 2], ["Captain America: Brave New World'de kalkanı taşıyan Kaptan Amerika kimdir?", ["Sam Wilson", "Steve Rogers", "Bucky Barnes", "John Walker"], 0, 2], ["Guardians of the Galaxy'nin sonunda Groot farklı olarak ne der?", ["Biz Groot'uz", "Ben Rocket'ım", "Elveda", "Sizi seviyorum"], 0, 2], ["Mantis'in gücü nedir?", ["Duyguları hissedip etkilemek", "Uçmak", "Işınlanmak", "Ateş atmak"], 0, 2], ["Tony Stark'ın babasının adı nedir?", ["Howard", "Obadiah", "Edwin", "Henry"], 0, 2], ["Tony Stark'ın koruması ve şoförü kimdir?", ["Happy Hogan", "Justin Hammer", "Phil Coulson", "Harley Keener"], 0, 2], ["Iron Man 2'deki elektrikli kırbaçlı kötü adam kimdir?", ["Whiplash", "Mandarin", "Aldrich Killian", "Obadiah Stane"], 0, 2], ["Thor: Ragnarok'ta Hulk'un gladyatör arkadaşı olan taştan adam kimdir?", ["Korg", "Miek", "Drax", "Groot"], 0, 2], ["Doctor Strange'in yardımcısı olup sonradan Yüce Büyücü olan kimdir?", ["Wong", "Mordo", "Kaecilius", "Antik Kişi"], 0, 2], ["Black Widow ile Kırmızı Oda'da kardeş gibi büyüyen ajan kimdir?", ["Yelena Belova", "Maria Hill", "Sharon Carter", "Peggy Carter"], 0, 2], ["Red Guardian hangi ülkenin süper askeriydi?", ["Sovyetler Birliği", "ABD", "Sokovia", "Wakanda"], 0, 2], ["Orijinal (ilk) Ant-Man kimdir?", ["Hank Pym", "Scott Lang", "Darren Cross", "Bill Foster"], 0, 2], ["Scott Lang'in kızının adı nedir?", ["Cassie", "Hope", "Janet", "Maya"], 0, 2], ["Tony Stark'ın kızının adı nedir?", ["Morgan", "Pepper", "May", "Cassie"], 0, 2], ["\"Seni 3000 kere seviyorum.\" sözü hangi filmde geçer?", ["Avengers: Endgame", "Iron Man 3", "Infinity War", "Civil War"], 0, 2], ["Okoye'nin komutanı olduğu kadın muhafız birliği hangisidir?", ["Dora Milaje", "Kırmızı Oda", "Valkyrie", "Jabari"], 0, 2], ["Daredevil'in gündüzki mesleği nedir?", ["Avukat", "Doktor", "Gazeteci", "Polis"], 0, 2], ["Punisher'ın gerçek adı nedir?", ["Frank Castle", "Matt Murdock", "Luke Cage", "Danny Rand"], 0, 2], ["Venom'un ev sahibi olan gazeteci kimdir?", ["Eddie Brock", "Peter Parker", "Flash Thompson", "J. Jonah Jameson"], 0, 2], ["Green Goblin'in gerçek adı nedir?", ["Norman Osborn", "Otto Octavius", "Max Dillon", "Adrian Toomes"], 0, 2], ["Doctor Octopus'un gerçek adı nedir?", ["Otto Octavius", "Norman Osborn", "Curt Connors", "Quentin Beck"], 0, 2], ["Spider-Man: Homecoming'in kötü adamı Vulture'ın gerçek adı nedir?", ["Adrian Toomes", "Quentin Beck", "Herman Schultz", "Aaron Davis"], 0, 2], ["Fantastik Dörtlü'nün lideri kimdir?", ["Reed Richards", "Johnny Storm", "Ben Grimm", "Sue Storm"], 0, 2], ["Ronan hangi ırktandır?", ["Kree", "Skrull", "Asgardlı", "Titan"], 0, 2], ["Thor: Ragnarok'ta Thor hangi gözünü kaybeder?", ["Sağ", "Sol", "İkisini de", "Hiçbirini"], 0, 2], ["Kaptan Marvel'in Flerken olan kedisinin adı nedir?", ["Goose", "Garfield", "Felix", "Tom"], 0, 2], ["Black Widow ilk kez hangi filmde göründü?", ["Iron Man 2", "The Avengers", "Iron Man", "Captain America: The First Avenger"], 0, 2], ["Infinity War'da Thanos'un emrindeki seçkin komutanlara ne denir?", ["Thanos'un Çocukları", "Kree Muhafızları", "Ravagerlar", "Nova Birliği"], 0, 2], ["Vormir'de Ruh Taşı'nı bekleyen kimdir?", ["Red Skull", "Heimdall", "Collector", "Odin"], 0, 3], ["Kaptan Amerika'yı güçlendiren serumu geliştiren bilim insanı kimdir?", ["Dr. Abraham Erskine", "Arnim Zola", "Hank Pym", "Howard Stark"], 0, 3], ["Iron Man 1'deki kötü adam Obadiah Stane'in zırhının adı nedir?", ["Iron Monger", "Whiplash", "Iron Patriot", "Ultron Mark 1"], 0, 3], ["Iron Man 3'te \"Mandarin\" rolünü oynayan aktör karakterin adı nedir?", ["Trevor Slattery", "Aldrich Killian", "Justin Hammer", "Ivan Vanko"], 0, 3], ["Far From Home'da Tony Stark'ın Peter'a bıraktığı yapay zekâlı gözlüğün adı nedir?", ["E.D.I.T.H.", "KAREN", "F.R.I.D.A.Y.", "J.A.R.V.I.S."], 0, 3], ["Spider-Man: Homecoming'de kostümdeki yapay zekâya Peter hangi adı verir?", ["Karen", "Edith", "Friday", "Jocasta"], 0, 3], ["Infinity War'da Thor'a yeni bir göz takan kimdir?", ["Rocket", "Tony Stark", "Eitri", "Groot"], 0, 3], ["Black Panther'de vibranyum çalan silah kaçakçısı kimdir?", ["Ulysses Klaue", "Helmut Zemo", "Batroc", "Justin Hammer"], 0, 3], ["Killmonger'ın Amerika'daki adı nedir?", ["Erik Stevens", "M'Baku", "W'Kabi", "Zuri"], 0, 3], ["Wakanda'nın başkentinin adı nedir?", ["Birnin Zana", "Talokan", "Jabari", "Sokovia"], 0, 3], ["Wakanda Forever'da Namor'un krallığının adı nedir?", ["Talokan", "Atlantis", "Lemurya", "Xandar"], 0, 3], ["Moon Knight'ın hizmet ettiği Mısır tanrısı kimdir?", ["Khonshu", "Ra", "Anubis", "Horus"], 0, 3], ["Loki dizisinde He Who Remains'in daha tehlikeli varyantlarının ortak adı nedir?", ["Kang", "Thanos", "Galactus", "Doom"], 0, 3], ["Doctor Strange in the Multiverse of Madness'ta evrenler arası geçebilen genç kız kimdir?", ["America Chavez", "Kate Bishop", "Kamala Khan", "Riri Williams"], 0, 3], ["Eternals'ta Dünya'nın içinden doğmak üzere olan Celestial'ın adı nedir?", ["Tiamut", "Arishem", "Ego", "Galactus"], 0, 3], ["Riri Williams'ın kahraman adı nedir?", ["Ironheart", "Rescue", "Iron Lad", "War Machine"], 0, 3], ["Pepper Potts'un Endgame'de giydiği zırhın adı nedir?", ["Rescue", "Ironheart", "Mark 85", "Iron Patriot"], 0, 3], ["Collector'ün koleksiyonunu tuttuğu yer neresidir?", ["Knowhere", "Xandar", "Sakaar", "Vormir"], 0, 3], ["Knowhere aslında nedir?", ["Dev bir Celestial'ın kesik kafası", "Bir Kree gemisi", "Ölü bir yıldız", "Yapay bir ay"], 0, 3], ["Nova Birliği hangi gezegenin koruyucusudur?", ["Xandar", "Hala", "Titan", "Morag"], 0, 3], ["WandaVision'da Wanda'nın ikiz oğullarının adları nedir?", ["Billy ve Tommy", "Pietro ve Vision", "Peter ve Ned", "Tom ve Jerry"], 0, 3], ["Hope'un annesi Janet'ın soyadı nedir?", ["Van Dyne", "Pym", "Lang", "Foster"], 0, 3], ["Ruh Taşı hangi renktedir?", ["Turuncu", "Sarı", "Mor", "Yeşil"], 0, 3], ["Güç Taşı hangi renktedir?", ["Mor", "Kırmızı", "Mavi", "Yeşil"], 0, 3], ["MCU'da MJ'nin tam adı nedir?", ["Michelle Jones", "Mary Jane Watson", "Michelle Johnson", "Maria Jane"], 0, 3], ["Ultron'un yaratılmasında kullanılan taş hangisidir?", ["Zihin Taşı", "Uzay Taşı", "Gerçeklik Taşı", "Zaman Taşı"], 0, 3], ["Avengers: Endgame'de hangi yıla gidip Tesseract'ı ve Pym Parçacıklarını alırlar?", ["1970", "2012", "1945", "2014"], 0, 3], ["Avengers: Endgame'de New York 2012'ye giden ekip hangi taşı Antik Kişi'den alır?", ["Zaman Taşı", "Zihin Taşı", "Uzay Taşı", "Ruh Taşı"], 0, 3], ["Captain America: The First Avenger'da Steve Rogers buza gömülmeden önce hangi kötüyle savaşır?", ["Red Skull", "Arnim Zola", "Baron Zemo", "Crossbones"], 0, 3], ["Grandmaster'ın yönettiği gezegen hangisidir?", ["Sakaar", "Xandar", "Knowhere", "Contraxia"], 0, 3], ["Thanos'un çocuklarından biri olan, telekinezi gücüne sahip kötü kimdir?", ["Ebony Maw", "Corvus Glaive", "Cull Obsidian", "Proxima Midnight"], 0, 3], ["Shang-Chi'nin babasının adı nedir?", ["Wenwu", "Razor Fist", "Death Dealer", "Morris"], 0, 3]];
const HEROES_NEW=[{"ad": "Nick Fury", "alt": ["nick fury", "fury", "nik furi"], "ip": ["Gizli bir teşkilatın başında.", "Kimseye tam güvenmez, hep bir planı vardır.", "Bir gözü bantlı.", "Avengers fikrini ilk o ortaya attı.", "S.H.I.E.L.D.'ın direktörü."]}, {"ad": "Gamora", "alt": ["gamora"], "ip": ["Galaksinin en tehlikeli kadını olarak bilinir.", "Kılıç ustası, yeşil tenli.", "Kız kardeşiyle sürekli kavga ederdi.", "Onu Thanos evlat edindi.", "Vormir'de Thanos onu feda etti."]}, {"ad": "Nebula", "alt": ["nebula"], "ip": ["Vücudunun büyük kısmı makine parçalarından oluşuyor.", "Mavi tenli.", "Kız kardeşini hep kıskandı.", "Babası Thanos.", "Sonunda Galaksinin Koruyucuları'na katıldı."]}, {"ad": "Drax", "alt": ["drax", "yok edici drax"], "ip": ["Mecazları anlamaz, her şeyi düz anlar.", "Çok güçlü ve vücudu kırmızı desenlerle kaplı.", "Ailesinin intikamını almak istiyordu.", "\"Yok Edici\" lakabıyla bilinir.", "Galaksinin Koruyucuları'ndan, \"görünmez\" olduğunu sanır."]}, {"ad": "Mantis", "alt": ["mantis"], "ip": ["Uzun süre birinin yanında yalnız yaşadı.", "Başında iki anten var.", "Dokunarak duyguları hissedebiliyor.", "İnsanları uyutabiliyor.", "Ego'nun yanında büyüdü."]}, {"ad": "Shuri", "alt": ["shuri", "suri"], "ip": ["Ülkesinin en zeki bilim insanı.", "Abisinin kostümlerini o tasarlıyor.", "Laboratuvarı yerin altında.", "Wakanda'nın prensesi.", "Sonradan Black Panther oldu."]}, {"ad": "Okoye", "alt": ["okoye"], "ip": ["Kraliyet ailesine bağlı bir savaşçı.", "Saçı yok, mızrağı var.", "Peruk takmaktan nefret eder.", "Dora Milaje'nin komutanı.", "Wakanda'nın en iyi generali."]}, {"ad": "Killmonger", "alt": ["killmonger", "erik killmonger", "erik stevens", "ndjadaka", "n jadaka"], "ip": ["Amerika'da büyüdü ama kökü başka yerde.", "Babası öldürüldüğünde çocuktu.", "Eski bir askerî özel harekâtçı.", "Tahtı ele geçirmek için meydan okudu.", "T'Challa'nın kuzeni."]}, {"ad": "Hela", "alt": ["hela"], "ip": ["Uzun süre hapsedilmişti.", "Kafasında boynuz gibi bir taç var.", "Bıçakları yoktan var edebiliyor.", "Ölüm tanrıçası.", "Thor ve Loki'nin ablası."]}, {"ad": "Valkyrie", "alt": ["valkyrie", "valkiri", "brunnhilde"], "ip": ["Eskiden seçkin bir savaşçı birliğindeydi.", "Bir dönem çok içki içen bir ödül avcısıydı.", "Sakaar'da Grandmaster için çalışıyordu.", "Pegasus'a binen bir savaşçı.", "Yeni Asgard'ın kralı oldu."]}, {"ad": "Falcon", "alt": ["falcon", "sam wilson", "sam"], "ip": ["Eski bir hava kuvvetleri askeri.", "Gazilere danışmanlık yapıyordu.", "Kanatlarıyla uçar.", "Kaptan Amerika'nın en yakın dostlarından.", "Sonunda kalkanı o devraldı."]}, {"ad": "Kış Askeri", "alt": ["winter soldier", "bucky", "bucky barnes", "kis askeri", "james barnes"], "ip": ["Uzun yıllar beyni yıkanarak kullanıldı.", "Bir kolu metalden.", "Hydra'nın suikastçısıydı.", "Bir trenden düşüp öldüğü sanıldı.", "Steve Rogers'ın çocukluk arkadaşı."]}, {"ad": "War Machine", "alt": ["war machine", "rhodey", "james rhodes", "rhodes"], "ip": ["Ordu içinde rütbeli bir subay.", "Silahlarla dolu gri bir zırh giyer.", "Bir savaşta felç kaldı ama yeniden yürüdü.", "Iron Man'in en yakın arkadaşı.", "Adı James Rhodes."]}, {"ad": "Ultron", "alt": ["ultron"], "ip": ["İnsanlığı korumak için yaratıldı ama çığırından çıktı.", "Kendini internete yükleyebiliyor.", "Bir şehri havaya kaldırdı.", "Zihin Taşı'nın gücüyle doğdu.", "Tony Stark ve Bruce Banner'ın yapay zekâsı."]}, {"ad": "Red Skull", "alt": ["red skull", "kizil kafatasi", "johann schmidt"], "ip": ["İkinci Dünya Savaşı'nda yaşadı.", "Bir serum onu çok güçlü ama çirkin yaptı.", "Hydra'nın lideriydi.", "Tesseract onu uzaya fırlattı.", "Yüzü kıpkırmızı bir kafatasına benzer."]}, {"ad": "Mysterio", "alt": ["mysterio", "quentin beck", "beck"], "ip": ["Kendini başka bir evrenden gelmiş gibi tanıttı.", "Fanusa benzeyen bir kask takıyor.", "Aslında bir illüzyon ustası.", "Dronlarla sahte canavarlar yarattı.", "Spider-Man'in gizli kimliğini herkese açıkladı."]}, {"ad": "Green Goblin", "alt": ["green goblin", "yesil goblin", "norman osborn", "goblin"], "ip": ["Çok zengin bir şirket sahibi.", "İçinde ikinci bir kişilik yaşıyor.", "Uçan bir kızakla gezer.", "Kabak bombaları atar.", "Gerçek adı Norman Osborn."]}, {"ad": "Shang-Chi", "alt": ["shang chi", "shangchi", "sean"], "ip": ["San Francisco'da otopark görevlisi olarak çalışıyordu.", "Çok küçük yaşta dövüş eğitimi aldı.", "Babası binlerce yıllık bir suç örgütünün lideri.", "Ejderhalarla bağı var.", "On Halka'nın varisi."]}, {"ad": "Moon Knight", "alt": ["moon knight", "ay sovalyesi", "marc spector", "steven grant"], "ip": ["Bir müzede hediyelik eşya satıyordu.", "Bir bedende birden fazla kişilik var.", "Beyaz bir pelerin ve maske takar.", "Bir Mısır tanrısına hizmet ediyor.", "Ay tanrısı Khonshu'nun avatarı."]}, {"ad": "Ms. Marvel", "alt": ["ms marvel", "kamala", "kamala khan"], "ip": ["Lisede okuyan bir genç.", "Süper kahraman hayran kurgusu yazıyor.", "Bir bileklik güçlerini açığa çıkardı.", "Kaptan Marvel'in en büyük hayranı.", "Gerçek adı Kamala Khan."]}, {"ad": "Daredevil", "alt": ["daredevil", "matt murdock", "matt"], "ip": ["Gündüzleri avukat.", "Çocukken bir kazada görme yeteneğini kaybetti.", "Diğer duyuları süper güçlü.", "Hell's Kitchen'ı koruyor.", "Kırmızı kostümünde boynuzlar var."]}, {"ad": "Venom", "alt": ["venom", "eddie brock"], "ip": ["Aslında iki varlık tek bedende.", "Uzaydan gelen siyah bir yapışkan.", "Çikolata ve beyin yemeyi sever.", "Ev sahibi bir gazeteci.", "Spider-Man'in kara kostümüne benzer."]}, {"ad": "Magneto", "alt": ["magneto", "erik lehnsherr"], "ip": ["Gençken çok acı şeyler yaşadı.", "En yakın dostu ile fikir ayrılığına düştü.", "Kaskı zihin okunmasını engeller.", "Metalleri kontrol eder.", "Mutantların üstün olduğuna inanır."]}, {"ad": "Profesör X", "alt": ["professor x", "profesor x", "charles xavier", "xavier", "charles"], "ip": ["Bir okul kurdu.", "Tekerlekli sandalye kullanıyor.", "Cerebro adlı bir makineyle herkesi bulur.", "Zihinleri okuyabiliyor.", "X-Men'in kurucusu."]}, {"ad": "Yondu", "alt": ["yondu", "yondu udonta"], "ip": ["Uzay korsanlarının kaptanı.", "Mavi tenli, başında kırmızı bir yüzgeç var.", "Bir çocuğu Dünya'dan alıp büyüttü.", "Islık çalarak oku yönlendiriyor.", "\"Ben Mary Poppins'im!\" dedi."]}, {"ad": "Wong", "alt": ["wong", "vong"], "ip": ["Bir kütüphanenin bekçisi.", "Şakaları pek anlamaz ama müziği sever.", "Kamar-Taj'ın en sadık büyücülerinden.", "Doctor Strange'in en yakın dostu.", "Yüce Büyücü unvanını aldı."]}, {"ad": "Kate Bishop", "alt": ["kate bishop", "kate", "hawkeye kate bishop"], "ip": ["Zengin bir ailenin kızı.", "Küçükken New York saldırısında bir kahraman gördü.", "Okçuluk ve eskrimde çok iyi.", "Mor rengi sever.", "Clint Barton'ın öğrencisi oldu."]}, {"ad": "Doctor Doom", "alt": ["doctor doom", "dr doom", "doom", "victor von doom"], "ip": ["Küçük bir ülkenin hükümdarı.", "Hem bilim insanı hem büyücü.", "Yüzünü metal bir maskeyle gizler.", "Yeşil bir pelerin giyer.", "Fantastik Dörtlü'nün baş düşmanı."]}, {"ad": "Silver Surfer", "alt": ["silver surfer", "gumus surfcu", "norrin radd"], "ip": ["Gezegenini kurtarmak için kendini feda etti.", "Bütün vücudu parlak gümüş.", "Uzayda bir sörf tahtasıyla gezer.", "Galactus'un habercisi.", "Gerçek adı Norrin Radd."]}, {"ad": "Peggy Carter", "alt": ["peggy carter", "peggy", "agent carter"], "ip": ["İkinci Dünya Savaşı'nda bir ajan.", "Kırmızı şapkasıyla ünlü.", "S.H.I.E.L.D.'ın kurucularından.", "Steve Rogers ile bir dans sözü vardı.", "Endgame'in sonunda Steve ona döndü."]}];

/* ========================= YENİ SORULAR (zorluk seviyeli, tekrar azaltan) ========================= */
QS.forEach(q=>{ if(q[3]===undefined) q[3]=1; });
QS.push(...QS_NEW); HEROES.push(...HEROES_NEW);
(function(){ const st=document.createElement('style'); st.textContent=`
  .qdiff{display:inline-block;font-family:var(--display);font-size:16px;letter-spacing:.06em;padding:3px 10px;border:3px solid var(--inkc);margin-bottom:10px;transform:rotate(-2deg)}
  .qdiff.d1{background:var(--ok);color:var(--inkc)} .qdiff.d2{background:var(--gold);color:var(--inkc)} .qdiff.d3{background:var(--red);color:#fff}`; document.head.appendChild(st); })();
function seenList(k){ try{ return JSON.parse(localStorage.getItem(k)||'[]'); }catch(e){ return []; } }
function markSeen(k,ids,keep){ try{ const a=seenList(k).filter(x=>!ids.includes(x)).concat(ids).slice(-keep); localStorage.setItem(k,JSON.stringify(a)); }catch(e){} }
function freshFirst(list,key,seenKey){ const seen=seenList(seenKey); const a=shuffle(list.filter(x=>!seen.includes(key(x)))), b=shuffle(list.filter(x=>seen.includes(key(x))));
  b.sort((x,y)=>seen.indexOf(key(x))-seen.indexOf(key(y))); return a.concat(b); } // görülmeyenler önce, sonra en eski görülenler
function pickQuiz(mode){ mode=mode||'mix'; const pick=[];
  if(mode==='mix'){ [1,1,2,2,3,3].forEach(d=>{ const pool=freshFirst(QS.filter(q=>q[3]===d&&!pick.includes(q)),q=>q[0],'mt_seenq'); if(pool[0]) pick.push(pool[0]); }); }
  else{ const pool=freshFirst(QS.filter(q=>q[3]===+mode),q=>q[0],'mt_seenq'); pick.push(...pool.slice(0,8)); }
  markSeen('mt_seenq',pick.map(q=>q[0]),160); return pick; }
function pickHeroes(){ const r=freshFirst(HEROES,h=>h.ad,'mt_seenh').slice(0,3); markSeen('mt_seenh',r.map(h=>h.ad),36); return r; }

/* ========================= ADMIN YÖNETİMİ: sadece site sahibi admin ekler/çıkarır ========================= */
(function(){
  const isOwner=()=>(FB.user&&((FB.user.email||'').toLowerCase()===OWNER_EMAIL.toLowerCase()||FIXED_ADMIN_UIDS.includes(FB.user.uid)))||(AUTH.user&&AUTH.user.micup&&FIXED_ADMIN_UIDS.includes('micup_'+AUTH.user.id));
  async function renderAdmins(){ const box=$('#admList'); if(!box) return; box.innerHTML='Yükleniyor…';
    try{ const q=await FB.db.collection('admins').get();
      const rows=q.docs.map(d=>({id:d.id,...d.data()}));
      box.innerHTML=`<div style="display:grid;gap:8px;margin-top:10px"><b style="color:var(--fg)">Adminler</b>
        <div style="display:flex;align-items:center;gap:10px">👑 <span style="flex:1">${esc(OWNER_EMAIL)} <small>(site sahibi, çıkarılamaz)</small></span></div>${FIXED_ADMINS.map(e=>`<div style="display:flex;align-items:center;gap:10px">⭐ <span style="flex:1">${esc(e)} <small>(sabit admin, kodda tanımlı)</small></span></div>`).join('')}
        ${rows.map(r=>`<div style="display:flex;align-items:center;gap:10px">🛡️ <span style="flex:1">${esc(r.name||'')} <small>${esc(r.email||r.id)}</small></span><button class="ghost" data-unadm="${r.id}" type="button">Çıkar</button></div>`).join('')||'<span>Başka admin yok.</span>'}</div>`;
      $$('[data-unadm]',box).forEach(b=>b.onclick=async()=>{ if(!b.dataset.ok){ b.dataset.ok=1; b.textContent='Emin misin?'; setTimeout(()=>{ delete b.dataset.ok; b.textContent='Çıkar'; },2500); return; }
        await FB.db.collection('admins').doc(b.dataset.unadm).delete().then(()=>{ toast('Admin çıkarıldı','Artık admin değil.'); renderAdmins(); }).catch(e=>toast('Çıkarılamadı',String(e.code||e.message))); });
    }catch(e){ box.textContent='Admin listesi okunamadı: '+(e.code||e.message); } }
  const _oa=openAdmin;
  openAdmin=function(){ window.__fsBust&&window.__fsBust(); _oa(); if(!FB.admin) return;
    const tab=$('.tabs2 button[data-t="a"]'); 
    if(!isOwner()){ if(tab) tab.style.display='none'; return; } // formu silme: sekme değiştirme kodu onu arıyor
    renderAdmins();
    const f=$('#admA'); if(f){ const old=f.onsubmit; f.onsubmit=async e=>{ await old(e); setTimeout(renderAdmins,600); }; } };
})();


/* ========================= SEZONLAR (aylık) + SEZON KARTI (30 basamak) + PROFİL ÇERÇEVELERİ ========================= */
(function(){
  const st=document.createElement('style'); st.textContent=`
  @property --fa{syntax:'<angle>';inherits:false;initial-value:0deg}
  @keyframes frspin{to{--fa:360deg}}
  @keyframes frglow{50%{filter:brightness(1.5)}}
  .av.fr{overflow:visible}
  .av.fr::before{content:"";position:absolute;inset:-5px;padding:4px;z-index:3;pointer-events:none;background:var(--frbg);
    -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)}
  @keyframes frhue{to{filter:hue-rotate(360deg)}}
  .av.fr.anim::before{animation:frspin 3s linear infinite,frhue 7s linear infinite}
  .av.fr.glow{box-shadow:0 0 14px var(--frgl)}
  .av.fr::after{position:absolute;top:-14px;right:-12px;font-size:16px;z-index:4;line-height:1;filter:drop-shadow(0 2px 0 #000)}
  .fr-hulk{--frbg:linear-gradient(135deg,#9dff7a,#1d7a2b,#9dff7a)}
  .fr-cap{--frbg:linear-gradient(135deg,#1f4fd8 0 33%,#fff 33% 66%,#d4141f 66%)}
  .fr-spidey{--frbg:repeating-linear-gradient(45deg,#d4141f 0 6px,#1f4fd8 6px 12px)}
  .fr-iron{--frbg:linear-gradient(135deg,#ffd34d,#b5121b,#ffd34d,#b5121b);--frgl:#ff3b4e88}
  .fr-wakanda{--frbg:conic-gradient(from var(--fa),#7a3cff,#e2d6ff,#2a124f,#7a3cff);--frgl:#7a3cff99}
  .fr-thor{--frbg:conic-gradient(from var(--fa),#5ab4ff,#fff,#1b3d8f,#5ab4ff);--frgl:#5ab4ffaa}
  .fr-strange{--frbg:conic-gradient(from var(--fa),#ff9a1f,#ffe28a 20%,#7a3a00 40%,#ff9a1f 60%,#ffe28a 80%,#ff9a1f);--frgl:#ff9a1faa}
  .fr-infinity{--frbg:conic-gradient(from var(--fa),#9b5cff,#4a7bff,#ff3b4e,#ff9a1f,#3ddc97,#ffd34d,#9b5cff);--frgl:#ffffff88}
  .fr-champ1{--frbg:conic-gradient(from var(--fa),#ffe07a,#c98a12,#fff6c8,#c98a12,#ffe07a);--frgl:#ffd34daa}
  .fr-champ2{--frbg:conic-gradient(from var(--fa),#f4f7fb,#8a96a8,#ffffff,#8a96a8,#f4f7fb);--frgl:#dfe6efaa}
  .fr-champ3{--frbg:conic-gradient(from var(--fa),#e9a26a,#7a4a26,#ffd1a8,#7a4a26,#e9a26a);--frgl:#c98552aa}
  .fr-champ1::after{content:"👑"} .fr-champ2::after{content:"🥈"} .fr-champ3::after{content:"🥉"} .fr-infinity::after{content:"♾️"}
  .bpbar{height:16px;border:3px solid var(--inkc);border-radius:9px;background:var(--s2);overflow:hidden}
  .bpbar i{display:block;height:100%;width:var(--p);background:linear-gradient(90deg,var(--red),var(--gold));transition:width .6s}
  .bp{display:grid;gap:16px}
  .bp-top{display:flex;gap:14px;align-items:center}
  .bp-lv{width:74px;height:74px;flex:none;display:grid;place-items:center;align-content:center;background:var(--gold);color:var(--inkc);border:4px solid var(--inkc);box-shadow:4px 4px 0 var(--inkc);transform:rotate(-4deg);line-height:1}
  .bp-lv b{font-family:var(--display);font-size:38px} .bp-lv small{font-size:10px;font-weight:800}
  .bp-top .t{font-family:var(--display);font-size:24px;letter-spacing:.03em;display:block;margin-bottom:6px}
  .bp-track{display:flex;gap:10px;overflow-x:auto;padding:6px 4px 14px;scroll-snap-type:x proximity}
  .bt{flex:none;width:96px;scroll-snap-align:center;display:grid;justify-items:center;gap:6px;text-align:center;background:var(--s2);border:3px solid var(--inkc);border-radius:6px;padding:10px 6px;position:relative}
  .bt .n{font-family:var(--display);font-size:18px;color:var(--dim)}
  .bt .ic{font-size:30px;height:40px;display:grid;place-items:center}
  .bt small{font-size:11px;line-height:1.2;min-height:2.4em}
  .bt.lock{opacity:.45}
  .bt.ready{border-color:var(--gold);background:var(--s1);box-shadow:0 0 0 2px var(--gold)}
  .bt.ready .n{color:var(--gold)}
  .bt.got{opacity:.6} .bt.got::after{content:"✓";position:absolute;top:4px;right:8px;color:var(--ok);font-weight:900}
  .bt.big{width:120px;border-color:#9b5cff}
  .bt .av{width:40px;height:40px}
  .bt button{font-size:12px;padding:4px 10px}
  .frgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:14px}
  .frc{display:grid;justify-items:center;gap:8px;background:var(--s2);border:3px solid var(--inkc);border-radius:6px;padding:16px 8px 10px;cursor:pointer;color:var(--fg);font:inherit;text-align:center}
  .frc .av{width:56px!important;height:56px!important;font-size:24px!important}
  .frc small{font-size:11px;color:var(--dim);line-height:1.2}
  .frc.on{border-color:var(--gold);box-shadow:0 0 0 2px var(--gold)}
  .frc.lock{opacity:.4;cursor:default}
  .champs{display:grid;gap:8px}
  .champs div{display:flex;align-items:center;gap:10px}
  .champs b{flex:1}
  @media (max-width:600px){.brand .bt{display:none}.hright{gap:6px!important}.hbtn{width:34px!important;height:34px!important;font-size:16px!important}}
  @media (max-width:430px){#chipBtn .cn{display:none}}
`;
  document.head.appendChild(st);

  /* ---------- sezon bilgisi (İstanbul saatiyle her ayın 1'i başlar) ---------- */
  const AYLAR=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  /* Sezon = 4 hafta, her zaman Pazar 00:00 (İstanbul) başlar, 4. haftanın sonunda (Cumartesi gecesi) biter.
     Sezon 01: 1 Kasım 2026 – 28 Kasım 2026. Sezon 01'in kimliği eski verilerle uyum için '2026-11'. */
  const SZ_ANCHOR=Date.UTC(2026,9,31,21,0,0), SZ_LEN=28*864e5;
  function SEASON(off=0){ const no=Math.max(0,Math.floor((Date.now()-SZ_ANCHOR)/SZ_LEN)+1+off); // 0 = Sezon 01'den önce (veri yok)
    const start=new Date(SZ_ANCHOR+(no-1)*SZ_LEN), end=new Date(+start+SZ_LEN-1000), pad=String(no).padStart(2,'0');
    const f=d=>{ const x=new Date(+d+3*3600e3); return x.getUTCDate()+' '+AYLAR[x.getUTCMonth()]; };
    const week=Math.min(4,Math.floor((Date.now()-start)/(7*864e5))+1);
    return {id:no===1?'2026-11':'S'+pad,no,start,end,week,name:`${f(start)} – ${f(end)}`,label:'Sezon '+pad}; }
  window.SEASON=SEASON;
  const CUR=SEASON();
  // geri sayım artık ay sonuna
  seasonEnd=function(){ return SEASON().end; };
  // sayfadaki "Sezon 01" ve "Pazar 23:59" yazılarını güncelle
  (function relabel(){
    const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT); const list=[]; while(w.nextNode()) list.push(w.currentNode);
    list.forEach(n=>{ let t=n.nodeValue; if(/Sezon 01/.test(t)) t=t.replace(/Sezon 01/g,CUR.label);
      if(/Pazar 23:59/.test(t)&&!/hafta/i.test(t)) t=t.replace(/Pazar 23:59 · birinci "Haftanın Marvel'ı" rolünü alır/,'4 haftada bir · ilk 3 şampiyon çerçevesi kazanır').replace(/Pazar 23:59/g,'Sezon sonu');
      if(t!==n.nodeValue) n.nodeValue=t; });
    const b=$('.burst span'); if(b) b.innerHTML=`SEZON<br>${String(CUR.no).padStart(2,'0')}!`;
    const rc=$$('.rolecard p'); if(rc[0]) rc[0].textContent=`${CUR.label} (${CUR.name}) 4 hafta sürer, şu an ${CUR.week}. haftadayız. Son haftanın bittiği Cumartesi gecesi kapanır: birinci "Sezonun Marvel'ı" olur, ilk 3 şampiyon çerçevesini kazanır.`;
    if(rc[1]) rc[1].textContent='Yeni sezonda sıralama sıfırlanır ama seviyen, kartların, rozetlerin ve çerçevelerin seninle kalır.';
    const rh=$('.rolecard h3'); if(rh) rh.textContent='Sezon şampiyonu'; const rr=$('.rolecard .role'); if(rr) rr.textContent=CUR.label;
    const s3=$$('#steps .st')[2]; if(s3){ s3.querySelector('h4').textContent='Şampiyon ol'; s3.querySelector('p').textContent='Her hafta birinci olan Haftanın Marvel\'ı, her 4 haftada bir sezonun birincisi Sezonun Marvel\'ı olur. Sonra puanlar sıfırlanır, yarış yeniden başlar.'; }
  })();

  /* ---------- çerçeveler ---------- */
  const FRAMES={
    hulk:{n:'Gama Yeşili',from:'Sezon kartı · 5. basamak'},
    cap:{n:'Yıldızlı Kalkan',from:'Sezon kartı · 10. basamak'},
    iron:{n:'Mark 85',from:'Sezon kartı · 15. basamak',glow:1},
    spidey:{n:'Ağ Atıcı',from:'Sezon kartı · 18. basamak'},
    wakanda:{n:'Vibranyum',from:'Sezon kartı · 20. basamak',anim:1,glow:1},
    thor:{n:'Bifrost',from:'Sezon kartı · 23. basamak',anim:1,glow:1},
    strange:{n:'Mistik Halka',from:'Sezon kartı · 25. basamak',anim:1,glow:1},
    infinity:{n:'Sonsuzluk',from:'Sezon kartı · 30. basamak',anim:1,glow:1},
    wk:{n:'Haftanın Marvel\'ı',from:'Haftalık şampiyon',anim:1,glow:1},
    champ1:{n:'Sezon Şampiyonu',from:'Bir sezonu 1. bitir',anim:1,glow:1},
    champ2:{n:'Sezon İkincisi',from:'Bir sezonu 2. bitir',anim:1,glow:1},
    champ3:{n:'Sezon Üçüncüsü',from:'Bir sezonu 3. bitir',anim:1,glow:1},
  };
  window.FRAMES=FRAMES;
  const frCls=id=>{ const f=FRAMES[id]; return f?` fr fr-${id}${f.anim?' anim':''}${f.glow?' glow':''}`:''; };
  const myFrames=()=>prog().frames||[];
  function giveFrame(id){ const s=prog(); s.frames=s.frames||[]; if(s.frames.includes(id)) return false; s.frames.push(id); saveProg(s); syncFrames(); return true; }
  function equipFrame(id){ const s=prog(); s.frame=id||null; saveProg(s); syncFrames(); renderUser(); renderBoards(); }
  function syncFrames(){ if(FB.ready&&FB.user){ const s=prog(); FB.db.collection('users').doc(FB.user.uid).set({frames:s.frames||[],frame:s.frame||null},{merge:true}).catch(()=>{}); } }
  const _av=avatarHTML;
  avatarHTML=function(u,size){ let h=_av(u,size); const fr=u&&(u.frame!==undefined?u.frame:(u===AUTH.user?prog().frame:null)); if(fr&&FRAMES[fr]) h=h.replace('<span class="av"',`<span class="av${frCls(fr)}"`); return h; };

  function openFrames(){
    const own=myFrames(), cur=prog().frame||null, u=AUTH.user||{display:'?'};
    openModal('Çerçevelerim');
    swap(`<p class="dim" style="margin:0 0 14px">Çerçeve avatarının etrafında durur. Sıralamada ve profilinde herkes görür.</p>
      <div class="frgrid"><button class="frc${!cur?' on':''}" data-fr="" type="button">${_av({display:u.display,avatar:u.avatar},56)}<b>Çerçevesiz</b><small>&nbsp;</small></button>
      ${Object.entries(FRAMES).map(([id,f])=>{ const has=own.includes(id); return `<button class="frc${cur===id?' on':''}${has?'':' lock'}" data-fr="${id}" type="button" ${has?'':'aria-disabled="true"'}>${avatarHTML({display:u.display,avatar:u.avatar,frame:id},56)}<b>${esc(f.n)}</b><small>${has?(cur===id?'Takılı':'Tak'):'🔒 '+esc(f.from)}</small></button>`; }).join('')}</div>`);
    $$('[data-fr]',mBody).forEach(b=>b.onclick=()=>{ const id=b.dataset.fr; if(id&&!own.includes(id)){ SFX.sfx&&SFX.sfx('cardhit'); return; }
      equipFrame(id); SFX.play('confirm'); toast(id?'Çerçeve takıldı':'Çerçeve çıkarıldı',id?FRAMES[id].n:''); openFrames(); });
  }
  window.openFrames=openFrames;

  /* ---------- sezon kartı ---------- */
  const PER=400; // basamak başına sezon puanı
  const TIERS=[
    {k:'pts',v:150},{k:'card'},{k:'xp',v:150},{k:'pts',v:200},{k:'frame',v:'hulk'},
    {k:'card'},{k:'pts',v:250},{k:'xp',v:200},{k:'card',v:2},{k:'frame',v:'cap'},
    {k:'pts',v:300},{k:'card',r:'g'},{k:'xp',v:250},{k:'pts',v:300},{k:'frame',v:'iron'},
    {k:'card',v:2},{k:'pts',v:350},{k:'frame',v:'spidey'},{k:'card',r:'a'},{k:'frame',v:'wakanda'},
    {k:'pts',v:400},{k:'card',v:3},{k:'frame',v:'thor'},{k:'pts',v:500},{k:'frame',v:'strange'},
    {k:'card',r:'a'},{k:'pts',v:600},{k:'xp',v:500},{k:'card',r:'e'},{k:'frame',v:'infinity',bonus:1000},
  ];
  function tierInfo(t){ if(t.k==='pts') return ['🪙',`${t.v} coin`]; // ödül coin olarak verilir (claimTier) if(t.k==='xp') return ['⭐',`${t.v} XP`];
    if(t.k==='frame') return [null,`${FRAMES[t.v].n} çerçevesi${t.bonus?` + ${t.bonus} coin`:''}`];
    const n=t.v||1, r={g:'Nadir+',a:'Epik+',e:'Efsanevi'}[t.r]; return ['🃏',`${n>1?n+' ':''}${r?r+' ':''}kart`]; }
  function BP(){ const s=prog(); if(!s.bp||s.bp.season!==CUR.id) s.bp={season:CUR.id,xp:0,claimed:[]}; return s; }
  const bpLevel=xp=>Math.min(TIERS.length,Math.floor(xp/PER));
  function bpAdd(n,why){ const s=BP(); const before=bpLevel(s.bp.xp); s.bp.xp+=Math.round(n); saveProg(s); const after=bpLevel(s.bp.xp);
    if(after>before){ SFX.sfx?SFX.sfx('reveal'):SFX.play('win'); toast('Sezon kartı',`${after}. basamağa ulaştın! Ödülünü almayı unutma.`); }
    if(FB.ready&&FB.user) FB.db.collection('users').doc(FB.user.uid).set({bp:{season:CUR.id,xp:s.bp.xp,claimed:s.bp.claimed}},{merge:true}).catch(()=>{});
    renderBP(); }
  const canClaim=()=>{ const s=BP(), lv=bpLevel(s.bp.xp); return TIERS.some((t,i)=>i<lv&&!s.bp.claimed.includes(i)); };
  function claimTier(i,quiet){ const s=BP(); if(i>=bpLevel(s.bp.xp)||s.bp.claimed.includes(i)) return null; const t=TIERS[i];
    s.bp.claimed.push(i); saveProg(s); let cards=[];
    if(t.k==='pts') setCoins((coins()||0)+t.v);
    else if(t.k==='xp') addXP(t.v);
    else if(t.k==='frame'){ giveFrame(t.v); if(t.bonus) setCoins((coins()||0)+t.bonus); }
    else { for(let k=0;k<(t.v||1);k++) cards.push(pickHero(t.r||'b')); }
    if(FB.ready&&FB.user) FB.db.collection('users').doc(FB.user.uid).set({bp:{season:CUR.id,xp:s.bp.xp,claimed:s.bp.claimed}},{merge:true}).catch(()=>{});
    if(!quiet){ SFX.play('correct'); burst&&burst(t.k==='frame'); toast(`${i+1}. basamak ödülü`,tierInfo(t)[1]+(t.k==='frame'?' · Çerçevelerim\'den takabilirsin':'')); }
    return cards; }
  function openBP(scrollTo){
    const s=BP(), lv=bpLevel(s.bp.xp), inLv=lv>=TIERS.length?PER:s.bp.xp-lv*PER, days=Math.max(0,Math.ceil((CUR.end-Date.now())/864e5));
    const u=AUTH.user||{display:'Sen'}, ready=canClaim(), nReady=TIERS.filter((t,i)=>i<lv&&!s.bp.claimed.includes(i)).length;
    openModal('Sezon yolu');
    const node=(t,i)=>{ const [ic,txt]=tierInfo(t), got=s.bp.claimed.includes(i), rd=!got&&i<lv, big=t.k==='frame'||i===29||t.r==='e'||t.r==='a', side=i%2?'r':'l';
      const icon=ic?`<span class="cr-ic">${ic}</span>`:avatarHTML({display:u.display||'?',avatar:u.avatar,frame:t.v},54);
      return `<div class="cr-row ${side}${got?' got':rd?' rd':i>=lv?' lk':''}${big?' big':''}" data-ti="${i}">
        <div class="cr-card">${icon}<b>${esc(txt)}</b>${rd?`<button class="cr-take" data-claimt="${i}" type="button">AL</button>`:got?'<span class="cr-st">✓ Alındı</span>':`<span class="cr-st">${(i+1)*PER} puan</span>`}</div>
        <div class="cr-node"><span>${i+1}</span></div></div>`; };
    const pct=Math.min(100,(lv+(lv>=TIERS.length?0:inLv/PER))/TIERS.length*100);
    swap(`<div class="cr">
      <div class="cr-hd"><div class="cr-badge"><small>${CUR.label}</small><b>${lv}</b><small>/ ${TIERS.length}</small></div>
        <div class="cr-hi"><b>${esc(CUR.name)}</b><div class="cr-bar"><i style="width:${Math.round(inLv/PER*100)}%"></i><span>${lv>=TIERS.length?'TAMAMLANDI':inLv+' / '+PER}</span></div>
          <small>${lv>=TIERS.length?'Bütün ödülleri açtın!':'Sonraki ödüle '+(PER-inLv)+' puan'} · ⏳ ${days} gün kaldı</small></div></div>
      ${ready?`<button class="btn p cr-all" id="bpAll" type="button"><span class="bl"><span>🎁 ${nReady} ödülü al</span><span>🎁 ${nReady} ödülü al</span></span></button>`:''}
      <div class="cr-road" id="bpTrack"><div class="cr-line"><i style="height:${pct}%"></i></div>
        <div class="cr-start">🚩 BAŞLANGIÇ</div>
        ${TIERS.map(node).join('')}
        <div class="cr-end">♾️ SEZON SONU</div>
        <div class="cr-me" style="top:calc(60px + ${pct/100} * (100% - 120px))">${avatarHTML({display:u.display||'?',avatar:u.avatar,frame:prog().frame||null},40)}<span>SEN</span></div></div>
      <div class="rowb" style="justify-content:center"><button class="ghost" id="bpFr" type="button">🖼️ Çerçevelerim</button></div>
      <p class="dim" style="margin:0;font-size:13px;text-align:center">Puan nasıl dolar: her oyun <b>+60–150</b>, her günlük görev <b>+100</b>, şans çarkı <b>+50</b>. Yol her sezon (4 hafta) sıfırlanır, aldığın ödüller sende kalır.</p></div>`);
    const tr=$('#bpTrack'), target=tr.querySelector(`[data-ti="${scrollTo!=null?scrollTo:Math.max(0,Math.min(lv,29))}"]`);
    if(target) setTimeout(()=>{ try{ target.scrollIntoView({block:'center',behavior:'smooth'}); }catch(e){} },350);
    if(G) G.from('.cr-row.rd .cr-card',{scale:.8,opacity:0,stagger:.05,duration:.5,ease:'back.out(2)'});
    $$('[data-claimt]',tr).forEach(b=>b.onclick=()=>{ const i=+b.dataset.claimt; const row=b.closest('.cr-row'); row&&row.classList.add('pop'); setTimeout(()=>{ const cards=claimTier(i); renderBP(); if(cards&&cards.length) packOpen(cards); else openBP(i); },350); });
    const all=$('#bpAll'); all&&(all.onclick=()=>{ let cards=[], n=0; TIERS.forEach((t,i)=>{ const c=claimTier(i,true); if(c){ n++; cards=cards.concat(c); } });
      SFX.play('correct'); burst&&burst(true); toast('Ödüller alındı',`${n} ödül hesabına eklendi.`); renderBP(); if(cards.length) packOpen(cards); else openBP(); });
    $('#bpFr').onclick=()=>openFrames();
  }
  window.openBP=openBP;

  /* sezon puanı kazanma */
  let inReward=false;
  const _sub=submitScore;
  submitScore=function(game,score){ _sub(game,score);
    if(game!=='daily') bpAdd(60+Math.min(90,Math.max(0,score)/15));
    if(FB.ready&&FB.user&&score>0) renderBoards(); };
  const _od=openDaily;
  openDaily=function(){ const before=prog().lastDaily; _od(); const b=$('#spin'); if(!b) return; const oc=b.onclick; b.onclick=e=>{ oc&&oc(e); if(prog().lastDaily!==before) bpAdd(50); }; };
  // görev ödülü alınınca (+100): görev butonlarına tıklamayı yakala
  document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-claim]'); if(b) setTimeout(()=>bpAdd(100),50); },true);

  /* ---------- sezon geçişi: eski sezon puanını sakla, yenisini sıfırla ---------- */
  let seasonP=null, seasonUid=null;
  function ensureSeason(){ if(!(FB.ready&&FB.user)) return Promise.resolve(); if(seasonP&&seasonUid===FB.user.uid) return seasonP; seasonUid=FB.user.uid;
    const ref=FB.db.collection('users').doc(FB.user.uid);
    seasonP=ref.get().then(sn=>{ const d=sn.exists?sn.data():{}; if(d.season===CUR.id||(d.season&&d.season>CUR.id)) return d;
      const up={season:CUR.id,sp:0}; if(d.season) up.lastSeason={id:d.season,sp:d.sp||0};
      return ref.set(up,{merge:true}).then(()=>d); }).catch(()=>({})); return seasonP; }

  /* sıralama artık bu sezonun puanına göre */
  getBoard=async function(){
    if(!FB.ready) return _boardLocalS();
    try{ const q=await FB.db.collection('users').orderBy('sp','desc').limit(window.__lbN||20).get(); const me=FB.user&&FB.user.uid;
      return q.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.season===CUR.id)
        .map(x=>({username:x.name,display:x.name,avatar:x.avatar,frame:x.frame||null,nc:x.nameColor||null,uid:x.id,points:x.sp||0,me:x.id===me,lvl:lvlOf(x.xp||0),seen:x.seen||null,doing:x.doing||null,hide:!!x.hideOnline})); }
    catch(e){ return _boardLocalS(); } };
  async function _boardLocalS(){ let b={}; try{b=JSON.parse(localStorage.getItem('mt_board')||'{}');}catch(e){}
    const me=AUTH.user&&(AUTH.user.display||AUTH.user.username);
    return Object.values(b).map(r=>({username:r.name,display:r.name,avatar:r.avatar,points:r.points||0,me:r.name===me})).sort((a,b)=>b.points-a.points); }

  /* ---------- sezon kapanışı: ilk giren admin geçen sezonu kapatır, ilk 3 kaydedilir ---------- */
  async function closePrevSeason(){
    if(!(FB.ready&&FB.admin)) return; const prev=SEASON(-1), ref=FB.db.collection('seasons').doc(prev.id);
    try{ const ex=await ref.get(); if(ex.exists) return;
      const q=await FB.db.collection('users').limit(500).get(); const rows=[];
      q.docs.forEach(d=>{ const x=d.data(); let sp=0; if(x.season===prev.id) sp=x.sp||0; else if(x.lastSeason&&x.lastSeason.id===prev.id) sp=x.lastSeason.sp||0;
        if(sp>0) rows.push({uid:d.id,name:x.name||'Oyuncu',avatar:x.avatar||null,sp}); });
      rows.sort((a,b)=>b.sp-a.sp); const top=rows.slice(0,3);
      await ref.set({top,label:prev.label,name:prev.name,closedAt:firebase.firestore.FieldValue.serverTimestamp(),by:FB.user.uid});
      if(top.length) await FB.db.collection('announcements').add({title:`🏆 ${prev.label} şampiyonları`,pinned:false,
        text:top.map((t,i)=>`${['🥇','🥈','🥉'][i]} ${t.name} — ${t.sp.toLocaleString('tr-TR')} puan`).join('\n')+`\n\n${CUR.label} başladı, sıralama sıfırlandı. Bol şans!`,
        by:FB.user.uid,byName:'Marvel Türkiye',created:firebase.firestore.FieldValue.serverTimestamp()});
    }catch(e){ console.warn('Sezon kapatılamadı',e); } }
  /* oyuncu: şampiyonsa çerçevesini al */
  let lastChamps=null;
  async function checkChamp(){ if(!(FB.ready&&FB.user)) return; const prev=SEASON(-1);
    try{ const d=await FB.db.collection('seasons').doc(prev.id).get(); if(!d.exists) return; lastChamps=d.data(); renderBP();
      const i=(lastChamps.top||[]).findIndex(t=>t.uid===FB.user.uid); if(i<0) return;
      const s=prog(); s.champ=s.champ||{}; if(s.champ[prev.id]) return; s.champ[prev.id]=i+1; saveProg(s);
      if(giveFrame('champ'+(i+1))){ const s3=prog(); s3.coins=(s3.coins||0)+[500,300,150][i]; saveProg(s3); setTimeout(()=>{ SFX.play('win'); burst&&burst(true); toast(`${prev.label} ${i+1}.si oldun!`,`+${[500,300,150][i]} coin ve ${FRAMES['champ'+(i+1)].n} çerçevesi senin. Çerçevelerim'den tak!`); },1500); } }catch(e){} }

  /* ---------- arayüz: üst buton + sıralama paneli + hesap butonu ---------- */
  const qb=$('#questBtn')||$('#dailyBtn'); if(qb){ const b=document.createElement('button'); b.className='hbtn'; b.id='bpBtn'; b.type='button'; b.setAttribute('aria-label','Sezon kartı'); b.textContent='🎟️';
    b.onclick=()=>{ SFX.play('click'); openBP(); }; qb.after(b); }
  const ex=$('#v-siralama .extras'); if(ex){ const p=document.createElement('div'); p.className='xpanel'; p.id='bpPanel'; ex.insertBefore(p,ex.firstChild);
    const hp=document.createElement('div'); hp.className='xpanel'; hp.id='seasonHistPanel'; hp.innerHTML='<span class="cap">Arşiv</span><h3 style="margin:0 0 10px">Geçmiş sezonlar</h3><div id="seasonHist"></div>'; ex.appendChild(hp); }
  function renderBP(){
    const p=$('#bpPanel'), s=BP(), lv=bpLevel(s.bp.xp), inLv=lv>=TIERS.length?PER:s.bp.xp-lv*PER, ready=canClaim();
    const bb=$('#bpBtn'); if(bb) bb.classList.toggle('ready',ready);
    if(!p) return; const nxt=TIERS[Math.min(lv,29)], [ic,txt]=tierInfo(nxt);
    p.innerHTML=`<span class="cap" style="align-self:flex-start">${CUR.label}</span><h3>Sezon kartı</h3>
      <div class="bp-top"><div class="bp-lv"><b>${lv}</b><small>/ 30</small></div><div style="flex:1;min-width:0">
        <div class="bpbar"><i style="--p:${Math.round(inLv/PER*100)}%"></i></div>
        <span class="mono dim">${lv>=30?'Tamamlandı!':`Sıradaki: ${ic||'🖼️'} ${esc(txt)} · ${PER-inLv} puan kaldı`}</span></div></div>
      <div class="rowb"><button class="btn p" id="bpOpen" type="button"><span class="bl"><span>${ready?'Ödülleri al':'Sezon kartını aç'}</span><span>${ready?'Ödülleri al':'Sezon kartını aç'}</span></span></button><button class="ghost" id="bpFr2" type="button">🖼️ Çerçeveler</button></div>
      ${lastChamps&&lastChamps.top&&lastChamps.top.length?`<div class="champs"><span class="mono dim">${esc(lastChamps.label||'Geçen sezon')} şampiyonları</span>${lastChamps.top.map((t,i)=>`<div>${['🥇','🥈','🥉'][i]} ${avatarHTML({display:t.name,avatar:t.avatar,frame:'champ'+(i+1)},28)}<b>${esc(t.name)}</b><span class="mono">${(t.sp||0).toLocaleString('tr-TR')}</span></div>`).join('')}</div>`:''}`;
    $('#bpOpen').onclick=()=>{ SFX.play('click'); openBP(); }; $('#bpFr2').onclick=()=>{ SFX.play('click'); openFrames(); };
  }
  const _oa=openAccount;
  openAccount=function(){ _oa(); const pe=$('#peOpen'); if(!pe||$('#frOpen')) return; const b=document.createElement('button'); b.id='frOpen'; b.type='button'; b.className='ghost'; b.textContent='🖼️ Çerçeve'; b.style.whiteSpace='nowrap';
    b.onclick=()=>{ SFX.play('click'); openFrames(); }; pe.after(b); };

  /* girişte buluttan birleştir */
  (function w(){ if(FB.ready&&FB.auth){ FB.auth.onAuthStateChanged(async u=>{ if(!u) return; seasonP=null;
      try{ const d=await ensureSeason(); const s=BP();
        s.frames=[...new Set([...(s.frames||[]),...(d.frames||[])])]; if(!s.frame&&d.frame) s.frame=d.frame;
        if(d.bp&&d.bp.season===CUR.id){ s.bp.xp=Math.max(s.bp.xp,d.bp.xp||0); s.bp.claimed=[...new Set([...s.bp.claimed,...(d.bp.claimed||[])])]; }
        saveProg(s); syncFrames(); renderUser(); renderBoards(); renderBP();
      }catch(e){}
      setTimeout(()=>{ closePrevSeason().then(checkChamp); },2500); }); } else setTimeout(w,800); })();


  /* sıralama sayfası düzeni: sezon kartı + görevler, çekiliş + günlük ödül, başarımlar tam genişlik */
  (function(){ const ex=$('#v-siralama .extras'); if(!ex) return; ex.style.gridTemplateColumns='repeat(auto-fit,minmax(min(100%,420px),1fr))';
    const pick=sel=>{ const el=$(sel); return el&&el.closest('.xpanel'); };
    const order=[$('#bpPanel'),pick('#questBox'),pick('#raffles'),pick('#lvlBig'),pick('#achGrid')].filter(Boolean);
    order.forEach(el=>ex.appendChild(el)); const ach=pick('#achGrid'); if(ach) ach.style.gridColumn='1 / -1'; })();
  window.renderSeasonHist=async function(){ const box=$('#seasonHist'); if(!box||!FB.ready) return;
    try{ const q=await FB.db.collection('seasons').orderBy('closedAt','desc').limit(12).get();
      box.innerHTML=q.empty?'<p class="dim" style="margin:0;font-size:13px">Henüz kapanan sezon yok.</p>':q.docs.map(d=>{ const x=d.data(),t=x.top||[];
        return '<div class="shist" style="margin-bottom:12px"><span class="mono dim" style="font-size:11px">'+esc(x.label||x.name||d.id)+'</span>'+(t.length?t.map((pp,i)=>'<div class="mrow"><span class="rk">'+(i+1)+'</span><span class="nm">'+avatarHTML({display:pp.name,avatar:pp.avatar},24)+'<span>'+esc(pp.name)+'</span></span><span class="pt">'+(pp.sp||0).toLocaleString('tr-TR')+'</span></div>').join(''):'<p class="dim" style="margin:2px 0 0 30px;font-size:12px">Kayıt yok</p>')+'</div>'; }).join('');
    }catch(e){ box.innerHTML=''; } };
  const _rb=renderBoards; renderBoards=async function(){ await _rb(); renderSeasonHist&&renderSeasonHist(); const s=$('#lbSub'); if(s&&FB.ready) s.textContent=`${CUR.label} (${CUR.name}) sıralaması. ${CUR.name.split(' – ')[1]} gecesi biter, Pazar 00:00\'da ilk 3 şampiyon çerçevesi kazanır ve herkes sıfırdan başlar.`; };
  renderBP(); renderBoards();
})();


/* ========================= HAFTANIN MARVEL'I + RAVONİA GAME + DAVET ÖDÜLÜ ========================= */
(function(){
  const ITCH='https://ravoniagame.itch.io/', YT='https://www.youtube.com/@Ravoniavgame';
  const st=document.createElement('style'); st.textContent=`
  .rvlink{cursor:pointer;text-decoration:underline;text-decoration-color:var(--red);text-underline-offset:2px}
  .rvlink:hover{color:var(--gold)!important}
  .rvband .rvbox{display:grid;grid-template-columns:auto 1fr;gap:28px;align-items:center;background:#000;border:5px solid var(--inkc);box-shadow:9px 9px 0 var(--inkc);border-radius:6px;padding:28px;position:relative;overflow:hidden}
  .rvband .rvbox::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 15% 50%,rgba(229,38,46,.35),transparent 55%);pointer-events:none}
  .rvband .rvlogo{width:150px;max-width:30vw;position:relative}
  .rvband .rvlogo img{width:100%;display:block}
  .brand small{white-space:nowrap}
  .rvband .rvlogo b{font-family:var(--display);font-size:32px;color:#fff;line-height:.9;display:block}
  .rvband h3{margin:0 0 8px;font-size:clamp(28px,4vw,40px)}
  .rvband p{margin:0 0 16px;color:#ccc;max-width:56ch}
  .rvband .rowb{position:relative}
  @media (max-width:640px){.rvband .rvbox{grid-template-columns:1fr;text-align:center}.rvband .rvlogo{margin:0 auto}.rvband .rowb{justify-content:center}}
  .lbtabs{display:flex;gap:8px;margin-bottom:12px}
  .lbtabs button{font-family:var(--display);font-size:18px;letter-spacing:.04em;padding:8px 16px;border:3px solid var(--inkc);background:var(--s2);color:var(--fg);cursor:pointer;border-radius:4px}
  .lbtabs button.on{background:var(--gold);color:var(--inkc)}
  .wkwin{display:flex;align-items:center;gap:12px;background:rgba(0,0,0,.12);border:3px solid var(--inkc);border-radius:6px;padding:10px 12px}
  .wkwin b{font-family:var(--display);font-size:22px;display:block}
  .inv{display:grid;gap:14px}
  .inv .lnk{display:flex;gap:8px}
  .inv .lnk input{flex:1;min-width:0;font-size:14px}
  .inv ul{margin:0;padding-left:20px;display:grid;gap:6px}
  .inv .cnt{font-family:var(--display);font-size:44px;color:var(--gold);line-height:1}`;
  document.head.appendChild(st);

  /* ---------- hafta (Pazartesi 00:00 – Pazar 23:59, İstanbul) ---------- */
  function WEEK(off=0){ const t=new Date(Date.now()+3*3600e3); const dow=t.getUTCDay(); // 0=Pazar
    const sun=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate()-dow+off*7));
    const id=sun.toISOString().slice(0,10); const end=new Date(+sun+7*864e5-3*3600e3-1000); return {id,end}; }
  window.weekEnd=()=>WEEK().end;
  const WK=WEEK();

  /* ana sayfa sayaç kutusu artık haftalık */
  (function(){ const cd=$('.cp-cd'); if(cd){ const cap=cd.querySelector('.cap'); if(cap) cap.textContent='Hafta bitiyor!'; const m=cd.querySelector('.mono'); if(m) m.textContent='Pazar 00:00\'da sıralama kapanır, kazanan belli olur, yeni hafta başlar'; }
    const s3=$$('#steps .st')[2]; if(s3){ s3.querySelector('h4').textContent='Haftanın Marvel\'ı ol'; s3.querySelector('p').textContent='Her Pazar 00:00\'da haftanın birincisi "Haftanın Marvel\'ı" olur. Yeni hafta Pazar başlar, puanlar sıfırlanır. Ay sonunda sezonun ilk 3\'ü şampiyon çerçevesi kazanır.'; }
    $$('.marq span').forEach(s=>{ if(/Avenger/.test(s.textContent)) s.textContent='Haftanın Marvel\'ı'; }); })();

  /* ---------- haftalık puan ---------- */
  let wkP=null, wkUid=null;
  function ensureWeek(){ if(!(FB.ready&&FB.user)) return Promise.resolve({}); if(wkP&&wkUid===FB.user.uid) return wkP; wkUid=FB.user.uid;
    const ref=FB.db.collection('users').doc(FB.user.uid);
    wkP=ref.get().then(sn=>{ const d=sn.exists?sn.data():{}; if(d.wk===WK.id||(d.wk&&d.wk>WK.id)) return d; const up={wk:WK.id,wp:0}; if(d.wk) up.lastWeek={id:d.wk,wp:d.wp||0};
      return ref.set(up,{merge:true}).then(()=>d); }).catch(()=>({})); return wkP; }
  /* wp yazimi mtScoreSync icinde (negatifler dahil) - burada tekrar yazma */

  /* ---------- sıralama: Sezon / Bu hafta sekmesi ---------- */
  let lbMode='season', wkWinner=null;
  const lb=$('#lb'); if(lb){ const t=document.createElement('div'); t.className='lbtabs'; t.innerHTML='<button class="on" data-m="season" type="button">Sezon</button><button data-m="week" type="button">Bu hafta</button>'; (lb.closest('.lbgrid')||lb).before(t);
    $$('button',t).forEach(b=>b.onclick=()=>{ lbMode=b.dataset.m; $$('button',t).forEach(x=>x.classList.toggle('on',x===b)); SFX.play('click'); renderBoards(); }); }
  const _gb=getBoard;
  getBoard=async function(){ if(lbMode!=='week'||!FB.ready) return _gb();
    try{ const q=await FB.db.collection('users').orderBy('wp','desc').limit(window.__lbN||20).get(); const me=FB.user&&FB.user.uid;
      return q.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.wk===WK.id).map(x=>({username:x.name,display:x.name,avatar:x.avatar,frame:x.frame||null,nc:x.nameColor||null,uid:x.id,points:x.wp||0,me:x.id===me,seen:x.seen||null,doing:x.doing||null,hide:!!x.hideOnline})); }
    catch(e){ return _gb(); } };
  window.wkTag=(r,i)=>{ if(wkWinner&&r.display===wkWinner.name) return '<span class="role">⭐ Haftanın Marvel\'ı</span>'; return i===0?`<span class="role">${lbMode==='week'?'Lider':'Lider'}</span>`:''; };
  const _rb=renderBoards; renderBoards=async function(){ await _rb(); const s=$('#lbSub'); if(s&&FB.ready&&lbMode==='week') s.textContent='Bu haftanın sıralaması. Pazar 00:00\'da kapanır, birinci "Haftanın Marvel\'ı" olur. Yeni hafta Pazar başlar, puanlar sıfırlanır.'; };

  /* rol kartı: Haftanın Marvel'ı */
  function renderRole(){ const rc=$('.rolecard'); if(!rc) return; const h=rc.querySelector('h3'), ps=rc.querySelectorAll('p'), rr=rc.querySelector('.role');
    if(rr) rr.textContent='Her hafta'; if(h) h.textContent='Haftanın Marvel\'ı';
    if(ps[0]) ps[0].innerHTML='Her Pazar 00:00\'da haftanın en çok puan toplayan oyuncusu <b>Haftanın Marvel\'ı</b> olur. Sitedeki herkese duyurulur, adı bir hafta boyunca ⭐ ile parlar, kazanana 250 coin, şampiyon çerçevesi ve bir epik kart verilir.';
    let w=rc.querySelector('.wkwin'); if(!w){ w=document.createElement('div'); w.className='wkwin'; ps[1]?ps[1].replaceWith(w):rc.appendChild(w); }
    w.innerHTML=wkWinner?`${avatarHTML({display:wkWinner.name,avatar:wkWinner.avatar,frame:wkWinner.frame||null},44)}<div><span class="mono">Geçen haftanın Marvel'ı</span><b>${esc(wkWinner.name)}</b><span class="mono">${(wkWinner.wp||0).toLocaleString('tr-TR')} puan</span></div>`
      :'<div><span class="mono">Geçen hafta</span><b>Henüz kazanan yok</b><span class="mono">Bu hafta ilk sen ol!</span></div>'; }
  renderRole();

  /* hafta kapanışı (ilk giren admin) + kazanan ödülünü alır */
  async function weekly(){
    if(!(FB.ready&&FB.user)) return; const prev=WEEK(-1), ref=FB.db.collection('weeks').doc(prev.id);
    try{ let d=await ref.get();
      if(!d.exists&&FB.admin){ const q=await FB.db.collection('users').limit(500).get(); let best=null;
        q.docs.forEach(x=>{ const v=x.data(); let wp=0; if(v.wk===prev.id) wp=v.wp||0; else if(v.lastWeek&&v.lastWeek.id===prev.id) wp=v.lastWeek.wp||0;
          if(wp>0&&(!best||wp>best.wp)) best={uid:x.id,name:v.name||'Oyuncu',avatar:v.avatar||null,frame:v.frame||null,wp}; });
        await ref.set({winner:best,closedAt:firebase.firestore.FieldValue.serverTimestamp(),by:FB.user.uid});
        if(best) await FB.db.collection('announcements').add({title:`⭐ Haftanın Marvel'ı: ${best.name}`,pinned:false,text:`Geçen haftayı ${best.wp.toLocaleString('tr-TR')} puanla birinci bitirdi. Tebrikler!\nYeni hafta başladı, bu hafta sıra sende.`,by:FB.user.uid,byName:'Marvel Türkiye',created:firebase.firestore.FieldValue.serverTimestamp()});
        d=await ref.get(); }
      if(!d.exists) return; wkWinner=d.data().winner||null; renderRole(); renderBoards();
      if(wkWinner&&wkWinner.uid===FB.user.uid){ const s=prog(); s.wkWon=s.wkWon||{}; if(!s.wkWon[prev.id]){ s.wkWon[prev.id]=1; saveProg(s);
        setTimeout(()=>{ const s2=prog(); s2.coins=(s2.coins||0)+250; giveFrame('wk'); saveProg(s2); const c=[pickHero('a')]; SFX.play('win'); burst&&burst(true); toast('Haftanın Marvel\'ı sensin!','250 coin, şampiyon çerçevesi ve epik kart kazandın.'); openModal('Haftanın Marvel\'ı'); packOpen(c); },2000); } }
    }catch(e){ console.warn('Hafta kapatılamadı',e); } }

  /* ---------- RAVONİA GAME ---------- */
  const sm=$('.brand small'); if(sm){ sm.innerHTML=`<span class="rvlink" title="RAVONİA GAME oyunları">RAVONİA GAME</span> · ${SEASON().label}`;
    sm.querySelector('.rvlink').addEventListener('click',e=>{ e.preventDefault(); e.stopPropagation(); window.open(ITCH,'_blank','noopener'); }); }
  const logoSrc=(document.querySelector('#rvEm img')||{}).src||'', wordSrc=(document.querySelector('#rvWd img')||{}).src||'';
  const band=document.createElement('section'); band.className='band rvband'; band.id='ravonia';
  band.innerHTML=`<div class="wrap"><div class="rvbox"><div class="rvlogo">${logoSrc?`<img src="${logoSrc}" alt="RAVONİA GAME">`:''}${wordSrc?`<img src="${wordSrc}" alt="" style="margin-top:10px">`:'<b>RAVONİA<br>GAME</b>'}</div>
    <div><span class="cap" style="background:var(--red);color:#fff!important">Bu siteyi yapan stüdyo</span><h3 style="margin-top:14px">RAVONİA GAME'in diğer oyunları</h3>
      <p>Marvel Türkiye'yi RAVONİA GAME yaptı. Korku, gizlilik, parti ve futbol oyunlarımızın hepsi itch.io'da, tarayıcıdan ücretsiz oynanıyor.</p>
      <div class="rowb"><a class="btn p" href="${ITCH}" target="_blank" rel="noopener"><span class="bl"><span>Oyunlara göz at</span><span>Oyunlara göz at</span></span></a>
        <a class="ghost" href="${YT}" target="_blank" rel="noopener">▶ YouTube</a></div></div></div></div>`;
  const ana=$('#v-ana'); ana&&ana.appendChild(band);
  const fg=$('footer .fgrid'); if(fg){ const c=document.createElement('div'); c.innerHTML=`<h5>RAVONİA GAME</h5><ul><li><a href="${ITCH}" target="_blank" rel="noopener">Diğer oyunlarımız</a></li><li><a href="${YT}" target="_blank" rel="noopener">YouTube</a></li></ul>`; fg.appendChild(c); }
  const lg=$('footer .legal span'); if(lg) lg.insertAdjacentHTML('afterbegin','Yapan: <a href="'+ITCH+'" target="_blank" rel="noopener" style="color:var(--gold)">RAVONİA GAME</a> · ');

  /* kart sayısı yazıları */
  const N=HEROES_CG.length;
  (function(){ const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT); const l=[]; while(w.nextNode()) l.push(w.currentNode);
    l.forEach(n=>{ if(/\b37 kahraman/.test(n.nodeValue)) n.nodeValue=n.nodeValue.replace(/\b37 kahraman/g,N+' kahraman'); });
    $$('#hud b').forEach(b=>{ if(/^37/.test(b.textContent)) b.firstChild.nodeValue=String(N); }); })();

  /* ---------- DAVET ÖDÜLÜ ---------- */
  const REW=500;
  try{ const r=new URLSearchParams(location.search).get('ref'); if(r&&/^[A-Za-z0-9]{10,40}$/.test(r)){ localStorage.setItem('mt_ref',r);
      history.replaceState(null,'',location.pathname+location.hash);
      setTimeout(()=>!FB.user&&toast('Bir arkadaşın seni davet etti!',`Micup ile giriş yap, ikiniz de +${REW} puan ve birer kart kazanın.`),5500); } }catch(e){}
  const invLink=()=>FB.user?location.origin+location.pathname+'?ref='+FB.user.uid:'';
  async function useRef(tries=0){ let ref=null; try{ ref=localStorage.getItem('mt_ref'); }catch(e){} if(!ref||!(FB.ready&&FB.user)) return;
    if(ref===FB.user.uid){ try{localStorage.removeItem('mt_ref');}catch(e){} return; }
    const me=FB.db.collection('invites').doc(FB.user.uid);
    try{ const ex=await me.get(); if(ex.exists){ try{localStorage.removeItem('mt_ref');}catch(e){} return; }
      await me.set({by:ref,name:AUTH.user?(AUTH.user.display||AUTH.user.username):'Oyuncu',at:firebase.firestore.FieldValue.serverTimestamp(),claimed:false});
      try{localStorage.removeItem('mt_ref');}catch(e){}
      submitScore('daily',REW); SFX.play('win'); burst&&burst(true); toast('Davet ödülü!',`+${REW} puan ve bir kart kazandın. Arkadaşın da ödülünü alacak.`);
      setTimeout(()=>{ openModal('Hoş geldin!'); packOpen([pickHero('g')]); },1200);
    }catch(e){ if(tries<2) setTimeout(()=>useRef(tries+1),4000); else { // eski hesaplar davet ödülü alamaz
        try{localStorage.removeItem('mt_ref');}catch(_){} } } }
  let invCount=0;
  async function claimInvites(){ if(!(FB.ready&&FB.user)) return;
    try{ const q=await FB.db.collection('invites').where('by','==',FB.user.uid).get(); invCount=q.size;
      const open=q.docs.filter(d=>!d.data().claimed);
      for(const d of open){ await d.ref.set({claimed:true},{merge:true}); submitScore('daily',REW); const c=[pickHero('g')];
        toast('Arkadaşın geldi!',`${d.data().name||'Bir arkadaşın'} davetinle katıldı: +${REW} puan ve bir kart!`); SFX.play('win'); openModal('Davet ödülü'); packOpen(c);
        await new Promise(r=>setTimeout(r,1500)); }
      const s=prog(); s.st=s.st||{}; s.st.invites=invCount; saveProg(s);
    }catch(e){} }
  function openInvite(){
    openModal('Arkadaşını davet et');
    if(!FB.user){ swap(`<div class="inv"><p>Davet linki almak için önce Micup ile giriş yapmalısın.</p><button class="btn p" id="invIn" type="button"><span class="bl"><span>Micup ile giriş</span><span>Micup ile giriş</span></span></button></div>`); $('#invIn').onclick=()=>fbSignIn(); return; }
    swap(`<div class="inv"><div style="display:flex;gap:16px;align-items:center"><span class="cnt">${invCount}</span><span class="dim">arkadaşın senin davetinle katıldı</span></div>
      <p style="margin:0">Linkini arkadaşına gönder. Siteye girip <b>Micup ile giriş yaptığında</b> ikiniz de ödül alırsınız:</p>
      <ul><li><b style="color:var(--gold)">+${REW} puan</b> ve <b>nadir bir kart</b> sana</li><li><b style="color:var(--gold)">+${REW} puan</b> ve <b>nadir bir kart</b> arkadaşına</li><li>Sınır yok, ne kadar çok arkadaş o kadar çok ödül.</li></ul>
      <div class="lnk"><input class="field" id="invL" readonly value="${esc(invLink())}"><button class="btn p" id="invC" type="button"><span class="bl"><span>Kopyala</span><span>Kopyala</span></span></button></div>
      ${navigator.share?'<button class="ghost" id="invS" type="button">📤 Paylaş</button>':''}
      <p class="dim" style="margin:0;font-size:13px">Ödül sadece siteye ilk kez gelen yeni hesaplar için geçerli.</p></div>`);
    $('#invC').onclick=async()=>{ const v=$('#invL').value; try{ await navigator.clipboard.writeText(v); }catch(e){ $('#invL').select(); document.execCommand&&document.execCommand('copy'); } SFX.play('confirm'); toast('Link kopyalandı','Arkadaşına gönder!'); };
    const sh=$('#invS'); sh&&(sh.onclick=()=>navigator.share({title:'Marvel Türkiye',text:'Marvel Türkiye oyun salonuna gel, ikimiz de ödül kazanalım!',url:invLink()}).catch(()=>{}));
  }
  window.openInvite=openInvite;
  const _oa=openAccount;
  openAccount=function(){ _oa(); const lg=$('.lg'); if(!lg||$('#invOpen')) return; const b=document.createElement('button'); b.id='invOpen'; b.type='button'; b.className='btn g'; b.style.justifyContent='center';
    b.innerHTML='<span class="bl"><span>👥 Arkadaşını davet et · +500</span><span>👥 Arkadaşını davet et · +500</span></span>'; b.onclick=()=>{ SFX.play('click'); openInvite(); };
    const after=$('.accach',lg)||$('.accol',lg)||$('ul',lg); after?after.after(b):lg.appendChild(b); };

  (function w(){ if(FB.ready&&FB.auth){ FB.auth.onAuthStateChanged(u=>{ if(!u) return; wkP=null; ensureWeek(); setTimeout(()=>{ useRef(); claimInvites(); },3000); setTimeout(weekly,3500); }); } else setTimeout(w,800); })();
})();


/* ========================= MAĞAZA: Marvel Coin, kart paketleri, çerçeveler, isim renkleri ========================= */
(function(){
  const st=document.createElement('style'); st.textContent=`
  @keyframes ncrain{to{background-position:200% 0}}
  .nc-gold{color:#ffd34d!important} .nc-red{color:#ff4d5e!important} .nc-blue{color:#5ab4ff!important} .nc-green{color:#3ddc97!important} .nc-purple{color:#b07bff!important} .nc-silver{color:#e8edf5!important;text-shadow:0 0 8px #fff8}
  .nc-rainbow,.nc-cosmic,.nc-fire,.nc-lava,.nc-aurora,.nc-matrix,.nc-sunset,.nc-ice,.nc-toxic,.nc-royal,.nc-galaxy{-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important;-webkit-text-fill-color:transparent;background-size:200% 100%;animation:ncrain 3s linear infinite}
  .nc-rainbow{background-image:linear-gradient(90deg,#ff3b4e,#ff9a1f,#ffd34d,#3ddc97,#4a7bff,#9b5cff,#ff3b4e)}
  .nc-cosmic{background-image:linear-gradient(90deg,#9b5cff,#4a7bff,#e2d6ff,#9b5cff)}
  .nc-fire{background-image:linear-gradient(90deg,#ff3b00,#ffd34d,#ff6a00,#ff3b00)}
  .nc-lava{background-image:linear-gradient(90deg,#ff1a00,#ff7a00,#ffd34d,#ff1a00)}
  .nc-aurora{background-image:linear-gradient(90deg,#3ddc97,#5ab4ff,#b07bff,#3ddc97)}
  .nc-matrix{background-image:linear-gradient(90deg,#0a3d0a,#3ddc97,#c8ffd8,#0a3d0a)}
  .nc-sunset{background-image:linear-gradient(90deg,#ff3b4e,#ff9a1f,#b07bff,#ff3b4e)}
  .nc-ice{background-image:linear-gradient(90deg,#bfe9ff,#ffffff,#5ab4ff,#bfe9ff)}
  .nc-toxic{background-image:linear-gradient(90deg,#1d5c0a,#a4ff4d,#3ddc97,#1d5c0a)}
  .nc-royal{background-image:linear-gradient(90deg,#7a3cff,#ffd34d,#b07bff,#7a3cff)}
  .nc-galaxy{background-image:linear-gradient(90deg,#2a0a4f,#9b5cff,#ff7ad9,#2a0a4f)}
  .fr-venom{--frbg:conic-gradient(from var(--fa),#000,#3a3a55,#fff,#000,#3a3a55,#000);--frgl:#ffffff55}
  .fr-phoenix{--frbg:conic-gradient(from var(--fa),#ff3b00,#ffd34d,#ff6a00,#ff3b00);--frgl:#ff6a00cc}
  .fr-asgard{--frbg:conic-gradient(from var(--fa),#fff3b0,#c98a12,#8a5a00,#c98a12,#fff3b0);--frgl:#ffd34d88}
  .fr-quantum{--frbg:conic-gradient(from var(--fa),#ff3b9a,#5ab4ff,#ff3b9a,#5ab4ff,#ff3b9a);--frgl:#ff3b9a99}
  .fr-hydra{--frbg:conic-gradient(from var(--fa),#0a0a0a,#b5121b,#5c0d12,#b5121b,#0a0a0a);--frgl:#b5121b88}
  .fr-mystique{--frbg:conic-gradient(from var(--fa),#3a0d5c,#b565ff,#ff7ad9,#3a0d5c);--frgl:#b565ffaa}
  .fr-electro{--frbg:conic-gradient(from var(--fa),#0a3d91,#5ab4ff,#eaf6ff,#5ab4ff,#0a3d91);--frgl:#5ab4ffaa}
  .fr-goblin{--frbg:conic-gradient(from var(--fa),#0c3d0c,#7dff6a,#2e7d2e,#7dff6a,#0c3d0c);--frgl:#7dff6aaa}
  .fr-deadpool{--frbg:conic-gradient(from var(--fa),#111,#d4141f,#5c0d12,#d4141f,#111);--frgl:#ff3b4e88}
  .fr-wanda{--frbg:conic-gradient(from var(--fa),#5c0d0d,#ff3b4e,#ff9a1f,#5c0d0d);--frgl:#ff3b4eaa}
  .fr-loki{--frbg:conic-gradient(from var(--fa),#0d3b1e,#3ddc97,#ffd34d,#0d3b1e);--frgl:#3ddc97aa}
  .fr-thanos{--frbg:conic-gradient(from var(--fa),#2a1a4f,#ffd34d,#9b5cff,#2a1a4f);--frgl:#ffd34daa}
  .fr-nova{--frbg:conic-gradient(from var(--fa),#eaf6ff,#4a7bff,#ffffff,#4a7bff,#eaf6ff);--frgl:#ffffffaa}
  .fr-rainbow{--frbg:conic-gradient(from var(--fa),#ff3b4e,#ff9a1f,#ffd34d,#3ddc97,#4a7bff,#9b5cff,#ff3b4e);--frgl:#ffffff88}
  .fr-fire{--frbg:conic-gradient(from var(--fa),#ff1a00,#ff7a00,#ffd34d,#ff1a00);--frgl:#ff6a00cc}
  .fr-matrix{--frbg:conic-gradient(from var(--fa),#0a3d0a,#3ddc97,#c8ffd8,#0a3d0a);--frgl:#3ddc97aa}
  .fr-gold{--frbg:conic-gradient(from var(--fa),#fff6c8,#c98a12,#ffe07a,#c98a12,#fff6c8);--frgl:#ffd34daa}
  .fr-rainbow::after{content:"🌈"} .fr-fire::after{content:"🌋"} .fr-matrix::after{content:"🟢"} .fr-gold::after{content:"💰"}
  .fr-hydra::after{content:"💀"} .fr-asgard::after{content:"⚔️"} .fr-quantum::after{content:"💠"}
  .fr-mystique::after{content:"🔮"} .fr-electro::after{content:"⚡"} .fr-goblin::after{content:"👺"}
  .fr-deadpool::after{content:"💀"} .fr-wanda::after{content:"✨"} .fr-loki::after{content:"🪄"}
  .fr-thanos::after{content:"💜"} .fr-nova::after{content:"🚀"}
  .fr-phoenix::after{content:"🔥"} .fr-venom::after{content:"🕷️"}
  .shop{display:grid;gap:18px}
  .shop-top{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
  .coins{display:inline-flex;align-items:center;gap:8px;font-family:var(--display);font-size:30px;color:var(--gold);background:var(--s2);border:3px solid var(--inkc);border-radius:99px;padding:4px 18px 4px 8px;box-shadow:3px 3px 0 var(--inkc)}
  .coins i{width:32px;height:32px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff6c8,#ffd34d 40%,#c98a12);border:3px solid var(--inkc);display:grid;place-items:center;font-style:normal;font-size:15px;color:var(--inkc)}
  .stabs{display:flex;gap:8px;flex-wrap:wrap}
  .stabs button{font-family:var(--display);font-size:19px;letter-spacing:.04em;padding:8px 16px;border:3px solid var(--inkc);background:var(--s2);color:var(--fg);cursor:pointer;border-radius:4px}
  .stabs button.on{background:var(--gold);color:var(--inkc)}
  .sgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px}
  .sitem{background:var(--s1);border:5px solid var(--inkc);box-shadow:7px 7px 0 var(--inkc);border-radius:6px;padding:18px;display:grid;gap:10px;justify-items:center;text-align:center}
  .sitem h4{margin:0;font-family:var(--display);font-size:26px;letter-spacing:.03em}
  .sitem p{margin:0;color:var(--dim);font-size:14px}
  .sitem .odds{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;font-size:12px}
  .sitem .odds span{padding:2px 8px;border-radius:99px;border:2px solid currentColor}
  .sitem .price{display:inline-flex;align-items:center;gap:6px;font-family:var(--display);font-size:22px;color:var(--gold)}
  .sitem .own{color:var(--ok);font-family:var(--display);font-size:20px}
  .sitem .av{width:72px!important;height:72px!important;font-size:30px!important;margin:10px 0}
  .sitem .nprev{font-family:var(--display);font-size:32px;letter-spacing:.03em;margin:14px 0}
  .pk{width:120px;height:170px;position:relative;border:4px solid var(--inkc);border-radius:8px;background:var(--pkbg);box-shadow:5px 5px 0 var(--inkc);display:grid;place-items:center;overflow:hidden;margin:6px 0}
  .pk::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,transparent 0 16px,rgba(255,255,255,.12) 16px 22px)}
  .pk b{position:relative;font-family:var(--display);font-size:22px;line-height:.95;color:#fff;-webkit-text-stroke:2px var(--inkc);paint-order:stroke fill;text-shadow:3px 3px 0 var(--inkc);transform:rotate(-8deg)}
  .pk small{position:absolute;bottom:8px;left:0;right:0;text-align:center;font-family:var(--mono);font-size:10px;color:#fff;letter-spacing:.15em}
  .pk-std{--pkbg:linear-gradient(160deg,#4a7bff,#1b2a6b)} .pk-sup{--pkbg:linear-gradient(160deg,#ffb627,#b5121b)} .pk-leg{--pkbg:linear-gradient(160deg,#9b5cff,#ff3b4e,#ffd34d)} .pk-nad{--pkbg:linear-gradient(160deg,#7fd4ff,#1b6b8f)} .pk-epi{--pkbg:linear-gradient(160deg,#b06bff,#3d1470)} .pk-cos{--pkbg:linear-gradient(160deg,#3a3a6b,#0a0a1a,#5b2a86)} .pk-av{--pkbg:linear-gradient(160deg,#ffd34d,#7a2bd6)}
  /* paket açılışı */
  @keyframes pkshake{0%,100%{transform:rotate(0)}20%{transform:rotate(-5deg) scale(1.03)}40%{transform:rotate(5deg) scale(1.05)}60%{transform:rotate(-7deg) scale(1.07)}80%{transform:rotate(7deg) scale(1.09)}}
  @keyframes pkfloat{50%{transform:translateY(-12px) rotate(-2deg)}}
  @keyframes pktear{to{transform:translate(60px,-260px) rotate(40deg);opacity:0}}
  @keyframes pkflash{0%{opacity:0}30%{opacity:.55}100%{opacity:0}}
  @keyframes pkrays{to{transform:rotate(360deg)}}
  .popen{display:grid;justify-items:center;gap:18px;padding:20px 0;position:relative;min-height:420px;align-content:center}
  .popen .rays{position:absolute;width:520px;height:520px;left:50%;top:50%;margin:-260px 0 0 -260px;background:repeating-conic-gradient(var(--glow) 0 8deg,transparent 8deg 20deg);opacity:.25;border-radius:50%;animation:pkrays 14s linear infinite;-webkit-mask:radial-gradient(circle,#000 20%,transparent 70%);mask:radial-gradient(circle,#000 20%,transparent 70%);pointer-events:none}
  .popen .big{width:200px;height:284px;cursor:pointer;animation:pkfloat 2.4s ease-in-out infinite;box-shadow:0 0 40px var(--glow),8px 8px 0 var(--inkc)}
  .popen .big b{font-size:38px}
  .popen .big .top{position:absolute;left:0;right:0;top:0;height:22%;background:inherit;border-bottom:3px dashed rgba(0,0,0,.6);z-index:2}
  .popen .big.shake{animation:pkshake .9s ease-in-out}
  .popen .big.torn .top{animation:pktear .6s ease-in forwards}
  .popen .flash{position:fixed;inset:0;background:var(--glow);pointer-events:none;opacity:0;z-index:50}
  .popen .flash.go{animation:pkflash .7s ease-out}
  .popen p{position:relative;margin:0}`;
  document.head.appendChild(st);

  /* ---------- coin ---------- */
  const coins=()=>prog().coins||0;
  function setCoins(v){ const s=prog(); s.coins=Math.max(0,Math.round(v)); saveProg(s); renderShop(); if(FB.ready&&FB.user) FB.db.collection('users').doc(FB.user.uid).set({coins:s.coins},{merge:true}).catch(()=>{}); }
  (function(){ const s=prog(); if(!s.coinStart){ s.coinStart=1; s.coins=(s.coins||0)+1000; saveProg(s); } })(); // hoş geldin hediyesi
  const _sub=submitScore; submitScore=function(game,score){ _sub(game,score); if(score>0) setCoins(coins()+score); };
  const coinHTML=n=>`<span class="coins"><i>MC</i>${Math.round(n).toLocaleString('tr-TR')}</span>`;

  /* ---------- ürünler ---------- */
  const PACKS=[
    {id:'std',n:'Standart paket',cls:'pk-std',price:800,d:'3 kart',odds:[['Bronz',52,'#C8834A'],['Nadir',30,'#D5DAE4'],['Epik',14,'#FFB627'],['Efsanevi',4,'#FF3B4E']],roll:()=>[pickHero('b'),pickHero('b'),pickHero('b')]},
    {id:'sup',n:'Süper paket',cls:'pk-sup',price:2000,d:'5 kart · en az 1 epik garanti',odds:[['Epik garanti',100,'#FFB627'],['Efsanevi şansı ↑',13,'#FF3B4E']],roll:()=>[pickHero('a'),pickHero('g'),pickHero('b'),pickHero('b'),pickHero('b')]},
    {id:'leg',n:'Efsane paketi',cls:'pk-leg',price:5000,d:'3 kart · 1 efsanevi garanti',odds:[['Efsanevi garanti',100,'#FF3B4E'],['Nadir+ garanti',100,'#D5DAE4']],roll:()=>[pickHero('e'),pickHero('g'),pickHero('g')]},
    {id:'x10',n:'10\'lu Destesi',cls:'pk-sup',price:2200,d:'10 kart · karışık deste',odds:[['Nadir',55,'#D5DAE4'],['Epik',30,'#FFB627'],['Efsanevi şansı',15,'#FF3B4E']],roll:()=>Array.from({length:10},()=>pickHero(Math.random()<.15?'a':Math.random()<.55?'g':'b'))},
    {id:'nad',n:'Nadir Avcısı',cls:'pk-nad',price:1500,d:'4 kart · 2 nadir garanti',odds:[['Nadir garanti ×2',100,'#7fd4ff'],['Epik şansı',18,'#FFB627']],roll:()=>[pickHero('g'),pickHero('g'),pickHero('b'),pickHero('b')]},
    {id:'epi',n:'Epik Rüzgarı',cls:'pk-epi',price:4000,d:'4 kart · 2 epik garanti',odds:[['Epik garanti ×2',100,'#b06bff'],['Efsanevi şansı',12,'#FF3B4E']],roll:()=>[pickHero('a'),pickHero('a'),pickHero('g'),pickHero('g')]},
    {id:'cos',n:'Kozmik Kutu',cls:'pk-cos',price:9000,d:'5 kart · 1 efsanevi + 1 epik garanti',odds:[['Efsanevi garanti',100,'#FF3B4E'],['Epik garanti',100,'#b06bff']],roll:()=>[pickHero('e'),pickHero('a'),pickHero('g'),pickHero('g'),pickHero('b')]},
    {id:'avn',n:'Efsane Avcısı',cls:'pk-av',price:7500,d:'6 kart · 2 epik + 3 nadir garanti',odds:[['Epik garanti ×2',100,'#ffd34d'],['Nadir garanti ×3',100,'#7a2bd6']],roll:()=>[pickHero('a'),pickHero('a'),pickHero('g'),pickHero('g'),pickHero('g'),pickHero('b')]},
  ];
  Object.assign(FRAMES,{
    hydra:{n:'Hydra',from:'Mağaza'}, asgard:{n:'Asgard Altını',from:'Mağaza',glow:1}, venom:{n:'Simbiyot',from:'Mağaza',anim:1,glow:1},
    quantum:{n:'Kuantum',from:'Mağaza',anim:1,glow:1}, phoenix:{n:'Anka Ateşi',from:'Mağaza',anim:1,glow:1},
    mystique:{n:'Mor Sis',from:'Mağaza',anim:1,glow:1},
    electro:{n:'Mavi Şimşek',from:'Mağaza',anim:1,glow:1},
    goblin:{n:'Kum Torbası',from:'Mağaza',anim:1,glow:1},
    deadpool:{n:'Kırmızı-Siyah',from:'Mağaza',anim:1,glow:1},
    wanda:{n:'Kaos Büyüsü',from:'Mağaza',anim:1,glow:1},
    loki:{n:'Kötü Şöhret',from:'Mağaza',anim:1,glow:1},
    thanos:{n:'Altın Titan',from:'Mağaza',anim:1,glow:1},
    nova:{n:'Işık Hızı',from:'Mağaza',anim:1,glow:1},
    rainbow:{n:'Gökkuşağı',from:'Mağaza',anim:1,glow:1},
    fire:{n:'Alev Tacı',from:'Mağaza',anim:1,glow:1},
    matrix:{n:'Matrix',from:'Mağaza',anim:1,glow:1},
    gold:{n:'Saf Altın',from:'Mağaza',anim:1,glow:1},
  });
  const SHOP_FR=[['hydra',1500],['mystique',1800],['electro',1800],['goblin',2000],['deadpool',2200],['asgard',2500],['wanda',2600],['venom',3500],['nova',4000],['quantum',4000],['loki',4800],['thanos',5000],['phoenix',6000],['matrix',4500],['fire',5200],['rainbow',5500],['gold',7000]];
  const NAMECOL=[['gold','Altın',1200],['red','Kırmızı',1200],['blue','Mavi',1200],['green','Yeşil',1200],['purple','Mor',1500],['silver','Gümüş Işıltı',2500],['fire','Ateş (hareketli)',4500],['cosmic','Kozmik (hareketli)',4500],['rainbow','Gökkuşağı (hareketli)',7000],['ice','Buzul (hareketli)',5000],['toxic','Toksik (hareketli)',5000],['lava','Lav (hareketli)',6000],['matrix','Matrix (hareketli)',6000],['sunset','Gün Batımı (hareketli)',5500],['aurora','Aurora (hareketli)',6500],['royal','Kraliyet (hareketli)',7000],['galaxy','Galaksi (hareketli)',8000]];
  const myNC=()=>prog().nameColors||[]; window.NAMECOL=NAMECOL; window.myNC=myNC; window.syncNC=syncNC;
  window.ncOf=r=>{ const c=r&&(r.nc!==undefined&&r.nc!==null?r.nc:(r.me||r===AUTH.user?prog().nameColor:null)); return c?`nc-${c}`:''; };
  function syncNC(){ if(FB.ready&&FB.user){ const s=prog(); FB.db.collection('users').doc(FB.user.uid).set({nameColors:s.nameColors||[],nameColor:s.nameColor||null},{merge:true}).catch(()=>{}); } }

  function buy(price,fn){ if(coins()<price){ SFX.sfx&&SFX.sfx('cardhit'); toast('Coin yetmiyor',`${(price-coins()).toLocaleString('tr-TR')} coin daha lazım. Oyna, görev bitir, coin kazan!`); return false; }
    setCoins(coins()-price); fn(); return true; }

  /* ---------- paket açılış animasyonu ---------- */
  const RCOL={b:'#C8834A',g:'#D5DAE4',a:'#FFB627',e:'#FF3B4E'}, RORD={b:0,g:1,a:2,e:3};
  function openPackAnim(pack,fast){
    const list=pack.roll(), best=list.reduce((m,h)=>RORD[h.r]>RORD[m]?h.r:m,'b');
    const owned=myCards(); let refund=0; const seen={}; list.forEach(h=>{ if(owned[h.id]||seen[h.id]) refund+={b:20,g:50,a:150,e:500}[h.r]; seen[h.id]=1; });
    if(!fast&&!reduce&&window.__MT_LOOT){ const c0=myCards(); const its=list.map(h=>{ const isNew=!c0[h.id]; c0[h.id]=(c0[h.id]||0)+1; return {h,isNew,n:c0[h.id]}; }); setCards(c0); addXP(40*list.length); if(refund>0) setCoins(coins()+refund);
      return window.__MT_LOOT.pack(pack,its,{refund,price:pack.price,again:()=>buy(pack.price,()=>openPackAnim(pack))}); }
    openModal(pack.n);
    swap(`<div class="popen" style="--glow:${RCOL[best]}"><div class="rays"></div><div class="flash" id="pkF"></div>
      <div class="pk big ${pack.cls}" id="pkB"><span class="top"></span><b>MARVEL<br>TÜRKİYE</b><small>${esc(pack.n.toUpperCase())}</small></div>
      <p class="mono dim" id="pkT">Pakete dokun, aç!</p></div>`);
    const b=$('#pkB'); let done=false;
    b.onclick=()=>{ if(done) return; done=true; $('#pkT').textContent=best==='e'?'Bir şeyler parlıyor…':best==='a'?'Güçlü bir kart sezdin…':'Açılıyor…';
      SFX.sfx?SFX.sfx('riser',{vol:.5}):SFX.play('click'); buzz([20,40,20,40,20]); b.classList.add('shake');
      setTimeout(()=>{ b.classList.remove('shake'); b.classList.add('torn'); SFX.sfx?SFX.sfx(best==='e'?'cosmic':'reveal'):SFX.play('win'); const f=$('#pkF'); f&&f.classList.add('go'); burst&&burst(best==='e'||best==='a'); if(best==='e') buzz([60,40,60,40,120]); },900);
      setTimeout(()=>{ packOpen(list,pack,fast); if(refund>0){ setCoins(coins()+refund); setTimeout(()=>toast('Tekrar eden kartlar',`+${refund} coin iade edildi.`),1200); } },1600); };
    if(fast) setTimeout(()=>{ try{ b.onclick&&b.onclick(); }catch(e){} },700);
  }

  /* ---------- mağaza arayüzü (Oyunlar sayfasında bölüm + modal) ---------- */
  let tab='packs';
  function shopBody(){ const own=myFrames2(), nco=myNC(), u=AUTH.user||{display:'Oyuncu'};
    let items='';
    if(tab==='packs') items=PACKS.map(p=>`<div class="sitem"><div class="pk ${p.cls}"><b>MARVEL<br>TÜRKİYE</b><small>${esc(p.n.toUpperCase())}</small></div><h4>${esc(p.n)}</h4><p>${esc(p.d)}</p>
      <div class="odds">${p.odds.map(o=>`<span style="color:${o[2]}">${o[0]}${o[1]<100?' %'+o[1]:''}</span>`).join('')}</div>
      <div style="display:flex;gap:8px"><button class="btn p" data-buyp="${p.id}" type="button" style="flex:1"><span class="bl"><span>🪙 ${p.price.toLocaleString('tr-TR')}</span><span>Satın al</span></span></button><button class="ghost" data-buypf="${p.id}" type="button" title="Hızlı aç — animasyonsuz" style="flex-shrink:0;font-size:13px;padding:0 12px">⚡</button></div></div>`).join('');
    if(tab==='frames') items=SHOP_FR.map(([id,price])=>{ const f=FRAMES[id], has=own.includes(id);
      return `<div class="sitem">${avatarHTML({display:u.display,avatar:u.avatar,frame:id},72)}<h4>${esc(f.n)}</h4><p>Mağazaya özel çerçeve</p>
      ${has?(prog().frame===id?'<span class="own">Takılı ✓</span>':`<button class="ghost" data-eqf="${id}" type="button">Tak</button>`):`<button class="btn p" data-buyf="${id}" data-pr="${price}" type="button"><span class="bl"><span>🪙 ${price.toLocaleString('tr-TR')}</span><span>Satın al</span></span></button>`}</div>`; }).join('');
    if(tab==='names') items=NAMECOL.map(([id,n,price])=>{ const has=nco.includes(id), on=prog().nameColor===id;
      return `<div class="sitem"><div class="nprev nc-${id}">${esc(u.display||'Oyuncu')}</div><h4>${esc(n)}</h4><p>İsmin sıralamada ve menüde bu renkte görünür</p>
      ${has?(on?`<button class="ghost" data-eqn="" type="button">Çıkar</button>`:`<button class="ghost" data-eqn="${id}" type="button">Kullan</button>`):`<button class="btn p" data-buyn="${id}" data-pr="${price}" type="button"><span class="bl"><span>🪙 ${price.toLocaleString('tr-TR')}</span><span>Satın al</span></span></button>`}</div>`; }).join('');
    if(tab==='packs') items+=(window.boxShopHTML?boxShopHTML():'');
    if(tab==='inv') items=invHTML();
    return `<div class="shop"><div class="shop-top">${coinHTML(coins())}<span class="dim" style="flex:1;min-width:200px">Her kazandığın puan kadar Marvel Coin kazanırsın. Coin harcamak sıralama puanını düşürmez.</span><button class="ghost" id="shCol" type="button">🃏 Koleksiyonum</button></div>
      <div class="stabs"><button data-st="packs" class="${tab==='packs'?'on':''}" type="button">🃏 Kart paketleri</button><button data-st="frames" class="${tab==='frames'?'on':''}" type="button">🖼️ Çerçeveler</button><button data-st="names" class="${tab==='names'?'on':''}" type="button">🎨 İsim renkleri</button><button data-st="inv" class="${tab==='inv'?'on':''}" type="button">🎒 Envanter</button></div>
      <div class="sgrid">${items}</div></div>`; }
  const myFrames2=()=>prog().frames||[];
  function bindShop(root,inModal){
    $$('[data-st]',root).forEach(b=>b.onclick=()=>{ tab=b.dataset.st; SFX.play('click'); renderShop(); if(inModal) window.openShop(); });
    $$('[data-buyp]',root).forEach(b=>b.onclick=()=>{ const p=PACKS.find(x=>x.id===b.dataset.buyp); buy(p.price,()=>{ openPackAnim(p); }); });
    $$('[data-buypf]',root).forEach(b=>b.onclick=()=>{ const p=PACKS.find(x=>x.id===b.dataset.buypf); buy(p.price,()=>{ openPackAnim(p,true); }); });
    $$('[data-openp]',root).forEach(b=>b.onclick=()=>{ const id=b.dataset.openp; const s0=prog(); if(s0.inv&&s0.inv.packs&&s0.inv.packs[id]>0){ s0.inv.packs[id]--; invCommit(s0); if(window.__MT_OPENP) window.__MT_OPENP(id); } else toast('Paket kalmadı',''); });
    $$('[data-openbox2]',root).forEach(b=>b.onclick=()=>openBoxAnim(b.dataset.openbox2));
    $$('[data-buybox2]',root).forEach(b=>b.onclick=()=>buyBox(b.dataset.buybox2));
    $$('[data-invcol]',root).forEach(b=>b.onclick=()=>openCollection());
    $$('[data-buyf]',root).forEach(b=>b.onclick=()=>{ const id=b.dataset.buyf; buy(+b.dataset.pr,()=>{ const s=prog(); s.frames=[...new Set([...(s.frames||[]),id])]; s.frame=id; saveProg(s);
      if(FB.ready&&FB.user) FB.db.collection('users').doc(FB.user.uid).set({frames:s.frames,frame:id},{merge:true}).catch(()=>{});
      SFX.play('win'); burst&&burst(true); toast('Çerçeve alındı',`${FRAMES[id].n} takıldı!`); renderUser(); renderBoards(); renderShop(); if(inModal) window.openShop(); }); });
    $$('[data-eqf]',root).forEach(b=>b.onclick=()=>{ const s=prog(); s.frame=b.dataset.eqf; saveProg(s); if(FB.ready&&FB.user) FB.db.collection('users').doc(FB.user.uid).set({frame:s.frame},{merge:true}).catch(()=>{});
      SFX.play('confirm'); renderUser(); renderBoards(); renderShop(); if(inModal) window.openShop(); });
    $$('[data-buyn]',root).forEach(b=>b.onclick=()=>{ const id=b.dataset.buyn; buy(+b.dataset.pr,()=>{ const s=prog(); s.nameColors=[...new Set([...(s.nameColors||[]),id])]; s.nameColor=id; saveProg(s); syncNC();
      SFX.play('win'); burst&&burst(); toast('İsim rengi alındı','Artık bu renkte görünüyorsun!'); renderUser(); renderBoards(); renderShop(); if(inModal) window.openShop(); }); });
    $$('[data-eqn]',root).forEach(b=>b.onclick=()=>{ const s=prog(); s.nameColor=b.dataset.eqn||null; saveProg(s); syncNC(); SFX.play('confirm'); renderUser(); renderBoards(); renderShop(); if(inModal) window.openShop(); });
    const _scb=$('#shCol',root); _scb&&(_scb.onclick=()=>{SFX.play('click');openCollection();});
  }
  function openShop(){ openModal('Mağaza'); swap(shopBody()); bindShop(mBody,true); }
  window.__setShopTab=t=>{ tab=t; };
  window.openShop=openShop; window.__MT_REPACK=(p,f)=>buy(p.price,()=>openPackAnim(p,f)); window.__MT_BUY10=()=>{const p=PACKS.find(x=>x.id==='x10'); buy(p.price,()=>openPackAnim(p));}; window.__MT_PACKS=PACKS; window.__MT_OPENP=id=>{const p=PACKS.find(x=>x.id===id); p&&openPackAnim(p,true)};
  const sec=document.createElement('section'); sec.className='band'; sec.id='magaza';
  sec.innerHTML=`<div class="wrap"><div class="sh"><div><div class="mono">Coinlerini harca</div><h2>Mağ<span class="o">aza</span></h2></div><p class="sub">Kart paketi aç, çerçeve ve isim rengi al. Tekrar eden kartlar coin olarak geri döner.</p></div><div id="shopBox"></div></div>`;
  const vw=document.createElement('div'); vw.className='view'; vw.id='v-magaza'; vw.appendChild(sec); const mn=document.querySelector('main'); mn&&mn.appendChild(vw); if(typeof current!=='undefined'&&current==='magaza') vw.classList.add('on');
  function renderShop(){ const b=$('#shopBox'); if(b){ b.innerHTML=shopBody(); bindShop(b,false); } const ac=$('#acCoins'); if(ac) ac.innerHTML=coinHTML(coins()); }
  window.renderShop=renderShop;

  /* hesap penceresinde coin + mağaza */
  const _oa=openAccount;
  openAccount=function(){ _oa(); const lg=$('.lg'); if(!lg||$('#acCoins')) return; const d=document.createElement('div'); d.style.cssText='display:flex;align-items:center;gap:12px;flex-wrap:wrap';
    d.innerHTML=`<span id="acCoins">${coinHTML(coins())}</span><button class="ghost" id="acShop" type="button">🛒 Mağaza</button>`; const ul=$('ul',lg); ul?ul.before(d):lg.appendChild(d);
    $('#acShop').onclick=()=>{ SFX.play('click'); openShop(); }; };

  /* buluttan birleştir */
  (function w(){ if(FB.ready&&FB.auth){ FB.auth.onAuthStateChanged(async u=>{ if(!u) return; try{ const d=(await FB.db.collection('users').doc(u.uid).get()).data()||{};
      if(d.progReset){ const pr=d.progReset.toMillis?d.progReset.toMillis():+d.progReset; if(pr>+(localStorage.getItem('mt_preset')||0)){ try{localStorage.setItem('mt_prog','{}');localStorage.setItem('mt_preset',String(pr));}catch(e){} } }
      const s=prog();
      let _wiped=false; if(d.econReset){ const er=d.econReset.toMillis?d.econReset.toMillis():+d.econReset; if(er>+(localStorage.getItem('mt_ereset')||0)){ s.coins=typeof d.coins==='number'?d.coins:0; s.xp=typeof d.xp==='number'?d.xp:0; s.points=typeof d.points==='number'?d.points:0; try{localStorage.setItem('mt_ereset',String(er));}catch(e){} _wiped=true; } }
      if(!_wiped&&typeof d.coins==='number') s.coins=Math.max(s.coins||0,d.coins); s.nameColors=[...new Set([...(s.nameColors||[]),...(d.nameColors||[])])]; if(!s.nameColor&&d.nameColor) s.nameColor=d.nameColor;
      saveProg(s); syncNC(); FB.db.collection('users').doc(u.uid).set({coins:s.coins},{merge:true}).catch(()=>{}); renderShop(); renderUser(); renderBoards(); }catch(e){} }); } else setTimeout(w,800); })();
  renderShop(); renderUser();
})();


/* ========================= OYUNCU PROFİL SAYFASI + e-posta gizliliği ========================= */
(function(){
  const st=document.createElement('style'); st.textContent=`
  #lb .lrow:not(.head),#mini .mrow{cursor:pointer;transition:transform .15s}
  #lb .lrow:not(.head):hover,#mini .mrow:hover{transform:translateX(4px)}
  .pp{display:grid;gap:20px}
  .pp-head{display:flex;gap:20px;align-items:center;flex-wrap:wrap;background:linear-gradient(135deg,var(--s2),var(--s1));border:4px solid var(--inkc);box-shadow:6px 6px 0 var(--inkc);border-radius:6px;padding:20px;position:relative;overflow:hidden}
  .pp-head::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,transparent 0 18px,rgba(255,255,255,.03) 18px 24px);pointer-events:none}
  .pp-head .av{width:96px!important;height:96px!important;font-size:42px!important}
  .pp-name{font-family:var(--display);font-size:clamp(32px,5vw,46px);line-height:1;letter-spacing:.03em;margin:0}
  .pp-tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  .pp-tags span{font-family:var(--mono);font-size:12px;padding:4px 10px;border:2px solid var(--line2);border-radius:99px;background:var(--s1)}
  .pp-tags .lv{background:var(--gold);color:var(--inkc);border-color:var(--inkc);font-weight:800}
  .pp-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}
  .pp-stats div{background:var(--s2);border:3px solid var(--inkc);border-radius:6px;padding:12px 14px;display:grid;gap:4px}
  .pp-stats b{font-family:var(--display);font-size:28px;color:var(--gold);line-height:1}
  .pp-stats span{font-size:12px;color:var(--dim)}
  .pp h4{margin:0 0 10px;font-family:var(--display);font-size:24px;letter-spacing:.04em}
  .pp-vit{display:flex;gap:14px;flex-wrap:wrap}
  .pp-vit img{width:min(150px,28vw);border-radius:12px;box-shadow:5px 5px 0 var(--inkc);transition:transform .3s}
  .pp-vit img:hover{transform:rotate(-3deg) scale(1.05)}
  .pp-games{display:grid;gap:8px}
  .pp-games div{display:grid;grid-template-columns:1fr auto auto;gap:14px;align-items:center;background:var(--s2);border-radius:6px;padding:10px 14px}
  .pp-games small{color:var(--dim)}
  .pp-badges{display:flex;flex-wrap:wrap;gap:10px}
  .pp-badges .hx{width:54px;height:60px;font-size:24px}
  .pp-empty{color:var(--dim);margin:0}
  .pp-load{display:grid;place-items:center;min-height:240px;color:var(--dim)}`;
  document.head.appendChild(st);

  const GNAME={guess:'Ben Kimim?',quiz:'Bilgi Yarışması',mem:'Kahraman Hafızası',hl:'Yüksek mi Düşük mü',real:'Gerçek mi, Sahte mi?',cards:'Kahraman Kartları'};
  const RORD={e:0,a:1,g:2,b:3};

  /* istatistikleri buluta yaz (profil sayfasında görünsün) */
  let stT=null;
  function syncStats(){ clearTimeout(stT); stT=setTimeout(()=>{ if(!(FB.ready&&FB.user)) return; const s=prog();
    FB.db.collection('users').doc(FB.user.uid).set({st:s.st||{},nCards:Object.keys(s.cards||{}).length},{merge:true}).catch(()=>{}); },1500); }
  const _sub=submitScore; submitScore=function(g,x){ const _m=window.__MT_SOLO||1; window.__MT_SOLO=1; x=Math.round(x*_m); _sub(g,x); syncStats(); };
  const _sc=setCards; setCards=function(c,sh){ _sc(c,sh); syncStats(); };

  /* e-postayı herkese açık profilden kaldır, sadece adminlerin görebildiği yere taşı */
  (function w(){ if(FB.ready&&FB.auth){ FB.auth.onAuthStateChanged(async u=>{ if(!u) return;
      try{ await FB.db.collection('private').doc(u.uid).set({email:(u.email||'').toLowerCase(),name:AUTH.user?(AUTH.user.display||AUTH.user.username):(u.displayName||'Oyuncu')},{merge:true});
        setTimeout(()=>FB.db.collection('users').doc(u.uid).set({email:firebase.firestore.FieldValue.delete()},{merge:true}).catch(()=>{}),2500); }catch(e){}
      syncStats(); }); } else setTimeout(w,800); })();

  /* sıralama satırlarını tıklanabilir yap */
  let lastRows=[];
  const _gb=getBoard; getBoard=async function(){ const r=await _gb(); lastRows=r||[]; return r; };
  function rowClick(e){ const row=e.target.closest('.lrow:not(.head),.mrow'); if(!row) return;
    const list=row.classList.contains('mrow')?$$('#mini .mrow'):$$('#lb .lrow:not(.head)'); const i=list.indexOf(row); const r=lastRows[i]; if(!r) return;
    SFX.play('click'); window.openProfile(r.uid||null,r,i+1); }
  $('#lb')&&$('#lb').addEventListener('click',rowClick); $('#mini')&&$('#mini').addEventListener('click',rowClick);

  function localData(){ const s=prog(), u=AUTH.user||{}; return {name:u.display||u.username||'Sen',avatar:u.avatar,frame:s.frame||null,nameColor:s.nameColor||null,xp:s.xp||0,
    points:myStats().points,sp:null,st:s.st||{},ach:s.ach||{},cards:s.cards||{},showcase:s.showcase||[],me:true}; }

  async function openProfile(uid,row,rank){
    openModal('Oyuncu profili'); swap('<div class="pp-load">Profil yükleniyor…</div>');
    let d=null; const me=FB.user&&uid===FB.user.uid;
    if(uid&&FB.ready){ try{ const sn=await FB.db.collection('users').doc(uid).get(); if(sn.exists) d={...sn.data(),uid}; }catch(e){} }
    if(!d&&(row&&row.me||!uid)) d=localData();
    if(!d){ d={name:row?row.display:'Oyuncu',avatar:row&&row.avatar,points:row?row.points:0}; }
    if(me){ const l=localData(); d.ach=Object.assign({},d.ach||{},l.ach); d.st=Object.keys(l.st).length?l.st:(d.st||{}); d.cards=Object.keys(l.cards).length?l.cards:(d.cards||{}); d.showcase=l.showcase.length?l.showcase:(d.showcase||[]); d.frame=l.frame; d.nameColor=l.nameColor; d.me=true; }
    render(d,rank);
    if(uid&&/^micup_\d+$/.test(uid)){ const mid=uid.slice(6);
      micupExchange({action:'roles',micup_id:mid}).then(j=>{ if(!j||!j.roles||!j.roles.length) return;
        const tags=document.querySelector('.pp-tags'); if(!tags||document.querySelector('.pp-mroles')) return;
        const host=document.createElement('div'); host.className='pp-mroles'; host.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;width:100%';
        host.innerHTML=j.roles.map(r=>{ const c=r.color?('#'+(r.color>>>0).toString(16).padStart(6,'0')):'#e52528'; return '<span class="mono" style="font-size:11px;padding:2px 9px;border:2px solid var(--inkc);border-radius:4px;background:'+c+';color:#fff;white-space:nowrap">'+esc(r.name)+'</span>'; }).join('');
        tags.parentNode.appendChild(host); }).catch(()=>{}); }
  }
  window.openProfile=openProfile;
  function render(d,rank){
    const stt=d.st||{}, cards=d.cards||{}, nC=Object.keys(cards).length||d.nCards||0, ach=d.ach||{}, AL=window.ACH_LIST||[];
    const lv=lvlOf(d.xp||0), joined=d.created&&d.created.toDate?d.created.toDate().toLocaleDateString('tr-TR',{month:'long',year:'numeric'}):null;
    let vit=(d.showcase||[]).filter(id=>HERO_BY[id]);
    if(!vit.length) vit=Object.keys(cards).filter(id=>HERO_BY[id]).sort((a,b)=>RORD[HERO_BY[a].r]-RORD[HERO_BY[b].r]).slice(0,3);
    const got=AL.filter(a=>ach[a.id]).sort((a,b)=>ach[b.id]-ach[a.id]);
    const champ=['champ1','champ2','champ3'].filter(f=>(d.frames||[]).includes(f)).length;
    const games=Object.keys(GNAME).filter(g=>(stt.per||{})[g]).map(g=>({g,n:stt.per[g],b:(stt.best||{})[g]||0,w:(stt.won||{})[g]||0})).sort((a,b)=>b.n-a.n);
    const fav=games[0];
    swap(`<div class="pp">
      <div class="pp-head">${avatarHTML({display:d.name,avatar:d.avatar,frame:d.frame||null},96)}
        <div style="flex:1;min-width:200px;position:relative"><h3 class="pp-name ${d.nameColor?'nc-'+d.nameColor:''}">${esc(d.name||'Oyuncu')}</h3>
          <div class="pp-tags"><span class="lv">LV ${lv}</span>${rank?`<span>#${rank} sıralamada</span>`:''}${fav?`<span>❤ ${esc(GNAME[fav.g])}</span>`:''}${champ?`<span>👑 ${champ} sezon şampiyonluğu</span>`:''}${joined?`<span>${joined}'den beri</span>`:''}${d.me?'<span style="border-color:var(--gold)">Bu sensin</span>':''}${d.uid&&typeof FIXED_ADMIN_UIDS!=='undefined'&&FIXED_ADMIN_UIDS.includes(d.uid)?'<span style="border-color:var(--gold);color:var(--gold)">👑 Yönetici</span>':''}</div></div></div>
      <div class="pp-stats">
        <div><b>${(d.sp!=null?d.sp:(d.points||0)).toLocaleString('tr-TR')}</b><span>${d.sp!=null?'Sezon puanı':'Toplam puan'}</span></div>
        <div><b>${(d.points||0).toLocaleString('tr-TR')}</b><span>Tüm zamanlar puanı</span></div>
        <div><b>${(stt.games||d.games||0).toLocaleString('tr-TR')}</b><span>Oynanan oyun</span></div>
        <div><b>${stt.cardWins||0}</b><span>Kart maçı galibiyeti</span></div>
        <div><b>${nC}<small style="font-size:.5em;color:var(--dim)">/${HEROES_CG.length}</small></b><span>Kart koleksiyonu</span></div>
        <div><b>${got.length}<small style="font-size:.5em;color:var(--dim)">/${AL.length}</small></b><span>Rozet</span></div>
        <div><b>${stt.qDone||0}</b><span>Tamamlanan görev</span></div>
        <div><b>${(d.streak||0)}</b><span>Günlük seri</span></div>
      </div>
      <div><h4>Kart vitrini</h4>${vit.length?`<div class="pp-vit">${vit.map(id=>`<img src="${cardFace(HERO_BY[id])}" alt="${esc(HERO_BY[id].ad)}">`).join('')}</div>`:'<p class="pp-empty">Henüz kartı yok.</p>'}</div>
      <div><h4>Rozetler</h4>${got.length?`<div class="pp-badges">${got.map(a=>`<div class="hx t-${a.tier}" title="${esc(a.t)} — ${esc(a.d)}"><span>${a.ic}</span></div>`).join('')}</div>`:'<p class="pp-empty">Henüz rozet yok.</p>'}</div>
      <div><h4>Oyun istatistikleri</h4>${games.length?`<div class="pp-games">${games.map(x=>`<div><b>${esc(GNAME[x.g])}</b><small>${x.n} oyun${x.w?` · ${x.w} galibiyet`:''}</small><span class="mono">en iyi ${x.b.toLocaleString('tr-TR')}</span></div>`).join('')}</div>`:'<p class="pp-empty">Henüz istatistik yok. (Bu özellik eklendikten sonra oynanan oyunlar sayılır.)</p>'}</div>
      ${d.me?'<div class="rowb"><button class="btn p" id="ppEdit" type="button"><span class="bl"><span>Profili düzenle</span><span>Profili düzenle</span></span></button><button class="ghost" id="ppFr" type="button">🖼️ Çerçeve</button><button class="ghost" id="ppCol" type="button">Vitrini değiştir</button></div>':''}
    </div>`);
    if(G){ G.from('.pp-vit img',{y:40,rotation:-12,opacity:0,stagger:.1,duration:.6,ease:'back.out(2)'}); G.from('.pp-badges .hx',{scale:0,stagger:.04,duration:.4,ease:'back.out(3)'}); }
    const e=$('#ppEdit'); e&&(e.onclick=()=>openProfileEdit()); const f=$('#ppFr'); f&&(f.onclick=()=>openFrames()); const c=$('#ppCol'); c&&(c.onclick=()=>openCollection());
  }
  const _oa=openAccount;
  openAccount=function(){ _oa(); const lg=$('.lg'); if(!lg||$('#ppMe')) return; const b=document.createElement('button'); b.id='ppMe'; b.type='button'; b.className='ghost'; b.textContent='👤 Profilimi gör';
    b.onclick=()=>{ SFX.play('click'); window.openProfile(FB.user?FB.user.uid:null,{me:true}); }; const ac=$('#acCoins'); ac?ac.parentNode.appendChild(b):lg.prepend(b); };
})();


/* ========================= UYGULAMA OLARAK YÜKLE (PWA) + BİLDİRİM ZİLİ + ARKADAŞ SİSTEMİ ========================= */
(function(){
  const st=document.createElement('style'); st.textContent=`
  .hbtn .cntb{position:absolute;right:-8px;top:-8px;min-width:19px;height:19px;padding:0 4px;border-radius:99px;background:var(--red);color:#fff;font:800 11px/19px var(--body);border:2px solid var(--inkc)}
  @media (max-width:430px){#questBtn,#bpBtn{display:none!important}}
  .instbar{position:fixed;left:16px;right:16px;bottom:86px;z-index:60;max-width:480px;margin:0 auto;display:flex;gap:12px;align-items:center;background:var(--s1);border:4px solid var(--gold);box-shadow:6px 6px 0 var(--inkc);border-radius:8px;padding:12px 14px}
  .instbar .ic{width:46px;height:46px;flex:none;border-radius:10px;background:#0A0912;display:grid;place-items:center;border:2px solid var(--inkc)}
  .instbar .ic svg{width:32px;height:32px}
  .instbar b{display:block;font-family:var(--display);font-size:20px;letter-spacing:.03em}
  .instbar small{color:var(--dim);font-size:13px}
  .instbar .x{background:none;border:0;color:var(--dim);font-size:20px;cursor:pointer;padding:4px}
  @media (min-width:900px){.instbar{bottom:24px;left:auto;right:24px}}
  .ios-steps{display:grid;gap:12px;margin:0;padding-left:22px}
  .ntf{display:grid;gap:10px}
  .ntf-i{display:flex;gap:12px;align-items:center;background:var(--s2);border:3px solid var(--inkc);border-radius:6px;padding:10px 12px}
  .ntf-i.new{border-color:var(--gold)}
  .ntf-i .tx{flex:1;min-width:0}
  .ntf-i .tx b{display:block}
  .ntf-i .tx small{color:var(--dim);font-size:12px}
  .ntf-i .ac{display:flex;gap:6px;flex-wrap:wrap}
  .ntf-i .ac button{font-size:13px;padding:6px 10px}
  .ntf-ic{font-size:26px;width:36px;text-align:center}
  .fr-list{display:grid;gap:8px}
  .fr-row{display:flex;gap:12px;align-items:center;background:var(--s2);border:3px solid var(--inkc);border-radius:6px;padding:8px 12px}
  .fr-row .tx{flex:1;min-width:0}
  .fr-row .tx b{display:block;cursor:pointer}
  .fr-row .tx small{font-size:12px;color:var(--dim)}
  .fr-row .on,.fr-row .tx small.on{color:var(--ok)}
  .fr-row .avw{position:relative}
  .fr-row .avw i{position:absolute;right:-3px;bottom:-3px;width:12px;height:12px;border-radius:50%;background:#666;border:2px solid var(--inkc);z-index:5}
  .fr-row .avw i.on{background:var(--ok)}
  .fr-row .ac{display:flex;gap:6px}
  .fr-row .ac button{font-size:13px;padding:6px 10px}
  .fr-add{display:flex;gap:8px}
  .fr-add input{flex:1;min-width:0}
  .ppfr{margin-top:12px}
  .lnvite{margin-top:6px}`;
  document.head.appendChild(st);

  /* ---------------- PWA ---------------- */
  const LOGO=`<img src="${(document.querySelector('.brandlogo')||{}).src||''}" alt="" style="width:40px;height:40px">`;
  (function(){ const h=document.head; const add=(tag,attrs)=>{ const e=document.createElement(tag); Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v)); h.appendChild(e); };
    if(location.protocol!=='file:'){ add('link',{rel:'manifest',href:'manifest.webmanifest'}); add('link',{rel:'apple-touch-icon',href:'mt-logo-192.png'}); }
    add('meta',{name:'apple-mobile-web-app-capable',content:'yes'}); add('meta',{name:'mobile-web-app-capable',content:'yes'});
    add('meta',{name:'apple-mobile-web-app-title',content:'Marvel TR'}); add('meta',{name:'apple-mobile-web-app-status-bar-style',content:'black-translucent'});
    if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')) navigator.serviceWorker.register('sw.js').catch(()=>{}); })();
  const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  let deferred=null;
  addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferred=e; showBar(); });
  addEventListener('appinstalled',()=>{ deferred=null; hideBar(); toast('Uygulama yüklendi!','Marvel Türkiye artık masaüstünde ve uygulamalarında.'); try{localStorage.setItem('mt_inst','1');}catch(e){} });
  function hideBar(){ const b=$('#instBar'); b&&b.remove(); }
  function showBar(){ if(standalone()||$('#instBar')) return; let skip=0; try{ skip=+localStorage.getItem('mt_inst_skip')||0; }catch(e){} if(Date.now()-skip<3*864e5) return;
    const d=document.createElement('div'); d.className='instbar'; d.id='instBar';
    d.innerHTML=`<span class="ic">${LOGO}</span><div style="flex:1;min-width:0"><b>Uygulama olarak yükle</b><small>Masaüstünden ya da telefonundan tek tıkla aç.</small></div><button class="btn p sm" id="instGo" type="button"><span class="bl"><span>Yükle</span><span>Yükle</span></span></button><button class="x" id="instX" type="button" aria-label="Kapat">✕</button>`;
    document.body.appendChild(d); G&&G.from(d,{y:120,opacity:0,duration:.6,ease:'back.out(1.6)'});
    $('#instGo').onclick=()=>installApp(); $('#instX').onclick=()=>{ try{localStorage.setItem('mt_inst_skip',Date.now());}catch(e){} hideBar(); }; }
  async function installApp(){
    if(standalone()) return toast('Zaten uygulamadasın','Marvel Türkiye uygulama olarak açık.');
    if(deferred){ deferred.prompt(); const r=await deferred.userChoice.catch(()=>null); deferred=null; hideBar(); if(r&&r.outcome==='accepted') SFX.play('win'); return; }
    openModal('Uygulama olarak yükle');
    if(location.protocol==='file:') return swap(`<p>Uygulama olarak yükleme, site internette yayındayken çalışır (örneğin <b>…web.app</b> adresinde). Dosyadan açınca tarayıcı izin vermez.</p>`);
    if(isIOS) return swap(`<ol class="ios-steps"><li>Safari'de alttaki <b>Paylaş</b> butonuna bas (kare ve yukarı ok).</li><li>Listeden <b>Ana Ekrana Ekle</b>'yi seç.</li><li><b>Ekle</b>'ye bas. Marvel Türkiye ikonu ana ekranında!</li></ol>`);
    swap(`<ol class="ios-steps"><li><b>Chrome / Edge (bilgisayar):</b> adres çubuğunun sağındaki <b>yükle</b> simgesine (ekran ve ok) bas, ya da menüden <b>Uygulamayı yükle</b>'yi seç.</li>
      <li><b>Android Chrome:</b> sağ üstteki ⋮ menüden <b>Ana ekrana ekle</b> ya da <b>Uygulamayı yükle</b>'ye bas.</li>
      <li><b>iPhone / iPad:</b> Safari'de <b>Paylaş → Ana Ekrana Ekle</b>.</li></ol>
      <p class="dim" style="margin:12px 0 0;font-size:14px">Yükleyince site kendi penceresinde, uygulama gibi açılır. Masaüstüne ve başlat menüsüne kısayolu eklenir.</p>`); }
  window.installApp=installApp;
  if(isIOS&&!standalone()) setTimeout(showBar,20000);
  /* footer ve hesap penceresine buton */
  (function(){ const fg=$('footer .fgrid'); if(fg){ const c=document.createElement('div'); c.innerHTML='<h5>Uygulama</h5><ul><li><a href="#" id="ftInst">📲 Masaüstüne / telefona yükle</a></li></ul>'; fg.appendChild(c); $('#ftInst').onclick=e=>{ e.preventDefault(); installApp(); }; } })();

  /* ---------------- ÇEVRİMİÇİ DURUMU ---------------- */
  let doing='Sitede';
  const _om=openModal; openModal=function(t){ _om(t); const tt=String(t||''); doing=/Kart|Bilgi|Ben Kimim|Hafıza|Yüksek|Yarışma|^0\d/.test(tt)?tt.replace(/^0\d · /,'')+' oynuyor':'Sitede'; };
  document.addEventListener('click',e=>{ const g=e.target.closest&&e.target.closest('[data-game]'); if(g) doing={cards:'Kahraman Kartları',guess:'Ben Kimim?',quiz:'Bilgi Yarışması',mem:'Kahraman Hafızası',hl:'Yüksek mi Düşük mü'}[g.dataset.game]+' oynuyor'; },true);
  function beat(){ if(!(FB.ready&&FB.user)||document.hidden||MTSET.hideOnline) return; const dn=window.__doingNow?window.__doingNow(doing):doing; if(beat._d===dn&&Date.now()-(beat._t||0)<230000) return; beat._d=dn; beat._t=Date.now(); FB.db.collection('users').doc(FB.user.uid).set({seen:firebase.firestore.FieldValue.serverTimestamp(),doing:dn},{merge:true}).catch(()=>{}); }
  setInterval(beat,45000); document.addEventListener('visibilitychange',()=>{ if(!document.hidden) beat(); });
  const isOn=d=>d&&d.seen&&d.seen.toDate&&(Date.now()-d.seen.toDate())<330000;

  /* ---------------- ARKADAŞLAR ---------------- */
  let REQ_IN=[], REQ_OUT=[], NOTIF=[], FRIENDS={}, unsubs=[];
  const meName=()=>AUTH.user?(AUTH.user.display||AUTH.user.username):'Oyuncu';
  const friendIds=()=>[...REQ_IN.filter(r=>r.status==='accepted').map(r=>r.from),...REQ_OUT.filter(r=>r.status==='accepted').map(r=>r.to)];
  const relation=uid=>{ if(friendIds().includes(uid)) return 'friend'; if(REQ_OUT.some(r=>r.to===uid&&r.status==='pending')) return 'sent'; if(REQ_IN.some(r=>r.from===uid&&r.status==='pending')) return 'incoming'; return 'none'; };
  async function sendReq(uid,name,avatar){ if(!(FB.ready&&FB.user)) return fbSignIn(); if(uid===FB.user.uid) return;
    if(relation(uid)==='incoming') return acceptReq(uid+'_'+FB.user.uid);
    const id=FB.user.uid+'_'+uid, ref=FB.db.collection('friendReqs').doc(id);
    try{ const ex=await ref.get().catch(()=>null); if(ex&&ex.exists){ if(ex.data().status==='pending') return toast('İstek zaten gönderildi','Kabul etmesini bekle.'); await ref.delete(); }
      await ref.set({from:FB.user.uid,to:uid,fromName:meName(),fromAvatar:(AUTH.user&&AUTH.user.avatar)||null,toName:name||'Oyuncu',toAvatar:avatar||null,status:'pending',at:firebase.firestore.FieldValue.serverTimestamp()});
      SFX.play('confirm'); toast('Arkadaşlık isteği gönderildi',`${name||'Oyuncu'} kabul edince arkadaş olacaksınız.`); }
    catch(e){ toast('Gönderilemedi',String(e.code||e.message)); } }
  async function acceptReq(id){ try{ await FB.db.collection('friendReqs').doc(id).set({status:'accepted'},{merge:true}); SFX.play('win'); toast('Artık arkadaşsınız!','Arkadaşlar listende görünüyor.'); }catch(e){ toast('Olmadı',String(e.code||e.message)); } }
  async function declineReq(id){ try{ await FB.db.collection('friendReqs').doc(id).delete(); SFX.play('click'); }catch(e){} }
  async function unfriend(uid){ const r=[...REQ_IN,...REQ_OUT].find(x=>(x.from===uid||x.to===uid)&&x.status==='accepted'); if(r) await declineReq(r.id); toast('Arkadaşlıktan çıkarıldı',''); }
  async function loadFriends(){ const ids=friendIds(); await Promise.all(ids.map(async id=>{ try{ const d=await FB.db.collection('users').doc(id).get(); if(d.exists) FRIENDS[id]={uid:id,...d.data()}; }catch(e){} }));
    Object.keys(FRIENDS).forEach(k=>{ if(!ids.includes(k)) delete FRIENDS[k]; }); }

  function listen(){ unsubs.forEach(u=>u()); unsubs=[]; if(!(FB.ready&&FB.user)) return; const uid=FB.user.uid, c=FB.db.collection('friendReqs');
    let firstIn=true, firstN=true, firstOut=true;
    unsubs.push(c.where('to','==',uid).onSnapshot(q=>{ const prev=REQ_IN.map(r=>r.id); REQ_IN=q.docs.map(d=>({id:d.id,...d.data()}));
      if(!firstIn) REQ_IN.filter(r=>r.status==='pending'&&!prev.includes(r.id)).forEach(r=>{ SFX.play('open'); toast('Arkadaşlık isteği',`${r.fromName||'Bir oyuncu'} seni arkadaş olarak eklemek istiyor.`); });
      firstIn=false; loadFriends().then(refresh); },()=>{}));
    unsubs.push(c.where('from','==',uid).onSnapshot(q=>{ const prevAcc=REQ_OUT.filter(r=>r.status==='accepted').map(r=>r.id); REQ_OUT=q.docs.map(d=>({id:d.id,...d.data()}));
      REQ_OUT.filter(r=>r.status==='accepted'&&!prevAcc.includes(r.id)&&!firstOut).forEach(r=>toast('İsteğin kabul edildi',`${r.toName||'Oyuncu'} artık arkadaşın!`)); firstOut=false; loadFriends().then(refresh); },()=>{}));
    unsubs.push(FB.db.collection('notifs').where('to','==',uid).onSnapshot(q=>{ const prev=NOTIF.map(n=>n.id); NOTIF=q.docs.map(d=>({id:d.id,...d.data()})).filter(n=>!n.at||!n.at.toDate||Date.now()-n.at.toDate()<864e5*2);
      if(!firstN) NOTIF.filter(n=>!prev.includes(n.id)&&n.type==='invite').forEach(n=>{ SFX.play('win'); buzz([40,60,40]); toastInvite(n); });
      firstN=false; refresh(); },()=>{}));
  }
  function toastInvite(n){ toast('🎮 Oyun daveti!',`${n.fromName||'Arkadaşın'} seni Kahraman Kartları odasına çağırıyor (${n.code}). 🔔 zilden katıl!`); }

  /* oyun odasına katılma (davetten) */
  function joinRoom(code){ closeModal&&closeModal(); const g=$('[data-game="cards"]'); if(!g) return; g.click();
    let t=0; const iv=setInterval(()=>{ t++; const j=$('#lJoin'); if(j){ clearInterval(iv); j.click();
        setTimeout(()=>{ const inp=$('#jCode'), f=$('#jf'); if(inp&&f){ inp.value=code; f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event('submit',{cancelable:true})); } },350); }
      if(t>40) clearInterval(iv); },150); }
  async function sendInvite(uid,code){ try{ await FB.db.collection('notifs').add({to:uid,from:FB.user.uid,fromName:meName(),type:'invite',code,at:firebase.firestore.FieldValue.serverTimestamp(),read:false});
      SFX.play('confirm'); toast('Davet gönderildi',`${(FRIENDS[uid]||{}).name||'Arkadaşın'} odaya çağrıldı.`); }catch(e){ toast('Gönderilemedi',String(e.code||e.message)); } }
  /* oda kodu ekranına "arkadaş çağır" butonu */
  new MutationObserver(()=>{ const cb=$('#lCode'); if(!cb||$('#lInvite')) return; const b=document.createElement('button'); b.className='ghost lnvite'; b.id='lInvite'; b.type='button'; b.textContent='👥 Arkadaş çağır';
    b.onclick=()=>pickFriend(cb.textContent.trim()); const wrap=cb.closest('.code'); wrap?wrap.after(b):cb.after(b); }).observe(document.body,{childList:true,subtree:true});
  function pickFriend(code){ if(!(FB.ready&&FB.user)) return toast('Önce giriş yap','Arkadaş çağırmak için Micup ile giriş.');
    const list=Object.values(FRIENDS).sort((a,b)=>isOn(b)-isOn(a));
    const box=document.createElement('div'); box.className='instbar'; box.style.bottom='24px'; box.style.flexDirection='column'; box.style.alignItems='stretch'; box.id='pickF';
    box.innerHTML=`<div style="display:flex;align-items:center"><b style="flex:1">Kimi çağıralım? (${esc(code)})</b><button class="x" type="button" id="pfX">✕</button></div>
      <div class="fr-list" style="max-height:300px;overflow:auto">${list.length?list.map(f=>`<div class="fr-row"><span class="avw">${avatarHTML({display:f.name,avatar:f.avatar,frame:f.frame||null},34)}<i class="${isOn(f)?'on':''}"></i></span><div class="tx"><b>${esc(f.name||'Oyuncu')}</b><small class="${isOn(f)?'on':''}">${isOn(f)?esc(f.doing||'Çevrimiçi'):'Çevrimdışı'}</small></div><div class="ac"><button class="btn p sm" data-inv="${f.uid}" type="button"><span class="bl"><span>Çağır</span><span>Çağır</span></span></button></div></div>`).join(''):'<p class="dim" style="margin:0">Henüz arkadaşın yok. Sıralamadan birinin profiline girip ekleyebilirsin.</p>'}</div>`;
    $('#pickF')&&$('#pickF').remove(); document.body.appendChild(box); $('#pfX').onclick=()=>box.remove();
    $$('[data-inv]',box).forEach(b=>b.onclick=()=>{ sendInvite(b.dataset.inv,code); b.disabled=true; b.querySelector('.bl').innerHTML='<span>Çağrıldı ✓</span><span>Çağrıldı ✓</span>'; }); }

  /* ---------------- ARKADAŞLAR PENCERESİ ---------------- */
  let ftab='list';
  async function openFriends(){ if(!(FB.ready&&FB.user)){ openModal('Arkadaşlar'); swap('<p>Arkadaş sistemi için Micup ile giriş yapmalısın.</p><button class="btn p" id="frIn" type="button"><span class="bl"><span>Micup ile giriş</span><span>Micup ile giriş</span></span></button>'); $('#frIn').onclick=()=>fbSignIn(); return; }
    openModal('Arkadaşlar'); await loadFriends(); drawFriends(); }
  window.openFriends=openFriends;
  function drawFriends(){ if(!$('#frWrap')&&mTitle.textContent!=='Arkadaşlar') return;
    const list=Object.values(FRIENDS).sort((a,b)=>isOn(b)-isOn(a)||(a.name||'').localeCompare(b.name||'','tr'));
    const inc=REQ_IN.filter(r=>r.status==='pending'), out=REQ_OUT.filter(r=>r.status==='pending'), onN=list.filter(isOn).length;
    swap(`<div class="ntf" id="frWrap"><div class="stabs"><button data-ft="list" class="${ftab==='list'?'on':''}" type="button">Arkadaşlarım (${list.length})</button><button data-ft="req" class="${ftab==='req'?'on':''}" type="button">İstekler${inc.length?` (${inc.length})`:''}</button><button data-ft="add" class="${ftab==='add'?'on':''}" type="button">+ Ekle</button></div>
      ${ftab==='list'?`<span class="mono dim">${onN} çevrimiçi</span><div class="fr-list">${list.length?list.map(f=>`<div class="fr-row"><span class="avw">${avatarHTML({display:f.name,avatar:f.avatar,frame:f.frame||null},40)}<i class="${isOn(f)?'on':''}"></i></span>
          <div class="tx"><b data-pf="${f.uid}" class="${f.nameColor?'nc-'+f.nameColor:''}">${esc(f.name||'Oyuncu')}</b><small class="${isOn(f)?'on':''}">${isOn(f)?'● '+esc(f.doing||'Çevrimiçi'):'Son görülme: '+(f.seen&&f.seen.toDate?f.seen.toDate().toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'bilinmiyor')}</small></div>
          <div class="ac"><button class="ghost" data-pf="${f.uid}" type="button">Profil</button><button class="ghost" data-unf="${f.uid}" type="button" title="Arkadaşlıktan çıkar">✕</button></div></div>`).join(''):'<p class="dim">Henüz arkadaşın yok. "+ Ekle" sekmesinden ya da sıralamadan birinin profilinden ekleyebilirsin.</p>'}</div>`:''}
      ${ftab==='req'?`<span class="mono dim">Gelen istekler</span><div class="fr-list">${inc.length?inc.map(r=>`<div class="fr-row">${avatarHTML({display:r.fromName,avatar:r.fromAvatar},40)}<div class="tx"><b>${esc(r.fromName||'Oyuncu')}</b><small>seni eklemek istiyor</small></div><div class="ac"><button class="btn p sm" data-acc="${r.id}" type="button"><span class="bl"><span>Kabul</span><span>Kabul</span></span></button><button class="ghost" data-dec="${r.id}" type="button">Reddet</button></div></div>`).join(''):'<p class="dim" style="margin:0">Bekleyen istek yok.</p>'}</div>
          <span class="mono dim">Gönderdiklerin</span><div class="fr-list">${out.length?out.map(r=>`<div class="fr-row">${avatarHTML({display:r.toName,avatar:r.toAvatar},40)}<div class="tx"><b>${esc(r.toName||'Oyuncu')}</b><small>cevap bekleniyor</small></div><div class="ac"><button class="ghost" data-dec="${r.id}" type="button">İptal</button></div></div>`).join(''):'<p class="dim" style="margin:0">Bekleyen gönderilmiş istek yok.</p>'}</div>`:''}
      ${ftab==='add'?`<p style="margin:0">Arkadaşının sitedeki adını yaz <b>veya Micup ID'sini (arkadaşlık kodu)</b> gir:</p><form class="fr-add" id="frF"><input class="field" id="frQ" maxlength="25" placeholder="Oyuncu adı veya Micup ID" autocomplete="off"><button class="btn p" type="submit"><span class="bl"><span>Ara</span><span>Ara</span></span></button></form><div class="fr-list" id="frRes"></div>
          <p class="dim" style="margin:0;font-size:14px">Kendi Micup ID'n Hesap pencerende "Arkadaşlık kodu" olarak yazar — onu arkadaşına ver, o da buraya yazsın. Ya da sıralamada birinin adına tıklayıp "Arkadaş ekle" de.</p>`:''}</div>`);
    $$('[data-ft]',mBody).forEach(b=>b.onclick=()=>{ ftab=b.dataset.ft; SFX.play('click'); drawFriends(); });
    $$('[data-pf]',mBody).forEach(b=>b.onclick=()=>window.openProfile(b.dataset.pf,{}));
    $$('[data-unf]',mBody).forEach(b=>b.onclick=()=>{ if(!b.dataset.ok){ b.dataset.ok=1; b.textContent='Emin misin?'; setTimeout(()=>{ delete b.dataset.ok; b.textContent='✕'; },2500); return; } unfriend(b.dataset.unf); });
    $$('[data-acc]',mBody).forEach(b=>b.onclick=()=>acceptReq(b.dataset.acc)); $$('[data-dec]',mBody).forEach(b=>b.onclick=()=>declineReq(b.dataset.dec));
    const f=$('#frF'); f&&(f.onsubmit=async e=>{ e.preventDefault(); const qraw=$('#frQ').value.trim(); const res=$('#frRes'); if(qraw.length<2) return; res.innerHTML='<span class="dim">Aranıyor…</span>';
      const qcode=qraw.replace(/^micup_/i,'').replace(/\s+/g,'');
      if(/^\d{15,25}$/.test(qcode)){ try{ const d=await FB.db.collection('users').doc('micup_'+qcode).get(); const docs=d.exists&&d.id!==FB.user.uid?[d]:[];
        res.innerHTML=docs.length?docs.map(d=>{ const x=d.data(), rel=relation(d.id); return `<div class="fr-row">${avatarHTML({display:x.name,avatar:x.avatar,frame:x.frame||null},40)}<div class="tx"><b>${esc(x.name)}</b><small>Micup ID: ${qcode}</small></div><div class="ac">${rel==='friend'?'<span class="on">Arkadaşsınız ✓</span>':rel==='sent'?'<span class="dim">İstek gönderildi</span>':`<button class="btn p sm" data-add="${d.id}" data-n="${esc(x.name)}" type="button"><span class="bl"><span>Ekle</span><span>Ekle</span></span></button>`}</div></div>`; }).join(''):'<p class="dim" style="margin:0">Bu Micup ID ile siteye üye oyuncu bulunamadı.</p>';
        $$('[data-add]',res).forEach(b=>b.onclick=()=>{ sendReq(b.dataset.add,b.dataset.n); b.disabled=true; }); return; }catch(err){ res.textContent='Arama yapılamadı.'; return; } }
      const q=qraw.replace(/\s+/g,' ');
      try{ const r=await FB.db.collection('users').where('name','==',q).limit(5).get(); const docs=r.docs.filter(d=>d.id!==FB.user.uid);
        res.innerHTML=docs.length?docs.map(d=>{ const x=d.data(), rel=relation(d.id); return `<div class="fr-row">${avatarHTML({display:x.name,avatar:x.avatar,frame:x.frame||null},40)}<div class="tx"><b>${esc(x.name)}</b><small>LV ${lvlOf(x.xp||0)}</small></div><div class="ac">${rel==='friend'?'<span class="on">Arkadaşsınız ✓</span>':rel==='sent'?'<span class="dim">İstek gönderildi</span>':`<button class="btn p sm" data-add="${d.id}" data-n="${esc(x.name)}" type="button"><span class="bl"><span>Ekle</span><span>Ekle</span></span></button>`}</div></div>`; }).join(''):'<p class="dim" style="margin:0">Bu isimde oyuncu bulunamadı. Büyük-küçük harfe dikkat et.</p>';
        $$('[data-add]',res).forEach(b=>b.onclick=()=>{ sendReq(b.dataset.add,b.dataset.n); b.disabled=true; }); }catch(err){ res.textContent='Arama yapılamadı.'; } }); }

  /* ---------------- BİLDİRİM ZİLİ ---------------- */
  let annNew=[];
  async function checkAnn(){ if(!FB.ready) return; let seen=0; try{ seen=+localStorage.getItem('mt_bell_ann')||0; }catch(e){}
    try{ const q=await FB.db.collection('announcements').orderBy('created','desc').limit(5).get(); annNew=q.docs.map(d=>({id:d.id,...d.data()})).filter(a=>a.created&&a.created.toDate&&+a.created.toDate()>seen); refresh(); }catch(e){} }
  function count(){ return REQ_IN.filter(r=>r.status==='pending').length+NOTIF.filter(n=>!n.read).length+annNew.length; }
  const bell=document.createElement('button'); bell.className='hbtn'; bell.id='bellBtn'; bell.type='button'; bell.setAttribute('aria-label','Bildirimler'); bell.innerHTML='🔔';
  const anchor=$('#dailyBtn'); anchor&&anchor.before(bell);
  bell.onclick=()=>{ SFX.play('click'); openBell(); };
  function refresh(){ const n=count(); let c=bell.querySelector('.cntb'); if(n){ if(!c){ c=document.createElement('span'); c.className='cntb'; bell.appendChild(c); } c.textContent=n>9?'9+':n; } else c&&c.remove();
    if(mTitle&&mTitle.textContent==='Bildirimler'&&!modal.hidden) drawBell(); if(mTitle&&mTitle.textContent==='Arkadaşlar'&&!modal.hidden&&!$('#frQ')) drawFriends(); }
  function openBell(){ openModal('Bildirimler'); drawBell();
    NOTIF.filter(n=>!n.read).forEach(n=>FB.db.collection('notifs').doc(n.id).set({read:true},{merge:true}).catch(()=>{}));
    setTimeout(()=>{ try{ localStorage.setItem('mt_bell_ann',Date.now()); }catch(e){} annNew=[]; },4000); }
  function drawBell(){
    const inc=REQ_IN.filter(r=>r.status==='pending'), inv=[...NOTIF].filter(n=>n.type==='invite').sort((a,b)=>(b.at&&b.at.toDate?+b.at.toDate():0)-(a.at&&a.at.toDate?+a.at.toDate():0)).slice(0,8);
    const onN=Object.values(FRIENDS).filter(isOn).length;
    const items=[
      ...inc.map(r=>`<div class="ntf-i new"><span class="ntf-ic">👋</span><div class="tx"><b>${esc(r.fromName||'Oyuncu')}</b><small>Arkadaşlık isteği gönderdi</small></div><div class="ac"><button class="btn p sm" data-acc="${r.id}" type="button"><span class="bl"><span>Kabul</span><span>Kabul</span></span></button><button class="ghost" data-dec="${r.id}" type="button">Reddet</button></div></div>`),
      ...inv.map(n=>{ const old=n.at&&n.at.toDate&&Date.now()-n.at.toDate()>30*6e4; return `<div class="ntf-i${n.read?'':' new'}"><span class="ntf-ic">🎮</span><div class="tx"><b>${esc(n.fromName||'Arkadaşın')}</b><small>Kahraman Kartları odasına çağırdı · ${esc(n.code)}${old?' · süresi geçmiş olabilir':''}</small></div><div class="ac"><button class="btn p sm" data-join="${esc(n.code)}" type="button"><span class="bl"><span>Katıl</span><span>Katıl</span></span></button><button class="ghost" data-del="${n.id}" type="button">✕</button></div></div>`; }),
      ...annNew.map(a=>`<div class="ntf-i new"><span class="ntf-ic">📣</span><div class="tx"><b>${esc(a.title||'Duyuru')}</b><small>${esc((a.text||'').slice(0,90))}${(a.text||'').length>90?'…':''}</small></div><div class="ac"><button class="ghost" data-ann type="button">Gör</button></div></div>`)];
    swap(`<div class="ntf"><button class="btn g" id="bFr" type="button" style="justify-content:center"><span class="bl"><span>👥 Arkadaşlar · ${onN} çevrimiçi</span><span>👥 Arkadaşlar · ${onN} çevrimiçi</span></span></button>
      ${FB.user?'':'<p class="dim" style="margin:0">Bildirimler ve arkadaşlar için Micup ile giriş yap.</p>'}
      ${items.length?items.join(''):'<div class="empty"><b>Bildirim yok</b><span>Arkadaşlık istekleri, oyun davetleri ve yeni duyurular burada görünür.</span></div>'}</div>`);
    $('#bFr').onclick=()=>openFriends();
    $$('[data-acc]',mBody).forEach(b=>b.onclick=()=>acceptReq(b.dataset.acc)); $$('[data-dec]',mBody).forEach(b=>b.onclick=()=>declineReq(b.dataset.dec));
    $$('[data-join]',mBody).forEach(b=>b.onclick=()=>joinRoom(b.dataset.join));
    $$('[data-del]',mBody).forEach(b=>b.onclick=()=>FB.db.collection('notifs').doc(b.dataset.del).delete().catch(()=>{}));
    $$('[data-ann]',mBody).forEach(b=>b.onclick=()=>{ closeModal(); location.hash='#ana'; setTimeout(()=>{ const d=$('#duyurular'); d&&d.scrollIntoView({behavior:'smooth'}); },700); });
  }

  /* profil sayfasına arkadaş ekle butonu */
  const _op=window.openProfile;
  window.openProfile=async function(uid,row,rank){ await _op(uid,row,rank); if(!uid||!FB.user||uid===FB.user.uid) return; const head=$('.pp-head>div'); if(!head||$('.ppfr')) return;
    const rel=relation(uid), d=document.createElement('div'); d.className='ppfr';
    d.innerHTML=rel==='friend'?'<span class="on" style="color:var(--ok);font-weight:800">✓ Arkadaşsınız</span>':rel==='sent'?'<span class="dim">İstek gönderildi</span>':`<button class="btn p sm" id="ppAdd" type="button"><span class="bl"><span>${rel==='incoming'?'İsteği kabul et':'➕ Arkadaş ekle'}</span><span>${rel==='incoming'?'İsteği kabul et':'➕ Arkadaş ekle'}</span></span></button>`;
    head.appendChild(d); const b=$('#ppAdd'); b&&(b.onclick=()=>{ const nm=$('.pp-name')?$('.pp-name').textContent:'Oyuncu'; sendReq(uid,nm,row&&row.avatar); b.disabled=true; }); };

  /* hesap penceresine arkadaşlar + uygulama butonu */
  const _oa=openAccount;
  openAccount=function(){ _oa(); const lg=$('.lg'); if(!lg||$('#acFr')) return; const ac=$('#acCoins'); const box=ac?ac.parentNode:lg;
    const b=document.createElement('button'); b.id='acFr'; b.type='button'; b.className='ghost'; b.textContent='👥 Arkadaşlar'; b.onclick=()=>openFriends(); box.appendChild(b);
    if(AUTH.user&&AUTH.user.micup&&AUTH.user.id){ const cd=document.createElement('div'); cd.style.cssText='margin:8px 0 0;font-size:13px;color:var(--dim)'; cd.innerHTML='Arkadaşlık kodun (Micup ID): <b style="color:var(--fg);font-family:var(--mono,monospace);user-select:all">'+esc(String(AUTH.user.id))+'</b> — arkadaş eklerken bu kodu paylaş.'; box.appendChild(cd); }
    if(!standalone()){ const i=document.createElement('button'); i.type='button'; i.className='ghost'; i.textContent='📲 Uygulamayı yükle'; i.onclick=()=>installApp(); box.appendChild(i); } };

  (function w(){ if(FB.ready&&FB.auth){ FB.auth.onAuthStateChanged(u=>{ REQ_IN=[];REQ_OUT=[];NOTIF=[];FRIENDS={}; listen(); refresh(); if(u){ setTimeout(beat,2000); setTimeout(checkAnn,3000); } }); } else setTimeout(w,800); })();
  setInterval(()=>{ if(FB.user&&!document.hidden) loadFriends().then(refresh); },90000);
})();


/* ========================= HERKESE AÇIK ODALAR (lobi tarayıcı) + GENEL SOHBET ========================= */
(function(){
  const st=document.createElement('style'); st.textContent=`
  .rb-ov{position:fixed;inset:0;z-index:9000;background:rgba(4,4,7,.75);backdrop-filter:blur(6px);display:grid;place-items:center;padding:16px}
  .rb{width:min(560px,100%);max-height:min(640px,90vh);display:flex;flex-direction:column;background:var(--s1);border:5px solid var(--inkc);box-shadow:9px 9px 0 var(--inkc);border-radius:6px;overflow:hidden}
  .rb-h{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:4px solid var(--inkc);background:var(--s2)}
  .rb-h b{flex:1;font-family:var(--display);font-size:26px;letter-spacing:.04em}
  .rb-h button{background:none;border:2px solid var(--line2);color:var(--fg);width:36px;height:36px;border-radius:4px;cursor:pointer}
  .rb-l{overflow-y:auto;padding:14px;display:grid;gap:10px}
  .rr{display:flex;gap:12px;align-items:center;background:var(--s2);border:3px solid var(--inkc);border-radius:6px;padding:10px 12px}
  .rr .tx{flex:1;min-width:0}
  .rr .tx b{display:block;font-size:16px}
  .rr .tx small{color:var(--dim);font-size:12px}
  .rr .seats{display:flex;gap:3px}
  .rr .seats i{width:12px;height:16px;border-radius:3px;background:var(--s1);border:2px solid var(--line2)}
  .rr .seats i.f{background:var(--gold);border-color:var(--inkc)}
  .rr.full{opacity:.55}
  .rb-f{padding:12px 16px;border-top:4px solid var(--inkc);display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .pubt{display:flex;align-items:center;gap:10px;margin-top:8px;font-size:14px;cursor:pointer;user-select:none}
  .pubt input{width:20px;height:20px;accent-color:var(--gold)}
  .lbtn.pubbtn{border-color:var(--gold)!important}
  .lbtn.pubbtn b::after{content:attr(data-n);margin-left:8px;background:var(--red);color:#fff;border-radius:99px;padding:0 8px;font-size:.6em;vertical-align:middle}
  #liveRooms{display:grid;gap:10px}
  /* genel sohbet */
  .gcB{position:fixed;left:calc(var(--gx) + 4px);bottom:calc(22px + env(safe-area-inset-bottom,0px));z-index:65;width:58px;height:58px;border-radius:50%;background:var(--red);border:4px solid var(--inkc);box-shadow:4px 4px 0 var(--inkc);font-size:26px;cursor:pointer;display:grid;place-items:center;transition:transform .2s}
  .gcB:hover{transform:translate(-2px,-2px) rotate(6deg)}
  .gcB span{position:absolute;right:-6px;top:-6px;min-width:22px;height:22px;border-radius:11px;background:var(--gold);color:var(--inkc);font:800 12px/22px var(--body);padding:0 5px;border:2px solid var(--inkc)}
  @media (max-width:820px){.gcB{bottom:calc(84px + env(safe-area-inset-bottom,0px));width:52px;height:52px;font-size:23px}}
  .gc{position:fixed;left:calc(var(--gx) + 4px);bottom:calc(94px + env(safe-area-inset-bottom,0px));z-index:66;width:min(400px,calc(100% - 32px));height:min(560px,calc(100% - 180px));display:flex;flex-direction:column;background:var(--s1);border:5px solid var(--inkc);box-shadow:8px 8px 0 var(--inkc);border-radius:8px;overflow:hidden}
  @media (max-width:820px){.gc{bottom:calc(146px + env(safe-area-inset-bottom,0px));height:calc(100% - 230px)}}
  .gc-h{display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--red);color:#fff;border-bottom:4px solid var(--inkc)}
  .gc-h b{flex:1;font-family:var(--display);font-size:22px;letter-spacing:.04em}
  .gc-h small{font-size:12px;opacity:.85}
  .gc-h button{background:rgba(0,0,0,.25);border:0;color:#fff;width:32px;height:32px;border-radius:4px;cursor:pointer;font-size:16px}
  .gc-l{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px;overscroll-behavior:contain}
  .gm{display:flex;gap:8px;align-items:flex-start}
  .gm .av{width:30px!important;height:30px!important;font-size:13px!important;cursor:pointer}
  .gm .bd{flex:1;min-width:0;background:var(--s2);border:2px solid var(--inkc);border-radius:4px 10px 10px 10px;padding:6px 10px;position:relative}
  .gm.me{flex-direction:row-reverse}
  .gm.me .bd{background:#2a2040;border-radius:10px 4px 10px 10px}
  .gm .nm{font-weight:800;font-size:13px;cursor:pointer}
  .gm .tm{font-size:10px;color:var(--faint);margin-left:6px}
  .gm .tx{font-size:14px;line-height:1.4;word-break:break-word;white-space:pre-wrap}
  .gm .adm{position:absolute;right:4px;top:3px;display:none;gap:4px}
  .gm:hover .adm,.gm .adm.show{display:flex}
  .gm .adm button{background:var(--s1);border:1px solid var(--line2);color:var(--fg);font-size:11px;padding:1px 6px;border-radius:4px;cursor:pointer}
  .gm.sys .bd{background:none;border:0;text-align:center;color:var(--dim);font-size:12px}
  .gc-e{display:flex;gap:4px;padding:6px 8px;border-top:3px solid var(--inkc);background:var(--s2);overflow-x:auto}
  .gc-e button{font-size:18px;min-width:34px;height:32px;border-radius:8px;background:var(--s1);border:2px solid var(--inkc);cursor:pointer}
  .gc-f{display:flex;gap:6px;padding:8px;border-top:3px solid var(--inkc)}
  .gc-f input{flex:1;min-width:0;background:var(--ink);border:2px solid var(--inkc);color:var(--fg);border-radius:6px;padding:9px;font:inherit;font-size:14px}
  .gc-f button{background:var(--red);color:#fff;font-family:var(--display);font-size:17px;padding:0 12px;border:2px solid var(--inkc);border-radius:6px;cursor:pointer}
  .gc-in{padding:14px;text-align:center;display:grid;gap:10px;justify-items:center}`;
  document.head.appendChild(st);

  /* ===================== HERKESE AÇIK ODALAR ===================== */
  let ROOMS=[], roomUnsub=null, myRoom=null, myRoomT=null, isPublic=true;
  const fresh=r=>!r.updated||!r.updated.toDate||Date.now()-r.updated.toDate()<150000;
  function pubStatus(k,e){ const el=$('#pubS'); if(!el) return; el.innerHTML=k==='ok'?'<span style="color:var(--ok)">✓ Odan açık odalar listesinde, herkes görüp katılabilir</span>':k==='login'?'<span style="color:var(--gold)">⚠ Listede görünmesi için Micup ile giriş yap</span> <button class="ghost" type="button" id="pubIn" style="padding:2px 8px;font-size:12px">Giriş yap</button>':k==='off'?'<span class="dim">Oda gizli, sadece kodu bilenler girebilir</span>':`<span style="color:var(--red2,#ff5a6a)">✕ Listeye eklenemedi (${esc(String((e&&e.code)||e||''))}). Firebase kurallarını güncellediğinden emin ol.</span>`; const b=$('#pubIn'); b&&(b.onclick=()=>fbSignIn()); }
  const openRooms=()=>ROOMS.filter(r=>r.status==='open'&&fresh(r)&&(r.players||1)<4).sort((a,b)=>(b.players||1)-(a.players||1));
  function listenRooms(){ if(roomUnsub||!FB.ready) return; roomUnsub=FB.db.collection('rooms').where('status','==','open').onSnapshot(q=>{ ROOMS=q.docs.map(d=>({id:d.id,...d.data()})); drawRooms(); },()=>{}); }
  setInterval(drawRooms,15000);

  /* oda kodu görünce (kurucu) odayı kaydet ve güncel tut */
  function lobbyState(){ const code=$('#lCode'); const arena=$('#arena'); if(!arena||arena.hidden) return {gone:true};
    if(code) return {code:code.textContent.trim(),players:$$('.plist li').filter(li=>!li.classList.contains('empty')&&li.querySelector('b')).length||1,status:'open'};
    if(myRoom) return {code:myRoom,status:'playing'}; return {gone:true}; }
  let lastSig='';
  async function syncRoom(force){
    if(!(FB.ready&&FB.user)){ if($('#lCode')) pubStatus('login'); return; } const s=lobbyState(); if(!isPublic&&!s.gone) pubStatus('off');
    if(s.gone||!isPublic){ if(myRoom){ const id=myRoom; myRoom=null; lastSig=''; FB.db.collection('rooms').doc(id).delete().catch(()=>{}); } return; }
    if(!s.code) return; const isHostRoom=!!$('#lAddBot')||!!$('#lStart')||(myRoom===s.code);
    if(!isHostRoom) return;
    if(myRoom&&myRoom!==s.code){ FB.db.collection('rooms').doc(myRoom).delete().catch(()=>{}); }
    myRoom=s.code; const sig=[s.code,s.players,s.status].join('|'); if(sig===lastSig&&force!==true) return; lastSig=sig;
    const u=AUTH.user||{}; FB.db.collection('rooms').doc(s.code).set({code:s.code,host:FB.user.uid,hostName:u.display||u.username||'Oyuncu',hostAvatar:u.avatar||null,hostFrame:prog().frame||null,
      players:s.players||1,status:s.status,game:'cards',updated:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}).then(()=>pubStatus('ok')).catch(e=>{ lastSig=''; pubStatus('err',e); });
  }
  let syncT=null; const syncSoon=()=>{ clearTimeout(syncT); syncT=setTimeout(syncRoom,600); };
  setInterval(()=>syncRoom(true),25000);
  addEventListener('pagehide',()=>{ if(myRoom&&FB.ready) FB.db.collection('rooms').doc(myRoom).delete().catch(()=>{}); });

  /* lobi ekranlarına eklemeler */
  new MutationObserver(()=>{
    // menü: açık odalar butonu
    const lb0=$('.lbtns'); if(lb0&&!$('#lPubList')){ const d=document.createElement('div'); d.id='lPubList'; d.style.cssText='display:grid;gap:8px;margin-top:14px'; lb0.after(d); listenRooms(); setTimeout(drawRooms,50); }
    const lb=$('.lbtns'); if(lb&&!$('#lPublic')){ const b=document.createElement('button'); b.className='lbtn pubbtn'; b.id='lPublic'; b.type='button';
      b.innerHTML=`<b data-n="${openRooms().length}">🌍 Açık odalar</b><span>Herkese açık odalara bak, istediğine katıl</span>`; lb.prepend(b); b.onclick=()=>{ SFX.play('click'); openBrowser(); }; }
    // oda ekranı (kurucu): herkese açık anahtarı
    const code=$('#lCode'); if(code&&($('#lAddBot')||$('#lStart'))&&!$('#pubT')){ const lab=document.createElement('label'); lab.className='pubt'; lab.id='pubT';
      lab.innerHTML=`<input type="checkbox" ${isPublic?'checked':''}> <span>🌍 Herkese açık oda — <b>${FB.user?'açık odalar listesinde görünür':'görünmesi için Micup ile gir'}</b></span>`;
      const after=$('#lInvite')||code.closest('.code')||code; after.after(lab); const ps=document.createElement('div'); ps.id='pubS'; ps.style.cssText='font-size:13px;margin-top:4px'; lab.after(ps); syncRoom(true); lab.querySelector('input').onchange=e=>{ isPublic=e.target.checked; SFX.play('click'); syncRoom(); }; }
    syncSoon();
  }).observe(document.body,{childList:true,subtree:true});

  function roomRow(r){ const n=r.players||1; return `<div class="rr${n>=4?' full':''}">${avatarHTML({display:r.hostName,avatar:r.hostAvatar,frame:r.hostFrame||null},40)}
    <div class="tx"><b>${esc(r.hostName||'Oyuncu')}'in odası</b><small>Kahraman Kartları · ${esc(r.code)} · ${n}/4 oyuncu</small></div>
    <span class="seats">${[0,1,2,3].map(i=>`<i class="${i<n?'f':''}"></i>`).join('')}</span>
    <button class="btn p sm" data-jr="${esc(r.code)}" type="button" ${n>=4?'disabled':''}><span class="bl"><span>Katıl</span><span>Katıl</span></span></button></div>`; }
  function openBrowser(){ listenRooms(); $('#rbOv')&&$('#rbOv').remove(); const ov=document.createElement('div'); ov.className='rb-ov'; ov.id='rbOv';
    ov.innerHTML=`<div class="rb"><div class="rb-h"><b>🌍 Açık odalar</b><button type="button" id="rbX" aria-label="Kapat">✕</button></div><div class="rb-l" id="rbL"></div>
      <div class="rb-f"><span class="dim" style="flex:1;font-size:13px;min-width:180px">Kendi odanı kurup "Herkese açık" seçersen burada herkes görür.</span><button class="ghost" id="rbNew" type="button">+ Oda kur</button></div></div>`;
    document.body.appendChild(ov); ov.onclick=e=>{ if(e.target===ov) ov.remove(); }; $('#rbX').onclick=()=>ov.remove();
    $('#rbNew').onclick=()=>{ ov.remove(); const c=$('#lCreate'); c&&c.click(); };
    drawRooms(); G&&G.from('.rb',{y:40,opacity:0,duration:.4,ease:'back.out(1.6)'}); }
  function drawRooms(){
    const list=openRooms().filter(r=>!FB.user||r.host!==FB.user.uid);
    const L=$('#rbL'); if(L){ L.innerHTML=!FB.ready?'<p class="dim">Açık odalar için Firebase bağlantısı gerekiyor.</p>':list.length?list.map(roomRow).join(''):'<div class="empty"><b>Şu an açık oda yok</b><span>İlk odayı sen kur, insanlar gelsin!</span></div>'; bindJoin(L); }
    const ll=$('#lPubList'); if(ll){ ll.innerHTML=`<span class="mono" style="color:var(--gold)">🌍 Şu an açık odalar (${list.length})</span>`+(list.length?list.slice(0,4).map(roomRow).join(''):'<p class="dim" style="margin:0;font-size:14px">Açık oda yok. "Oda kur" de, herkes görsün!</p>'); bindJoin(ll); }
    const lr=$('#liveRooms'); if(lr){ lr.innerHTML=list.length?list.slice(0,5).map(roomRow).join(''):'<p class="dim" style="margin:0">Şu an açık oda yok. Kahraman Kartları\'nda oda kurup "Herkese açık" seçebilirsin.</p>'; bindJoin(lr); }
    const pb=$('#lPublic b'); if(pb) pb.dataset.n=list.length;
  }
  function bindJoin(root){ $$('[data-jr]',root).forEach(b=>b.onclick=()=>{ SFX.play('click'); joinCode(b.dataset.jr); }); }
  function joinCode(code){ $('#rbOv')&&$('#rbOv').remove(); const arena=$('#arena');
    const go=()=>{ let t=0; const iv=setInterval(()=>{ t++; const j=$('#lJoin'); if(j){ clearInterval(iv); j.click(); setTimeout(()=>{ const i=$('#jCode'), f=$('#jf'); if(i&&f){ i.value=code; f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event('submit',{cancelable:true})); } else { const n=$('#lName'); n&&n.focus(); toast('Önce adını yaz','Sonra tekrar Katıl\'a bas.'); } },300); } if(t>40) clearInterval(iv); },150); };
    if(!arena||arena.hidden){ closeModal&&closeModal(); const g=$('[data-game="cards"]'); g&&g.click(); }
    else if(!$('#lJoin')){ toast('Önce bu odadan çık','Lobiye dönünce açık odaya katılabilirsin.'); return; }
    go(); }
  window.openRoomBrowser=openBrowser;
  /* Oyunlar sayfasında canlı oda listesi */
  (function(){ const vo=$('#v-oyunlar .band .wrap'); if(!vo) return; const d=document.createElement('div'); d.className='xpanel'; d.style.marginTop='28px';
    d.innerHTML=`<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span class="cap">Canlı</span><h3 style="margin:0;flex:1">🌍 Şu an açık odalar</h3><button class="ghost" id="lrAll" type="button">Tümünü gör</button></div><div id="liveRooms"></div>`;
    vo.appendChild(d); $('#lrAll').onclick=()=>openBrowser(); })();

  /* ===================== GENEL SOHBET ===================== */
  const BAD=['amk','aq','orospu','oç','piç','sik','yarrak','göt','siktir','ananı','amına','pezevenk','gavat','kahpe','ibne'];
  const clean=t=>t.replace(/\S+/g,w=>{ const n=w.toLocaleLowerCase('tr').replace(/[^a-zçğıöşü]/g,''); return BAD.some(b=>n===b||(b.length>3&&n.startsWith(b)))?'*'.repeat(w.length):w; });
  let MSG=[], chatUnsub=null, open=false, unread=0, lastSend=0, muted=false;
  try{ open=false; }catch(e){}
  const btn=document.createElement('button'); btn.className='gcB'; btn.id='gcB'; btn.type='button'; btn.setAttribute('aria-label','Genel sohbet'); btn.innerHTML='💬'; document.body.appendChild(btn);
  const panel=document.createElement('div'); panel.className='gc'; panel.id='gc'; panel.hidden=true;
  panel.innerHTML=`<div class="gc-h"><b>Genel sohbet</b><small id="gcOn"></small><button type="button" id="gcX" aria-label="Kapat">✕</button></div><div class="gc-l" id="gcL"></div>
    <div class="gc-e">${['😂','🔥','💪','👏','😎','🤯','❤️','GG','⚡','🛡️'].map(e=>`<button type="button" data-e="${e}">${e}</button>`).join('')}</div>
    <form class="gc-f" id="gcF"><input id="gcI" maxlength="200" placeholder="Mesaj yaz…" autocomplete="off"><button type="submit">Gönder</button></form>`;
  document.body.appendChild(panel);
  // oyun açıkken sohbet butonu gizlensin (oyunun kendi sohbeti var)
  setInterval(()=>{ const a=$('#arena'); btn.style.display=a&&!a.hidden?'none':''; if(a&&!a.hidden&&open) toggle(false); },800);
  function toggle(v){ open=v===undefined?!open:v; panel.hidden=!open; if(open){ unread=0; badge(); listenChat(); draw(true); G&&G.fromTo(panel,{y:30,opacity:0},{y:0,opacity:1,duration:.35,ease:'back.out(1.6)'}); setTimeout(()=>{ if(!isMob()) $('#gcI').focus(); },100); } }
  btn.onclick=()=>{ SFX.play('click'); toggle(); }; $('#gcX').onclick=()=>toggle(false);
  function badge(){ let s=btn.querySelector('span'); if(unread>0){ if(!s){ s=document.createElement('span'); btn.appendChild(s); } s.textContent=unread>9?'9+':unread; } else s&&s.remove(); }
  function listenChat(){ if(chatUnsub||!FB.ready) return; let first=true;
    chatUnsub=FB.db.collection('chat').orderBy('at','desc').limit(25).onSnapshot(q=>{ const prev=new Set(MSG.map(m=>m.id)); MSG=q.docs.map(d=>({id:d.id,...d.data()})).reverse();
      const nw=MSG.filter(m=>!prev.has(m.id)&&(!FB.user||m.uid!==FB.user.uid)); if(!first&&!open&&nw.length){ unread+=nw.length; badge(); }
      first=false; draw(); },()=>{}); }
  (function w(){ if(FB.ready){ listenChat(); listenRooms(); } else setTimeout(w,1000); })();
  function draw(force){ const L=$('#gcL'); if(!L||!open) return; const atBottom=force||L.scrollHeight-L.scrollTop-L.clientHeight<80; const me=FB.user&&FB.user.uid;
    if(!FB.ready){ L.innerHTML='<div class="gm sys"><div class="bd">Sohbet için Firebase bağlantısı gerekiyor.</div></div>'; return; }
    L.innerHTML='<div class="gm sys"><div class="bd">Saygılı ol, küfür ve spam yasak. Adminler mesaj silebilir.</div></div>'+MSG.map(m=>{ const t=m.at&&m.at.toDate?m.at.toDate():new Date();
      return `<div class="gm${m.uid===me?' me':''}" data-id="${m.id}">${avatarHTML({display:m.name,avatar:m.avatar,frame:m.frame||null},30).replace('<span class="av','<span data-pu="'+esc(m.uid)+'" class="av')}
        <div class="bd"><span class="nm ${m.nc?'nc-'+m.nc:''}" data-pu="${esc(m.uid)}">${esc(m.name||'Oyuncu')}</span><span class="tm">${t.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</span>
          <div class="tx">${esc(m.text||'')}</div>${FB.admin||m.uid===me?`<span class="adm"><button type="button" data-delm="${m.id}">Sil</button>${FB.admin&&m.uid!==me?`<button type="button" data-mute="${esc(m.uid)}" data-mn="${esc(m.name||'')}">Sustur</button>`:''}</span>`:''}</div></div>`; }).join('');
    if(!FB.user){ L.insertAdjacentHTML('beforeend','<div class="gc-in"><span class="dim">Yazmak için Micup ile giriş yap.</span><button class="btn p sm" id="gcIn" type="button"><span class="bl"><span>Micup ile giriş</span><span>Micup ile giriş</span></span></button></div>'); $('#gcIn').onclick=()=>fbSignIn(); }
    if(atBottom) L.scrollTop=L.scrollHeight;
    $$('[data-pu]',L).forEach(e=>e.onclick=()=>{ if(e.dataset.pu) window.openProfile(e.dataset.pu,{}); });
    $$('[data-delm]',L).forEach(b=>b.onclick=()=>FB.db.collection('chat').doc(b.dataset.delm).delete().then(()=>SFX.play('click')).catch(e=>toast('Silinemedi',String(e.code||e.message))));
    $$('[data-mute]',L).forEach(b=>b.onclick=()=>{ if(!b.dataset.ok){ b.dataset.ok=1; b.textContent='Emin misin?'; return; }
      FB.db.collection('muted').doc(b.dataset.mute).set({name:b.dataset.mn,by:FB.user.uid,at:firebase.firestore.FieldValue.serverTimestamp()}).then(()=>toast('Susturuldu',`${b.dataset.mn} artık sohbete yazamaz. Kaldırmak için Firebase'de muted koleksiyonundan sil.`)).catch(e=>toast('Olmadı',String(e.code||e.message))); });
    const onl=$('#gcOn'); if(onl) onl.textContent=MSG.length?`${new Set(MSG.slice(-30).map(m=>m.uid)).size} kişi konuştu`:'';
  }
  $$('.gc-e button',panel).forEach(b=>b.onclick=()=>{ const i=$('#gcI'); i.value=(i.value+' '+b.dataset.e).trim(); i.focus(); });
  $('#gcF').onsubmit=async e=>{ e.preventDefault(); if(!(FB.ready&&FB.user)) return fbSignIn(); const i=$('#gcI'); let t=i.value.replace(/\s+/g,' ').trim(); if(!t) return;
    if(Date.now()-lastSend<3000) return toast('Biraz yavaş','Mesajlar arasında 3 saniye bekle.');
    if(muted) return toast('Susturuldun','Bir admin seni sohbette susturdu.');
    t=clean(t).slice(0,200); lastSend=Date.now(); i.value=''; const s=prog(), u=AUTH.user||{};
    try{ await FB.db.collection('chat').add({uid:FB.user.uid,name:u.display||u.username||'Oyuncu',avatar:u.avatar||null,frame:s.frame||null,nc:s.nameColor||null,text:t,at:firebase.firestore.FieldValue.serverTimestamp()}); SFX.play('click'); }
    catch(err){ if(String(err.code).includes('permission')){ muted=true; toast('Mesaj gönderilemedi','Susturulmuş olabilirsin.'); } else toast('Gönderilemedi',String(err.code||err.message)); i.value=t; } };
})();


/* ========================= ADMİN PUAN VER: kendine ya da herkese, sezon/hafta sıralamasına da işler ========================= */
(function(){
  const wkId=()=>{ const t=new Date(Date.now()+3*3600e3); return new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate()-t.getUTCDay())).toISOString().slice(0,10); };
  async function givePoints(uid,v){
    const ref=FB.db.collection('users').doc(uid), d=(await ref.get()).data()||{}, S=SEASON().id, W=wkId(), inc=firebase.firestore.FieldValue.increment;
    const up=window.__scoreUp(d,v,S,W,true);
    await ref.set(up,{merge:true});
    if(FB.user&&uid===FB.user.uid){ try{ const k='mt_pts_'+(AUTH.user?(AUTH.user.id||AUTH.user.username):'anon'); const s=JSON.parse(localStorage.getItem(k)||'null')||{points:0,best:0,games:0}; s.points=Math.max(-99999,s.points+v); localStorage.setItem(k,JSON.stringify(s)); }catch(e){} renderUser(); }
    return d.name||'Oyuncu'; }
  const _oa=openAdmin;
  openAdmin=function(){ _oa(); const f=$('#admP'); if(!f||!FB.admin) return;
    f.innerHTML=`<label class="mono dim" for="pN">Oyuncu adı</label>
      <div style="display:flex;gap:8px"><input class="field" id="pN" placeholder="Sıralamadaki adı" list="pNl" autocomplete="off" required><button class="ghost" id="pMe" type="button" style="white-space:nowrap">Kendime</button></div><datalist id="pNl"></datalist>
      <label class="mono dim" for="pV">Puan (eksi de yazabilirsin)</label><input class="field" id="pV" type="number" value="100" step="50" required>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${[100,500,1000,5000,-100].map(n=>`<button class="ghost" type="button" data-pq="${n}">${n>0?'+':''}${n}</button>`).join('')}</div>
      <button class="btn p" type="submit"><span class="bl"><span>Uygula</span><span>Uygula</span></span></button>
      <p class="dim" style="margin:0;font-size:13px">Puan hem tüm zamanlar puanına hem bu sezonun ve bu haftanın sıralamasına yazılır.</p>`;
    FB.db.collection('users').orderBy('sp','desc').limit(50).get().then(q=>{ const dl=$('#pNl'); if(dl) dl.innerHTML=q.docs.map(d=>`<option value="${esc(d.data().name||'')}">`).join(''); }).catch(()=>{});
    $('#pMe').onclick=()=>{ $('#pN').value=AUTH.user?(AUTH.user.display||AUTH.user.username):''; $('#pN').dataset.me='1'; SFX.play('click'); };
    $('#pN').oninput=()=>{ delete $('#pN').dataset.me; };
    $$('[data-pq]',f).forEach(b=>b.onclick=()=>{ $('#pV').value=b.dataset.pq; SFX.play('click'); });
    f.onsubmit=async e=>{ e.preventDefault(); const n=$('#pN').value.trim(), v=parseInt($('#pV').value,10)||0; if(!v) return;
      const btn=f.querySelector('button[type=submit]'); btn.disabled=true;
      try{ let uid=null; if($('#pN').dataset.me&&FB.user) uid=FB.user.uid;
        else { const q=await FB.db.collection('users').where('name','==',n).limit(1).get(); if(q.empty){ btn.disabled=false; return toast('Bulunamadı','Bu isimde oyuncu yok. Listeden seç ya da "Kendime"ye bas.'); } uid=q.docs[0].id; }
        const nm=await givePoints(uid,v); SFX.play('win'); toast('Puan verildi',`${nm}: ${v>0?'+':''}${v.toLocaleString('tr-TR')} puan`); renderBoards(); }
      catch(err){ toast('Olmadı',String(err.code||err.message)); }
      btn.disabled=false; };
  };
})();


/* ========================= ADMİN ÖDÜL VER: puan, coin, XP, kart, paket, çerçeve, isim rengi (tek kişiye ya da herkese) ========================= */
(function(){
  const st=document.createElement('style'); st.textContent=`
  .rwk{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}
  .rwk button{display:grid;justify-items:center;gap:4px;padding:10px 6px;background:var(--s2);border:3px solid var(--inkc);border-radius:6px;color:var(--fg);font:700 13px var(--body);cursor:pointer}
  .rwk button i{font-style:normal;font-size:24px}
  .rwk button.on{background:var(--gold);color:var(--inkc)}
  .rwt{display:flex;gap:8px;flex-wrap:wrap}
  .rwt button{padding:8px 14px;border:3px solid var(--inkc);background:var(--s2);color:var(--fg);border-radius:4px;font:800 14px var(--body);cursor:pointer}
  .rwt button.on{background:var(--red);color:#fff}
  .gift{display:grid;gap:10px;text-align:center;justify-items:center}
  .gift .big{font-size:64px;line-height:1}
  .gift ul{list-style:none;padding:0;margin:0;display:grid;gap:6px}
  .gift li{background:var(--s2);border:3px solid var(--inkc);border-radius:6px;padding:8px 14px;font-weight:800}`;
  document.head.appendChild(st);

  const NC=[['gold','Altın'],['red','Kırmızı'],['blue','Mavi'],['green','Yeşil'],['purple','Mor'],['silver','Gümüş Işıltı'],['fire','Ateş'],['cosmic','Kozmik'],['rainbow','Gökkuşağı']];
  const KINDS=[['points','💰','Puan'],['coins','🪙','Coin'],['xp','⭐','XP'],['card','🃏','Kart'],['pack','🎁','Kart paketi'],['frame','🖼️','Çerçeve'],['nc','🎨','İsim rengi']];
  const wkId=()=>{ const t=new Date(Date.now()+3*3600e3); return new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate()-t.getUTCDay())).toISOString().slice(0,10); };
  async function givePoints(uid,v){ const ref=FB.db.collection('users').doc(uid), d=(await ref.get()).data()||{}, S=SEASON().id, W=wkId(), inc=firebase.firestore.FieldValue.increment; const up=window.__scoreUp(d,v,S,W,true);
    await ref.set(up,{merge:true}); return d.name||'Oyuncu'; }
  window.mtScoreSync=async(game,score)=>{ try{ if(!(FB.ready&&FB.user)||!score) return; const uid=FB.user.uid, ref=FB.db.collection('users').doc(uid);
    const d=((await ref.get().catch(()=>null))||{data:()=>({})}).data()||{};
    const S=SEASON().id, W=wkId(), inc=firebase.firestore.FieldValue.increment, v=Math.round(score), up=window.__scoreUp(d,v,S,W,game!=='daily');
    if(game!=='daily') up.games=inc(1);
    await ref.set(up,{merge:true}).catch(()=>{}); if(Date.now()-(window.__bustT||0)>150e3){ window.__bustT=Date.now(); window.__fsBust&&window.__fsBust('users|orderBy'); } try{ const carry=d.season===S||(d.season&&d.season>S); FB.myPts=game==='daily'?(d.sp||0):Math.max(0,carry?(d.sp||0)+v:v); }catch(e){} }catch(e){} };
  const RNAME={b:'Bronz',g:'Nadir',a:'Epik',e:'Efsanevi'};
  function giftText(g){ if(g.kind==='points') return `${g.amount>0?'+':''}${g.amount} puan`; if(g.kind==='coins') return `${g.amount>0?'+':''}${g.amount} coin`; if(g.kind==='xp') return `+${g.amount} XP`;
    if(g.kind==='card') return g.hero&&HERO_BY[g.hero]?`${HERO_BY[g.hero].ad} kartı`:`${g.amount||1} ${RNAME[g.rar]||''} kart`.replace('  ',' ');
    if(g.kind==='pack') return `${g.amount||1} kart paketi (${RNAME[g.rar]||'Bronz'}+)`; if(g.kind==='frame') return `${(FRAMES[g.item]||{}).n||g.item} çerçevesi`; if(g.kind==='nc') return `${(NC.find(x=>x[0]===g.item)||[])[1]||g.item} isim rengi`; return 'Hediye'; }

  /* ---------- admin formu ---------- */
  let kind='points', target='one', rar='b';
  const _oa=openAdmin;
  openAdmin=function(){ _oa(); const f=$('#admP'); if(!f||!FB.admin) return; const tb=$('.tabs2 button[data-t="p"]'); if(tb) tb.textContent='Ödül ver'; draw(); };
  function draw(){ const f=$('#admP'); if(!f) return; const heroOpts=[...HEROES_CG].sort((a,b)=>a.ad.localeCompare(b.ad,'tr')).map(h=>`<option value="${h.id}">${esc(h.ad)} (${RNAME[h.r]})</option>`).join('');
    f.innerHTML=`<span class="mono dim">Ne vereceksin?</span><div class="rwk">${KINDS.map(([k,i,n])=>`<button type="button" data-k="${k}" class="${k===kind?'on':''}"><i>${i}</i>${n}</button>`).join('')}</div>
      <span class="mono dim">Kime?</span><div class="rwt"><button type="button" data-tg="one" class="${target==='one'?'on':''}">Bir oyuncuya</button><button type="button" data-tg="me" class="${target==='me'?'on':''}">Kendime</button><button type="button" data-tg="all" class="${target==='all'?'on':''}">Herkese 🌍</button></div>
      ${target==='one'?`<input class="field" id="pN" placeholder="Oyuncu adı (listeden seç)" list="pNl" autocomplete="off"><datalist id="pNl"></datalist>`:''}
      ${['points','coins','xp'].includes(kind)?`<label class="mono dim" for="pV">Miktar${kind!=='xp'?' (eksi de yazabilirsin)':''}</label><input class="field" id="pV" type="number" value="${kind==='xp'?500:1000}" step="50">
        <div style="display:flex;gap:6px;flex-wrap:wrap">${(kind==='xp'?[100,500,1000,5000]:[100,500,1000,5000,10000,-100]).map(n=>`<button class="ghost" type="button" data-pq="${n}">${n>0?'+':''}${n.toLocaleString('tr-TR')}</button>`).join('')}</div>`:''}
      ${kind==='card'?`<label class="mono dim" for="pH">Hangi kart?</label><select class="field" id="pH" style="appearance:auto"><option value="">🎲 Rastgele (aşağıdaki nadirlikten)</option>${heroOpts}</select>`:''}
      ${kind==='card'||kind==='pack'?`<span class="mono dim">${kind==='pack'?'Paket türü (en az bu nadirlikte 1 kart)':'Rastgele kartın nadirliği'}</span><div class="rwt">${Object.entries(RNAME).map(([k,n])=>`<button type="button" data-r="${k}" class="${rar===k?'on':''}">${n}</button>`).join('')}</div>
        <label class="mono dim" for="pV">Adet</label><input class="field" id="pV" type="number" value="1" min="1" max="10">`:''}
      ${kind==='frame'?`<label class="mono dim" for="pI">Çerçeve</label><select class="field" id="pI" style="appearance:auto">${Object.entries(FRAMES).map(([id,f])=>`<option value="${id}">${esc(f.n)}</option>`).join('')}</select>`:''}
      ${kind==='nc'?`<label class="mono dim" for="pI">İsim rengi</label><select class="field" id="pI" style="appearance:auto">${NC.map(([id,n])=>`<option value="${id}">${n}</option>`).join('')}</select>`:''}
      <label class="mono dim" for="pM">Mesaj (isteğe bağlı)</label><input class="field" id="pM" maxlength="80" placeholder="Etkinlik ödülü, tebrikler!">
      <button class="btn p" type="submit"><span class="bl"><span>Gönder</span><span>Gönder</span></span></button>
      <p class="dim" style="margin:0;font-size:13px">${kind==='points'?'Puan, tüm zamanlar puanına ve bu sezonun ve haftanın sıralamasına yazılır.':'Oyuncu siteye girdiğinde hediye kutusu olarak açılır ve hesabına eklenir.'}${target==='all'?' <b style="color:var(--gold)">Herkese: siteye bir kez Micup ile giren herkese gider.</b>':''}</p>`;
    if(target==='one') FB.db.collection('users').orderBy('sp','desc').limit(150).get().then(q=>{ const dl=$('#pNl'); if(dl) dl.innerHTML=q.docs.map(d=>`<option value="${esc(d.data().name||'')}">`).join(''); }).catch(()=>{});
    $$('[data-k]',f).forEach(b=>b.onclick=()=>{ kind=b.dataset.k; SFX.play('click'); draw(); });
    $$('[data-tg]',f).forEach(b=>b.onclick=()=>{ target=b.dataset.tg; SFX.play('click'); draw(); });
    $$('[data-r]',f).forEach(b=>b.onclick=()=>{ rar=b.dataset.r; SFX.play('click'); $$('[data-r]',f).forEach(x=>x.classList.toggle('on',x===b)); });
    $$('[data-pq]',f).forEach(b=>b.onclick=()=>{ $('#pV').value=b.dataset.pq; SFX.play('click'); });
    f.onsubmit=submit; }
  async function submit(e){ e.preventDefault(); const f=$('#admP'), btn=f.querySelector('button[type=submit]');
    const amount=parseInt(($('#pV')||{}).value,10)||0, item=($('#pI')||{}).value||null, hero=($('#pH')||{}).value||null, msg=(($('#pM')||{}).value||'').trim().slice(0,80);
    if(['points','coins','xp'].includes(kind)&&!amount) return toast('Miktar yaz','');
    if(kind==='xp'&&amount<0) return toast('XP eksi olamaz','');
    btn.disabled=true;
    try{ let uids=[], names={};
      if(target==='me') uids=[FB.user.uid];
      else if(target==='one'){ const n=($('#pN').value||'').trim(); const q=await FB.db.collection('users').where('name','==',n).limit(1).get(); if(q.empty){ btn.disabled=false; return toast('Bulunamadı','Bu isimde oyuncu yok. Listeden seç.'); } uids=[q.docs[0].id]; names[q.docs[0].id]=n; }
      else { if(!btn.dataset.ok){ btn.dataset.ok=1; btn.disabled=false; btn.querySelector('.bl').innerHTML='<span>Emin misin? Herkese gidecek</span><span>Evet, gönder</span>'; return; }
        const q=await FB.db.collection('users').limit(500).get(); uids=q.docs.map(d=>d.id); }
      const g={kind,amount:kind==='card'||kind==='pack'?Math.max(1,Math.min(10,amount||1)):amount,item,hero:hero||null,rar,msg,from:FB.user.uid,fromName:AUTH.user?(AUTH.user.display||AUTH.user.username):'Admin'};
      let n=0;
      if(kind==='points'){ for(const u of uids){ await givePoints(u,amount); n++; } }
      else { for(let i=0;i<uids.length;i+=400){ const b=FB.db.batch?FB.db.batch():null; const part=uids.slice(i,i+400);
          if(b){ part.forEach(u=>b.set(FB.db.collection('gifts').doc(),{...g,to:u,claimed:false,at:firebase.firestore.FieldValue.serverTimestamp()})); await b.commit(); }
          else { for(const u of part) await FB.db.collection('gifts').add({...g,to:u,claimed:false,at:firebase.firestore.FieldValue.serverTimestamp()}); }
          n+=part.length; } }
      SFX.play('win'); toast('Gönderildi',`${giftText(g)} → ${target==='all'?n+' oyuncu':target==='me'?'sana':(names[uids[0]]||'oyuncu')}`); renderBoards();
      if(target==='me'&&kind!=='points') setTimeout(checkGifts,800);
      delete btn.dataset.ok; draw(); }
    catch(err){ toast('Olmadı',String(err.code||err.message)); btn.disabled=false; } }

  /* ---------- oyuncu tarafı: hediyeleri al ---------- */
  let busy=false, unsub=null;
  async function applyGift(g){ const s=prog(); let cards=[];
    if(g.kind==='coins'){ s.coins=Math.max(0,(s.coins||0)+g.amount); saveProg(s); FB.db.collection('users').doc(FB.user.uid).set({coins:s.coins},{merge:true}).catch(()=>{}); window.renderShop&&renderShop(); }
    else if(g.kind==='xp') addXP(g.amount);
    else if(g.kind==='card'){ for(let i=0;i<(g.amount||1);i++) cards.push(g.hero&&HERO_BY[g.hero]?HERO_BY[g.hero]:pickHero(g.rar||'b')); }
    else if(g.kind==='pack'){ for(let p=0;p<(g.amount||1);p++){ cards.push(pickHero(g.rar||'b'),pickHero('b'),pickHero('b')); } }
    else if(g.kind==='frame'&&g.item){ s.frames=[...new Set([...(s.frames||[]),g.item])]; saveProg(s); FB.db.collection('users').doc(FB.user.uid).set({frames:s.frames},{merge:true}).catch(()=>{}); }
    else if(g.kind==='nc'&&g.item){ s.nameColors=[...new Set([...(s.nameColors||[]),g.item])]; if(!s.nameColor) s.nameColor=g.item; saveProg(s); FB.db.collection('users').doc(FB.user.uid).set({nameColors:s.nameColors,nameColor:s.nameColor},{merge:true}).catch(()=>{}); }
    return cards; }
  async function checkGifts(){ if(busy||!(FB.ready&&FB.user)) return; busy=true;
    try{ const q=await FB.db.collection('gifts').where('to','==',FB.user.uid).get(); const list=q.docs.filter(d=>!d.data().claimed); if(!list.length){ busy=false; return; }
      let cards=[], lines=[], from=new Set(), msgs=new Set();
      for(const d of list){ const g=d.data(); await d.ref.set({claimed:true},{merge:true}); if(g.kind==='points'){ continue; } cards=cards.concat(await applyGift(g)); lines.push(giftText(g)); from.add(g.fromName||'Admin'); if(g.msg) msgs.add(g.msg); }
      if(cards.length){ const c=myCards(); cards.forEach(h=>c[h.id]=(c[h.id]||0)+1); setCards(c); addXP(40*cards.length); lines=lines.concat(cards.map(h=>`🃏 ${h.ad} (${RNAME[h.r]})`)); }
      if(lines.length){ SFX.play('win'); burst&&burst(true); openModal('🎁 Hediye geldi!');
        swap(`<div class="gift"><div class="big">🎁</div><h3 style="margin:0">${esc([...from].join(', '))} sana hediye gönderdi!</h3>${[...msgs].map(m=>`<p class="dim" style="margin:0">“${esc(m)}”</p>`).join('')}
          <ul>${lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ul>${cards.length?'<button class="btn p" id="gfOpen" type="button"><span class="bl"><span>Koleksiyonuma bak</span><span>Koleksiyonuma bak</span></span></button>':'<button class="btn p" id="gfOk" type="button"><span class="bl"><span>Süper!</span><span>Süper!</span></span></button>'}</div>`);
        const o=$('#gfOpen'); o&&(o.onclick=()=>openCollection()); const k=$('#gfOk'); k&&(k.onclick=()=>closeModal());
        renderUser(); renderBoards(); renderLevel&&renderLevel(); }
    }catch(e){} busy=false; }
  window.checkGifts=checkGifts;
  (function w(){ if(FB.ready&&FB.auth){ FB.auth.onAuthStateChanged(u=>{ unsub&&unsub(); unsub=null; if(!u) return;
      setTimeout(checkGifts,4000);
      unsub=FB.db.collection('gifts').where('to','==',u.uid).onSnapshot(q=>{ if(q.docs.some(d=>!d.data().claimed)) setTimeout(checkGifts,600); },()=>{}); }); } else setTimeout(w,800); })();
})();


/* ========================= OYUN İÇİ SOHBET: hazır mesajlar, baloncuk önizleme, kısayollar, daha rahat düzen ========================= */
(function(){
  const st=document.createElement('style'); st.textContent=`
  .achat{width:min(360px,calc(100% - 32px))!important;height:min(460px,60vh)!important}
  .achatQ{display:flex;gap:6px;padding:6px 8px;border-top:3px solid var(--inkc);background:var(--s1);overflow-x:auto;scrollbar-width:none}
  .achatQ::-webkit-scrollbar{display:none}
  .achatQ button{flex:none;font:800 13px var(--body);padding:6px 10px;border-radius:99px;background:var(--s2);border:2px solid var(--inkc);color:var(--fg);cursor:pointer;white-space:nowrap}
  .achatQ button:hover{background:var(--gold);color:var(--inkc)}
  .achatH{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--gold);color:var(--inkc);border-bottom:3px solid var(--inkc)}
  .achatH b{flex:1;font-family:var(--display);font-size:18px;letter-spacing:.04em}
  .achatH small{font:800 11px var(--body)}
  .achatH button{width:28px;height:28px;border-radius:4px;border:2px solid var(--inkc);background:rgba(0,0,0,.12);cursor:pointer;font-weight:900}
  .cl{display:block;line-height:1.35;padding:5px 9px;border-radius:4px 10px 10px 10px;background:var(--s2);border:2px solid var(--inkc);max-width:88%;align-self:flex-start;word-break:break-word}
  .cl.me{align-self:flex-end;background:#2a2040;border-radius:10px 4px 10px 10px}
  .cl.sys{background:none;border:0;align-self:center;text-align:center;max-width:100%}
  .cl time{display:block;font-size:10px;color:var(--faint);margin-top:2px}
  .cbub{position:absolute;z-index:12;left:14px;right:auto;top:calc(58px + env(safe-area-inset-top,0px));max-width:min(260px,60vw);background:#fffdf4;color:var(--inkc);border:3px solid var(--inkc);box-shadow:4px 4px 0 var(--inkc);border-radius:12px 4px 12px 12px;padding:7px 11px;font:700 14px/1.3 var(--body);cursor:pointer;animation:cbIn .3s ease-out}
  .cbub b{color:var(--red)}
  @keyframes cbIn{from{transform:translateY(-8px) scale(.9);opacity:0}}
  .achatT.ping{animation:cping .6s ease-out 2}
  @keyframes cping{50%{transform:scale(1.18) rotate(-8deg)}}
  .achatHint{font-size:11px;color:var(--faint);padding:0 10px 6px}
  @media (max-width:600px){
    .achat{left:8px!important;right:8px!important;width:auto!important;height:min(420px,55vh)!important}
    .cbub{right:auto;left:12px;top:auto;bottom:calc(var(--ch,150px) + 34px + env(safe-area-inset-bottom,0px));max-width:calc(100% - 90px)}
  }`;
  document.head.appendChild(st);
  const box=$('#achat'), log=$('#achatLog'), inp=$('#achatIn'), tg=$('#achatT'); if(!box||typeof CHAT==='undefined') return;

  /* başlık + kapat */
  const h=document.createElement('div'); h.className='achatH'; h.innerHTML='<b>💬 Oda sohbeti</b><small id="achatW"></small><button type="button" id="achatX" aria-label="Kapat">✕</button>'; box.prepend(h);
  $('#achatX').onclick=()=>tg.click();
  /* hazır mesajlar */
  const Q=['İyi oyunlar! 🤝','GG 👏','Hadi başlayalım!','Bekleyin 1 dk','Şanslıydın 😅','Bu kart çok iyi 🔥','Rövanş? 🔁','Hızlı oyna 😴','Ben gidiyorum 👋'];
  const q=document.createElement('div'); q.className='achatQ'; q.innerHTML=Q.map(t=>`<button type="button">${t}</button>`).join(''); $('#achatE').after(q);
  $$('button',q).forEach(b=>b.onclick=()=>{ CHAT.send(b.textContent,false); SFX.play('click'); });
  const hint=document.createElement('div'); hint.className='achatHint'; hint.textContent=isMob()?'':'Enter: sohbeti aç · Esc: kapat'; $('#achatF').after(hint);
  inp.maxLength=160;

  /* zaman damgası + baloncuk önizleme */
  const _add=CHAT.add;
  CHAT.add=function(e){ _add(e); const last=log.lastElementChild; if(last&&!last.querySelector('time')){ const t=document.createElement('time'); t.textContent=new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}); last.appendChild(t); }
    if(box.hidden&&e.pid!==NET.id&&!e.emo) bubble(e.name,e.text);
    if(box.hidden&&e.pid!==NET.id){ tg.classList.remove('ping'); void tg.offsetWidth; tg.classList.add('ping'); } };
  let bt=null;
  function bubble(name,text){ const arena=$('#arena'); if(!arena) return; let b=$('#cbub'); if(!b){ b=document.createElement('div'); b.className='cbub'; b.id='cbub'; arena.appendChild(b); b.onclick=()=>{ b.remove(); if(box.hidden) tg.click(); }; }
    b.innerHTML=`<b>${esc(name)}:</b> ${esc(String(text).slice(0,90))}`; clearTimeout(bt); bt=setTimeout(()=>{ const x=$('#cbub'); x&&x.remove(); },4500); }
  /* açılınca yazma kutusuna odaklan, kim çevrimiçi */
  tg.addEventListener('click',()=>setTimeout(()=>{ if(!box.hidden){ const x=$('#cbub'); x&&x.remove(); if(!isMob()) inp.focus(); const n=$$('.plist li').filter(li=>li.querySelector('b')).length||$$('.seat').length; $('#achatW').textContent=n?n+' oyuncu':''; } },30));
  /* klavye: Enter aç, Esc kapat (sadece oyun ekranında, yazı alanı dışında) */
  document.addEventListener('keydown',e=>{ const arena=$('#arena'); if(!arena||arena.hidden) return; const typing=/INPUT|TEXTAREA/.test(document.activeElement&&document.activeElement.tagName);
    if(e.key==='Enter'&&!typing){ e.preventDefault(); if(box.hidden){ tg.click(); } setTimeout(()=>{ try{inp.focus();}catch(e){} },40); }
    else if(e.key==='Escape'&&!box.hidden){ e.preventDefault(); e.stopPropagation(); tg.click(); inp.blur(); } },true);
  /* gönderince odak kalsın */
  $('#achatF').addEventListener('submit',()=>setTimeout(()=>{ if(!isMob()) inp.focus(); },0));
})();
  /* dis scriptler icin gerekli API (scope-guvenli) */
  window.__toast=toast; /* window.toast, id="toast" olan kutuya denk geliyor; dış scriptler bunu kullanır */
  ["$","$$","AUTH","CGSTATS","CHAT","NET","Peer","FB","G","ST","reduce","isMob","esc","SFX","HEROES_CG","HERO_BY","HEROES","RAR","cardFace","avatarHTML","burst","buzz","prog","saveProg","myCards","setCards","toast","openModal","swap","submitScore","addXP","renderShop","openProfile","renderUser","renderLevel","renderQuests","renderBoards","openFrames","openBP","openInvite","weekEnd","wkTag","ACH_LIST","SEASON","FRAMES","checkGifts","installApp","openRoomBrowser","openProfileEdit","levelUp","lvlOf","xpFor","today","giveFrame","equipFrame","bpAdd","BP","bpLevel","QS","bump","setCoins","syncCards","mBody","S","MICUP_CONFIG","openLogin","openMemberGate","FIXED_ADMIN_UIDS","OWNER_EMAIL","FIXED_ADMINS","loadScript","fbInit","openShop","openFriends","openAccount","openAdmin","ncOf","myStats","getBoard","fbSignIn","renderRaffles","drawRaffle","shopBody","bindShop","pickHero","pickQuiz","pickHeroes","shuffle","openDaily","checkAch","ACH","QUESTS","seasonInfo","deckCards","VIEWS","goView","shareURL","copyText","avatarURL","defaultAvatar","uidOf","shortId","makeCode","randCode","gsap","ScrollTrigger","Lenis","lenis","confetti","particles","router","navigate","notify","settings","prefs","config","state","cache","session","token","micup","MICUP","GUILD","member","members","invite","gate","admin","role","perm","mod","owner","super","staff","ravo","RAVO","help","faq","legal","privacy","terms","cookie","consent","fan","community","social","discord","youtube","update","version","build","release","deploy","server","client","peer","node","host","guest","visitor","user","player","gamer","hero","card","deck","hand","collection","inventory","item","gear","equip","loadout","skill","power","ability","stat","attribute","level","xp","points","coins","gold","gems","energy","health","shield","weapon","attack","defense","speed","crit","combo","ultimate","special","buff","debuff","status","effect","spell","class","race","faction","team","squad","party","group","clan","alliance","world","map","zone","area","region","location","place","mode","type","kind","sort","category","tag","label","name","title","text","content","body","icon","logo","banner","poster","menu","list","table","grid","layout","design","style","theme","template","pattern","color","font","size","scale","rotate","flip","shake","pulse","glow","sparkle","particle","firework","flash","fade","slide","bounce","ease","stagger","delay","duration","repeat","yoyo","loop","pause","resume","restart","reverse","seek","progress","time","kill","call","onStart","onUpdate","onComplete","x","y","scaleX","scaleY","opacity","visibility","display","autoAlpha","filter","blur","fill","stroke","fontSize","fontWeight","lineHeight","textAlign","borderRadius","boxShadow","scrollTop","offsetWidth","offsetHeight","clientWidth","innerWidth","innerHeight","devicePixelRatio","requestAnimationFrame","cancelAnimationFrame","performance"].forEach(k=>{ try{ const v=eval(k); if(typeof v!=='undefined'&&!(k in window)) window[k]=v; }catch(e){} });
  ['renderBoards','openAccount','getBoard','submitScore','myStats','myTotal','prog','saveProg','AUTH','FB','SFX','coins','setCoins','addXP','lvlOf'].forEach(n=>{ try{ if(n in window) return; Object.defineProperty(window,n,{configurable:true,get:()=>eval(n)}); }catch(e){} });
  /* ---- siralama: ilk 5 + asamali ac + sira/puan bilgisi ---- */
  { let _lbShow=5,_rkC={t:0,v:null};
    window.myRank=async function(){
      if(!(FB.ready&&FB.user)) return null;
      if(Date.now()-_rkC.t<60000) return _rkC.v;
      try{
        const sn=await FB.db.collection('users').doc(FB.user.uid).get();
        const d=sn.exists?sn.data():{};
        if(d.season!==SEASON().id||(d.sp||0)<=0){ _rkC={t:Date.now(),v:0}; return 0; }
        const sp=d.sp;
        try{
          const c=await FB.db.collection('users').where('season','==',SEASON().id).where('sp','>',sp).count().get();
          _rkC={t:Date.now(),v:c.data().count+1}; return _rkC.v;
        }catch(e){}
        const q=await FB.db.collection('users').orderBy('sp','desc').limit(300).get();
        const rows=q.docs.filter(d2=>{const x=d2.data();return x.season===SEASON().id;});
        const i=rows.findIndex(d2=>d2.id===FB.user.uid);
        _rkC={t:Date.now(),v:i>=0?i+1:301}; return _rkC.v;
      }catch(e){ return null; }
    };
    const _rbL=renderBoards;
    renderBoards=async function(){
      await _rbL();
      const lb=document.getElementById('lb'); if(!lb) return;
      const rows=[].slice.call(lb.querySelectorAll('.lrow:not(.head)'));
      rows.forEach((r,i)=>{ r.style.display=i<_lbShow?'':'none'; });
      const old=lb.querySelector('.lbmore'); if(old) old.remove();
      const next={5:20,20:50,50:100}[_lbShow];
      if(next&&rows.length>_lbShow){
        const b=document.createElement('button'); b.type='button'; b.className='btn g lbmore';
        b.style.cssText='width:100%;margin-top:10px;height:44px;font-size:15px';
        b.innerHTML='<span class="bl"><span>Daha fazla göster ('+Math.min(next,rows.length)+' kişi)</span><span>Daha fazla göster</span></span>';
        b.onclick=()=>{ try{SFX.play('click')}catch(e){} _lbShow=next; window.__lbN=Math.max(20,next); renderBoards(); };
        lb.appendChild(b);
      }
      if(_lbShow>5){ const cb=document.createElement('button'); cb.type='button'; cb.className='btn g lbmore'; cb.style.cssText='width:100%;margin-top:8px;height:40px;font-size:13px'; cb.textContent='Daralt (ilk 5)'; cb.onclick=()=>{ try{SFX.play('click')}catch(e){} _lbShow=5; renderBoards(); }; lb.appendChild(cb); }
      let st=lb.querySelector('.lbyou');
      if(!st){ st=document.createElement('div'); st.className='lbyou mono dim'; st.style.cssText='margin-top:12px;font-size:12px;text-align:center'; lb.appendChild(st); }
      const meRow=rows.filter(r=>r.classList.contains('me'))[0];
      if(meRow){ const i=rows.indexOf(meRow); st.textContent='Sen #'+(i+1)+' sıradasın — ilk 100 içinde olmak için '+Math.max(0,100-(i+1))+' kişiyi geçmen gerek.'; return; }
      st.textContent='Sıralaman hesaplanıyor…';
      window.myRank().then(r=>{ if(!st.isConnected) return;
        if(r===0) st.textContent='Henüz sıralamada değilsin — bir oyun oyna, ilk 100\'e gir!';
        else if(r) st.textContent='Sen #'+r+' sıradasın'+(r>100?' — ilk 100 dışında, daha çok oyna':' — ilk 100 içindesin')+'.';
        else st.textContent=''; });
    };
    const _oaL=openAccount;
    openAccount=function(){ _oaL();
      const box=document.querySelector('.mbox .lg')||document.querySelector('.mbox'); if(!box) return;
      const set=(id,v)=>{ const e=box.querySelector('#'+id); if(e) e.textContent=(+v||0).toLocaleString('tr-TR'); };
      const show=txt=>{ let el=box.querySelector('.myrank'); if(!el){ el=document.createElement('p'); el.className='myrank mono dim'; el.style.cssText='margin:12px 0 0;font-size:12px'; box.appendChild(el); } el.textContent=txt; };
      window.myRank&&window.myRank().then(r=>{ if(!box.isConnected) return; if(r===0) show('Sıralamada değilsin — bir oyun oyna, ilk 100\'e gir!'); else if(r&&r>0) show(r<=100?'Sen #'+r+' sıradasın':'Sen #'+r+' sıradasın — ilk 100 dışında'); });
      if(!(FB.ready&&FB.user)) return;
      FB.db.collection('users').doc(FB.user.uid).get().then(sn=>{
        const d=sn.exists?sn.data():{};
        set('acSp',d.sp); set('acWp',d.wp); set('acPts',Math.max(d.points||0,d.sp||0,d.wp||0));
      }).catch(()=>{});
    };
  }

/* ========================= ENVANTER + KUTULAR ========================= */
const INV_CSS=`
.invwrap{grid-column:1/-1;display:flex;flex-direction:column;gap:18px;width:100%;padding-bottom:24px;animation:invIn .5s cubic-bezier(.2,.9,.3,1) both}
@keyframes invIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.invhero{position:relative;border-radius:20px;padding:20px;border:1px solid #3a2f5c;background:linear-gradient(135deg,#1a1430,#0d0b16 60%,#241a3f);overflow:hidden}
.invhero::before{content:"";position:absolute;inset:0;background:radial-gradient(600px 200px at 80% -20%,rgba(255,211,77,.15),transparent),radial-gradient(500px 220px at 10% 130%,rgba(74,163,255,.14),transparent);pointer-events:none}
.invhero .mono{color:var(--gold,#ffd34d);letter-spacing:.3em;font-size:11px}
.invhero h3{margin:4px 0 14px;font-size:24px;position:relative;z-index:1}
.invstats{display:flex;gap:10px;flex-wrap:wrap;position:relative;z-index:1}
.invstat{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:8px 14px;text-align:center;min-width:84px;backdrop-filter:blur(4px)}
.invstat b{display:block;font-size:15px}
.invstat span{font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em}
.invsec{background:var(--s2);border:1px solid var(--line2);border-radius:18px;padding:16px 16px 14px}
.invsec>h3{margin:0 0 14px;font-size:15px;letter-spacing:.05em;display:flex;align-items:center;gap:8px}
.invsec>h3::after{content:"";flex:1;height:1px;background:var(--line2)}
.invn{margin-left:auto;font-family:var(--mono);font-size:10.5px;color:var(--dim);letter-spacing:.08em;background:var(--s1,#16161f);border:1px solid var(--line2);border-radius:99px;padding:3px 10px}
.invgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:12px}
.invitem{position:relative;background:linear-gradient(165deg,var(--s2),rgba(255,255,255,.02));border:2px solid var(--line2);border-radius:16px;padding:14px 10px;text-align:center;font-size:12.5px;display:flex;flex-direction:column;gap:8px;align-items:center;justify-content:center;min-height:120px;transition:transform .25s,border-color .25s,box-shadow .25s;animation:invIn .45s cubic-bezier(.2,.9,.3,1) both}
.invitem:hover{transform:translateY(-4px);border-color:#5a5470;box-shadow:0 12px 28px rgba(0,0,0,.4)}
.invitem h4{margin:0;font-size:12.5px;line-height:1.3}
.invitem .cnt{position:absolute;top:8px;right:10px;font-family:var(--mono);font-size:11px;color:var(--gold,#ffd34d);background:rgba(255,211,77,.1);border:1px solid rgba(255,211,77,.3);border-radius:99px;padding:2px 8px}
.invitem.box{border-color:var(--bc,#ffd34d);box-shadow:0 0 22px color-mix(in srgb,var(--bc,#ffd34d) 22%,transparent)}
.mbox3{width:58px;height:58px;position:relative;margin-bottom:2px}
.mbox3 .mbl{position:absolute;left:6%;right:6%;bottom:0;height:68%;border-radius:8px;background:linear-gradient(160deg,#3a3358,#1c1830);border:2px solid var(--bc,#ffd34d);box-shadow:inset 0 0 0 3px rgba(255,255,255,.08)}
.mbox3 .mbl::after{content:"★";position:absolute;inset:0;display:grid;place-items:center;font-size:24px;color:var(--bc,#ffd34d)}
.mbox3 .mbr{position:absolute;left:0;right:0;top:50%;height:14%;background:linear-gradient(90deg,#ff3b4e,#ffd34d,#4aa3ff,#b06bff,#ff3b4e);opacity:.9}
/* kutu acilisi sinematik */
.bxarena{position:relative;display:flex;flex-direction:column;align-items:center;gap:16px;padding:6px 0;overflow:hidden}
.bxrays{position:absolute;inset:-40%;background:repeating-conic-gradient(from 0deg,var(--bc,#ffd34d)22 0deg 9deg,transparent 9deg 18deg);animation:pkrays 12s linear infinite;pointer-events:none}
.bxflash{position:absolute;inset:0;background:radial-gradient(circle at 50% 40%,var(--bc,#ffd34d)cc,transparent 60%);opacity:0;pointer-events:none;z-index:5}
.bxflash.go{animation:bxfl .8s ease-out}
@keyframes bxfl{0%{opacity:0}25%{opacity:.9}100%{opacity:0}}
@keyframes pkrays{to{transform:rotate(360deg)}}
.bxstage{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:18px;width:100%}
.bx3d{width:200px;height:200px;position:relative;perspective:700px;cursor:pointer;filter:drop-shadow(0 20px 34px rgba(0,0,0,.5))}
.bx3d:active{transform:scale(.96)}
.bxbody{position:absolute;left:8%;right:8%;bottom:0;height:72%;border-radius:14px 14px 18px 18px;background:linear-gradient(160deg,#3a3358,#1c1830 70%);border:3px solid var(--bc,#ffd34d);box-shadow:0 18px 50px rgba(0,0,0,.55),inset 0 0 0 6px rgba(255,255,255,.1)}
.bxbody::after{content:"";position:absolute;inset:0;display:grid;place-items:center;font-size:64px}
.bxbody::before{content:"★";position:absolute;inset:0;display:grid;place-items:center;font-size:64px;color:var(--bc,#ffd34d);text-shadow:0 4px 0 rgba(0,0,0,.4)}
.bxribbon{position:absolute;left:0;right:0;top:56%;height:16%;background:linear-gradient(90deg,#ff3b4e,#ffd34d,#4aa3ff,#b06bff,#ff3b4e);opacity:.9;border-top:2px solid rgba(0,0,0,.35);border-bottom:2px solid rgba(0,0,0,.35)}
.bxlid{position:absolute;left:0;right:0;top:6%;height:32%;border-radius:16px 16px 8px 8px;background:linear-gradient(160deg,var(--bc,#ffd34d)ee,#2a2440);border:3px solid var(--bc,#ffd34d);transform-origin:50% 100%;transition:transform .8s cubic-bezier(.55,-.2,.75,.35),opacity .5s .25s;z-index:3;box-shadow:0 10px 26px rgba(0,0,0,.4)}
.bxlid::after{content:"";position:absolute;inset:12px;border:3px double rgba(255,255,255,.4);border-radius:10px}
.bx3d.shake{animation:bxsh .55s}
.bx3d.open .bxlid{transform:rotateX(-104deg) translateY(-46px);opacity:0}
.bx3d.open .bxbody{animation:bxglow .9s ease}
@keyframes bxsh{0%,100%{transform:rotate(0)}20%{transform:rotate(-7deg) translateY(-5px)}45%{transform:rotate(7deg) translateY(-5px)}70%{transform:rotate(-5deg) translateY(-5px)}}
@keyframes bxglow{0%{box-shadow:0 18px 50px rgba(0,0,0,.55)}40%{box-shadow:0 18px 80px var(--bc,#ffd34d)aa}100%{box-shadow:0 18px 50px rgba(0,0,0,.55)}}
.bxhint{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)}
.bxcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px;width:100%;max-width:560px}
.bxcard{perspective:600px;height:104px;cursor:pointer}
.bxcard .in{position:relative;width:100%;height:100%;transition:transform .55s cubic-bezier(.3,1.4,.5,1);transform-style:preserve-3d}
.bxcard.flip .in{transform:rotateY(180deg)}
.bxcard .fc,.bxcard .bc{position:absolute;inset:0;backface-visibility:hidden;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:8px;text-align:center}
.bxcard .fc{background:linear-gradient(160deg,#2a2440,#14101f);border:2px solid var(--bc,#888)66;color:#cbb8ff;font-size:24px}
.bxcard .fc small{font-family:var(--mono);font-size:9px;letter-spacing:.14em}
.bxcard .bc{background:var(--s2);border:2px solid var(--line2);transform:rotateY(180deg);font-size:12.5px;font-weight:700;box-shadow:0 0 18px var(--bc,#888)33}
.bxcard .bc i{font-style:normal;font-size:26px}
.bxcard.flip .bc{animation:bxpop .5s cubic-bezier(.2,1.6,.4,1)}
@keyframes bxpop{0%{transform:rotateY(180deg) scale(.8)}60%{transform:rotateY(180deg) scale(1.08)}100%{transform:rotateY(180deg) scale(1)}}
@keyframes bxin{0%{opacity:0;transform:translateY(26px) scale(.7) rotate(-4deg)}100%{opacity:1;transform:none}}
.bxprog{font-family:var(--mono);font-size:12px;color:var(--dim);letter-spacing:.1em}
.bxacts{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
`;
(function(){
  if(!document.getElementById('invCss')){ const st=document.createElement('style'); st.id='invCss'; st.textContent=INV_CSS; document.head.appendChild(st); }
  const BOXES=[
    {id:'luck',n:'Şans Kutusu',icon:'🎁',tier:0,price:4500,col:'#ffd34d',d:'3-5 ödül · karışık'},
    {id:'prem',n:'Premium Kutu',icon:'💎',tier:1,price:9000,col:'#4aa3ff',d:'4-5 ödül · nadir+ garanti'},
    {id:'leg',n:'Efsane Kutu',icon:'👑',tier:2,price:15000,col:'#ff3b4e',d:'5 ödül · epik/efsanevi şansı yüksek'},
  ];
  const boxDef=id=>(BOXES.find(b=>b.id===id)||BOXES[0]);
  function boxGet(s,id){ if(!s.inv||typeof s.inv!=='object') s.inv={boxes:{},packs:{}}; if(typeof s.inv.boxes==='number'){const n=s.inv.boxes;s.inv.boxes=n>0?{luck:n}:{}} if(!s.inv.boxes||typeof s.inv.boxes!=='object') s.inv.boxes={}; return s.inv.boxes[id]||0; }
  function invCommit(s){ saveProg(s); if(FB.ready&&FB.user){ const up={inv:s.inv||{boxes:{},packs:{}},coins:s.coins||0}; if(s.frames) up.frames=s.frames; if(s.nameColors) up.nameColors=s.nameColors; FB.db.collection('users').doc(FB.user.uid).set(up,{merge:true}).catch(()=>{}); } if(window.renderShop) window.renderShop(); }
  function buyBox(id){ const box=boxDef(id), s=prog(); if((s.coins||0)<box.price){ toast('Coin yetmiyor',(box.price-(s.coins||0)).toLocaleString('tr-TR')+' coin daha lazım.'); return false; }
    s.coins-=box.price; if(!s.inv||typeof s.inv!=='object') s.inv={boxes:{},packs:{}}; if(!s.inv.boxes||typeof s.inv.boxes!=='object') s.inv.boxes={}; s.inv.boxes[box.id]=(s.inv.boxes[box.id]||0)+1; invCommit(s); SFX.play('win'); toast(box.n+' alındı','Envanterde — aç!'); return true; }
  function boxShopHTML(){ const s=prog(); return BOXES.map(b=>{ const n=boxGet(s,b.id); return `<div class="sitem" style="border-color:${b.col}66"><div class="mbox3" style="--bc:${b.col};margin:0 auto 4px"><i class="mbl"></i><i class="mbr"></i><i class="mbb"></i></div><h4>${b.n}</h4><p>${b.d}</p><div class="rowb" style="gap:6px;justify-content:center">${n>0?`<button class="btn p" data-openbox2="${b.id}" type="button" style="flex:1;height:44px"><span class="bl"><span>Aç ×${n}</span><span>Aç ×${n}</span></span></button>`:''}<button class="ghost" data-buybox2="${b.id}" type="button" style="font-size:12px;padding:0 12px">+${b.price>=1000?(b.price/1000)+'k':b.price}</button></div></div>`; }).join(''); }
  function rollRewards(box){
    box=box||BOXES[0]; const tier=box.tier||0;
    const cnt=tier===0?3+(Math.random()<.45?1:0)+(Math.random()<.18?1:0):tier===1?4+(Math.random()<.6?1:0):5;
    const mult=1+tier*.8, out=[], packs=window.__MT_PACKS||[];
    const wp=()=>{const r=Math.random();
      if(tier===2) return r<.3?'epi':r<.55?'avn':r<.75?'cos':r<.9?'nad':'sup';
      if(tier===1) return r<.28?'std':r<.5?'sup':r<.7?'nad':r<.88?'epi':'avn';
      return r<.5?'std':r<.75?'sup':r<.88?'nad':r<.96?'epi':r<.985?'avn':'cos';};
    for(let i=0;i<cnt;i++){ const r=Math.random();
      if(r<.24) out.push({t:'coin',v:Math.round((500+((Math.random()*2500)|0))*mult)});
      else if(r<.34) out.push({t:'coin',v:Math.round((5000+((Math.random()*5000)|0))*mult)});
      else if(r<.56){const id=wp(); out.push({t:'pack',id,label:(packs.find(p=>p.id===id)||{}).n||'Kart paketi'});}
      else if(r<.72){const h=pickHero(Math.random()<.5?'g':'a'); out.push({t:'card',h,label:h.ad+" kartı"});}
      else if(r<.85){const ids=Object.keys(FRAMES), id=ids[(Math.random()*ids.length)|0]; out.push({t:'frame',id,label:(FRAMES[id]||{}).n||'Çerçeve'});}
      else if(r<.95){const nc=window.NAMECOL||[], c=nc[(Math.random()*nc.length)|0]; out.push({t:'nc',id:c&&c[0],label:c?c[1]:'İsim rengi'});}
      else out.push({t:'xp',v:Math.round((300+((Math.random()*700)|0))*mult)});
    }
    const rare=it=>(it.t==='pack'&&['epi','avn','cos'].includes(it.id))||(it.t==='card'&&(it.h.r==='a'||it.h.r==='e'));
    if(tier>=1&&!out.some(rare)){ const i=out.map(x=>x.t).lastIndexOf('coin'); if(i>=0) out[i]=tier===2?(()=>{const h=pickHero('a');return{t:'card',h,label:h.ad+" kartı"}})():{t:'pack',id:'nad',label:'Nadir Avcısı'}; }
    if(tier===2&&!out.some(it=>it.t==='card'&&(it.h.r==='a'||it.h.r==='e')||it.t==='pack'&&['avn','cos'].includes(it.id))){ const i=out.map(x=>x.t).lastIndexOf('coin'); if(i>=0){const h=pickHero('a'); out[i]={t:'card',h,label:h.ad+" kartı"};} }
    const s=prog();
    out.forEach(it=>{ if(it.t==='coin'){ s.coins=(s.coins||0)+it.v; it.icon='🪙'; it.label='+'+it.v.toLocaleString('tr-TR')+' coin'; it.col='#ffd34d'; }
      else if(it.t==='xp'){ addXP(it.v); it.icon='⭐'; it.label='+'+it.v+' XP'; it.col='#7fd4ff'; }
      else if(it.t==='pack'){ if(!s.inv||typeof s.inv!=='object') s.inv={boxes:{},packs:{}}; if(!s.inv.packs) s.inv.packs={}; s.inv.packs[it.id]=(s.inv.packs[it.id]||0)+1; it.icon='🧧'; it.col=it.id==='cos'||it.id==='avn'?'#ff3b4e':it.id==='epi'?'#b06bff':'#4aa3ff'; it.sub='Envantere eklendi'; }
      else if(it.t==='card'){ const c=myCards(); c[it.h.id]=(c[it.h.id]||0)+1; setCards(c); it.icon='🎴'; it.col=it.h.r==='e'?'#ff3b4e':it.h.r==='a'?'#ffb627':'#4aa3ff'; it.sub='Koleksiyonuna eklendi'; }
      else if(it.t==='frame'){ const f=s.frames||(s.frames=[]); if(!f.includes(it.id)){ f.push(it.id); s.frame=it.id; it.icon='🖼️'; it.col='#ff6bd6'; it.sub='Çerçevelerine eklendi'; } else { s.coins=(s.coins||0)+1200; it.icon='🪙'; it.label='Zaten var → +1.200 coin'; it.col='#ffd34d'; } }
      else if(it.t==='nc'){ const ncs=s.nameColors||(s.nameColors=[]); if(it.id&&!ncs.includes(it.id)){ ncs.push(it.id); it.icon='🎨'; it.col='#39d98a'; it.sub='İsim renklerine eklendi'; } else { s.coins=(s.coins||0)+1000; it.icon='🪙'; it.label='Zaten var → +1.000 coin'; it.col='#ffd34d'; } }
    });
    invCommit(s); return out;
  }
  /* kutu sonu: kart odulleri icin aciklayici bildirim */
  function boxCardToast(items){ const cn=(items||[]).filter(it=>it.t==='card').map(it=>it.h&&it.h.ad).filter(Boolean);
    if(cn.length) setTimeout(()=>toast('Koleksiyonuna eklendi 🃏',cn.join(', ')),1500); }
  function openBoxAnim(id){
    const box=boxDef(id), s0=prog(); if(boxGet(s0,box.id)<1){ toast('Kutu yok',box.n+' envanterde yok — mağazadan alabilirsin.'); return; }
    s0.inv.boxes[box.id]--; invCommit(s0);
    const items=rollRewards(box);
    if(!reduce&&window.__MT_LOOT) return window.__MT_LOOT.box(box,items,{left:()=>boxGet(prog(),box.id),again:()=>openBoxAnim(id)});
    boxCardToast(items);
    openModal(box.n);
    swap(`<div class="bxarena"><div class="bxrays" style="--bc:${box.col}"></div><div class="bxflash" id="bxF"></div><div class="bxstage">
      <div class="bx3d" id="bx3d"><div class="bxlid"></div><div class="bxribbon"></div><div class="bxbody" style="--bc:${box.col}"></div></div>
      <p class="bxhint" id="bxT">Kutuyu açmak için dokun</p>
      <div class="bxcards" id="bxCards" style="display:none"></div>
      <div class="bxprog" id="bxP" style="display:none"></div>
      <div class="bxacts" id="bxActs" style="display:none"><button class="btn p" id="bxCol" type="button" style="height:46px"><span class="bl"><span>Koleksiyona git</span><span>Koleksiyona git</span></span></button><button class="ghost" id="bxDone" type="button">Tamam</button></div>
    </div></div>`);
    const stage=$('#bx3d'), cardsBox=$('#bxCards'), progEl=$('#bxP'), acts=$('#bxActs'), tipEl=$('#bxT'), fl=$('#bxF');
    let opened=0, boxOpen=false;
    const reveal=()=>{ if(boxOpen) return; boxOpen=true; stage.classList.add('shake'); SFX.sfx('riser',{vol:.5}); buzz([20,40,20]);
      setTimeout(()=>{ stage.classList.remove('shake'); stage.classList.add('open'); SFX.play('win'); if(window.burst) burst(true);
        fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); buzz([60,50,60,50,90]);
        tipEl.textContent='Ödüllerini tek tek aç!'; stage.style.display='none';
        cardsBox.style.display='grid'; progEl.style.display='block';
        cardsBox.innerHTML=items.map((it,i)=>`<div class="bxcard" data-i="${i}" style="animation:bxin .5s ${.15+i*.12}s cubic-bezier(.2,1.4,.4,1) both"><div class="in"><div class="fc" style="border-color:${it.col||'#888'}66"><span>?</span><small>${esc((it.label||'').slice(0,14))}</small></div><div class="bc" style="border-color:${it.col||'#888'}"><i>${it.icon||'🎁'}</i><span>${esc(it.label||'')}${it.sub?` <small style="opacity:.65;font-size:.85em">· ${esc(it.sub)}</small>`:''}</span></div></div></div>`).join('');
        progEl.textContent='0/'+items.length+' açıldı';
        $$('.bxcard',cardsBox).forEach(cd=>cd.onclick=()=>{ if(cd.classList.contains('flip')) return; cd.classList.add('flip'); SFX.sfx('flip'); if(SFX.sfx) SFX.sfx('cardhit',{vol:.5}); if(window.burst) burst(false); opened++; progEl.textContent=opened+'/'+items.length+' açıldı';
          if(opened>=items.length){ acts.style.display='flex'; tipEl.textContent='Hepsi senin!'; SFX.play('correct'); if(window.burst) burst(true); } });
      },800); };
    stage.onclick=reveal; setTimeout(reveal,1500);
    $('#bxCol').onclick=()=>openCollection();
    $('#bxDone').onclick=()=>closeModal();
  }
  function invHTML(){
    const s=prog(), iv=s.inv||{boxes:{},packs:{}}, pk=iv.packs||{};
    if(!iv.boxes||typeof iv.boxes!=='object'){ const nb={}; if(typeof iv.boxes==='number'&&iv.boxes>0) nb.luck=iv.boxes; iv.boxes=nb; }
    const u=AUTH.user||{display:'Oyuncu'}, PACKS=window.__MT_PACKS||[];
    const coinsN=s.coins||0, cardN=Object.values(myCards()).reduce((a,b)=>a+b,0), uniq=Object.keys(myCards()).filter(id=>HERO_BY[id]).length;
    const boxTiles=BOXES.map(b=>{ const n=boxGet({inv:iv},b.id); return `<div class="invitem box" style="--bc:${b.col}"><div class="mbox3"><i class="mbl"></i><i class="mbb"></i><i class="mbr"></i></div><h4>${b.n}</h4><p class="dim" style="margin:0;font-size:11px">${b.d}</p><div class="cnt">×${n}</div><div class="rowb" style="gap:6px"><button class="btn p" data-openbox2="${b.id}" type="button" style="height:38px;font-size:12px;padding:0 10px" ${n>0?'':'disabled'}><span class="bl"><span>Aç</span><span>Aç</span></span></button><button class="ghost" data-buybox2="${b.id}" type="button" style="font-size:11px;padding:5px 9px">+${b.price>=1000?(b.price/1000)+'k':b.price}</button></div></div>`; }).join('');
    const ownedPacks=PACKS.filter(p=>(pk[p.id]||0)>0).map(p=>`<div class="invitem"><div class="pk ${p.cls}" style="width:100%"><b>MARVEL<br>TÜRKİYE</b><small>${esc(p.n.toUpperCase())}</small></div><h4>${esc(p.n)} <span class="cnt">×${pk[p.id]}</span></h4><p class="dim" style="margin:0;font-size:11px">${esc(p.d)}</p><button class="btn p" data-openp="${p.id}" type="button" style="height:38px;font-size:12px;padding:0 10px"><span class="bl"><span>Aç</span><span>Aç</span></span></button></div>`).join('');
    const fr=(s.frames||[]).map(id=>{ const f=FRAMES[id]||{n:id}, on=s.frame===id;
      return `<div class="invitem">${avatarHTML({display:u.display,avatar:u.avatar,frame:id},56)}<h4 style="font-size:11.5px">${esc(f.n)}</h4>${on?'<span class="own">Takılı ✓</span>':`<button class="ghost" data-eqf="${id}" type="button" style="font-size:11px;padding:5px 9px">Tak</button>`}</div>`; }).join('');
    const nc=(s.nameColors||[]).map(id=>{ const c=(window.NAMECOL||[]).find(x=>x[0]===id), on=s.nameColor===id;
      return `<div class="invitem"><div class="nprev nc-${id}" style="font-size:13px">${esc(u.display||'Oyuncu')}</div><h4 style="font-size:11.5px">${esc(c?c[1]:id)}</h4>${on?'<span class="own">Kullanılıyor</span>':`<button class="ghost" data-eqn="${id}" type="button" style="font-size:11px;padding:5px 9px">Kullan</button>`}</div>`; }).join('');
    return `<div class="invwrap">
      <div class="invhero"><div><span class="mono">ENVANTER</span><h3>Varlıkların</h3></div>
        <div class="invstats"><div class="invstat"><b>🪙 ${coinsN.toLocaleString('tr-TR')}</b><span>coin</span></div><div class="invstat"><b>🃏 ${uniq}<small style="font-size:.55em;color:var(--dim)">/${HEROES_CG.length}</small></b><span>farklı kart</span></div><div class="invstat"><b>🎴 ${cardN}</b><span>toplam kart</span></div><div class="invstat"><b>📦 ${BOXES.reduce((a,b)=>a+boxGet({inv:iv},b.id),0)}</b><span>kutu</span></div></div></div>
      <div class="invsec"><h3>📦 Kutularım <span class="invn">${BOXES.reduce((a,b)=>a+boxGet({inv:iv},b.id),0)} adet</span></h3><div class="invgrid">${boxTiles}</div></div>
      <div class="invsec"><h3>🧧 Paketlerim <span class="invn">${Object.values(pk).reduce((a,b)=>a+b,0)} adet</span></h3><div class="invgrid">${ownedPacks||'<p class="dim">Paket yok — kutudan veya mağazadan kazan.</p>'}</div></div>
      <div class="invsec"><h3>🃏 Kart Koleksiyonum <span class="invn">${cardN} kart</span></h3><div class="invgrid"><div class="invitem"><div style="font-size:34px">🃏</div><h4>${uniq} farklı kart</h4><button class="ghost" data-invcol="1" type="button" style="font-size:12px;padding:6px 10px">Koleksiyonu aç →</button></div></div></div>
      <div class="invsec"><h3>🖼️ Çerçevelerim <span class="invn">${(s.frames||[]).length} adet</span></h3><div class="invgrid">${fr||'<p class="dim">Çerçeve yok — kutudan veya mağazadan kazan.</p>'}</div></div>
      <div class="invsec"><h3>🎨 İsim Renklerim <span class="invn">${(s.nameColors||[]).length} adet</span></h3><div class="invgrid">${nc||'<p class="dim">Renk yok — kutudan veya mağazadan kazan.</p>'}</div></div>
    </div>`;
  }
  window.invHTML=invHTML; window.openBoxAnim=openBoxAnim; window.buyBox=buyBox; window.invCommit=invCommit; window.boxShopHTML=boxShopHTML;
})();

/* ========================= PARÇA 2: REKABET — 4 haftalık sezon, şampiyon parıltıları, kazanan yayını ========================= */
(function(){
  const st=document.createElement('style'); st.textContent=`
  @keyframes chShine{to{background-position:300% 0}}
  @keyframes chGlowW{0%,100%{filter:drop-shadow(0 0 3px #ffd34d)}50%{filter:drop-shadow(0 0 12px #ff3b4e)}}
  @keyframes chGlowS{0%,100%{filter:drop-shadow(0 0 4px #9b5cff)}50%{filter:drop-shadow(0 0 16px #ffd34d)}}
  @keyframes chSpin{to{transform:rotate(360deg)}}
  @keyframes chBob{0%,100%{transform:translateY(0) rotate(-12deg)}50%{transform:translateY(-4px) rotate(12deg)}}
  @keyframes chRing{0%{box-shadow:0 0 0 0 rgba(255,211,77,.8),0 0 18px #ff3b4e}100%{box-shadow:0 0 0 12px rgba(255,211,77,0),0 0 18px #ff3b4e}}
  @keyframes chRingS{0%{box-shadow:0 0 0 0 rgba(155,92,255,.9),0 0 22px #ffd34d}100%{box-shadow:0 0 0 14px rgba(155,92,255,0),0 0 22px #ffd34d}}
  .nc-wkchamp,.nc-sschamp{background-size:300% 100%!important;-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important;-webkit-text-fill-color:transparent!important;font-weight:900!important}
  .nc-wkchamp{background-image:linear-gradient(90deg,#ffd34d,#ff3b4e,#fff6c8,#ff9a1f,#ffd34d)!important;animation:chShine 1.8s linear infinite,chGlowW 1.4s ease-in-out infinite}
  .nc-sschamp{background-image:linear-gradient(90deg,#9b5cff,#ff3b9a,#ffd34d,#5ab4ff,#3ddc97,#9b5cff)!important;animation:chShine 1.4s linear infinite,chGlowS 1.2s ease-in-out infinite}
  .av.fr-wkchamp,.av.fr-sschamp{overflow:visible}
  .av.fr-wkchamp{--frbg:conic-gradient(from var(--fa,0deg),#ffd34d,#ff3b4e,#fff6c8,#ff9a1f,#ffd34d);animation:chRing 1.3s ease-out infinite}
  .av.fr-sschamp{--frbg:conic-gradient(from var(--fa,0deg),#9b5cff,#ff3b9a,#ffd34d,#5ab4ff,#3ddc97,#9b5cff);animation:chRingS 1.1s ease-out infinite}
  .av.fr-wkchamp::after,.av.fr-sschamp::after{position:absolute;top:-16px;right:-14px;font-size:18px;z-index:4;line-height:1;animation:chBob 1.2s ease-in-out infinite;filter:drop-shadow(0 2px 0 #000)}
  .av.fr-wkchamp::after{content:"⭐"} .av.fr-sschamp::after{content:"👑"}
  .role.chW{background:linear-gradient(90deg,#ffd34d,#ff3b4e,#ffd34d)!important;background-size:200% 100%!important;animation:chShine 2s linear infinite;color:#07060b!important}
  .role.chS{background:linear-gradient(90deg,#9b5cff,#ff3b9a,#ffd34d,#9b5cff)!important;background-size:200% 100%!important;animation:chShine 1.6s linear infinite;color:#fff!important}
  .chpop{display:grid;justify-items:center;gap:12px;text-align:center;padding:10px 0}
  .chpop .av{width:110px!important;height:110px!important;font-size:46px!important}
  .chpop h3{margin:0;font-size:clamp(28px,6vw,44px);line-height:1}
  .chpop .ttl{font-family:var(--display);font-size:22px;letter-spacing:.06em}
  .chbox{display:grid;gap:10px;margin-top:12px}
  .chbox .row{display:flex;align-items:center;gap:12px;background:rgba(0,0,0,.14);border:3px solid var(--inkc);border-radius:6px;padding:8px 12px}
  .chbox .row b{display:block;font-family:var(--display);font-size:22px}`;
  document.head.appendChild(st);

  /* hafta kimliği (Pazar başlar, İstanbul) */
  const wkId=off=>{ const t=new Date(Date.now()+3*3600e3); return new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate()-t.getUTCDay()+(off||0)*7)).toISOString().slice(0,10); };
  const TITLES={week:null,season:null};
  const champOf=uid=>!uid?null:(TITLES.season&&TITLES.season.uid===uid?'s':(TITLES.week&&TITLES.week.uid===uid?'w':null));
  const uidOf=u=>u&&(u.uid||u.id&&String(u.id).length>15&&u.id||((u===AUTH.user||u.me)&&FB.user?FB.user.uid:null));

  /* avatar + isim: şampiyonlara özel hareketli çerçeve ve renk */
  const _av=avatarHTML;
  avatarHTML=function(u,size){ let h=_av(u,size); const c=champOf(uidOf(u)); if(!c) return h;
    return h.replace(/<span class="av[^"]*"/,`<span class="av fr fr-${c==='s'?'sschamp':'wkchamp'} anim glow"`); };
  const _nc=window.ncOf;
  window.ncOf=r=>{ const c=champOf(uidOf(r)); if(c) return c==='s'?'nc-sschamp':'nc-wkchamp'; return _nc?_nc(r):''; };
  const _tag=window.wkTag;
  window.wkTag=(r,i)=>{ const c=champOf(r.uid); if(c==='s') return '<span class="role chS">👑 Sezonun Marvel\'ı</span>'; if(c==='w') return '<span class="role chW">⭐ Haftanın Marvel\'ı</span>'; return _tag?_tag(r,i):(i===0?'<span class="role">Lider</span>':''); };

  /* şampiyon kutusu (sıralama sayfasındaki rol kartının altına) */
  function renderChamps(){ const rc=$('.rolecard'); if(!rc) return; let b=$('#chBox'); if(!b){ b=document.createElement('div'); b.id='chBox'; b.className='chbox'; rc.appendChild(b); }
    const row=(t,lab,c)=>t?`<div class="row">${avatarHTML({display:t.name,avatar:t.avatar||null,uid:t.uid},44)}<div><span class="mono">${lab}</span><b class="${c==='s'?'nc-sschamp':'nc-wkchamp'}">${esc(t.name)}</b><span class="mono">${(t.pts||0).toLocaleString('tr-TR')} puan</span></div></div>`:'';
    b.innerHTML=row(TITLES.season,'👑 Sezonun Marvel\'ı','s')+row(TITLES.week,'⭐ Haftanın Marvel\'ı','w'); }

  /* kazananı herkese duyur: büyük kutlama penceresi (her duyuru kişi başı 1 kez) */
  function seen(id){ try{ const a=JSON.parse(localStorage.getItem('mt_chseen')||'[]'); if(a.includes(id)) return true; a.push(id); localStorage.setItem('mt_chseen',JSON.stringify(a.slice(-20))); }catch(e){} return false; }
  function celebrate(kind,t,extra){ const isMe=FB.user&&t.uid===FB.user.uid;
    if(MTSET.celebrate===false){ toast(kind==='s'?'👑 Sezonun Marvel\'ı seçildi':'⭐ Haftanın Marvel\'ı seçildi',t.name+' — '+(t.pts||0).toLocaleString('tr-TR')+' puan'); return; }
    openModal(kind==='s'?'Sezonun Marvel\'ı':'Haftanın Marvel\'ı'); SFX.play('win'); burst&&burst(true); buzz&&buzz([40,60,40,60,120]);
    swap(`<div class="chpop">${avatarHTML({display:t.name,avatar:t.avatar||null,uid:t.uid},110)}<span class="ttl ${kind==='s'?'nc-sschamp':'nc-wkchamp'}">${kind==='s'?'👑 SEZONUN MARVEL\'I':'⭐ HAFTANIN MARVEL\'I'}</span>
      <h3 class="${kind==='s'?'nc-sschamp':'nc-wkchamp'}">${esc(t.name)}</h3><p class="dim" style="margin:0">${(t.pts||0).toLocaleString('tr-TR')} puanla ${kind==='s'?'sezonu':'haftayı'} birinci bitirdi!${extra||''}</p>
      ${isMe?'<p style="margin:0;color:var(--gold);font-weight:800">Bu sensin! Adın ve çerçeven '+(kind==='s'?'bütün sezon':'bütün hafta')+' boyunca parlayacak.</p>':''}
      <p class="mono dim" style="margin:0">${kind==='s'?'Sezon puanları ve haftalık puanlar sıfırlandı, yeni sezon başladı.':'Haftalık sıralama sıfırlandı, yeni hafta başladı.'}</p>
      <button class="btn p" type="button" id="chOk"><span class="bl"><span>Tebrikler!</span><span>Tebrikler!</span></span></button></div>`);
    $('#chOk').onclick=()=>closeModal(); }

  async function loadTitles(){ if(!FB.ready) return;
    const pw=wkId(-1), ps=SEASON(-1);
    try{ const [w,s]=await Promise.all([FB.db.collection('weeks').doc(pw).get(),FB.db.collection('seasons').doc(ps.id).get()]);
      if(w.exists&&w.data().winner){ const x=w.data().winner; TITLES.week={uid:x.uid,name:x.name,avatar:x.avatar||null,pts:x.wp||0,id:pw}; }
      if(s.exists&&(s.data().top||[])[0]){ const x=s.data().top[0]; TITLES.season={uid:x.uid,name:x.name,avatar:x.avatar||null,pts:x.sp||0,id:ps.id,top:s.data().top}; }
      renderChamps(); renderBoards(); renderUser();
      // yeni seçilen kazananı bir kez kutla (sezon önce)
      if(TITLES.season&&!seen('s:'+TITLES.season.id)){ const t3=TITLES.season.top||[]; celebrate('s',TITLES.season,t3.length>1?'<br>'+t3.slice(1).map((t,i)=>`${['🥈','🥉'][i]} ${esc(t.name)}`).join(' · '):''); }
      else if(TITLES.week&&!seen('w:'+TITLES.week.id)) celebrate('w',TITLES.week);
    }catch(e){} }
  (function w(){ if(FB.ready) setTimeout(loadTitles,4500); else setTimeout(w,800); })();
  /* hafta/sezon değişimi: Pazar 00:00 geçince sayfa kendini tazeler (oyun oynanıyorsa oyun bitince), kazanan duyurusu gelene kadar ara ara tekrar bakar */
  (function(){ const wk0=wkId(0), ss0=SEASON().id; let told=false;
    setInterval(()=>{ if(wkId(0)===wk0&&SEASON().id===ss0) return;
      const busy=(()=>{ const ar=$('#arena'), m=$('#modal'), lt=document.getElementById('loot'); return (ar&&!ar.hidden)||lt||(m&&!m.hidden&&/oyun|yarış|kim|hafıza|gerçek|yüksek/i.test(($('#mTitle')||{}).textContent||'')&&$('#mBody .opts, #mBody .opt, #mBody .mgrid'))||document.activeElement&&/INPUT|TEXTAREA/.test(document.activeElement.tagName); })();
      if(busy){ if(!told){ told=true; toast(SEASON().id!==ss0?'Sezon bitti!':'Hafta bitti!','Oyunun bitince sıralama yenilenecek ve kazanan açıklanacak.'); } return; }
      try{ sessionStorage.setItem('mt_roll','1'); }catch(e){} location.reload(); },15000);
    let tries=0; const retry=()=>{ const pw=wkId(-1), sinceWk=Date.now()-(+new Date(pw+'T00:00:00Z')+7*864e5-3*3600e3);
      if(TITLES.week&&TITLES.week.id===pw) return; if(sinceWk>6*36e5||tries++>40) return;
      window.__fsBust&&window.__fsBust('weeks'); window.__fsBust&&window.__fsBust('seasons'); loadTitles(); setTimeout(retry,120e3); };
    setTimeout(retry,60e3); })();
})();


/* ========================= PARÇA 3A: AYARLAR + ENVANTER + KOLEKSİYON ========================= */
(function(){
  const st=document.createElement('style'); st.textContent=`
  html.mt-noanim *,html.mt-noanim *::before,html.mt-noanim *::after{animation-duration:.001s!important;animation-iteration-count:1!important;transition-duration:.001s!important;scroll-behavior:auto!important}
  html.mt-lowfx *{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
  html.mt-lowfx #grain,html.mt-lowfx .dots2,html.mt-lowfx .speed{display:none!important}
  html.mt-nocur #cur,html.mt-nocur #curd{display:none!important}
  html.mt-nocur,html.mt-nocur body{cursor:auto!important} html.mt-nocur a,html.mt-nocur button,html.mt-nocur [role=button]{cursor:pointer!important}
  html.mt-nochat #gcB{display:none!important}
  .setw{display:grid;gap:18px}
  .setg{display:grid;gap:8px}
  .setg h4{margin:0;font-family:var(--display);font-size:22px;letter-spacing:.04em}
  .setr{display:flex;align-items:center;gap:14px;background:var(--s2);border:3px solid var(--inkc);border-radius:8px;padding:12px 14px}
  .setr .tx{flex:1;min-width:0} .setr .tx b{display:block;font-size:15px} .setr .tx small{color:var(--dim);font-size:12.5px;line-height:1.35}
  .sw{position:relative;width:52px;height:30px;flex:none;border-radius:99px;background:#3a3550;border:3px solid var(--inkc);cursor:pointer;transition:background .2s}
  .sw::after{content:"";position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 2px 0 #0006;transition:transform .2s}
  .sw[aria-checked="true"]{background:var(--ok,#3ddc97)} .sw[aria-checked="true"]::after{transform:translateX(22px)}
  .setr input[type=range]{width:min(200px,40vw);accent-color:var(--gold)}
  .setr output{font-family:var(--mono);min-width:34px;text-align:right}
  .setnote{display:none;align-items:center;gap:12px;background:#3a2a10;border:3px solid var(--gold);border-radius:8px;padding:10px 14px;font-weight:700}
  .setnote.on{display:flex}
  .invtabs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px}
  .invtabs::-webkit-scrollbar{display:none}
  .invtabs button{flex:none;font:800 13px var(--body);padding:8px 12px;border-radius:99px;border:3px solid var(--inkc);background:var(--s2);color:var(--fg);cursor:pointer;white-space:nowrap}
  .invtabs button.on{background:var(--gold);color:var(--inkc)}
  .cxtools{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .cxtools input{flex:1;min-width:160px;height:42px!important;font-size:15px!important}
  .cxtools select{height:42px;border:3px solid var(--inkc);border-radius:6px;background:var(--s2);color:var(--fg);font:700 13px var(--body);padding:0 8px}
  .cxempty{grid-column:1/-1;text-align:center;color:var(--dim);padding:24px}
  @media (max-width:600px){#invBtn{display:none!important}}`;
  document.head.appendChild(st);

  /* ---------- ayarlar ---------- */
  const DEF={anim:true,intro:true,smooth:true,fx:true,lowfx:false,cursor:true,vib:true,chat:true,celebrate:true,hideOnline:false};
  const get=k=>MTSET[k]===undefined?DEF[k]:MTSET[k];
  function save(){ try{ localStorage.setItem('mt_set',JSON.stringify(MTSET)); }catch(e){} }
  function applyClasses(){ const h=document.documentElement; h.classList.toggle('mt-noanim',!get('anim')); h.classList.toggle('mt-lowfx',get('lowfx')); h.classList.toggle('mt-nocur',!get('cursor')); h.classList.toggle('mt-nochat',!get('chat')); }
  applyClasses();
  window.MTSET=MTSET;
  const ROWS=[
    ['🎬 Görünüm',[
      ['anim','Animasyonlar','Sayfa geçişleri, kayan yazılar ve hareketli efektler. Kapatınca site daha sade ve hızlı olur.',1],
      ['intro','Açılış animasyonu','Site açılırken çıkan RAVONİA GAME logosu ve "başlamak için dokun" ekranı.',1],
      ['smooth','Yumuşak kaydırma','Fare tekerleğiyle kayarken akıcı kaydırma (sadece bilgisayarda).',1],
      ['fx','Konfeti ve parçacıklar','Kazanınca, kart açınca ve level atlayınca çıkan patlamalar.'],
      ['lowfx','Düşük performans modu','Bulanık arka planları ve kumlu dokuyu kapatır. Eski telefon ve bilgisayarlar için.'],
      ['cursor','Özel imleç','Sitenin kendi fare imleci (sadece bilgisayarda).']]],
    ['🔊 Ses ve titreşim',[
      ['@music','Müzik',''],['@sfx','Efekt sesleri',''],
      ['vib','Titreşim','Telefonda doğru, yanlış ve kazanma anlarında titreşir.']]],
    ['💬 Sohbet ve bildirimler',[
      ['chat','Genel sohbet butonu','Sol alttaki kırmızı sohbet butonu.'],
      ['celebrate','Kazanan kutlama penceresi','Haftanın ve Sezonun Marvel\'ı seçilince çıkan büyük pencere. Kapatırsan sadece küçük bildirim gelir.']]],
    ['🕵️ Gizlilik',[
      ['hideOnline','Çevrimiçi durumumu gizle','Arkadaşların ve diğer oyuncular senin çevrimiçi olduğunu ve ne oynadığını göremez.']]]];
  let needReload=false;
  function openSettings(){ openModal('Ayarlar');
    const vm=$('#volM'), vs=$('#volS');
    swap(`<div class="setw"><div class="setnote" id="setNote">Bu değişiklik sayfa yenilenince uygulanır.<button class="btn p sm" id="setRl" type="button" style="margin-left:auto"><span class="bl"><span>Yenile</span><span>Yenile</span></span></button></div>
      ${ROWS.map(([t,rows])=>`<div class="setg"><h4>${t}</h4>${rows.map(([k,n,d,rl])=>k[0]==='@'?
        `<div class="setr"><div class="tx"><b>${n}</b></div><input type="range" min="0" max="100" step="1" data-vol="${k.slice(1)}" value="${(k==='@music'?vm:vs)?(k==='@music'?vm:vs).value:60}" aria-label="${n}"><output>${(k==='@music'?vm:vs)?(k==='@music'?vm:vs).value:60}</output></div>`:
        `<div class="setr"><div class="tx"><b>${n}</b><small>${d}</small></div><button class="sw" role="switch" type="button" data-k="${k}" data-rl="${rl?1:''}" aria-checked="${!!get(k)}" aria-label="${n}"></button></div>`).join('')}</div>`).join('')}
      <div class="rowb"><button class="ghost" id="setReset" type="button">Ayarları sıfırla</button></div>
      <p class="dim" style="margin:0;font-size:12.5px">Ayarlar bu cihazda saklanır.</p></div>`);
    if(needReload) $('#setNote').classList.add('on');
    $('#setRl').onclick=()=>location.reload();
    $$('.sw',mBody).forEach(b=>b.onclick=()=>{ const k=b.dataset.k, v=!(b.getAttribute('aria-checked')==='true'); MTSET[k]=v; save(); b.setAttribute('aria-checked',v); SFX.play('click'); applyClasses();
      if(k==='smooth'&&window.lenis){ v?lenis.start():lenis.stop(); }
      if(b.dataset.rl){ needReload=true; $('#setNote').classList.add('on'); } });
    $$('[data-vol]',mBody).forEach(r=>r.oninput=()=>{ const t=$(r.dataset.vol==='music'?'#volM':'#volS'); r.nextElementSibling.textContent=r.value; if(t){ t.value=r.value; t.dispatchEvent(new Event('input',{bubbles:true})); t.dispatchEvent(new Event('change',{bubbles:true})); } });
    $('#setReset').onclick=()=>{ Object.keys(MTSET).forEach(k=>delete MTSET[k]); save(); applyClasses(); needReload=true; openSettings(); toast('Ayarlar sıfırlandı','Hepsi varsayılana döndü.'); };
  }
  window.openSettings=openSettings;

  /* ---------- üst menü: ⚙ ayarlar ve 🎒 envanter ---------- */
  const anchor=$('.sndwrap')||$('#dailyBtn');
  if(anchor){ const g=document.createElement('button'); g.className='hbtn'; g.id='setBtn'; g.type='button'; g.setAttribute('aria-label','Ayarlar'); g.textContent='⚙️'; g.onclick=()=>{ SFX.play('click'); openSettings(); };
    const i=document.createElement('button'); i.className='hbtn'; i.id='invBtn'; i.type='button'; i.setAttribute('aria-label','Envanter'); i.textContent='🎒'; i.onclick=()=>{ SFX.play('click'); openInventory(); };
    anchor.after(g); anchor.before(i); }
  const _oa=openAccount;
  openAccount=function(){ _oa(); const lg=$('.lg'); if(!lg||$('#acSet')) return; const ac=$('#acCoins'); const box=ac?ac.parentNode:lg;
    const a=document.createElement('button'); a.id='acInv'; a.type='button'; a.className='ghost'; a.textContent='🎒 Envanter'; a.onclick=()=>openInventory();
    const b=document.createElement('button'); b.id='acSet'; b.type='button'; b.className='ghost'; b.textContent='⚙️ Ayarlar'; b.onclick=()=>openSettings();
    box.appendChild(a); box.appendChild(b); };

  /* ---------- envanter: sekmeli görünüm ---------- */
  let invTab=0;
  window.__invDecorate=function(){ const w=$('.invwrap',mBody); if(!w) return; mTitle.textContent='Envanter';
    const stabs=$('.stabs',mBody); stabs&&(stabs.style.display='none'); const top=$('.shop-top>.dim',mBody); top&&(top.style.display='none');
    const shc=$('#shCol',mBody); if(shc){ shc.textContent='🛒 Mağaza'; shc.onclick=()=>{ window.__invMode=false; openShop(); }; }
    const secs=$$('.invsec',w); if(!secs.length) return; if(invTab>=secs.length) invTab=0;
    const bar=document.createElement('div'); bar.className='invtabs';
    bar.innerHTML=secs.map((s,i)=>`<button type="button" data-it="${i}" class="${i===invTab?'on':''}">${esc((s.querySelector('h3')||{}).textContent||'Bölüm').replace(/\s+\d+\s*(adet|kart)\s*$/,m=>' · '+m.trim())}</button>`).join('');
    secs[0].before(bar);
    const show=i=>{ invTab=i; secs.forEach((s,k)=>s.style.display=k===i?'':'none'); $$('button',bar).forEach((b,k)=>b.classList.toggle('on',k===i)); };
    $$('button',bar).forEach(b=>b.onclick=()=>{ SFX.play('click'); show(+b.dataset.it); }); show(invTab); };
  const _os=openShop;
  openShop=function(){ _os(); if(window.__invMode) window.__invDecorate(); };
  window.openShop=openShop;
  function openInventory(){ window.__invMode=true; window.__setShopTab&&window.__setShopTab('inv'); openShop(); }
  window.openInventory=openInventory;
  // modal kapanınca envanter modu biter
  document.addEventListener('click',e=>{ if(e.target.closest&&e.target.closest('#mClose,.mclose,[data-close]')) window.__invMode=false; },true);

  /* ---------- koleksiyon: tek bir koleksiyon ekranı (ekonomi.js'deki satış/takaslı olan) ---------- */
  const _oc=openCollection;
  openCollection=function(){ return (window.__ekoCol||_oc)(); };
})();


/* ========================= PARÇA 3B: SEZON YOLU STİLİ + YENİ PAKET AÇILIŞI + MOBİL UYUM ========================= */
(function(){
  const st=document.createElement('style'); st.textContent=`
  .cr{display:grid;gap:14px}
  .cr-hd{display:flex;gap:14px;align-items:center;background:linear-gradient(135deg,#2a1450,#120a26);border:4px solid var(--inkc);box-shadow:6px 6px 0 var(--inkc);border-radius:12px;padding:14px;position:sticky;top:0;z-index:5}
  .cr-badge{width:84px;flex:none;display:grid;justify-items:center;line-height:1;padding:10px 4px;border-radius:12px;background:linear-gradient(160deg,#ffd34d,#c98a12);color:#07060b;border:4px solid #07060b;box-shadow:3px 3px 0 #07060b;transform:rotate(-4deg)}
  .cr-badge b{font-family:var(--display);font-size:40px} .cr-badge small{font:900 10px var(--body);letter-spacing:.06em}
  .cr-hi{flex:1;min-width:0;display:grid;gap:6px} .cr-hi>b{font-family:var(--display);font-size:22px;letter-spacing:.03em} .cr-hi small{color:#cfc6e6;font-size:12px}
  .cr-bar{position:relative;height:22px;border-radius:99px;background:#0a0716;border:3px solid #07060b;overflow:hidden}
  .cr-bar i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#3ddc97,#ffd34d);box-shadow:0 0 12px #ffd34d88}
  .cr-bar span{position:relative;display:block;text-align:center;font:900 12px/16px var(--body);color:#fff;text-shadow:0 1px 0 #000}
  .cr-all{justify-self:center;animation:crPulse 1.2s ease-in-out infinite}
  @keyframes crPulse{50%{transform:scale(1.05)}}
  .cr-road{position:relative;display:grid;gap:14px;padding:60px 0;background:radial-gradient(circle at 50% 0,#2a1450 0,transparent 60%)}
  .cr-line{position:absolute;left:50%;top:60px;bottom:60px;width:12px;margin-left:-6px;border-radius:6px;background:#1c1530;border:3px solid #07060b;overflow:hidden}
  .cr-line i{position:absolute;left:0;right:0;top:0;background:linear-gradient(#3ddc97,#ffd34d);box-shadow:0 0 14px #ffd34d}
  .cr-start,.cr-end{position:absolute;left:50%;transform:translateX(-50%);font:900 12px var(--body);letter-spacing:.1em;color:var(--gold);white-space:nowrap}
  .cr-start{top:22px} .cr-end{bottom:22px}
  .cr-row{position:relative;display:grid;grid-template-columns:1fr 56px 1fr;align-items:center}
  .cr-node{grid-column:2;justify-self:center;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#2a2340;border:4px solid #07060b;z-index:2;font-family:var(--display);font-size:18px;color:#8d84a8}
  .cr-card{grid-row:1;display:grid;justify-items:center;gap:6px;text-align:center;padding:12px 10px;border-radius:12px;background:#1d1830;border:4px solid #07060b;box-shadow:5px 5px 0 #07060b;position:relative;transition:transform .2s}
  .cr-row.l .cr-card{grid-column:1;margin-right:10px} .cr-row.r .cr-card{grid-column:3;margin-left:10px}
  .cr-card::after{content:"";position:absolute;top:50%;width:12px;height:4px;background:#07060b}
  .cr-row.l .cr-card::after{right:-14px} .cr-row.r .cr-card::after{left:-14px}
  .cr-card b{font-size:13px;line-height:1.2}
  .cr-ic{font-size:34px;line-height:1;filter:drop-shadow(2px 2px 0 #000)}
  .cr-card .av{width:54px!important;height:54px!important;font-size:22px!important}
  .cr-st{font:800 11px var(--body);color:#8d84a8}
  .cr-row.big .cr-card{background:linear-gradient(160deg,#3a1d6e,#1d1830);border-color:#9b5cff}
  .cr-row.big .cr-ic{font-size:44px}
  .cr-row.lk .cr-card{filter:grayscale(.85);opacity:.6}
  .cr-row.lk .cr-card::before{content:"🔒";position:absolute;top:-10px;right:-8px;font-size:18px}
  .cr-row.got .cr-card{opacity:.55} .cr-row.got .cr-node,.cr-row.rd .cr-node{background:linear-gradient(#3ddc97,#1f9e65);color:#07060b}
  .cr-row.rd .cr-card{background:linear-gradient(160deg,#ffd34d,#ff9a1f);color:#07060b;border-color:#07060b;animation:crGlow 1.2s ease-in-out infinite}
  .cr-row.rd .cr-st{color:#07060b}
  @keyframes crGlow{0%,100%{box-shadow:5px 5px 0 #07060b,0 0 0 0 #ffd34d88}50%{box-shadow:5px 5px 0 #07060b,0 0 22px 6px #ffd34d88}}
  .cr-take{font-family:var(--display);font-size:20px;letter-spacing:.06em;padding:4px 22px;border-radius:8px;background:#3ddc97;color:#07060b;border:3px solid #07060b;box-shadow:3px 3px 0 #07060b;cursor:pointer}
  .cr-take:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #07060b}
  .cr-row.pop .cr-card{transform:scale(1.15) rotate(-3deg)}
  .cr-me{position:absolute;left:50%;transform:translate(-50%,-50%);z-index:4;display:grid;justify-items:center;gap:2px;pointer-events:none}
  .cr-me .av{width:40px!important;height:40px!important;border:3px solid #ffd34d!important;box-shadow:0 0 14px #ffd34d}
  .cr-me span{font:900 10px var(--body);background:#ff3b4e;color:#fff;padding:1px 6px;border-radius:4px;border:2px solid #07060b}
  @media (max-width:520px){.cr-row{grid-template-columns:1fr 40px 1fr}.cr-node{width:36px;height:36px;font-size:15px}.cr-card{padding:10px 6px}.cr-card b{font-size:12px}.cr-ic{font-size:28px}.cr-badge{width:70px}.cr-badge b{font-size:32px}}
  /* yeni paket açılışı */
  .nx{display:grid;gap:16px;justify-items:center;padding:6px 0 4px;position:relative}
  .nx-tip{font:800 14px var(--body);color:var(--dim)}
  .nx-fan{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;perspective:1100px;width:100%}
  .nx-c{width:min(150px,28vw);aspect-ratio:5/7;position:relative;cursor:pointer;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.2,.9,.3,1.2);animation:nxDeal .5s cubic-bezier(.2,1.3,.4,1) backwards}
  @keyframes nxDeal{from{transform:translateY(-120px) rotate(-20deg) scale(.6);opacity:0}}
  .nx-c.flip{transform:rotateY(180deg)}
  .nx-f,.nx-b{position:absolute;inset:0;border-radius:12px;backface-visibility:hidden;-webkit-backface-visibility:hidden;border:4px solid #07060b;box-shadow:5px 5px 0 #07060b;overflow:hidden}
  .nx-b{background:radial-gradient(circle at 50% 40%,#3a1d6e,#120a26);display:grid;place-items:center}
  .nx-b img{width:58%;filter:drop-shadow(0 0 10px #9b5cff)}
  .nx-b::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.18) 45%,transparent 60%);background-size:250% 100%;animation:nxSh 2.4s linear infinite}
  @keyframes nxSh{from{background-position:150% 0}to{background-position:-100% 0}}
  .nx-c[data-r="e"] .nx-b{box-shadow:5px 5px 0 #07060b,0 0 26px #ff3b4e;animation:nxShake .5s ease-in-out infinite}
  .nx-c[data-r="a"] .nx-b{box-shadow:5px 5px 0 #07060b,0 0 18px #ffb627}
  @keyframes nxShake{25%{transform:rotate(-2deg)}75%{transform:rotate(2deg)}}
  .nx-f{transform:rotateY(180deg);background:#000}
  .nx-f img{width:100%;height:100%;object-fit:cover;display:block}
  .nx-c[data-r="a"] .nx-f::after,.nx-c[data-r="e"] .nx-f::after{content:"";position:absolute;inset:0;mix-blend-mode:color-dodge;background:linear-gradient(115deg,transparent 20%,rgba(255,80,200,.5) 35%,rgba(80,200,255,.5) 50%,rgba(255,230,80,.5) 65%,transparent 80%);background-size:250% 100%;animation:nxSh 2s linear infinite}
  .nx-tag{position:absolute;left:50%;bottom:-12px;transform:translateX(-50%) rotateY(180deg);backface-visibility:hidden;z-index:3;font:900 11px var(--body);padding:2px 8px;border-radius:4px;border:2px solid #07060b;white-space:nowrap}
  .nx-tag.new{background:#3ddc97;color:#07060b} .nx-tag.dup{background:#2a2340;color:#fff}
  .nx-rar{position:absolute;left:50%;top:-12px;transform:translateX(-50%) rotateY(180deg);backface-visibility:hidden;z-index:3;font:900 10px var(--body);letter-spacing:.08em;padding:2px 8px;border-radius:4px;border:2px solid #07060b;color:#07060b}
  .nx-beam{position:fixed;inset:0;pointer-events:none;z-index:9998;opacity:0;background:radial-gradient(circle at 50% 50%,var(--bc) 0,transparent 60%)}
  .nx-beam.go{animation:nxBeam .9s ease-out}
  @keyframes nxBeam{20%{opacity:.75}100%{opacity:0}}
  .nx-sum{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
  .nx-sum span{font:800 12px var(--body);padding:4px 10px;border-radius:99px;border:2px solid #07060b;color:#07060b}
  /* mobil uyum */
  @media (max-width:820px){
    #cookieBar,.ckbar,[id*="cookie" i]{max-height:none}
    .ravobtn{top:auto!important;left:auto!important;right:12px!important;bottom:calc(86px + env(safe-area-inset-bottom,0px))!important;width:50px!important;height:50px!important}
    .ravotip{display:none!important}
    .gcB{bottom:calc(86px + env(safe-area-inset-bottom,0px))!important;left:12px!important;width:50px!important;height:50px!important}
  }
  @media (max-width:600px){
    .hright{gap:5px!important} .hbtn{width:34px!important;height:34px!important;font-size:16px!important}
    #questBtn,#bpBtn,#adminBtn:not([hidden]) ~ #setBtn{display:none!important}
    .modal .mbox,#mbox{max-height:92vh}
    .lbtabs button{font-size:15px!important;padding:6px 12px!important}
    .xpanel{padding:14px!important}
    .extras{grid-template-columns:1fr!important}
    input,select,textarea{font-size:16px!important}
  }`;
  document.head.appendChild(st);

  /* çerez bildirimi: telefonda küçük şerit */
  (function(){ const s2=document.createElement('style');
    s2.textContent=`@media (max-width:820px){#ckBar:not(.det){left:8px!important;right:8px!important;bottom:calc(84px + env(safe-area-inset-bottom,0px))!important;padding:10px 12px!important;max-width:none!important;width:auto!important;transform:none!important}#ckBar:not(.det) p{font-size:12px!important;line-height:1.35!important;margin:0 0 8px!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}#ckBar:not(.det) button{height:36px!important;font-size:15px!important}}`;
    document.head.appendChild(s2); })();

  /* yeni paket açılışı (normal açılış; "hızlı aç" eskisi gibi) */
  const _po=packOpen, RN={b:'BRONZ',g:'NADİR',a:'EPİK',e:'EFSANE'}, RC={b:'#C8834A',g:'#D5DAE4',a:'#FFB627',e:'#FF3B4E'}, RO={b:0,g:1,a:2,e:3};
  const back=(document.querySelector('.brandlogo')||{}).src||'';
  packOpen=function(list,pack,fast){ if(fast||!list||!list.length) return _po(list,pack,fast);
    const c=myCards(); const items=list.map(h=>{ const isNew=!c[h.id]; c[h.id]=(c[h.id]||0)+1; return {h,isNew,n:c[h.id]}; }); setCards(c); addXP(40*list.length);
    items.sort((a,b)=>RO[a.h.r]-RO[b.h.r]);
    const cnt={b:0,g:0,a:0,e:0}; items.forEach(it=>cnt[it.h.r]++);
    swap(`<div class="nx"><div class="nx-beam" id="nxBeam"></div><span class="nx-tip" id="nxTip">Kartlara dokun, çevir! (en nadiri en sonda 👀)</span>
      <div class="nx-fan">${items.map((it,i)=>`<div class="nx-c" data-i="${i}" data-r="${it.h.r}" style="animation-delay:${i*.09}s"><div class="nx-b">${back?`<img src="${back}" alt="">`:'?'}</div><div class="nx-f"><img src="${cardFace(it.h)}" alt="${esc(it.h.ad)}"></div><span class="nx-rar" style="background:${RC[it.h.r]}">${RN[it.h.r]}</span><span class="nx-tag ${it.isNew?'new':'dup'}">${it.isNew?'YENİ!':'x'+it.n}</span></div>`).join('')}</div>
      <div class="nx-sum">${['e','a','g','b'].filter(r=>cnt[r]).map(r=>`<span style="background:${RC[r]}">${cnt[r]} ${RN[r]}</span>`).join('')}</div>
      <div class="rowb" style="justify-content:center"><button class="ghost" id="nxAll" type="button">⚡ Hepsini çevir</button>${pack?`<button class="ghost" id="pAg" type="button">🔁 Tekrar aç · 🪙 ${pack.price.toLocaleString('tr-TR')}</button>`:''}<button class="btn p" id="pCol" type="button"><span class="bl"><span>Koleksiyona git</span><span>Koleksiyona git</span></span></button></div></div>`);
    let opened=0; const all=$$('.nx-c',mBody);
    const flip=el=>{ if(el.classList.contains('flip')) return; el.classList.add('flip'); opened++; const r=el.dataset.r; SFX.sfx&&SFX.sfx('flip');
      setTimeout(()=>{ if(r==='e'||r==='a'){ const b=$('#nxBeam'); if(b){ b.style.setProperty('--bc',RC[r]); b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); } SFX.sfx&&SFX.sfx(r==='e'?'cosmic':'reveal'); burst&&burst(true); buzz&&buzz(r==='e'?[60,40,60,40,120]:[40,60,40]);
          if(r==='e'&&G) G.fromTo(mBody,{x:-8},{x:0,duration:.5,ease:'elastic.out(1,.25)'}); } else SFX.sfx&&SFX.sfx('cardhit');
        if(opened===all.length){ const t=$('#nxTip'); t&&(t.textContent='Hepsi koleksiyonunda!'); } },350); };
    all.forEach(el=>el.onclick=()=>flip(el));
    $('#nxAll').onclick=()=>{ all.forEach((el,i)=>setTimeout(()=>flip(el),i*260)); };
    const ag=$('#pAg'); ag&&(ag.onclick=()=>{ window.__MT_REPACK&&window.__MT_REPACK(pack); });
    $('#pCol').onclick=()=>openCollection();
    SFX.play('open'); };
  window.packOpen=packOpen;
})();


/* ========================= PARÇA 4A: ÇEVRİMİÇİ DURUMU + DUYURU GÖRÜLME + MASA VE ÇEVRE TEMALARI ========================= */
(function(){
  const st=document.createElement('style'); st.textContent=`
  .ost{display:inline-flex;align-items:center;gap:5px;font:800 11px var(--body);color:var(--dim);margin-top:2px;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
  .ost i{width:8px;height:8px;border-radius:50%;background:#555;flex:none}
  .ost.on{color:#3ddc97} .ost.on i{background:#3ddc97;box-shadow:0 0 6px #3ddc97}
  .ost.play{color:#ffb627} .ost.play i{background:#ffb627;box-shadow:0 0 6px #ffb627;animation:ostP 1s ease-in-out infinite}
  .ost.match{color:#ff5a6a} .ost.match i{background:#ff3b4e;box-shadow:0 0 6px #ff3b4e;animation:ostP .7s ease-in-out infinite}
  @keyframes ostP{50%{opacity:.35}}
  .an .views{display:inline-flex;align-items:center;gap:4px;margin-left:8px;font:800 12px var(--body);opacity:.75}
  /* ---- masa + çevre temaları ---- */
  #arena .envl{position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden}
  #arena .envl b,#arena .envl i,#arena .envl s{position:absolute;display:block}
  #arena[data-theme="default"] .envl{display:none}
  /* Avengers Kulesi: gece şehri */
  #arena[data-theme="avengers"]{background:linear-gradient(180deg,#0b1a3d 0%,#1a2f63 45%,#0a0f22 100%)!important}
  #arena[data-theme="avengers"] .envl b{left:0;right:0;bottom:66%;height:26%;background:
    linear-gradient(#0a0f22,#0a0f22) 2% 100%/6% 55% no-repeat,linear-gradient(#0d1430,#0d1430) 9% 100%/5% 75% no-repeat,linear-gradient(#0a0f22,#0a0f22) 15% 100%/7% 45% no-repeat,
    linear-gradient(#111a3a,#111a3a) 47% 100%/6% 100% no-repeat,linear-gradient(#0d1430,#0d1430) 56% 100%/5% 62% no-repeat,linear-gradient(#0a0f22,#0a0f22) 80% 100%/7% 70% no-repeat,linear-gradient(#0d1430,#0d1430) 90% 100%/6% 50% no-repeat;opacity:.95}
  #arena[data-theme="avengers"] .envl i{left:49.2%;bottom:91%;width:1.6%;height:9%;background:linear-gradient(#ffd34d,#ff9a1f);box-shadow:0 0 30px 8px #4a7bff;clip-path:polygon(50% 0,100% 30%,100% 100%,0 100%,0 30%)}
  #arena[data-theme="avengers"] .envl s{inset:0;background:radial-gradient(1.5px 1.5px at 10% 20%,#fff,transparent),radial-gradient(1.5px 1.5px at 30% 8%,#fff,transparent),radial-gradient(1px 1px at 62% 15%,#fff,transparent),radial-gradient(1.5px 1.5px at 85% 25%,#fff,transparent),radial-gradient(2px 2px at 75% 6%,#bcd,transparent);animation:envTw 3s ease-in-out infinite}
  #arena[data-theme="avengers"] .felt{background:radial-gradient(closest-side,rgba(255,255,255,.15),transparent 62%),radial-gradient(rgba(0,0,0,.28) 1px,transparent 1.3px) 0 0/7px 7px,radial-gradient(closest-side,#1f4fd8 0%,#183a9e 50%,#0f2463 80%,#0a1640 100%)!important;
    box-shadow:inset 0 0 0 9px #d4141f,inset 0 0 0 13px #07060b,inset 0 0 100px 40px rgba(0,0,0,.55),0 0 0 16px #c9ced8,0 0 0 21px #6b7280,0 0 0 25px #07060b,0 22px 0 22px #2b3240,0 26px 0 25px #07060b,0 90px 110px 50px rgba(0,0,0,.8)!important}
  /* Wakanda: mor vibranyum ormanı */
  #arena[data-theme="wakanda"]{background:radial-gradient(900px 500px at 50% 0,#4a1a7a,transparent 70%),linear-gradient(180deg,#1a0833,#07020f)!important}
  #arena[data-theme="wakanda"] .envl b{left:-5%;right:-5%;bottom:64%;height:30%;background:radial-gradient(60px 120px at 5% 100%,#0e2a14 60%,transparent 61%),radial-gradient(80px 160px at 14% 100%,#0b2010 60%,transparent 61%),radial-gradient(70px 130px at 86% 100%,#0e2a14 60%,transparent 61%),radial-gradient(90px 170px at 95% 100%,#0b2010 60%,transparent 61%),radial-gradient(120px 50px at 50% 100%,#1a0b30 60%,transparent 61%)}
  #arena[data-theme="wakanda"] .envl i{left:50%;top:8%;width:120px;height:120px;margin-left:-60px;border-radius:50%;background:radial-gradient(circle,#e2d6ff,#9b5cff 45%,transparent 70%);filter:blur(2px);animation:envPulse 3s ease-in-out infinite}
  #arena[data-theme="wakanda"] .envl s{inset:0;background:radial-gradient(3px 3px at 20% 60%,#c8a8ff,transparent),radial-gradient(2px 2px at 70% 50%,#c8a8ff,transparent),radial-gradient(3px 3px at 40% 40%,#9b5cff,transparent),radial-gradient(2px 2px at 85% 65%,#e2d6ff,transparent);animation:envFloat 6s ease-in-out infinite}
  #arena[data-theme="wakanda"] .felt{background:radial-gradient(closest-side,rgba(226,214,255,.18),transparent 62%),repeating-conic-gradient(from 0deg,rgba(0,0,0,.18) 0 10deg,transparent 10deg 20deg),radial-gradient(closest-side,#5a2a9e 0%,#3d1a70 50%,#24104a 80%,#160a2e 100%)!important;
    box-shadow:inset 0 0 0 9px #c0c4cc,inset 0 0 0 13px #07060b,inset 0 0 100px 40px rgba(0,0,0,.55),0 0 0 16px #2a2a33,0 0 0 21px #9b5cff,0 0 0 25px #07060b,0 22px 0 22px #1b1b22,0 26px 0 25px #07060b,0 90px 110px 50px rgba(0,0,0,.8)!important}
  /* Asgard: altın saray + Bifrost */
  #arena[data-theme="asgard"]{background:radial-gradient(1000px 600px at 50% -10%,#3a6f8a,transparent 65%),linear-gradient(180deg,#0f3344,#04121a)!important}
  #arena[data-theme="asgard"] .envl b{left:50%;bottom:66%;width:60%;height:30%;transform:translateX(-50%);background:linear-gradient(#e8b23a,#9c6b14) 50% 100%/10% 100% no-repeat,linear-gradient(#d6a030,#8a5c10) 38% 100%/7% 70% no-repeat,linear-gradient(#d6a030,#8a5c10) 62% 100%/7% 70% no-repeat,linear-gradient(#c4902a,#7a500c) 26% 100%/6% 50% no-repeat,linear-gradient(#c4902a,#7a500c) 74% 100%/6% 50% no-repeat;filter:drop-shadow(0 0 20px #ffd34d88);opacity:.85}
  #arena[data-theme="asgard"] .envl i{left:-10%;right:-10%;top:30%;height:14px;background:linear-gradient(90deg,#ff3b4e,#ff9a1f,#ffd34d,#3ddc97,#4a7bff,#9b5cff);transform:rotate(-8deg);filter:blur(1px);box-shadow:0 0 30px #fff8;opacity:.8;animation:envPulse 2.5s ease-in-out infinite}
  #arena[data-theme="asgard"] .felt{background:radial-gradient(closest-side,rgba(255,240,200,.25),transparent 62%),radial-gradient(rgba(0,0,0,.25) 1px,transparent 1.3px) 0 0/7px 7px,radial-gradient(closest-side,#1d6b78 0%,#14505a 50%,#0c3640 80%,#082830 100%)!important;
    box-shadow:inset 0 0 0 9px #ffd34d,inset 0 0 0 13px #07060b,inset 0 0 100px 40px rgba(0,0,0,.5),0 0 0 16px #c98a12,0 0 0 21px #8a5a0a,0 0 0 25px #07060b,0 22px 0 22px #5a3a06,0 26px 0 25px #07060b,0 90px 110px 50px rgba(0,0,0,.8)!important}
  /* Uzay: Knowhere / galaksi */
  #arena[data-theme="space"]{background:radial-gradient(700px 400px at 20% 20%,#5a1a6a88,transparent 70%),radial-gradient(800px 500px at 85% 30%,#1a4a8a88,transparent 70%),#03020a!important}
  #arena[data-theme="space"] .envl s{inset:0;background:radial-gradient(1.5px 1.5px at 8% 12%,#fff,transparent),radial-gradient(1px 1px at 22% 30%,#fff,transparent),radial-gradient(2px 2px at 35% 8%,#cdf,transparent),radial-gradient(1px 1px at 48% 22%,#fff,transparent),radial-gradient(1.5px 1.5px at 66% 14%,#fff,transparent),radial-gradient(2px 2px at 78% 34%,#fdc,transparent),radial-gradient(1px 1px at 92% 10%,#fff,transparent),radial-gradient(1.5px 1.5px at 12% 45%,#fff,transparent),radial-gradient(1px 1px at 88% 52%,#fff,transparent);animation:envTw 2.5s ease-in-out infinite}
  #arena[data-theme="space"] .envl b{right:6%;top:8%;width:170px;height:170px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffb38a,#c8502a 45%,#4a1408 80%);box-shadow:0 0 60px #ff6a3a66}
  #arena[data-theme="space"] .envl i{right:calc(6% - 40px);top:calc(8% + 70px);width:250px;height:30px;border-radius:50%;border:5px solid #ffd3a888;transform:rotate(-15deg)}
  #arena[data-theme="space"] .felt{background:radial-gradient(closest-side,rgba(180,140,255,.18),transparent 62%),radial-gradient(1.2px 1.2px at 30% 40%,#fff,transparent),radial-gradient(1.2px 1.2px at 70% 60%,#fff,transparent),radial-gradient(closest-side,#20103d 0%,#140a2a 55%,#0b061a 80%,#06030f 100%)!important;
    box-shadow:inset 0 0 0 9px #5ab4ff,inset 0 0 0 13px #07060b,inset 0 0 100px 40px rgba(0,0,0,.55),0 0 0 16px #3a3f55,0 0 0 21px #5ab4ff,0 0 0 25px #07060b,0 22px 0 22px #20243a,0 26px 0 25px #07060b,0 90px 110px 50px rgba(0,0,0,.8),0 0 80px 20px #5ab4ff33!important}
  /* Sanctum: Doktor Strange'in mistik salonu */
  #arena[data-theme="sanctum"]{background:radial-gradient(900px 600px at 50% 40%,#3a1a08,transparent 70%),linear-gradient(180deg,#1a0d06,#070302)!important}
  #arena[data-theme="sanctum"] .envl b{left:50%;top:50%;width:min(900px,120vw);height:min(900px,120vw);margin:calc(min(900px,120vw)/-2) 0 0 calc(min(900px,120vw)/-2);border-radius:50%;border:3px dashed #ff9a1f66;box-shadow:0 0 40px #ff9a1f44,inset 0 0 40px #ff9a1f44;animation:envSpin 40s linear infinite}
  #arena[data-theme="sanctum"] .envl i{left:50%;top:50%;width:min(700px,95vw);height:min(700px,95vw);margin:calc(min(700px,95vw)/-2) 0 0 calc(min(700px,95vw)/-2);border-radius:50%;background:repeating-conic-gradient(#ff9a1f55 0 4deg,transparent 4deg 20deg);-webkit-mask:radial-gradient(circle,transparent 62%,#000 63%,#000 66%,transparent 67%);mask:radial-gradient(circle,transparent 62%,#000 63%,#000 66%,transparent 67%);animation:envSpin 25s linear infinite reverse}
  #arena[data-theme="sanctum"] .felt{background:radial-gradient(closest-side,rgba(255,200,120,.2),transparent 62%),radial-gradient(rgba(0,0,0,.3) 1px,transparent 1.3px) 0 0/7px 7px,radial-gradient(closest-side,#7a2a12 0%,#5a1e0c 50%,#3a1206 80%,#240a03 100%)!important;
    box-shadow:inset 0 0 0 9px #ff9a1f,inset 0 0 0 13px #07060b,inset 0 0 100px 40px rgba(0,0,0,.55),0 0 0 16px #5a3a1a,0 0 0 21px #3a2410,0 0 0 25px #07060b,0 22px 0 22px #2a1808,0 26px 0 25px #07060b,0 90px 110px 50px rgba(0,0,0,.8),0 0 60px 10px #ff9a1f44!important}
  @keyframes envTw{50%{opacity:.5}} @keyframes envPulse{50%{opacity:.55;transform:scale(1.08)}} @keyframes envFloat{50%{transform:translateY(-14px)}} @keyframes envSpin{to{transform:rotate(360deg)}}
  #arena[data-theme="asgard"] .envl i{animation:none}
  html.mt-noanim #arena .envl *{animation:none!important}`;
  document.head.appendChild(st);

  /* çevre katmanı */
  const A=$('#arena'); if(A&&!A.querySelector('.envl')){ const e=document.createElement('div'); e.className='envl'; e.innerHTML='<s></s><b></b><i></i>'; A.insertBefore(e,A.firstChild); }

  /* ---- çevrimiçi durumu ---- */
  window.__doingNow=d=>{ try{ const a=$('#arena'); if(a&&!a.hidden){ return (typeof VIEW!=='undefined'&&VIEW.playing)?'Kart maçında':'Kart lobisinde'; } }catch(e){} return d; };
  function stOf(r){ if(!r||!r.seen||!r.seen.toDate||r.hide) return null; const ago=Date.now()-r.seen.toDate();
    if(ago>330000) return null; const d=r.doing||'Sitede';
    return {cls:/maç/i.test(d)?'match':/oynuyor|lobi/i.test(d)?'play':'on',txt:d==='Sitede'?'Çevrimiçi':d}; }
  window.__ostHTML=r=>{ const s=stOf(r); return s?`<span class="ost ${s.cls}"><i></i>${esc(s.txt)}</span>`:''; };
  let rowsCache=[];
  const _gb=getBoard; getBoard=async function(){ const r=await _gb(); rowsCache=r||[]; return r; };
  const _rb=renderBoards; renderBoards=async function(){ await _rb();
    const rows=$$('#lb .lrow:not(.head)'); rows.forEach((el,i)=>{ const r=rowsCache[i]; if(!r) return; const h=window.__ostHTML(r); const nm=el.querySelector('.nm b')||el.querySelector('.nm span');
      const old=el.querySelector('.ost'); old&&old.remove(); if(h&&nm){ const sm=el.querySelector('.nm small'); if(sm) sm.outerHTML=h; else nm.insertAdjacentHTML('afterend',h); } });
    $$('#mini .mrow').forEach((el,i)=>{ const r=rowsCache[i]; if(!r) return; const dot=stOf(r); el.querySelector('.ost')&&el.querySelector('.ost').remove(); if(dot){ const nm=el.querySelector('.nm span:last-child'); nm&&nm.insertAdjacentHTML('beforeend',` <span class="ost ${dot.cls}" title="${esc(dot.txt)}"><i></i></span>`); } }); };
  window.renderBoards=renderBoards;
  setInterval(()=>{ if(!document.hidden&&$('#v-siralama')&&!$('#v-siralama').hidden) renderBoards(); },120000);

  /* ---- duyuru görülme sayısı (kişi başı 1) ---- */
  const seenKey='mt_annv';
  const seenSet=()=>{ try{ return new Set(JSON.parse(localStorage.getItem(seenKey)||'[]')); }catch(e){ return new Set(); } };
  const io=('IntersectionObserver' in window)?new IntersectionObserver(ents=>ents.forEach(en=>{ if(en.isIntersecting&&en.intersectionRatio>.5){ io.unobserve(en.target); markSeen(en.target.dataset.aid); } }),{threshold:[.5]}):null;
  let busy=new Set();
  async function markSeen(id){ if(!id||!(FB.ready&&FB.user)) return; const ss=seenSet(); if(ss.has(id)||busy.has(id)) return; busy.add(id);
    const ann=FB.db.collection('announcements').doc(id), v=ann.collection('views').doc(FB.user.uid);
    try{ const b=FB.db.batch(); b.set(v,{at:firebase.firestore.FieldValue.serverTimestamp()}); b.update(ann,{views:firebase.firestore.FieldValue.increment(1)}); await b.commit(); }
    catch(e){ /* zaten görülmüş ya da izin yok: tekrar deneme */ }
    ss.add(id); try{ localStorage.setItem(seenKey,JSON.stringify([...ss].slice(-200))); }catch(e){} }
  /* gizlilik ayarı değişince profile yaz */
  document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('.sw[data-k="hideOnline"]'); if(!b) return; setTimeout(()=>{ if(FB.ready&&FB.user) FB.db.collection('users').doc(FB.user.uid).set({hideOnline:!!MTSET.hideOnline},{merge:true}).catch(()=>{}); },50); });
  new MutationObserver(()=>{ $$('#anList .an[data-aid]:not([data-obs])').forEach(el=>{ el.dataset.obs=1; io?io.observe(el):markSeen(el.dataset.aid); }); }).observe(document.body,{childList:true,subtree:true});
})();


/* ========================= PARÇA 4B: ONLINE YARIŞ — Ben Kimim?, Gerçek mi Sahte mi?, Kahraman Hafızası =========================
   Odayı kuran oyuncunun tarayıcısı sunucu gibi çalışır (PeerJS, eşler arası). Herkes aynı içeriği aynı anda oynar,
   skorlar canlı tabloda görünür. Firebase kotası harcamaz. */
(function(){
  const st=document.createElement('style'); st.textContent=`
  .on-pick{display:grid;gap:12px}
  .on-pick .opt{text-align:left}
  .on-pick .opt small{display:block;font-weight:400;font-size:12px;color:var(--dim);margin-top:4px}
  .on-code{font-family:var(--display);font-size:48px;letter-spacing:.2em;text-align:center;color:var(--gold);text-shadow:4px 4px 0 var(--inkc)}
  .on-pl{display:grid;gap:6px}
  .on-pl div{display:flex;align-items:center;gap:10px;background:var(--s2);border:3px solid var(--inkc);border-radius:99px;padding:6px 12px;font-weight:800}
  .on-pl div span{flex:1}
  .on-lb{display:grid;gap:5px;margin-top:10px}
  .on-lb div{display:grid;grid-template-columns:26px 1fr auto;gap:8px;align-items:center;background:var(--s2);border:2px solid var(--inkc);border-radius:6px;padding:5px 10px;font-size:13px;font-weight:700;transition:transform .3s}
  .on-lb div.me{border-color:var(--gold)} .on-lb div.done{opacity:.75}
  .on-lb b{font-family:var(--display);font-size:18px;color:var(--gold)}
  .on-bar{height:6px;border-radius:3px;background:var(--s1);overflow:hidden;grid-column:2/4}
  .on-bar i{display:block;height:100%;background:var(--gold)}
  .on-res{display:grid;gap:8px;text-align:center}
  .on-res .w{font-family:var(--display);font-size:40px;color:var(--gold);text-shadow:4px 4px 0 var(--inkc)}
  .on-clue{list-style:none;padding:0;margin:0;display:grid;gap:6px}
  .on-clue li{background:var(--s2);border:3px solid var(--inkc);border-radius:6px;padding:8px 12px;font-weight:700;animation:onIn .4s ease-out}
  .on-clue li.lock{opacity:.35}
  @keyframes onIn{from{transform:translateX(-14px);opacity:0}}
  .on-tm{height:8px;border-radius:4px;background:var(--s2);overflow:hidden}
  .on-tm i{display:block;height:100%;background:linear-gradient(90deg,#3ddc97,#ffd34d,#ff3b4e);transition:width .25s linear}
  .mem.on-mem{display:grid!important;grid-template-columns:repeat(4,minmax(0,96px))!important;justify-content:center;gap:8px!important}
  .mem.on-mem .mc{width:100%!important;max-width:96px}
  .on-big{font-family:var(--display);font-size:clamp(30px,7vw,48px);text-align:center;margin:10px 0;line-height:1}`;
  document.head.appendChild(st);

  const GAMES={guess:{n:'Ben Kimim?',ic:'🕵️',d:'Herkes aynı kahramanı tahmin eder. İpuçları zamanla açılır, ilk bilen en çok puanı alır.'},
    real:{n:'Gerçek mi, Sahte mi?',ic:'🎭',d:'Aynı isimler herkese aynı anda gelir. Doğru ve hızlı cevap veren kazanır.'},
    mem:{n:'Kahraman Hafızası',ic:'🧠',d:'Herkes aynı kart dizilimini çözer. İlk bitiren ve en az hamle yapan kazanır.'}};
  const nm=()=>(AUTH.user&&(AUTH.user.display||AUTH.user.username))||(()=>{ try{ return localStorage.getItem('mt_name')||''; }catch(e){ return ''; } })()||'Misafir';
  let R=null; // oda durumu
  function leave(){ if(!R) return; try{ R.conn&&R.conn.close(); }catch(e){} try{ R.peer&&R.peer.destroy(); }catch(e){} (R.timers||[]).forEach(clearTimeout); clearInterval(R.iv); R=null; }
  const send=m=>{ if(!R) return; if(R.host){ Object.values(R.conns).forEach(c=>{ try{ c.open&&c.send(m); }catch(e){} }); onMsg(m,'H'); } else { try{ R.conn&&R.conn.open&&R.conn.send(m); }catch(e){} } };
  const toHost=m=>{ if(!R) return; if(R.host) hostMsg(m,'H'); else { try{ R.conn&&R.conn.open&&R.conn.send(m); }catch(e){} } };
  const later=(f,ms)=>{ const t=setTimeout(f,ms); R&&R.timers.push(t); };

  /* ---------- seçim ekranı ---------- */
  function choose(game,solo){ openModal(GAMES[game].ic+' '+GAMES[game].n);
    swap(`<div class="on-pick"><p class="dim" style="margin:0">${GAMES[game].d}</p>
      <button class="opt" type="button" id="onSolo">🎯 Tek başına oyna<small>Klasik mod, puanını sıralamaya yaz.</small></button>
      <button class="opt" type="button" id="onHost">🌐 Online oda kur<small>Kodu arkadaşlarına ver, 2–8 kişi aynı anda yarışın.</small></button>
      <button class="opt" type="button" id="onJoin">🔑 Odaya katıl<small>Arkadaşının verdiği 5 harfli kodu yaz.</small></button>
      ${AUTH.user?'':`<input class="field" id="onName" maxlength="18" placeholder="Online için adın" value="${esc(nm()==='Misafir'?'':nm())}">`}</div>`);
    const nameOk=()=>{ const f=$('#onName'); if(f){ const v=f.value.trim(); if(!v){ f.focus(); toast('Adını yaz','Online oyunda diğerleri seni bu isimle görecek.'); return false; } try{ localStorage.setItem('mt_name',v); }catch(e){} } return true; };
    $('#onSolo').onclick=()=>{ SFX.play('click'); solo(); };
    $('#onHost').onclick=()=>{ if(!nameOk()) return; if(typeof Peer!=='function') return toast('Online açılamadı','Bağlantı kütüphanesi yüklenemedi, internetini kontrol et.'); SFX.play('click'); host(game); };
    $('#onJoin').onclick=()=>{ if(!nameOk()) return; SFX.play('click'); joinForm(game); }; }

  /* ---------- oda kurma / katılma ---------- */
  function host(game){ leave(); R={host:true,game,code:randCode(),conns:{},players:[{id:'H',name:nm(),score:0,prog:0,done:false}],timers:[],phase:'lobby'};
    cleanup=()=>leave();
    const mk=tries=>{ const p=new Peer('mtg-'+R.code.toLowerCase()); R.peer=p;
      p.on('open',()=>lobby());
      p.on('error',e=>{ if(e.type==='unavailable-id'&&tries<4){ try{p.destroy();}catch(_){} R.code=randCode(); mk(tries+1); } else toast('Bağlantı hatası',String(e.type||e)); });
      p.on('connection',c=>{ c.on('data',m=>hostMsg(m,c.peer,c)); c.on('close',()=>{ if(!R) return; delete R.conns[c.peer]; const pl=R.players.find(x=>x.id===c.peer); R.players=R.players.filter(x=>x.id!==c.peer); if(pl) send({t:'sys',x:pl.name+' ayrıldı'}); send({t:'pl',p:R.players}); }); }); };
    mk(0); swap('<p class="dim" style="text-align:center">Oda açılıyor…</p>'); }
  function joinForm(game){ swap(`<div class="on-pick"><p style="margin:0">Arkadaşının verdiği oda kodunu yaz:</p><form class="guess" id="onJf"><input class="field code-in" id="onCode" maxlength="5" placeholder="ABCDE" autocomplete="off" style="text-transform:uppercase"><button class="btn p" type="submit"><span class="bl"><span>Katıl</span><span>Katıl</span></span></button></form></div>`);
    $('#onCode').focus(); $('#onJf').onsubmit=e=>{ e.preventDefault(); const c=$('#onCode').value.trim().toUpperCase(); if(c.length===5) join(game,c); }; }
  function join(game,code){ if(typeof Peer!=='function') return toast('Bağlanılamadı','Bağlantı kütüphanesi yüklenemedi.'); leave();
    R={host:false,game,code,timers:[],players:[],phase:'lobby'}; cleanup=()=>leave(); swap(`<p class="dim" style="text-align:center">${code} odasına bağlanılıyor…</p>`);
    const p=new Peer(); R.peer=p;
    p.on('open',id=>{ R.me=id; const c=p.connect('mtg-'+code.toLowerCase(),{reliable:true}); R.conn=c;
      c.on('open',()=>c.send({t:'hi',name:nm()})); c.on('data',m=>onMsg(m)); c.on('close',()=>{ if(R&&R.phase!=='end'){ toast('Bağlantı koptu','Oda kurucusu çıkmış olabilir.'); leave(); closeModal(); } }); });
    p.on('error',e=>{ toast(e.type==='peer-unavailable'?'Oda bulunamadı':'Bağlantı hatası',e.type==='peer-unavailable'?'Kodu kontrol et.':String(e.type||e)); leave(); joinForm(game); }); }
  const myId=()=>R&&(R.host?'H':R.me);

  /* ---------- kurucu: gelen mesajlar ---------- */
  function hostMsg(m,from,c){ if(!R||!R.host) return;
    if(m.t==='hi'){ if(R.phase!=='lobby'||R.players.length>=8){ try{ c.send({t:'full'}); }catch(e){} return; } R.conns[from]=c; R.players.push({id:from,name:String(m.name||'Oyuncu').slice(0,18),score:0,prog:0,done:false});
      try{ c.send({t:'hello',game:R.game,code:R.code,you:from}); }catch(e){} send({t:'pl',p:R.players}); send({t:'sys',x:m.name+' katıldı'}); SFX.sfx&&SFX.sfx('join'); return; }
    if(m.t==='sc'){ const pl=R.players.find(x=>x.id===from); if(!pl) return; pl.score=Math.max(-500,Math.min(5000,+m.score||0)); pl.prog=+m.prog||0; pl.done=!!m.done; if(m.extra) pl.extra=m.extra;
      if(m.solved!=null) (R.solved=R.solved||{})[m.solved]=(R.solved[m.solved]||[]).concat(from);
      send({t:'pl',p:R.players}); if(R.players.every(x=>x.done)) finishRoom(); } }

  /* ---------- herkes: gelen mesajlar ---------- */
  function onMsg(m){ if(!R) return;
    if(m.t==='hello'){ R.me=m.you; lobby(); return; }
    if(m.t==='full'){ toast('Odaya girilemedi','Oda dolu ya da oyun başlamış.'); leave(); closeModal(); return; }
    if(m.t==='pl'){ R.players=m.p; if(R.phase==='lobby') lobby(); else board(); return; }
    if(m.t==='sys'){ toast('Oda',m.x); return; }
    if(m.t==='go'){ R.phase='play'; R.data=m.data; R.t0=Date.now(); play(); return; }
    if(m.t==='step'){ R.step&&R.step(m); return; }
    if(m.t==='end'){ R.phase='end'; results(m.p); return; } }

  /* ---------- lobi ---------- */
  function lobby(){ if(!R) return; const g=GAMES[R.game];
    swap(`<div class="on-pick"><span class="mono dim" style="text-align:center">${g.ic} ${g.n} · ONLINE ODA</span><div class="on-code">${R.code}</div>
      <p class="dim" style="text-align:center;margin:0">Bu kodu arkadaşlarına gönder, "Odaya katıl" ile girsinler.</p>
      <div class="on-pl">${R.players.map(p=>`<div>${p.id==='H'?'👑':'🎮'} <span>${esc(p.name)}</span>${p.id===myId()?'<small class="mono">sen</small>':''}</div>`).join('')}</div>
      ${R.host?`<div class="rowb" style="justify-content:center"><button class="ghost" id="onCopy" type="button">Kodu kopyala</button><button class="btn p" id="onStart" type="button" ${R.players.length<2?'disabled':''}><span class="bl"><span>Başlat (${R.players.length})</span><span>Başlat (${R.players.length})</span></span></button></div>${R.players.length<2?'<p class="dim" style="text-align:center;margin:0;font-size:13px">Başlatmak için en az 2 kişi lazım.</p>':''}`:'<p class="dim" style="text-align:center">Kurucunun başlatmasını bekliyorsun…</p>'}</div>`);
    const cp=$('#onCopy'); cp&&(cp.onclick=()=>{ navigator.clipboard&&navigator.clipboard.writeText(R.code).then(()=>toast('Kopyalandı','Oda kodu panoda.')).catch(()=>{}); });
    const s=$('#onStart'); s&&(s.onclick=()=>{ if(R.players.length<2) return; SFX.play('click'); startRoom(); }); }

  /* ---------- oyun içeriğini kurucu üretir ---------- */
  function startRoom(){ let data;
    if(R.game==='guess') data={heroes:shuffle(HEROES).slice(0,3).map(h=>h.ad)};
    if(R.game==='real'){ const EN={cap:'Captain America',cmarvel:'Captain Marvel',profx:'Professor X',msmarvel:'Ms. Marvel'}; const REAL=[...new Set(HEROES_CG.map(h=>EN[h.id]||h.ad).concat(REAL_EXTRA))];
      data={qs:shuffle([...shuffle(REAL).slice(0,5).map(ad=>({ad,ok:1})),...shuffle(FAKE_POOL).slice(0,5).map(ad=>({ad,ok:0}))])}; }
    if(R.game==='mem'){ const ids=shuffle(HEROES_CG.map(h=>h.id)).slice(0,8); data={cards:shuffle([...ids,...ids])}; }
    R.players.forEach(p=>{ p.score=0; p.prog=0; p.done=false; }); R.solved={};
    send({t:'go',data}); }
  function report(score,prog,done,extra){ toHost({t:'sc',score:Math.round(score),prog,done,extra}); }
  function board(){ const b=$('#onLb'); if(!b||!R) return; const ps=[...R.players].sort((a,b)=>b.score-a.score);
    b.innerHTML=ps.map((p,i)=>`<div class="${p.id===myId()?'me':''}${p.done?' done':''}"><span class="mono">${i+1}.</span><span>${esc(p.name)}${p.done?' ✓':''}</span><b>${p.score}</b><span class="on-bar"><i style="width:${Math.round((p.prog||0)*100)}%"></i></span></div>`).join(''); }
  function finishRoom(){ if(!R||!R.host||R.phase==='end') return; R.phase='end'; const p=[...R.players].sort((a,b)=>b.score-a.score); send({t:'end',p}); }
  function results(ps){ const me=ps.find(p=>p.id===myId()), rank=ps.findIndex(p=>p.id===myId())+1, win=rank===1;
    const pts=Math.max(-300,Math.min(1500,Math.round((me?me.score:0)+(win&&ps.length>1?200:0))));
    if(pts) submitScore(R.game,pts);
    if(win&&ps.length>1){ try{ const s=prog(); s.st=s.st||{}; s.st.won=s.st.won||{}; s.st.won[R.game]=(s.st.won[R.game]||0)+1; saveProg(s); }catch(e){} }
    SFX.play(win?'win':'click'); win&&burst&&burst(true);
    swap(`<div class="on-res"><span class="mono dim">${GAMES[R.game].n} · ONLINE · SONUÇ</span><div class="w">${win?'🏆 KAZANDIN!':rank+'. oldun'}</div>
      <div class="on-lb">${ps.map((p,i)=>`<div class="${p.id===myId()?'me':''}"><span class="mono">${['🥇','🥈','🥉'][i]||i+1+'.'}</span><span>${esc(p.name)}</span><b>${p.score}</b></div>`).join('')}</div>
      <p style="margin:0">${pts>0?`Sıralamaya <b style="color:var(--gold)">+${pts} puan</b>${win&&ps.length>1?' (kazanma bonusu dahil)':''} yazıldı.`:'Bu sefer puan alamadın.'}</p>
      <div class="rowb" style="justify-content:center">${R.host?'<button class="btn p" id="onAgain" type="button"><span class="bl"><span>Tekrar oyna</span><span>Tekrar oyna</span></span></button>':'<span class="dim">Kurucu tekrar başlatabilir…</span>'}<button class="ghost" id="onOut" type="button">Çık</button></div></div>`);
    const a=$('#onAgain'); a&&(a.onclick=()=>{ R.phase='lobby'; R.players.forEach(p=>{p.score=0;p.prog=0;p.done=false;}); send({t:'pl',p:R.players}); lobby(); });
    $('#onOut').onclick=()=>{ leave(); closeModal(); }; }
  const HUD=(mid)=>`${mid}<div class="on-lb" id="onLb"></div>`;
  const waitScr=t=>{ if(!R||R.phase==='end') return; swap(HUD(t)); board(); }; // sonuç ekranının üstüne yazma

  /* ---------- oyunlar ---------- */
  function play(){ ({guess:pGuess,real:pReal,mem:pMem})[R.game](); board(); }

  // Ben Kimim: 3 tur × 35 sn, her 6 sn'de bir ipucu açılır. Puan: 600 − 100×(açık ipucu−1), ilk bilene +150.
  function pGuess(){ const hs=R.data.heroes.map(ad=>HEROES.find(h=>h.ad===ad)).filter(Boolean); let ri=0, score=0, solved=false; const RT=35000, CL=6000;
    function round(){ solved=false; const h=hs[ri], t0=Date.now();
      swap(HUD(`<div class="ghud mono"><span>Tur <b>${ri+1}/${hs.length}</b></span><span>Skor <b id="gS">${score}</b></span><span id="gT">35 sn</span></div><div class="on-tm"><i id="gBar" style="width:100%"></i></div>
        <ul class="on-clue" id="gCl"></ul><form class="guess" id="gF"><input class="field" id="gIn" autocomplete="off" placeholder="Kahramanın adı" list="onHeroList"><button class="btn p" type="submit"><span class="bl"><span>Tahmin</span><span>Tahmin</span></span></button></form>
        <datalist id="onHeroList">${HEROES.map(x=>`<option value="${esc(x.ad)}">`).join('')}</datalist><div class="fb" id="gFb"></div>`)); board();
      const tick=()=>{ if(!R||R.phase!=='play') return; const el=Date.now()-t0, n=Math.min(5,1+Math.floor(el/CL)), cl=$('#gCl');
        if(cl&&cl.children.length!==5){ cl.innerHTML=h.ip.map((c,i)=>i<n?`<li>${i+1}. ${esc(c)}</li>`:`<li class="lock">${i+1}. ?</li>`).join(''); }
        else if(cl){ [...cl.children].forEach((li,i)=>{ if(i<n&&li.classList.contains('lock')){ li.classList.remove('lock'); li.textContent=(i+1)+'. '+h.ip[i]; } }); }
        const bar=$('#gBar'); bar&&(bar.style.width=Math.max(0,100-el/RT*100)+'%'); const tt=$('#gT'); tt&&(tt.textContent=Math.max(0,Math.ceil((RT-el)/1000))+' sn');
        if(el>=RT){ clearInterval(R.iv); const fb=$('#gFb'); if(fb&&!solved){ fb.className='fb no'; fb.textContent='Süre doldu! Cevap: '+h.ad; } next(); } };
      clearInterval(R.iv); R.iv=setInterval(tick,250); tick();
      const inp=$('#gIn'); if(!isMob()) setTimeout(()=>inp.focus(),60);
      $('#gF').onsubmit=e=>{ e.preventDefault(); if(solved) return; const g=norm(inp.value); if(!g) return; const fb=$('#gFb');
        if([h.ad,...(h.alt||[])].some(x=>norm(x)===g)){ solved=true; const n=Math.min(5,1+Math.floor((Date.now()-t0)/CL)); const first=!R.players.some(p=>p.id!==myId()&&(p.extra||{})['r'+ri]);
          const p=600-100*(n-1)+(first?150:0); score+=p; SFX.play('correct'); burst&&burst(); fb.className='fb ok'; fb.textContent=`Doğru! +${p}${first?' (ilk bilen bonusu!)':''}`; inp.disabled=true;
          const ex={}; ex['r'+ri]=1; report(score,(ri+1)/hs.length,false,Object.assign({},(R.players.find(x=>x.id===myId())||{}).extra||{},ex)); $('#gS').textContent=score; }
        else { score-=30; SFX.play('wrong'); fb.className='fb no'; fb.textContent='Olmadı −30'; inp.select(); report(score,ri/hs.length,false); $('#gS').textContent=score; } }; }
    function next(){ later(()=>{ ri++; if(ri<hs.length) round(); else { waitScr('<p class="on-big">Bitti! Diğerleri bekleniyor…</p>'); report(score,1,true); } },2200); }
    round(); }

  // Gerçek mi Sahte mi: 10 isim × 7 sn. Doğru: 50 + hız bonusu (en fazla +100). Yanlış: −25.
  function pReal(){ const qs=R.data.qs; let qi=0, score=0; const QT=7000;
    function q(){ const it=qs[qi], t0=Date.now(); let done=false;
      swap(HUD(`<div class="ghud mono"><span>Soru <b>${qi+1}/${qs.length}</b></span><span>Skor <b>${score}</b></span></div><div class="on-tm"><i id="rBar" style="width:100%"></i></div>
        <p class="on-big">${esc(it.ad)}</p><p class="dim" style="text-align:center;margin:0">Bu isim gerçek bir Marvel karakteri mi?</p>
        <div class="opts" style="grid-template-columns:1fr 1fr"><button class="opt" type="button" data-a="1"><span class="mono">✓</span>GERÇEK</button><button class="opt" type="button" data-a="0"><span class="mono">✗</span>SAHTE</button></div><div class="fb" id="rFb"></div>`)); board();
      const pick=a=>{ if(done) return; done=true; clearInterval(R.iv); const el=Date.now()-t0, ok=a===it.ok, fb=$('#rFb');
        $$('[data-a]',mBody).forEach(b=>{ b.disabled=true; if(+b.dataset.a===it.ok) b.classList.add('right'); else if(+b.dataset.a===a) b.classList.add('wrong'); });
        if(ok){ const p=50+Math.round(Math.max(0,QT-el)/QT*100); score+=p; SFX.play('correct'); fb.className='fb ok'; fb.textContent='Doğru +'+p; } else { score-=25; SFX.play('wrong'); fb.className='fb no'; fb.textContent=(a===-1?'Süre doldu':'Yanlış')+' −25 · '+(it.ok?'Gerçek bir karakter':'Uydurma bir isim'); }
        const last=qi+1>=qs.length; if(!last) report(score,(qi+1)/qs.length,false);
        later(()=>{ qi++; if(qi<qs.length) q(); else { waitScr('<p class="on-big">Bitti! Diğerleri bekleniyor…</p>'); report(score,1,true); } },1300); };
      $$('[data-a]',mBody).forEach(b=>b.onclick=()=>pick(+b.dataset.a));
      clearInterval(R.iv); R.iv=setInterval(()=>{ const el=Date.now()-t0, bar=$('#rBar'); bar&&(bar.style.width=Math.max(0,100-el/QT*100)+'%'); if(el>=QT) pick(-1); },100); }
    q(); }

  // Hafıza: herkes aynı 16 kartı çözer. Puan: 1200 − 6×saniye − 15×fazla hamle (en az 100).
  function pMem(){ const cards=R.data.cards, pairs=cards.length/2; let open=[],found=0,moves=0,lock=false; const t0=Date.now();
    swap(HUD(`<div class="ghud mono"><span>Hamle <b id="mMv">0</b></span><span>Bulunan <b id="mFd">0</b>/${pairs}</span><span>Süre <b id="mTm">0</b> sn</span></div>
      <div class="mem on-mem">${cards.map((id,i)=>`<button class="mc" type="button" data-i="${i}"><div class="hcflip"><div class="f">${CARD_BACK_HTML}</div><div class="b"><img src="${cardFace(HERO_BY[id])}" alt=""></div></div></button>`).join('')}</div>`)); board();
    clearInterval(R.iv); R.iv=setInterval(()=>{ const e=$('#mTm'); if(e) e.textContent=Math.round((Date.now()-t0)/1000); },500);
    const sc=()=>Math.max(100,Math.round(1200-6*(Date.now()-t0)/1000-15*Math.max(0,moves-pairs)));
    const flip=(b,on)=>{ const f=b.querySelector('.hcflip'); if(G) G.to(f,{rotationY:on?180:0,duration:.4,ease:'power3.inOut'}); else f.style.transform=on?'rotateY(180deg)':''; };
    $$('.mc',mBody).forEach(b=>b.onclick=()=>{ if(lock||b.classList.contains('ok')||open.includes(b)) return; SFX.sfx&&SFX.sfx('flip'); flip(b,true); open.push(b);
      if(open.length===2){ moves++; $('#mMv').textContent=moves; lock=true; const [x,y]=open;
        if(cards[x.dataset.i]===cards[y.dataset.i]){ setTimeout(()=>{ x.classList.add('ok'); y.classList.add('ok'); SFX.play('correct'); found++; $('#mFd').textContent=found; open=[]; lock=false;
            const done=found===pairs, fs=done?sc():Math.round(found/pairs*600);
            if(done){ clearInterval(R.iv); waitScr(`<p class="on-big">Bitirdin! ${fs} puan</p><p class="dim" style="text-align:center">Diğerleri bekleniyor…</p>`); }
            report(fs,found/pairs,done); },400); }
        else setTimeout(()=>{ flip(x,false); flip(y,false); open=[]; lock=false; },800); } }); }

  /* ---------- oyun girişlerine "online" seçeneği ---------- */
  const _g=startGuess, _r=startReal, _m=startMemory;
  startGuess=function(){ choose('guess',()=>_g()); };
  startReal=function(){ choose('real',()=>_r()); };
  startMemory=function(){ choose('mem',()=>_m()); };
  // oyun kartlarındaki tıklama eski fonksiyona bağlıysa yeniden bağla
  $$('[data-game]').forEach(c=>{ const g=c.dataset.game; if(!{guess:1,real:1,mem:1}[g]) return; c.addEventListener('click',e=>{ e.stopImmediatePropagation(); SFX.play('click'); ({guess:startGuess,real:startReal,mem:startMemory})[g](); },true); });
  window.startGuess=startGuess; window.startReal=startReal; window.startMemory=startMemory;
})();


/* ========================= PARÇA 5: ADMİN — OYUNCU YÖNETİMİ + İŞLEM KAYDI =========================
   Admin bir oyuncu seçer: puan / sezon / hafta / coin / XP değerini ayarlar, ekler, çıkarır ya da sıfırlar,
   kartlarını / çerçevelerini siler, sohbette susturur. Coin, XP ve kart gibi oyuncunun cihazında da tutulan
   değerler "adminOps" ile oyuncunun cihazına iletilir; oyuncu siteye girince uygulanır (eski değer geri gelmez). */
(function(){
  const st=document.createElement('style'); st.textContent=`
  .pm{display:grid;gap:12px}
  .pm-s{display:flex;gap:8px} .pm-s input{flex:1;min-width:0}
  .pm-l{display:grid;gap:6px;max-height:320px;overflow:auto;padding-right:4px}
  .pm-r{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;background:var(--s2);border:3px solid var(--inkc);border-radius:6px;padding:7px 10px;cursor:pointer;text-align:left;color:var(--fg);font:inherit}
  .pm-r:hover{border-color:var(--gold)}
  .pm-r .av{width:34px!important;height:34px!important;font-size:15px!important}
  .pm-r b{display:block;font-size:14px} .pm-r small{color:var(--dim);font-size:11.5px}
  .pm-r .n{font:800 12px var(--mono);color:var(--gold);text-align:right}
  .pm-h{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
  .pm-h .av{width:64px!important;height:64px!important;font-size:28px!important}
  .pm-h h4{margin:0;font-family:var(--display);font-size:28px}
  .pm-f{display:grid;grid-template-columns:120px 90px 1fr;gap:8px;align-items:center;background:var(--s2);border:3px solid var(--inkc);border-radius:6px;padding:8px 10px}
  .pm-f b{font-size:14px} .pm-f .cur{font:900 18px var(--display);color:var(--gold);text-align:right}
  .pm-f .ctl{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
  .pm-f input{width:90px;height:34px!important;font-size:14px!important;padding:0 8px!important}
  .pm-f button{font:800 12px var(--body);padding:6px 9px;border-radius:5px;border:2px solid var(--inkc);background:var(--s1);color:var(--fg);cursor:pointer}
  .pm-f button.z{border-color:#ff3b4e;color:#ff7a88}
  .pm-x{display:flex;gap:6px;flex-wrap:wrap}
  .pm-x button{font:800 12.5px var(--body);padding:8px 11px;border-radius:6px;border:2px solid var(--inkc);background:var(--s2);color:var(--fg);cursor:pointer}
  .pm-x button.z{border-color:#ff3b4e;color:#ff7a88}
  .pm-log{display:grid;gap:5px;max-height:420px;overflow:auto}
  .pm-log div{font-size:12.5px;background:var(--s2);border-left:4px solid var(--gold);padding:6px 10px;border-radius:4px}
  .pm-log small{color:var(--dim);margin-left:6px}
  @media (max-width:560px){.pm-f{grid-template-columns:1fr auto}.pm-f .ctl{grid-column:1/-1;justify-content:flex-start}}`;
  document.head.appendChild(st);

  const FIELDS=[['points','Tüm zamanlar puanı'],['sp','Sezon puanı'],['wp','Haftalık puan'],['coins','Coin'],['xp','XP']];
  const wkId=()=>{ const t=new Date(Date.now()+3*3600e3); return new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate()-t.getUTCDay())).toISOString().slice(0,10); };
  const meName=()=>AUTH.user?(AUTH.user.display||AUTH.user.username):'Admin';
  const fmt=n=>(Math.round(n||0)).toLocaleString('tr-TR');
  async function log(target,tname,action){ try{ await FB.db.collection('adminLog').add({by:FB.user.uid,byName:meName(),target,targetName:tname,action,at:firebase.firestore.FieldValue.serverTimestamp()}); }catch(e){} }
  async function op(uid,o){ await FB.db.collection('adminOps').add(Object.assign({to:uid,done:false,by:FB.user.uid,at:firebase.firestore.FieldValue.serverTimestamp()},o)); }

  /* ---- değer değiştir ---- */
  async function setField(uid,d,f,val){ val=Math.max(f==='points'?-999999:0,Math.round(val)); const ref=FB.db.collection('users').doc(uid), up={};
    up[f]=val;
    if(f==='sp') up.season=SEASON().id;
    if(f==='wp') up.wk=wkId();
    await ref.set(up,{merge:true});
    if(f==='coins'||f==='xp'||f==='points') await op(uid,{set:{[f]:val}});
    await log(uid,d.name||'Oyuncu',`${FIELDS.find(x=>x[0]===f)[1]}: ${fmt(d[f])} → ${fmt(val)}`);
    d[f]=val; if(f==='sp') d.season=up.season; if(f==='wp') d.wk=up.wk; }
  async function wipe(uid,d,what){ const ref=FB.db.collection('users').doc(uid), up={};
    if(what==='cards'){ up.cards={}; up.nCards=0; up.showcase=[]; }
    if(what==='frames'){ up.frames=[]; up.frame=null; }
    if(what==='nc'){ up.nameColors=[]; up.nameColor=null; }
    if(what==='all'){ Object.assign(up,{points:0,sp:0,wp:0,coins:0,xp:0,cards:{},nCards:0,showcase:[],frames:[],frame:null,nameColors:[],nameColor:null}); }
    await ref.set(up,{merge:true}); await op(uid,{wipe:what});
    await log(uid,d.name||'Oyuncu',{cards:'Kartları silindi',frames:'Çerçeveleri silindi',nc:'İsim renkleri silindi',all:'TÜM verisi sıfırlandı'}[what]); Object.assign(d,up); }

  /* ---- arayüz ---- */
  let rowsCache=[];
  function list(rows){ const L=$('#pmL'); if(!L) return; rowsCache=rows;
    L.innerHTML=rows.length?rows.map((x,i)=>`<button class="pm-r" type="button" data-pi="${i}">${avatarHTML({display:x.name,avatar:x.avatar,frame:x.frame||null},34)}<span><b>${esc(x.name||'Oyuncu')}</b><small>${window.__ostHTML?window.__ostHTML(x)||'çevrimdışı':''}</small></span><span class="n">${fmt(x.season===SEASON().id?x.sp:0)} sp<br>${fmt(x.coins)} 🪙</span></button>`).join(''):'<p class="dim" style="margin:0">Oyuncu bulunamadı.</p>';
    $$('[data-pi]',L).forEach(b=>b.onclick=()=>{ SFX.play('click'); detail(rowsCache[+b.dataset.pi]); }); }
  async function loadTop(){ $('#pmL').innerHTML='<p class="dim">Yükleniyor…</p>'; try{ const q=await FB.db.collection('users').orderBy('sp','desc').limit(60).get(); list(q.docs.map(d=>({id:d.id,...d.data()}))); }catch(e){ $('#pmL').textContent='Liste okunamadı: '+(e.code||e.message); } }
  async function search(t){ t=t.trim(); if(!t) return loadTop(); $('#pmL').innerHTML='<p class="dim">Aranıyor…</p>';
    try{ const out={}; const tries=[t,t[0].toLocaleUpperCase('tr')+t.slice(1)];
      for(const s of tries){ const q=await FB.db.collection('users').where('name','>=',s).where('name','<=',s+'').limit(20).get(); q.docs.forEach(d=>out[d.id]={id:d.id,...d.data()}); }
      const g=await FB.db.collection('users').doc(t).get().catch(()=>null); if(g&&g.exists) out[g.id]={id:g.id,...g.data()};
      list(Object.values(out)); }catch(e){ $('#pmL').textContent='Arama yapılamadı: '+(e.code||e.message); } }
  function panel(){ return `<div class="pm" id="pmBox"><div class="pm-s"><input class="field" id="pmQ" placeholder="🔍 Oyuncu adı ya da ID ara…" autocomplete="off"><button class="ghost" id="pmTop" type="button">Sıralama</button></div><div class="pm-l" id="pmL"></div></div>`; }
  async function detail(x){ const box=$('#pmBox'); if(!box) return; const uid=x.id;
    let d=x; try{ const s=await FB.db.collection('users').doc(uid).get(); if(s.exists) d={id:uid,...s.data()}; }catch(e){}
    if(d.season!==SEASON().id) d.sp=0; if(d.wk!==wkId()) d.wp=0;
    let muted=false; try{ muted=(await FB.db.collection('muted').doc(uid).get()).exists; }catch(e){}
    let isAdm=false; try{ isAdm=(await FB.db.collection('admins').doc(uid).get()).exists; }catch(e){}
    const owner=FB.user&&(FB.user.email||'').toLowerCase()===OWNER_EMAIL.toLowerCase();
    box.innerHTML=`<button class="ghost" id="pmBack" type="button" style="justify-self:start">← Listeye dön</button>
      <div class="pm-h">${avatarHTML({display:d.name,avatar:d.avatar,frame:d.frame||null},64)}<div><h4>${esc(d.name||'Oyuncu')}</h4><small class="mono dim">${esc(uid)}</small><div>${window.__ostHTML?window.__ostHTML(d):''}</div></div></div>
      ${FIELDS.map(([f,n])=>`<div class="pm-f" data-f="${f}"><b>${n}</b><span class="cur">${fmt(d[f])}</span><span class="ctl"><input type="number" value="100" step="50" aria-label="Miktar"><button type="button" data-m="add">+ Ekle</button><button type="button" data-m="sub">− Çıkar</button><button type="button" data-m="set">= Ayarla</button><button type="button" class="z" data-m="zero">Sıfırla</button></span></div>`).join('')}
      <div class="pm-x"><button type="button" data-w="cards" class="z">🃏 Kartlarını sil (${Object.keys(d.cards||{}).length})</button><button type="button" data-w="frames" class="z">🖼️ Çerçevelerini sil</button><button type="button" data-w="nc" class="z">🎨 İsim renklerini sil</button><button type="button" data-w="all" class="z">☠ Her şeyini sıfırla</button></div>
      <div class="pm-x"><button type="button" id="pmMute">${muted?'🔊 Susturmayı kaldır':'🔇 Sohbette sustur'}</button><button type="button" id="pmProf">👤 Profilini aç</button>${owner&&uid!==FB.user.uid?`<button type="button" id="pmAdm">${isAdm?'⛔ Adminliği al':'🛡️ Admin yap'}</button>`:''}</div>
      <p class="dim" style="margin:0;font-size:12px">Coin, XP ve kartlar oyuncunun cihazında da tutulur. Değişiklik oyuncu bir sonraki girişinde (açıksa hemen) cihazına da uygulanır.</p>`;
    $('#pmBack').onclick=()=>{ box.outerHTML=panel(); bind(); loadTop(); };
    const confirm2=(b,f)=>{ if(!b.dataset.ok){ const t=b.textContent; b.dataset.ok=1; b.textContent='Emin misin? Tekrar bas'; setTimeout(()=>{ if(b.dataset.ok){ delete b.dataset.ok; b.textContent=t; } },3000); return; } delete b.dataset.ok; f(); };
    $$('.pm-f',box).forEach(row=>{ const f=row.dataset.f, inp=row.querySelector('input');
      row.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{ const m=b.dataset.m, v=parseInt(inp.value,10)||0;
        const go=async()=>{ b.disabled=true; const cur=d[f]||0, nv=m==='add'?cur+v:m==='sub'?cur-v:m==='set'?v:0;
          try{ await setField(uid,d,f,nv); row.querySelector('.cur').textContent=fmt(d[f]); SFX.play('confirm'); toast('Güncellendi',`${d.name}: ${FIELDS.find(x=>x[0]===f)[1]} = ${fmt(d[f])}`); renderBoards(); }catch(e){ toast('Olmadı',String(e.code||e.message)); } b.disabled=false; };
        (m==='zero'||m==='set')?confirm2(b,go):go(); }); });
    $$('[data-w]',box).forEach(b=>b.onclick=()=>confirm2(b,async()=>{ b.disabled=true; try{ await wipe(uid,d,b.dataset.w); SFX.play('confirm'); toast('Tamam',`${d.name}: işlem uygulandı.`); detail(d); renderBoards(); }catch(e){ toast('Olmadı',String(e.code||e.message)); b.disabled=false; } }));
    $('#pmMute').onclick=async()=>{ try{ const r=FB.db.collection('muted').doc(uid); if(muted){ await r.delete(); await log(uid,d.name,'Susturma kaldırıldı'); } else { await r.set({name:d.name||'',by:FB.user.uid,at:firebase.firestore.FieldValue.serverTimestamp()}); await log(uid,d.name,'Sohbette susturuldu'); } toast(muted?'Susturma kaldırıldı':'Susturuldu',d.name||''); detail(d); }catch(e){ toast('Olmadı',String(e.code||e.message)); } };
    $('#pmProf').onclick=()=>window.openProfile&&window.openProfile(uid,{});
    const ad=$('#pmAdm'); ad&&(ad.onclick=()=>confirm2(ad,async()=>{ try{ const r=FB.db.collection('admins').doc(uid); if(isAdm){ await r.delete(); await log(uid,d.name,'Adminliği alındı'); } else { await r.set({name:d.name||'',by:FB.user.uid}); await log(uid,d.name,'Admin yapıldı'); } toast('Tamam',''); detail(d); }catch(e){ toast('Olmadı',String(e.code||e.message)); } }));
  }
  function bind(){ let t=null; const q=$('#pmQ'); q&&(q.oninput=()=>{ clearTimeout(t); t=setTimeout(()=>search(q.value),400); }); const tp=$('#pmTop'); tp&&(tp.onclick=()=>{ q.value=''; loadTop(); }); }
  async function loadLog(){ const L=$('#pmLog'); if(!L) return; L.innerHTML='<p class="dim">Yükleniyor…</p>';
    try{ const q=await FB.db.collection('adminLog').orderBy('at','desc').limit(50).get();
      L.innerHTML=q.empty?'<p class="dim">Henüz kayıt yok.</p>':q.docs.map(x=>{ const v=x.data(), t=v.at&&v.at.toDate?v.at.toDate().toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):''; return `<div><b>${esc(v.byName||'Admin')}</b> → <b>${esc(v.targetName||'')}</b>: ${esc(v.action||'')}<small>${t}</small></div>`; }).join(''); }
    catch(e){ L.textContent='Kayıt okunamadı: '+(e.code||e.message); } }

  const _oa=openAdmin;
  openAdmin=function(){ _oa(); if(!FB.admin) return; const tabs=$('.tabs2',mBody), wrap=$('.adm',mBody); if(!tabs||!wrap||$('#admU')) return;
    tabs.insertAdjacentHTML('afterbegin','<button data-t="u" type="button">👥 Oyuncular</button>'); tabs.insertAdjacentHTML('beforeend','<button data-t="l" type="button">📜 Kayıt</button>');
    wrap.insertAdjacentHTML('beforeend',`<div id="admU" class="admf" hidden>${panel()}</div><div id="admL" class="admf" hidden><div class="pm-log" id="pmLog"></div></div>`);
    const show=t=>{ $$('.tabs2 button',mBody).forEach(x=>x.classList.toggle('on',x.dataset.t===t)); $$('.adm > .admf, .adm > form, .adm > div[id^="adm"]',mBody).forEach(p=>p.hidden=true);
      const map={u:'#admU',l:'#admL',r:'#admR',a:'#admA',p:'#admP',d:'#admD'}; const el=$(map[t],mBody); if(el) el.hidden=false;
      if(t==='u'){ bind(); if(!rowsCache.length||!$('#pmL').children.length) loadTop(); } if(t==='l') loadLog(); if(t==='d'&&window.loadAdmLists) loadAdmLists(); };
    $$('.tabs2 button',mBody).forEach(b=>b.addEventListener('click',()=>show(b.dataset.t)));
    show('u'); };
  window.openAdmin=openAdmin;

  /* ---- oyuncu tarafı: admin işlemlerini cihaza uygula ---- */
  let unsub=null, busy=false;
  async function applyOps(docs){ if(busy) return; busy=true;
    try{ let changed=false; for(const dd of docs){ const o=dd.data(); if(o.done) continue; const s=prog();
        if(o.set){ if(o.set.coins!=null) s.coins=o.set.coins; if(o.set.xp!=null) s.xp=o.set.xp;
          if(o.set.points!=null){ try{ const k='mt_pts_'+(AUTH.user?(AUTH.user.id||AUTH.user.username):'anon'); const m=JSON.parse(localStorage.getItem(k)||'null')||{points:0,best:0,games:0}; m.points=o.set.points; localStorage.setItem(k,JSON.stringify(m)); }catch(e){} } }
        if(o.wipe==='cards'||o.wipe==='all'){ s.cards={}; s.showcase=[]; }
        if(o.wipe==='frames'||o.wipe==='all'){ s.frames=[]; s.frame=null; }
        if(o.wipe==='nc'||o.wipe==='all'){ s.nameColors=[]; s.nameColor=null; }
        if(o.wipe==='all'){ s.coins=0; s.xp=0; s.bp&&(s.bp.xp=0); }
        saveProg(s); changed=true; await dd.ref.set({done:true},{merge:true}).catch(()=>{}); }
      if(changed){ const s=prog(); FB.db.collection('users').doc(FB.user.uid).set({coins:s.coins||0,xp:s.xp||0,cards:s.cards||{},frames:s.frames||[],frame:s.frame||null,nameColors:s.nameColors||[],nameColor:s.nameColor||null},{merge:true}).catch(()=>{});
        renderUser(); renderLevel&&renderLevel(); window.renderShop&&renderShop(); toast('Hesabın güncellendi','Bir admin hesabında değişiklik yaptı.'); } }
    catch(e){} busy=false; }
  (function w(){ if(FB.ready&&FB.auth){ FB.auth.onAuthStateChanged(u=>{ unsub&&unsub(); unsub=null; if(!u) return;
      setTimeout(()=>{ unsub=FB.db.collection('adminOps').where('to','==',u.uid).onSnapshot(q=>{ const open=q.docs.filter(d=>!d.data().done); if(open.length) applyOps(open); },()=>{}); },5500); }); } else setTimeout(w,800); })();
})();


/* ========================= GANİMET SAHNESİ: 3B kasa açılışı + fermuarlı kart paketi (tam ekran) ========================= */
(function(){
  const RC={b:'#C8834A',g:'#D5DAE4',a:'#FFB627',e:'#FF3B4E'}, RN={b:'BRONZ',g:'NADİR',a:'EPİK',e:'EFSANE'}, RO={b:0,g:1,a:2,e:3};
  const st=document.createElement('style'); st.textContent=`
  .mtloot{position:fixed;inset:0;z-index:9000;overflow:hidden;color:#fff;font-family:var(--body);user-select:none;-webkit-user-select:none;touch-action:none;--gc:#ffd34d;--s:1;animation:ltIn .35s ease-out both}
  @keyframes ltIn{from{opacity:0}}
  .mtloot.out{animation:ltOut .3s ease-in both}
  @keyframes ltOut{to{opacity:0}}
  .lt-bg{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 58%,color-mix(in srgb,var(--gc) 26%,#141026) 0%,#0b0916 55%,#040308 100%);transition:background .6s}
  .lt-floor{position:absolute;left:-30%;right:-30%;bottom:-8%;height:46%;background:repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 2px,transparent 2px 80px),repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0 2px,transparent 2px 80px);transform:perspective(600px) rotateX(64deg);transform-origin:50% 100%;-webkit-mask-image:linear-gradient(transparent,#000 70%);mask-image:linear-gradient(transparent,#000 70%);opacity:.7}
  .lt-rays{position:absolute;left:50%;top:46%;width:190vmax;height:190vmax;margin:-95vmax 0 0 -95vmax;background:repeating-conic-gradient(from 0deg,color-mix(in srgb,var(--gc) 55%,transparent) 0deg 7deg,transparent 7deg 18deg);-webkit-mask-image:radial-gradient(circle,#000 0,transparent 62%);mask-image:radial-gradient(circle,#000 0,transparent 62%);animation:ltSpin 22s linear infinite;opacity:.12;transition:opacity .5s;pointer-events:none}
  .mtloot.hot .lt-rays{opacity:.55}
  @keyframes ltSpin{to{transform:rotate(360deg)}}
  .lt-cv{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:6}
  .lt-flash{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,#fff,color-mix(in srgb,var(--gc) 70%,#fff) 30%,transparent 72%);opacity:0;pointer-events:none;z-index:7}
  .lt-flash.go{animation:ltFl .7s ease-out}
  @keyframes ltFl{0%{opacity:0}12%{opacity:1}100%{opacity:0}}
  .mtloot.shk{animation:ltShk .45s}
  @keyframes ltShk{0%,100%{transform:none}15%{transform:translate(-9px,5px)}30%{transform:translate(8px,-6px)}45%{transform:translate(-6px,-4px)}60%{transform:translate(5px,4px)}80%{transform:translate(-3px,2px)}}
  .lt-top{position:absolute;left:0;right:0;top:0;z-index:9;display:flex;align-items:center;gap:10px;padding:calc(14px + env(safe-area-inset-top,0px)) 16px 10px}
  .lt-title{flex:1;font-family:var(--display);font-size:clamp(20px,5vw,30px);letter-spacing:.05em;text-transform:uppercase;text-shadow:0 3px 0 rgba(0,0,0,.6)}
  .lt-title small{display:block;font:600 11px var(--mono);letter-spacing:.18em;color:rgba(255,255,255,.6)}
  .lt-skip{font:800 13px var(--body);color:#fff;background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.35);border-radius:99px;padding:9px 16px;cursor:pointer;backdrop-filter:blur(4px)}
  .lt-skip:hover{background:rgba(255,255,255,.22)}
  .lt-tip{position:absolute;left:0;right:0;bottom:calc(26px + env(safe-area-inset-bottom,0px));z-index:8;text-align:center;font-family:var(--display);font-size:clamp(20px,5.4vw,30px);letter-spacing:.08em;text-shadow:0 3px 0 rgba(0,0,0,.7);animation:ltPulse 1.1s ease-in-out infinite;pointer-events:none}
  .lt-tip:empty{display:none}
  @keyframes ltPulse{50%{transform:scale(1.07);opacity:.75}}
  .lt-scene{position:absolute;left:50%;top:56%;width:0;height:0;z-index:3;transform:scale(var(--s));transition:top .6s cubic-bezier(.3,1.2,.4,1),transform .6s cubic-bezier(.3,1.2,.4,1),opacity .4s}
  .mtloot.rew .lt-scene{top:79%;transform:scale(calc(var(--s)*.62))}
  .mtloot.sum .lt-scene{opacity:0;transform:scale(calc(var(--s)*.3)) translateY(300px);pointer-events:none}

  /* ---------- 3B KASA ---------- */
  .ch-wrap{position:absolute;left:0;top:0;width:0;height:0;--w:230px;--h:118px;--d:150px;--r:75px;--open:0deg}
  .ch-wrap.drop{animation:chDrop .75s cubic-bezier(.5,0,.9,.6) both}
  @keyframes chDrop{0%{transform:translateY(-120vh) rotate(-14deg)}78%{transform:translateY(0) rotate(0) scale(1,1)}86%{transform:translateY(14px) scale(1.14,.8)}94%{transform:translateY(-16px) scale(.95,1.07)}100%{transform:none}}
  .ch-wrap.hit{animation:chHit .42s cubic-bezier(.3,1.5,.5,1)}
  @keyframes chHit{0%{transform:none}20%{transform:translateY(10px) scale(1.12,.84)}50%{transform:translateY(-34px) scale(.93,1.1) rotate(-5deg)}75%{transform:translateY(0) scale(1.06,.93) rotate(4deg)}100%{transform:none}}
  .ch-wrap.spit{animation:chSpit .38s cubic-bezier(.3,1.5,.5,1)}
  @keyframes chSpit{0%{transform:none}30%{transform:scale(1.1,.86) translateY(8px)}60%{transform:scale(.95,1.08) translateY(-10px)}100%{transform:none}}
  .ch-wrap.rumble{animation:chRum .09s linear infinite}
  @keyframes chRum{0%{transform:translate(-4px,1px) rotate(-1.6deg)}50%{transform:translate(4px,-2px) rotate(1.6deg)}100%{transform:translate(-3px,2px) rotate(-1deg)}}
  .ch-shadow{position:absolute;left:-150px;top:36px;width:300px;height:70px;border-radius:50%;background:radial-gradient(ellipse,rgba(0,0,0,.7),transparent 68%);}
  .ch-aura{position:absolute;left:-210px;top:-190px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--gc) 60%,transparent),transparent 62%);opacity:var(--au,.25);transition:opacity .3s;animation:ltPulse 1.6s ease-in-out infinite;pointer-events:none}
  .ch{position:absolute;left:0;top:0;width:0;height:0;transform-style:preserve-3d;transform:rotateX(-17deg) rotateY(-30deg);animation:chSway 5s ease-in-out infinite}
  @keyframes chSway{0%,100%{transform:rotateX(-17deg) rotateY(-36deg)}50%{transform:rotateX(-15deg) rotateY(-22deg)}}
  .ch.front{animation:none;transform:rotateX(-24deg) rotateY(-14deg);transition:transform .5s}
  .ch i,.ch u{position:absolute;display:block;backface-visibility:hidden;-webkit-backface-visibility:hidden;font-style:normal;text-decoration:none}
  .ch-f,.ch-b{width:var(--w);height:var(--h);left:calc(var(--w)/-2);top:calc(var(--h)/-2)}
  .ch-l,.ch-r{width:var(--d);height:var(--h);left:calc(var(--d)/-2);top:calc(var(--h)/-2)}
  .ch-bt,.ch-in{width:var(--w);height:var(--d);left:calc(var(--w)/-2);top:calc(var(--d)/-2)}
  .ch-f{transform:translateZ(calc(var(--d)/2))}
  .ch-b{transform:rotateY(180deg) translateZ(calc(var(--d)/2))}
  .ch-l{transform:rotateY(-90deg) translateZ(calc(var(--w)/2))}
  .ch-r{transform:rotateY(90deg) translateZ(calc(var(--w)/2))}
  .ch-bt{transform:rotateX(-90deg) translateZ(calc(var(--h)/2));background:#120c08}
  .ch-in{transform:rotateX(90deg) translateZ(calc(var(--h)/2 - 3px));background:radial-gradient(ellipse at 50% 50%,#fff 0,color-mix(in srgb,var(--gc) 85%,#fff) 22%,color-mix(in srgb,var(--gc) 40%,#1a0f08) 60%,#0d0705 100%);backface-visibility:visible!important;-webkit-backface-visibility:visible!important;filter:brightness(var(--inb,.25));transition:filter .4s}
  .ch-skin{background:
    linear-gradient(90deg,transparent 0 9%,var(--t2) 9% 10%,var(--t1) 10% 17%,var(--t2) 17% 18%,transparent 18% 82%,var(--t2) 82% 83%,var(--t1) 83% 90%,var(--t2) 90% 91%,transparent 91%),
    radial-gradient(circle at 13.5% 22%,var(--t3) 0 3px,transparent 4px),radial-gradient(circle at 13.5% 78%,var(--t3) 0 3px,transparent 4px),radial-gradient(circle at 86.5% 22%,var(--t3) 0 3px,transparent 4px),radial-gradient(circle at 86.5% 78%,var(--t3) 0 3px,transparent 4px),
    linear-gradient(180deg,var(--t1) 0 9px,var(--t2) 9px 11px,transparent 11px calc(100% - 11px),var(--t2) calc(100% - 11px) calc(100% - 9px),var(--t1) calc(100% - 9px)),
    repeating-linear-gradient(180deg,transparent 0 26px,rgba(0,0,0,.38) 26px 29px),
    linear-gradient(180deg,var(--c1),var(--c2));box-shadow:inset 0 0 0 3px #0a0608,inset 0 0 26px rgba(0,0,0,.45)}
  .ch-l,.ch-b{filter:brightness(.62)} .ch-r{filter:brightness(.8)}
  .ch-lock{width:44px;height:52px;left:-22px;top:calc(var(--h)/-2 - 16px);transform:translateZ(calc(var(--d)/2 + 3px));border-radius:8px 8px 20px 20px;background:linear-gradient(160deg,#fff7c9,var(--t1) 40%,var(--t2));box-shadow:inset 0 0 0 3px #0a0608,0 4px 0 rgba(0,0,0,.45);transition:transform .45s cubic-bezier(.4,-0.3,.8,.6),opacity .3s .25s}
  .ch-lock::after{content:"";position:absolute;left:50%;top:44%;width:12px;height:12px;margin:-6px;border-radius:50%;background:#0a0608;box-shadow:0 10px 0 -3px #0a0608}
  .ch-wrap.open .ch-lock{transform:translateZ(calc(var(--d)/2 + 60px)) translateY(120px) rotate(40deg);opacity:0}
  .ch-gem{width:30px;height:30px;left:-15px;top:-6px;transform:translateZ(calc(var(--d)/2 + 2px)) rotate(45deg);background:linear-gradient(135deg,#fff,var(--gc) 45%,color-mix(in srgb,var(--gc) 50%,#000));box-shadow:0 0 0 3px #0a0608,0 0 22px var(--gc);animation:ltPulse 1.4s ease-in-out infinite}
  .ch-lid{position:absolute;left:0;top:0;width:0;height:0;transform-style:preserve-3d;transform:translateY(calc(var(--h)/-2)) translateZ(calc(var(--d)/-2)) rotateX(var(--open));transition:transform .28s cubic-bezier(.3,1.6,.5,1)}
  .ch-wrap.open .ch-lid{transition:transform .6s cubic-bezier(.2,1.5,.35,1)}
  .ch-ax{position:absolute;left:0;top:0;width:0;height:0;transform-style:preserve-3d;transform:translateZ(var(--r)) scaleY(.78)}
  .ch-st{width:var(--w);left:calc(var(--w)/-2);background:
    linear-gradient(90deg,transparent 0 9%,var(--t2) 9% 10%,var(--t1) 10% 17%,var(--t2) 17% 18%,transparent 18% 82%,var(--t2) 82% 83%,var(--t1) 83% 90%,var(--t2) 90% 91%,transparent 91%),
    linear-gradient(180deg,rgba(0,0,0,.4) 0 2px,transparent 2px),linear-gradient(180deg,var(--c1),var(--c2));box-shadow:inset 3px 0 0 #0a0608,inset -3px 0 0 #0a0608}
  .ch-cap{width:calc(var(--r)*2);height:var(--r);left:calc(var(--r)*-1);top:calc(var(--r)*-1);border-radius:var(--r) var(--r) 0 0;background:radial-gradient(circle at 50% 100%,var(--c1) 0 58%,var(--t2) 58% 61%,var(--t1) 61% 96%,#0a0608 96%);box-shadow:inset 0 -9px 0 var(--t1),inset 0 -11px 0 var(--t2)}
  .ch-cap.l{transform:rotateY(-90deg) translateZ(calc(var(--w)/2));filter:brightness(.62)}
  .ch-cap.r{transform:rotateY(90deg) translateZ(calc(var(--w)/2));filter:brightness(.8)}
  .ch-un{width:var(--w);height:var(--d);left:calc(var(--w)/-2);top:calc(var(--d)/-2);transform:translateZ(var(--r)) rotateX(-90deg);background:linear-gradient(180deg,#2a1608,#0d0705);box-shadow:inset 0 0 0 8px var(--t2)}
  .ch-beam{position:absolute;left:-150px;top:-760px;width:300px;height:720px;background:linear-gradient(0deg,color-mix(in srgb,var(--gc) 80%,#fff) 0,color-mix(in srgb,var(--gc) 55%,transparent) 30%,transparent 100%);clip-path:polygon(34% 100%,66% 100%,100% 0,0 0);opacity:0;transform-origin:50% 100%;transform:scaleY(.2);transition:opacity .35s,transform .5s cubic-bezier(.2,1.4,.4,1);pointer-events:none;mix-blend-mode:screen;filter:blur(3px)}
  .ch-wrap.open .ch-beam{opacity:.85;transform:none;animation:chBeam 2.2s ease-in-out infinite .5s}
  @keyframes chBeam{50%{opacity:.55;transform:scaleX(.86)}}
  .ch-wrap[data-t="0"]{--c1:#9a6230;--c2:#5a3416;--t1:#ffd34d;--t2:#8a5a0a;--t3:#fff3b0}
  .ch-wrap[data-t="1"]{--c1:#3566c4;--c2:#152a63;--t1:#dff3ff;--t2:#4a87c9;--t3:#ffffff}
  .ch-wrap[data-t="2"]{--c1:#8a1226;--c2:#2a060e;--t1:#ffd34d;--t2:#a8650a;--t3:#fff3b0}
  .ch-wrap[data-t="2"] .ch-st,.ch-wrap[data-t="2"] .ch-skin{animation:chLeg 1.8s ease-in-out infinite}
  @keyframes chLeg{50%{filter:brightness(1.28) saturate(1.3)}}
  .lt-left{position:absolute;left:92px;top:-130px;min-width:54px;height:54px;padding:0 10px;border-radius:99px;background:var(--gc);color:#0a0608;font:900 28px var(--display);display:grid;place-items:center;border:4px solid #0a0608;box-shadow:0 5px 0 #0a0608;opacity:0;transform:scale(.3);transition:transform .35s cubic-bezier(.3,1.7,.5,1),opacity .2s}
  .lt-left.on{opacity:1;transform:none}
  .lt-left.bump{animation:ltBump .3s}
  @keyframes ltBump{40%{transform:scale(1.35)}}

  /* ---------- ÖDÜL GÖSTERİMİ ---------- */
  .lt-show{position:absolute;left:0;right:0;top:44%;z-index:5;display:grid;justify-items:center;pointer-events:none;transform:translateY(-50%)}
  .lt-rw{display:grid;justify-items:center;gap:12px;text-align:center;--rc:#ffd34d;animation:rwIn .55s cubic-bezier(.2,1.5,.4,1) both}
  @keyframes rwIn{0%{transform:translateY(34vh) scale(.08) rotate(-25deg);opacity:0}55%{opacity:1}100%{transform:none;opacity:1}}
  .lt-rw.go{animation:rwOut .26s ease-in both}
  @keyframes rwOut{to{transform:translateY(-30vh) scale(.5);opacity:0}}
  .lt-art{position:relative;display:grid;place-items:center;min-height:clamp(150px,30vh,250px);filter:drop-shadow(0 18px 30px rgba(0,0,0,.6)) drop-shadow(0 0 34px var(--rc));animation:rwFloat 2.4s ease-in-out infinite}
  @keyframes rwFloat{50%{transform:translateY(-10px) rotate(1.5deg)}}
  .lt-art .ltc{width:clamp(150px,26vh,220px);aspect-ratio:5/7;border-radius:12px;overflow:hidden;border:5px solid #0a0608;box-shadow:0 0 0 4px var(--rc);background:#14101f}
  .lt-art .ltc img{width:100%;height:100%;object-fit:cover;display:block}
  .lt-art .pk{width:clamp(130px,22vh,180px);height:auto;aspect-ratio:12/17;margin:0}
  .lt-art .pk b{font-size:clamp(22px,4vh,32px)}
  .lt-art .ltnc{font-family:var(--display);font-size:clamp(34px,8vw,58px);padding:16px 26px;background:#14101f;border:5px solid #0a0608;border-radius:14px;box-shadow:0 0 0 4px var(--rc)}
  .lt-art .ltfr{transform:scale(1.5);padding:26px}
  .lt-art .ltxp{font-size:clamp(90px,20vh,150px);line-height:1;text-shadow:0 0 40px #7fd4ff}
  .lt-coins{position:relative;width:170px;height:150px}
  .lt-coins i{position:absolute;width:86px;height:86px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff6c8,#ffd34d 42%,#c98a12);border:5px solid #0a0608;box-shadow:0 7px 0 #7a5208,0 7px 0 5px #0a0608;display:grid;place-items:center;font:900 26px var(--display);color:#7a5208;font-style:normal}
  .lt-coins i:nth-child(1){left:0;top:52px;transform:rotate(-14deg)} .lt-coins i:nth-child(2){left:84px;top:56px;transform:rotate(12deg)} .lt-coins i:nth-child(3){left:42px;top:8px}
  .lt-coins.big i:nth-child(n+4){display:grid} .lt-coins i:nth-child(n+4){display:none;left:24px;top:70px;transform:rotate(6deg)} .lt-coins i:nth-child(5){left:62px;top:74px;transform:rotate(-8deg)}
  .lt-rar{font:900 clamp(15px,3.4vw,20px) var(--display);letter-spacing:.2em;padding:5px 18px;border-radius:99px;background:var(--rc);color:#0a0608;border:3px solid #0a0608;box-shadow:0 4px 0 #0a0608}
  .lt-name{font-family:var(--display);font-size:clamp(28px,7vw,48px);line-height:1;letter-spacing:.03em;text-shadow:0 4px 0 #0a0608,0 0 30px var(--rc);max-width:92vw}
  .lt-sub{font:700 14px var(--body);color:rgba(255,255,255,.75)}
  .lt-slam{position:absolute;left:0;right:0;top:20%;z-index:8;text-align:center;font-family:var(--display);font-size:clamp(54px,15vw,120px);letter-spacing:.06em;color:var(--gc);-webkit-text-stroke:3px #0a0608;paint-order:stroke fill;text-shadow:6px 6px 0 #0a0608,0 0 50px var(--gc);pointer-events:none;animation:ltSlam .9s cubic-bezier(.2,1.6,.4,1) both}
  @keyframes ltSlam{0%{transform:scale(4) rotate(-8deg);opacity:0}30%{transform:scale(.9) rotate(-4deg);opacity:1}45%{transform:scale(1.08) rotate(-4deg)}80%{transform:scale(1) rotate(-4deg);opacity:1}100%{transform:scale(1.1) rotate(-4deg);opacity:0}}

  /* ---------- ÖZET ---------- */
  .lt-sum{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;gap:14px;padding:calc(70px + env(safe-area-inset-top,0px)) 16px calc(18px + env(safe-area-inset-bottom,0px));overflow:auto;touch-action:pan-y}
  .lt-sum[hidden]{display:none}
  .lt-sum h3{margin:0;font-family:var(--display);font-size:clamp(30px,8vw,52px);letter-spacing:.05em;text-shadow:0 4px 0 #0a0608;animation:rwIn .5s cubic-bezier(.2,1.5,.4,1) both}
  .lt-chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
  .lt-chips span{font:800 12px var(--mono);letter-spacing:.1em;padding:4px 12px;border-radius:99px;color:#0a0608;border:2px solid #0a0608}
  .lt-grid{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;max-width:860px;margin:auto 0}
  .lt-it{width:clamp(96px,26vw,168px);display:grid;justify-items:center;gap:6px;text-align:center;padding:10px 8px;border-radius:14px;background:rgba(20,16,31,.82);border:3px solid var(--rc,#888);box-shadow:0 5px 0 #0a0608,0 0 20px color-mix(in srgb,var(--rc,#888) 45%,transparent);animation:itIn .45s cubic-bezier(.2,1.5,.4,1) both;position:relative}
  @keyframes itIn{from{transform:translateY(40px) scale(.5);opacity:0}}
  .lt-it .ic{height:clamp(74px,14vh,128px);display:grid;place-items:center;font-size:44px;line-height:1}
  .lt-it .ic img{height:clamp(74px,14vh,128px);border-radius:6px;border:2px solid #0a0608;display:block}
  .lt-it .ic .pk{width:52px;height:74px;margin:0;border-width:2px;box-shadow:none}.lt-it .ic .pk b{font-size:11px;-webkit-text-stroke:1px #0a0608;text-shadow:none}.lt-it .ic .pk small{display:none}
  .lt-it b{font:800 12.5px/1.2 var(--body)}
  .lt-it small{font:600 10.5px var(--body);color:rgba(255,255,255,.6)}
  .lt-it em{position:absolute;top:-9px;right:-7px;font:900 11px var(--display);font-style:normal;letter-spacing:.06em;padding:2px 8px;border-radius:99px;background:#39d98a;color:#0a0608;border:2px solid #0a0608;transform:rotate(8deg)}
  .lt-it em.dup{background:#d5dae4}
  .lt-acts{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;position:sticky;bottom:0;padding:10px 0 2px}
  .lt-acts button{font:900 16px var(--display);letter-spacing:.06em;text-transform:uppercase;padding:13px 22px;border-radius:10px;border:3px solid #0a0608;box-shadow:0 5px 0 #0a0608;cursor:pointer;color:#fff;background:#2a2440}
  .lt-acts button.p{background:var(--gold,#ffd34d);color:#0a0608}
  .lt-acts button:active{transform:translateY(4px);box-shadow:0 1px 0 #0a0608}
  .lt-note{font:600 13px var(--body);color:rgba(255,255,255,.75);text-align:center;margin:0}

  /* ---------- FERMUARLI PAKET ---------- */
  .zp-wrap{position:absolute;left:-118px;top:-200px;width:236px;height:340px;--p:0}
  .zp-wrap.drop{animation:zpDrop .7s cubic-bezier(.2,1.4,.4,1) both}
  @keyframes zpDrop{0%{transform:translateY(90vh) rotate(18deg) scale(.6)}100%{transform:none}}
  .zp-wrap.idle{animation:zpIdle 3s ease-in-out infinite}
  @keyframes zpIdle{50%{transform:translateY(-10px) rotate(-1.6deg)}}
  .zp-wrap.jolt{animation:zpJolt .5s}
  @keyframes zpJolt{20%{transform:scale(1.08) rotate(-3deg)}45%{transform:scale(.96) rotate(3deg)}70%{transform:scale(1.04) rotate(-2deg)}}
  .zp-back{position:absolute;inset:6px 8px;border-radius:10px;background:linear-gradient(180deg,#000,#1a1226);box-shadow:inset 0 0 40px #000}
  .zp-glow{position:absolute;left:4%;right:4%;top:0;height:30%;border-radius:50%;background:radial-gradient(ellipse at 50% 60%,#fff,var(--gc) 35%,transparent 70%);opacity:calc(var(--p)*.95);transform:translateY(-30%) scale(calc(.4 + var(--p)*.8));filter:blur(6px);pointer-events:none;mix-blend-mode:screen}
  .zp-cards{position:absolute;inset:0;pointer-events:none}
  .zp-front{position:absolute;inset:0;border-radius:12px;background:var(--pkbg,linear-gradient(160deg,#4a7bff,#1b2a6b));border:5px solid #0a0608;box-shadow:0 22px 44px rgba(0,0,0,.6),inset 0 0 0 3px rgba(255,255,255,.18);overflow:hidden;clip-path:polygon(0 0,100% 0,100% 100%,0 100%)}
  .zp-wrap.torn .zp-front{clip-path:polygon(0 17.5%,100% 17.5%,100% 100%,0 100%)}
  .zp-front::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,transparent 0 22px,rgba(255,255,255,.1) 22px 30px),radial-gradient(ellipse at 30% 20%,rgba(255,255,255,.35),transparent 55%)}
  .zp-front::after{content:"";position:absolute;top:-20%;bottom:-20%;left:-60%;width:40%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-18deg);animation:zpShine 2.6s ease-in-out infinite}
  @keyframes zpShine{0%,35%{left:-60%}100%{left:130%}}
  .zp-crimp{position:absolute;left:0;right:0;height:16px;background:repeating-linear-gradient(90deg,rgba(0,0,0,.34) 0 4px,rgba(255,255,255,.2) 4px 8px)}
  .zp-crimp.t{top:0}.zp-crimp.b{bottom:0}
  .zp-logo{position:absolute;left:0;right:0;top:32%;display:grid;justify-items:center;gap:10px;text-align:center}
  .zp-logo b{font-family:var(--display);font-size:46px;line-height:.92;color:#fff;-webkit-text-stroke:3px #0a0608;paint-order:stroke fill;text-shadow:5px 5px 0 #0a0608;transform:rotate(-7deg)}
  .zp-logo small{font:800 13px var(--mono);letter-spacing:.2em;color:#fff;background:#0a0608;padding:5px 12px;border-radius:99px;margin-top:8px}
  .zp-logo i{font:900 20px var(--display);font-style:normal;letter-spacing:.1em;color:#0a0608;background:#ffd34d;border:3px solid #0a0608;border-radius:8px;padding:2px 12px;transform:rotate(4deg)}
  .zp-flap{position:absolute;left:0;right:0;top:0;height:17.5%;border-radius:12px 12px 0 0;background:var(--pkbg,linear-gradient(160deg,#4a7bff,#1b2a6b));border:5px solid #0a0608;border-bottom:0;overflow:hidden;opacity:0;transform-origin:0 100%}
  .zp-flap::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,transparent 0 22px,rgba(255,255,255,.1) 22px 30px)}
  .zp-wrap.torn .zp-flap{opacity:1;animation:zpFlap .8s cubic-bezier(.3,0,.7,1) both}
  @keyframes zpFlap{0%{transform:none;opacity:1}100%{transform:translate(-70px,-190px) rotate(-70deg);opacity:0}}
  .zp-zip{position:absolute;left:0;right:0;top:14%;height:26px;z-index:3}
  .zp-wrap.torn .zp-zip{opacity:0;transition:opacity .25s}
  .zp-tape{position:absolute;inset:0;background:#0a0608;box-shadow:0 2px 0 rgba(255,255,255,.2),0 -2px 0 rgba(255,255,255,.2)}
  .zp-teeth{position:absolute;left:0;right:0;top:7px;height:12px;background:repeating-linear-gradient(90deg,#e9eef5 0 5px,#8b94a3 5px 7px,#2a2f3a 7px 9px);clip-path:inset(0 0 0 calc(var(--p)*100%))}
  .zp-gap{position:absolute;left:0;top:1px;bottom:1px;width:calc(var(--p)*100%);background:radial-gradient(ellipse at 50% 50%,#fff,var(--gc) 45%,#0a0608 100%);clip-path:polygon(0 30%,100% 46%,100% 54%,0 70%);filter:brightness(1.3)}
  .zp-gap::before,.zp-gap::after{content:"";position:absolute;left:0;right:0;height:6px;background:repeating-linear-gradient(90deg,#e9eef5 0 5px,#8b94a3 5px 7px,transparent 7px 9px)}
  .zp-gap::before{top:-1px}.zp-gap::after{bottom:-1px}
  .zp-pull{position:absolute;top:-9px;left:calc(var(--p)*100%);width:34px;height:44px;margin-left:-17px;cursor:grab;touch-action:none;z-index:2}
  .zp-pull::before{content:"";position:absolute;left:4px;top:6px;width:26px;height:22px;border-radius:5px;background:linear-gradient(180deg,#fff,#aeb7c6 60%,#5d6675);border:3px solid #0a0608}
  .zp-pull::after{content:"";position:absolute;left:8px;top:24px;width:18px;height:34px;border-radius:5px 5px 9px 9px;background:linear-gradient(180deg,#ffe98a,#ffd34d 50%,#b8860b);border:3px solid #0a0608;box-shadow:inset 0 -12px 0 -7px #0a0608;transform-origin:50% 0;animation:zpTag 1.2s ease-in-out infinite}
  @keyframes zpTag{0%,100%{transform:rotate(-14deg)}50%{transform:rotate(14deg)}}
  .zp-hand{position:absolute;left:4px;top:13%;font-size:40px;z-index:4;pointer-events:none;animation:zpHand 1.7s ease-in-out infinite;filter:drop-shadow(0 4px 0 rgba(0,0,0,.5))}
  @keyframes zpHand{0%{transform:translateX(0);opacity:0}15%{opacity:1}75%{transform:translateX(170px);opacity:1}100%{transform:translateX(190px);opacity:0}}
  .zc{position:absolute;left:50%;top:10%;width:150px;aspect-ratio:5/7;margin-left:-75px;perspective:900px;transform:translateY(60px) scale(.9);opacity:0;--rc:#ffd34d}
  .zc.peek{opacity:1;transform:translateY(-70px) scale(.9);transition:transform .45s cubic-bezier(.2,1.3,.4,1),opacity .1s}
  .zc.up{opacity:1;transform:translateY(var(--ty,-300px)) scale(var(--sc,1.5));transition:transform .55s cubic-bezier(.2,1.25,.4,1)}
  .zc.away{opacity:0;transform:translateY(var(--ty,-300px)) translateX(var(--ax,0)) scale(.2) rotate(20deg);transition:transform .3s ease-in,opacity .3s ease-in}
  .zc-in{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .55s cubic-bezier(.3,1.3,.5,1)}
  .zc.flip .zc-in{transform:rotateY(180deg)}
  .zc-b,.zc-f{position:absolute;inset:0;border-radius:10px;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;border:4px solid #0a0608}
  .zc-b{background:radial-gradient(circle at 50% 40%,color-mix(in srgb,var(--rc) 55%,#241c3a),#0d0b14 75%);display:grid;place-items:center;box-shadow:0 0 0 3px var(--rc),0 0 34px var(--rc)}
  .zc-b img{width:58%;filter:drop-shadow(3px 3px 0 #0a0608)}
  .zc-f{transform:rotateY(180deg);background:#14101f;box-shadow:0 0 0 3px var(--rc),0 0 40px var(--rc)}
  .zc-f img{width:100%;height:100%;object-fit:cover;display:block}
  .zc-f::after{content:"";position:absolute;top:-30%;bottom:-30%;left:-70%;width:45%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.7),transparent);transform:skewX(-18deg)}
  .zc.flip .zc-f::after{animation:zcSh .8s ease-out .35s both}
  @keyframes zcSh{to{left:140%}}
  .zc.wait .zc-b{animation:zcWait .5s ease-in-out infinite}
  @keyframes zcWait{50%{box-shadow:0 0 0 5px var(--rc),0 0 70px 10px var(--rc);filter:brightness(1.3)}}
  .zc-tag{position:absolute;left:50%;bottom:-16px;transform:translateX(-50%) scale(0);font:900 12px var(--display);letter-spacing:.14em;padding:2px 12px;border-radius:99px;background:var(--rc);color:#0a0608;border:3px solid #0a0608;white-space:nowrap;transition:transform .3s cubic-bezier(.3,1.7,.5,1) .4s}
  .zc.flip .zc-tag{transform:translateX(-50%) scale(1)}
  .zc-new{position:absolute;right:-14px;top:-12px;font:900 13px var(--display);padding:2px 9px;border-radius:99px;background:#39d98a;color:#0a0608;border:3px solid #0a0608;transform:rotate(10deg) scale(0);transition:transform .3s cubic-bezier(.3,1.7,.5,1) .5s}
  .zc-new.dup{background:#d5dae4}
  .zc.flip .zc-new{transform:rotate(10deg) scale(1)}
  .lt-tray{position:absolute;left:0;right:0;top:calc(62px + env(safe-area-inset-top,0px));z-index:8;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;padding:0 12px;pointer-events:none}
  .lt-tray img{width:34px;height:48px;object-fit:cover;border-radius:4px;border:2px solid #0a0608;box-shadow:0 0 0 2px var(--rc,#888);animation:itIn .3s cubic-bezier(.2,1.5,.4,1) both}
  .lt-cnt{position:absolute;right:-22px;bottom:-18px;min-width:50px;height:50px;border-radius:99px;background:#ffd34d;color:#0a0608;font:900 24px var(--display);display:grid;place-items:center;border:4px solid #0a0608;box-shadow:0 4px 0 #0a0608;z-index:5;opacity:0;transition:opacity .2s}
  .zp-wrap.torn .lt-cnt{opacity:1}
  @media (prefers-reduced-motion:reduce){.lt-rays,.ch,.lt-art,.zp-wrap.idle{animation:none}}
  `;
  document.head.appendChild(st);

  const sfx=(n,v)=>{ try{ if(SFX.sfx) SFX.sfx(n,{vol:v||.6}); }catch(e){} };
  const play=n=>{ try{ SFX.play(n); }catch(e){} };

  /* ---------- parçacık motoru ---------- */
  function FX(cv){ const x=cv.getContext('2d'); let P=[],W=0,H=0,alive=true,dpr=Math.min(2,window.devicePixelRatio||1);
    const fit=()=>{ W=cv.clientWidth; H=cv.clientHeight; cv.width=W*dpr; cv.height=H*dpr; }; fit(); window.addEventListener('resize',fit);
    const off=MTSET.fx===false;
    function add(o){ if(off||P.length>520) return; P.push(Object.assign({x:0,y:0,vx:0,vy:0,g:0,d:.985,life:1,T:1,s:4,c:'#fff',k:'s',r:Math.random()*6.28,vr:(Math.random()-.5)*.4},o)); }
    let last=performance.now();
    (function loop(t){ if(!alive) return; const dt=Math.min(.05,(t-last)/1000||.016); last=t; const f=dt*60; x.setTransform(dpr,0,0,dpr,0,0); x.clearRect(0,0,W,H);
      for(let i=P.length-1;i>=0;i--){ const p=P[i]; p.vy+=p.g*f; p.vx*=Math.pow(p.d,f); p.vy*=Math.pow(p.d,f); p.x+=p.vx*f; p.y+=p.vy*f; p.r+=p.vr*f; p.life-=dt/p.T; if(p.life<=0){ P.splice(i,1); continue; }
        const a=Math.min(1,p.life*1.6);
        if(p.k==='s'){ x.globalCompositeOperation='lighter'; x.globalAlpha=a; x.fillStyle=p.c; x.beginPath(); x.arc(p.x,p.y,p.s*(.4+p.life*.6),0,6.28); x.fill(); x.globalAlpha=a*.25; x.beginPath(); x.arc(p.x,p.y,p.s*2.6,0,6.28); x.fill(); }
        else if(p.k==='c'){ x.globalCompositeOperation='source-over'; x.globalAlpha=a; x.save(); x.translate(p.x,p.y); x.rotate(p.r); x.scale(1,Math.cos(p.r*2.3)); x.fillStyle=p.c; x.fillRect(-p.s,-p.s*.55,p.s*2,p.s*1.1); x.restore(); }
        else if(p.k==='r'){ x.globalCompositeOperation='lighter'; x.globalAlpha=a*.9; x.strokeStyle=p.c; x.lineWidth=7*p.life+1; x.beginPath(); x.arc(p.x,p.y,p.s*(1-p.life)+12,0,6.28); x.stroke(); }
        else if(p.k==='t'){ x.globalCompositeOperation='lighter'; x.globalAlpha=a; x.save(); x.translate(p.x,p.y); x.rotate(p.r); x.fillStyle=p.c; const s=p.s*(.5+p.life*.5); x.beginPath(); for(let j=0;j<8;j++){ const rr=j%2?s*.32:s, an=j*Math.PI/4; x.lineTo(Math.cos(an)*rr,Math.sin(an)*rr); } x.closePath(); x.fill(); x.restore(); } }
      x.globalAlpha=1; x.globalCompositeOperation='source-over'; requestAnimationFrame(loop); })(last);
    return { W:()=>W, H:()=>H, stop(){ alive=false; window.removeEventListener('resize',fit); },
      sparks(px,py,n,c,sp=9,up=0){ for(let i=0;i<n;i++){ const a=Math.random()*6.28, v=sp*(.35+Math.random()); add({x:px,y:py,vx:Math.cos(a)*v,vy:Math.sin(a)*v-up,g:.22,T:.5+Math.random()*.6,s:2+Math.random()*3.5,c:Math.random()<.3?'#fff':c}); } },
      stars(px,py,n,c,sp=8){ for(let i=0;i<n;i++){ const a=Math.random()*6.28, v=sp*(.4+Math.random()); add({k:'t',x:px,y:py,vx:Math.cos(a)*v,vy:Math.sin(a)*v-3,g:.12,T:.8+Math.random()*.7,s:7+Math.random()*9,c:Math.random()<.4?'#fff':c}); } },
      fountain(px,py,n,c){ for(let i=0;i<n;i++) add({x:px+(Math.random()-.5)*60,y:py,vx:(Math.random()-.5)*7,vy:-9-Math.random()*13,g:.3,T:.7+Math.random()*.7,s:2+Math.random()*4,c:Math.random()<.35?'#fff':c}); },
      ring(px,py,c,s=260){ add({k:'r',x:px,y:py,s,T:.55,c,d:1}); },
      confetti(n,cols){ for(let i=0;i<n;i++) add({k:'c',x:Math.random()*W,y:-20-Math.random()*H*.4,vx:(Math.random()-.5)*5,vy:2+Math.random()*5,g:.06,d:.995,T:2.4+Math.random()*1.6,s:5+Math.random()*5,c:cols[(Math.random()*cols.length)|0]}); },
      dust(n,c){ for(let i=0;i<n;i++) add({x:Math.random()*W,y:H*(.3+Math.random()*.7),vx:(Math.random()-.5)*.6,vy:-.3-Math.random()*.9,g:0,d:1,T:3+Math.random()*3,s:1+Math.random()*2,c}); } }; }

  /* ---------- sahne iskeleti ---------- */
  let cur=null;
  function mount(title,sub,col){
    if(cur) cur.kill();
    const el=document.createElement('div'); el.className='mtloot'; el.id='loot'; el.setAttribute('role','dialog'); el.setAttribute('aria-label',title); el.style.setProperty('--gc',col);
    el.innerHTML=`<div class="lt-bg"></div><div class="lt-floor"></div><div class="lt-rays"></div>
      <div class="lt-scene" id="ltScene"></div><div class="lt-show" id="ltShow"></div><canvas class="lt-cv"></canvas><div class="lt-flash" id="ltFlash"></div>
      <div class="lt-top"><span class="lt-title">${esc(title)}<small>${esc(sub||'')}</small></span><button class="lt-skip" id="ltSkip" type="button">Geç ⏭</button></div>
      <div class="lt-tray" id="ltTray"></div><div class="lt-tip" id="ltTip"></div><div class="lt-sum" id="ltSum" hidden></div>`;
    document.body.appendChild(el);
    const fit=()=>el.style.setProperty('--s',Math.min(1.45,innerWidth/400,innerHeight/720).toFixed(3)); fit(); window.addEventListener('resize',fit);
    const fx=FX(el.querySelector('.lt-cv')); const timers=[]; let dead=false;
    const q=s=>el.querySelector(s);
    const S={ el,fx,q, tip:t=>{ q('#ltTip').textContent=t||''; }, glow:c=>el.style.setProperty('--gc',c), hot:on=>el.classList.toggle('hot',!!on),
      after:(ms,f)=>{ const t=setTimeout(()=>{ if(!dead) f(); },ms); timers.push(t); return t; },
      flash:()=>{ const f=q('#ltFlash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); },
      shake:()=>{ el.classList.remove('shk'); void el.offsetWidth; el.classList.add('shk'); },
      slam:(t,c)=>{ const d=document.createElement('div'); d.className='lt-slam'; d.textContent=t; if(c) d.style.setProperty('--gc',c); el.appendChild(d); setTimeout(()=>d.remove(),950); },
      center:sel=>{ const r=q(sel).getBoundingClientRect(); return [r.left+r.width/2,r.top+r.height/2]; },
      onTap:null, onSkip:null,
      kill:()=>{ if(dead) return; dead=true; timers.forEach(clearTimeout); fx.stop(); window.removeEventListener('resize',fit); document.removeEventListener('keydown',key,true); el.remove(); if(cur===S) cur=null; },
      close:()=>{ if(dead) return; el.classList.add('out'); setTimeout(()=>S.kill(),280); try{ window.renderShop&&window.renderShop(); }catch(e){} } };
    let lastTap=0;
    el.addEventListener('pointerup',e=>{ if(e.target.closest('button,.lt-sum,.zp-pull')) return; const n=Date.now(); if(n-lastTap<170) return; lastTap=n; S.onTap&&S.onTap(e); });
    q('#ltSkip').onclick=()=>{ play('click'); S.onSkip&&S.onSkip(); };
    const key=e=>{ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); if(!q('#ltSum').hidden) S.close(); else S.onSkip&&S.onSkip(); } else if(e.key===' '||e.key==='Enter'){ if(q('#ltSum').hidden){ e.preventDefault(); S.onTap&&S.onTap(e); } } };
    document.addEventListener('keydown',key,true);
    fx.dust(26,col);
    cur=S; return S; }

  const CONF=['#ff3b4e','#ffd34d','#4aa3ff','#39d98a','#b06bff','#ffffff'];
  function summary(S,head,chips,tiles,note,acts){
    S.onTap=null; S.onSkip=null; S.tip(''); S.hot(false); S.el.classList.remove('rew'); S.el.classList.add('sum'); S.q('#ltShow').innerHTML=''; S.q('#ltTray').innerHTML=''; S.q('#ltSkip').hidden=true;
    const b=S.q('#ltSum'); b.hidden=false;
    b.innerHTML=`<h3>${head}</h3>${chips?`<div class="lt-chips">${chips}</div>`:''}<div class="lt-grid">${tiles}</div>${note?`<p class="lt-note">${note}</p>`:''}<div class="lt-acts">${acts.map((a,i)=>`<button type="button" data-a="${i}" class="${a.p?'p':''}">${a.t}</button>`).join('')}</div>`;
    b.querySelectorAll('[data-a]').forEach(x=>x.onclick=()=>{ play('click'); acts[+x.dataset.a].f(); });
    play('win'); S.fx.confetti(90,CONF); }

  /* ================= 3B KASA ================= */
  const pkDef=id=>(window.__MT_PACKS||[]).find(p=>p.id===id);
  function rewLevel(it){ if(it.icon==='🪙') return it.v>=5000?1:0; if(it.t==='card') return RO[it.h.r]; if(it.t==='pack') return ({std:0,sup:1,nad:1,x10:1,epi:2,leg:3,avn:3,cos:3})[it.id]||0; if(it.t==='frame') return 2; if(it.t==='nc') return 1; return 0; }
  const LVN=['','NADİR','EPİK','EFSANE'], LVC=['#cfd6e4','#4aa3ff','#b06bff','#ff3b4e'];
  function rewArt(it,small){ const u=AUTH.user||{display:'Oyuncu'};
    if(it.icon==='🪙') return small?'🪙':`<div class="lt-coins${it.v>=3000?' big':''}"><i>MC</i><i>MC</i><i>MC</i><i>MC</i><i>MC</i></div>`;
    if(it.t==='card') return small?`<img src="${cardFace(it.h)}" alt="">`:`<div class="ltc"><img src="${cardFace(it.h)}" alt="${esc(it.h.ad)}"></div>`;
    if(it.t==='pack'){ const p=pkDef(it.id)||{cls:'pk-std',n:it.label||'Paket'}; return `<div class="pk ${p.cls}"><b>MARVEL<br>TÜRKİYE</b><small>${esc(String(p.n).toUpperCase())}</small></div>`; }
    if(it.t==='frame') return small?'🖼️':`<div class="ltfr">${avatarHTML({display:u.display,avatar:u.avatar,frame:it.id},96)}</div>`;
    if(it.t==='nc') return small?'🎨':`<div class="ltnc nprev nc-${esc(it.id||'')}">${esc(u.display||'Oyuncu')}</div>`;
    return small?'⭐':'<div class="ltxp">⭐</div>'; }
  function chestHTML(tier){ const N=8, r=75, L=2*r*Math.sin(Math.PI/(2*N))+1.2, ap=r*Math.cos(Math.PI/(2*N)); let strips='';
    for(let i=0;i<N;i++){ const phi=180-(i+.5)*180/N, br=(.55+.6*Math.sin((i+.5)*Math.PI/N)*(i<N/2?.75:1)).toFixed(2);
      strips+=`<i class="ch-st" style="height:${L.toFixed(1)}px;top:${(-L/2).toFixed(1)}px;transform:rotateX(${phi}deg) translateZ(${ap.toFixed(1)}px);filter:brightness(${br})"></i>`; }
    return `<div class="ch-wrap" id="chW" data-t="${tier}"><div class="ch-aura"></div><div class="ch-shadow"></div><div class="ch-beam"></div>
      <div class="ch" id="ch3"><i class="ch-bt"></i><i class="ch-b ch-skin"></i><i class="ch-l ch-skin"></i><i class="ch-r ch-skin"></i><i class="ch-in"></i><i class="ch-f ch-skin"></i>${tier>0?'<i class="ch-gem"></i>':''}
        <div class="ch-lid"><div class="ch-ax">${strips}<i class="ch-cap l"></i><i class="ch-cap r"></i></div><i class="ch-un"></i></div><i class="ch-lock"></i></div>
      <span class="lt-left" id="ltLeft"></span></div>`; }

  function box(def,items,opt){ opt=opt||{};
    const S=mount(def.n,items.length+' ödül',def.col), tier=def.tier||0; S.q('#ltScene').innerHTML=chestHTML(tier);
    const w=S.q('#chW'), ch=S.q('#ch3'), left=S.q('#ltLeft'); let taps=0, idx=-1, phase='drop', lock=true, autoT=null;
    const cpos=()=>{ const r=S.q('#ltScene').getBoundingClientRect(); return [r.left,r.top]; };
    const anim=c=>{ w.classList.remove('drop','hit','spit'); void w.offsetWidth; w.classList.add(c); };
    const auto=ms=>{ clearTimeout(autoT); autoT=S.after(ms,()=>tap()); };
    w.classList.add('drop'); sfx('whoosh',.5);
    S.after(600,()=>{ const [x,y]=cpos(); play('thump'); sfx('slam',.7); buzz([30,30,60]); S.shake(); S.fx.ring(x,y+40*1,def.col,300); S.fx.sparks(x,y+50,34,'#d8c9a8',10,2); });
    S.after(900,()=>{ w.classList.remove('drop'); phase='tap'; lock=false; S.tip('KASAYA DOKUN!'); auto(4500); });
    function tap(){ if(lock) return; clearTimeout(autoT);
      if(phase==='tap'){ taps++; const [x,y]=cpos(); anim('hit'); w.style.setProperty('--open',(taps*7)+'deg'); w.style.setProperty('--au',String(.25+taps*.22)); w.style.setProperty('--inb',String(.25+taps*.3));
        sfx('cardhit',.7); sfx('riser',.3+taps*.12); buzz(18+taps*8); S.fx.sparks(x,y-40,16+taps*10,def.col,8+taps*2,3); S.fx.ring(x,y-10,def.col,150+taps*40);
        if(taps>=3){ lock=true; phase='open'; S.tip(''); S.after(380,open); } else { S.tip(taps===1?'BİR DAHA!':'SON BİR KEZ!'); auto(3200); } }
      else if(phase==='rew'){ next(); } }
    function open(){ const [x,y]=cpos(); w.classList.remove('hit'); w.classList.add('rumble'); sfx('riser',.7); buzz([20,30,20,30,20,30]);
      S.after(520,()=>{ w.classList.remove('rumble'); w.classList.add('open'); ch.classList.add('front'); w.style.setProperty('--open','118deg'); w.style.setProperty('--inb','1.25'); w.style.setProperty('--au','.9');
        S.flash(); S.shake(); S.hot(true); sfx('smash',.8); sfx('beam',.6); play('win'); buzz([60,40,60,40,110]);
        S.fx.fountain(x,y-60,70,def.col); S.fx.stars(x,y-80,22,def.col,12); S.fx.ring(x,y-40,'#fff',420); S.fx.confetti(50,CONF);
        left.textContent=items.length; left.classList.add('on');
        S.after(850,()=>{ S.hot(false); S.el.classList.add('rew'); phase='rew'; lock=false; next(); }); }); }
    function next(){ if(lock) return; lock=true; const show=S.q('#ltShow'), old=show.firstElementChild;
      if(old){ old.classList.add('go'); sfx('whoosh',.3); }
      S.after(old?230:0,()=>{ idx++; if(idx>=items.length) return finish();
        const it=items[idx], lv=rewLevel(it), col=lv>0?(it.t==='card'?RC[it.h.r]:LVC[lv]):(it.col||'#ffd34d');
        const fire=()=>{ const [x,y]=cpos(); anim('spit'); left.textContent=items.length-idx-1; left.classList.remove('bump'); void left.offsetWidth; left.classList.add('bump'); if(idx===items.length-1) left.classList.remove('on');
          S.glow(col); S.fx.fountain(x,y-50,24+lv*14,col);
          show.innerHTML=`<div class="lt-rw" style="--rc:${col}">${lv>0?`<span class="lt-rar">${it.t==='card'?RN[it.h.r]:LVN[lv]}</span>`:''}<div class="lt-art">${rewArt(it)}</div><b class="lt-name">${esc(it.label||'')}</b>${it.sub?`<span class="lt-sub">${esc(it.sub)}</span>`:''}</div>`;
          const cx=innerWidth/2, cy=innerHeight*.42;
          S.after(300,()=>{ S.fx.ring(cx,cy,col,200+lv*90); S.fx.sparks(cx,cy,14+lv*16,col,8+lv*3); if(lv>=2){ S.fx.stars(cx,cy,10+lv*8,col,10); S.hot(true); S.flash(); S.shake(); S.slam(lv===3?'EFSANE!':'EPİK!',col); S.fx.confetti(lv===3?110:50,[col,'#fff','#ffd34d']); } else S.hot(false);
            if(lv===3){ sfx('cosmic',.9); buzz([60,40,60,40,120]); } else if(lv===2){ sfx('reveal',.8); buzz([40,60,40]); } else if(it.icon==='🪙'){ sfx('coin',.7); buzz(15); } else { sfx('flip',.6); buzz(15); } });
          S.after(lv>=2?900:420,()=>{ lock=false; S.tip(idx===items.length-1?'DOKUN: BİTİR':'DOKUN: SIRADAKİ'); auto(lv>=2?6000:3800); }); };
        S.tip('');
        if(lv===3){ w.classList.add('rumble'); S.glow(col); w.style.setProperty('--au','1'); sfx('riser',.8); buzz([20,30,20,30,20,30,20,30]); S.after(850,()=>{ w.classList.remove('rumble'); fire(); }); } else fire(); }); }
    function finish(){ clearTimeout(autoT); phase='end';
      const tiles=items.map((it,i)=>{ const lv=rewLevel(it), col=lv>0?(it.t==='card'?RC[it.h.r]:LVC[lv]):(it.col||'#888'); return `<div class="lt-it" style="--rc:${col};animation-delay:${(i*.08).toFixed(2)}s"><div class="ic">${rewArt(it,true)}</div><b>${esc(it.label||'')}</b>${it.sub?`<small>${esc(it.sub)}</small>`:''}</div>`; }).join('');
      const n=opt.left?opt.left():0, acts=[];
      if(n>0&&opt.again) acts.push({t:`Bir tane daha aç ×${n}`,p:1,f:()=>{ S.kill(); opt.again(); }});
      acts.push({t:'Envanter',f:()=>{ S.close(); window.openInventory&&window.openInventory(); }});
      acts.push({t:'Tamam',p:!acts.length,f:()=>S.close()});
      S.glow(def.col); summary(S,'Hepsi senin!','',tiles,'',acts); }
    S.onTap=tap; S.onSkip=()=>{ lock=true; clearTimeout(autoT); finish(); };
  }

  /* ================= FERMUARLI PAKET ================= */
  function pack(pk,items,opt){ opt=opt||{};
    items=[...items].sort((a,b)=>RO[a.h.r]-RO[b.h.r]); const best=items[items.length-1].h.r, bc=RC[best];
    const S=mount(pk.n,items.length+' kart',best==='b'?'#4aa3ff':bc); const back=(document.querySelector('.brandlogo')||{}).src||'';
    S.q('#ltScene').innerHTML=`<div class="zp-wrap drop ${pk.cls||'pk-std'}" id="zpW" style="--gc:${bc}">
      <div class="zp-back"></div><div class="zp-glow"></div><div class="zp-cards" id="zpC"></div>
      <div class="zp-front"><span class="zp-crimp t"></span><span class="zp-crimp b"></span><div class="zp-logo"><b>MARVEL<br>TÜRKİYE</b><small>${esc(String(pk.n).toUpperCase())}</small><i>${items.length} KART</i></div></div>
      <div class="zp-flap"><span class="zp-crimp t"></span></div>
      <div class="zp-zip" id="zpZ"><div class="zp-tape"></div><div class="zp-teeth"></div><div class="zp-gap"></div><div class="zp-pull" id="zpP"></div></div>
      <span class="zp-hand" id="zpH">👆</span><span class="lt-cnt" id="zpN">${items.length}</span></div>`;
    const w=S.q('#zpW'), zip=S.q('#zpZ'), pull=S.q('#zpP'), box=S.q('#zpC'), cnt=S.q('#zpN'), tray=S.q('#ltTray');
    let p=0, phase='zip', drag=false, moved=false, lastTick=0, idx=-1, lock=true, curC=null, autoT=null, raf=0;
    sfx('whoosh',.5);
    S.after(720,()=>{ w.classList.remove('drop'); w.classList.add('idle'); lock=false; S.tip('FERMUARI ÇEK →'); });
    const setP=v=>{ v=Math.max(p,Math.min(1,v)); if(v===p) return; p=v; w.style.setProperty('--p',p.toFixed(3));
      const step=Math.floor(p*16); if(step!==lastTick){ lastTick=step; play('tick'); buzz(6); const r=pull.getBoundingClientRect(); S.fx.sparks(r.left+r.width/2,r.top+18,5,Math.random()<.5?bc:'#fff',5,1); }
      if(p>=1) torn(); };
    const fromX=x=>{ const r=zip.getBoundingClientRect(); return (x-r.left)/r.width; };
    const dn=e=>{ if(phase!=='zip'||lock) return; drag=true; moved=false; w.classList.remove('idle'); const h=S.q('#zpH'); h&&h.remove(); try{ w.setPointerCapture(e.pointerId); }catch(_){} };
    const mv=e=>{ if(!drag||phase!=='zip') return; moved=true; setP(fromX(e.clientX)+.04); };
    const up=()=>{ if(!drag) return; drag=false; if(phase==='zip'&&(!moved||p>.55)) autoZip(); };
    w.addEventListener('pointerdown',dn); w.addEventListener('pointermove',mv); w.addEventListener('pointerup',up); w.addEventListener('pointercancel',up);
    function autoZip(){ if(phase!=='zip') return; const h=S.q('#zpH'); h&&h.remove(); w.classList.remove('idle'); const p0=p, t0=performance.now(), T=650*(1-p0)+120; cancelAnimationFrame(raf);
      (function f(t){ if(phase!=='zip') return; const k=Math.min(1,(t-t0)/T); setP(p0+(1-p0)*k*k*(3-2*k)); if(k<1&&phase==='zip') raf=requestAnimationFrame(f); })(t0); }
    function torn(){ if(phase!=='zip') return; phase='torn'; lock=true; drag=false; S.tip(''); w.classList.remove('idle'); w.classList.add('torn','jolt');
      const r=w.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height*.17;
      S.flash(); S.shake(); sfx('slash',.7); sfx(best==='e'?'cosmic':'reveal',.8); buzz(best==='e'?[60,40,60,40,120]:[30,40,60]);
      S.fx.fountain(x,y,60,bc); S.fx.stars(x,y-30,RO[best]*8+6,bc,11); S.fx.ring(x,y,'#fff',340); if(RO[best]>=2) S.hot(true);
      S.after(700,()=>{ S.hot(false); S.el.classList.add('rew'); S.after(520,()=>{ w.classList.remove('jolt'); phase='cards'; lock=false; next(); }); }); }
    function next(){ if(lock) return; lock=true; clearTimeout(autoT);
      if(curC){ const o=curC, it=items[idx]; o.classList.remove('up','wait'); o.classList.add('away'); const im=document.createElement('img'); im.src=cardFace(it.h); im.alt=''; im.style.setProperty('--rc',RC[it.h.r]); tray.appendChild(im); sfx('deal',.5); setTimeout(()=>o.remove(),320); curC=null; }
      S.after(idx<0?0:240,()=>{ idx++; if(idx>=items.length) return finish();
        const it=items[idx], r=it.h.r, lv=RO[r], col=RC[r]; cnt.textContent=items.length-idx-1; if(idx===items.length-1) cnt.style.opacity='0';
        const c=document.createElement('div'); c.className='zc'; c.style.setProperty('--rc',col);
        c.innerHTML=`<div class="zc-in"><div class="zc-b">${back?`<img src="${back}" alt="">`:''}</div><div class="zc-f"><img src="${cardFace(it.h)}" alt="${esc(it.h.ad)}"></div></div><span class="zc-tag">${RN[r]}</span><span class="zc-new${it.isNew?'':' dup'}">${it.isNew?'YENİ!':'x'+it.n}</span>`;
        box.appendChild(c); curC=c; void c.offsetWidth; c.classList.add('peek'); sfx('whoosh',.35); S.glow(col); S.tip('');
        const wr=w.getBoundingClientRect(), sc=wr.width/236, mouthY=wr.top+wr.height*.1, target=innerHeight*.4, cardH=150*1.4*sc;
        const k=Math.min(2.1,Math.max(1.2,(innerHeight*.5)/(210*sc))); c.style.setProperty('--sc',k.toFixed(2)); c.style.setProperty('--ty',(((target-cardH/2)-mouthY)/sc).toFixed(0)+'px');
        S.after(lv>=2?620:330,()=>{ c.classList.remove('peek'); c.classList.add('up');
          if(lv>=2){ c.classList.add('wait'); S.hot(true); sfx('riser',.7); buzz([20,30,20,30]); S.after(500,()=>{ lock=false; S.tip('DOKUN: ÇEVİR!'); auto(4200); }); }
          else S.after(430,()=>flip()); }); }); }
    function flip(){ const c=curC; if(!c||c.classList.contains('flip')) return; lock=true; clearTimeout(autoT); const it=items[idx], r=it.h.r, lv=RO[r], col=RC[r];
      c.classList.remove('wait'); c.classList.add('flip'); sfx('flip',.7); S.tip('');
      S.after(300,()=>{ const cx=innerWidth/2, cy=innerHeight*.4; S.fx.ring(cx,cy,col,190+lv*80); S.fx.sparks(cx,cy,10+lv*16,col,7+lv*3);
        if(lv>=2){ S.flash(); S.shake(); S.slam(lv===3?'EFSANE!':'EPİK!',col); S.fx.stars(cx,cy,12+lv*8,col,11); S.fx.confetti(lv===3?110:45,[col,'#fff','#ffd34d']); sfx(lv===3?'cosmic':'reveal',.9); buzz(lv===3?[60,40,60,40,120]:[40,60,40]); if(it.isNew) play('win'); }
        else { sfx('cardhit',.6); buzz(12); S.hot(false); } });
      S.after(lv>=2?950:480,()=>{ lock=false; S.tip(idx===items.length-1?'DOKUN: BİTİR':'DOKUN: SIRADAKİ KART'); auto(lv>=2?6000:2600); }); }
    const auto=ms=>{ clearTimeout(autoT); autoT=S.after(ms,()=>tap()); };
    function tap(){ if(lock) return; if(phase==='zip'){ if(!drag) autoZip(); return; } if(phase!=='cards') return; if(curC&&!curC.classList.contains('flip')) flip(); else next(); }
    function finish(){ clearTimeout(autoT); phase='end'; const cn={b:0,g:0,a:0,e:0}; items.forEach(it=>cn[it.h.r]++);
      const show=[...items].reverse();
      const tiles=show.map((it,i)=>`<div class="lt-it" style="--rc:${RC[it.h.r]};animation-delay:${(i*.07).toFixed(2)}s"><em class="${it.isNew?'':'dup'}">${it.isNew?'YENİ!':'x'+it.n}</em><div class="ic"><img src="${cardFace(it.h)}" alt=""></div><b>${esc(it.h.ad)}</b><small>${RN[it.h.r]}</small></div>`).join('');
      const chips=['e','a','g','b'].filter(r=>cn[r]).map(r=>`<span style="background:${RC[r]}">${cn[r]} ${RN[r]}</span>`).join('');
      const acts=[]; if(opt.again) acts.push({t:`Tekrar aç · 🪙 ${(opt.price||0).toLocaleString('tr-TR')}`,f:()=>{ S.kill(); opt.again(); }});
      acts.push({t:'Koleksiyon',f:()=>{ S.close(); window.openCollection&&window.openCollection(); }}); acts.push({t:'Tamam',p:1,f:()=>S.close()});
      S.glow(bc); summary(S,best==='e'?'Efsane çıktı!':best==='a'?'Epik çıktı!':'Kartlar senin!',chips,tiles,opt.refund>0?`Tekrar eden kartlar için +${opt.refund.toLocaleString('tr-TR')} coin iade edildi.`:'',acts); }
    S.onTap=tap; S.onSkip=()=>{ lock=true; phase='end'; cancelAnimationFrame(raf); clearTimeout(autoT); finish(); };
  }
  window.__MT_LOOT={box,pack};
})();

})();

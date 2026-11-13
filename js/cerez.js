
/* ===== COOKIE consent (KVKK) ===== */
(function(){
  const bar=document.getElementById('ckBar'); if(!bar) return;
  const ok=document.getElementById('ckOk'), more=document.getElementById('ckMore'), prefs=document.getElementById('ckPrefs');
  const lgK=document.getElementById('lgKVKK'),lgG=document.getElementById('lgGiz'),lgS=document.getElementById('lgKosul');
  let seen=false; try{ seen=!!localStorage.getItem('mt_ck'); }catch(e){}
  window.openCookies=function(){ bar.hidden=false; document.body.classList.add('ckbar'); bar.classList.add('det'); if(typeof G!=='undefined'&&G) G.fromTo(bar,{y:24,opacity:0},{y:0,opacity:1,duration:.45,ease:'expo.out'}); };
  if(prefs) prefs.onclick=()=>{ if(typeof SFX!=='undefined'&&SFX) SFX.play('click'); window.openCookies(); };
  ok.onclick=()=>{ if(typeof SFX!=='undefined'&&SFX) SFX.play('click'); try{ localStorage.setItem('mt_ck','1'); }catch(e){} bar.hidden=true; bar.classList.remove('det'); document.body.classList.remove('ckbar'); };
  more.onclick=()=>{ const d=bar.classList.toggle('det'); more.setAttribute('aria-expanded',String(d)); more.textContent=d?'Kapat':'Ayrıntılar'; };
  if(!seen) setTimeout(()=>{ bar.hidden=false; document.body.classList.add('ckbar'); if(typeof G!=='undefined'&&G) G.fromTo(bar,{y:24,opacity:0},{y:0,opacity:1,duration:.55,ease:'expo.out'}); },1200);
  /* ---- yasal metinler ---- */
  const LEGAL={
   kvkk:{t:'KVKK Aydınlatma Metni',h:'<h4>1. Veri Sorumlusu</h4><p>Bu site bağımsız bir Marvel hayran topluluğu projesidir ("Marvel Türkiye"). 6698 sayılı KVKK kapsamında veri sorumlusu site işleticisidir.</p><h4>2. İşlenen Veriler</h4><ul><li><b>Hesap:</b> Micup ile girişte ad, e-posta, profil fotoğrafı (Google üzerinden gelir).</li><li><b>Micup:</b> bağladığında Micup kullanıcı adı.</li><li><b>Oyun:</b> skor, seviye/XP, günlük seri, oyun istatistikleri, rozetler.</li><li><b>Tercih:</b> ses ayarları, çerez onayı, misafir adı — cihazında saklanır.</li></ul><h4>3. Amaç ve Aktarım</h4><p>Veriler; üyelik, sıralama tablosu, günlük ödül ve oyun odalarının çalışması için kullanılır. Skor ve profil Firebase (Google) altyapısında, oyun odaları PeerJS (WebRTC) üzerinden, giriş için Google/Micup servisleri kullanılır.</p><h4>4. Hakların</h4><p>KVKK m.11 kapsamındaki başvuru haklarını (verilerine erişme, düzeltme, silme) Micup üzerinden ya da site yöneticisine yazarak kullanabilirsin. Verilerini silmek için tarayıcı depolamasını temizleyebilir veya Micup hesabını kapatabilirsin.</p>'},
   giz:{t:'Gizlilik Politikası',h:'<h4>Ne saklıyoruz</h4><ul><li>Cihazında (localStorage): ilerleme, skorlar, tercihler, çerez onayı.</li><li>Firebase üzerinde: Google girişi yaptıysan ad/avatar/puan/XP; misafirsen yalnızca cihazında.</li><li>Sunucumuz yok: oyun odaları PeerJS ile tarayıcıdan tarayıcıya kurulur, sohbet mesajları kaydedilmez.</li></ul><h4>Üçüncü taraflar</h4><p>Google (giriş), Micup (hesap/topluluk), Firebase (skor veritabanı), PeerJS (oyun bağlantısı), Google Fonts (yazı tipi). Her birinin kendi gizlilik politikası geçerlidir.</p><h4>Reklam ve takip</h4><p>Reklam, analitik veya izleme çerezi <b>kullanılmamaktadır</b>.</p>'},
   kosul:{t:'Kullanım Şartları',h:'<h4>Fan sitesi</h4><p>Marvel Türkiye bağımsız bir hayran projesidir; Marvel, Disney veya ilgili şirketlerle bağlantısı yoktur. Karakter adları sahiplerinin ticarî markalarıdır.</p><h4>Kurallar</h4><ul><li>Hesabını başkasıyla paylaşma, hile/kopya kullanma.</li><li>Başkalarına yönelik taciz, küfür ve uygunsuz içerik yasaktır; ihlalde susturma/atma hakkımız saklıdır.</li><li>Site içeriği ve kuralları önceden haber verilmeksizin değişebilir.</li></ul><h4>Sorumluluk</h4><p>Site "olduğu gibi" sunulur; kesintisiz çalışma garanti edilmez. Verilerinin yedeklenmesinden sen sorumlusun.</p>'}};
  function openLegal(k){ const d=LEGAL[k]; if(!d) return; if(typeof openModal==='function') openModal(d.t); const mb=document.getElementById('mBody'); if(mb){ mb.innerHTML='<div class="legal-doc">'+d.h+'</div>'; if(typeof G!=='undefined'&&G) G.fromTo(mb.children,{y:16,opacity:0},{y:0,opacity:1,duration:.4}); } }
  if(lgK) lgK.onclick=()=>{if(typeof SFX!=='undefined'&&SFX)SFX.play('click');openLegal('kvkk');};
  if(lgG) lgG.onclick=()=>{if(typeof SFX!=='undefined'&&SFX)SFX.play('click');openLegal('giz');};
  if(lgS) lgS.onclick=()=>{if(typeof SFX!=='undefined'&&SFX)SFX.play('click');openLegal('kosul');};
  const ckL=document.getElementById('ckLegal'); if(ckL) ckL.onclick=()=>{if(typeof SFX!=='undefined'&&SFX)SFX.play('click');openLegal('kvkk');};
})();

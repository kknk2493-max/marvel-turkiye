
(function(){var t=document.getElementById('mTitle'),b=document.querySelector('.mbox');if(!t||!b)return;
function set(){var m=(t.textContent||'').match(/(\d{2})\s*·/);b.dataset.g=m?m[1]:'';}
new MutationObserver(set).observe(t,{childList:true,characterData:true,subtree:true});
set();setTimeout(set,300);setTimeout(set,1200);})();

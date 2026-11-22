/* 开机 → 桌面 */
(function boot(){
  const el = document.getElementById('boot');
  if(!el) return;

  // 只在这一天第一次进来时播；同一会话内刷新不再重复
  const K = 'grey-notes-booted';
  const today = new Date().toDateString();
  if(sessionStorage.getItem(K) === today){
    el.classList.add('off');
    return;
  }

  let done = false;
  function enter(){
    if(done) return;
    done = true;
    el.classList.add('off');
    sessionStorage.setItem(K, today);
  }

  el.addEventListener('click', enter);
  el.addEventListener('touchstart', enter, { passive: true });

  // 不点也行，停一会儿自己进去
  setTimeout(enter, 4200);
})();

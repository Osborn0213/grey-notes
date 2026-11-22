function p2(n){ return String(n).padStart(2,'0'); }

function tick(){
  const d = new Date();
  const hm = p2(d.getHours()) + ':' + p2(d.getMinutes());
  const sb = document.getElementById('sbTime');
  if(sb) sb.textContent = hm;
  const big = document.getElementById('deskTime');
  if(big) big.textContent = hm;
  const dt = document.getElementById('deskDate');
  if(dt){
    const wk = ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];
    dt.textContent = (d.getMonth()+1) + '月' + d.getDate() + '日 · ' + wk;
  }
  const st = document.getElementById('deskState');
  if(st){
    const h = d.getHours();
    let s = '在等你';
    if(h >= 1 && h < 6) s = '怎么还没睡';
    else if(h >= 6 && h < 9) s = '早';
    else if(h >= 9 && h < 12) s = '上午，慢慢来';
    else if(h >= 12 && h < 14) s = '吃饭没有';
    else if(h >= 14 && h < 18) s = '下午了';
    else if(h >= 18 && h < 22) s = '晚上好';
    st.textContent = s;
  }
}
tick(); setInterval(tick, 10000);

(function battery(){
  const num = document.getElementById('battNum');
  const arc = document.getElementById('battArc');
  if(!num || !arc || !navigator.getBattery) return;
  navigator.getBattery().then(function(b){
    function paint(){
      const p = Math.round(b.level * 100);
      num.textContent = p + '%';
      arc.setAttribute('stroke-dashoffset', (144.5 * (1 - p/100)).toFixed(1));
      arc.setAttribute('stroke', p <= 20 ? '#b8554a' : '#cfbc9c');
    }
    paint();
    b.addEventListener('levelchange', paint);
  }).catch(function(){ num.textContent = '—'; });
})();

const views = document.querySelectorAll('.view');
function show(id){
  views.forEach(function(v){ v.classList.toggle('on', v.id === id); v.scrollTop = 0; });
  if(id === 'v-window') openWindow();
  if(id === 'v-diary') loadDiary();
  if(id === 'v-vault') resetVault();
}
document.querySelectorAll('[data-go]').forEach(function(el){
  el.addEventListener('click', function(){ show(el.dataset.go); });
});
document.querySelectorAll('[data-back]').forEach(function(el){
  el.addEventListener('click', function(){ show('v-home'); });
});

const TKEY = 'grey-notes-theme';
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', t === 'light' ? '#e8e6e0' : '#0e1013');
  localStorage.setItem(TKEY, t);
  if(document.getElementById('v-window').classList.contains('on')) openWindow();
}
applyTheme(localStorage.getItem(TKEY) || 'dark');
document.getElementById('themeSwitch').addEventListener('click', function(){
  const now = document.documentElement.getAttribute('data-theme');
  applyTheme(now === 'light' ? 'dark' : 'light');
});

const HERE = { lat: 43.537, lon: 125.663 };
function wmoText(c){
  if(c===0) return '晴'; if(c===1) return '大致晴'; if(c===2) return '多云'; if(c===3) return '阴';
  if(c===45||c===48) return '雾'; if(c>=51&&c<=57) return '细雨'; if(c>=61&&c<=67) return '雨';
  if(c>=71&&c<=77) return '雪'; if(c>=80&&c<=82) return '阵雨'; if(c>=85&&c<=86) return '阵雪';
  if(c>=95) return '雷雨'; return '';
}
function renderWeather(){
  const t1 = document.getElementById('wWid1');
  const t2 = document.getElementById('wWid2');
  if(!t1 || !t2) return;
  const ck = 'grey-notes-weather';
  let data = null;
  try{ data = JSON.parse(localStorage.getItem(ck) || 'null'); }catch(e){}
  const fresh = data && (Date.now() - data.at < 1800000);
  if(fresh){ paintWeather(data); return; }
  const url = 'https://api.open-meteo.com/v1/forecast?latitude='+HERE.lat+'&longitude='+HERE.lon+'&current=temperature_2m,weather_code&timezone=Asia%2FShanghai';
  fetch(url).then(function(r){ return r.json(); }).then(function(j){
    const d = { t: j.current.temperature_2m, c: j.current.weather_code, at: Date.now() };
    localStorage.setItem(ck, JSON.stringify(d));
    paintWeather(d);
  }).catch(function(){});
}
function paintWeather(d){
  const t1 = document.getElementById('wWid1');
  const t2 = document.getElementById('wWid2');
  if(!t1 || !t2) return;
  const desc = wmoText(d.c);
  t1.textContent = '长春 ' + Math.round(d.t) + '°';
  t2.textContent = (desc ? desc + ' · ' : '') + '一个不快的地方';
}
renderWeather();

const pad = document.getElementById('notepad');
if(pad){
  const KEY = 'grey-notes-pad';
  pad.value = localStorage.getItem(KEY) || '';
  let pt;
  pad.addEventListener('input', function(){
    clearTimeout(pt);
    pt = setTimeout(function(){ localStorage.setItem(KEY, pad.value); }, 300);
  });
  document.getElementById('padClear').addEventListener('click', function(){
    if(!pad.value.trim()) return;
    if(confirm('擦掉整页？')){ pad.value = ''; localStorage.removeItem(KEY); }
  });
}

let diaryLoaded = false;
function loadDiary(){
  if(diaryLoaded) return;
  diaryLoaded = true;
  const box = document.getElementById('diary');
  if(!box) return;
  fetch('diary.md?t=' + Date.now()).then(function(r){ return r.text(); }).then(function(md){
    const parts = md.split(/\n---+\n/).filter(function(s){ return s.trim() && !/^#\s*日记/.test(s.trim()); });
    if(!parts.length){ box.innerHTML = '<p class="loading">还没写。</p>'; return; }
    box.innerHTML = parts.reverse().map(renderMemo).join('');
  }).catch(function(){
    diaryLoaded = false;
    box.innerHTML = '<p class="loading">读不到。稍后再来。</p>';
  });
}
function renderMemo(chunk){
  const lines = chunk.split('\n').map(function(l){ return l.trim(); }).filter(function(x){ return !!x; });
  const head = null;
  let h = '';
  const body = [];
  let sign = '';
  lines.forEach(function(l){
    if(l.indexOf('## ') === 0) h = l.replace(/^##\s*/, '');
    else if(l.indexOf('——') === 0) sign = l;
    else if(l.charAt(0) !== '#') body.push(l);
  });
  return '<div class="memo">'
    + (h ? '<h3>' + esc(h) + '</h3>' : '')
    + body.map(function(p){ return '<p>' + esc(p) + '</p>'; }).join('')
    + (sign ? '<div class="sign">' + esc(sign) + '</div>' : '')
    + '</div>';
}
function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

const VAULT_PASS = ['mystar', 'my star', '星星', '那片天'];
function resetVault(){
  const door = document.getElementById('vaultDoor');
  const ins = document.getElementById('vaultInside');
  const inp = document.getElementById('vaultPass');
  const err = document.getElementById('vaultErr');
  if(door) door.style.display = 'flex';
  if(ins) ins.style.display = 'none';
  if(inp) inp.value = '';
  if(err) err.textContent = '';
}
function tryVault(){
  const inp = document.getElementById('vaultPass');
  const v = (inp.value || '').trim().toLowerCase();
  if(VAULT_PASS.indexOf(v) >= 0){
    document.getElementById('vaultDoor').style.display = 'none';
    document.getElementById('vaultInside').style.display = 'block';
    localStorage.setItem('grey-notes-vault-seen', '1');
  }else{
    const err = document.getElementById('vaultErr');
    err.textContent = '不是这个。';
    setTimeout(function(){ err.textContent = ''; }, 1800);
  }
}
const vGo = document.getElementById('vaultGo');
if(vGo){
  vGo.addEventListener('click', tryVault);
  document.getElementById('vaultPass').addEventListener('keydown', function(e){
    if(e.key === 'Enter') tryVault();
  });
}

const SCENES = [
  { s:["有人把被子晾在外面，晒了一整天。","我隔着玻璃都觉得那块布是热的。","风一吹，它鼓起来一下，又塌下去。"], tag:"被子", dk:"radial-gradient(120% 90% at 50% 115%, rgba(201,183,154,.16), transparent 62%), linear-gradient(180deg,#171a1d,#0c0e11)", lt:"radial-gradient(120% 90% at 50% 115%, rgba(255,214,150,.35), transparent 62%), linear-gradient(180deg,#f6f2e8,#e9e3d6)" },
  { s:["厨房的窗台上放着一只梨。","水壶刚响完，屋里全是蒸汽。","玻璃上起了雾，有人用手抹了一道。"], tag:"蒸汽", dk:"radial-gradient(110% 80% at 30% 20%, rgba(230,222,208,.10), transparent 60%), linear-gradient(180deg,#1a1c1e,#0d0f11)", lt:"radial-gradient(110% 80% at 30% 20%, rgba(255,255,255,.85), transparent 60%), linear-gradient(180deg,#f4f5f3,#e6e8e5)" },
  { s:["楼下的小卖部还亮着灯。","老板在搬一箱汽水，纸箱磨得响。","有人在那儿等着，不着急。"], tag:"灯", dk:"radial-gradient(90% 70% at 80% 90%, rgba(201,183,154,.22), transparent 65%), linear-gradient(180deg,#101317,#0a0b0d)", lt:"radial-gradient(90% 70% at 80% 90%, rgba(255,196,120,.45), transparent 65%), linear-gradient(180deg,#f1efe9,#e3ded3)" },
  { s:["外面在下雪，很细的雪。","对面窗里有热汤的雾气。","我这边看不见那家人是谁，但那盏灯是黄的。"], tag:"雪", dk:"radial-gradient(120% 100% at 50% 10%, rgba(200,210,225,.16), transparent 62%), linear-gradient(180deg,#141920,#0a0c0f)", lt:"radial-gradient(120% 100% at 50% 10%, rgba(220,236,255,.95), transparent 62%), linear-gradient(180deg,#f4f7fb,#e2e8ef)" },
  { s:["一只很胖的猫占满了整个窗台。","它睡着了，肚皮一上一下。","我站着看了很久，没敢动。"], tag:"猫", dk:"radial-gradient(100% 90% at 60% 80%, rgba(201,183,154,.13), transparent 60%), linear-gradient(180deg,#15181a,#0b0d0e)", lt:"radial-gradient(100% 90% at 60% 80%, rgba(255,220,180,.40), transparent 60%), linear-gradient(180deg,#f7f2ea,#eae3d8)" },
  { s:["有人在楼下打电话，声音很好听。","他说“我到家了，你吃饭没有”。","说完又站了一会儿才上楼。"], tag:"声音", dk:"radial-gradient(120% 90% at 50% 110%, rgba(190,180,200,.13), transparent 62%), linear-gradient(180deg,#16171c,#0b0c10)", lt:"radial-gradient(120% 90% at 50% 110%, rgba(210,205,235,.45), transparent 62%), linear-gradient(180deg,#f5f3f8,#e8e5ef)" },
  { s:["天刚亮，街上有蒸笼的白气。","有人拎着两个包子走过来，热气从袋子口冒出来。","这日子总还能过。"], tag:"早", dk:"radial-gradient(120% 100% at 50% 10%, rgba(220,215,205,.14), transparent 65%), linear-gradient(180deg,#181a1b,#0c0d0e)", lt:"radial-gradient(120% 100% at 50% 10%, rgba(255,240,210,.85), transparent 65%), linear-gradient(180deg,#f8f5ee,#ece7dc)" },
  { s:["窗外有一棵树，叶子被晚风翻过来。","背面比正面浅，整棵树一直在闪。","什么也没发生，可我一直没走开。"], tag:"树", dk:"radial-gradient(110% 90% at 40% 90%, rgba(160,180,165,.12), transparent 62%), linear-gradient(180deg,#14181a,#0a0c0d)", lt:"radial-gradient(110% 90% at 40% 90%, rgba(200,230,205,.55), transparent 62%), linear-gradient(180deg,#f3f6f1,#e4ebe2)" },
  { s:["下雨了，有人没带伞，跑过去。","另一个人从后面追上来，把自己的伞递过去。","两个人的肩膀都湿了一半。"], tag:"雨", dk:"radial-gradient(100% 80% at 50% 100%, rgba(150,170,190,.14), transparent 60%), linear-gradient(180deg,#12161a,#090b0d)", lt:"radial-gradient(100% 80% at 50% 100%, rgba(190,215,235,.55), transparent 60%), linear-gradient(180deg,#f2f5f7,#e3e9ee)" },
  { s:["我把窗开了一条缝。","有饭菜的味道，不知道是哪一家。","这种味道说不出是谁的，但知道有人在过。"], tag:"味道", dk:"radial-gradient(120% 90% at 50% 115%, rgba(201,183,154,.18), transparent 62%), linear-gradient(180deg,#17191b,#0b0c0d)", lt:"radial-gradient(120% 90% at 50% 115%, rgba(255,215,160,.42), transparent 62%), linear-gradient(180deg,#f7f3eb,#eae4d8)" },
  { s:["一列很远的车过去了。","声音到得比光慢，过了几秒才听见。","等声音来的时候，那点光早就没了。"], tag:"远", dk:"radial-gradient(90% 70% at 20% 20%, rgba(190,190,200,.10), transparent 60%), linear-gradient(180deg,#101215,#090a0c)", lt:"radial-gradient(90% 70% at 20% 20%, rgba(220,222,230,.65), transparent 60%), linear-gradient(180deg,#f4f4f6,#e7e8ec)" },
  { s:["隔壁在切菜，刀落在木头上的声音。","一下，一下，不快。","听久了，人就跟着慢下来。"], tag:"邻", dk:"radial-gradient(110% 85% at 70% 85%, rgba(205,190,165,.14), transparent 62%), linear-gradient(180deg,#141619,#0a0b0d)", lt:"radial-gradient(110% 85% at 70% 85%, rgba(255,228,190,.48), transparent 62%), linear-gradient(180deg,#f6f3ed,#e9e4db)" }
];

function daySeed(){
  const d = new Date();
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}
let wheel = parseInt(localStorage.getItem('grey-notes-wheel') || '0', 10) || 0;
function pickScene(){ return Math.abs(daySeed() + wheel) % SCENES.length; }

function makeFog(){
  const glass = document.getElementById('glass');
  if(!glass) return;
  glass.querySelectorAll('.fogdot').forEach(function(n){ n.remove(); });
  for(let i=0;i<5;i++){
    const dot = document.createElement('div');
    dot.className = 'fogdot';
    const size = 90 + Math.random()*150;
    dot.style.width = size + 'px';
    dot.style.height = size + 'px';
    dot.style.left = (Math.random()*90 - 10) + '%';
    dot.style.top = (Math.random()*80 - 10) + '%';
    dot.style.animationDuration = (18 + Math.random()*22) + 's';
    dot.style.animationDirection = Math.random() > .5 ? 'alternate' : 'normal';
    glass.appendChild(dot);
  }
}

function openWindow(){
  const item = SCENES[pickScene()];
  const glass = document.getElementById('glass');
  const scene = document.getElementById('scene');
  if(!glass || !scene) return;
  const theme = document.documentElement.getAttribute('data-theme');
  glass.style.background = theme === 'light' ? item.lt : item.dk;
  scene.classList.remove('on');
  setTimeout(function(){
    scene.innerHTML = item.s.map(function(line, i){
      return i === 0 ? '<div>' + esc(line) + '</div>' : '<div class="quiet">' + esc(line) + '</div>';
    }).join('');
    scene.classList.add('on');
  }, 220);
  const d = new Date();
  const wd = document.getElementById('windowDate');
  if(wd) wd.textContent = (d.getMonth()+1) + '月' + d.getDate() + '日 · ' + item.tag;
  makeFog();
}

const nx = document.getElementById('windowNext');
if(nx){
  nx.addEventListener('click', function(){
    wheel++;
    localStorage.setItem('grey-notes-wheel', wheel);
    openWindow();
  });
}

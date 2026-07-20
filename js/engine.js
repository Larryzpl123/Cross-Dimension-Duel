/* =====================================================================
   1) 统一度量衡  —— 所有角色只能用这些档位，改这里就能全局调平衡
   ===================================================================== */
const M = {
  size:  { 小:19,  中:26,  大:34  },   // 半径(px) —— 场地小了、球大了，更容易撞上
  hp:    { 低:80,  中:150, 高:260 },   // 生命
  dmg:   { 低:9,   中:17,  高:29  },   // 单次伤害
  range: { 小:45,  中:85,  大:135 },   // AoE / 作用半径
  speed: { 慢:95,  中:160, 快:235 },   // 移动速度(px/s)
};
// 一些固定手感参数
const CONTACT_CD = 0.75;   // 接触伤害冷却(s) —— 防止贴脸瞬间清血
const SWORD_CD   = 0.35;   // 单剑对同一目标的伤害冷却
const AOE_CD     = 0.10;   // 爆炸对同一目标冷却(基本一次)
// —— 随机性框架：每次命中都有暴击几率和伤害浮动，可按单位覆盖(未来"赌徒"高暴击就调这里) ——
const CRIT_CHANCE = 0.15;  // 默认暴击率
const CRIT_MULT   = 2.0;   // 暴击倍数
const DMG_VAR     = 0.15;  // 伤害上下浮动 ±15%
const TURN_RADIUS = 34;    // 允许的最大转弯半径(px)：转向率按 速度/此值 动态提高，防止高速单位绕圈撞不到人

/* =====================================================================
   2) 角色表  —— 数据驱动。加角色 = 往这里 push 一条，不用改引擎
   技能类型：
     none         纯撞击（靠 contact 伤害）
     orbitSwords  绕身飞剑 + 定时御剑激射
     projectileAoe 投掷物，命中敌人/墙壁爆炸，范围AoE
   ===================================================================== */
const ROSTER=[];            // 由 characters/*.js 注册
const SKILLS={};             // 技能注册表：type -> {ai,init,state,cd,badges,tick,draw}
const MECH={};               // 机制注册表：name -> {init,onHurt,onAllyTouch,draw}（见 mechanics/*.js）
const MAPS=[];               // 地图注册表
let pendingSpawns=[];        // 机制在碰撞循环中要新增的单位，循环结束后统一并入 fighters（避免边遍历边改数组）
function registerHero(h){ ROSTER.push(h); }
function registerSkill(type,def){ SKILLS[type]=def; }
function registerMap(m){ MAPS.push(m); }
// 机制插件接口：一个复杂机制（如细胞分裂）写成 mechanics/xxx.js，在此注册后，
// 任何角色只要写 mechanic:'xxx' 就能用，完全不必改引擎。钩子见下方 hurt()/碰撞循环。
function registerMechanic(name,def){ MECH[name]=def; }
// 供机制文件调用：登记一个待生成单位（本帧碰撞循环结束后并入战场）
function spawnUnit(u){ pendingSpawns.push(u); }

/* =====================================================================
   3) 胜率存储  —— 只存 {场数, 胜数}，不存每一局，最省空间
   ===================================================================== */
const STORE_KEY = 'ctdz_stats_v1';
let STATS = loadStats();
function loadStats(){
  try{ return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch(e){ return {}; }   // file:// 下 Safari 可能禁用，退化为内存
}
function saveStats(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(STATS)); }catch(e){}
}
function stat(id){ return STATS[id] || {games:0, wins:0}; }
function winRate(id){ const s=stat(id); return s.games? s.wins/s.games : null; }
function recordResult(winnerIds, loserIds){
  const bump = (id, win)=>{ const s = STATS[id] || (STATS[id]={games:0,wins:0});
    s.games++; if(win) s.wins++; };
  // 每个角色每局只记一次（NvN多份视为同一角色）
  [...new Set(winnerIds)].forEach(id=>bump(id,true));
  [...new Set(loserIds)].forEach(id=>bump(id,false));
  saveStats();
}

/* =====================================================================
   4) 选人界面
   ===================================================================== */
let teams = {L:[], R:[]};        // 每方一个英雄id数组，可混搭、可重复
const MAX_TEAM = 8;
const $ = s=>document.querySelector(s);

/* ---------- 中/英 i18n ---------- */
const THEME_KEY='ctdz_theme';
let curTheme=(()=>{ try{ return localStorage.getItem(THEME_KEY)||'dark'; }catch(e){ return 'dark'; } })();
function applyTheme(){
  document.documentElement.setAttribute('data-theme', curTheme);
  const b=$('#theme'); if(b) b.textContent = curTheme==='light' ? '☀️' : '🌙';
}
const LANG_KEY='ctdz_lang';
let LANG=(()=>{ try{return localStorage.getItem(LANG_KEY)||'zh';}catch(e){return 'zh';} })();
function L(zh,en){ return LANG==='en'? en : zh; }
const TIER_EN={小:'S',中:'M',大:'L',低:'Lo',高:'Hi',快:'Fast',慢:'Slow'};
function tierL(v){ return LANG==='en'? (TIER_EN[v]||v) : v; }

function cName(c){ return LANG==='en'&&c.i18n? c.i18n.name : c.name; }
function cSrc(c){  return LANG==='en'&&c.i18n? c.i18n.src  : c.src;  }
function cDesc(c){ return LANG==='en'&&c.i18n? c.i18n.desc : c.desc; }
function applyLang(){
  document.querySelectorAll('[data-zh]').forEach(el=>{
    const s = LANG==='en'? el.getAttribute('data-en') : el.getAttribute('data-zh');
    if(el.tagName==='INPUT') el.placeholder=s;
    else if(el.tagName==='OPTION') el.textContent=s;
    else el.innerHTML=s;
  });
  $('#lang').textContent = LANG==='en'? '中' : 'EN';
  renderTeam('L'); renderTeam('R'); renderList('L'); renderList('R'); refreshStart(); renderMaps();
  if($('#battle').style.display==='flex')
    $('#speedhint').textContent = pvpMode
      ? L('P1 WASD+J · P2 方向键+/ · 空格暂停','P1 WASD+J · P2 arrows+/ · Space pause')
      : controlMode
      ? L('WASD 移动 · J 放技能 · 空格暂停 · 1/2/4/8 倍速','WASD move · J skill · Space pause · 1/2/4/8 speed')
      : L('空格暂停 · 数字键 1/2/4/8 切倍速','Space pause · keys 1/2/4/8 speed');
}

function badgeRow(c){
  const T=tierL;
  const parts = [`${L('体型','Size')} ${T(c.size)}`, `${L('血','HP')} ${T(c.hp)}`, `${L('速','Spd')} ${T(c.speed)}`, `${L('撞','Ram')} ${T(c.contact)}`];
  const s=c.skill, def=SKILLS[s.type];
  if(def&&def.badges) parts.push(...def.badges(s,L,tierL));
  if(c.revive)                  parts.push(L('复活一次','Revive once'));
  if(c.growth)                  parts.push(L('越战越强','Scales up'));
  return parts.map(t=>`<span class="b">${t}</span>`).join('');
}
function wrLine(c){
  const wr = winRate(c.id); const s = stat(c.id);
  if(wr===null) return `<div class="wr">${L('尚无对战数据','No match data yet')}</div>`;
  return `<div class="wr">${L(s.games+'场 · 胜率 '+(wr*100).toFixed(0)+'%', s.games+' games · '+(wr*100).toFixed(0)+'% WR')}</div>`;
}
// 拼音排序：i18n.name 就是罗马音，直接拿来当排序键
function heroSortKey(c){ return ((c.i18n && c.i18n.name) || c.name || '').toLowerCase(); }
// 选人卡左侧的小头像：角色主色 + 专属图腾
function heroAvatar(c, px){
  const cv=document.createElement('canvas');
  cv.width=px; cv.height=px;
  cv.style.width=px+'px'; cv.style.height=px+'px';
  cv.style.flex='0 0 auto'; cv.style.borderRadius='50%';
  const g=cv.getContext('2d'), R=px/2;
  g.beginPath(); g.arc(R,R,R-1.5,0,6.283);
  g.fillStyle=c.color||'#8d99ae'; g.fill();
  g.strokeStyle='rgba(0,0,0,.35)'; g.lineWidth=2; g.stroke();
  if(c.emblem) drawEmblem(g, c.emblem, R, R, R*0.62, 'rgba(15,18,26,.82)');
  return cv;
}
function renderList(side){
  const q = $(side==='L'?'#lsearch':'#rsearch').value.trim().toLowerCase();
  const box = $(side==='L'?'#llist':'#rlist');
  box.innerHTML = '';
  ROSTER.filter(c=> !q || c.name.toLowerCase().includes(q) || c.src.toLowerCase().includes(q)
                 || heroSortKey(c).includes(q))
    .slice().sort((a,b)=> heroSortKey(a).localeCompare(heroSortKey(b)))
    .forEach(c=>{
      const el = document.createElement('div');
      const cnt = teams[side].filter(x=>x===c.id).length;
      el.className = 'card' + (cnt?' sel':'');
      const head=document.createElement('div');
      head.style.cssText='display:flex;align-items:center;gap:8px';
      head.appendChild(heroAvatar(c, 30));
      const txt=document.createElement('div');
      txt.innerHTML=`<span class="nm">${cName(c)}</span><span class="src">${cSrc(c)}</span>${cnt?`<span class="src" style="color:var(--gold)">×${cnt}</span>`:''}`;
      head.appendChild(txt);
      el.appendChild(head);
      const rest=document.createElement('div');
      rest.innerHTML=`<div class="badges">${badgeRow(c)}</div>
        <div class="desc">${cDesc(c)}</div>${wrLine(c)}`;
      el.appendChild(rest);
      el.onclick = ()=>{ if(teams[side].length<MAX_TEAM){ teams[side].push(c.id); renderTeam(side); renderList(side); refreshStart(); } };
      box.appendChild(el);
    });
}
function renderTeam(side){
  const box = $(side==='L'?'#lteam':'#rteam'); box.innerHTML='';
  teams[side].forEach((id,idx)=>{
    const chip=document.createElement('span');
    chip.className='chip';
    const c=ROSTER.find(x=>x.id===id);
    if(c && c.color){ const dot=document.createElement('span');
      dot.style.cssText='display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:middle;background:'+c.color;
      chip.appendChild(dot); }
    chip.appendChild(document.createTextNode(nm(id)+' ✕'));
    chip.title='点击移除';
    chip.onclick=()=>{ teams[side].splice(idx,1); renderTeam(side); renderList(side); refreshStart(); };
    box.appendChild(chip);
  });
}
function refreshStart(){
  const label=s=> teams[s].length? L(teams[s].length+'人', teams[s].length+' unit'+(teams[s].length>1?'s':'')) : L('（点英雄加入，可混搭）','(click heroes to add, mix allowed)');
  $('#lpick').textContent=label('L'); $('#rpick').textContent=label('R');
  $('#start').disabled = !(teams.L.length && teams.R.length);
}
$('#lsearch').oninput = ()=>renderList('L');
$('#rsearch').oninput = ()=>renderList('R');
$('#ctrlmode').onchange = (e)=>{ controlMode=e.target.checked; if(controlMode){ pvpMode=false; $('#pvpmode').checked=false; } };
$('#recmode').onchange = (e)=>{ recMode=e.target.checked; };
$('#tourney').onclick = ()=>{ tourStart(null); };
$('#pvpmode').onchange = (e)=>{ pvpMode=e.target.checked; if(pvpMode){ controlMode=false; $('#ctrlmode').checked=false; } };
$('#clearL').onclick = ()=>{ teams.L=[]; renderTeam('L'); renderList('L'); refreshStart(); };
$('#clearR').onclick = ()=>{ teams.R=[]; renderTeam('R'); renderList('R'); refreshStart(); };
$('#resetstats').onclick = ()=>{ if(confirm(L('清空所有胜率数据？','Clear all win-rate data?'))){ STATS={}; saveStats(); renderList('L'); renderList('R'); } };
$('#start').onclick = startBattle;

// ---- 强度测试台交互 ----
let lastTest=null;   // 存最近一次结果供导出
$('#gear').onclick = ()=>{ $('#testpanel').style.display='flex'; };
$('#closetest').onclick = ()=>{ $('#testpanel').style.display='none'; };
function setRepBtns(dis){ document.querySelectorAll('.rep').forEach(b=>b.disabled=dis); }

function nm(id){ const c=ROSTER.find(x=>x.id===id); return c? cName(c) : id; }
function testRows(res){
  return res.ids.map(id=>{ const v=res.rec[id];
    return {id, name:nm(id), g:v.g, w:v.w, d:v.d, wr:v.g? v.w/v.g : 0}; })
    .sort((a,b)=>b.wr-a.wr);
}
function renderTest(res, secs){
  const rows=testRows(res);
  let h=`<table><tr><th>#</th><th>${L('角色','Hero')}</th><th>${L('胜率','WR')}</th><th>${L('胜/平/负','W/D/L')}</th><th style="width:100px">${L('强度','Power')}</th></tr>`;
  rows.forEach((r,i)=>{ h+=`<tr><td>${i+1}</td><td>${r.name}</td>`+
    `<td>${(r.wr*100).toFixed(0)}%</td><td>${r.w}/${r.d}/${r.g-r.w-r.d}</td>`+
    `<td><div class="bar" style="width:${Math.round(r.wr*100)}%"></div></td></tr>`; });
  h+='</table>';
  $('#testresults').innerHTML=h;
  $('#testprog').textContent=L('完成 · '+res.ts+'v'+res.ts+' · 每对'+res.REP+'遍 · 用时'+secs+'s',
    'Done · '+res.ts+'v'+res.ts+' · '+res.REP+' runs/pair · '+secs+'s');
  $('#testexport').style.display='flex';
}
function testJSON(res){
  const rows=testRows(res);
  // 克制关系矩阵：行角色对列角色的胜率%
  const matrix={};
  res.ids.forEach(a=>{ matrix[nm(a)]={}; res.ids.forEach(b=>{ if(a!==b)
    matrix[nm(a)][nm(b)]=Math.round(res.beat[a][b]/res.REP*100); }); });
  return JSON.stringify({ _note:'超时空对战强度测试', savedAt:new Date().toISOString(),
    对战规模:res.ts+'v'+res.ts, 每对遍数:res.REP,
    强度榜:rows.map(r=>({角色:r.name, 胜率:+(r.wr*100).toFixed(1), 胜:r.w, 平:r.d, 负:r.g-r.w-r.d, 场次:r.g})),
    克制矩阵_行胜列的胜率百分比:matrix }, null, 2);
}
let testTs=1;
function updateTsLabel(){ $('#tsVal').textContent=testTs+'v'+testTs; }
$('#tsMinus').onclick=()=>{ testTs=Math.max(1,testTs-1); updateTsLabel(); };
$('#tsPlus').onclick =()=>{ testTs=Math.min(5,testTs+1); updateTsLabel(); };
function runTest(REP){
  running=false; cancelAnimationFrame(animId);
  setRepBtns(true); $('#testexport').style.display='none'; $('#testresults').innerHTML='';
  const t0=performance.now();
  runStrengthTestAsync(REP, testTs,
    prog=>{ $('#testprog').textContent=L('测试中… ','Testing… ')+Math.round(prog*100)+'%'; },
    res=>{ fighters=[]; projectiles=[]; swords=[]; explosions=[]; meteors=[];
      lastTest=res; buildMatrix(res);   // 测试台数据直接复用为锦标赛的克制矩阵
      renderTest(res, ((performance.now()-t0)/1000).toFixed(1)); setRepBtns(false); });
}
document.querySelectorAll('.rep').forEach(b=> b.onclick=()=>runTest(+b.dataset.n));
$('#copytest').onclick = async ()=>{ if(!lastTest) return;
  try{ await navigator.clipboard.writeText(testJSON(lastTest)); flash($('#copytest'),'已复制✓'); }
  catch(e){ flash($('#copytest'),'复制失败'); } };
$('#exporttest').onclick = ()=>{ if(!lastTest) return;
  const blob=new Blob([testJSON(lastTest)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='强度测试.json'; a.click(); URL.revokeObjectURL(a.href); flash($('#exporttest'),'已下载✓'); };

// ---- 胜率数据导出/导入：让数据能离开浏览器，交给我读 ----
function statsJSON(){
  return JSON.stringify({ _note:'超时空对战胜率数据', savedAt:new Date().toISOString(),
    schema:'{ 角色id: {games:场数, wins:胜数} }', stats:STATS }, null, 2);
}
function flash(btn,msg){ const o=btn.textContent; btn.textContent=msg; setTimeout(()=>btn.textContent=o,1200); }
function refreshRaw(){ const t=$('#rawstats'); if(t.style.display!=='none') t.value=statsJSON(); }
$('#copystats').onclick = async ()=>{
  const s=statsJSON();
  try{ await navigator.clipboard.writeText(s); flash($('#copystats'),'已复制✓'); }
  catch(e){ const t=$('#rawstats'); t.style.display='block'; t.value=s; t.focus(); t.select();
    flash($('#copystats'),'请手动复制↓'); }
};
$('#exportstats').onclick = ()=>{
  const blob=new Blob([statsJSON()],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='胜率数据.json'; a.click(); URL.revokeObjectURL(a.href);
  flash($('#exportstats'),'已下载✓');
};
$('#importbtn').onclick = ()=>$('#importfile').click();
$('#importfile').onchange = e=>{
  const f=e.target.files[0]; if(!f){ return; }
  const r=new FileReader();
  r.onload = ()=>{ try{ const o=JSON.parse(r.result); const s=o.stats||o;
      if(typeof s!=='object'||Array.isArray(s)) throw 0;
      STATS=s; saveStats(); renderList('L'); renderList('R'); refreshRaw(); flash($('#importbtn'),'已导入✓'); }
    catch(err){ flash($('#importbtn'),'格式错误✗'); } };
  r.readAsText(f); e.target.value='';
};
$('#toggleraw').onclick = ()=>{ const t=$('#rawstats'); const show=t.style.display==='none';
  t.style.display=show?'block':'none'; if(show) t.value=statsJSON(); };

/* =====================================================================
   5) 战斗引擎  —— 引擎层已按"队伍数组"设计，NvN 天然支持
   ===================================================================== */
const cv = $('#arena');
let ctx = cv.getContext('2d');        // let 而非 const：截图时要临时指向离屏画布
const screenCtx = ctx;                // 屏幕上那块画布的 context，截图完要还原回来
let W = cv.width, H = cv.height;
/* ---------- 地图 ---------- */
let curMap = null;
function applyMap(m){
  curMap = m; W = m.w; H = m.h; cv.width = m.w; cv.height = m.h;
}
function mName(m){ return LANG==='en' && m.nameEn ? m.nameEn : m.name; }
/* ---------- 场地形状：rect(默认) / circle / diamond ---------- */
function arenaShape(){ return (curMap && curMap.shape) || 'rect'; }
// 点是否在场地外（投射物用）
function outOfArena(x, y){
  const cx=W/2, cy=H/2, s=arenaShape();
  if(s==='circle')  return Math.hypot(x-cx, y-cy) > Math.min(W,H)/2;
  if(s==='diamond') return Math.abs(x-cx)/(W/2) + Math.abs(y-cy)/(H/2) > 1;
  return x<0 || x>W || y<0 || y>H;
}
// 把单位约束在场地内并反弹；返回是否撞到了边界
function confine(f){
  const cx=W/2, cy=H/2, s=arenaShape();
  if(s==='circle'){
    const R=Math.min(W,H)/2-2, d=Math.hypot(f.x-cx,f.y-cy);
    if(d > R-f.r){
      const nx=(f.x-cx)/(d||1), ny=(f.y-cy)/(d||1);
      f.x=cx+nx*(R-f.r); f.y=cy+ny*(R-f.r); reflect(f,nx,ny); return true;
    }
    return false;
  }
  if(s==='diamond'){
    const a=W/2-2, b=H/2-2, dx=f.x-cx, dy=f.y-cy;
    const inset=f.r*(1/a+1/b), v=Math.abs(dx)/a+Math.abs(dy)/b, lim=1-inset;
    if(v > lim){
      const gx=Math.sign(dx)/a, gy=Math.sign(dy)/b, m=Math.hypot(gx,gy)||1;
      const ux=gx/m, uy=gy/m, over=(v-lim)*Math.min(a,b);
      f.x-=ux*over; f.y-=uy*over; reflect(f,ux,uy); return true;
    }
    return false;
  }
  let hit=false;
  if(f.x-f.r<0){ f.x=f.r; f.vx=Math.abs(f.vx); hit=true; }
  if(f.x+f.r>W){ f.x=W-f.r; f.vx=-Math.abs(f.vx); hit=true; }
  if(f.y-f.r<0){ f.y=f.r; f.vy=Math.abs(f.vy); hit=true; }
  if(f.y+f.r>H){ f.y=H-f.r; f.vy=-Math.abs(f.vy); hit=true; }
  return hit;
}
/* ---------- 障碍：圆形 {x,y,r} 或 方形 {x,y,w,h}（中心坐标）---------- */
function obstacleAt(x, y, r){
  if(!curMap || !curMap.obstacles) return null;
  for(const o of curMap.obstacles){
    if(o.r!==undefined){ if(Math.hypot(x-o.x, y-o.y) < o.r + r) return o; }
    else if(Math.abs(x-o.x) < o.w/2+r && Math.abs(y-o.y) < o.h/2+r) return o;
  }
  return null;
}
function resolveObstacles(f){
  const o = obstacleAt(f.x, f.y, f.r);
  if(!o) return;
  if(o.r!==undefined){                       // 圆形：沿径向推出
    const dx=f.x-o.x, dy=f.y-o.y, d=Math.hypot(dx,dy)||1;
    const nx=dx/d, ny=dy/d;
    f.x=o.x+nx*(o.r+f.r+0.5); f.y=o.y+ny*(o.r+f.r+0.5);
    reflect(f, nx, ny);
  } else {                                   // 方形：沿穿透最浅的轴推出
    const px=(o.w/2+f.r)-Math.abs(f.x-o.x), py=(o.h/2+f.r)-Math.abs(f.y-o.y);
    if(px < py){ const s=Math.sign(f.x-o.x)||1; f.x=o.x+s*(o.w/2+f.r+0.5); reflect(f,1,0); }
    else       { const s=Math.sign(f.y-o.y)||1; f.y=o.y+s*(o.h/2+f.r+0.5); reflect(f,0,1); }
  }
}
/* ---------- 主题配色（画布内的颜色随亮/暗主题切换）---------- */
const THEME={
  dark:  { bg:'#090b10', grid:'#1b2230', edge:'#2a3242', obs:'#232a38', obsEdge:'#3b465c', text:'#ffffff', textOut:'rgba(6,8,12,.85)' },
  light: { bg:'#f2f5fa', grid:'#dfe5ee', edge:'#b9c2d0', obs:'#cfd7e4', obsEdge:'#9aa6b8', text:'#0d1017', textOut:'rgba(255,255,255,.9)' },
};
function pal(){ return THEME[curTheme]||THEME.dark; }
let fighters=[], projectiles=[], swords=[], explosions=[], meteors=[], bullets=[], bolts=[];
let running=false, paused=false, lastT=0, animId=null, battleT=0, speedMul=1, headless=false;
let controlMode=false, pvpMode=false, keyState={}, players={1:null,2:null};   // 操控/本地PvP
/* ---------- 录制模式：出片用（隐藏UI、放大名字、飘伤害、开场标题卡）---------- */
let recMode=false, floaters=[], introT=0, introInfo=null, lastWinSide=null;
// recMode 管画布内的表现（大名字/飘伤害/标题卡）；hudHidden 单独管按钮栏是否隐藏。
// 分开是因为锦标赛要开 recMode，但玩家仍然需要看得见倍速按钮。
let hudHidden=false;
// 每场之间的"某某获胜"卡
let outroT=0, outroInfo=null, outroNext=null;
// 双人按键：P1=左队首(WASD+J)，P2=右队首(方向键+ / )
const P_KEYS={ 1:{up:'w',down:'s',left:'a',right:'d',cast:'j'},
               2:{up:'arrowup',down:'arrowdown',left:'arrowleft',right:'arrowright',cast:'/'} };
const MATCH_MAX=60;   // 单局上限(秒)，防止双护盾流等无限僵持

function tier(kind, key){ return M[kind][key]; }

class Fighter{
  constructor(c, team, x, y){
    this.c=c; this.team=team; this.id=c.id;
    this.r = tier('size', c.size);
    // 血量/撞击：默认走档位；也允许 hpRaw/contactRaw 直接给精确值（机制型角色用）
    this.maxHp = (c.hpRaw!==undefined ? c.hpRaw : tier('hp', c.hp)) * (c.hpMul||1);
    this.hp = this.maxHp;
    this.contact = (c.contactRaw!==undefined ? c.contactRaw : tier('dmg', c.contact));
    this.baseContact = this.contact;              // 成长型用
    this.revived = false;                         // 复活是否已用
    this.contactCD = c.contactCD || CONTACT_CD;   // 可按单位自定义撞击冷却
    this.critChance = c.critChance ?? CRIT_CHANCE;
    this.critMult   = c.critMult   ?? CRIT_MULT;
    this.dmgMult = 1;
    this.speed = tier('speed', c.speed) * (c.speedMul||1);   // 可按单位加速（近战提速）
    // 索敌转向速度(rad/s)：追击型更黏，拉扯型灵活
    this.seek = (c.ai==='kite'||['orbitSwords','projectileAoe','entangle','chargeNuke'].includes(c.skill.type)) ? 3.0 : 2.4;
    this.fleeing=false;                            // 韩立二阶段用
    this.strafe = Math.random()<0.5? 1 : -1;       // 绕圈方向，避免抖动
    const a = Math.random()*Math.PI*2;
    this.x=x; this.y=y; this.vx=Math.cos(a)*this.speed; this.vy=Math.sin(a)*this.speed;
    this.cd = {};                        // 接触伤害冷却表 key->剩余时间
    // 被动状态：缠绕(slow/dot)、石化(stun)、护盾(shield)
    this.slowT=0; this.slowMul=1; this.dotT=0; this.dot=0; this.stunT=0; this.entTag=false; this.dodgeT=0;
    this.markT=0; this.markMul=1; this.counterT=0; this.auraBuff=0; this.erode=0;  // 标记/反震/光环/时光侵蚀
    const st = c.skill;
    if(st.type==='shield'){ this.maxShield=st.shieldAmt; this.shield=st.shieldAmt; }
    else { this.maxShield=0; this.shield=0; }
    // 技能状态：t=当前阶段剩余时间；phase 供 orbitSwords 用
    const def=SKILLS[st.type]||{};
    const t0 = def.init? def.init(st) : 0;
    this.sk = Object.assign({ang:Math.random()*6.28, swordCd:{}, phase:'orbit', t:t0,
      swinging:false, swingProg:0, aim:0, tether:null, tetherT:0, beam:null},
      def.state? def.state(st) : {});   // 占卜计时
    this.color = team==='L'? '#4ea1ff' : '#ff5a6a';
    this.player = false; this.pnum = 0; this.castQueued = false;   // 玩家操控 / 玩家编号 / 施法请求
    // 机制插件：角色声明 mechanic:'名字' 即挂上（见 mechanics/*.js 与 registerMechanic）
    this.mechDef = c.mechanic ? (MECH[c.mechanic]||null) : null;
    this.mechP   = c.mechParams || {};
    if(this.mechDef && this.mechDef.init) this.mechDef.init(this, this.mechP);
  }
  alive(){ return this.hp>0; }
  curSpeed(){ return this.slowT>0 ? this.speed*this.slowMul : this.speed; }
  enemies(){ return fighters.filter(f=>f.alive() && f.team!==this.team); }
  nearestEnemy(){
    let best=null,bd=1e9;
    for(const e of this.enemies()){ const d=(e.x-this.x)**2+(e.y-this.y)**2; if(d<bd){bd=d;best=e;} }
    return best;
  }
}

function startBattle(){
  fighters=[]; projectiles=[]; swords=[]; explosions=[]; meteors=[]; bullets=[]; bolts=[]; pendingSpawns=[]; battleT=0;
  const spawn=(ids, side, x)=>{ ids.forEach((id,i)=>{
    const c=ROSTER.find(cc=>cc.id===id), yy=H*(i+1)/(ids.length+1);
    fighters.push(new Fighter(c, side, x, yy)); }); };
  spawn(teams.L,'L', W*0.22);
  spawn(teams.R,'R', W*0.78);
  players={1:null,2:null};
  if(controlMode||pvpMode){ const p=fighters.find(f=>f.team==='L'); if(p){ p.player=true; p.pnum=1; players[1]=p; } }
  if(pvpMode){ const p=fighters.find(f=>f.team==='R'); if(p){ p.player=true; p.pnum=2; players[2]=p; } }
  // 录制模式：清飘字、放开场标题卡、隐藏HUD按钮
  floaters=[]; introT=0; introInfo=null;
  outroT=0; outroInfo=null; outroNext=null;
  if(recMode){
    introT=2.0;
    introInfo={ L:teamLabel('L'), R:teamLabel('R'),
      title:L('谁更强？','WHO WINS?'), sub:curMap? mName(curMap):'' };
  }
  $('#select').style.display='none';
  $('#result').style.display='none';
  $('#battle').style.display='flex';
  $('#hud').style.display = hudHidden? 'none' : 'flex';
  setSpeed(speedMul); $('#pause').textContent=L('暂停','Pause');
  $('#speedhint').textContent = pvpMode
    ? L('P1 WASD+J · P2 方向键+/ · 空格暂停','P1 WASD+J · P2 arrows+/ · Space pause')
    : controlMode
    ? L('WASD 移动 · J 放技能 · 空格暂停 · 1/2/4/8 倍速','WASD move · J skill · Space pause · 1/2/4/8 speed')
    : L('空格暂停 · 数字键 1/2/4/8 切倍速','Space pause · keys 1/2/4/8 speed');
  running=true; paused=false; lastT=performance.now();
  cancelAnimationFrame(animId);
  animId=requestAnimationFrame(loop);
}

// ---- 强度测试台：后台跑一场（不渲染、不记录STATS）----
function runHeadlessMatch(idL, idR, ts){
  ts=ts||1;
  const cL=ROSTER.find(c=>c.id===idL), cR=ROSTER.find(c=>c.id===idR);
  fighters=[];
  for(let i=0;i<ts;i++){ const yy=H*(i+1)/(ts+1);
    fighters.push(new Fighter(cL,'L',W*0.22,yy));
    fighters.push(new Fighter(cR,'R',W*0.78,yy)); }
  projectiles=[]; swords=[]; explosions=[]; meteors=[]; bullets=[]; bolts=[]; pendingSpawns=[]; battleT=0; headless=true;
  const maxSteps=Math.ceil(MATCH_MAX/0.016)+5;
  let winner='draw';
  for(let s=0;s<maxSteps;s++){
    update(0.016);
    const l=teamAlive('L'), r=teamAlive('R');
    if(!l||!r){ winner=(l&&!r)?idL : (r&&!l)?idR : 'draw'; break; }
  }
  if(winner==='draw'){                     // 超时：按剩余血量%(含盾)判
    const frac=team=>{ let x=0,n=0; for(const f of fighters) if(f.team===team&&f.alive()){
      x+=(f.hp+f.shield)/(f.maxHp+f.maxShield); n++; } return n? x/n : 0; };
    const fl=frac('L'), fr=frac('R');
    winner = Math.abs(fl-fr)<0.02 ? 'draw' : (fl>fr? idL : idR);
  }
  headless=false;
  return winner;
}
// 分块异步跑完整个循环赛，避免大遍数时卡死界面；onProgress(0~1)，onDone(结果)
function runStrengthTestAsync(REP, ts, onProgress, onDone){
  ts=ts||1;
  const ids=ROSTER.map(c=>c.id);
  const rec={}; ids.forEach(id=>rec[id]={g:0,w:0,d:0});
  const beat={}; ids.forEach(a=>{ beat[a]={}; ids.forEach(b=>{ if(a!==b) beat[a][b]=0; }); }); // a 击败 b 的次数
  const jobs=[];
  for(let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++) for(let r=0;r<REP;r++) jobs.push([i,j,r]);
  const total=jobs.length; let p=0;
  function chunk(){
    const end=Math.min(p+20, total);
    for(; p<end; p++){
      const [i,j,r]=jobs[p];
      const [a,b]= r%2 ? [ids[j],ids[i]] : [ids[i],ids[j]];   // 轮流先后手
      const w=runHeadlessMatch(a,b,ts);
      rec[ids[i]].g++; rec[ids[j]].g++;
      if(w===ids[i]){ rec[ids[i]].w++; beat[ids[i]][ids[j]]++; }
      else if(w===ids[j]){ rec[ids[j]].w++; beat[ids[j]][ids[i]]++; }
      else { rec[ids[i]].d++; rec[ids[j]].d++; }
    }
    onProgress(p/total);
    if(p<total) setTimeout(chunk,0);
    else onDone({rec, beat, ids, REP, ts});
  }
  chunk();
}

function loop(t){
  if(!running && outroT<=0) return;
  let dt=(t-lastT)/1000; lastT=t; dt=Math.min(dt,0.033);
  // 一局刚打完：战斗已停，但还要继续出帧把"某某获胜"卡画出来
  if(outroT>0){
    // 倍速下这张卡也缩短，但最多按 2 倍缩——8 倍速下再按 8 倍缩就一闪而过看不清了
    outroT -= dt*Math.min(speedMul,2);
    draw();
    if(outroT<=0){ const go=outroNext; outroNext=null; outroInfo=null; if(go) go(); }
    else animId=requestAnimationFrame(loop);
    return;
  }
  // 倍速 = 每帧多跑几个物理子步（不拉大单步，避免穿模）
  if(!paused){ for(let i=0;i<speedMul && running;i++) update(dt); }
  draw();
  animId=requestAnimationFrame(loop);
}

// 伤害掷骰：浮动 + 暴击（atk 可传攻击者以用其自定义暴击）。返回最终伤害
function rollDmg(base, atk){
  if(atk && atk.auraBuff) base *= (1 + atk.auraBuff);   // 江南·玄天光环：友军增伤
  if(atk && atk.erode) base *= Math.pow(0.93, atk.erode); // 春秋蝉·时光侵蚀：每层-7%输出
  let v = base * (1 + (Math.random()*2-1)*DMG_VAR);
  const cc = atk ? atk.critChance : CRIT_CHANCE;
  const cm = atk ? atk.critMult   : CRIT_MULT;
  if(Math.random() < cc) v *= cm;
  return v;
}
// 统一掉血入口：先扣护盾，破盾后才扣血。所有伤害都走这里
function hurt(f, amt){
  if(amt<=0) return;
  // 机制钩子：受伤时机制可自行处理（如细胞分裂——不掉血而是分裂）。返回 true = 已接管，不走常规掉血
  if(f.mechDef && f.mechDef.onHurt && f.mechDef.onHurt(f, amt, f.mechP)) return;
  if(f.markT>0) amt *= f.markMul;                          // 苏铭·魔印：受到伤害放大
  if(recMode && amt>=1) floaters.push({x:f.x, y:f.y-f.r-4, v:amt, t:0.85});  // 飘伤害数字
  if(f.erode) amt *= (1 + 0.06*f.erode);                   // 春秋蝉·时光侵蚀：每层+6%受伤
  if(f.c.capHit) amt = Math.min(amt, f.maxHp*f.c.capHit);  // 李七夜·不死：单次伤害封顶
  if(f.shield>0){
    if(amt<=f.shield){ f.shield-=amt; return; }
    amt-=f.shield; f.shield=0;
  }
  f.hp-=amt;
}
// 蓝银蔓延：把缠绕状态传给队友，时长0.8倍衰减 → 链式但自限
function spreadEnt(src, dst){
  dst.slowT=src.slowT*0.8; dst.slowMul=src.slowMul;
  dst.dotT=dst.slowT; dst.dot=src.dot; dst.entTag=true;
}
// 张衍·反震：把一部分伤害弹回攻击者（反伤本身不再触发反伤，避免无限循环）
function doReflect(f, amt, atk){
  const rf = (f.c.reflect||0) + (f.counterT>0 ? (f.c.counterRatio||1) : 0);
  if(rf>0 && atk && atk!==f && atk.alive && atk.alive()) hurt(atk, amt*rf);
}
function damage(f, amt, cdTable, cdKey, cd, atk){
  if(f.dodgeT>0) return false;              // 占卜闪避：单体攻击落空（AoE 不走这里）
  if(cdKey!==undefined){
    if((cdTable[cdKey]||0)>0) return false;
    cdTable[cdKey]=cd;
  }
  const v=rollDmg(amt, atk); hurt(f, v); doReflect(f, v, atk); return true;
}
// 单体命中：可被闪避（近战/飞剑/子弹用）。AoE 直接调 hurt，不可闪避
function hitSingle(f, base, atk){
  if(f.dodgeT>0) return false;
  const v=rollDmg(base, atk); hurt(f, v); doReflect(f, v, atk); return true;
}

function update(dt){
  if(introT>0){ introT-=dt; return; }        // 开场标题卡期间冻结战斗
  for(const fl of floaters){ fl.t-=dt; fl.y-=26*dt; }
  floaters=floaters.filter(fl=>fl.t>0);
  // --- 冷却计时 ---
  for(const f of fighters){
    for(const k in f.cd){ f.cd[k]=Math.max(0,f.cd[k]-dt); }
    for(const k in f.sk.swordCd){ f.sk.swordCd[k]=Math.max(0,f.sk.swordCd[k]-dt); }
    if(f.slowT>0) f.slowT-=dt;
    if(f.slowT<=0) f.entTag=false;                // 缠绕结束，清蔓延标记
    if(f.stunT>0) f.stunT-=dt;                    // 石化定身
    if(f.dodgeT>0) f.dodgeT-=dt;                  // 占卜闪避窗口
    if(f.markT>0) f.markT-=dt;                    // 魔印增伤
    if(f.counterT>0) f.counterT-=dt;              // 反震窗口
    f.auraBuff=0;                                 // 光环每帧重算（由江南的 tick 填）
    if(f.dotT>0){ f.dotT-=dt; hurt(f, f.dot*dt); }// 缠绕持续伤害
    // 叶凡·越战越强：伤害随时间成长（同时提升撞击）
    if(f.c.growth){ const g=1+Math.min(f.c.growth.max, battleT*f.c.growth.rate);
      f.dmgMult=g; f.contact=f.baseContact*g; }
    // 召唤物寿命
    if(f.summonLife!==undefined){ f.summonLife-=dt; if(f.summonLife<=0) f.hp=0; }
  }
  for(const b of bolts){ b.t-=dt; } bolts=bolts.filter(b=>b.t>0);
  // --- 移动 + 墙壁反弹（恒速手感）+ 轻度索敌 ---
  for(const f of fighters){
    if(!f.alive()) continue;
    if(f.stunT>0) continue;               // 石化：不动
    const e=f.nearestEnemy(), sp=f.curSpeed();
    if(f.player){                         // 玩家操控：按该玩家的方向键定方向，无输入则滑行
      const K=P_KEYS[f.pnum]; let dx=0,dy=0;
      if(keyState[K.up])dy-=1; if(keyState[K.down])dy+=1; if(keyState[K.left])dx-=1; if(keyState[K.right])dx+=1;
      if(dx||dy){ const m=Math.hypot(dx,dy); f.vx=dx/m*sp; f.vy=dy/m*sp; }
      else { const m=Math.hypot(f.vx,f.vy)||1; f.vx=f.vx/m*sp; f.vy=f.vy/m*sp; }
    }
    else if(e){ const [dx,dy]=aiHeading(f,e,dt);   // 按各自AI求期望方向
      // 转向速率必须随速度提高，否则转弯半径(=速度/转向率)大过场地，单位只会绕圈撞不到人
      const turn=Math.max(f.seek, sp/TURN_RADIUS);
      const [nvx,nvy]=steer(f.vx,f.vy,dx,dy,sp,turn,dt); f.vx=nvx; f.vy=nvy; }
    else { const m=Math.hypot(f.vx,f.vy)||1; f.vx=f.vx/m*sp; f.vy=f.vy/m*sp; }
    f.x+=f.vx*dt; f.y+=f.vy*dt;
    const hitEdge=confine(f);                 // 按场地形状约束（矩形/圆形/菱形）
    if(hitEdge && curMap && curMap.edgeDamage)  // 带电边界：碰壁掉血
      damage(f, curMap.edgeDamage, f.cd, 'edge', 0.5, null);
    resolveObstacles(f);                      // 撞障碍物弹开
    if(curMap && curMap.hazards){             // 危险区持续掉血
      for(const hz of curMap.hazards)
        if(Math.hypot(f.x-hz.x, f.y-hz.y) < hz.r + f.r) hurt(f, hz.dps*dt);
    }
  }
  // --- 球球物理碰撞 + 接触伤害 ---
  for(let i=0;i<fighters.length;i++){
    for(let j=i+1;j<fighters.length;j++){
      const a=fighters[i], b=fighters[j];
      if(!a.alive()||!b.alive()) continue;
      let dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy), min=a.r+b.r;
      if(d<min && d>0){
        // 分离
        const nx=dx/d, ny=dy/d, overlap=(min-d)/2;
        a.x-=nx*overlap; a.y-=ny*overlap; b.x+=nx*overlap; b.y+=ny*overlap;
        // 沿法线反射速度，再归一化回各自恒定速度
        reflect(a,nx,ny); reflect(b,-nx,-ny);
        // 敌对 → 双方结算接触伤害（各自带冷却，防止贴脸瞬间清血）
        if(a.team!==b.team){
          damage(b, a.contact, b.cd, 'ct_'+i, a.contactCD, a);
          damage(a, b.contact, a.cd, 'ct_'+j, b.contactCD, b);
        } else {
          // 同队相撞 → 蓝银缠绕蔓延：被缠者传染给未被缠的队友（0.8倍衰减，自限）
          if(a.entTag && a.slowT>0 && b.slowT<=0) spreadEnt(a,b);
          else if(b.entTag && b.slowT>0 && a.slowT<=0) spreadEnt(b,a);
          // 机制钩子：同队/同类相撞（如细胞融合）
          if(a.mechDef && a.mechDef.onAllyTouch && a.mechDef===b.mechDef) a.mechDef.onAllyTouch(a, b, a.mechP);
        }
      }
    }
  }
  // 机制在碰撞循环里登记的新单位，此刻统一并入战场（避免边遍历边改 fighters）
  if(pendingSpawns.length){ for(const u of pendingSpawns) fighters.push(u); pendingSpawns=[]; }
  // --- 技能（石化时无法施放）---
  for(const f of fighters){ if(f.alive() && f.stunT<=0) tickSkill(f, dt); }
  // 少数机制在持有者阵亡后仍需每帧运行（春秋蝉要持续记录全场快照，
  // 否则他一死快照就停更，回溯深度会变成"退回我死的那一刻"而不是规定的 n 秒）
  for(const f of fighters){
    const d=SKILLS[f.c.skill.type];
    if(d && d.tickAlways) d.tickAlways(f, dt, f.c.skill);
  }
  // --- 投掷物（火莲/暗器）---
  updateProjectiles(dt);
  // --- 御剑激射 ---
  updateFlyingSwords(dt);
  // --- 左轮子弹 ---
  updateBullets(dt);
  // --- 爆炸 ---
  updateExplosions(dt);
  // --- 陨石 ---
  updateMeteors(dt);
  // --- 逆天改命：必须在结算之前，否则同帧就被判负了 ---
  for(const f of fighters){
    if(f.hp<=0 && f.c.revive && !f.revived){
      f.revived=true; f.hp=f.maxHp*f.c.revive.hpFrac;
      f.dodgeT=Math.max(f.dodgeT,0.8);            // 复活瞬间短暂闪避
    }
  }
  // --- 胜负判定 ---
  battleT+=dt;
  if(!headless) checkEnd();   // 测试台自行判定，不走正式结算/不记录STATS
}

// 把速度(vx,vy)朝目标方向(tx,ty)偏转，每帧最多转 rate*dt 弧度，保持速度大小
function steer(vx,vy,tx,ty,speed,rate,dt){
  const cur=Math.atan2(vy,vx), des=Math.atan2(ty,tx);
  let d=des-cur; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI;
  const na=cur+Math.max(-rate*dt, Math.min(rate*dt, d));
  return [Math.cos(na)*speed, Math.sin(na)*speed];
}
// 不同原型不同 AI：可在角色表用 ai 覆盖，否则按技能类型默认
function aiHeading(f, e, dt){
  const vx=e.x-f.x, vy=e.y-f.y, d=Math.hypot(vx,vy)||1;
  const ux=vx/d, uy=vy/d, tx=-uy*f.strafe, ty=ux*f.strafe;   // 指向敌人 / 切向绕圈
  let ai = f.c.ai || (SKILLS[f.c.skill.type]||{}).ai || 'chase';
  if(ai==='phase'){                                // 韩立：半血逃+回血，回满55%再战
    if(f.fleeing){ if(f.hp >= f.maxHp*0.55) f.fleeing=false; }
    else if(f.hp < f.maxHp*0.5) f.fleeing=true;
    if(f.fleeing){ f.hp=Math.min(f.maxHp, f.hp + (f.c.fleeHeal||16)*dt); ai='flee'; }
    else ai='chase';
  }
  // 紧迫度：打久了拉扯/逃跑逐渐转为进攻，避免"你追我跑"僵局到超时
  const urg=Math.max(0, Math.min(1, (battleT-8)/14));
  if(ai==='flee'){                                             // 逃：随紧迫度由逃转追
    const sgn=2*urg-1;                                         // urg0→-1远离, urg1→+1逼近
    return [ux*sgn + tx*0.6*(1-urg), uy*sgn + ty*0.6*(1-urg)];
  }
  if(ai==='kite'){                                             // 保持距离拉扯（紧迫时距离收缩）
    // 期望距离不能超过自己的有效射程，否则会站在自己打不到的地方（被长手风筝时尤其致命）
    const reach=f.c.skill && f.c.skill.range ? tier('range', f.c.skill.range) : 0;
    let D=(f.c.kiteDist||175);
    if(reach) D=Math.min(D, reach*0.8);
    D*=(1-urg);
    const s=Math.max(-1,Math.min(1,(d-D)/(D||1)));
    // 切向只在"距离刚好"时最强；离期望距离越远越要直线逼近/逃离，别绕圈
    const off=Math.min(1, Math.abs(d-D)/(D||1));
    const tw=0.7*(1-urg)*(1-off);
    return [ux*s + tx*tw, uy*s + ty*tw];
  }
  return [ux, uy];                                             // chase：直接扑向敌人（切向会导致绕圈"二人转"）
}
function nearestEnemyPoint(x,y,team){
  let best=null,bd=1e9;
  for(const e of fighters){ if(e.alive()&&e.team!==team){ const d=(e.x-x)**2+(e.y-y)**2; if(d<bd){bd=d;best=e;} } }
  return best;
}
function reflect(f,nx,ny){
  const dot=f.vx*nx+f.vy*ny;
  f.vx-=2*dot*nx; f.vy-=2*dot*ny;
  const m=Math.hypot(f.vx,f.vy)||1, sp=f.curSpeed();
  f.vx=f.vx/m*sp; f.vy=f.vy/m*sp;
}

// 玩家操控时主动技能只在"按了技能键(castQueued) 且 冷却就绪"时释放；AI 永远自动释放。
// 关键：不清零冷却计时，所以按住技能键最多每个冷却放一次，杜绝极限连发。
function okCast(f){ return !f.player || f.castQueued; }
// 主动技能的冷却读数：{t:剩余, total:总时长}；无主动技能返回 null
function skillCD(f){ const s=f.c.skill, d=SKILLS[s.type]; return d&&d.cd? d.cd(f,s) : null; }
function tickSkill(f, dt){ const s=f.c.skill, d=SKILLS[s.type]; if(d&&d.tick) d.tick(f,dt,s); }

function updateProjectiles(dt){
  for(const p of projectiles){
    const tg=nearestEnemyPoint(p.x,p.y,p.team);   // 轻微追踪
    if(tg){ const hm=(p.homing!==undefined?p.homing:2.2);
      const [vx,vy]=steer(p.vx,p.vy,tg.x-p.x,tg.y-p.y,p.speed,hm,dt); p.vx=vx; p.vy=vy; }
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt;
    let boom=false;
    // 撞墙/撞障碍爆炸
    if(outOfArena(p.x,p.y)||p.life<=0||obstacleAt(p.x,p.y,p.r)) boom=true;
    // 撞敌人爆炸
    if(!boom){
      for(const e of fighters){
        if(e.alive() && e.team!==p.team && Math.hypot(e.x-p.x,e.y-p.y)<e.r+p.r){ boom=true; break; }
      }
    }
    if(boom){ p.dead=true; explode(p.x,p.y,p.aoeR,p.aoeD,p.team); }
  }
  projectiles=projectiles.filter(p=>!p.dead);
}

function updateFlyingSwords(dt){
  for(const s of swords){
    const tg=nearestEnemyPoint(s.x,s.y,s.team);   // 御剑追踪
    if(tg){ const [vx,vy]=steer(s.vx,s.vy,tg.x-s.x,tg.y-s.y,s.speed,5,dt); s.vx=vx; s.vy=vy; }
    s.x+=s.vx*dt; s.y+=s.vy*dt; s.life-=dt;
    if(outOfArena(s.x,s.y)||s.life<=0){ s.dead=true; continue; }
    for(const e of fighters){
      if(e.alive() && e.team!==s.team && Math.hypot(e.x-s.x,e.y-s.y)<e.r+6){
        if(hitSingle(e, s.dmg)) s.dead=true;   // 命中则消失；被闪避则穿过
        else s.dead=true;                       // 简化：擦身也消失
        break;
      }
    }
  }
  swords=swords.filter(s=>!s.dead);
}

function updateBullets(dt){
  for(const b of bullets){
    const tg=nearestEnemyPoint(b.x,b.y,b.team);      // 轻微追踪
    if(tg){ const [vx,vy]=steer(b.vx,b.vy,tg.x-b.x,tg.y-b.y,b.speed,3,dt); b.vx=vx; b.vy=vy; }
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
    if(outOfArena(b.x,b.y)||b.life<=0||obstacleAt(b.x,b.y,3)){ b.dead=true; continue; }
    for(const e of fighters){
      if(e.alive() && e.team!==b.team && Math.hypot(e.x-b.x,e.y-b.y)<e.r+4){
        hitSingle(e, b.dmg); b.dead=true; break;    // 命中或被闪避都消失
      }
    }
  }
  bullets=bullets.filter(b=>!b.dead);
}
function explode(x,y,range,dmg,team){
  explosions.push({x,y,r:range,t:0,max:0.35});
  for(const e of fighters){
    if(e.alive() && e.team!==team && Math.hypot(e.x-x,e.y-y)<range+e.r){
      hurt(e, rollDmg(dmg));
    }
  }
}
function updateExplosions(dt){
  for(const ex of explosions){ ex.t+=dt; if(ex.t>=ex.max) ex.dead=true; }
  explosions=explosions.filter(e=>!e.dead);
}
function updateMeteors(dt){
  for(const m of meteors){
    if(m.warn>0){                       // 预警下落中
      m.warn-=dt;
      if(m.warn<=0){                    // 砸落：范围内敌人掉血 + 石化
        for(const e of fighters){
          if(e.alive() && e.team!==m.team && Math.hypot(e.x-m.x,e.y-m.y)<m.range+e.r){
            hurt(e, rollDmg(m.dmg)); e.stunT=m.petrify;
          }
        }
        m.flash=0.3;
      }
    } else { m.flash-=dt; if(m.flash<=0) m.dead=true; }
  }
  meteors=meteors.filter(m=>!m.dead);
}

function teamLabel(side){        // 队伍描述："纪宁×2+萧炎"
  const cnt={}; teams[side].forEach(id=>cnt[id]=(cnt[id]||0)+1);
  return Object.entries(cnt).map(([id,n])=> nm(id)+(n>1?'×'+n:'')).join('+') || L('空','empty');
}
// 召唤物不计入存活判定（否则一方靠随从"不死"）
function teamAlive(team){ return fighters.some(f=>f.team===team && f.alive() && !f.isSummon); }
function checkEnd(){
  const lAlive=teamAlive('L');
  const rAlive=teamAlive('R');
  const timeout = battleT>=MATCH_MAX;
  if(lAlive&&rAlive&&!timeout) return;
  // 团灭挽救：某些技能（如春秋蝉）能在判负前逆转时间，把死者拉回来
  if(!timeout){
    for(const side of ['L','R']){
      if(side==='L'? lAlive : rAlive) continue;       // 这一方没被团灭
      for(const f of fighters){
        if(f.team!==side || f.isSummon) continue;     // 含已阵亡者：他自己也能被时间拉回
        const d=SKILLS[f.c.skill.type];
        if(d && d.onWipe && d.onWipe(f, f.c.skill)) return;   // 挽回成功，比赛继续
      }
    }
  }
  running=false; lastWinSide=null;
  const nmL=L('左方 ','Left ')+teamLabel('L'), nmR=L('右方 ','Right ')+teamLabel('R');
  const TO=L('时间到 · ','Time · '), LEAD=L(' 血量领先',' leads on HP');
  let winner, wIds, lIds;
  if(lAlive&&rAlive){                    // 超时：比剩余血量%（含护盾）
    const frac=team=>{ let s=0,n=0; for(const f of fighters) if(f.team===team&&f.alive()){
      s+=(f.hp+f.shield)/(f.maxHp+f.maxShield); n++; } return n? s/n : 0; };
    const fl=frac('L'), fr=frac('R');
    if(Math.abs(fl-fr)<0.02){ winner=TO+L('平局','Draw'); wIds=[]; lIds=[...teams.L,...teams.R]; }
    else if(fl>fr){ winner=TO+nmL+LEAD; wIds=teams.L.slice(); lIds=teams.R.slice(); lastWinSide='L'; }
    else { winner=TO+nmR+LEAD; wIds=teams.R.slice(); lIds=teams.L.slice(); lastWinSide='R'; }
  }
  else if(lAlive){ winner=nmL; wIds=teams.L.slice(); lIds=teams.R.slice(); lastWinSide='L'; }
  else if(rAlive){ winner=nmR; wIds=teams.R.slice(); lIds=teams.L.slice(); lastWinSide='R'; }
  else { winner=L('双方同归于尽','Mutual destruction'); wIds=[]; lIds=[...teams.L,...teams.R]; }
  recordResult(wIds, lIds);
  // 定格半秒看清最后一击；倍速下同样缩短（和结算卡一样最多按 2 倍缩）
  setTimeout(showResult.bind(null,winner), 500/Math.min(speedMul,2));
}

/* =====================================================================
   6) 渲染
   ===================================================================== */
function draw(){
  const P=pal();
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle=P.bg; ctx.fillRect(0,0,W,H);
  // 场地形状：非矩形时把外侧挖空
  const shp=arenaShape(), cx=W/2, cy=H/2;
  ctx.save();
  if(shp==='circle'){ ctx.beginPath(); ctx.arc(cx,cy,Math.min(W,H)/2,0,6.283); ctx.clip(); }
  else if(shp==='diamond'){ ctx.beginPath(); ctx.moveTo(cx,0); ctx.lineTo(W,cy); ctx.lineTo(cx,H); ctx.lineTo(0,cy); ctx.closePath(); ctx.clip(); }
  // 底纹
  ctx.strokeStyle=P.grid; ctx.lineWidth=1;
  for(let gx=0;gx<W;gx+=44){ ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,H);ctx.stroke(); }
  for(let gy=0;gy<H;gy+=44){ ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke(); }
  ctx.restore();
  // 边界线（带电边界画成红色虚线）
  const eDmg = curMap && curMap.edgeDamage;
  ctx.strokeStyle = eDmg ? 'rgba(255,90,70,.9)' : P.edge;
  ctx.lineWidth = eDmg ? 3 : 2;
  if(eDmg) ctx.setLineDash([8,6]);
  if(shp==='circle'){ ctx.beginPath(); ctx.arc(cx,cy,Math.min(W,H)/2-1,0,6.283); ctx.stroke(); }
  else if(shp==='diamond'){ ctx.beginPath(); ctx.moveTo(cx,2); ctx.lineTo(W-2,cy); ctx.lineTo(cx,H-2); ctx.lineTo(2,cy); ctx.closePath(); ctx.stroke(); }
  else ctx.strokeRect(1,1,W-2,H-2);
  ctx.setLineDash([]);
  // 危险区（画在最底层）
  if(curMap && curMap.hazards) for(const hz of curMap.hazards){
    ctx.beginPath(); ctx.arc(hz.x,hz.y,hz.r,0,6.283);
    ctx.fillStyle='rgba(200,60,40,.18)'; ctx.fill();
    ctx.strokeStyle='rgba(255,110,70,.55)'; ctx.setLineDash([6,6]); ctx.lineWidth=2; ctx.stroke(); ctx.setLineDash([]);
  }
  // 障碍物
  if(curMap && curMap.obstacles) for(const o of curMap.obstacles){
    ctx.beginPath();
    if(o.r!==undefined) ctx.arc(o.x,o.y,o.r,0,6.283);
    else ctx.rect(o.x-o.w/2, o.y-o.h/2, o.w, o.h);
    ctx.fillStyle=P.obs; ctx.fill();
    ctx.strokeStyle=P.obsEdge; ctx.lineWidth=2; ctx.stroke();
  }
  // 爆炸
  for(const ex of explosions){
    const p=ex.t/ex.max;
    ctx.beginPath(); ctx.arc(ex.x,ex.y,ex.r*p,0,6.29);
    ctx.fillStyle=`rgba(255,140,60,${0.35*(1-p)})`; ctx.fill();
    ctx.strokeStyle=`rgba(255,200,90,${0.9*(1-p)})`; ctx.lineWidth=3; ctx.stroke();
  }
  // 陨石（预警 → 冲击）
  for(const m of meteors){
    if(m.warn>0){
      const p=1-m.warn/0.9;
      ctx.beginPath(); ctx.arc(m.x,m.y,m.range,0,6.283);
      ctx.setLineDash([7,7]); ctx.strokeStyle='rgba(255,175,80,.55)'; ctx.lineWidth=2; ctx.stroke(); ctx.setLineDash([]);
      const fy=m.y-(1-p)*240;
      ctx.beginPath(); ctx.arc(m.x,fy,17,0,6.283); ctx.fillStyle='#8a5636'; ctx.fill();
      ctx.strokeStyle='#d99a5a'; ctx.lineWidth=2; ctx.stroke();
    } else {
      const p=m.flash/0.3;
      ctx.beginPath(); ctx.arc(m.x,m.y,m.range*(1-0.12*p),0,6.283);
      ctx.fillStyle=`rgba(255,150,70,${0.4*p})`; ctx.fill();
      ctx.strokeStyle=`rgba(255,220,120,${p})`; ctx.lineWidth=4; ctx.stroke();
    }
  }
  // 投掷物（火莲）
  for(const p of projectiles){
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.29);
    ctx.fillStyle='#ff8a3c'; ctx.fill();
    ctx.strokeStyle='#ffd27a'; ctx.lineWidth=2; ctx.stroke();
  }
  // 连锁闪电
  for(const b of bolts){
    const a=b.t/0.22;
    ctx.strokeStyle=`rgba(150,215,255,${a})`; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(b.x1,b.y1); ctx.lineTo(b.x2,b.y2); ctx.stroke();
    ctx.strokeStyle=`rgba(255,255,255,${a*0.8})`; ctx.lineWidth=1.2; ctx.stroke();
  }
  // 左轮子弹
  for(const b of bullets){
    ctx.beginPath(); ctx.arc(b.x,b.y,3.5,0,6.29); ctx.fillStyle='#ffd24a'; ctx.fill();
    ctx.strokeStyle='#7a5a10'; ctx.lineWidth=1; ctx.stroke();
  }
  // 御剑
  for(const s of swords){
    const a=Math.atan2(s.vy,s.vx);
    ctx.save(); ctx.translate(s.x,s.y); ctx.rotate(a);
    ctx.strokeStyle='#bfe3ff'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(10,0); ctx.stroke();
    ctx.restore();
  }
  // 蓝银缠绕连线（画在球体下层）
  for(const f of fighters){
    if(f.alive() && f.c.skill.type==='entangle' && f.sk.tetherT>0 && f.sk.tether && f.sk.tether.alive()){
      ctx.strokeStyle='rgba(120,180,255,.75)'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(f.x,f.y); ctx.lineTo(f.sk.tether.x,f.sk.tether.y); ctx.stroke();
    }
  }
  // 角色
  for(const f of fighters){
    if(!f.alive()) continue;
    const st=f.c.skill;
    // 罗峰蓄力环 + 秒杀光束
    if(st.type==='chargeNuke'){
      const prog=Math.max(0,1-f.sk.t/st.chargeTime);
      ctx.beginPath(); ctx.arc(f.x,f.y,f.r+5+prog*12,0,6.283*prog);
      ctx.strokeStyle=`rgba(255,90,120,${0.35+0.6*prog})`; ctx.lineWidth=3; ctx.stroke();
      if(f.sk.beam){ ctx.strokeStyle='rgba(255,80,120,.95)'; ctx.lineWidth=6;
        ctx.beginPath(); ctx.moveTo(f.x,f.y); ctx.lineTo(f.sk.beam.x,f.sk.beam.y); ctx.stroke(); }
    }
    // 技能自定义绘制：角色文件里的 draw(f,ctx,s) 钩子
    { const d=SKILLS[st.type]; if(d && d.draw) d.draw(f, ctx, st); }
    // 机制自定义绘制：mechanics/*.js 里的 draw(f,ctx,p) 钩子
    if(f.mechDef && f.mechDef.draw) f.mechDef.draw(f, ctx, f.mechP);
    // 通用连线残影：任何设置了 sk.beam 的技能（蓄力秒杀有自己的画法）
    if(f.sk.beam && st.type!=='chargeNuke'){
      const a=Math.max(0,f.sk.beam.t/0.25);
      const col=(SKILLS[st.type]||{}).beamColor || '200,200,255';
      ctx.strokeStyle=`rgba(${col},${a})`; ctx.lineWidth=4;
      ctx.beginPath(); ctx.moveTo(f.x,f.y); ctx.lineTo(f.sk.beam.x,f.sk.beam.y); ctx.stroke();
    }
    // 韩立重剑横扫
    if(st.type==='meleeSwing' && f.sk.swinging){
      const R=f.r+st.reach, a0=f.sk.aim-st.arc/2, cur=a0+st.arc*f.sk.swingProg;
      ctx.strokeStyle='rgba(170,235,150,.25)'; ctx.lineWidth=9;
      ctx.beginPath(); ctx.arc(f.x,f.y,R,a0,cur); ctx.stroke();
      ctx.strokeStyle='rgba(190,245,170,.95)'; ctx.lineWidth=4;
      ctx.beginPath(); ctx.moveTo(f.x,f.y); ctx.lineTo(f.x+Math.cos(cur)*R,f.y+Math.sin(cur)*R); ctx.stroke();
    }
    // 石昊回血光环
    if(st.type==='regen' && f.hp<f.maxHp){
      ctx.beginPath(); ctx.arc(f.x,f.y,f.r+3,0,6.283);
      ctx.strokeStyle='rgba(120,230,150,.5)'; ctx.lineWidth=2; ctx.stroke();
    }
    // 护盾环（按剩余盾量画弧）
    if(st.type==='shield' && f.shield>0){
      ctx.beginPath(); ctx.arc(f.x,f.y,f.r+5,-Math.PI/2,-Math.PI/2+6.283*(f.shield/f.maxShield));
      ctx.strokeStyle='rgba(255,200,90,.9)'; ctx.lineWidth=4; ctx.stroke();
    }
    // 被缠绕标记
    if(f.slowT>0){ ctx.beginPath(); ctx.arc(f.x,f.y,f.r+2,0,6.283);
      ctx.strokeStyle='rgba(120,180,255,.6)'; ctx.setLineDash([4,4]); ctx.lineWidth=2; ctx.stroke(); ctx.setLineDash([]); }
    // 绕身飞剑（视觉，仅蓄力阶段显示）
    if(f.c.skill.type==='orbitSwords' && f.sk.phase==='orbit'){
      const s=f.c.skill;
      for(let k=0;k<s.count;k++){
        const ang=f.sk.ang+k*(Math.PI*2/s.count);
        const sx=f.x+Math.cos(ang)*s.orbitR, sy=f.y+Math.sin(ang)*s.orbitR;
        ctx.save(); ctx.translate(sx,sy); ctx.rotate(ang+Math.PI/2);
        ctx.strokeStyle='#9fd4ff'; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.moveTo(0,-7); ctx.lineTo(0,7); ctx.stroke(); ctx.restore();
      }
    }
    // 球体
    ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,6.29);
    ctx.fillStyle=f.c.color || f.color; ctx.fill();          // 角色专属主色
    ctx.strokeStyle=f.color; ctx.lineWidth=3.5; ctx.stroke(); // 外圈=阵营色（蓝左/红右）
    if(f.c.emblem) drawEmblem(ctx, f.c.emblem, f.x, f.y, f.r*0.62, 'rgba(15,18,26,.82)'); // 图腾
    // 石化：灰岩覆盖
    if(f.stunT>0){ ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,6.283);
      ctx.fillStyle='rgba(140,140,155,.6)'; ctx.fill(); }
    // 占卜闪避：紫色虚影光环
    if(f.dodgeT>0){ ctx.beginPath(); ctx.arc(f.x,f.y,f.r+4,0,6.283);
      ctx.setLineDash([3,5]); ctx.strokeStyle='rgba(190,130,255,.85)'; ctx.lineWidth=2.5; ctx.stroke(); ctx.setLineDash([]); }
    // 玩家操控标记：白色光环 + "你"
    if(f.player){
      ctx.beginPath(); ctx.arc(f.x,f.y,f.r+7,0,6.283);
      ctx.strokeStyle='#fff'; ctx.lineWidth=2.5; ctx.stroke();
      ctx.fillStyle='#fff'; ctx.font='bold 11px sans-serif'; ctx.textAlign='center';
      ctx.fillText(pvpMode? ('P'+f.pnum) : L('你','YOU'), f.x, f.y-f.r-14);
      // 技能冷却环：转满=就绪(绿)，充能中(金)+剩余秒数
      const cd=skillCD(f);
      if(cd){
        const prog = cd.total>0 ? Math.max(0,Math.min(1, 1-cd.t/cd.total)) : 1;
        ctx.beginPath(); ctx.arc(f.x,f.y,f.r+11,-Math.PI/2,-Math.PI/2+6.283*prog);
        ctx.strokeStyle = cd.t<=0 ? 'rgba(120,255,150,.95)' : 'rgba(255,205,90,.85)';
        ctx.lineWidth=3.5; ctx.stroke();
        ctx.fillStyle='rgba(255,255,255,.9)'; ctx.font='bold 10px sans-serif';
        ctx.fillText(cd.t<=0? L('就绪','READY') : cd.t.toFixed(1), f.x, f.y+f.r+18);
      }
    }
    // 名字
    // 名字画在球下方（不挡图腾）；录制模式下加大加描边，视频里看得清
    const fs = recMode? 15 : 12;
    ctx.font='bold '+fs+'px sans-serif'; ctx.textAlign='center';
    ctx.lineWidth=3; ctx.strokeStyle=P.textOut;
    ctx.strokeText(cName(f.c), f.x, f.y+f.r+fs+1);
    ctx.fillStyle=P.text; ctx.fillText(cName(f.c), f.x, f.y+f.r+fs+1);
    // 血条：每 20 血一格（像王者荣耀的分段），固定每格 6px 好数
    const SEG=20, PX=6, bh=6;
    const segs=Math.max(1, Math.ceil(f.maxHp/SEG));
    const bw=Math.min(120, segs*PX), bx=f.x-bw/2, by=f.y-f.r-11;
    ctx.fillStyle='#000a'; ctx.fillRect(bx,by,bw,bh);                 // 底
    ctx.fillStyle= f.team==='L'?'#4ea1ff':'#ff5a6a';                  // 已有血量
    ctx.fillRect(bx,by,bw*Math.max(0,Math.min(1,f.hp/f.maxHp)),bh);
    ctx.strokeStyle='rgba(0,0,0,.9)'; ctx.lineWidth=1;               // 分格刻度
    for(let k=1;k<segs;k++){ const gx=bx+bw*(k*SEG/f.maxHp);
      ctx.beginPath(); ctx.moveTo(gx,by); ctx.lineTo(gx,by+bh); ctx.stroke(); }
    ctx.strokeStyle='rgba(255,255,255,.45)'; ctx.strokeRect(bx,by,bw,bh); // 边框
    // 护盾条（金色，画在血条上方）
    if(f.maxShield>0){
      const sy=by-4;
      ctx.fillStyle='#000a'; ctx.fillRect(bx,sy,bw,3);
      ctx.fillStyle='rgba(255,200,90,.95)';
      ctx.fillRect(bx,sy,bw*Math.max(0,Math.min(1,f.shield/f.maxShield)),3);
    }
  }
  if(recMode) drawRecOverlay();
  if(outroT>0 && outroInfo) drawOutro();
}

/* ---------- 录制模式的叠加层：飘字 + 开场标题卡 ---------- */
/* 每场之间的"某某获胜"卡：画在画布上，所以录屏和 P 键截图都带得上 */
function drawOutro(){
  const o=outroInfo, P=pal();
  const inT=0.18, outT=0.25;                    // 进场/退场各淡一下，避免硬切
  const age=1.15-outroT;
  const a = Math.min(1, age/inT) * Math.min(1, outroT/outT);

  ctx.save();
  ctx.globalAlpha = a*0.62;
  ctx.fillStyle = P.bg; ctx.fillRect(0,0,W,H);

  const cy=H/2;
  const col = o.draw ? '#c9d1e0'
            : ((ROSTER.find(h=>h.id===o.w)||{}).color || (o.side==='L'?'#5b8cff':'#ff5d6c'));

  // 一条横向色带，让胜者的颜色本身成为信息
  ctx.globalAlpha = a*0.9;
  ctx.fillStyle = col;
  ctx.fillRect(0, cy-46, W, 3);
  ctx.fillRect(0, cy+40, W, 3);

  ctx.globalAlpha = a;
  ctx.textAlign='center'; ctx.textBaseline='middle';

  if(o.draw){
    ctx.fillStyle=P.text;
    ctx.font='700 27px "PingFang SC",-apple-system,sans-serif';
    ctx.fillText(L('平局 · 随机晋级','Draw · random advance'), W/2, cy-8);
    ctx.fillStyle=col; ctx.globalAlpha=a*0.8;
    ctx.font='600 17px "PingFang SC",-apple-system,sans-serif';
    ctx.fillText(nm(o.w), W/2, cy+20);
  } else {
    ctx.fillStyle=col;
    ctx.font='800 34px "PingFang SC",-apple-system,sans-serif';
    ctx.fillText(nm(o.w), W/2, cy-12);
    ctx.fillStyle=P.text; ctx.globalAlpha=a*0.85;
    ctx.font='700 18px "PingFang SC",-apple-system,sans-serif';
    ctx.fillText(L('获胜 · 晋级','WINS · advances'), W/2, cy+18);
    // 被淘汰的人压小压暗放在下面，一眼看出谁出局
    ctx.globalAlpha=a*0.42;
    ctx.font='400 13px "PingFang SC",-apple-system,sans-serif';
    ctx.fillText(nm(o.loser)+L(' 淘汰',' eliminated'), W/2, cy+62);
  }
  ctx.restore();
}

function drawRecOverlay(){
  // 飘伤害数字
  for(const fl of floaters){
    const a=Math.min(1, fl.t/0.85);
    ctx.font='bold 15px sans-serif'; ctx.textAlign='center';
    ctx.lineWidth=3; ctx.strokeStyle=`rgba(6,8,12,${a*.9})`;
    ctx.strokeText('-'+Math.round(fl.v), fl.x, fl.y);
    ctx.fillStyle=`rgba(255,225,120,${a})`;
    ctx.fillText('-'+Math.round(fl.v), fl.x, fl.y);
  }
  // 开场标题卡：左方 VS 右方
  if(introT>0 && introInfo){
    const p=Math.min(1, introT/0.4);                    // 最后0.4秒淡出
    ctx.fillStyle=`rgba(6,8,12,${0.82*p})`; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';
    ctx.fillStyle=`rgba(255,255,255,${p})`;
    ctx.font='bold 22px sans-serif';
    ctx.fillText(introInfo.title||'', W/2, H*0.28);
    ctx.font='bold 26px sans-serif';
    ctx.fillStyle=`rgba(120,180,255,${p})`; ctx.fillText(introInfo.L, W/2, H*0.44);
    ctx.fillStyle=`rgba(255,255,255,${p*0.75})`; ctx.font='bold 20px sans-serif';
    ctx.fillText('VS', W/2, H*0.52);
    ctx.fillStyle=`rgba(255,120,130,${p})`; ctx.font='bold 26px sans-serif';
    ctx.fillText(introInfo.R, W/2, H*0.60);
    if(introInfo.sub){ ctx.fillStyle=`rgba(180,190,205,${p})`; ctx.font='13px sans-serif';
      ctx.fillText(introInfo.sub, W/2, H*0.70); }
  }
}

/* =====================================================================
   7) 结算 & 控制
   ===================================================================== */
function showResult(winner){
  if(tour){ tourAdvance(lastWinSide); return; }   // 锦标赛：无缝进下一场
  hideBracket();                                  // 普通对局：别把上一次的对阵树留在结算页
  $('#battle').style.display='none';
  $('#result').style.display='flex';
  $('#winnerText').textContent = '🏆 '+winner+L(' 获胜',' wins');
  const idsShown=[...new Set([...teams.L,...teams.R])];
  $('#statLine').innerHTML = idsShown.map(id=>{
    const wr=winRate(id);
    return L(nm(id)+'：'+stat(id).games+'场 / 胜率 '+(wr!==null?(wr*100).toFixed(0)+'%':'—'),
             nm(id)+': '+stat(id).games+' games / '+(wr!==null?(wr*100).toFixed(0)+'%':'—')+' WR');
  }).join('　·　');
}
$('#pause').onclick=()=>{ paused=!paused; $('#pause').textContent=paused?L('继续','Resume'):L('暂停','Pause'); };
function setSpeed(m){ speedMul=m; $('#speed').textContent=L('倍速 ×','Speed ×')+m; }
$('#speed').onclick=()=>setSpeed(speedMul===1?2:speedMul===2?4:speedMul===4?8:1);
$('#back').onclick=()=>backToSelect();
$('#rematch').onclick=()=>startBattle();
$('#rechoose').onclick=()=>backToSelect();
// 导出对阵树：离屏 2 倍重画，直接得到一张能发的高清图，不用手动截屏
$('#dlbracket').onclick=()=>{
  const off=document.createElement('canvas');
  drawBracket(off, 2);
  const a=document.createElement('a');
  a.download='bracket-'+Date.now()+'.png';
  a.href=off.toDataURL('image/png');
  a.click();
};
function backToSelect(){
  running=false; cancelAnimationFrame(animId); keyState={}; players={1:null,2:null};
  tour=null; introT=0; outroT=0; outroInfo=null; outroNext=null;
  floaters=[]; hideBracket(); hudHidden=false; $('#hud').style.display='flex';
  $('#battle').style.display='none'; $('#result').style.display='none';
  $('#select').style.display='flex';
  renderList('L'); renderList('R'); refreshRaw();   // 刷新胜率显示
}
const MOVE_KEYS=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];
document.addEventListener('keydown',e=>{
  if($('#battle').style.display!=='flex') return;
  const k=e.key.toLowerCase();
  if(MOVE_KEYS.includes(k)){ keyState[k]=true; if(k.startsWith('arrow'))e.preventDefault(); return; }
  if(k==='j'){ if(players[1]) players[1].castQueued=true; return; }        // P1 放技能
  if(k==='/'){ e.preventDefault(); if(players[2]) players[2].castQueued=true; return; } // P2 放技能
  if(e.code==='Space'){ e.preventDefault(); $('#pause').click(); }
  else if(e.key==='1') setSpeed(1);
  else if(e.key==='2') setSpeed(2);
  else if(e.key==='4') setSpeed(4);
  else if(e.key==='8') setSpeed(8);
  else if(k==='r'){ recMode=!recMode; hudHidden=recMode;
                    $('#recmode').checked=recMode; $('#hud').style.display=hudHidden?'none':'flex'; }
  else if(k==='p'){ e.preventDefault(); saveShot(2); }   // P = 存一张 2 倍高清截图
});
/* 截图：把当前这一帧按 scale 倍重新渲染一遍再导出。
   注意不是把小图放大——是真的用 2 倍分辨率重画，所以线条和文字是清晰的。 */
function saveShot(scale){
  scale = scale || 2;
  const w = cv.width, h = cv.height;
  const off = document.createElement('canvas');
  off.width = w*scale; off.height = h*scale;
  try{
    const octx = off.getContext('2d');
    octx.setTransform(scale,0,0,scale,0,0);
    ctx = octx;                           // 暂时把全局 ctx 指向离屏画布
    draw();
  } finally { ctx = screenCtx; }          // 出错也一定还原，否则屏幕会黑掉
  const a = document.createElement('a');
  a.download = 'shot-' + Date.now() + '.png';
  a.href = off.toDataURL('image/png');
  a.click();
}
document.addEventListener('keyup',e=>{ const k=e.key.toLowerCase(); if(MOVE_KEYS.includes(k)) keyState[k]=false; });

/* =====================================================================
   锦标赛：全角色单败淘汰，自动一场接一场跑完 —— 一期视频就是一个赛季
   ===================================================================== */
let tour=null;          // {round, queue, next, matchN, mode}
let matchupWR=null;     // 克制矩阵：matchupWR[a][b] = a 打 b 的胜率(0~1)
let matrixReps=0;       // 该矩阵每对跑了多少局（样本量，决定分辨率）
let strengthRank=null;  // 综合强度排序（强→弱）

// 把测试台结果转成矩阵
function buildMatrix(res){
  matchupWR={}; matrixReps=res.REP;
  res.ids.forEach(a=>{ matchupWR[a]={};
    res.ids.forEach(b=>{ if(a!==b) matchupWR[a][b]=res.beat[a][b]/res.REP; }); });
  strengthRank=testRows(res).map(r=>r.id);
}
// 需要矩阵时：有就用，没有就先后台快跑一轮循环赛
const QUICK_REPS = 8;    // 自动分析的采样数：3遍只有0/33/67/100四档，分不出真正的胶着对局
function ensureMatrix(cb){
  if(matchupWR){ cb(); return; }
  if(lastTest && lastTest.ts===1 && lastTest.REP>=QUICK_REPS){   // 复用齿轮台已跑过的高精度数据
    buildMatrix(lastTest); cb(); return;
  }
  const btn=$('#tourney'), old=btn.textContent;
  runStrengthTestAsync(QUICK_REPS, 1,
    p=>{ btn.textContent=L('分析对局中 ','Analysing ')+Math.round(p*100)+'%'; },
    res=>{ buildMatrix(res); btn.textContent=old; cb(); });
}
// 两两配对：按模式决定谁碰谁
function makePairs(list, mode){
  const pool=list.slice(), pairs=[];
  if(mode==='seed' && strengthRank){
    // 强弱分区：最强 vs 最弱，让顶尖种子尽量晚相遇（决赛才是最强对决）
    pool.sort((a,b)=>strengthRank.indexOf(a)-strengthRank.indexOf(b));
    while(pool.length>=2) pairs.push([pool.shift(), pool.pop()]);
  } else if(mode==='close' && matchupWR){
    // 势均力敌：贪心挑出胜率最接近 50% 的组合，每场都有悬念
    while(pool.length>=2){
      let bi=0,bj=1,best=1e9;
      for(let i=0;i<pool.length;i++) for(let j=i+1;j<pool.length;j++){
        const wr=(matchupWR[pool[i]]||{})[pool[j]];
        const d=(wr===undefined)?0.5:Math.abs(wr-0.5);
        if(d<best){ best=d; bi=i; bj=j; }
      }
      const a=pool[bi], b=pool[bj];
      pool.splice(bj,1); pool.splice(bi,1); pairs.push([a,b]);
    }
  } else {
    for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
    while(pool.length>=2) pairs.push([pool.shift(), pool.shift()]);
  }
  return {pairs, bye: pool.length? pool[0] : null};   // 奇数人时剩一个轮空
}
function tourStart(mode){
  const m = mode || ($('#tourmode')? $('#tourmode').value : 'close');
  const run=()=>{
    const ids=ROSTER.map(c=>c.id);
    const r=makePairs(ids, m);
    // log: 每场比赛一条 {round,a,b,w}；byes: 每轮轮空的人。结束后靠这两样重建对阵树
    tour={ round:1, mode:m, pairs:r.pairs, idx:0, next:r.bye?[r.bye]:[], matchN:0,
           log:[], byes:{}, total:ids.length };
    if(r.bye) tour.byes[1]=r.bye;
    recMode=true; $('#recmode').checked=true;
    tourNextMatch();
  };
  if(m==='random') run(); else ensureMatrix(run);
}
function tourNextMatch(){
  if(!tour) return;
  // 本轮打完 → 结算晋级者，开下一轮
  if(tour.idx>=tour.pairs.length){
    if(tour.next.length===1){ tourFinish(tour.next[0]); return; }
    const r=makePairs(tour.next, tour.mode);
    tour.pairs=r.pairs; tour.idx=0; tour.next=r.bye?[r.bye]:[]; tour.round++;
    if(r.bye) tour.byes[tour.round]=r.bye;
    if(!tour.pairs.length){ tourFinish(tour.next[0]); return; }
  }
  const [a,b]=tour.pairs[tour.idx++];
  tour.cur=[a,b]; tour.matchN++;
  // 先把要显示的数据取出来：startBattle 之后 tour 可能已被 tourFinish 置空
  const roundNo=tour.round, matchNo=tour.matchN;
  const rn = (tour.pairs.length-tour.idx)*2 + tour.next.length + 2;   // 场上还剩多少人
  // 有矩阵就把预测胜率打在开场卡上——观众一眼知道这场是不是胶着
  let odds='';
  if(matchupWR && matchupWR[a] && matchupWR[a][b]!==undefined){
    const p=Math.round(matchupWR[a][b]*100);
    odds='　'+p+'% vs '+(100-p)+'%';
  }
  teams.L=[a]; teams.R=[b];
  startBattle();
  introInfo={ L:nm(a), R:nm(b),
    title:L('第'+roundNo+'轮 · 第'+matchNo+'场','Round '+roundNo+' · Match '+matchNo),
    sub:L('还剩 '+rn+' 人','  '+rn+' left')+odds };
  introT=2.0;
}
function tourFinish(champId){
  const champ=champId;
  // 先把赛程存下来再清空 tour，否则对阵树就没数据了
  lastBracket = { log:tour.log.slice(), byes:Object.assign({},tour.byes),
                  champ:champ, total:tour.total, mode:tour.mode };
  tour=null;
  $('#battle').style.display='none'; $('#result').style.display='flex';
  $('#winnerText').textContent='🏆 '+nm(champ)+L(' 夺冠',' is the champion');
  $('#statLine').textContent=L('锦标赛结束','Tournament complete');
  showBracket();
}

/* =====================================================================
   对阵树：锦标赛结束后画一张完整赛程总览
   —— 停在结算页不会自己消失，也可以直接下载 PNG
   ===================================================================== */
let lastBracket=null;

function hideBracket(){
  const box=$('#bracketBox'), btn=$('#dlbracket');
  if(box) box.style.display='none';
  if(btn) btn.style.display='none';
}
function showBracket(){
  const box=$('#bracketBox'), btn=$('#dlbracket');
  if(!box || !lastBracket) return;
  drawBracket($('#bracket'), 1);
  box.style.display='block';
  if(btn){ btn.style.display='inline-block'; }
}

// scale=2 时按两倍分辨率重画（不是把小图放大），用于导出高清 PNG
function drawBracket(canvas, scale){
  const B=lastBracket; if(!B) return;
  scale = scale || 1;

  // 按轮次分组
  const rounds=[];
  B.log.forEach(m=>{ (rounds[m.round-1] = rounds[m.round-1] || []).push(m); });
  const nR = rounds.length;
  if(!nR) return;

  const P = pal();
  // HEAD 要留够：标题(y=30) + 副标题(y=52) + 轮次标题(y=HEAD-16) 三条基线不能撞
  // FOOT 要留够：最长那一列底下可能还有一行"轮空晋级"
  const COL_W=196, GAP_X=26, BOX_H=54, GAP_Y=12, PAD=26, HEAD=92, FOOT=36;
  const maxRows = Math.max.apply(null, rounds.map(r=>r.length));
  const W_ = PAD*2 + nR*COL_W + (nR-1)*GAP_X;
  const H_ = HEAD + maxRows*(BOX_H+GAP_Y) - GAP_Y + FOOT + PAD;

  canvas.width = W_*scale; canvas.height = H_*scale;
  canvas.style.width = W_+'px'; canvas.style.height = H_+'px';
  const c = canvas.getContext('2d');
  c.setTransform(scale,0,0,scale,0,0);

  c.fillStyle = P.bg; c.fillRect(0,0,W_,H_);

  // 标题
  c.fillStyle = P.text; c.textBaseline='middle'; c.textAlign='left';
  c.font = '700 21px "PingFang SC","Hiragino Sans GB",sans-serif';
  c.fillText(L('锦标赛赛程','Tournament Bracket'), PAD, 30);
  c.fillStyle = P.edge;
  c.font = '13px -apple-system,"PingFang SC",sans-serif';
  const modeName = B.mode==='close' ? L('势均力敌配对','Closest-matchup seeding')
                 : B.mode==='seed'  ? L('强弱分区','Seeded') : L('纯随机','Random');
  c.fillText(B.total+L(' 人单败淘汰 · ',' heroes, single elimination · ')+modeName, PAD, 52);

  const colX = i => PAD + i*(COL_W+GAP_X);

  for(let i=0;i<nR;i++){
    const x = colX(i), ms = rounds[i];

    // 轮次表头
    c.fillStyle = P.edge; c.textAlign='left';
    c.font = '600 12px -apple-system,"PingFang SC",sans-serif';
    const isFinal = (i===nR-1);
    c.fillText(isFinal ? L('决赛','Final') : L('第'+(i+1)+'轮','Round '+(i+1)), x+2, HEAD-16);

    for(let j=0;j<ms.length;j++){
      const m = ms[j], y = HEAD + j*(BOX_H+GAP_Y);
      const cA = (ROSTER.find(h=>h.id===m.a)||{}).color || '#888';
      const cB = (ROSTER.find(h=>h.id===m.b)||{}).color || '#888';

      // 外框
      c.fillStyle = P.obs; c.strokeStyle = P.obsEdge; c.lineWidth = 1;
      roundRectPath(c, x, y, COL_W, BOX_H, 7); c.fill(); c.stroke();

      // 两行：胜者亮色 + 左侧色条，败者压暗并划掉
      [[m.a,cA,0],[m.b,cB,1]].forEach(row=>{
        const id=row[0], col=row[1], k=row[2];
        const ry = y + 14 + k*26, win = (id===m.w);

        c.fillStyle = col;
        c.globalAlpha = win ? 1 : 0.35;
        c.fillRect(x+8, ry-7, 4, 14);

        c.fillStyle = P.text;
        c.globalAlpha = win ? 1 : 0.34;
        c.font = (win?'700 ':'400 ')+'13px "PingFang SC",-apple-system,sans-serif';
        c.textAlign='left';
        const label = nm(id);
        c.fillText(label, x+18, ry);

        if(!win){   // 败者划一道删除线
          const w = c.measureText(label).width;
          c.strokeStyle = P.text; c.lineWidth = 1;
          c.beginPath(); c.moveTo(x+18, ry); c.lineTo(x+18+w, ry); c.stroke();
        }
        c.globalAlpha = 1;

        if(win){ c.textAlign='right'; c.fillStyle='#7de08a';
                 c.font='700 11px -apple-system,sans-serif';
                 c.fillText('▶', x+COL_W-10, ry); c.textAlign='left'; }
      });
    }

    // 该轮轮空的人
    const bye = B.byes[i+1];
    if(bye){
      const y = HEAD + ms.length*(BOX_H+GAP_Y);
      c.fillStyle = P.edge; c.font='italic 12px "PingFang SC",sans-serif';
      c.textAlign='left';
      c.fillText(nm(bye)+L('（轮空晋级）',' (bye)'), x+8, y+14);
    }
  }

  // 冠军：放右下角。左下角是最长那一列的"轮空"行，会撞；右下角决赛列下方是空的
  const champTxt = nm(B.champ);
  const champSub = L('夺冠','CHAMPION');
  const GOLD = '#ffd34d';
  c.font = '800 25px "PingFang SC",-apple-system,sans-serif';
  const tw = c.measureText(champTxt).width;
  c.font = '700 12px -apple-system,sans-serif';
  const sw = c.measureText(champSub).width;

  const bw = Math.max(tw + 74, sw + 74, 178), bh = 74;
  const bx = W_ - PAD - bw, by = H_ - PAD - bh;

  c.save();
  c.fillStyle = P.obs; c.strokeStyle = GOLD; c.lineWidth = 2;
  roundRectPath(c, bx, by, bw, bh, 10); c.fill(); c.stroke();

  c.textBaseline='middle'; c.textAlign='left';
  c.font = '26px -apple-system,sans-serif';
  c.fillText('🏆', bx+16, by+bh/2);

  const champCol = (ROSTER.find(h=>h.id===B.champ)||{}).color || GOLD;
  c.fillStyle = champCol;
  c.font = '800 25px "PingFang SC",-apple-system,sans-serif';
  c.fillText(champTxt, bx+56, by+30);

  c.fillStyle = GOLD;
  c.font = '700 12px -apple-system,sans-serif';
  c.fillText(champSub, bx+56, by+53);
  c.restore();
}

function roundRectPath(c,x,y,w,h,r){
  if(c.roundRect){ c.beginPath(); c.roundRect(x,y,w,h,r); return; }
  c.beginPath();
  c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
  c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r);
  c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y);
  c.closePath();
}
// 每场结束后由 showResult 调用，隔一会自动开下一场
function tourAdvance(winnerSide){
  if(!tour) return false;
  const w = winnerSide==='L'? tour.cur[0] : winnerSide==='R'? tour.cur[1]
          : (Math.random()<0.5? tour.cur[0] : tour.cur[1]);   // 平局随机晋级
  tour.next.push(w);
  tour.log.push({ round:tour.round, a:tour.cur[0], b:tour.cur[1], w:w, draw:!winnerSide });
  // 结算卡：让人看清这场谁赢了，再进下一场。时长随倍速缩短（见 loop）
  const loser = (w===tour.cur[0]) ? tour.cur[1] : tour.cur[0];
  outroInfo = { w:w, loser:loser, draw:!winnerSide,
                side:(w===tour.cur[0])?'L':'R',
                left:tour.next.length + (tour.pairs.length-tour.idx)*2 };
  outroT = 1.15;
  outroNext = tourNextMatch;
  // 必须在这里重新起主循环。checkEnd 里 running 已置 false，而 showResult 是被
  // setTimeout 延后调用的 —— 等它执行到这里时，loop 早就因为 running=false 退出了，
  // 没人再排帧，outroT 永远不会递减，锦标赛直接卡死。
  // cancelAnimationFrame 是防御：万一还有残留的帧在排队，避免叠成双倍速。
  lastT = performance.now();
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
  return true;
}

/* ---------- 地图选择 UI ---------- */
function renderMaps(){
  const box=$('#maplist'); if(!box) return;
  box.innerHTML='';
  MAPS.forEach(m=>{
    const b=document.createElement('button');
    b.textContent=mName(m);
    if(curMap && curMap.id===m.id) b.className='primary';
    b.onclick=()=>{ applyMap(m); renderMaps(); };
    box.appendChild(b);
  });
  const d=$('#mapdesc');
  if(d && curMap) d.textContent = LANG==='en' && curMap.descEn ? curMap.descEn : (curMap.desc||'');
}

// 初始化：所有 characters/*.js 与 maps/*.js 加载完毕后由 index.html 调用
function boot(){
  $('#lang').onclick = ()=>{ LANG = LANG==='en'?'zh':'en';
    try{ localStorage.setItem(LANG_KEY, LANG); }catch(e){} applyLang(); };
  applyTheme();
  $('#theme').onclick = ()=>{ curTheme = curTheme==='light'?'dark':'light';
    try{ localStorage.setItem(THEME_KEY, curTheme); }catch(e){} applyTheme(); };
  if(MAPS.length) applyMap(MAPS[0]);
  renderMaps();
  renderTeam('L'); renderTeam('R'); renderList('L'); renderList('R'); refreshStart();
  applyLang();   // 按保存的语言初始化界面
}

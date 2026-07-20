// characters/fangyuan.js —— 古月方源《蛊真人》春秋蝉
// 设计要点：全场时光倒流，但方源的成长按「真实流逝时间」计算，永不被自己的技能回溯。
// 执行一次全场回溯：把所有单位（含已阵亡者）拉回 n 秒前。成功返回 true
function cicadaRewind(f, s){
  if((f.sk.uses||0) >= s.depths.length) return false;      // 五次用尽，永久失效
  const back = s.depths[f.sk.uses];
  let snap=null;
  for(const h of (f.sk.hist||[])){ if(battleT - h.t >= back){ snap=h; } else break; }
  if(!snap) return false;                                   // 历史不够深，放不出来
  for(const r of snap.list){
    if(!fighters.includes(r.u)) continue;                   // 期间新生成的单位不回溯
    r.u.x=r.x; r.u.y=r.y; r.u.shield=r.shield;
    r.u.hp=Math.min(r.u.maxHp, r.hp);                       // 死者也会被拉回来 → 复活
  }
  f.sk.uses++; f.sk.flash=0.5; f.sk.t=s.cd;
  f.sk.hist=[];                                             // 回溯后历史作废，重新积累
  return true;
}
registerSkill('chronoCicada', {
  ai:'kite', beamColor:'170,255,190',
  // 团灭挽救：己方全灭时，即使方源自己已阵亡也能发动（不吃冷却，但消耗次数且需要足够历史）
  onWipe(f, s){ return cicadaRewind(f, s); },
  init:(s)=>s.cd,
  cd:(f,s)=>({t:f.sk.t, total:s.cd}),
  // ---------- 2) 持续记录全场快照（位置/血量/护盾）----------
  // 放在 tickAlways 而不是 tick：他阵亡后也必须继续记录。否则快照停在他咽气那一刻，
  // 之后 onWipe 发动时会一路退回那个时间点（实测退了 8~12 秒，而规格只有 1~5 秒）。
  tickAlways(f, dt, s){
    if(!f.sk.hist) f.sk.hist=[];
    f.sk.hist.push({ t:battleT, list:fighters.map(u=>({u, x:u.x, y:u.y, hp:u.hp, shield:u.shield})) });
    const maxBack = s.depths[0];
    while(f.sk.hist.length && battleT - f.sk.hist[0].t > maxBack + 0.5) f.sk.hist.shift();
  },
  badges:(s,L,T)=>[
    L('每秒+','+')+Math.round(s.growPerSec*100)+'% '+L('全属性','all stats/s'),
    L('春秋蝉','Cicada')+'×'+s.depths.length,
    L('全场回溯','Field rewind')],
  tick(f, dt, s){
    // ---------- 1) 越来越强：按真实对局时间线性成长，不受任何回溯影响 ----------
    if(f.sk.base===undefined){
      f.sk.base = {hp:f.maxHp, contact:f.baseContact, speed:f.speed};
    }
    const g = 1 + s.growPerSec * battleT;              // 每秒 +5% 全属性
    f.dmgMult = g;
    f.contact  = f.sk.base.contact * g;
    f.speed    = f.sk.base.speed   * Math.min(g, 2.2); // 速度设个上限，免得糊屏
    const nm = f.sk.base.hp * g;                        // 生命上限同步成长
    if(nm > f.maxHp){ const add = nm - f.maxHp; f.maxHp = nm; f.hp += add; }

    // ---------- 3) 普攻：春秋蝉之外的日常输出 ----------
    f.sk.atk = (f.sk.atk||0) - dt;
    if(f.sk.beam){ f.sk.beam.t-=dt; if(f.sk.beam.t<=0) f.sk.beam=null; }
    if(f.sk.atk<=0){
      const tg=f.nearestEnemy();
      if(tg && Math.hypot(tg.x-f.x,tg.y-f.y) < tier('range',s.range)+tg.r){
        hitSingle(tg, tier('dmg',s.dmg)*f.dmgMult, f);
        f.sk.beam={x:tg.x,y:tg.y,t:0.2};
      }
      f.sk.atk=s.atkCD;
    }

    // ---------- 4) 春秋蝉：全场回到 n 秒前，深度逐次递减，用尽即失效 ----------
    if(f.sk.flash>0) f.sk.flash-=dt;
    f.sk.t-=dt;
    if(f.sk.uses===undefined) f.sk.uses=0;
    if(f.sk.t<=0 && f.sk.uses < s.depths.length && okCast(f)){
      if(cicadaRewind(f, s) && f.player) f.castQueued=false;
    }
  },
  draw(f, ctx, s){
    // 成长光环：越强圈越亮
    const g=1+s.growPerSec*battleT;
    const a=Math.min(0.75, 0.12*(g-1)+0.12);
    ctx.beginPath(); ctx.arc(f.x,f.y,f.r+6,0,6.283);
    ctx.strokeStyle=`rgba(170,255,190,${a})`; ctx.lineWidth=2.5; ctx.stroke();
    // 春秋蝉发动：全屏时光涟漪
    if(f.sk.flash>0){
      const p=f.sk.flash/0.5;
      for(let k=0;k<3;k++){
        const rr=(1-p)*Math.max(W,H)*(0.45+k*0.22);
        ctx.beginPath(); ctx.arc(f.x,f.y,rr,0,6.283);
        ctx.strokeStyle=`rgba(170,255,190,${p*0.5})`; ctx.lineWidth=2; ctx.stroke();
      }
    }
    // 剩余可用次数
    const left=s.depths.length-(f.sk.uses||0);
    ctx.fillStyle=left>0?'rgba(170,255,190,.95)':'rgba(140,150,160,.7)';
    ctx.font='bold 10px sans-serif'; ctx.textAlign='center';
    ctx.fillText('蝉'+left, f.x, f.y-f.r-24);
  }
});
registerHero({ id:'fangyuan', color:'#7fbf5f', emblem:'cicada', name:'古月方源', src:'蛊真人',
  size:'中', hp:'中', speed:'中', contact:'低', kiteDist:170,
  skill:{type:'chronoCicada', dmg:'中', range:'大', atkCD:1.45,
         cd:5.0, growPerSec:0.05, depths:[5,4,3,2,1]},
  desc:'春秋蝉：每5秒可发动一次，让全场所有人回到 5→4→3→2→1 秒前（位置与血量全部倒流），五次用尽后彻底失效。而他自己每秒+5%全属性，这份成长按真实时间累积——**不会被自己的回溯抹掉**。别人被反复推回原点，只有他一路变强。',
  i18n:{name:'Fang Yuan', src:'Reverend Insanity',
    desc:'Spring Autumn Cicada: every 5s, rewinds EVERY fighter on the field to 5→4→3→2→1 seconds ago (positions and HP alike); after five uses it is spent forever. Meanwhile he gains +5% to all stats every second, accumulated on real elapsed time — his growth is never undone by his own rewind. Everyone else keeps getting reset; only he keeps climbing.'} });

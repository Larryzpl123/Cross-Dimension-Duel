// characters/liyue.js —— 李越《超时空穿越》时空回溯
registerSkill('rewind', {
  ai:'kite', beamColor:'120,255,255',
  init:(s)=>s.cd,
  cd:(f,s)=>({t:f.sk.t, total:s.cd}),
  badges:(s,L,T)=>[L('时空回溯','Time rewind')+' '+s.back+'s', `${L('伤害','Dmg')} ${T(s.dmg)}`],
  tick(f, dt, s){
    // 持续记录快照（位置 + 血量），只保留最近 back 秒
    if(!f.sk.snaps) f.sk.snaps=[];
    f.sk.snaps.push({t:battleT, x:f.x, y:f.y, hp:f.hp});
    while(f.sk.snaps.length && battleT - f.sk.snaps[0].t > s.back) f.sk.snaps.shift();

    if(f.sk.beam){ f.sk.beam.t-=dt; if(f.sk.beam.t<=0) f.sk.beam=null; }
    if(f.sk.flash>0) f.sk.flash-=dt;

    // 普攻：时空乱流（自动，单体）
    f.sk.atk = (f.sk.atk||0) - dt;
    if(f.sk.atk<=0){
      const tg=f.nearestEnemy();
      if(tg && Math.hypot(tg.x-f.x,tg.y-f.y) < tier('range',s.range)+tg.r){
        hitSingle(tg, tier('dmg',s.dmg)*f.dmgMult, f);
        f.sk.beam={x:tg.x,y:tg.y,t:0.2};
      }
      f.sk.atk=s.atkCD;
    }
    // 技能：回溯到 back 秒前的位置与血量（血量只回不降，避免自杀）
    f.sk.t-=dt;
    if(f.sk.t<=0 && okCast(f)){
      const old=f.sk.snaps[0];
      if(old){
        if(f.player) f.castQueued=false;
        f.x=old.x; f.y=old.y;
        if(old.hp>f.hp) f.hp=Math.min(f.maxHp, old.hp);   // 抹掉这几秒受到的伤害
        f.sk.flash=0.35; f.sk.t=s.cd;
      }
    }
  },
  draw(f, ctx, s){
    // 回溯残影：几秒前的自己
    const old=f.sk.snaps && f.sk.snaps[0];
    if(old){
      ctx.beginPath(); ctx.arc(old.x, old.y, f.r, 0, 6.283);
      ctx.strokeStyle='rgba(120,255,255,.28)'; ctx.setLineDash([3,5]); ctx.lineWidth=2;
      ctx.stroke(); ctx.setLineDash([]);
    }
    if(f.sk.flash>0){   // 回溯瞬间的时空涟漪
      const p=f.sk.flash/0.35;
      ctx.beginPath(); ctx.arc(f.x,f.y,f.r+26*(1-p),0,6.283);
      ctx.strokeStyle=`rgba(120,255,255,${p})`; ctx.lineWidth=3; ctx.stroke();
    }
  }
});
registerHero({ id:'liyue', color:'#00e5ff', emblem:'clock', name:'李越', src:'超时空穿越',
  size:'中', hp:'中', speed:'中', contact:'低', kiteDist:150,
  skill:{type:'rewind', dmg:'高', range:'大', atkCD:1.0, cd:7.0, back:4.0},
  desc:'时空回溯：随时记录4秒前的自己，技能一按就把位置和血量倒回去——等于抹掉这4秒挨的所有伤害（含斩杀线以上的重创）。平时靠时空乱流远程消耗。会读秒的人才用得好。',
  i18n:{name:'Li Yue', src:'Cross-Time Traveller',
    desc:'Time rewind: constantly records his state from 4s ago; casting snaps his position and HP back — erasing every point of damage taken in those 4 seconds. Chips away with temporal bolts meanwhile. Rewards players who can read the clock.'} });

// characters/xiaoyan.js
registerSkill('projectileAoe', {
  ai:'kite',
  init:(s)=>s.throwCD,
  cd:(f,s)=>({t:f.sk.t,total:s.throwCD}),
  badges:(s,L,T)=>[`${L('范围','Range')} ${T(s.aoeRange)}`, `AoE ${T(s.aoeDmg)}`],
  tick(f, dt, s){
    f.sk.t-=dt;
    if(f.sk.t<=0){
      const tg=f.nearestEnemy();
      if(tg && okCast(f)){
        if(f.player) f.castQueued=false;
        const a=Math.atan2(tg.y-f.y, tg.x-f.x), sp=tier('speed', s.proj)*1.6;
        projectiles.push({x:f.x,y:f.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
          team:f.team, aoeR:tier('range',s.aoeRange)*(1+(Math.random()*2-1)*0.2),  // 火莲范围浮动±20%
          aoeD:tier('dmg',s.aoeDmg)*f.dmgMult, r:9, life:3, speed:sp, homing:s.homing});
        f.sk.t=s.throwCD;
      } else if(!f.player){ f.sk.t=s.throwCD; }   // AI无目标也重置节奏；玩家保持就绪
    }
  }
});

registerHero({ id:'xiaoyan', color:'#ff6b35', emblem:'flame', name:'萧炎', src:'斗破苍穹',
    size:'中', hp:'中', speed:'快', contact:'低',
    skill:{type:'projectileAoe', throwCD:1.3, homing:1.6, proj:'中', aoeRange:'大', aoeDmg:'高'},
    desc:'佛怒火莲：间隔投掷火莲（轻微追踪），命中敌人或墙壁爆炸，大范围AoE（高伤害）。' ,
    i18n:{name:'Xiao Yan', src:'Battle Through the Heavens',
    desc:"Buddha's Fury Lotus: periodically hurls a homing lotus that explodes on hitting an enemy or wall — large AoE, high damage."} });

// characters/klein.js
registerSkill('revolver', {
  ai:'kite',
  init:(s)=>s.fireCD,
  state:(s)=>({dvT:s.divineCD}),
  cd:(f,s)=>({t:f.sk.dvT,total:s.divineCD}),
  badges:(s,L,T)=>[L('左轮','Revolver'), `${L('子弹','Bullet')} ${T(s.bulletDmg)}`, L('占卜闪避','Divine dodge')],
  tick(f, dt, s){
    // 左轮=普通攻击：始终自动开枪（含玩家操控），单体、可被闪避
    f.sk.t-=dt;
    if(f.sk.t<=0){
      const tg=f.nearestEnemy();
      if(tg){ const a=Math.atan2(tg.y-f.y,tg.x-f.x), sp=s.bulletSpeed||520;
        bullets.push({x:f.x,y:f.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
          team:f.team, dmg:tier('dmg',s.bulletDmg)*f.dmgMult, life:2, speed:sp}); }
      f.sk.t=s.fireCD;
    }
    // 占卜=技能：AI 每 divineCD 自动，玩家按 J 才占卜；成功则短暂闪避（躲单体，AoE除外）
    f.sk.dvT-=dt;
    if(f.sk.dvT<=0 && okCast(f)){
      if(f.player) f.castQueued=false;
      if(Math.random()<s.divineChance) f.dodgeT=s.dodgeDur;
      f.sk.dvT=s.divineCD;
    }
  }
});

registerHero({ id:'klein', color:'#b9a7ff', emblem:'gun', name:'克莱恩', src:'诡秘之主',
    size:'中', hp:'中', speed:'中', contact:'低', kiteDist:190,
    skill:{type:'revolver', fireCD:0.75, bulletDmg:'中', bulletSpeed:520,
      divineCD:4.0, divineChance:0.55, dodgeDur:1.6},
    desc:'占卜家：左轮定时射击（中伤，追踪）。每4秒占卜一次，约55%成功，成功则短暂闪避——躲开一切单体攻击（但躲不了AoE/爆炸/陨石）。' ,
    i18n:{name:'Klein', src:'Lord of the Mysteries',
    desc:'Seer: revolver fires on a timer (homing). Divines every 4s (~55% success) → brief evasion, dodging all single-target attacks (but not AoE / explosions / meteors).'} });

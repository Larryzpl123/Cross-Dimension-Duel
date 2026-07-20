// characters/fangli.js
registerSkill('execute', {
  beamColor:'255,85,85',
  ai:'kite',
  init:(s)=>s.cd,
  cd:(f,s)=>({t:f.sk.t,total:s.cd}),
  badges:(s,L,T)=>[L('斩杀线','Execute')+' '+Math.round(s.threshold*100)+'%', `${L('伤害','Dmg')} ${T(s.dmg)}`],
  tick(f, dt, s){        // 方里：直死魔眼，斩杀线内必杀
    f.sk.t-=dt;
    if(f.sk.beam){ f.sk.beam.t-=dt; if(f.sk.beam.t<=0) f.sk.beam=null; }
    if(f.sk.t<=0){
      const tg=f.nearestEnemy();
      if(tg && Math.hypot(tg.x-f.x,tg.y-f.y) < tier('range',s.range)+tg.r && okCast(f)){
        if(f.player) f.castQueued=false;
        if(tg.hp <= tg.maxHp*s.threshold) hurt(tg, 99999);        // 直死：穿盾必杀
        else hitSingle(tg, tier('dmg',s.dmg)*f.dmgMult, f);
        f.sk.beam={x:tg.x,y:tg.y,t:0.2}; f.sk.t=s.cd;
      } else if(!f.player){ f.sk.t=0.15; }
    }
  }
});

registerHero({ id:'fangli', color:'#ff5a7a', emblem:'eye', name:'方里', src:'直死无限',
    size:'中', hp:'中', speed:'快', contact:'低', kiteDist:95,
    skill:{type:'execute', dmg:'高', range:'大', cd:1.5, threshold:0.35},
    desc:'直死魔眼：锁定最近敌人——血量低于30%直接抹杀（穿盾无视护盾），否则造成中伤。专治残血。' ,
    i18n:{name:'Fang Li', src:'Infinite Death Perception',
    desc:'Eyes of Death Perception: targets the nearest enemy — below 30% HP it is erased outright (pierces shields); otherwise deals moderate damage.'} });

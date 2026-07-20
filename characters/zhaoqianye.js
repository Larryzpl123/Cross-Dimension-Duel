// characters/zhaoqianye.js
registerSkill('drain', {
  beamColor:'225,80,165',
  ai:'chase',
  init:(s)=>s.cd,
  cd:(f,s)=>({t:f.sk.t,total:s.cd}),
  badges:(s,L,T)=>[L('汲取回血','Drain heal'), `${L('伤害','Dmg')} ${T(s.dmg)}`],
  tick(f, dt, s){          // 赵千夜：汲取——伤害并等量回血
    f.sk.t-=dt;
    if(f.sk.beam){ f.sk.beam.t-=dt; if(f.sk.beam.t<=0) f.sk.beam=null; }
    if(f.sk.t<=0){
      const tg=f.nearestEnemy();
      if(tg && Math.hypot(tg.x-f.x,tg.y-f.y) < tier('range',s.range)+tg.r && okCast(f)){
        if(f.player) f.castQueued=false;
        const dmg=tier('dmg',s.dmg)*f.dmgMult;
        if(hitSingle(tg, dmg, f)) f.hp=Math.min(f.maxHp, f.hp + dmg*(s.healRatio||1));
        f.sk.beam={x:tg.x,y:tg.y,t:0.25}; f.sk.t=s.cd;
      } else if(!f.player){ f.sk.t=0.15; }
    }
  }
});

registerHero({ id:'zhaoqianye', color:'#c0392b', emblem:'fang', name:'赵千夜', src:'永夜君王',
    size:'中', hp:'中', speed:'中', contact:'中',
    skill:{type:'drain', dmg:'高', range:'中', cd:2.2, healRatio:1.0},
    desc:'血裔汲取：对近处敌人造成高伤，并把伤害等量转化为自身生命。越打越活，怕被放风筝。' ,
    i18n:{name:'Zhao Qianye', src:'Nightfall King',
    desc:'Blood drain: hits a nearby enemy hard and converts the damage into its own HP. Sustains through fights, but suffers against kiters.'} });

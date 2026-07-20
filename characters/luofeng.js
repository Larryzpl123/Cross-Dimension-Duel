// characters/luofeng.js
registerSkill('chargeNuke', {
  ai:'flee',
  init:(s)=>s.chargeTime,
  cd:(f,s)=>({t:f.sk.t,total:s.chargeTime}),
  badges:(s,L,T)=>[L('长蓄力','Long charge'), L('一刀秒杀','One-shot'),
                   L('最快'+(s.minCharge||s.chargeTime)+'秒','Floor '+(s.minCharge||s.chargeTime)+'s')],
  tick(f, dt, s){
    // 吞噬星空：敌人越多，力道涨得越快 → 蓄力按敌人数加速
    // 但设一个地板 minCharge：再多敌人也不能比它更快，否则大乱斗里罗峰无解
    const ne=f.enemies().length;
    const per = (s.perEnemy!==undefined) ? s.perEnemy : 0.35;
    let mult = 1 + Math.max(0,ne-1)*per;
    if(s.minCharge) mult = Math.min(mult, s.chargeTime/s.minCharge);
    f.sk.t -= dt * mult;
    if(f.sk.beam){ f.sk.beam.t-=dt; if(f.sk.beam.t<=0) f.sk.beam=null; }
    if(f.sk.t<=0){
      const tg=f.nearestEnemy();
      if(tg){ hurt(tg, 99999); f.sk.beam={x:tg.x,y:tg.y,t:0.25}; f.sk.t=s.chargeTime; }
      else { f.sk.t=0.15; }
    }
  }
});

registerHero({ id:'luofeng', color:'#8b5cf6', emblem:'starburst', name:'罗峰', src:'吞噬星空',
    size:'中', hp:'高', speed:'中', contact:'低',
    skill:{type:'chargeNuke', chargeTime:10.081, perEnemy:0.25, minCharge:6.66},
    desc:'终极力道：蓄力 10.081 秒，一刀秒杀最近敌人。敌人越多蓄得越快，但最快也要 6.66 秒。前期是空气，攒满则一击致命——拖到读条就赢。' ,
    i18n:{name:'Luo Feng', src:'Swallowed Star',
    desc:'Ultimate Force: charges 10.081s then one-shots the nearest enemy. The more enemies, the faster it charges — but never faster than 6.66s.'} });

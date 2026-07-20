// characters/hanli.js
registerSkill('meleeSwing', {
  ai:'chase',
  init:(s)=>s.swingCD,
  cd:(f,s)=>({t:f.sk.t,total:s.swingCD}),
  badges:(s,L,T)=>[L('近战横扫','Melee sweep'), `${L('剑','Blade')} ${T(s.dmg)}`],
  tick(f, dt, s){
    // 单柄重剑：攻速慢，触发时横扫前方扇形，命中即高伤
    if(f.sk.swinging){ f.sk.swingProg += dt/0.3; if(f.sk.swingProg>=1) f.sk.swinging=false; }
    f.sk.t-=dt;
    if(f.sk.t<=0){
      const tg=f.nearestEnemy(), R=f.r+s.reach;
      if(tg && Math.hypot(tg.x-f.x,tg.y-f.y) < R+tg.r && okCast(f)){
        if(f.player) f.castQueued=false;
        f.sk.aim=Math.atan2(tg.y-f.y,tg.x-f.x); f.sk.swinging=true; f.sk.swingProg=0;
        const dmg=tier('dmg',s.dmg)*f.dmgMult;
        for(const e of f.enemies()){
          if(Math.hypot(e.x-f.x,e.y-f.y) < R+e.r){
            let ad=Math.atan2(e.y-f.y,e.x-f.x)-f.sk.aim;
            while(ad>Math.PI)ad-=6.283; while(ad<-Math.PI)ad+=6.283;
            if(Math.abs(ad) < s.arc/2) hitSingle(e, dmg, f);   // 在扇形内 → 挨一刀（可闪避）
          }
        }
        f.sk.t=s.swingCD;
      } else if(!f.player){ f.sk.t=0.15; }   // AI够不到等贴近；玩家保持就绪
    }
  }
});

registerHero({ id:'hanli', color:'#6bbf59', emblem:'blade', name:'韩立', src:'凡人修仙传',
    size:'中', hp:'高', speed:'中', speedMul:1.1, contact:'低', ai:'phase', fleeHeal:20,
    skill:{type:'meleeSwing', dmg:'高', reach:52, arc:1.7, swingCD:3.0},
    desc:'青竹重剑：近战横扫高伤。二阶段"韩跑跑"——掉到半血就边逃边回血，回到55%以上再转回近战开打。' ,
    i18n:{name:'Han Li', src:"A Mortal's Journey",
    desc:"Azure bamboo greatsword: slow heavy melee, sweeps a high-damage frontal arc. Phase 2 'run & heal': below half HP he flees and regenerates, re-engages above 55%."} });

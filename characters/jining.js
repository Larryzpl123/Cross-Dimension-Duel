// characters/jining.js
registerSkill('orbitSwords', {
  ai:'kite',
  init:(s)=>s.orbitTime,
  cd:(f,s)=>({t:f.sk.t, total:f.sk.phase==='orbit'? s.orbitTime : s.regenTime}),
  badges:(s,L,T)=>[`${L('齐射','Volley')}×${s.count}`, `${L('单发','Each')} ${T(s.dmg)}`],
  tick(f, dt, s){
    f.sk.ang += dt*2.6;
    const dmg = tier('dmg', s.dmg)*f.dmgMult;
    if(f.sk.phase==='orbit'){
      // 蓄力阶段：六剑环绕，接触敌人也造成一点伤害
      for(let k=0;k<s.count;k++){
        const ang=f.sk.ang + k*(Math.PI*2/s.count);
        const sx=f.x+Math.cos(ang)*s.orbitR, sy=f.y+Math.sin(ang)*s.orbitR;
        for(const e of f.enemies()){
          if(Math.hypot(e.x-sx,e.y-sy) < e.r+6)
            damage(e, dmg, f.sk.swordCd, e.id+'_'+k, SWORD_CD, f);
        }
      }
      f.sk.t-=dt;
      if(f.sk.t<=0){
        const tg=f.nearestEnemy();
        if(tg && okCast(f)){
          if(f.player) f.castQueued=false;
          // 六剑齐射：以目标方向为中心扇形展开，之后各自追踪
          const base=Math.atan2(tg.y-f.y, tg.x-f.x), sp=480;
          for(let k=0;k<s.count;k++){
            const a=base + (k-(s.count-1)/2)*0.18;
            swords.push({x:f.x,y:f.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
              team:f.team, dmg:dmg, life:1.8, speed:sp});
          }
          f.sk.phase='empty'; f.sk.t=s.regenTime;   // 打空，进入再生
        } else if(!f.player){ f.sk.t=0.3; }          // AI没目标重试；玩家保持就绪等按键
      }
    } else {
      // 再生阶段：剑消失，攒够时间后重新环绕
      f.sk.t-=dt;
      if(f.sk.t<=0){ f.sk.phase='orbit'; f.sk.t=s.orbitTime; }
    }
  }
});

registerHero({ id:'jining', color:'#5ec8e8', emblem:'sword', name:'纪宁', src:'莽荒纪',
    size:'中', hp:'中', speed:'中', contact:'低',
    skill:{type:'orbitSwords', count:6, dmg:'低', orbitR:50, orbitTime:1.6, regenTime:1.35},
    desc:'六剑环绕蓄力，攒满后一齐御剑齐射最近敌人（单发低伤，胜在六发追踪覆盖），打空后重新生成再射。' ,
    i18n:{name:'Ji Ning', src:'Desolate Era',
    desc:'Six orbiting swords charge up, then volley-fire homing blades at the nearest enemy (low each, six shots cover), regenerate and fire again.'} });

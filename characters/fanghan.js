// characters/fanghan.js —— 方寒《永生》：最大生命随时间无限增长
registerSkill('eternal', {
  ai:'chase',
  init:(s)=>s.cd,
  cd:(f,s)=>({t:f.sk.t, total:s.cd}),
  badges:(s,L,T)=>[L('血上限成长','Max HP grows'), `${L('伤害','Dmg')} ${T(s.dmg)}`],
  tick(f, dt, s){
    // 永生：最大生命持续增长（当前血同步增加，不算回血）
    if(f.sk.baseMax===undefined) f.sk.baseMax=f.maxHp;
    const g=1+Math.min(s.growMax, battleT*s.growRate);
    const nm=f.sk.baseMax*g;
    if(nm>f.maxHp){ const d=nm-f.maxHp; f.maxHp=nm; f.hp+=d; }
    f.sk.t-=dt;
    if(f.sk.t<=0){
      const tg=f.nearestEnemy();
      if(tg && Math.hypot(tg.x-f.x,tg.y-f.y) < tier('range',s.range)+tg.r && okCast(f)){
        if(f.player) f.castQueued=false;
        hitSingle(tg, tier('dmg',s.dmg)*f.dmgMult, f);
        f.sk.t=s.cd;
      } else if(!f.player){ f.sk.t=0.15; }
    }
  }
});
registerHero({ id:'fanghan', color:'#a8e6cf', emblem:'infinity', name:'方寒', src:'永生',
  size:'中', hp:'中', speed:'中', contact:'中',
  skill:{type:'eternal', dmg:'高', range:'中', cd:1.4, growRate:0.028, growMax:1.2},
  desc:'永生不朽：生命上限随对局时间持续增长（最高+120%，且同步补满增量）。开局普通，拖越久越难杀死——快攻队的噩梦。',
  i18n:{name:'Fang Han', src:'Immortality',
    desc:'Undying: his maximum HP keeps growing as the match runs (up to +120%, with the gain added to current HP). Ordinary early, nearly unkillable late — a nightmare for rush comps.'} });

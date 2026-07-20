// characters/tangsan.js
registerSkill('entangle', {
  ai:'kite',
  init:(s)=>s.castCD,
  cd:(f,s)=>({t:f.sk.t,total:s.castCD}),
  badges:(s,L,T)=>[L('缠绕减速','Bind slow'), `DoT ${T(s.dot)}`],
  tick(f, dt, s){
    f.sk.t-=dt; if(f.sk.tetherT>0) f.sk.tetherT-=dt;
    if(f.sk.t<=0){
      const tg=f.nearestEnemy();
      if(tg && Math.hypot(tg.x-f.x,tg.y-f.y) < tier('range',s.range) && okCast(f)){
        if(f.player) f.castQueued=false;
        tg.slowT=s.dur; tg.slowMul=s.slowMul;             // 减速
        tg.dotT=s.dur;  tg.dot=tier('dmg',s.dot)*f.dmgMult; // 持续掉血
        tg.entTag=true;                                   // 可蔓延
        f.sk.tether=tg; f.sk.tetherT=s.dur; f.sk.t=s.castCD;
      } else if(!f.player){ f.sk.t=0.15; }
    }
  }
});

registerHero({ id:'tangsan', color:'#7fb3ff', emblem:'silk', name:'唐三', src:'斗罗大陆',
    size:'小', hp:'中', hpMul:1.2, speed:'快', contact:'中', kiteDist:120,
    skill:{type:'entangle', castCD:2.2, dur:1.8, slowMul:0.55, dot:'高', range:'大'},
    desc:'蓝银缠绕：捆住敌人大幅减速+持续掉血（高），被缠者撞到队友会蔓延传染；血厚耐磨，人越多缠成一片。' ,
    i18n:{name:'Tang San', src:'Douluo Dalu',
    desc:'Blue Silver bind: snares the nearest enemy with heavy slow + high damage-over-time; a bound enemy spreads it to allies on contact. Tanky, chains the whole crowd.'} });

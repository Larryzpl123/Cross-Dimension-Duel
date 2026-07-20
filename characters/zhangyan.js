// characters/zhangyan.js —— 张衍《大道争锋》反震：开窗口全额弹回伤害
registerSkill('counter', {
  ai:'chase', beamColor:'150,255,220',
  init:(s)=>s.cd,
  cd:(f,s)=>({t:f.sk.t, total:s.cd}),
  badges:(s,L,T)=>[L('反震窗口','Counter window'), L('常驻反伤','Passive reflect')],
  tick(f, dt, s){
    f.sk.t-=dt;
    if(f.sk.beam){ f.sk.beam.t-=dt; if(f.sk.beam.t<=0) f.sk.beam=null; }
    // 开反震：持续 dur 秒，期间受到的伤害按 counterRatio 全额弹回攻击者
    if(f.sk.t<=0 && f.enemies().length>0 && okCast(f)){
      if(f.player) f.castQueued=false;
      f.counterT=s.dur; f.sk.t=s.cd;
    }
  },
  draw(f, ctx, s){
    if(f.counterT>0){   // 反震护罩
      ctx.beginPath(); ctx.arc(f.x,f.y,f.r+9,0,6.283);
      ctx.strokeStyle='rgba(150,255,220,.9)'; ctx.lineWidth=3; ctx.stroke();
      ctx.fillStyle='rgba(150,255,220,.12)'; ctx.fill();
    }
  }
});
registerHero({ id:'zhangyan', color:'#4dd0a7', emblem:'mirror', name:'张衍', src:'大道争锋',
  size:'中', hp:'高', speed:'中', contact:'中', reflect:0.4, counterRatio:1.0,
  skill:{type:'counter', cd:4.2, dur:2.6},
  desc:'算尽天机：常驻反伤25%；开启反震窗口2.2秒，期间受到的伤害100%原样弹回攻击者。越猛的对手越怕他，但对持续小伤害的敌人收效有限。',
  i18n:{name:'Zhang Yan', src:'Dao Contention',
    desc:'Calculates every move: 25% passive damage reflection; his counter window (2.2s) throws 100% of incoming damage straight back. The harder the enemy hits, the worse it is for them — but chip damage barely feeds it.'} });

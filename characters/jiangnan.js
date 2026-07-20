// characters/jiangnan.js —— 江南《帝尊》玄天教主：光环增伤友军
registerSkill('aura', {
  ai:'chase',
  init:(s)=>s.cd,
  cd:(f,s)=>({t:f.sk.t, total:s.cd}),
  badges:(s,L,T)=>[L('友军光环','Ally aura')+' +'+Math.round(s.buff*100)+'%', L('教令爆发','Decree burst')],
  tick(f, dt, s){
    // 光环：范围内所有友军（含自己）增伤，每帧重算（引擎已在帧首清零 auraBuff）
    for(const a of fighters){
      if(a.alive() && a.team===f.team && Math.hypot(a.x-f.x,a.y-f.y) < s.radius)
        a.auraBuff = Math.max(a.auraBuff, s.buff);
    }
    // 教令：小范围爆发，把靠太近的敌人推开并造成伤害
    f.sk.t-=dt;
    if(f.sk.t<=0 && f.enemies().length>0 && okCast(f)){
      if(f.player) f.castQueued=false;
      explode(f.x, f.y, tier('range',s.range), tier('dmg',s.dmg)*f.dmgMult, f.team);
      f.sk.t=s.cd;
    }
  },
  draw(f, ctx, s){
    ctx.beginPath(); ctx.arc(f.x,f.y,s.radius,0,6.283);
    ctx.strokeStyle='rgba(120,200,255,.22)'; ctx.setLineDash([5,7]); ctx.lineWidth=2;
    ctx.stroke(); ctx.setLineDash([]);
  }
});
registerHero({ id:'jiangnan', color:'#4cc9f0', emblem:'crown', name:'江南', src:'帝尊',
  size:'中', hp:'高', speed:'中', contact:'中',
  skill:{type:'aura', radius:150, buff:0.2, dmg:'中', range:'大', cd:1.8},
  desc:'玄天教主：光环笼罩半径150，范围内所有友军（含自己）伤害+30%；另有教令爆发清理贴脸的敌人。单挑平庸，混搭队里是核心增益。',
  i18n:{name:'Jiang Nan', src:'Emperor Domination (Di Zun)',
    desc:'Sect Master aura: every ally within 150 radius (himself included) deals +30% damage, plus a decree burst to clear anyone hugging him. Mediocre solo, a core buffer in mixed teams.'} });

// characters/guchensha.js —— 古尘沙《龙符》天子封神术
registerSkill('enshrine', {
  ai:'chase', beamColor:'255,210,120',
  init:(s)=>s.cd,
  cd:(f,s)=>({t:f.sk.t, total:s.cd}),
  badges:(s,L,T)=>[L('击杀封神','Kill stacks'), `${L('伤害','Dmg')} ${T(s.dmg)}`],
  tick(f, dt, s){
    // 封神：每有一名敌人阵亡就永久叠一层（增伤 + 回血），越杀越强
    const n=f.enemies().length;
    if(f.sk.lastN===undefined) f.sk.lastN=n;
    if(n < f.sk.lastN){
      const k=f.sk.lastN-n;
      f.sk.stacks=(f.sk.stacks||0)+k;
      f.dmgMult = 1 + f.sk.stacks*s.gain;
      f.hp = Math.min(f.maxHp, f.hp + f.maxHp*0.25*k);
    }
    f.sk.lastN=n;
    // 符诏一击
    f.sk.t-=dt;
    if(f.sk.beam){ f.sk.beam.t-=dt; if(f.sk.beam.t<=0) f.sk.beam=null; }
    if(f.sk.t<=0){
      const tg=f.nearestEnemy();
      if(tg && Math.hypot(tg.x-f.x,tg.y-f.y) < tier('range',s.range)+tg.r && okCast(f)){
        if(f.player) f.castQueued=false;
        hitSingle(tg, tier('dmg',s.dmg)*f.dmgMult, f);
        f.sk.beam={x:tg.x,y:tg.y,t:0.2}; f.sk.t=s.cd;
      } else if(!f.player){ f.sk.t=0.15; }
    }
  }
});
registerHero({ id:'guchensha', color:'#e0c068', emblem:'talisman', name:'古尘沙', src:'龙符',
  size:'中', hp:'中', speed:'中', contact:'高',
  skill:{type:'enshrine', dmg:'高', range:'大', cd:1.5, gain:0.22},
  desc:'天子封神术：符诏一击（高伤）。每有敌人阵亡便永久封神叠加一层——增伤22%并回血，人越多越滚雪球。',
  i18n:{name:'Gu Chensha', src:'Dragon Talisman',
    desc:'Divine Investiture: a talisman strike (high). Every enemy death permanently stacks +22% damage and heals him — snowballs hard in crowds.'} });

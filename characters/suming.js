// characters/suming.js —— 苏铭《求魔》魔印：被标记者受到所有伤害放大
registerSkill('mark', {
  ai:'kite', beamColor:'190,90,255',
  init:(s)=>s.cd,
  cd:(f,s)=>({t:f.sk.t, total:s.cd}),
  badges:(s,L,T)=>[L('魔印增伤','Curse amp')+' ×'+s.mul, `${L('伤害','Dmg')} ${T(s.dmg)}`],
  tick(f, dt, s){
    f.sk.t-=dt;
    if(f.sk.beam){ f.sk.beam.t-=dt; if(f.sk.beam.t<=0) f.sk.beam=null; }
    if(f.sk.t<=0){
      const tg=f.nearestEnemy();
      if(tg && Math.hypot(tg.x-f.x,tg.y-f.y) < tier('range',s.range)+tg.r && okCast(f)){
        if(f.player) f.castQueued=false;
        tg.markT=s.dur; tg.markMul=s.mul;                  // 打上魔印
        hitSingle(tg, tier('dmg',s.dmg)*f.dmgMult, f);
        f.sk.beam={x:tg.x,y:tg.y,t:0.22}; f.sk.t=s.cd;
      } else if(!f.player){ f.sk.t=0.15; }
    }
  }
});
registerHero({ id:'suming', color:'#b5179e', emblem:'rune', name:'苏铭', src:'求魔',
  size:'中', hp:'中', speed:'中', contact:'中', kiteDist:130,
  skill:{type:'mark', dmg:'高', range:'大', cd:2.0, dur:3.0, mul:1.5},
  desc:'魔印：在最近敌人身上烙下印记3秒，期间它受到的【所有来源】伤害放大50%——自己打也算，队友打更狠。混搭队里的伤害放大器。',
  i18n:{name:'Su Ming', src:'Beseech the Devil',
    desc:'Devil Mark: brands the nearest enemy for 3s, amplifying ALL damage it takes by 50% — from him and from teammates alike. A damage amplifier built for mixed teams.'} });

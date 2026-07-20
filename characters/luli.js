// characters/luli.js —— 陆离《不灭龙帝》银龙血脉·越伤越强
registerSkill('berserk', {
  ai:'chase', beamColor:'255,150,60',
  init:(s)=>s.cd,
  cd:(f,s)=>({t:f.sk.t, total:s.cd}),
  badges:(s,L,T)=>[L('越伤越强','Rage scaling'), `${L('伤害','Dmg')} ${T(s.dmg)}`],
  tick(f, dt, s){
    // 银龙血脉：血越少，伤害越高（含撞击）
    const rage = 1 + (1 - f.hp/f.maxHp)*s.rage;
    f.dmgMult = rage; f.contact = f.baseContact*rage;
    f.sk.t-=dt;
    if(f.sk.beam){ f.sk.beam.t-=dt; if(f.sk.beam.t<=0) f.sk.beam=null; }
    if(f.sk.t<=0){
      const tg=f.nearestEnemy();
      if(tg && Math.hypot(tg.x-f.x,tg.y-f.y) < tier('range',s.range)+tg.r && okCast(f)){
        if(f.player) f.castQueued=false;
        hitSingle(tg, tier('dmg',s.dmg)*f.dmgMult, f);
        // 拉棺神力：命中把目标震开
        const a=Math.atan2(tg.y-f.y,tg.x-f.x), kb=s.knock||90;
        tg.x=Math.max(tg.r,Math.min(W-tg.r, tg.x+Math.cos(a)*kb));
        tg.y=Math.max(tg.r,Math.min(H-tg.r, tg.y+Math.sin(a)*kb));
        f.sk.beam={x:tg.x,y:tg.y,t:0.2}; f.sk.t=s.cd;
      } else if(!f.player){ f.sk.t=0.15; }
    }
  }
});
registerHero({ id:'luli', color:'#b8c6db', emblem:'dragon', name:'陆离', src:'不灭龙帝',
  size:'大', hp:'高', speed:'中', contact:'中',
  skill:{type:'berserk', dmg:'中', range:'中', cd:2.1, rage:0.3, knock:90},
  desc:'银龙血脉·拉棺神力：血量越低伤害越高（最多+120%，撞击也算），命中还会把敌人震开。残血才是他的主场。',
  i18n:{name:'Lu Li', src:'Immortal Dragon Emperor',
    desc:'Silver Dragon bloodline: the lower his HP the harder he hits (up to +120%, ramming included), and strikes knock enemies back. He is strongest near death.'} });

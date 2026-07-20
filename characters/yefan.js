// characters/yefan.js
registerSkill('nova', {
  ai:'chase',
  init:(s)=>s.cd,
  cd:(f,s)=>({t:f.sk.t,total:s.cd}),
  badges:(s,L,T)=>[L('自身爆发','Self nova'), `${L('范围','Range')} ${T(s.range)}`],
  tick(f, dt, s){           // 叶凡：以自身为中心的爆发
    f.sk.t-=dt;
    if(f.sk.t<=0 && f.enemies().length>0 && okCast(f)){
      if(f.player) f.castQueued=false;
      explode(f.x, f.y, tier('range',s.range), tier('dmg',s.dmg)*f.dmgMult, f.team);
      f.sk.t=s.cd;
    }
  }
});

registerHero({ id:'yefan', color:'#cd7f32', emblem:'orb', name:'叶凡', src:'遮天',
    size:'大', hp:'高', speed:'中', contact:'中', growth:{rate:0.022, max:1.0},
    skill:{type:'nova', dmg:'高', range:'中', cd:2.4},
    desc:'荒古圣体：以自身为中心的爆发（中范围AoE），且越战越强——伤害随对局时间成长，最高翻倍。' ,
    i18n:{name:'Ye Fan', src:'Shrouding the Heavens',
    desc:'Primordial Sacred Body: a self-centred AoE burst, and grows stronger the longer the match runs (damage scales up to double).'} });

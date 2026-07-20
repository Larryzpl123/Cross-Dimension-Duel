// characters/shihao.js
registerSkill('regen', {
  ai:'chase',
  badges:(s,L,T)=>[`${L('回血','Heal')} ${T(s.heal)}`],
  tick(f, dt, s){
    // 持续回血（不超过上限）
    f.hp=Math.min(f.maxHp, f.hp + tier('dmg',s.heal)*f.dmgMult*dt);
  }
});

registerHero({ id:'shihao', color:'#ffc14d', emblem:'sun', name:'石昊', src:'完美世界',
    size:'小', hp:'中', speed:'快', contact:'高', contactCD:0.95,
    skill:{type:'regen', heal:'中'},
    desc:'荒天帝：撞击高伤害 + 持续回血（生命力顽强）。速度快、边撞边奶，打消耗不虚。' ,
    i18n:{name:'Shi Hao', src:'Perfect World',
    desc:'Desolate Emperor: high ram damage + steady self-heal (tenacious life force). Fast, brawls and out-sustains.'} });

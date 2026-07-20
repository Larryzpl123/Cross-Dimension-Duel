// characters/panyue.js —— 磐岳（原创角色）：厚盾自刷 + 落岳镇压
// 备注：本角色为原创，用于替代早期版本里的商业游戏角色，规避 IP 风险。机制未做任何改动。
registerSkill('shield', {
  ai:'chase',
  init:(s)=>s.shieldCD,
  state:(s)=>({meteorT:s.meteorCD}),
  cd:(f,s)=>({t:f.sk.meteorT,total:s.meteorCD}),
  badges:(s,L,T)=>[L('厚盾自刷','Auto-shield'), L('落岳石化','Meteor stun')],
  tick(f, dt, s){
    // 磐岩护盾：每 shieldCD 把盾刷满
    f.sk.t-=dt;
    if(f.sk.t<=0){ f.shield=f.maxShield; f.sk.t=s.shieldCD; }
    // 落岳：超大范围砸落，命中石化定身
    f.sk.meteorT-=dt;
    if(f.sk.meteorT<=0){
      const tg=f.nearestEnemy();
      if(tg && okCast(f)){ if(f.player)f.castQueued=false;
        meteors.push({x:tg.x, y:tg.y, warn:0.9, flash:0,
        range:s.meteorR, dmg:tier('dmg',s.meteorDmg)*f.dmgMult, petrify:s.petrify, team:f.team});
        f.sk.meteorT=s.meteorCD; }
      else if(!f.player){ f.sk.meteorT=0.3; }
    }
  }
});
registerHero({ id:'panyue', color:'#d9a441', emblem:'shield', name:'磐岳', src:'原创',
  size:'大', hp:'中', speed:'慢', contact:'低',
  skill:{type:'shield', shieldAmt:85, shieldCD:3.0, meteorCD:13, meteorR:185, meteorDmg:'中', petrify:1.3},
  desc:'磐岩护盾：极慢、伤害极低，但护盾每3秒刷满——持续输出不够就打不穿他。每13秒召落岳砸场，超大范围，命中石化定身1.3秒。',
  i18n:{name:'Panyue', src:'Original',
    desc:'Bedrock Aegis: very slow with almost no damage, but his shield refills every 3s — sustained DPS below the threshold simply cannot break through. Every 13s he calls down a falling peak: huge AoE, petrifies for 1.3s.'} });

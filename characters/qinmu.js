// characters/qinmu.js
// 召唤物模板（不进选人表）
const MINION={id:'minion', name:'牧灵', src:'', size:'小', hp:'中', speed:'快',
  contact:'低', color:'#2fbf9f', emblem:'dot', skill:{type:'none'}, desc:'', i18n:{name:'Herd Spirit', src:'', desc:''}};

registerSkill('summon', {
  ai:'kite',
  init:(s)=>s.cd,
  cd:(f,s)=>({t:f.sk.t,total:s.cd}),
  badges:(s,L,T)=>[`${L('召唤','Summon')}×${s.count}`, s.life+'s'],
  tick(f, dt, s){         // 秦牧：放牧——召唤临时随从
    f.sk.t-=dt;
    if(f.sk.t<=0 && okCast(f)){
      if(f.player) f.castQueued=false;
      for(let i=0;i<s.count;i++){
        const m=new Fighter(MINION, f.team,
          Math.max(20,Math.min(W-20,f.x+(Math.random()*50-25))),
          Math.max(20,Math.min(H-20,f.y+(Math.random()*50-25))));
        m.isSummon=true; m.summonLife=s.life; fighters.push(m);
      }
      f.sk.t=s.cd;
    }
  }
});

registerHero({ id:'qinmu', color:'#2fbf9f', emblem:'leaf', name:'秦牧', src:'牧神记',
    size:'中', hp:'中', speed:'中', contact:'低', kiteDist:165,
    skill:{type:'summon', count:2, life:8, cd:4.5},
    desc:'放牧诸神：召唤2只临时牧灵替你作战（存活8秒）。自身脆，靠随从铺场。' ,
    i18n:{name:'Qin Mu', src:'Records of the Human Emperor',
    desc:'Herding the Gods: summons 2 temporary herd spirits to fight for you (8s). Fragile himself — wins by flooding the field.'} });

// characters/linlei.js
registerSkill('chain', {
  ai:'kite',
  init:(s)=>s.cd,
  cd:(f,s)=>({t:f.sk.t,total:s.cd}),
  badges:(s,L,T)=>[`${L('连锁','Chain')}×${s.jumps}`, `${L('伤害','Dmg')} ${T(s.dmg)}`],
  tick(f, dt, s){          // 林雷：雷之法则，连锁跳跃
    f.sk.t-=dt;
    if(f.sk.t<=0){
      const tg=f.nearestEnemy();
      if(tg && okCast(f)){
        if(f.player) f.castQueued=false;
        let prev={x:f.x,y:f.y}, cur=tg, dmg=tier('dmg',s.dmg)*f.dmgMult; const hit=[];
        for(let j=0;j<=s.jumps && cur;j++){
          hitSingle(cur, dmg, f); hit.push(cur);
          bolts.push({x1:prev.x,y1:prev.y,x2:cur.x,y2:cur.y,t:0.22});
          prev={x:cur.x,y:cur.y}; dmg*=s.decay;
          let nx=null,nd=1e9;
          for(const e of f.enemies()){ if(hit.includes(e)) continue;
            const d=Math.hypot(e.x-prev.x,e.y-prev.y); if(d<s.jumpRange && d<nd){ nd=d; nx=e; } }
          cur=nx;
        }
        f.sk.t=s.cd;
      } else if(!f.player){ f.sk.t=0.2; }
    }
  }
});

registerHero({ id:'linlei', color:'#f4e04d', emblem:'bolt', name:'林雷', src:'盘龙',
    size:'中', hp:'中', speed:'快', contact:'低', kiteDist:170,
    skill:{type:'chain', dmg:'高', cd:1.4, jumps:3, jumpRange:165, decay:0.7},
    desc:'雷之法则：闪电命中最近敌人后连锁跳跃（最多3次），每跳衰减。单挑一般，人越多越强。' ,
    i18n:{name:'Linley', src:'Coiling Dragon',
    desc:'Law of Lightning: a bolt hits the nearest enemy then chains up to 3 times, decaying each jump. Mediocre 1v1, scales hard with crowds.'} });

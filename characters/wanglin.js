// characters/wanglin.js
registerSkill('blink', {
  beamColor:'185,160,255',
  ai:'chase',
  init:(s)=>s.cd,
  cd:(f,s)=>({t:f.sk.t,total:s.cd}),
  badges:(s,L,T)=>[L('瞬移突袭','Blink strike'), `${L('伤害','Dmg')} ${T(s.dmg)}`],
  tick(f, dt, s){          // 王林：瞬移突袭
    f.sk.t-=dt;
    if(f.sk.beam){ f.sk.beam.t-=dt; if(f.sk.beam.t<=0) f.sk.beam=null; }
    if(f.sk.t<=0){
      const tg=f.nearestEnemy();
      if(tg && okCast(f)){
        if(f.player) f.castQueued=false;
        const a=Math.atan2(f.y-tg.y, f.x-tg.x);            // 落到目标旁边
        f.sk.beam={x:f.x,y:f.y,t:0.22};                    // 记录出发点做残影
        f.x=Math.max(f.r,Math.min(W-f.r, tg.x+Math.cos(a)*(tg.r+f.r+2)));
        f.y=Math.max(f.r,Math.min(H-f.r, tg.y+Math.sin(a)*(tg.r+f.r+2)));
        hitSingle(tg, tier('dmg',s.dmg)*f.dmgMult, f);
        f.sk.t=s.cd;
      } else if(!f.player){ f.sk.t=0.15; }
    }
  }
});

registerHero({ id:'wanglin', color:'#a06cd5', emblem:'arrow', name:'王林', src:'仙逆',
    size:'中', hp:'中', speed:'中', contact:'中', revive:{hpFrac:0.5},
    skill:{type:'blink', dmg:'高', cd:2.4},
    desc:'瞬移突袭：闪现到最近敌人身旁并重击（高伤）。逆天改命——阵亡时复活一次（半血）。' ,
    i18n:{name:'Wang Lin', src:'Renegade Immortal',
    desc:'Blink strike: teleports beside the nearest enemy and hits hard. Defies fate — revives once at half HP on death.'} });

// characters/liqiye.js —— 李七夜《帝霸》万古不死 + 剑指长线
registerSkill('pierce', {
  ai:'kite',
  init:(s)=>s.cd,
  cd:(f,s)=>({t:f.sk.t, total:s.cd}),
  badges:(s,L,T)=>[L('穿透直线','Piercing line'), `${L('伤害','Dmg')} ${T(s.dmg)}`],
  tick(f, dt, s){
    f.sk.t-=dt;
    if(f.sk.ray){ f.sk.ray.t-=dt; if(f.sk.ray.t<=0) f.sk.ray=null; }
    if(f.sk.t<=0){
      const tg=f.nearestEnemy();
      if(tg && okCast(f)){
        if(f.player) f.castQueued=false;
        const a=Math.atan2(tg.y-f.y,tg.x-f.x), len=s.length||300;
        const ex=f.x+Math.cos(a)*len, ey=f.y+Math.sin(a)*len;
        // 直线上的所有敌人都吃伤害（点到线段距离）
        for(const e of f.enemies()){
          const dx=ex-f.x, dy=ey-f.y, L2=dx*dx+dy*dy;
          let u=((e.x-f.x)*dx+(e.y-f.y)*dy)/L2; u=Math.max(0,Math.min(1,u));
          const px=f.x+dx*u, py=f.y+dy*u;
          if(Math.hypot(e.x-px,e.y-py) < e.r + (s.width||14))
            hitSingle(e, tier('dmg',s.dmg)*f.dmgMult, f);
        }
        f.sk.ray={x:ex,y:ey,t:0.22}; f.sk.t=s.cd;
      } else if(!f.player){ f.sk.t=0.2; }
    }
  },
  draw(f, ctx, s){
    if(!f.sk.ray) return;
    const a=Math.max(0,f.sk.ray.t/0.22);
    ctx.strokeStyle=`rgba(255,240,180,${a})`; ctx.lineWidth=6;
    ctx.beginPath(); ctx.moveTo(f.x,f.y); ctx.lineTo(f.sk.ray.x,f.sk.ray.y); ctx.stroke();
    ctx.strokeStyle=`rgba(255,255,255,${a*0.9})`; ctx.lineWidth=2; ctx.stroke();
  }
});
registerHero({ id:'liqiye', color:'#6b6b7a', emblem:'skull', name:'李七夜', src:'帝霸',
  size:'中', hp:'中', speed:'中', contact:'低', capHit:0.12, kiteDist:200,
  skill:{type:'pierce', dmg:'高', cd:1.7, length:300, width:14},
  desc:'万古不死：任何一次伤害最多只能削掉他12%总血——秒杀、斩杀、爆发全部无效，只能被慢慢磨死。剑指苍穹射出穿透直线，打中一条线上的所有敌人。',
  i18n:{name:'Li Qiye', src:'Emperor Domination',
    desc:'Eternally undying: any single hit is capped at 12% of his max HP — one-shots, executes and burst are all neutralised; he can only be ground down. His piercing sword-line damages every enemy in a straight line.'} });

registerSkill('cellRanged', {
  ai:'kite',                  
  init:(s)=>s.fireCD,
  cd:(f,s)=>({t:f.sk.t, total:s.fireCD}),
  badges:(s,L,T)=>[L('远程'+s.bulletDmg,'Ranged '+s.bulletDmg), L('受伤即分裂','Splits when hit'), L('同类融合','Cells fuse')],
  tick(f, dt, s){              
    f.sk.t-=dt;
    if(f.sk.t<=0){
      const tg=f.nearestEnemy();
      if(tg){ const a=Math.atan2(tg.y-f.y,tg.x-f.x), sp=s.bulletSpeed||470;
        bullets.push({x:f.x,y:f.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
          team:f.team, dmg:s.bulletDmg*f.dmgMult, life:2, speed:sp}); }
      f.sk.t=s.fireCD;
    }
  }
});

registerHero({ id:'drcell', color:'#3b5bdb', emblem:'cell', name:'细胞博士', src:'原创.哈利',
    size:'中', hp:'中', hpRaw:280, contact:'低', contactRaw:0, speed:'中', kiteDist:170,
    mechanic:'mitosis',                                        // 机制写在 mechanics/mitosis.js
    mechParams:{ splitFrac:0.20, maxSplits:4, cap:8, dieHp:2, repel:150 },
    skill:{type:'cellRanged', fireCD:0.9, bulletDmg:8, bulletSpeed:470},
    desc:'细胞博士：100血、5远程伤害。受到任何伤害都不扣血，而是立刻有丝分裂——母子血量各变为原来的1/3（每次分裂总血量净损失20%）并互相弹开；血量<1的细胞会死亡。两个细胞相撞则融合血量（封顶100）。越挨打越多，但越分越脆，最终被分死。',
    i18n:{name:'Dr. Cell', src:'Original by Harry',
    desc:'100 HP, 5 ranged damage. Any incoming damage deals no HP loss — instead it instantly undergoes mitosis: mother and daughter each drop to 1/3 of the HP (20% of total HP is lost per split) and repel apart; a cell below 1 HP dies. Two cells that touch fuse their HP (capped at 200). The more it is hit, the more it splits — but the frailer each cell becomes, until they split themselves to death.'} });

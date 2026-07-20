// characters/shiyu.js —— 时宇《不科学御兽》御兽·永久宠物 + 战斗指令
const PET={id:'pet', name:'契约兽', src:'', size:'小', hp:'中', speed:'快',
  contact:'低', color:'#9ee04d', emblem:'dot', skill:{type:'none'}, desc:'', i18n:{name:'Bonded Beast', src:'', desc:''}};
registerSkill('petEvolve', {
  ai:'kite',
  init:(s)=>0,
  // 冷却环显示「战斗指令」的冷却（玩家真正要按的那个）
  cd:(f,s)=>({t:f.sk.cmdCD||0, total:s.cmdCD}),
  badges:(s,L,T)=>[L('永久宠物','Permanent pet'), L('随时间进化','Evolves'), L('战斗指令','Beast command')],
  tick(f, dt, s){
    // —— 召唤是自动的（不占技能键）：宠物不在场就自动重召 ——
    f.sk.t-=dt;
    const alive = f.sk.pet && f.sk.pet.alive();
    if(!alive && f.sk.t<=0){
      const p=new Fighter(PET, f.team, f.x+30, f.y+20);
      p.isSummon=true;                      // 不计入胜负判定
      f.sk.pet=p; fighters.push(p);
      f.sk.bornAt=battleT; f.sk.t=s.respawnCD;
    }
    // —— J = 战斗指令：命令宠物暴走（增伤 + 加速）——
    if(f.sk.cmdCD===undefined) f.sk.cmdCD=0;
    if(f.sk.cmdT===undefined) f.sk.cmdT=0;
    f.sk.cmdCD-=dt;
    if(f.sk.cmdT>0) f.sk.cmdT-=dt;
    if(f.sk.cmdCD<=0 && alive && okCast(f)){
      if(f.player) f.castQueued=false;
      f.sk.cmdT=s.cmdDur; f.sk.cmdCD=s.cmdCD;
    }
    // —— 进化：宠物随存活时间变强；指令期间额外暴走 ——
    if(f.sk.pet && f.sk.pet.alive()){
      const age=battleT-(f.sk.bornAt||0);
      const g=1+Math.min(s.evoMax, age*s.evoRate);
      const burst=(f.sk.cmdT>0)? s.cmdMul : 1;
      f.sk.pet.dmgMult=g*burst;
      f.sk.pet.contact=f.sk.pet.baseContact*g*burst;
      f.sk.pet.speed=tier('speed','快')*((f.sk.cmdT>0)?1.35:1);
      f.sk.pet.r=tier('size','小')*Math.min(1.5, g);
    }
  },
  draw(f, ctx, s){
    // 与宠物的契约连线；暴走时变红加粗
    const p=f.sk.pet;
    if(p && p.alive()){
      const on=f.sk.cmdT>0;
      ctx.strokeStyle= on? 'rgba(255,120,90,.85)' : 'rgba(140,220,180,.35)';
      ctx.lineWidth= on? 3 : 1.5;
      ctx.setLineDash([4,6]);
      ctx.beginPath(); ctx.moveTo(f.x,f.y); ctx.lineTo(p.x,p.y); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
});
registerHero({ id:'shiyu', color:'#9ee04d', emblem:'paw', name:'时宇', src:'不科学御兽',
  size:'中', hp:'中', speed:'中', contact:'低', kiteDist:180,
  skill:{type:'petEvolve', respawnCD:6, evoRate:0.03, evoMax:0.7, cmdCD:5, cmdDur:2.4, cmdMul:1.4},
  desc:'御兽：自动召唤一只永久契约兽（死后4秒自动重召），随存活时间不断进化。J 下达战斗指令——2.4秒内宠物增伤40%并加速冲锋。本体躲后面指挥。',
  i18n:{name:'Shi Yu', src:'Unscientific Beast Taming',
    desc:'Beast taming: auto-summons a permanent bonded beast (auto-resummons 4s after death) that evolves the longer it lives. Press J to issue a battle command — +40% damage and a speed surge for 2.4s. He directs from the back.'} });

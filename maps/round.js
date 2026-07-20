// maps/round.js —— 圆形斗技场：无死角，中央一根立柱
registerMap({
  id:'round', name:'圆形斗技场', nameEn:'Round Pit',
  w:540, h:540, shape:'circle',
  obstacles:[{x:270, y:270, r:46}],
  hazards:[],
  desc:'正圆场地，没有墙角可以卡。中央一根巨柱是唯一掩体，追逐战会绕着它转圈。',
  descEn:'A true circle — no corners to trap anyone. A single central pillar is the only cover, so chases spiral around it.'
});

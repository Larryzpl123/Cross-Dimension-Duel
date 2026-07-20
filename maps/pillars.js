// maps/pillars.js —— 四柱厅：改成近正方形宽场，四根粗柱
registerMap({
  id:'pillars', name:'四柱厅', nameEn:'Four Pillars',
  w:560, h:520, shape:'rect',
  obstacles:[
    {x:160, y:150, r:40}, {x:400, y:150, r:40},
    {x:160, y:370, r:40}, {x:400, y:370, r:40},
  ],
  hazards:[],
  desc:'宽阔方厅，四根石柱挡投射物并弹开小球。空间大、掩体多，放风筝和绕柱都好用。',
  descEn:'A wide square hall with four stone pillars that block projectiles and bounce balls. Room to kite and to break line of sight.'
});

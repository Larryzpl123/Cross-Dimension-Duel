// maps/corridor.js —— 窄廊：更极端的细长，中间两道错位隔墙
registerMap({
  id:'corridor', name:'窄廊', nameEn:'Corridor',
  w:240, h:720, shape:'rect',
  obstacles:[
    {x:80,  y:250, w:160, h:26},
    {x:160, y:470, w:160, h:26},
  ],
  hazards:[],
  desc:'又窄又长，两道错位隔墙把场地切成三段。躲无可躲，AoE 和撞击流的天堂。',
  descEn:'Long and cramped, split into three segments by two staggered walls. Nowhere to run — heaven for AoE and rammers.'
});

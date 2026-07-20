// maps/edge.js —— 灼界：碰到边界就掉血，逼所有人往中间挤
registerMap({
  id:'edge', name:'灼界', nameEn:'Searing Bounds',
  w:460, h:560, shape:'rect',
  obstacles:[], hazards:[],
  edgeDamage:16,          // 每次撞墙扣血（0.5秒冷却）
  desc:'四壁带电：撞到边界就掉血。没有安全的角落，所有人被逼进场地中央硬碰硬——放风筝会把自己撞死。',
  descEn:'Electrified walls: touching the boundary hurts. No safe corner — everyone is forced into the middle, and kiting into a wall kills you.'
});

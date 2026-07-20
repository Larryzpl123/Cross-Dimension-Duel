// maps/diamond.js —— 菱形擂台：四个尖角是死亡陷阱
registerMap({
  id:'diamond', name:'菱形擂台', nameEn:'Diamond Ring',
  w:560, h:560, shape:'diamond',
  obstacles:[], hazards:[{x:280, y:280, r:70, dps:9}],
  desc:'菱形场地，四个尖角又窄又深——被逼进角里几乎无处可逃。中央还有一片灼烧区，逼你在中圈和尖角之间取舍。',
  descEn:'A diamond arena whose four spikes are narrow dead ends — get cornered there and you are finished. A burning patch in the middle denies the safe centre.'
});

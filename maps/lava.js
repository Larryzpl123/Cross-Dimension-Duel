// maps/lava.js —— 熔岩坑：宽场，中央大熔岩 + 两处小熔泉
registerMap({
  id:'lava', name:'熔岩坑', nameEn:'Lava Pit',
  w:520, h:520, shape:'rect',
  obstacles:[],
  hazards:[
    {x:260, y:260, r:120, dps:12},
    {x:90,  y:90,  r:52,  dps:8},
    {x:430, y:430, r:52,  dps:8},
  ],
  desc:'中央一大片熔岩，对角还有两处小熔泉，站进去持续掉血。逼你在夹缝里周旋，回血/护盾流吃香。',
  descEn:'A large central lava pool plus two smaller vents on the diagonal — standing in them drains HP. Forces edge-play; healers and shields thrive.'
});

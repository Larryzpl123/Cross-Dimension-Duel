// maps/cross.js —— 十字回廊：四角封死成十字通道，中心四根小方柱
// 注：引擎无寻路，单位只会直线逼近，所以角块不能太大、通道必须够宽，否则会贴墙磨到超时
registerMap({
  id:'cross', name:'十字回廊', nameEn:'Cross Halls',
  w:520, h:520, shape:'rect',
  obstacles:[
    // 四角实心块（留出宽通道）
    {x:70,  y:70,  w:140, h:140}, {x:450, y:70,  w:140, h:140},
    {x:70,  y:450, w:140, h:140}, {x:450, y:450, w:140, h:140},
    // 中心四根小方柱
    {x:228, y:228, w:26, h:26}, {x:292, y:228, w:26, h:26},
    {x:228, y:292, w:26, h:26}, {x:292, y:292, w:26, h:26},
  ],
  hazards:[],
  desc:'四角封死只剩十字通道，正中立着四根小方柱。视线被切碎，走廊里贴脸遭遇战极多。',
  descEn:'The corners are walled off into a cross of corridors with four small pillars at the crossing. Sight lines break constantly — expect point-blank ambushes.'
});

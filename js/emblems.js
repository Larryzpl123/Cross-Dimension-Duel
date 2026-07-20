// js/emblems.js —— 角色图腾：每个主角一个独有符号，视频里一眼认出谁是谁
// 每个函数在球心 (0,0) 绘制，半径参数 r 已缩放好；调用方负责 translate 和描边色
const EMBLEMS = {
  // 基石：方岩
  rock(c,r){ c.beginPath(); c.rect(-r*.55,-r*.5,r*1.1,r); c.fill(); },
  // 纪宁：六剑环
  sword(c,r){ for(let i=0;i<6;i++){ const a=i*Math.PI/3;
    c.beginPath(); c.moveTo(Math.cos(a)*r*.3,Math.sin(a)*r*.3);
    c.lineTo(Math.cos(a)*r,Math.sin(a)*r); c.stroke(); } },
  // 萧炎：火焰
  flame(c,r){ c.beginPath(); c.moveTo(0,-r);
    c.quadraticCurveTo(r*.75,-r*.1, 0,r*.85);
    c.quadraticCurveTo(-r*.75,-r*.1, 0,-r); c.fill(); },
  // 韩立：重剑
  blade(c,r){ c.beginPath(); c.moveTo(0,-r); c.lineTo(r*.3,-r*.2);
    c.lineTo(r*.16,r*.9); c.lineTo(-r*.16,r*.9); c.lineTo(-r*.3,-r*.2); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-r*.6,-r*.15); c.lineTo(r*.6,-r*.15); c.stroke(); },
  // 石昊：太阳
  sun(c,r){ c.beginPath(); c.arc(0,0,r*.45,0,6.283); c.fill();
    for(let i=0;i<8;i++){ const a=i*Math.PI/4; c.beginPath();
      c.moveTo(Math.cos(a)*r*.62,Math.sin(a)*r*.62);
      c.lineTo(Math.cos(a)*r,Math.sin(a)*r); c.stroke(); } },
  // 唐三：蓝银草（缠绕藤蔓）
  silk(c,r){ for(const s of [-1,1]){ c.beginPath(); c.moveTo(0,-r);
    c.bezierCurveTo(s*r,-r*.4, -s*r,r*.4, 0,r); c.stroke(); } },
  // 罗峰：爆星
  starburst(c,r){ c.beginPath();
    for(let i=0;i<10;i++){ const a=i*Math.PI/5, rr=i%2? r*.36:r;
      i? c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr) : c.moveTo(Math.cos(a)*rr,Math.sin(a)*rr); }
    c.closePath(); c.fill(); },
  // 克莱恩：左轮弹巢
  gun(c,r){ c.beginPath(); c.arc(0,0,r*.85,0,6.283); c.stroke();
    for(let i=0;i<6;i++){ const a=i*Math.PI/3; c.beginPath();
      c.arc(Math.cos(a)*r*.5,Math.sin(a)*r*.5,r*.2,0,6.283); c.fill(); } },
  // 磐岳：岩盾（六边形）
  shield(c,r){ c.beginPath();
    for(let i=0;i<6;i++){ const a=i*Math.PI/3-Math.PI/2;
      i? c.lineTo(Math.cos(a)*r,Math.sin(a)*r) : c.moveTo(Math.cos(a)*r,Math.sin(a)*r); }
    c.closePath(); c.fill(); },
  // 赵千夜：獠牙
  fang(c,r){ for(const s of [-1,1]){ c.beginPath();
    c.moveTo(s*r*.5,-r*.6); c.lineTo(s*r*.2,r*.9); c.lineTo(s*r*.75,-r*.1); c.closePath(); c.fill(); } },
  // 林雷：闪电
  bolt(c,r){ c.beginPath(); c.moveTo(r*.25,-r); c.lineTo(-r*.4,r*.1);
    c.lineTo(r*.05,r*.1); c.lineTo(-r*.25,r); c.lineTo(r*.45,-r*.15);
    c.lineTo(0,-r*.15); c.closePath(); c.fill(); },
  // 方里：直死魔眼
  eye(c,r){ c.beginPath(); c.moveTo(-r,0); c.quadraticCurveTo(0,-r*.85,r,0);
    c.quadraticCurveTo(0,r*.85,-r,0); c.stroke();
    c.beginPath(); c.arc(0,0,r*.32,0,6.283); c.fill(); },
  // 叶凡：圣体（同心环）
  orb(c,r){ c.beginPath(); c.arc(0,0,r*.4,0,6.283); c.fill();
    c.beginPath(); c.arc(0,0,r*.75,0,6.283); c.stroke(); },
  // 秦牧：牧灵（叶）
  leaf(c,r){ c.beginPath(); c.moveTo(0,-r);
    c.quadraticCurveTo(r*.8,0, 0,r); c.quadraticCurveTo(-r*.8,0, 0,-r); c.fill();
    c.beginPath(); c.moveTo(0,-r); c.lineTo(0,r); c.stroke(); },
  // 王林：逆天箭
  arrow(c,r){ c.beginPath(); c.moveTo(0,-r); c.lineTo(r*.55,-r*.15);
    c.lineTo(r*.2,-r*.15); c.lineTo(r*.2,r); c.lineTo(-r*.2,r);
    c.lineTo(-r*.2,-r*.15); c.lineTo(-r*.55,-r*.15); c.closePath(); c.fill(); },
  // 古尘沙：符诏
  talisman(c,r){ c.beginPath(); c.rect(-r*.5,-r,r,r*2); c.stroke();
    c.beginPath(); c.moveTo(-r*.25,-r*.45); c.lineTo(r*.25,-r*.45);
    c.moveTo(0,-r*.45); c.lineTo(0,r*.5);
    c.moveTo(-r*.3,r*.5); c.lineTo(r*.3,r*.5); c.stroke(); },
  // 陆离：龙鳞
  dragon(c,r){ for(let i=0;i<3;i++){ c.beginPath();
    c.arc(0,r*.5-i*r*.5, r*.55, Math.PI, 0); c.stroke(); } },
  // 李七夜：不死（骷冠）
  skull(c,r){ c.beginPath(); c.arc(0,-r*.15,r*.62,Math.PI,0); c.fill();
    c.beginPath(); c.rect(-r*.45,-r*.15,r*.9,r*.55); c.fill();
    c.fillStyle='rgba(0,0,0,.75)';
    c.beginPath(); c.arc(-r*.22,-r*.2,r*.15,0,6.283); c.fill();
    c.beginPath(); c.arc(r*.22,-r*.2,r*.15,0,6.283); c.fill(); },
  // 时宇：兽爪
  paw(c,r){ c.beginPath(); c.arc(0,r*.3,r*.45,0,6.283); c.fill();
    for(let i=0;i<3;i++){ const a=-Math.PI/2+(i-1)*0.6;
      c.beginPath(); c.arc(Math.cos(a)*r*.6,Math.sin(a)*r*.6,r*.2,0,6.283); c.fill(); } },
  // 张衍：反震（对镜三角）
  mirror(c,r){ c.beginPath(); c.moveTo(0,-r); c.lineTo(r*.8,r*.1); c.lineTo(-r*.8,r*.1); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(0,r); c.lineTo(r*.8,-r*.1); c.lineTo(-r*.8,-r*.1); c.closePath(); c.stroke(); },
  // 苏铭：魔印
  rune(c,r){ c.beginPath(); c.arc(0,0,r*.8,0,6.283); c.stroke();
    c.beginPath(); c.moveTo(-r*.45,-r*.45); c.lineTo(r*.45,r*.45);
    c.moveTo(r*.45,-r*.45); c.lineTo(-r*.45,r*.45); c.stroke();
    c.beginPath(); c.arc(0,0,r*.22,0,6.283); c.fill(); },
  // 江南：教主冠
  crown(c,r){ c.beginPath(); c.moveTo(-r,r*.5); c.lineTo(-r*.7,-r*.6);
    c.lineTo(-r*.3,r*.05); c.lineTo(0,-r*.85); c.lineTo(r*.3,r*.05);
    c.lineTo(r*.7,-r*.6); c.lineTo(r,r*.5); c.closePath(); c.fill(); },
  // 方寒：永生（无限符）
  infinity(c,r){ c.beginPath(); c.arc(-r*.42,0,r*.42,0,6.283); c.stroke();
    c.beginPath(); c.arc(r*.42,0,r*.42,0,6.283); c.stroke(); },
  // 李越：时钟
  clock(c,r){ c.beginPath(); c.arc(0,0,r*.85,0,6.283); c.stroke();
    c.beginPath(); c.moveTo(0,0); c.lineTo(0,-r*.6);
    c.moveTo(0,0); c.lineTo(r*.45,r*.2); c.stroke(); },
  // 古月方源：春秋蝉
  cicada(c,r){ c.beginPath(); c.ellipse(0,r*.1,r*.32,r*.75,0,0,6.283); c.fill();
    for(const s of [-1,1]){ c.beginPath();
      c.ellipse(s*r*.5,-r*.05,r*.25,r*.6,s*0.5,0,6.283); c.stroke(); }
    c.beginPath(); c.arc(0,-r*.7,r*.22,0,6.283); c.fill(); },
  // 细胞博士：有丝分裂——两个正在分开的细胞，各带细胞核
  cell(c,r){ for(const s of [-1,1]){
    c.beginPath(); c.arc(s*r*.42,0,r*.55,0,6.283); c.stroke();   // 细胞膜
    c.beginPath(); c.arc(s*r*.42,0,r*.2,0,6.283); c.fill(); } }, // 细胞核
  // 召唤物通用：小圆点
  dot(c,r){ c.beginPath(); c.arc(0,0,r*.5,0,6.283); c.fill(); },
};
function drawEmblem(ctx, name, x, y, r, color){
  const fn = EMBLEMS[name]; if(!fn) return;
  ctx.save(); ctx.translate(x,y);
  ctx.fillStyle = color; ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, r*0.16); ctx.lineCap='round';
  fn(ctx, r); ctx.restore();
}

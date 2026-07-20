/* =====================================================================
   mechanics/mitosis.js —— 有丝分裂（哈利的细胞博士用）
   可插拔机制示例：完全用引擎钩子实现，不改 engine.js。角色写 mechanic:'mitosis' 即可用。

   —— 设计（第二版）——
   旧版「受伤不掉血、每次挨打就分裂」的问题：伤害被完全吞掉，AoE 打中也只是触发分裂，
   于是萧炎这种群攻角色反而杀不死他。改成：

     · 细胞正常掉血（AoE / 爆发 / 近战都真能打）
     · 每当整个菌落累计掉血跨过一档（splitFrac × 初始血量），分裂一次
     · 分裂 = 把当前血最多的细胞对半分成两个（血量守恒，不凭空变强）
     · 分裂次数封顶 maxSplits —— 所以最多 maxSplits+1 个细胞
     · 血量太低的细胞不再分裂；掉光即死

   这样：整个菌落总血就是「初始血量」，谁把这 100 点磨完谁赢；AoE 一次打多个细胞
   → 清得快（克制他）；纯单体 → 得逐个点掉（他强）。有来有回，不再是 0%/100%。

   参数（角色在 mechParams 里给）：
     splitFrac 0.20  每累计掉「初始血量的 20%」就分裂一次
     maxSplits 4     最多分裂次数（0.20×5=100%，第5档就死了，故 4 次有效）
     cap       8     并存细胞数硬上限（保险，正常达不到）
     dieHp     2     血量低于此的细胞不再参与分裂
     repel     150   分裂时母子互相弹开的速度
   ===================================================================== */

// 把某个菌落里血最多的细胞对半分裂出一个新细胞（血量守恒）
function mitosisSplit(col, p){
  const cells = fighters.filter(u => u.alive() && u.colony === col);
  if(!cells.length || cells.length >= (p.cap ?? 8)) return;
  cells.sort((a, b) => b.hp - a.hp);
  const m = cells[0];
  if(m.hp < (p.dieHp ?? 2)) return;           // 太少血，分了只是白送两个残血

  const h = m.hp / 2;
  m.hp = h;
  const u = new Fighter(m.c, m.team, m.x, m.y);
  u.colony = col;                              // 关键：共用同一个菌落状态（覆盖 init 新建的那个）
  u.hp = h;

  const a = Math.random() * 6.283, rp = p.repel ?? 150;
  m.vx = -Math.cos(a)*rp; m.vy = -Math.sin(a)*rp;
  u.vx =  Math.cos(a)*rp; u.vy =  Math.sin(a)*rp;
  u.x += Math.cos(a)*m.r; u.y += Math.sin(a)*m.r;
  spawnUnit(u);
}

registerMechanic('mitosis', {

  init(f, p){
    // 菌落共享状态：所有同源细胞引用同一个对象（分裂时手动传递）
    f.colony = {
      dmg: 0,                                  // 整个菌落累计承受的伤害
      splitsUsed: 0,
      maxSplits: p.maxSplits ?? 4,
      step: (p.splitFrac ?? 0.20) * f.maxHp,   // 每跨一个 step 就分裂
    };
  },

  // 受伤：正常掉血（AoE/爆发/近战都生效），并按累计掉血触发分裂
  onHurt(f, amt, p){
    if(f.markT > 0) amt *= f.markMul;                 // 保留苏铭·魔印放大，让他仍能克制
    if(recMode && amt >= 1) floaters.push({ x:f.x, y:f.y-f.r-4, v:amt, t:0.85 });
    f.hp -= amt;                                       // 真实掉血

    const col = f.colony;
    if(col){
      col.dmg += amt;
      while(col.splitsUsed < col.maxSplits && col.dmg >= (col.splitsUsed + 1) * col.step){
        col.splitsUsed++;
        mitosisSplit(col, p);
      }
    }
    return true;   // 已接管掉血（含分裂），引擎不再重复扣血
  },

  draw(f, ctx, p){
    // 细胞膜微光：血越满越亮，一堆细胞里看得出谁厚
    const frac = Math.max(0, Math.min(1, f.hp / (f.maxHp || 100)));
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r + 3, 0, 6.283);
    ctx.strokeStyle = `rgba(90,150,255,${0.22 + 0.5*frac})`;
    ctx.lineWidth = 2; ctx.stroke();
  },
});

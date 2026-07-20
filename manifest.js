/* =====================================================================
   manifest.js —— 全部内容清单。以后加角色 / 地图 / 机制，只改这一个文件。
   index.html 永久不用动（越不动越稳、兼容性越好）。

   加一个角色：在 characters/ 放好 xxx.js，然后把 'xxx' 加进下面 characters 数组。
   加一张地图：在 maps/ 放好 xxx.js，把 'xxx' 加进 maps 数组。
   加一个机制：在 mechanics/ 放好 xxx.js，把 'xxx' 加进 mechanics 数组
              （机制会在角色之前加载，这样角色文件可以直接引用它）。

   注意：数组里写的是「文件名去掉 .js」，不是路径。顺序 = 加载顺序。
   ===================================================================== */
window.GAME = {

  // 独立机制文件（mechanics/*.js）—— 复杂的、可被多个角色复用的机制放这里
  mechanics: [
    'mitosis',
  ],

  // 地图（maps/*.js）
  maps: [
    'arena', 'pillars', 'corridor', 'lava',
    'edge', 'round', 'diamond', 'cross',
  ],

  // 角色（characters/*.js）—— 顺序就是选人界面的默认顺序（界面会再按拼音排）
  characters: [
    'jishi', 'jining', 'xiaoyan', 'hanli', 'shihao', 'tangsan', 'luofeng',
    'klein', 'panyue', 'zhaoqianye', 'linlei', 'fangli', 'yefan', 'qinmu',
    'wanglin', 'guchensha', 'luli', 'liqiye', 'shiyu', 'zhangyan', 'suming',
    'jiangnan', 'fanghan', 'liyue', 'fangyuan',
    'drcell',        // 哈利加的：细胞博士
  ],
};

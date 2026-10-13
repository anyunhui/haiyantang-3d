// 课件内容与镜头。文字内容依据：故宫博物院、北京市文物局、中新网、维基百科等公开资料（见 README）
const DAWN = { skyTop: [0.10, 0.16, 0.34], skyHor: [1.0, 0.6, 0.4], sunCol: [1.0, 0.62, 0.36] };
const DAY = { skyTop: [0.13, 0.30, 0.62], skyHor: [0.80, 0.80, 0.80], sunCol: [1.0, 0.92, 0.8] };
const AFTER = { skyTop: [0.13, 0.26, 0.54], skyHor: [0.95, 0.76, 0.58], sunCol: [1.0, 0.8, 0.55] };
const DUSK = { skyTop: [0.02, 0.04, 0.12], skyHor: [0.5, 0.26, 0.3], sunCol: [1.0, 0.45, 0.25], stars: 0.5 };
const FIRE = { skyTop: [0.02, 0.008, 0.008], skyHor: [0.3, 0.06, 0.02], sunCol: [0.3, 0.08, 0.03], stars: 0.15 };
const NIGHT = { skyTop: [0.008, 0.014, 0.05], skyHor: [0.05, 0.08, 0.17], sunCol: [0.55, 0.65, 0.95], stars: 1 };

export const BASE = {
  exposure: 0.95, aperture: 0.00016, maxblur: 0.007, grain: 0.05, ca: 0.0025, vig: 0.85, god: 0.0,
  skyTop: DAY.skyTop, skyHor: DAY.skyHor, sunCol: DAY.sunCol, sunI: 2.2, sunEl: 0.6, sunAz: 2.6, hemi: 0.45, fog: 0.0045, stars: 0,
  dissolve: 0, ghost: 0, ash: 0, dust: 0.5, pipe: 0, dial: 0, window: 0, rim: 0.12, shafts: 0.25, fire: 0,
  diaspora: 0, status: 0, bodies: 1, rubble: 0, edgeCol: [4, 1.2, 0.25], rimCol: [1.0, 0.8, 0.55], dustCol: [1.0, 0.85, 0.6], dustRise: 0.25,
};

export const SLIDES = [
  { kicker: '圆明园 · 长春园 · 西洋楼', title: '海晏堂', sub: '十二生肖水力钟的记忆重构',
    body: ['一座西式楼宇，一池按时辰喷水的铜首人身像，', '一段跨越两个半世纪的流散与回归。'],
    mode: 'cycle', cam: { p: [-80, 22, 50], t: [-2, 7, 0], fov: 40 },
    fx: { ...DAWN, sunEl: 0.13, sunAz: 0.25, sunI: 2.2, god: 0.45, shafts: 0.45, hemi: 0.4, dust: 0.8 } },

  { kicker: '壹 · 缘起', title: '中西合璧的创举', sub: '乾隆十年至二十四年（1745—1759）',
    body: ['西洋楼位于长春园北端，由意大利人郎世宁、法国人蒋友仁、王致诚等欧洲传教士设计监造，中国工匠施工营建，共建成谐奇趣、海晏堂、大水法等“十景”。',
      '海晏堂是西洋楼中最大的一组建筑，建成于乾隆二十四年（1759）。“海晏”取“河清海晏”——天下太平之意。'],
    mode: 'cycle', cam: { p: [-46, 10, -42], t: [4, 8, 0], fov: 40 },
    fx: { ...AFTER, sunEl: 0.5, sunAz: 2.35, god: 0.0, shafts: 0.25 } },

  { kicker: '贰 · 建筑', title: '十一间楼与双弧阶梯', sub: '主楼面西 · 上下两层',
    body: ['主楼为上下两层的西式楼房，面阔十一间，正面朝西。', '楼前两道弧形石阶左右对称，自二层平台环抱而下，围合楼前的喷水池。',
      '巴洛克式的柱式、山花与栏杆，由中国匠人以石雕工艺完成。'],
    mode: 'cycle', cam: { p: [-38, 5, 9], t: [0, 8.5, 0], fov: 44 },
    fx: { ...AFTER, sunEl: 0.32, sunAz: 3.3, sunI: 3.0, god: 0, shafts: 0.15, rim: 0.2, aperture: 0.00012 } },

  { kicker: '叁 · 水源', title: '蓄水楼与“锡海”', sub: '工字形蓄水楼 · 约 180 吨',
    body: ['主楼之后为工字形蓄水楼，外观仍是一座西式洋楼。楼顶中心的大水池东西长 27.36 米、南北宽 5.72 米、深 1.44 米，可蓄水约 180 吨。',
      '池底与四壁满铺锡板以防渗漏，俗称“锡海”。水车将水提至高处，再借高差经铜管压送至各兽首喷口。',
      '蒋友仁去世后水车失修，改以人力提水。'],
    mode: 'cycle', labels: ['xihai'], cam: { p: [-22, 50, -52], t: [19, 7, 0], fov: 40 },
    fx: { ...DAY, sunEl: 1.05, sunAz: 2.2, pipe: 1, rim: 0.25, aperture: 0.0001, god: 0 } },

  { kicker: '肆 · 造像', title: '兽首人身 · 八字排列', sub: '铜首 · 石身 · 中空连水管',
    body: ['水池两岸各设六座石台，十二生肖像兽首人身：头部为红铜铸造，身躯为石雕袍服，中空连接喷水管。',
      '南岸：子鼠、寅虎、辰龙、午马、申猴、戌狗；北岸：丑牛、卯兔、巳蛇、未羊、酉鸡、亥猪。',
      '以中国人熟悉的生肖代替西方喷泉常见的裸体雕像，是中西文化交融的范例。'],
    mode: 'cycle', labels: ['zodiac'], cam: { p: [-30, 3.0, 0.5], t: [-9, 2.0, 0], fov: 40 },
    fx: { ...AFTER, sunEl: 0.28, sunAz: 2.5, aperture: 0.00034, maxblur: 0.009, rim: 0.18, god: 0 } },

  { kicker: '伍 · 计时', title: '十二时辰 · 水力钟', sub: '一个时辰 = 两小时',
    body: ['古人将一昼夜分为十二时辰，每个时辰合今两小时。', '每到一个时辰，对应的生肖像便口中喷水，水呈抛物线注入池中——人们观水即可知时，俗称“水力钟”。'],
    dyn: true, mode: 'clock', labels: ['zodiac', 'dial'], cam: { p: [-34, 16, 11], t: [-13.5, 2.5, 0], fov: 46 },
    fx: { ...DUSK, sunEl: 0.03, sunAz: 3.4, sunI: 1.2, hemi: 0.35, window: 1.2, dial: 1, dust: 0.4, rim: 0.2 } },

  { kicker: '陆 · 正午', title: '午时 · 十二齐鸣', sub: '正午时分，十二像同时喷水',
    body: ['每到正午，十二尊生肖像口中同时涌射喷泉，蔚为奇观。', '这是计时、水利机械与雕塑艺术的一次合奏。'],
    mode: 'all', cam: { p: [-37, 8.5, -6], t: [-12, 2.6, 0.5], fov: 48 },
    fx: { ...DAY, sunEl: 1.0, sunAz: 2.3, sunI: 2.4, exposure: 0.84, fog: 0.0028, hemi: 0.35, skyTop: [0.08, 0.22, 0.55], skyHor: [0.7, 0.72, 0.75], god: 0, aperture: 0.00022, dust: 0.9, shafts: 0.35 } },

  { kicker: '柒 · 劫火', title: '1860', sub: '英法联军劫掠焚毁圆明园',
    body: ['1860 年 10 月，英法联军闯入圆明园，劫掠文物、纵火焚园。', '十二生肖像身首分离，铜首被掠往海外，石雕人身至今下落不明。',
      '此后数十年间，西洋楼残存的石构又屡遭破坏与拆运。'],
    mode: 'none', cam: { p: [-52, 15, -34], t: [5, 8, 0], fov: 40 },
    fx: { ...FIRE, sunEl: -0.12, sunAz: 0.3, sunI: 0.6, hemi: 0.25, dissolve: 0.7, ash: 1, fire: 1, dust: 1.0, dustCol: [1.0, 0.45, 0.15], dustRise: 2.5, grain: 0.09, ca: 0.005, god: 0.0, shafts: 0, fog: 0.007, rim: 0.05 } },

  { kicker: '捌 · 流散', title: '流散与回归', sub: '七尊已归 · 一尊存疑 · 四尊未知',
    list: ['<b>牛首 · 虎首 · 猴首</b>　2000 年保利集团于香港拍卖会购回，藏保利艺术博物馆',
      '<b>猪首</b>　2003 年何鸿燊出资购回，捐赠保利艺术博物馆',
      '<b>马首</b>　2007 年何鸿燊购得，2019 年捐赠国家，2020 年 12 月划拨圆明园',
      '<b>鼠首 · 兔首</b>　2013 年法国皮诺家族捐赠，藏中国国家博物馆',
      '<b>龙首</b>　传在台湾或海外，未获官方确认',
      '<b>蛇首 · 羊首 · 鸡首 · 狗首</b>　至今下落不明'],
    mode: 'none', labels: ['status'], cam: { p: [-38, 12.5, 0], t: [-13, 11.5, 0], fov: 42 },
    fx: { ...NIGHT, sunEl: 0.5, sunAz: 2.8, sunI: 0.5, hemi: 0.25, dissolve: 0.74, diaspora: 1, status: 1, bodies: 0, rubble: 1, edgeCol: [0.12, 0.3, 0.6], aperture: 0.00025, dust: 0.8, dustCol: [0.6, 0.75, 1.0], rim: 0.1 } },

  { kicker: '终 · 今日', title: '残垣犹在', sub: '圆明园遗址公园',
    body: ['今天，海晏堂只余台基、水池与散落的石构，与东侧的大水法残迹一同静立于圆明园遗址公园。',
      '2020 年马首入藏圆明园，成为第一尊回到故园的兽首；2023 年牛、虎、猴、猪四首曾回到园中与马首重聚展出。',
      '铭记历史，等待十二生肖重聚。'],
    sources: true, mode: 'none', labels: ['dsf'], cam: { p: [-34, 42, 78], t: [26, 3, 0], fov: 40 },
    fx: { ...DAWN, sunEl: 0.1, sunAz: 0.1, sunI: 2.0, god: 0.4, shafts: 0.4, ghost: 0.55, status: 1, bodies: 0, rubble: 1, rimCol: [0.45, 0.85, 1.2], edgeCol: [0.4, 0.9, 1.5], dust: 0.7, rim: 0.0 } },
  { kicker: '附 · 致谢', title: '致谢 · Credits', sub: '模型、代码与资料来源',
    list: ['<b>建筑与十二生肖模型</b>　本课件以 Blender 4.2 Python 脚本程序化建模并导出 Draco 压缩 GLB；立面、双弧阶梯、贝壳龛与巴洛克山花参照一张公开照片（q3.itc.cn，搜狐图片），未嵌入该照片',
      '<b>Sketchfab「Old Summer Palace」合集（作者 Jiaojet）</b>　12 件兽首模型均未开放下载、未标注 CC 许可，故未使用',
      '<b>Three.js r160</b>　MIT License · three.js authors；<b>Draco 解码器</b>　Apache-2.0 · Google',
      '<b>Simplex / curl noise GLSL</b>　Ashima Arts · Stefan Gustavson（MIT）',
      '<b>史料</b>　故宫博物院 · 北京市文物局 · 中新网 · 澎湃新闻 · 北京市文物研究所 · 维基百科'],
    mode: 'cycle', cam: { p: [-58, 14, 34], t: [0, 9, 0], fov: 38 },
    fx: { ...AFTER, sunEl: 0.22, sunAz: 2.9, sunI: 2.4, god: 0, shafts: 0.3, aperture: 0.0001 } },
];
export const NUMERALS = ['序', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '终', '谢'];

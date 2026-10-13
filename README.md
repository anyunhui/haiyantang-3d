# 海晏堂 · 十二生肖水力钟 —— Three.js 三维课件

运行：在本目录启动任意静态服务器（如 `python3 -m http.server 8765`），浏览器打开 http://localhost:8765/ 。
Three.js r160 通过 importmap 从 unpkg CDN 加载，需联网；不依赖任何外部模型、贴图资源（全部程序化生成）。

操作：← → / 空格 / PageUp/PageDown / 点击左右半屏 切换；数字键 1–9、0 跳页；F 全屏；`?slide=N` 直达第 N 页；`?q=low` 低画质（关闭阴影与景深）。

## 页面
1 序·海晏堂　2 缘起（1745–1759，郎世宁、蒋友仁、王致诚）　3 建筑（十一间楼、面西、双弧阶梯）
4 水源（工字形蓄水楼、锡海 27.36×5.72×1.44 m、约 180 吨）　5 造像（兽首人身，八字排列）
6 水力钟（十二时辰轮流喷水）　7 午时十二齐鸣　8 1860 劫火（溶解 / 余烬）　9 流散与回归（7 归 1 疑 4 失）　10 今日残垣与大水法遗址

## 资料来源
- 故宫博物院·海晏堂大水法：https://www.dpm.org.cn/lemmas/244051.html
- 北京市文物局·马首回归：https://wwj.beijing.gov.cn/bjww/362760/362767/bwgxh/spzl/326076399/
- 中新网·七大兽首回归（2022）：https://www.chinanews.com.cn/cul/2022/07-28/9814058.shtml
- 中新网·蛇羊鸡狗首下落不明（2013）：https://www.chinanews.com.cn/cul/2013/04-27/4770701.shtml
- 澎湃新闻·海晏堂与大水法：https://www.thepaper.cn/newsDetail_forward_1750908
- 海晏堂蓄水楼考古（北京市文物研究所，转载）：http://www.hhh.gov.cn/article/951.html
- 维基百科·圆明园十二生肖兽首铜像：https://zh.wikipedia.org/wiki/圆明园十二生肖兽首铜像

## 说明
三维模型为依据文献的程序化“意象重构”，比例、细部与屋顶形式为示意，并非考古测绘复原。

---

## v2 更新：Blender 高精度模型

- `models/hall.glb`（约 381 KB，约 14 万三角面，Draco 压缩）由 `tools/blender/hall.py` 用 Blender 4.2 无头生成，参照公开照片（https://q3.itc.cn/q_70/images03/20260126/d659d4b27d2240788d7dfb4399efdf60.jpeg）。模型包含：
  - 巴洛克中央楼阁：壁柱、双柱、铁栅拱门、山花与徽章、栏杆与宝瓶、尖顶饰；
  - 两翼五孔拱廊，中式蓝琉璃庑殿顶，翼角起翘；
  - 双弧阶梯，带涡卷压顶与望柱宝瓶；
  - 台基与贝壳龛；
  - 涡卷 cartouche（装饰框）与顶部金色雕饰。
- `models/zodiac.glb`（约 502 KB）由 `tools/blender/zodiac.py` 生成：12 个兽首（体素重构、平滑、置换、布尔雕刻），以及袍服坐像身体。每个兽首都带一个 `mouth_<key>` 空物体，JS 据此计算喷口位置，水柱从兽首口中喷出。
- JS 用 GLTFLoader + DRACOLoader 加载模型，解码器本地化在 `vendor/draco/`。网格按材质名替换为带溶解、边缘光、透视等补丁的着色器，屋顶带程序化瓦垄。模型加载失败时自动回退到程序化几何；`?procedural` 参数强制使用程序化版本。
- `shots/compare.png`：参考照片与 Blender Cycles 渲染（`tools/blender/render.py`）的并排对比。

## Sketchfab 状态

合集 https://sketchfab.com/Jiaojet/collections/old-summer-palace-734ed3693628429082f2368c383c29be 中有 12 件兽首模型，作者均为 Jiaojet：

| 兽首 | UID |
|---|---|
| Rat | 6e8230254fd14b59b99bdc7224649b71 |
| Ox | 05f0a82266374dd39884f8d8e50fa1ce |
| Tiger | 7703c574865b404283b006bb0195aff5 |
| Rabbit | e1bd524b287d48c3bb0836e4777f296a |
| Dragon | 44f779dcafbd48daab3214c8b199cfa1 |
| Snake | f48481f6b3b1406cba5e28ec64adff08 |
| Horse | f914b86778fb44cba067a4f17981812e |
| Goat | b53845a177614edeb859cafa55ca4a40 |
| Monkey | 4862594fcb17419fa6d10f74ecdd8ad5 |
| Rooster | 281740b97514435185050a505ab09eb8 |
| Dog | 3f4dc88a64ee41d6be3ae82b403199d3 |
| Boar | 97b5bff3b683415394a65e2f35ab925b |

公开 API 显示这 12 件模型均为 `isDownloadable: false`，没有标注任何许可证（不是 CC）。下载接口在未登录时返回 401，需要 Sketchfab 登录或 API token，即便登录，作者未开放下载也无法获取。我们没有绕过限制，本项目也没有使用这些模型，兽首全部为自建模型。

## 致谢与许可

- Three.js（MIT）
- Draco 解码器（Apache-2.0，Google）
- Ashima Arts / Stefan Gustavson simplex noise（MIT）
- 建筑与兽首模型为本项目原创，用 Blender 脚本生成。
- 参考照片仅用于对照，未打包进课件页面。

## v3 更新：移除泛光（Bloom）

后期链现为 RenderPass → BokehPass（景深）→ NaN 防护 → OutputPass → 自定义收尾通道（上帝光、色差、轻度对比 1.08 / 饱和 1.1、胶片颗粒、暗角）。已删除 UnrealBloomPass 及所有 bloom 参数。为弥补亮度：
- 基础曝光 0.82 → 0.95，正午页 0.72 → 0.84；
- 溶解边缘自发光 ×1.67；
- 幽灵轮廓光 ×1.2；
- 窗光 ×1.4；
- 兽首辉光 ×1.4。

## v4 更新：高清渲染

- 像素比：默认 `min(devicePixelRatio, 2)`（之前上限为 1.5）；`?q=ultra` 时上限为 3，阴影贴图提升到 4096；`?q=low` 固定 1x。
- 后期合成器的渲染目标按像素比分配，并启用 4× MSAA（之前没有抗锯齿）。
- 景深收敛：光圈 ×0.7、最大模糊 ×0.65，只柔化远景。
- 色差改为只在画面边缘出现（中心无偏移），强度 ×0.45；颗粒 ×0.6，并按物理像素生成。
- 新增 4 邻域轻度锐化（0.32）。
- 程序化屋顶纹理 512px，各向异性 8。
- 界面文字启用抗锯齿字体平滑。
- 自适应画质：平均帧率低于约 28 fps 时，每 2 秒把像素比降 0.25（最低 1x）；帧率高于 55 fps 时再逐级升回。`?fixed` 参数或自动化测试时锁定像素比。

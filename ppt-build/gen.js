// Cybersecurity business quick-start PPT generator
const pptxgen = require("pptxgenjs");
const path = require("path");

const IMG_DIR = "D:/Programs/blog-source/source/images";
const OUT = "D:/Programs/blog-source/ppt-build/网络安全业务快速入门.pptx";

// ---- Palette (content-informed: red=attack/blue=defense/cyan=cyber accent) ----
const C = {
  DARK_BG: "0B1426",      // deep midnight navy (title/closing)
  NAVY: "102240",         // primary navy
  NAVY2: "1B2C4D",        // card navy on dark
  RED: "DC2626",          // red team / attack
  RED_SOFT: "FEE2E2",
  BLUE: "2563EB",         // blue team / defense
  BLUE_SOFT: "DBEAFE",
  CYAN: "06B6D4",         // cyber accent
  CYAN_SOFT: "CFFAFE",
  GREEN: "16A34A",
  GREEN_SOFT: "DCFCE7",
  AMBER: "D97706",
  AMBER_SOFT: "FEF3C7",
  LIGHT: "F1F5F9",        // light content bg
  CARD: "FFFFFF",
  CARD2: "F8FAFC",
  TEXT: "1E293B",
  TEXT_INV: "F8FAFC",
  MUTED: "64748B",
  MUTED2: "94A3B8",
  BORDER: "E2E8F0",
};

const F = {
  TITLE: "Calibri",
  HEAD: "Calibri",
  BODY: "Calibri",
  MONO: "Consolas",
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
pres.author = "网络安全业务";
pres.title = "网络安全业务快速入门";

const W = 13.333, H = 7.5;

// ---------- helpers ----------
function bg(slide, color) { slide.background = { color }; }

function header(slide, opts) {
  // kicker (small section label) + title
  const { kicker, title, accent = C.CYAN, dark = false } = opts;
  const titleColor = dark ? C.TEXT_INV : C.TEXT;
  const mutedColor = dark ? C.MUTED2 : C.MUTED;
  if (kicker) {
    slide.addText(kicker.toUpperCase(), {
      x: 0.6, y: 0.45, w: 8, h: 0.32,
      fontFace: F.BODY, fontSize: 12, bold: true, color: accent,
      charSpacing: 4, margin: 0,
    });
  }
  slide.addText(title, {
    x: 0.6, y: 0.78, w: 12.1, h: 0.7,
    fontFace: F.TITLE, fontSize: 30, bold: true, color: titleColor, margin: 0,
  });
}

function numCircle(slide, x, y, d, num, fill, txtColor = C.TEXT_INV) {
  slide.addShape(pres.shapes.OVAL, {
    x, y, w: d, h: d, fill: { color: fill },
    line: { type: "none" },
  });
  slide.addText(String(num), {
    x, y, w: d, h: d, fontFace: F.HEAD, fontSize: 16, bold: true,
    color: txtColor, align: "center", valign: "middle", margin: 0,
  });
}

function tag(slide, x, y, w, h, text, fill, txtColor) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, fill: { color: fill }, line: { type: "none" }, rectRadius: 0.08,
  });
  slide.addText(text, {
    x, y, w, h, fontFace: F.BODY, fontSize: 10, bold: true,
    color: txtColor, align: "center", valign: "middle", margin: 0,
  });
}

// footer page number
function pageFooter(slide, n, total, dark = false) {
  const col = dark ? C.MUTED2 : C.MUTED;
  slide.addText(`${n} / ${total}`, {
    x: W - 1.4, y: H - 0.45, w: 1.0, h: 0.3,
    fontFace: F.BODY, fontSize: 9, color: col, align: "right", margin: 0,
  });
}

const TOTAL = 24;

// ============================================================
// Slide 1 — Title
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.DARK_BG);
  // ambient grid dots
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 4; j++) {
      s.addShape(pres.shapes.OVAL, {
        x: 1 + i * 1.7, y: 5.6 + j * 0.35, w: 0.05, h: 0.05,
        fill: { color: C.CYAN, transparency: 70 }, line: { type: "none" },
      });
    }
  }
  // accent vertical column of three blocks (red/blue/cyan) - motif, not a stripe
  const blocks = [C.RED, C.BLUE, C.CYAN];
  blocks.forEach((c, i) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.9, y: 2.0 + i * 0.55, w: 0.5, h: 0.4,
      fill: { color: c }, line: { type: "none" }, rectRadius: 0.08,
    });
  });
  s.addText("CYBER SECURITY", {
    x: 1.7, y: 2.0, w: 9, h: 0.5,
    fontFace: F.BODY, fontSize: 14, bold: true, color: C.CYAN,
    charSpacing: 6, valign: "middle", margin: 0,
  });
  s.addText("网络安全业务", {
    x: 0.9, y: 3.0, w: 11.5, h: 1.2,
    fontFace: F.TITLE, fontSize: 60, bold: true, color: C.TEXT_INV, margin: 0,
  });
  s.addText("快 速 入 门", {
    x: 0.9, y: 4.15, w: 11.5, h: 0.9,
    fontFace: F.TITLE, fontSize: 40, color: C.CYAN, margin: 0,
  });
  s.addText("攻防视角 · 流程拆解 · 业务全景", {
    x: 0.9, y: 5.15, w: 11, h: 0.5,
    fontFace: F.BODY, fontSize: 16, color: C.MUTED2, margin: 0,
  });
  s.addShape(pres.shapes.LINE, {
    x: 0.9, y: 5.95, w: 2.2, h: 0, line: { color: C.CYAN, width: 2 },
  });
  s.addText("红队 · 蓝队 · 合规 · 开发安全", {
    x: 0.9, y: 6.1, w: 11, h: 0.4,
    fontFace: F.BODY, fontSize: 13, color: C.MUTED2, margin: 0,
  });
}

// ============================================================
// Slide 2 — Overview: four segments + panorama image
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker: "01 · 业务全景", title: "网络安全业务四大板块", accent: C.CYAN });
  s.addText("按视角划分：攻击、防御、合规管理、开发安全 — 覆盖安全业务全生命周期", {
    x: 0.6, y: 1.5, w: 12, h: 0.4, fontFace: F.BODY, fontSize: 14, color: C.MUTED, margin: 0,
  });

  // left: 4 segment cards
  const cards = [
    { t: "攻击视角", sub: "红队技术", c: C.RED, cs: C.RED_SOFT, items: "渗透测试 · 代码审计\n漏洞挖掘 · 红蓝对抗 · 众测", n: "1" },
    { t: "防御视角", sub: "蓝队技术", c: C.BLUE, cs: C.BLUE_SOFT, items: "SOC 运维 · 应急响应\n威胁情报 · 日志/SIEM", n: "2" },
    { t: "合规与管理", sub: "合规视角", c: C.CYAN, cs: C.CYAN_SOFT, items: "等保测评 · 风险评估\n安全咨询/方案设计", n: "3" },
    { t: "开发安全", sub: "左移视角", c: C.GREEN, cs: C.GREEN_SOFT, items: "SDL 安全开发\nDevSecOps 自动化", n: "4" },
  ];
  const lx = 0.6, lw = 6.1;
  const cw = (lw - 0.25) / 2, ch = 2.15, gap = 0.25;
  cards.forEach((cd, i) => {
    const r = Math.floor(i / 2), col = i % 2;
    const x = lx + col * (cw + gap);
    const y = 2.05 + r * (ch + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w: cw, h: ch, fill: { color: C.CARD },
      line: { color: C.BORDER, width: 1 }, rectRadius: 0.12,
      shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.10 },
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.25, y: y + 0.25, w: 0.85, h: 0.85, fill: { color: cd.cs },
      line: { type: "none" }, rectRadius: 0.16,
    });
    numCircle(s, x + 0.42, y + 0.42, 0.52, cd.n, cd.c);
    s.addText(cd.t, {
      x: x + 0.25, y: y + 1.2, w: cw - 0.5, h: 0.4, fontFace: F.HEAD, fontSize: 16, bold: true, color: C.TEXT, margin: 0,
    });
    s.addText(cd.sub, {
      x: x + 0.25, y: y + 1.58, w: cw - 0.5, h: 0.28, fontFace: F.BODY, fontSize: 11, color: cd.c, bold: true, margin: 0,
    });
    s.addText(cd.items, {
      x: x + 0.25, y: y + 1.86, w: cw - 0.5, h: 0.28, fontFace: F.BODY, fontSize: 9.5, color: C.MUTED, margin: 0,
    });
  });

  // right: panorama image
  const ix = 6.95, iw = W - ix - 0.6, ih = 4.45;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: ix, y: 2.05, w: iw, h: ih, fill: { color: C.CARD },
    line: { color: C.BORDER, width: 1 }, rectRadius: 0.12,
    shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.10 },
  });
  s.addImage({
    path: path.join(IMG_DIR, "Gemini_Generated_Image_xmrm6gxmrm6gxmrm.png"),
    x: ix + 0.15, y: 2.2, w: iw - 0.3, h: ih - 0.6,
    sizing: { type: "contain", w: iw - 0.3, h: ih - 0.6 },
  });
  s.addText("网络安全业务全景图", {
    x: ix, y: 2.2 + ih - 0.55, w: iw, h: 0.35, fontFace: F.BODY, fontSize: 11, italic: true,
    color: C.MUTED, align: "center", margin: 0,
  });
  pageFooter(s, 2, TOTAL);
}

// ============================================================
// Slide 3 — Red team: attack businesses
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker: "02 · 攻击视角", title: "红队技术 — 主动发现并验证漏洞", accent: C.RED });
  const rows = [
    ["渗透测试", "模拟黑客攻击，对目标系统进行受控测试，发现并验证安全漏洞"],
    ["代码审计", "审查源代码中的安全缺陷（SQL注入、XSS、反序列化等），白盒视角"],
    ["漏洞挖掘", "研究软件/系统，发现未知漏洞（0day），聚焦前沿攻防"],
    ["红蓝对抗", "渗透测试的升级版，模拟真实 APT 攻击，实战化演练"],
    ["安全众测/Bug Bounty", "通过众包平台邀请白帽子对产品进行测试，按漏洞付费"],
  ];
  const y0 = 1.65, rh = 0.92, cw = 3.4, dw = 9.0;
  rows.forEach((r, i) => {
    const y = y0 + i * (rh + 0.12);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y, w: W - 1.2, h: rh, fill: { color: C.CARD },
      line: { color: C.BORDER, width: 1 }, rectRadius: 0.08,
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y, w: cw, h: rh, fill: { color: C.RED_SOFT },
      line: { type: "none" }, rectRadius: 0.08,
    });
    s.addText(r[0], {
      x: 0.85, y, w: cw - 0.4, h: rh, fontFace: F.HEAD, fontSize: 16, bold: true,
      color: C.RED, valign: "middle", margin: 0,
    });
    s.addText(r[1], {
      x: 0.6 + cw + 0.25, y, w: dw - cw - 0.5, h: rh, fontFace: F.BODY, fontSize: 13,
      color: C.TEXT, valign: "middle", margin: 0,
    });
  });
  pageFooter(s, 3, TOTAL);
}

// ============================================================
// Slide 4 — Blue team + compliance + dev (combined three panels)
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker: "03 · 防御 / 合规 / 开发", title: "蓝队、合规管理与开发安全", accent: C.BLUE });

  const panels = [
    {
      c: C.BLUE, cs: C.BLUE_SOFT, t: "防御视角 · 蓝队",
      items: [
        ["SOC 安全运维", "7×24 监控日志、告警分析、日常巡检"],
        ["应急响应", "事件后止损、根除、溯源、恢复"],
        ["威胁情报", "收集分析攻击者 TTPs、IOC 预警"],
        ["日志/SIEM/态势感知", "大数据+规则引擎发现异常行为"],
      ],
    },
    {
      c: C.CYAN, cs: C.CYAN_SOFT, t: "合规与管理视角",
      items: [
        ["等保测评", "网络安全等级保护测评，国家合规要求"],
        ["风险评估", "识别资产→分析威胁→评估脆弱性→计算风险"],
        ["安全咨询/方案设计", "设计安全架构、制定安全策略"],
      ],
    },
    {
      c: C.GREEN, cs: C.GREEN_SOFT, t: "开发安全视角",
      items: [
        ["SDL / 安全开发", "在软件开发生命周期每个阶段嵌入安全活动"],
        ["DevSecOps", "将安全自动化融入 CI/CD 流水线"],
      ],
    },
  ];
  const pw = 3.95, ph = 5.1, gap = 0.3;
  const startX = (W - (pw * 3 + gap * 2)) / 2;
  const y0 = 1.55;
  panels.forEach((p, i) => {
    const x = startX + i * (pw + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: y0, w: pw, h: ph, fill: { color: C.CARD },
      line: { color: C.BORDER, width: 1 }, rectRadius: 0.12,
      shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.10 },
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.3, y: y0 + 0.3, w: pw - 0.6, h: 0.55, fill: { color: p.cs },
      line: { type: "none" }, rectRadius: 0.1,
    });
    s.addText(p.t, {
      x: x + 0.3, y: y0 + 0.3, w: pw - 0.6, h: 0.55, fontFace: F.HEAD, fontSize: 15, bold: true,
      color: p.c, align: "center", valign: "middle", margin: 0,
    });
    const iy0 = y0 + 1.05;
    p.items.forEach((it, j) => {
      const iy = iy0 + j * 1.0;
      s.addText(it[0], {
        x: x + 0.3, y: iy, w: pw - 0.6, h: 0.32,
        fontFace: F.HEAD, fontSize: 13, bold: true, color: C.TEXT, margin: 0,
      });
      s.addText(it[1], {
        x: x + 0.3, y: iy + 0.32, w: pw - 0.6, h: 0.6,
        fontFace: F.BODY, fontSize: 11, color: C.MUTED, valign: "top", margin: 0,
      });
    });
  });
  pageFooter(s, 4, TOTAL);
}

// ============================================================
// Slide 5 — PTES overview flow (7 stages)
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker: "04 · 渗透测试流程", title: "PTES 标准 — 7 大阶段（通常 1~4 周）", accent: C.RED });
  const stages = ["前期交互", "信息收集", "威胁建模", "漏洞分析", "渗透攻击", "后渗透利用", "报告撰写"];
  const colors = [C.RED, C.AMBER, C.CYAN, C.BLUE, C.RED, C.AMBER, C.GREEN];
  const n = stages.length;
  const fw = 1.55, gap = 0.2;
  const total = fw * n + gap * (n - 1);
  const startX = (W - total) / 2;
  const y = 2.4;
  stages.forEach((st, i) => {
    const x = startX + i * (fw + gap);
    const c = colors[i];
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w: fw, h: 1.5, fill: { color: c },
      line: { type: "none" }, rectRadius: 0.12,
    });
    s.addText(String(i + 1), {
      x, y: y + 0.18, w: fw, h: 0.5, fontFace: F.HEAD, fontSize: 28, bold: true,
      color: C.TEXT_INV, align: "center", margin: 0,
    });
    s.addText(st, {
      x, y: y + 0.85, w: fw, h: 0.5, fontFace: F.HEAD, fontSize: 14, bold: true,
      color: C.TEXT_INV, align: "center", margin: 0,
    });
    if (i < n - 1) {
      s.addShape(pres.shapes.RIGHT_TRIANGLE, {
        x: x + fw + 0.02, y: y + 0.6, w: 0.16, h: 0.3,
        fill: { color: C.MUTED2 }, line: { type: "none" }, rotate: 90,
      });
    }
  });
  // phase group labels
  const groups = [
    { t: "准备与侦察", from: 0, to: 2, c: C.RED_SOFT },
    { t: "分析与突破", from: 3, to: 5, c: C.BLUE_SOFT },
    { t: "交付", from: 6, to: 6, c: C.GREEN_SOFT },
  ];
  groups.forEach(g => {
    const x1 = startX + g.from * (fw + gap);
    const x2 = startX + g.to * (fw + gap) + fw;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x1, y: 4.35, w: x2 - x1, h: 0.5, fill: { color: g.c },
      line: { type: "none" }, rectRadius: 0.08,
    });
    s.addText(g.t, {
      x: x1, y: 4.35, w: x2 - x1, h: 0.5, fontFace: F.BODY, fontSize: 12, bold: true,
      color: C.TEXT, align: "center", valign: "middle", margin: 0,
    });
  });
  s.addText("前期交互 → 信息收集 → 威胁建模 → 漏洞分析 → 渗透攻击 → 后渗透利用 → 报告撰写", {
    x: 0.6, y: 5.3, w: W - 1.2, h: 0.4, fontFace: F.MONO, fontSize: 11,
    color: C.MUTED, align: "center", margin: 0,
  });
  s.addText("前期交互明确边界签授权；信息收集扩大攻击面；威胁建模规划路径；漏洞分析自动化+手工验证；渗透攻击获取初始权限；后渗透扩大战果提权；报告转化为可落地方案。", {
    x: 0.9, y: 5.85, w: W - 1.8, h: 1.0, fontFace: F.BODY, fontSize: 12,
    color: C.TEXT, valign: "top", margin: 0,
  });
  pageFooter(s, 5, TOTAL);
}

// helper for a generic "phase detail" slide with a list of {label, desc} items
function phaseSlide(n, kicker, title, accent, intro, items, opts = {}) {
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker, title, accent });
  if (intro) {
    s.addText(intro, {
      x: 0.6, y: 1.5, w: W - 1.2, h: 0.45, fontFace: F.BODY, fontSize: 13,
      color: C.MUTED, margin: 0,
    });
  }
  const y0 = intro ? 2.05 : 1.7;
  const perRow = opts.perRow || 2;
  const rh = opts.rh || 1.5;
  const gap = 0.2;
  const cw = (W - 1.2 - gap * (perRow - 1)) / perRow;
  items.forEach((it, i) => {
    const r = Math.floor(i / perRow);
    const col = i % perRow;
    const x = 0.6 + col * (cw + gap);
    const y = y0 + r * (rh + 0.2);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w: cw, h: rh, fill: { color: C.CARD },
      line: { color: C.BORDER, width: 1 }, rectRadius: 0.1,
      shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.08 },
    });
    numCircle(s, x + 0.25, y + 0.25, 0.45, i + 1, accent);
    s.addText(it.label, {
      x: x + 0.85, y: y + 0.22, w: cw - 1.1, h: 0.5, fontFace: F.HEAD, fontSize: 14, bold: true,
      color: C.TEXT, valign: "middle", margin: 0,
    });
    s.addText(it.desc, {
      x: x + 0.3, y: y + 0.8, w: cw - 0.6, h: rh - 0.95, fontFace: F.BODY, fontSize: 11.5,
      color: C.TEXT, valign: "top", margin: 0,
    });
  });
  pageFooter(s, n, TOTAL);
  return s;
}

// ============================================================
// Slide 6 — PTES Stage 1: Pre-engagement
// ============================================================
phaseSlide(6, "04.1 · 渗透测试 / 阶段一", "前期交互 — 明确边界，签授权", C.RED,
  "目标：明确测试边界，白纸黑字签授权。「合法渗透」与「非法入侵」的分界线。",
  [
    { label: "确定测试范围", desc: "哪些 IP 段、域名、子网、外网/内网？哪些系统、API、APP？" },
    { label: "确定测试规则", desc: "测试时间窗口（避开业务高峰）、是否允许提权、能否改/传数据、能否社工钓鱼" },
    { label: "确定测试类型", desc: "黑盒（零知识，模拟外部攻击）、白盒（全知识，内部审计）、灰盒（部分知识，最常见）" },
    { label: "签署授权书", desc: "法律保障 —— 这是合法与非法的分界线" },
    { label: "确认联系人", desc: "24 小时紧急联系方式 —— 一旦搞出故障能立刻沟通" },
  ]);

// ============================================================
// Slide 7 — PTES Stage 2: Information Gathering (passive)
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker: "04.2 · 渗透测试 / 阶段二", title: "信息收集 — 被动收集（不接触目标）", accent: C.RED });
  s.addText("目标：尽可能多获取目标信息，攻击面越大成功率越高。被动收集利用公开资源，不留痕迹。", {
    x: 0.6, y: 1.5, w: W - 1.2, h: 0.45, fontFace: F.BODY, fontSize: 13, color: C.MUTED, margin: 0,
  });
  const rows = [
    ["WHOIS 查询", "域名注册信息、注册邮箱、DNS 服务器", "whois / 站长工具"],
    ["DNS 信息", "A/CNAME/MX/TXT/NS 记录，发现关联域名", "dig, nslookup, dnsdumpster"],
    ["子域名挖掘", "爆破二/三级域名，证书透明度 CT 日志查询", "Subfinder, OneForAll, crt.sh"],
    ["搜索引擎侦查", "Google Hacking，GitHub 搜寻泄露密码/配置/源码", "Google Dork, GitHub Search"],
    ["网络空间测绘", "在互联网资产搜索引擎中检索暴露面", "Shodan, Fofa, ZoomEye, Censys"],
    ["社工信息收集", "领英/脉脉查员工，天眼查/企查查查企业架构", "社交媒体 / 企业信息平台"],
    ["历史数据", "Wayback Machine 历史页面、历史漏洞公告", "archive.org, exploit-db"],
    ["JS/前端信息泄露", "从 JS 提取 API 端点、隐藏路径、AccessKey", "LinkFinder, JSFinder, 手工审查"],
  ];
  const y0 = 2.0, rh = 0.5, gap = 0.08;
  rows.forEach((r, i) => {
    const y = y0 + i * (rh + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y, w: W - 1.2, h: rh, fill: { color: i % 2 ? C.CARD2 : C.CARD },
      line: { color: C.BORDER, width: 1 }, rectRadius: 0.06,
    });
    s.addText(r[0], {
      x: 0.8, y, w: 2.6, h: rh, fontFace: F.HEAD, fontSize: 12, bold: true,
      color: C.RED, valign: "middle", margin: 0,
    });
    s.addText(r[1], {
      x: 3.4, y, w: 6.3, h: rh, fontFace: F.BODY, fontSize: 11,
      color: C.TEXT, valign: "middle", margin: 0,
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: W - 3.4, y: y + 0.06, w: 2.55, h: rh - 0.12, fill: { color: C.RED_SOFT },
      line: { type: "none" }, rectRadius: 0.06,
    });
    s.addText(r[2], {
      x: W - 3.4, y, w: 2.55, h: rh, fontFace: F.MONO, fontSize: 9.5, bold: true,
      color: C.RED, align: "center", valign: "middle", margin: 0,
    });
  });
  pageFooter(s, 7, TOTAL);
}

// ============================================================
// Slide 8 — Information Gathering (active)
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker: "04.2 · 渗透测试 / 阶段二", title: "信息收集 — 主动收集（直接交互，留痕）", accent: C.RED });
  const rows = [
    ["主机发现", "探测哪些 IP 存活（ICMP/ARP/TCP ACK）", "Nmap -sn, fping"],
    ["端口扫描", "扫描开放端口识别服务（SYN 隐蔽/Connect 稳定）", "Nmap -sS/sT, Masscan"],
    ["服务/版本识别", "识别端口上运行的具体服务及版本号", "Nmap -sV"],
    ["操作系统识别", "通过 TCP/IP 协议栈指纹判断 OS", "Nmap -O, p0f"],
    ["Web 指纹识别", "CMS、Web 框架、中间件识别", "WhatWeb, Wappalyzer, EHole"],
    ["目录/文件扫描", "扫描后台入口、备份/配置文件、.git 泄露", "dirsearch, gobuster, ffuf"],
    ["CDN 识别与绕过", "判断是否用 CDN，多地 Ping/DNS 历史找真实 IP", "多地 Ping, DNSDB, 证书查询"],
  ];
  const y0 = 1.65, rh = 0.6, gap = 0.12;
  rows.forEach((r, i) => {
    const y = y0 + i * (rh + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y, w: W - 1.2, h: rh, fill: { color: i % 2 ? C.CARD2 : C.CARD },
      line: { color: C.BORDER, width: 1 }, rectRadius: 0.06,
    });
    s.addText(r[0], {
      x: 0.8, y, w: 2.6, h: rh, fontFace: F.HEAD, fontSize: 13, bold: true,
      color: C.RED, valign: "middle", margin: 0,
    });
    s.addText(r[1], {
      x: 3.4, y, w: 6.3, h: rh, fontFace: F.BODY, fontSize: 11.5,
      color: C.TEXT, valign: "middle", margin: 0,
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: W - 3.4, y: y + 0.09, w: 2.55, h: rh - 0.18, fill: { color: C.RED_SOFT },
      line: { type: "none" }, rectRadius: 0.06,
    });
    s.addText(r[2], {
      x: W - 3.4, y, w: 2.55, h: rh, fontFace: F.MONO, fontSize: 10, bold: true,
      color: C.RED, align: "center", valign: "middle", margin: 0,
    });
  });
  s.addText("常见产出物：资产清单（IP/域名/端口）、网络拓扑草图、Web 站点列表、员工邮箱列表", {
    x: 0.6, y: 6.7, w: W - 1.2, h: 0.4, fontFace: F.BODY, fontSize: 12, bold: true,
    color: C.NAVY, align: "center", margin: 0,
  });
  pageFooter(s, 8, TOTAL);
}

// ============================================================
// Slide 9 — PTES Stage 3: Threat Modeling
// ============================================================
phaseSlide(9, "04.3 · 渗透测试 / 阶段三", "威胁建模 — 确定从哪里下手", C.AMBER,
  "目标：基于收集到的信息，分析可能的攻击面，规划攻击路径。",
  [
    { label: "攻击面分析", desc: "哪些端口暴露在外？哪些服务有公开漏洞？哪些 Web 入口可控？" },
    { label: "业务逻辑分析", desc: "Web 应用有哪些功能模块（登录/注册/上传/支付等），每个功能点可能存在什么安全问题？" },
    { label: "权限边界分析", desc: "内网/外网边界在哪？DMZ 区与核心区的网络隔离情况？" },
    { label: "攻击路径规划", desc: "画出一到多条攻击链：入口点 → 初始突破 → 提权 → 横向移动 → 抵达核心目标" },
  ]);

// ============================================================
// Slide 10 — PTES Stage 4: Vulnerability Analysis
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker: "04.4 · 渗透测试 / 阶段四", title: "漏洞分析 — 自动化 + 手工结合", accent: C.BLUE });
  s.addText("目标：自动化+手工结合，发现系统存在的安全漏洞。", {
    x: 0.6, y: 1.5, w: W - 1.2, h: 0.4, fontFace: F.BODY, fontSize: 13, color: C.MUTED, margin: 0,
  });
  const rows = [
    ["漏洞扫描", "全量自动化扫描，发现已知漏洞（CVE、弱口令、配置缺陷）", "Nessus, OpenVAS, AWVS"],
    ["Web 专项扫描", "针对 SQL 注入、XSS、CSRF、SSRF 等 OWASP Top 10", "Xray, Nuclei, Burp 主动扫描"],
    ["弱口令爆破", "对 SSH/RDP/MySQL/FTP/Web 后台等检测弱口令", "Hydra, Medusa, SuperWeakPass"],
    ["手工验证", "对扫描结果逐条手工确认 —— 自动化误报率高，必须人工", "Burp Repeater, SQLMap, 手工 Payload"],
  ];
  const y0 = 2.05, rh = 0.62, gap = 0.1;
  rows.forEach((r, i) => {
    const y = y0 + i * (rh + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y, w: W - 1.2, h: rh, fill: { color: i % 2 ? C.CARD2 : C.CARD },
      line: { color: C.BORDER, width: 1 }, rectRadius: 0.06,
    });
    s.addText(r[0], {
      x: 0.8, y, w: 2.4, h: rh, fontFace: F.HEAD, fontSize: 13, bold: true,
      color: C.BLUE, valign: "middle", margin: 0,
    });
    s.addText(r[1], {
      x: 3.2, y, w: 6.5, h: rh, fontFace: F.BODY, fontSize: 11.5, color: C.TEXT, valign: "middle", margin: 0,
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: W - 3.2, y: y + 0.09, w: 2.35, h: rh - 0.18, fill: { color: C.BLUE_SOFT },
      line: { type: "none" }, rectRadius: 0.06,
    });
    s.addText(r[2], {
      x: W - 3.2, y, w: 2.35, h: rh, fontFace: F.MONO, fontSize: 10, bold: true,
      color: C.BLUE, align: "center", valign: "middle", margin: 0,
    });
  });
  // key principle callout
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 5.2, w: W - 1.2, h: 1.7, fill: { color: C.AMBER_SOFT },
    line: { color: C.AMBER, width: 1 }, rectRadius: 0.12,
  });
  s.addText("关键原则", {
    x: 0.9, y: 5.4, w: 3, h: 0.4, fontFace: F.HEAD, fontSize: 14, bold: true, color: C.AMBER, margin: 0,
  });
  s.addText([
    { text: "自动化扫描只是", options: {} },
    { text: "「捞鱼」", options: { bold: true, color: C.RED } },
    { text: "，手工验证才是", options: { breakLine: true } },
    { text: "「确认鱼的大小和种类」", options: { bold: true, color: C.GREEN } },
    { text: "。需确认三点：①是否真存在漏洞（还是版本号匹配）②利用条件（需认证？特定参数？）③实际危害（能获取什么权限？）", options: { breakLine: true } },
    { text: " —— 不验证的漏洞报告没有价值。", options: { bold: true } },
  ], {
    x: 0.9, y: 5.8, w: W - 1.5, h: 1.0, fontFace: F.BODY, fontSize: 12, color: C.TEXT, valign: "top", margin: 0,
  });
  pageFooter(s, 10, TOTAL);
}

// ============================================================
// Slide 11 — PTES Stage 5: Exploitation
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker: "04.5 · 渗透测试 / 阶段五", title: "渗透攻击 — 获取初始访问权限", accent: C.RED });
  s.addText("目标：利用已验证漏洞，获取目标系统初始访问权限（Initial Foothold）。", {
    x: 0.6, y: 1.5, w: W - 1.2, h: 0.4, fontFace: F.BODY, fontSize: 13, color: C.MUTED, margin: 0,
  });
  const rows = [
    ["Web 漏洞利用", "SQL 注入拿数据/写 Webshell、文件上传绕过 getshell、SSRF 打内网、反序列化 RCE、SSTI", "SQLMap, 蚁剑/冰蝎/哥斯拉, ysoserial"],
    ["系统漏洞利用", "利用未修复 CVE（永恒之蓝 MS17-010、BlueKeep 等）直接获取系统权限", "Metasploit, Exploit-DB 脚本"],
    ["弱口令/默认口令", "通过前期爆破或已知默认口令直接登录系统", "—"],
    ["钓鱼攻击", "构造钓鱼邮件/页面诱导员工点击，获取凭据或 Shell（大型红蓝对抗用）", "GoPhish, Cobalt Strike"],
    ["近源攻击", "Wi-Fi 破解、物理接口接入、USB BadUSB 等（红蓝对抗场景）", "Aircrack-ng, Rubber Ducky"],
  ];
  const y0 = 2.05, rh = 0.62, gap = 0.1;
  rows.forEach((r, i) => {
    const y = y0 + i * (rh + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y, w: W - 1.2, h: rh, fill: { color: i % 2 ? C.CARD2 : C.CARD },
      line: { color: C.BORDER, width: 1 }, rectRadius: 0.06,
    });
    s.addText(r[0], {
      x: 0.8, y, w: 2.6, h: rh, fontFace: F.HEAD, fontSize: 12.5, bold: true,
      color: C.RED, valign: "middle", margin: 0,
    });
    s.addText(r[1], {
      x: 3.4, y, w: 6.2, h: rh, fontFace: F.BODY, fontSize: 11, color: C.TEXT, valign: "middle", margin: 0,
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: W - 3.0, y: y + 0.09, w: 2.15, h: rh - 0.18, fill: { color: C.RED_SOFT },
      line: { type: "none" }, rectRadius: 0.06,
    });
    s.addText(r[2], {
      x: W - 3.0, y, w: 2.15, h: rh, fontFace: F.MONO, fontSize: 9.5, bold: true,
      color: C.RED, align: "center", valign: "middle", margin: 0,
    });
  });
  s.addText("获取权限的常见形式：Webshell（命令执行型/文件管理型）· 反弹 Shell（nc/bash/powershell）· 远程桌面 RDP · SSH 密钥", {
    x: 0.6, y: 5.7, w: W - 1.2, h: 0.5, fontFace: F.BODY, fontSize: 12, bold: true,
    color: C.NAVY, align: "center", margin: 0,
  });
  pageFooter(s, 11, TOTAL);
}

// ============================================================
// Slide 12 — PTES Stage 6: Post Exploitation
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker: "04.6 · 渗透测试 / 阶段六", title: "后渗透利用 — 提权 / 横向移动 / 维持", accent: C.AMBER });
  s.addText("目标：从突破点向更深处推进，扩大战果，提升权限，拿下核心目标。", {
    x: 0.6, y: 1.5, w: W - 1.2, h: 0.4, fontFace: F.BODY, fontSize: 13, color: C.MUTED, margin: 0,
  });
  const cols = [
    { t: "权限提升", c: C.RED, cs: C.RED_SOFT, items: [
      ["Linux 提权", "内核漏洞(DirtyCow/Pipe)、SUID 滥用、sudo 漏洞、Cron 劫持、Docker 组提权"],
      ["Windows 提权", "内核漏洞、服务权限不当、AlwaysInstallElevated、UAC 绕过、Token 窃取"],
      ["数据库提权", "MySQL UDF/MOF 提权、SQL Server xp_cmdshell"],
    ]},
    { t: "横向移动", c: C.BLUE, cs: C.BLUE_SOFT, items: [
      ["凭据窃取", "内存 dump 哈希、浏览器密码、配置文件明文密码"],
      ["哈希传递 PtH", "不破解密码，直接用 NTLM 哈希认证其他 Windows 主机"],
      ["票据攻击", "Kerberos 黄金/白银票据，伪造域控权限"],
      ["RDP/WMI/PSExec", "利用 Windows 远程管理协议跳板"],
    ]},
    { t: "数据与维持", c: C.AMBER, cs: C.AMBER_SOFT, items: [
      ["定位核心数据", "数据库连接串、敏感文件、代码仓库、内部文档"],
      ["数据外传测试", "模拟外传，测试 DLP 与数据防泄露能力"],
      ["持久化后门", "计划任务/服务/注册表/SSH 公钥/WEB 后门（测试后必须清除）"],
      ["痕迹清理", "清除 Shell 历史、操作日志、上传文件（测试后执行）"],
    ]},
  ];
  const pw = 3.95, ph = 4.4, gap = 0.25;
  const startX = (W - (pw * 3 + gap * 2)) / 2;
  const y0 = 2.05;
  cols.forEach((p, i) => {
    const x = startX + i * (pw + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: y0, w: pw, h: ph, fill: { color: C.CARD },
      line: { color: C.BORDER, width: 1 }, rectRadius: 0.12,
      shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.08 },
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.25, y: y0 + 0.25, w: pw - 0.5, h: 0.5, fill: { color: p.cs },
      line: { type: "none" }, rectRadius: 0.1,
    });
    s.addText(p.t, {
      x: x + 0.25, y: y0 + 0.25, w: pw - 0.5, h: 0.5, fontFace: F.HEAD, fontSize: 14, bold: true,
      color: p.c, align: "center", valign: "middle", margin: 0,
    });
    const iy0 = y0 + 0.95;
    p.items.forEach((it, j) => {
      const iy = iy0 + j * 1.05;
      s.addText(it[0], {
        x: x + 0.25, y: iy, w: pw - 0.5, h: 0.3,
        fontFace: F.HEAD, fontSize: 12, bold: true, color: C.TEXT, margin: 0,
      });
      s.addText(it[1], {
        x: x + 0.25, y: iy + 0.3, w: pw - 0.5, h: 0.7,
        fontFace: F.BODY, fontSize: 10.5, color: C.MUTED, valign: "top", margin: 0,
      });
    });
  });
  pageFooter(s, 12, TOTAL);
}

// ============================================================
// Slide 13 — PTES Stage 7: Reporting
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker: "04.7 · 渗透测试 / 阶段七", title: "报告撰写 — 成果转化为可落地方案", accent: C.GREEN });
  s.addText("目标：将测试成果转化为可读、可落地的安全报告。报告质量直接决定测试价值。", {
    x: 0.6, y: 1.5, w: W - 1.2, h: 0.4, fontFace: F.BODY, fontSize: 13, color: C.MUTED, margin: 0,
  });
  const secs = [
    { t: "概述", d: "测试目标、范围、时间、测试类型（黑/白/灰盒）" },
    { t: "漏洞清单", d: "名称、CVSS 评分、风险等级、发现方式、复现步骤（截图+Payload）、危害说明" },
    { t: "攻击链总结", d: "从入口到核心目标的完整攻击路径梳理，让客户直观感受风险" },
    { t: "修复建议", d: "按优先级排序：高危立即修、中危尽快修、低危择期修；每项给具体方案而非「加强安全配置」" },
    { t: "附录", d: "工具清单、Payload 列表、时间线" },
  ];
  const y0 = 2.1, rh = 0.85, gap = 0.12;
  secs.forEach((it, i) => {
    const y = y0 + i * (rh + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y, w: W - 1.2, h: rh, fill: { color: C.CARD },
      line: { color: C.BORDER, width: 1 }, rectRadius: 0.08,
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y, w: 2.4, h: rh, fill: { color: C.GREEN_SOFT },
      line: { type: "none" }, rectRadius: 0.08,
    });
    s.addText(it.t, {
      x: 0.8, y, w: 2.0, h: rh, fontFace: F.HEAD, fontSize: 15, bold: true,
      color: C.GREEN, valign: "middle", margin: 0,
    });
    s.addText(it.d, {
      x: 3.2, y, w: W - 3.8, h: rh, fontFace: F.BODY, fontSize: 12,
      color: C.TEXT, valign: "middle", margin: 0,
    });
  });
  pageFooter(s, 13, TOTAL);
}

// ============================================================
// Slide 14 — Code audit overview (6 stages)
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker: "05 · 代码审计流程", title: "白盒审计 — 6 大阶段（通常 1~4 周）", accent: C.CYAN });
  const stages = ["前期准备", "自动化扫描", "人工审计", "漏洞验证", "修复建议", "审计报告"];
  const colors = [C.CYAN, C.BLUE, C.RED, C.AMBER, C.GREEN, C.NAVY];
  const n = stages.length;
  const fw = 1.7, gap = 0.25;
  const total = fw * n + gap * (n - 1);
  const startX = (W - total) / 2;
  const y = 2.6;
  stages.forEach((st, i) => {
    const x = startX + i * (fw + gap);
    const c = colors[i];
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w: fw, h: 1.6, fill: { color: c }, line: { type: "none" }, rectRadius: 0.12,
    });
    s.addText(String(i + 1), {
      x, y: y + 0.2, w: fw, h: 0.55, fontFace: F.HEAD, fontSize: 30, bold: true,
      color: C.TEXT_INV, align: "center", margin: 0,
    });
    s.addText(st, {
      x, y: y + 0.95, w: fw, h: 0.5, fontFace: F.HEAD, fontSize: 14, bold: true,
      color: C.TEXT_INV, align: "center", margin: 0,
    });
    if (i < n - 1) {
      s.addShape(pres.shapes.RIGHT_TRIANGLE, {
        x: x + fw + 0.03, y: y + 0.65, w: 0.18, h: 0.3,
        fill: { color: C.MUTED2 }, line: { type: "none" }, rotate: 90,
      });
    }
  });
  s.addText("前期准备 → 自动化扫描 → 人工审计 → 漏洞验证 → 修复建议 → 审计报告", {
    x: 0.6, y: 4.7, w: W - 1.2, h: 0.4, fontFace: F.MONO, fontSize: 11,
    color: C.MUTED, align: "center", margin: 0,
  });
  s.addText("人工审计是核心环节 —— 自动化工具只能发现「模式匹配」类漏洞（如危险函数），无法理解业务逻辑，误报率通常 30%~70%。", {
    x: 1.0, y: 5.4, w: W - 2.0, h: 1.0, fontFace: F.BODY, fontSize: 13,
    color: C.TEXT, align: "center", valign: "top", margin: 0,
  });
  pageFooter(s, 14, TOTAL);
}

// ============================================================
// Slide 15 — Code audit: prep + auto scan
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker: "05.1-2 · 代码审计", title: "前期准备 + 自动化扫描", accent: C.CYAN });

  // left: prep
  const lx = 0.6, lw = 5.9;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: lx, y: 1.55, w: lw, h: 5.5, fill: { color: C.CARD },
    line: { color: C.BORDER, width: 1 }, rectRadius: 0.12,
    shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.08 },
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: lx + 0.25, y: 1.8, w: lw - 0.5, h: 0.55, fill: { color: C.CYAN_SOFT },
    line: { type: "none" }, rectRadius: 0.1,
  });
  s.addText("阶段一 · 前期准备", {
    x: lx + 0.25, y: 1.8, w: lw - 0.5, h: 0.55, fontFace: F.HEAD, fontSize: 15, bold: true,
    color: C.CYAN, align: "center", valign: "middle", margin: 0,
  });
  const prep = [
    ["获取完整源码", "项目代码、依赖包、建表脚本、配置模板"],
    ["了解技术栈", "后端语言 / Web 框架 / ORM / 中间件"],
    ["了解业务架构", "功能模块、角色权限、API 调用、数据流向"],
    ["环境搭建", "本地部署运行，可编译可调试"],
    ["明确审计范围", "全量审计还是仅核心模块？是否含第三方依赖？"],
  ];
  prep.forEach((it, i) => {
    const y = 2.55 + i * 0.85;
    s.addText(it[0], { x: lx + 0.3, y, w: lw - 0.6, h: 0.3, fontFace: F.HEAD, fontSize: 12.5, bold: true, color: C.TEXT, margin: 0 });
    s.addText(it[1], { x: lx + 0.3, y: y + 0.3, w: lw - 0.6, h: 0.5, fontFace: F.BODY, fontSize: 11, color: C.MUTED, valign: "top", margin: 0 });
  });

  // right: auto scan
  const rx = 6.8, rw = W - rx - 0.6;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rx, y: 1.55, w: rw, h: 5.5, fill: { color: C.CARD },
    line: { color: C.BORDER, width: 1 }, rectRadius: 0.12,
    shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.08 },
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rx + 0.25, y: 1.8, w: rw - 0.5, h: 0.55, fill: { color: C.BLUE_SOFT },
    line: { type: "none" }, rectRadius: 0.1,
  });
  s.addText("阶段二 · 自动化扫描", {
    x: rx + 0.25, y: 1.8, w: rw - 0.5, h: 0.55, fontFace: F.HEAD, fontSize: 15, bold: true,
    color: C.BLUE, align: "center", valign: "middle", margin: 0,
  });
  const scans = [
    ["SAST 扫描", "静态应用安全测试，规则匹配漏洞模式", "SonarQube, Fortify, Semgrep, CodeQL"],
    ["SCA 扫描", "软件成分分析，检测第三方依赖 CVE", "Dependency-Check, Snyk, Trivy"],
    ["密钥扫描", "扫描硬编码密码、API Key、Token", "Gitleaks, TruffleHog"],
    ["结果初筛", "过滤误报(False Positive)，标记需人工分析", "—"],
  ];
  scans.forEach((it, i) => {
    const y = 2.55 + i * 1.05;
    s.addText(it[0], { x: rx + 0.3, y, w: rw - 0.6, h: 0.3, fontFace: F.HEAD, fontSize: 12.5, bold: true, color: C.TEXT, margin: 0 });
    s.addText(it[1], { x: rx + 0.3, y: y + 0.3, w: rw - 0.6, h: 0.35, fontFace: F.BODY, fontSize: 10.5, color: C.MUTED, margin: 0 });
    s.addText(it[2], { x: rx + 0.3, y: y + 0.62, w: rw - 0.6, h: 0.3, fontFace: F.MONO, fontSize: 9.5, color: C.BLUE, margin: 0 });
  });
  pageFooter(s, 15, TOTAL);
}

// ============================================================
// Slide 16 — Code audit: manual review (taint tracking)
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker: "05.3 · 代码审计 / 阶段三", title: "人工审计 — 污点追踪（核心环节）", accent: C.RED });
  s.addText("核心思想：追踪外部可控数据 Source → 经过的过滤函数 Sanitizer → 到达危险操作 Sink 的完整路径。", {
    x: 0.6, y: 1.5, w: W - 1.2, h: 0.4, fontFace: F.BODY, fontSize: 13, color: C.MUTED, margin: 0,
  });
  // flow diagram (3 boxes)
  const nodes = [
    { t: "Source", sub: "用户输入点", ex: "request.getParameter()\n@RequestBody / Cookie / Header", c: C.RED, cs: C.RED_SOFT },
    { t: "Sanitizer", sub: "过滤 / 转义", ex: "ESAPI.encoder()\n参数化查询 / 白名单校验", c: C.AMBER, cs: C.AMBER_SOFT },
    { t: "Sink", sub: "危险操作点", ex: "stmt.executeQuery()\nRuntime.exec() / 文件操作", c: C.NAVY, cs: C.CARD2 },
  ];
  const bw = 3.6, bh = 2.5, gap = 0.5;
  const startX = (W - (bw * 3 + gap * 2)) / 2;
  const y = 2.2;
  nodes.forEach((nd, i) => {
    const x = startX + i * (bw + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w: bw, h: bh, fill: { color: C.CARD },
      line: { color: nd.c, width: 2 }, rectRadius: 0.12,
      shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.10 },
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + (bw - 1.6) / 2, y: y + 0.25, w: 1.6, h: 0.55, fill: { color: nd.cs },
      line: { type: "none" }, rectRadius: 0.1,
    });
    s.addText(nd.t, {
      x: x + (bw - 1.6) / 2, y: y + 0.25, w: 1.6, h: 0.55, fontFace: F.HEAD, fontSize: 14, bold: true,
      color: nd.c, align: "center", valign: "middle", margin: 0,
    });
    s.addText(nd.sub, {
      x, y: y + 0.9, w: bw, h: 0.35, fontFace: F.BODY, fontSize: 12, color: C.MUTED, align: "center", margin: 0,
    });
    s.addText(nd.ex, {
      x: x + 0.2, y: y + 1.3, w: bw - 0.4, h: 1.0, fontFace: F.MONO, fontSize: 11,
      color: C.TEXT, align: "center", valign: "top", margin: 0,
    });
    if (i < 2) {
      s.addText("→", {
        x: x + bw, y, w: gap, h: bh, fontFace: F.HEAD, fontSize: 30, bold: true,
        color: C.CYAN, align: "center", valign: "middle", margin: 0,
      });
    }
  });
  // bottom verdict
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 5.1, w: W - 1.2, h: 1.7, fill: { color: C.RED_SOFT },
    line: { color: C.RED, width: 1 }, rectRadius: 0.12,
  });
  s.addText("判定规则", {
    x: 0.9, y: 5.3, w: 3, h: 0.4, fontFace: F.HEAD, fontSize: 14, bold: true, color: C.RED, margin: 0,
  });
  s.addText([
    { text: "如果 Source → Sink 路径上 ", options: {} },
    { text: "「没有足够的 Sanitizer」", options: { bold: true, color: C.RED } },
    { text: "，就存在漏洞。", options: { breakLine: true } },
    { text: "审计顺序策略：", options: { bold: true, breakLine: true } },
    { text: "① 先高危后低危（先找直接 getshell 的）  ② 先外部后内部（先 Controller/API 再 Service）  ③ 先功能点后全局（登录/上传/支付 → 全局过滤器）  ④ 正向+逆向结合（Controller→DAO 与 Sink→Controller）", options: {} },
  ], {
    x: 0.9, y: 5.7, w: W - 1.5, h: 1.0, fontFace: F.BODY, fontSize: 12, color: C.TEXT, valign: "top", margin: 0,
  });
  pageFooter(s, 16, TOTAL);
}

// ============================================================
// Slide 17 — Code audit: vuln-by-category audit checklist
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker: "05.3 · 代码审计 / 阶段三", title: "逐类漏洞审计要点", accent: C.RED });
  const rows = [
    ["SQL 注入", "数据库查询语句", "拼接 SQL 字符串，未使用参数化查询/ORM"],
    ["XSS 跨站", "输出到 HTML/JS 的代码", "未转义直接输出用户内容，innerHTML 赋值"],
    ["命令注入", "调用系统命令处", "Runtime.exec(\"ping \" + ip) 未过滤参数"],
    ["文件上传", "文件上传功能", "仅前端校验、黑名单可绕过、未限类型/大小/重命名"],
    ["文件操作", "文件读/写/下载/删除", "路径拼接导致目录穿越，任意文件读/写"],
    ["反序列化", "ObjectInputStream / json 解析", "不可信数据反序列化，未做类型白名单"],
    ["SSRF", "服务端发起 HTTP 请求处", "URL 参数可控且未限制访问目标（可打内网）"],
    ["XXE", "XML 解析处", "未禁用外部实体解析（DTD/ENTITY）"],
    ["权限绕过", "越权访问", "水平越权(IDOR) / 垂直越权未做角色校验"],
    ["加密问题", "加密/哈希/随机数", "硬编码密钥、弱算法(MD5/DES/ECB)、不安全随机数"],
  ];
  const y0 = 1.55, rh = 0.46, gap = 0.055;
  rows.forEach((r, i) => {
    const y = y0 + i * (rh + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y, w: W - 1.2, h: rh, fill: { color: i % 2 ? C.CARD2 : C.CARD },
      line: { color: C.BORDER, width: 1 }, rectRadius: 0.05,
    });
    s.addText(r[0], {
      x: 0.8, y, w: 2.2, h: rh, fontFace: F.HEAD, fontSize: 11.5, bold: true,
      color: C.RED, valign: "middle", margin: 0,
    });
    s.addText(r[1], {
      x: 3.0, y, w: 3.6, h: rh, fontFace: F.BODY, fontSize: 10.5,
      color: C.MUTED, valign: "middle", margin: 0,
    });
    s.addText(r[2], {
      x: 6.6, y, w: W - 7.2, h: rh, fontFace: F.BODY, fontSize: 10.5,
      color: C.TEXT, valign: "middle", margin: 0,
    });
  });
  pageFooter(s, 17, TOTAL);
}

// ============================================================
// Slide 18 — Code audit: verification + fix + report
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker: "05.4-6 · 代码审计", title: "漏洞验证 · 修复建议 · 审计报告", accent: C.GREEN });
  const cols = [
    { t: "阶段四 · 漏洞验证", c: C.AMBER, cs: C.AMBER_SOFT, items: [
      ["搭建测试环境", "部署代码到测试环境，确保可访问"],
      ["构造攻击向量", "针对疑似漏洞构建具体 Payload 验证"],
      ["确认漏洞可利用", "验证是否真实存在、条件是否满足、危害程度"],
      ["截图/录屏", "记录完整复现过程作为证据"],
    ]},
    { t: "阶段五 · 修复建议", c: C.BLUE, cs: C.BLUE_SOFT, items: [
      ["代码级方案", "不写「修复 SQL 注入」而写「第 X 行拼接 SQL 改为 PreparedStatement 参数化查询」"],
      ["给出正反对比", "错误写法 vs 正确写法，方便开发对照修改"],
      ["风险评级", "按 CVSS 评分，标注危害等级与修复优先级"],
    ]},
    { t: "阶段六 · 审计报告", c: C.GREEN, cs: C.GREEN_SOFT, items: [
      ["报告结构", "与渗透测试报告类似"],
      ["代码定位", "漏洞所在文件路径 + 行号"],
      ["代码片段", "代码片段截图"],
      ["修复对比", "修复前后对比代码"],
    ]},
  ];
  const pw = 3.95, ph = 4.9, gap = 0.25;
  const startX = (W - (pw * 3 + gap * 2)) / 2;
  const y0 = 1.6;
  cols.forEach((p, i) => {
    const x = startX + i * (pw + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: y0, w: pw, h: ph, fill: { color: C.CARD },
      line: { color: C.BORDER, width: 1 }, rectRadius: 0.12,
      shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.08 },
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.25, y: y0 + 0.25, w: pw - 0.5, h: 0.55, fill: { color: p.cs },
      line: { type: "none" }, rectRadius: 0.1,
    });
    s.addText(p.t, {
      x: x + 0.25, y: y0 + 0.25, w: pw - 0.5, h: 0.55, fontFace: F.HEAD, fontSize: 14, bold: true,
      color: p.c, align: "center", valign: "middle", margin: 0,
    });
    const iy0 = y0 + 1.0;
    p.items.forEach((it, j) => {
      const iy = iy0 + j * 0.95;
      s.addText(it[0], {
        x: x + 0.25, y: iy, w: pw - 0.5, h: 0.3, fontFace: F.HEAD, fontSize: 12, bold: true, color: C.TEXT, margin: 0,
      });
      s.addText(it[1], {
        x: x + 0.25, y: iy + 0.3, w: pw - 0.5, h: 0.6, fontFace: F.BODY, fontSize: 10.5, color: C.MUTED, valign: "top", margin: 0,
      });
    });
  });
  pageFooter(s, 18, TOTAL);
}

// ============================================================
// Slide 19 — Vuln research overview (7 stages)
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker: "06 · 漏洞挖掘流程", title: "主动发现未知漏洞（0day）— 7 大阶段", accent: C.RED });
  s.addText("一条完整的漏洞挖掘链通常需要数周到数月。", {
    x: 0.6, y: 1.5, w: W - 1.2, h: 0.4, fontFace: F.BODY, fontSize: 13, color: C.MUTED, margin: 0,
  });
  const stages = ["选题定向", "环境搭建", "攻击面分析", "方法选择执行", "异常捕获定位", "PoC/EXP 开发", "漏洞披露"];
  const colors = [C.RED, C.AMBER, C.CYAN, C.BLUE, C.AMBER, C.RED, C.GREEN];
  const n = stages.length;
  const fw = 1.62, gap = 0.18;
  const total = fw * n + gap * (n - 1);
  const startX = (W - total) / 2;
  const y = 2.3;
  stages.forEach((st, i) => {
    const x = startX + i * (fw + gap);
    const c = colors[i];
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w: fw, h: 1.6, fill: { color: c }, line: { type: "none" }, rectRadius: 0.12,
    });
    s.addText(String(i + 1), {
      x, y: y + 0.2, w: fw, h: 0.55, fontFace: F.HEAD, fontSize: 28, bold: true,
      color: C.TEXT_INV, align: "center", margin: 0,
    });
    s.addText(st, {
      x, y: y + 0.92, w: fw, h: 0.55, fontFace: F.HEAD, fontSize: 13, bold: true,
      color: C.TEXT_INV, align: "center", margin: 0,
    });
    if (i < n - 1) {
      s.addText("→", {
        x: x + fw - 0.02, y, w: gap + 0.04, h: 1.6, fontFace: F.HEAD, fontSize: 18, bold: true,
        color: C.MUTED2, align: "center", valign: "middle", margin: 0,
      });
    }
  });
  s.addText("选题定向 → 环境搭建 → 攻击面分析 → 方法选择与执行 → 异常捕获与定位 → PoC/EXP 开发 → 漏洞披露", {
    x: 0.6, y: 4.4, w: W - 1.2, h: 0.4, fontFace: F.MONO, fontSize: 11,
    color: C.MUTED, align: "center", margin: 0,
  });
  s.addText("选题方向：新上线产品、大版本更新的流行框架、IoT 设备固件是热门。\n技术路线：Web → 代码审计+黑盒 Fuzzing；二进制 → 逆向+Fuzzing；IoT → 固件提取+协议分析。", {
    x: 1.0, y: 5.1, w: W - 2.0, h: 1.4, fontFace: F.BODY, fontSize: 12.5,
    color: C.TEXT, valign: "top", margin: 0,
  });
  pageFooter(s, 19, TOTAL);
}

// ============================================================
// Slide 20 — Vuln research: method selection (the core)
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker: "06.4 · 漏洞挖掘 / 阶段四", title: "方法选择与执行 — 核心技术环节", accent: C.BLUE });
  s.addText("选择哪种方法取决于目标类型和研究方向。", {
    x: 0.6, y: 1.5, w: W - 1.2, h: 0.4, fontFace: F.BODY, fontSize: 13, color: C.MUTED, margin: 0,
  });
  const rows = [
    ["模糊测试 Fuzzing", "任何接受外部输入的程序", "黑盒 AFL / 灰盒 AFL++（插桩覆盖率）/ 协议 Fuzzing / Web Fuzzing", "AFL++, LibFuzzer, Peach, Burp Intruder", C.RED, C.RED_SOFT],
    ["逆向分析", "无源码的二进制程序", "静态：IDA/Ghidra 反汇编读伪代码，寻危险函数；动态：调试器下断点跟踪内存", "IDA Pro, Ghidra, x64dbg, WinDbg, gdb", C.BLUE, C.BLUE_SOFT],
    ["补丁对比", "厂商刚发布安全补丁", "对比补丁前后二进制/源码差异 → 定位修复位置 → 逆向漏洞原理 → 利用未打补丁版本", "Bindiff, Diaphora, IDA", C.CYAN, C.CYAN_SOFT],
    ["污点分析", "有源码的目标", "将漏洞模式抽象为 QL 查询语句，自动追踪 Source→Sink 路径", "CodeQL, Joern", C.AMBER, C.AMBER_SOFT],
    ["符号执行", "探索深层执行路径", "输入符号化，约束求解遍历执行路径，发现常规测试无法触达的深层漏洞", "angr, KLEE, S2E", C.GREEN, C.GREEN_SOFT],
  ];
  const y0 = 2.0, rh = 0.78, gap = 0.12;
  rows.forEach((r, i) => {
    const y = y0 + i * (rh + gap);
    const [name, scene, tech, tools, c, cs] = r;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y, w: W - 1.2, h: rh, fill: { color: C.CARD },
      line: { color: C.BORDER, width: 1 }, rectRadius: 0.08,
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y, w: 2.6, h: rh, fill: { color: cs }, line: { type: "none" }, rectRadius: 0.08,
    });
    s.addText(name, {
      x: 0.8, y, w: 2.2, h: rh, fontFace: F.HEAD, fontSize: 14, bold: true,
      color: c, valign: "middle", margin: 0,
    });
    s.addText(scene, {
      x: 3.3, y, w: 2.8, h: rh, fontFace: F.BODY, fontSize: 11, color: C.MUTED, valign: "middle", margin: 0,
    });
    s.addText(tech, {
      x: 6.2, y, w: 4.5, h: rh, fontFace: F.BODY, fontSize: 10.5, color: C.TEXT, valign: "middle", margin: 0,
    });
    s.addText(tools, {
      x: 10.8, y: y + 0.08, w: W - 10.9 - 0.6, h: rh - 0.16, fontFace: F.MONO, fontSize: 9, bold: true,
      color: c, valign: "middle", margin: 0,
    });
  });
  pageFooter(s, 20, TOTAL);
}

// ============================================================
// Slide 21 — Vuln research: crash + PoC/EXP + key tech
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker: "06.5-6 · 漏洞挖掘", title: "异常捕获定位 + PoC/EXP 开发", accent: C.AMBER });

  // left: crash analysis
  const lx = 0.6, lw = 6.0;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: lx, y: 1.55, w: lw, h: 5.5, fill: { color: C.CARD },
    line: { color: C.BORDER, width: 1 }, rectRadius: 0.12,
    shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.08 },
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: lx + 0.25, y: 1.8, w: lw - 0.5, h: 0.55, fill: { color: C.AMBER_SOFT },
    line: { type: "none" }, rectRadius: 0.1,
  });
  s.addText("阶段五 · 异常捕获与定位", {
    x: lx + 0.25, y: 1.8, w: lw - 0.5, h: 0.55, fontFace: F.HEAD, fontSize: 14, bold: true,
    color: C.AMBER, align: "center", valign: "middle", margin: 0,
  });
  const crash = [
    ["崩溃监控", "监控进程崩溃（Seg Fault / Access Violation），收集样本"],
    ["崩溃分类", "判断类型：栈溢出、堆溢出、UAF、double-free、整数溢出"],
    ["崩溃去重", "多个样本可能同根因，按崩溃地址/调用栈哈希去重"],
    ["根因定位", "调试器回放崩溃 → 定位崩溃点 → 追踪漏洞根因"],
    ["可利用性评估", "可控 EIP/RIP？可控写操作？信息泄露？"],
  ];
  crash.forEach((it, i) => {
    const y = 2.55 + i * 0.85;
    s.addText(it[0], { x: lx + 0.3, y, w: lw - 0.6, h: 0.3, fontFace: F.HEAD, fontSize: 12.5, bold: true, color: C.TEXT, margin: 0 });
    s.addText(it[1], { x: lx + 0.3, y: y + 0.3, w: lw - 0.6, h: 0.5, fontFace: F.BODY, fontSize: 11, color: C.MUTED, valign: "top", margin: 0 });
  });

  // right: PoC/EXP + tech
  const rx = 6.9, rw = W - rx - 0.6;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rx, y: 1.55, w: rw, h: 5.5, fill: { color: C.CARD },
    line: { color: C.BORDER, width: 1 }, rectRadius: 0.12,
    shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.08 },
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rx + 0.25, y: 1.8, w: rw - 0.5, h: 0.55, fill: { color: C.RED_SOFT },
    line: { type: "none" }, rectRadius: 0.1,
  });
  s.addText("阶段六 · PoC 与 EXP 开发", {
    x: rx + 0.25, y: 1.8, w: rw - 0.5, h: 0.55, fontFace: F.HEAD, fontSize: 14, bold: true,
    color: C.RED, align: "center", valign: "middle", margin: 0,
  });
  // PoC vs EXP
  s.addText("PoC (Proof of Concept)", { x: rx + 0.3, y: 2.55, w: rw - 0.6, h: 0.3, fontFace: F.HEAD, fontSize: 12.5, bold: true, color: C.RED, margin: 0 });
  s.addText("证明漏洞存在的验证代码，只需触发崩溃/异常。用于提交 CVE。", { x: rx + 0.3, y: 2.85, w: rw - 0.6, h: 0.5, fontFace: F.BODY, fontSize: 10.5, color: C.MUTED, valign: "top", margin: 0 });
  s.addText("EXP (Exploit)", { x: rx + 0.3, y: 3.45, w: rw - 0.6, h: 0.3, fontFace: F.HEAD, fontSize: 12.5, bold: true, color: C.RED, margin: 0 });
  s.addText("能实际利用漏洞执行代码的完整脚本，含 ROP 链/Shellcode。", { x: rx + 0.3, y: 3.75, w: rw - 0.6, h: 0.4, fontFace: F.BODY, fontSize: 10.5, color: C.MUTED, valign: "top", margin: 0 });

  s.addShape(pres.shapes.LINE, { x: rx + 0.3, y: 4.35, w: rw - 0.6, h: 0, line: { color: C.BORDER, width: 1 } });
  s.addText("EXP 关键技术", { x: rx + 0.3, y: 4.45, w: rw - 0.6, h: 0.3, fontFace: F.HEAD, fontSize: 12, bold: true, color: C.TEXT, margin: 0 });
  const techs = [
    ["栈溢出利用", "覆盖返回地址 → ROP 链 → system/execve"],
    ["堆利用", "堆风水、Tcache poisoning、Fastbin attack"],
    ["ASLR 绕过", "信息泄露获取基地址、partial overwrite"],
    ["NX/DEP 绕过", "ROP 或 mprotect 修改内存属性"],
    ["CFG 绕过", "Control Flow Guard —— 需更精巧的利用链"],
  ];
  techs.forEach((t, i) => {
    const y = 4.8 + i * 0.42;
    s.addText(t[0], { x: rx + 0.3, y, w: 1.9, h: 0.35, fontFace: F.HEAD, fontSize: 10.5, bold: true, color: C.RED, valign: "middle", margin: 0 });
    s.addText(t[1], { x: rx + 2.2, y, w: rw - 2.5, h: 0.35, fontFace: F.BODY, fontSize: 10, color: C.TEXT, valign: "middle", margin: 0 });
  });
  pageFooter(s, 21, TOTAL);
}

// ============================================================
// Slide 22 — Vuln research: disclosure
// ============================================================
phaseSlide(22, "06.7 · 漏洞挖掘 / 阶段七", "漏洞披露 — 负责任的披露", C.GREEN,
  "目标：遵循「负责任的披露」原则，给厂商修复期后再公开细节。",
  [
    { label: "联系厂商", desc: "通过漏洞奖励计划（Bug Bounty）或直接邮件联系厂商安全团队" },
    { label: "CVE 申请", desc: "向 MITRE 申请 CVE 编号，获得全球统一漏洞标识" },
    { label: "撰写漏洞报告", desc: "详细漏洞描述、影响版本、复现步骤、修复建议" },
    { label: "披露时间线", desc: "遵循负责任披露 —— 给厂商 90 天修复期后再公开细节" },
    { label: "发表技术文章", desc: "在博客 / 安全会议上分享漏洞挖掘过程与技术心得" },
  ]);

// ============================================================
// Slide 23 — Relationships between businesses (image)
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.LIGHT);
  header(s, { kicker: "07 · 业务关系", title: "各业务之间的关系", accent: C.CYAN });
  // image on left
  const imgPath = path.join(IMG_DIR, "Gemini_Generated_Image_3dho7l3dho7l3dho.png");
  s.addImage({
    path: imgPath,
    x: 0.6, y: 1.6, w: 5.6, h: 5.0,
    sizing: { type: "contain", w: 5.6, h: 5.0 },
  });
  s.addText("网安业务关系图", {
    x: 0.6, y: 6.65, w: 5.6, h: 0.35, fontFace: F.BODY, fontSize: 11, italic: true,
    color: C.MUTED, align: "center", margin: 0,
  });
  // relationships on right
  const rels = [
    ["渗透测试 ↔ 代码审计", "互补：黑盒从外攻击 + 白盒从内审查，覆盖更全面", C.RED],
    ["渗透测试 → 漏洞挖掘", "进阶：工具扫不到的东西，进入漏洞挖掘领域", C.AMBER],
    ["渗透测试 → 红蓝对抗", "升级：范围更广、时间更长、对抗更真实", C.RED],
    ["漏洞挖掘 → 实战", "支撑：0day 作为武器库供渗透/红蓝对抗使用", C.CYAN],
    ["SOC/应急/威胁情报", "日常铁三角：SOC 看家、应急救火、情报预警", C.BLUE],
    ["等保测评", "综合：含渗透+审计+风险评估，合规驱动", C.GREEN],
    ["SDL / DevSecOps", "左移：将安全嵌入开发，从源头减少漏洞", C.GREEN],
  ];
  const rx = 6.6, rw = W - rx - 0.6;
  const y0 = 1.6, rh = 0.66, gap = 0.08;
  rels.forEach((r, i) => {
    const y = y0 + i * (rh + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: rx, y, w: rw, h: rh, fill: { color: C.CARD },
      line: { color: C.BORDER, width: 1 }, rectRadius: 0.08,
    });
    s.addShape(pres.shapes.OVAL, {
      x: rx + 0.18, y: y + 0.18, w: 0.3, h: 0.3, fill: { color: r[2] }, line: { type: "none" },
    });
    s.addText(String(i + 1), {
      x: rx + 0.18, y: y + 0.18, w: 0.3, h: 0.3, fontFace: F.HEAD, fontSize: 11, bold: true,
      color: C.TEXT_INV, align: "center", valign: "middle", margin: 0,
    });
    s.addText(r[0], {
      x: rx + 0.6, y, w: rw - 0.8, h: 0.32, fontFace: F.HEAD, fontSize: 12.5, bold: true,
      color: C.TEXT, valign: "middle", margin: 0,
    });
    s.addText(r[1], {
      x: rx + 0.6, y: y + 0.32, w: rw - 0.8, h: 0.34, fontFace: F.BODY, fontSize: 10.5,
      color: C.MUTED, valign: "middle", margin: 0,
    });
  });
  pageFooter(s, 23, TOTAL);
}

// ============================================================
// Slide 24 — Closing
// ============================================================
{
  const s = pres.addSlide();
  bg(s, C.DARK_BG);
  // motif blocks
  const blocks = [C.RED, C.BLUE, C.CYAN];
  blocks.forEach((c, i) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: W / 2 - 0.9 + i * 0.7, y: 1.8, w: 0.5, h: 0.4,
      fill: { color: c }, line: { type: "none" }, rectRadius: 0.08,
    });
  });
  s.addText("THANK YOU", {
    x: 0.5, y: 2.5, w: W - 1, h: 0.6, fontFace: F.BODY, fontSize: 16, bold: true,
    color: C.CYAN, align: "center", charSpacing: 8, margin: 0,
  });
  s.addText("网络安全业务 · 全景速览", {
    x: 0.5, y: 3.1, w: W - 1, h: 1.0, fontFace: F.TITLE, fontSize: 44, bold: true,
    color: C.TEXT_INV, align: "center", margin: 0,
  });
  s.addShape(pres.shapes.LINE, {
    x: W / 2 - 1.2, y: 4.35, w: 2.4, h: 0, line: { color: C.CYAN, width: 2 },
  });
  s.addText("红队  ·  蓝队  ·  合规  ·  开发安全", {
    x: 0.5, y: 4.55, w: W - 1, h: 0.5, fontFace: F.BODY, fontSize: 18,
    color: C.MUTED2, align: "center", margin: 0,
  });
  s.addText("攻击者思维 + 防御者视角 + 合规底线 + 安全左移", {
    x: 0.5, y: 5.3, w: W - 1, h: 0.5, fontFace: F.BODY, fontSize: 14,
    color: C.CYAN, align: "center", margin: 0,
  });
  s.addText("渗透测试 · 代码审计 · 漏洞挖掘 · 红蓝对抗 · SOC · 应急响应 · 威胁情报 · 等保 · SDL", {
    x: 0.5, y: 6.2, w: W - 1, h: 0.5, fontFace: F.BODY, fontSize: 11,
    color: C.MUTED2, align: "center", margin: 0,
  });
}

pres.writeFile({ fileName: OUT }).then(() => {
  console.log("WROTE:", OUT);
});

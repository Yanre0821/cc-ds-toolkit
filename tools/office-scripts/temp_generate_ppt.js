const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.defineLayout({ name: "CUSTOM", width: 13.3, height: 7.5 });
pres.layout = "CUSTOM";
pres.author = "西南交通大学";
pres.title = "SRTP开题答辩 - 电化学传感器";

// ============ COLOR SYSTEM (§2) ============
const C = {
  primary: "1F3864",
  primaryL1: "2B579A",
  primaryL2: "3155A0",
  primaryL3: "3753A6",
  primaryL4: "3D51AC",
  lightBlue: "B4C7E7",
  cardBg: "F2F5FA",
  placeholder: "E0E4EC",
  bodyText: "333333",
  secondaryText: "555555",
  footerText: "808080",
  white: "FFFFFF",
  red: "FF0000",
};

const stepColors = [C.primary, C.primaryL1, C.primaryL2, C.primaryL3, C.primaryL4, C.primary];

const F = { zh: "Microsoft YaHei", en: "Calibri" };

// ============ HELPER: Standard content page frame (§5.4) ============
function addFrame(slide, title, pageNum) {
  // Top bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 13.3, h: 1.0, fill: { color: C.primary },
  });
  // Title (white on dark bar per §14.4)
  slide.addText(title, {
    x: 0.6, y: 0.1, w: 12.1, h: 0.8,
    fontSize: 30, fontFace: F.zh, bold: true, color: C.white,
    wrap: true,
  });
  // Separator below title bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0.95, w: 13.3, h: 0.05, fill: { color: C.lightBlue },
  });
  // Footer bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 7.0, w: 13.3, h: 0.08, fill: { color: C.primary },
  });
  // Footer left
  slide.addText("西南交通大学 SRTP 开题答辩", {
    x: 0.5, y: 7.12, w: 6, h: 0.3,
    fontSize: 10, fontFace: F.zh, color: C.footerText,
  });
  // Page number right
  slide.addText(String(pageNum), {
    x: 11.8, y: 7.12, w: 1, h: 0.3,
    fontSize: 10, fontFace: F.en, color: C.footerText, align: "right",
  });
}

// Helper: image placeholder box (§8.1)
function addPlaceholder(slide, x, y, w, h, label) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: C.placeholder },
    line: { color: C.primary, width: 0.5, dashType: "dash" },
  });
  slide.addText(label, {
    x, y, w, h,
    fontSize: 11, fontFace: F.zh, color: C.primary, align: "center", valign: "middle",
    bold: true,
  });
}

// Helper: section card with light background
function addCard(slide, x, y, w, h, title, bullets, titleColor) {
  // Card background
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: C.cardBg },
  });
  // Card left accent bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w: 0.06, h,
    fill: { color: titleColor || C.primary },
  });
  // Card title
  slide.addText(title, {
    x: x + 0.25, y: y + 0.12, w: w - 0.4, h: 0.4,
    fontSize: 20, fontFace: F.zh, bold: true, color: titleColor || C.primary,
  });
  // Card bullets
  if (bullets && bullets.length > 0) {
    const bulletTexts = bullets.map((b, i) => ({
      text: (i > 0 ? "\n" : "") + "• " + b,
      options: { fontSize: 15, fontFace: F.zh, color: C.bodyText, breakType: i === 0 ? undefined : undefined },
    }));
    // Simpler approach: join with newlines
    const joined = bullets.map((b) => "• " + b).join("\n");
    slide.addText(joined, {
      x: x + 0.25, y: y + 0.55, w: w - 0.4, h: h - 0.75,
      fontSize: 15, fontFace: F.zh, color: C.bodyText,
      wrap: true, lineSpacingMultiple: 1.3,
    });
  }
}

// ===================================================================
// PAGE 1: 项目总体技术路线图
// ===================================================================
const s1 = pres.addSlide();
addFrame(s1, '项目总体技术路线 —— "信号放大-特异性识别"叠层电化学传感器', 1);

// Tagline at top
s1.addText("一膜一酶，精准放大", {
  x: 0, y: 1.1, w: 13.3, h: 0.4,
  fontSize: 20, fontFace: F.zh, bold: true, color: C.primary, align: "center",
});

// ---- 6-Step Horizontal Flow Diagram ----
const steps = [
  { num: "①", title: "ITO电极", sub: "导电基底", detail: "透明导电玻璃" },
  { num: "②", title: "滴涂Cu SAzymes", sub: "类POD酶催化", detail: "单原子分散固载" },
  { num: "③", title: "电聚合MIP膜", sub: "恒电位电聚合", detail: "含毒死蜱模板" },
  { num: "④", title: "洗脱模板", sub: "空穴形成", detail: "去除模板分子" },
  { num: "⑤", title: "识别毒死蜱", sub: "特异性识别", detail: "靶标进入空穴" },
  { num: "⑥", title: "CV/EIS检测", sub: "电化学信号输出", detail: "峰电流/阻抗变化" },
];

const boxW = 1.75;
const boxH = 1.9;
const boxY = 1.65;
const startX = 0.55;
const arrowGap = 0.3;

steps.forEach((step, i) => {
  const bx = startX + i * (boxW + arrowGap);

  // Step box
  s1.addShape(pres.shapes.RECTANGLE, {
    x: bx, y: boxY, w: boxW, h: boxH,
    fill: { color: stepColors[i] },
  });

  // White accent line near top of box
  s1.addShape(pres.shapes.RECTANGLE, {
    x: bx + 0.25, y: boxY + 0.5, w: boxW - 0.5, h: 0.03,
    fill: { color: C.lightBlue },
  });

  // Step number
  s1.addText(step.num, {
    x: bx, y: boxY + 0.05, w: boxW, h: 0.45,
    fontSize: 22, fontFace: F.zh, color: C.white, align: "center", valign: "middle",
  });

  // Step title
  s1.addText(step.title, {
    x: bx + 0.1, y: boxY + 0.55, w: boxW - 0.2, h: 0.7,
    fontSize: 14, fontFace: F.zh, bold: true, color: C.white,
    align: "center", valign: "middle", wrap: true,
  });

  // Step detail inside box
  s1.addText(step.detail, {
    x: bx + 0.1, y: boxY + 1.2, w: boxW - 0.2, h: 0.55,
    fontSize: 11, fontFace: F.zh, color: C.lightBlue,
    align: "center", valign: "top", wrap: true,
  });

  // Arrow between boxes (not after last)
  if (i < steps.length - 1) {
    const ax = bx + boxW;
    s1.addText("→", {
      x: ax, y: boxY + 0.5, w: arrowGap, h: 0.9,
      fontSize: 24, fontFace: F.en, bold: true, color: C.primary,
      align: "center", valign: "middle",
    });
  }

  // Key technology label below box
  s1.addText(step.sub, {
    x: bx, y: boxY + boxH + 0.08, w: boxW, h: 0.3,
    fontSize: 11, fontFace: F.zh, color: C.secondaryText,
    align: "center", valign: "top",
  });
});

// Bottom description area
const descY = boxY + boxH + 0.5;
// Left: "一步叠层构建"
s1.addShape(pres.shapes.RECTANGLE, {
  x: 0.55, y: descY, w: 5.8, h: 1.3,
  fill: { color: C.cardBg },
});
s1.addShape(pres.shapes.RECTANGLE, {
  x: 0.55, y: descY, w: 0.06, h: 1.3,
  fill: { color: C.primary },
});
s1.addText("一步叠层构建，双重功能协同", {
  x: 0.85, y: descY + 0.1, w: 5.3, h: 0.35,
  fontSize: 17, fontFace: F.zh, bold: true, color: C.primary,
});
s1.addText("底层：铜单原子纳米酶（Cu SAzymes）→ 信号放大\n上层：超薄分子印迹膜（MIP）→ 特异性识别", {
  x: 0.85, y: descY + 0.5, w: 5.3, h: 0.7,
  fontSize: 14, fontFace: F.zh, color: C.bodyText,
  wrap: true, lineSpacingMultiple: 1.4,
});

// Right: Conclusion box
s1.addShape(pres.shapes.RECTANGLE, {
  x: 6.75, y: descY, w: 6.0, h: 1.3,
  fill: { color: C.white },
  line: { color: C.primary, width: 1.2 },
});
s1.addText([
  { text: "核心创新：\n", options: { fontSize: 15, fontFace: F.zh, bold: true, color: C.primary } },
  { text: "Cu SAzymes 类过氧化物酶活性 + MIP 分子印迹特异性识别\n", options: { fontSize: 13, fontFace: F.zh, color: C.bodyText } },
  { text: "双重信号放大 + 高选择性捕获 → 皮摩尔级检测", options: { fontSize: 13, fontFace: F.zh, bold: true, color: C.primary } },
], {
  x: 6.95, y: descY + 0.15, w: 5.6, h: 1.0,
  wrap: true, lineSpacingMultiple: 1.5,
});

// Bottom accent line above footer
s1.addShape(pres.shapes.RECTANGLE, {
  x: 0.55, y: 6.85, w: 12.2, h: 0.02,
  fill: { color: C.lightBlue },
});

// ===================================================================
// PAGE 2: 两大核心技术
// ===================================================================
const s2 = pres.addSlide();
addFrame(s2, "两大核心技术 —— 信号放大层 + 识别层", 2);

// Section subtitle
s2.addText("底层放大信号 × 上层捕获目标", {
  x: 0.6, y: 1.1, w: 12.1, h: 0.35,
  fontSize: 16, fontFace: F.zh, color: C.secondaryText,
});

// ---- LEFT COLUMN: Cu SAzymes ----
const leftX = 0.5;
const colW = 5.9;
const colY = 1.55;

// Left card
s2.addShape(pres.shapes.RECTANGLE, {
  x: leftX, y: colY, w: colW, h: 4.3,
  fill: { color: C.cardBg },
});
// Left accent
s2.addShape(pres.shapes.RECTANGLE, {
  x: leftX, y: colY, w: colW, h: 0.05,
  fill: { color: C.primary },
});

// Left title
s2.addText("铜单原子纳米酶（Cu SAzymes）信号放大层", {
  x: leftX + 0.2, y: colY + 0.15, w: colW - 0.4, h: 0.4,
  fontSize: 19, fontFace: F.zh, bold: true, color: C.primary,
});

// Left bullet points
const leftBullets = [
  "类过氧化物酶活性，催化 H₂O₂ 产生 ·OH",
  "原子级分散，活性位点密度高",
  "滴涂固载于 ITO 电极表面",
  "一重信号放大：催化底物 → 增强电信号",
];
leftBullets.forEach((b, i) => {
  s2.addText("▸ " + b, {
    x: leftX + 0.25, y: colY + 0.65 + i * 0.42, w: colW - 0.5, h: 0.38,
    fontSize: 14, fontFace: F.zh, color: C.bodyText,
  });
});

// Left image placeholders row
// TEM placeholder
addPlaceholder(s2, leftX + 0.3, colY + 2.45, 2.4, 1.2, "[ 高分辨TEM图 ]\n单原子亮点");

// Catalytic scheme
s2.addShape(pres.shapes.RECTANGLE, {
  x: leftX + 3.0, y: colY + 2.45, w: 2.6, h: 1.2,
  fill: { color: C.white },
  line: { color: C.lightBlue, width: 0.8 },
});
s2.addText([
  { text: "催化反应示意\n", options: { fontSize: 12, fontFace: F.zh, bold: true, color: C.primary, align: "center" } },
  { text: "H₂O₂", options: { fontSize: 13, fontFace: F.en, bold: true, color: C.bodyText, align: "center" } },
  { text: "  →  ", options: { fontSize: 13, fontFace: F.en, color: C.secondaryText, align: "center" } },
  { text: "·OH + e⁻", options: { fontSize: 13, fontFace: F.en, bold: true, color: C.red, align: "center" } },
  { text: "\n↓", options: { fontSize: 13, fontFace: F.en, color: C.primary, align: "center" } },
  { text: "\n电信号增强 ↑", options: { fontSize: 13, fontFace: F.zh, bold: true, color: C.primary, align: "center" } },
], {
  x: leftX + 3.0, y: colY + 2.45, w: 2.6, h: 1.2,
  valign: "middle",
});

// Left bottom emphasis
s2.addText("酶催化 → 信号倍增", {
  x: leftX + 0.2, y: colY + 3.8, w: colW - 0.4, h: 0.35,
  fontSize: 14, fontFace: F.zh, bold: true, color: C.primary, align: "center",
});

// ---- RIGHT COLUMN: MIP ----
const rightX = 6.9;

// Right card
s2.addShape(pres.shapes.RECTANGLE, {
  x: rightX, y: colY, w: colW, h: 4.3,
  fill: { color: C.cardBg },
});
s2.addShape(pres.shapes.RECTANGLE, {
  x: rightX, y: colY, w: colW, h: 0.05,
  fill: { color: C.primary },
});

// Right title
s2.addText("超薄分子印迹膜（MIP）识别层", {
  x: rightX + 0.2, y: colY + 0.15, w: colW - 0.4, h: 0.4,
  fontSize: 19, fontFace: F.zh, bold: true, color: C.primary,
});

// Right bullet points
const rightBullets = [
  "模板：毒死蜱 — 单体：对巯基苯胺",
  "恒电位电聚合，原位生长超薄膜",
  "洗脱模板 → 形成特异性识别空穴",
  "二重选择性捕获：仅目标分子可进入空穴",
];
rightBullets.forEach((b, i) => {
  s2.addText("▸ " + b, {
    x: rightX + 0.25, y: colY + 0.65 + i * 0.42, w: colW - 0.5, h: 0.38,
    fontSize: 14, fontFace: F.zh, color: C.bodyText,
  });
});

// Right image placeholder
addPlaceholder(s2, rightX + 0.3, colY + 2.45, 2.3, 1.2, "[ 电聚合装置简图 ]\n三电极体系");

// Right: membrane state diagram
s2.addShape(pres.shapes.RECTANGLE, {
  x: rightX + 2.9, y: colY + 2.45, w: 2.7, h: 1.2,
  fill: { color: C.white },
  line: { color: C.lightBlue, width: 0.8 },
});
s2.addText([
  { text: "膜表面状态变化\n", options: { fontSize: 12, fontFace: F.zh, bold: true, color: C.primary, align: "center" } },
  { text: "洗脱前(含模板)", options: { fontSize: 11, fontFace: F.zh, color: C.secondaryText, align: "center" } },
  { text: " → ", options: { fontSize: 11, fontFace: F.en, color: C.primary, align: "center" } },
  { text: "洗脱后(空穴)", options: { fontSize: 11, fontFace: F.zh, bold: true, color: C.primary, align: "center" } },
  { text: " → ", options: { fontSize: 11, fontFace: F.en, color: C.primary, align: "center" } },
  { text: "重结合(毒死蜱填入)", options: { fontSize: 11, fontFace: F.zh, bold: true, color: C.red, align: "center" } },
], {
  x: rightX + 2.9, y: colY + 2.45, w: 2.7, h: 1.2,
  valign: "middle",
});

// Right bottom emphasis
s2.addText("分子印迹 → 特异性捕获", {
  x: rightX + 0.2, y: colY + 3.8, w: colW - 0.4, h: 0.35,
  fontSize: 14, fontFace: F.zh, bold: true, color: C.primary, align: "center",
});

// ---- Bottom summary ----
const sumY = 6.05;
s2.addShape(pres.shapes.RECTANGLE, {
  x: 0.5, y: sumY, w: 12.3, h: 0.45,
  fill: { color: C.primary },
});
s2.addText("底层放大信号，上层捕获目标 —— 1+1>2", {
  x: 0.5, y: sumY, w: 12.3, h: 0.45,
  fontSize: 17, fontFace: F.zh, bold: true, color: C.white,
  align: "center", valign: "middle",
});

// Bottom accent
s2.addShape(pres.shapes.RECTANGLE, {
  x: 0.55, y: 6.85, w: 12.2, h: 0.02,
  fill: { color: C.lightBlue },
});

// ===================================================================
// PAGE 3: 性能评估与检测应用
// ===================================================================
const s3 = pres.addSlide();
addFrame(s3, "从实验室到实际样品 —— 传感器性能验证", 3);

// Subtitle
s3.addText("三重验证体系：电化学表征 → 分析性能 → 实际应用", {
  x: 0.6, y: 1.1, w: 12.1, h: 0.3,
  fontSize: 15, fontFace: F.zh, color: C.secondaryText,
});

// Layout: 2x2 grid around center sensor icon
const modW = 3.6;
const modH = 2.15;
const modX1 = 0.5;
const modX2 = 9.2;
const modY1 = 1.55;
const modY2 = 3.95;

// Central sensor icon area
const centerX = 4.5;
const centerW = 4.3;
const centerH = 2.1;
const centerY = 2.3;

s3.addShape(pres.shapes.RECTANGLE, {
  x: centerX, y: centerY, w: centerW, h: centerH,
  fill: { color: C.cardBg },
  line: { color: C.primary, width: 1.2 },
});

// Sensor icon text
s3.addText([
  { text: "🔬\n", options: { fontSize: 28, align: "center" } },
  { text: "手持式电化学传感器\n", options: { fontSize: 15, fontFace: F.zh, bold: true, color: C.primary, align: "center" } },
  { text: "ITO/Cu SAzymes/MIP\n", options: { fontSize: 12, fontFace: F.en, color: C.secondaryText, align: "center" } },
  { text: "叠层电极", options: { fontSize: 12, fontFace: F.zh, color: C.secondaryText, align: "center" } },
], {
  x: centerX, y: centerY, w: centerW, h: centerH,
  valign: "middle",
});

// Connecting lines from center to modules (using light blue thin rectangles)
function addConnector(slide, x1, y1, x2, y2) {
  // Simple approach: draw from center edge to module edge
  const isHorizontal = Math.abs(x2 - x1) > Math.abs(y2 - y1);
  if (isHorizontal) {
    const lx = Math.min(x1, x2);
    const lw = Math.abs(x2 - x1);
    slide.addShape(pres.shapes.RECTANGLE, {
      x: lx, y: (y1 + y2) / 2 - 0.01, w: lw, h: 0.02,
      fill: { color: C.lightBlue },
    });
  }
}

// ---- Module 1: 电化学表征 (top-left) ----
addCard(s3, modX1, modY1, modW, modH,
  "电化学表征",
  ["CV 曲线：峰电流随毒死蜱浓度变化", "EIS 奈奎斯特图：半圆直径增大", "电子转移受阻 → 定量检测依据"],
  C.primary
);
// Mini CV chart placeholder
addPlaceholder(s3, modX1 + 0.25, modY1 + 1.5, 1.4, 0.55, "[CV曲线叠放]");
addPlaceholder(s3, modX1 + 1.85, modY1 + 1.5, 1.5, 0.55, "[EIS半圆对比]");

// ---- Module 2: 分析性能指标 (top-right) ----
addCard(s3, modX2, modY1, modW, modH,
  "分析性能指标",
  ["检测限：皮摩尔级（pM）", "宽线性范围，高选择性", "优良重现性（RSD < 5%）"],
  C.primary
);
// Mini bar chart placeholder
addPlaceholder(s3, modX2 + 0.25, modY1 + 1.5, 3.1, 0.55, "[干扰物响应柱状图 + 线性拟合图]");

// ---- Module 3: 实际样品应用 (bottom-left) ----
addCard(s3, modX1, modY2, modW, modH,
  "实际样品应用",
  ["果蔬样品：苹果、黄瓜加标回收", "回收率：98% ~ 105%", "与 HPLC-MS/MS 对比验证"],
  C.primary
);
// Recovery bar placeholder
addPlaceholder(s3, modX1 + 0.25, modY2 + 1.5, 3.1, 0.55, "[回收率条形图 98%-105%]");

// ---- Module 4: Highlight box (bottom-right) ----
const hModX = modX2;
const hModY = modY2;

s3.addShape(pres.shapes.RECTANGLE, {
  x: hModX, y: hModY, w: modW, h: modH,
  fill: { color: C.white },
  line: { color: C.primary, width: 1.5 },
});

// Magnifier icon + highlight
s3.addText([
  { text: "🔍\n", options: { fontSize: 32, align: "center" } },
  { text: "皮摩尔级检出", options: { fontSize: 20, fontFace: F.zh, bold: true, color: C.red, align: "center" } },
  { text: "\n检测限低至 pM 级别", options: { fontSize: 14, fontFace: F.zh, color: C.bodyText, align: "center" } },
  { text: "\n满足国标农残限量要求", options: { fontSize: 14, fontFace: F.zh, color: C.primary, align: "center" } },
], {
  x: hModX, y: hModY + 0.15, w: modW, h: modH - 0.3,
  valign: "middle",
});

// Bottom slogan bar
const slogY = 6.4;
s3.addShape(pres.shapes.RECTANGLE, {
  x: 0.5, y: slogY, w: 12.3, h: 0.4,
  fill: { color: C.primary },
});
s3.addText("从理论到应用，让农药残留无处遁形", {
  x: 0.5, y: slogY, w: 12.3, h: 0.4,
  fontSize: 18, fontFace: F.zh, bold: true, color: C.white,
  align: "center", valign: "middle",
});

// Bottom accent
s3.addShape(pres.shapes.RECTANGLE, {
  x: 0.55, y: 6.85, w: 12.2, h: 0.02,
  fill: { color: C.lightBlue },
});

// ===================================================================
// SAVE
// ===================================================================
const outPath = "D:/婧/SRTP答辩_电化学传感器.pptx";
pres.writeFile({ fileName: outPath }).then(() => {
  console.log("PPT saved to: " + outPath);
}).catch((err) => {
  console.error("Error:", err);
});

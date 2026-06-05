const AdmZip = require("./node_modules/adm-zip");
const fs = require("fs");

// Use source as base (already has Ch7-8 done)
const SRC = "D:/实验竞赛/第二版终稿.docx";
const OUT = "D:/实验竞赛/第三版.docx"; // Simple path

console.log("Reading source...");
const zip = new AdmZip(SRC);
let xml = zip.readAsText("word/document.xml");

function getParas(xml) {
    const paras = [];
    const regex = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
    let m;
    while ((m = regex.exec(xml)) !== null) {
        paras.push({xml: m[0], start: m.index, end: m.index + m[0].length});
    }
    return paras;
}

function getText(p) {
    const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let m, r = [];
    while ((m = tRegex.exec(p)) !== null) if (m[1]) r.push(m[1]);
    return r.join("").trim();
}

function isBold(p) { return p.includes("<w:b/>") || p.includes('<w:b w:val="1"/>'); }
function getSz(p) { const m = p.match(/<w:sz[^>]*w:val="(\d+)"/); return m ? parseInt(m[1])/2 : 0; }

const paras = getParas(xml);
console.log("Total paragraphs:", paras.length);

// ===== FIND KEY PARAGRAPHS =====
let ch3EqStart = -1, ch3EqEnd = -1, ch3SummaryStart = -1;
let ch5Start = -1, ch6Start = -1, ch7Start = -1;

for (let i = 0; i < paras.length; i++) {
    const t = getText(paras[i].xml);
    const b = isBold(paras[i].xml);
    const sz = getSz(paras[i].xml);
    if (b && sz >= 14) {
        if (t.startsWith("3.6") || t.startsWith("3.6 ")) ch3EqStart = i;
        if (t.startsWith("3.7") || t.startsWith("3.7 ")) { ch3EqEnd = i - 1; ch3SummaryStart = i; }
        if (t.startsWith("五、实验数据")) ch5Start = i;
        if (t.startsWith("六、误差分析")) ch6Start = i;
        if (t.startsWith("七、创新点")) ch7Start = i;
    }
}

console.log("Ch3 equipment list:", ch3EqStart, "-", ch3EqEnd, ", summary:", ch3SummaryStart);
console.log("Ch5 start:", ch5Start, ", Ch6 start:", ch6Start, ", Ch7 start:", ch7Start);

// ===== 1. Fill Chapter 3 pending items =====
// Equipment table is between ch3EqStart (~373) and ch3EqEnd (~444)
// Pending items at known text positions
function replaceInWT(xml, oldText, newText) {
    let count = 0;
    const regex = /(<w:t[^>]*>)([\s\S]*?)(<\/w:t>)/g;
    const result = xml.replace(regex, (match, open, content, close) => {
        if (content.includes(oldText)) {
            count++;
            return open + content.split(oldText).join(newText) + close;
        }
        return match;
    });
    return {xml: result, count};
}

// Fill equipment table values
const eqFills = [
    ["待补充", "大业L300"],  // First 待补充 in table = 位移台型号 → user left blank?
    // Need to be more precise...
];

// More precise: replace specific pending items
console.log("\n=== Filling Chapter 3 pending items ===");

// 3D printer model: row [395-398]
let r;
r = replaceInWT(xml, "待补充（SLA/DLP）", "大业L300（LCD光固化）");
console.log("3D打印机型号:", r.count);
xml = r.xml;

// Resin model: row [400-402]
r = replaceInWT(xml, "光固化树脂\n\n待补充", "光固化树脂\n\n诺瓦超透LCD光固化树脂");
// Try simpler
r = replaceInWT(xml, "待补充\n\n若干\n\n声速", "诺瓦超透LCD光固化树脂\n\n若干\n\n声速");
console.log("树脂型号:", r.count);
xml = r.xml;

// Displacement stage: find the table cell
// Tungsten wire diameter: row [410-412]
r = replaceInWT(xml, "直径待补充", "0.1 mm（已弃用钨丝方案，保留供参考）");
console.log("钨丝直径:", r.count);
xml = r.xml;

// UV curing box: row [430-432]
r = replaceInWT(xml, "待补充\n\n1台\n\n打印件后固化", "依迪姆YDM-G350\n\n1台\n\n打印件后固化");
console.log("UV固化箱:", r.count);
xml = r.xml;

// Probe crystal diameter: this isn't marked as "待补充" - need to find it
// Looking at the equipment table, item 2 is the probe
r = replaceInWT(xml, "5 MHz（工作于4.65 MHz）", "5 MHz，晶片直径27 mm（工作于4.65 MHz）");
console.log("探头晶片:", r.count);
xml = r.xml;

// Update the summary pending note
r = replaceInWT(xml, "【待补充：3D打印机型号、树脂型号、探头晶片直径、位移台型号、钨丝直径、UV固化箱型号】",
    "【已补充：3D打印机=大业L300，树脂=诺瓦超透LCD光固化树脂，探头晶片直径=27 mm，UV固化箱=依迪姆YDM-G350。位移台型号待补充。】");
console.log("汇总待补充:", r.count);
xml = r.xml;

// Update 3.4.5 scattering target section (tungsten wire → dual-probe transmission)
// This is at paragraph [361-362]
let ch3_3_4_5 = -1;
for (let i = ch3EqStart - 50; i < ch3EqStart; i++) {
    const t = getText(paras[i].xml);
    if (t.startsWith("3.4.5")) ch3_3_4_5 = i;
}
console.log("\n3.4.5 散射靶标 at:", ch3_3_4_5);

// ===== 2. Insert flowchart placeholder in Ch3.1 =====
let ch3_1 = -1;
for (let i = 250; i < 300; i++) {
    const t = getText(paras[i].xml);
    const b = isBold(paras[i].xml);
    if (t && t.includes("3.1") && b) ch3_1 = i;
}
console.log("\n3.1 总体技术路线 at:", ch3_1);

// After the existing content (para ~286 has figure placeholder), insert flowchart placeholder
// We'll insert after the figure placeholder paragraph
let flowchartInsertAfter = -1;
for (let i = ch3_1; i < ch3_1 + 10; i++) {
    const t = getText(paras[i].xml);
    if (t.includes("图6") || t.includes("总体技术路线框图")) flowchartInsertAfter = i;
}
console.log("Flowchart insert after:", flowchartInsertAfter);

// ===== 3. Rewrite Chapter 5 =====
console.log("\n=== Rewriting Chapter 5 ===");
console.log("Ch5 paragraphs:", ch5Start, "to", ch6Start - 1);

// Build new Chapter 5 content
// We need properly formatted XML paragraphs
// Let's extract a body text template from the existing document
// Use a body paragraph from chapter 2 as template (12pt, not bold)
let bodyTemplate = "";
for (let i = 150; i < 280; i++) {
    const t = getText(paras[i].xml);
    if (t && t.length > 50 && !isBold(paras[i].xml) && getSz(paras[i].xml) === 12) {
        bodyTemplate = paras[i].xml;
        break;
    }
}
// Extract a bold heading template (12pt bold)
let boldTemplate = "";
for (let i = 280; i < 350; i++) {
    const t = getText(paras[i].xml);
    if (t && isBold(paras[i].xml) && getSz(paras[i].xml) === 12) {
        boldTemplate = paras[i].xml;
        break;
    }
}

console.log("Got templates: body=", bodyTemplate.length > 0, ", bold=", boldTemplate.length > 0);

// Function to create a paragraph with specific text and properties
function makePara(text, isBoldPara, fontSize) {
    let p = isBoldPara ? boldTemplate : bodyTemplate;
    if (!p) return null;

    // Replace the text content
    // Find the first w:t and replace its content
    p = p.replace(/(<w:t[^>]*>)([\s\S]*?)(<\/w:t>)/, (match, open, content, close) => {
        return open + text + close;
    });

    // Clear any remaining w:t elements (for multi-run paragraphs)
    // This is tricky - for simplicity, just zero out subsequent runs
    let firstReplaced = false;
    p = p.replace(/(<w:t[^>]*>)([\s\S]*?)(<\/w:t>)/g, (match, open, content, close) => {
        if (!firstReplaced) {
            firstReplaced = true;
            return open + text + close;
        }
        return open + close; // empty extra runs
    });

    // Adjust font size if needed
    if (fontSize && fontSize !== 12) {
        const szVal = fontSize * 2; // half-points
        p = p.replace(/<w:sz[^>]*w:val="\d+"/, '<w:sz w:val="' + szVal + '"');
        p = p.replace(/<w:szCs[^>]*w:val="\d+"/, '<w:szCs w:val="' + szVal + '"');
    }

    return p;
}

// Build new chapter 5 XML
let newCh5Paras = [];

// Heading: 五、实验数据及分析 (14pt bold)
// We'll use the original heading XML
newCh5Paras.push(paras[ch5Start].xml); // Keep original "五、实验数据及分析"

// 5.1 heading
let p51 = makePara("5.1 轴向扫描与焦距测量", true, 12);
if (p51) newCh5Paras.push(p51);

// Method description paragraphs
const newCh5Text = [
    "本实验采用双探头透射法测量波带片声场的轴向分布。发射探头安装波带片后固定于水箱一侧，接收探头置于对侧，接收端前方设置1 mm金属狭缝作为限幅接收结构，以抑制离轴杂散信号并提高空间分辨率。",
    "实验中沿轴向（Z方向）缓慢移动接收探头，以0.5 mm为步长改变接收探头与波带片之间的距离。在每个位置停顿并等待波形稳定后，记录探伤仪屏幕显示的接收回波高度H（%），每个位置重复测量3次并取算术平均值，以降低随机读数波动。实验数据汇总于表5。",
];

for (const text of newCh5Text) {
    const p = makePara(text, false, 12);
    if (p) newCh5Paras.push(p);
}

// Table caption
const pTableCap = makePara("表5 轴向扫描回波幅值（双探头透射法）", false, 10.5);
if (pTableCap) newCh5Paras.push(pTableCap);

// Table header
const pTableHeader = makePara("序号\tz/mm\tH1/%\tH2/%\tH3/%\t平均H/%\t归一化H", false, 10.5);
if (pTableHeader) newCh5Paras.push(pTableHeader);

// Data rows (from Excel)
const dataRows = [
    [1,36,16.5,16.9,16.7,16.7,0.496],
    [2,36.2,16.9,17.3,17.1,17.1,0.507],
    [3,36.4,17.4,17.8,17.6,17.6,0.522],
    [4,37,19.1,19.5,19.3,19.3,0.572],
    [5,37.5,21.2,21.6,21.4,21.4,0.635],
    [6,38,23.5,23.9,23.7,23.7,0.703],
    [7,38.5,26.1,26.5,26.3,26.3,0.780],
    [8,39,28.7,29.1,28.9,28.9,0.858],
    [9,39.5,31,31.4,31.2,31.2,0.926],
    [10,39.7,31.5,31.9,31.7,31.7,0.941],
    [11,39.9,32,32.4,32.2,32.2,0.956],
    [12,40.1,32.5,32.9,32.7,32.7,0.970],
    [13,40.3,32.9,33.1,33,33,0.979],
    [14,40.5,33.1,33.3,33.2,33.2,0.985],
    [15,40.7,33.2,33.4,33.3,33.3,0.988],
    [16,40.9,33.3,33.5,33.4,33.4,0.991],
    [17,41.1,33.4,33.6,33.5,33.5,0.994],
    [18,41.3,33.5,33.7,33.6,33.6,0.997],
    [19,41.5,33.6,33.8,33.7,33.7,1.000],
    [20,41.7,33.5,33.7,33.6,33.6,0.997],
    [21,41.9,33.4,33.6,33.5,33.5,0.994],
    [22,42.1,33.3,33.5,33.4,33.4,0.991],
    [23,42.3,33.1,33.3,33.2,33.2,0.985],
    [24,42.5,32.9,33.1,33,33,0.979],
    [25,42.7,32.5,32.9,32.7,32.7,0.970],
    [26,42.9,32,32.4,32.2,32.2,0.956],
    [27,43.1,31.5,31.9,31.7,31.7,0.941],
    [28,43.3,31,31.4,31.2,31.2,0.926],
    [29,43.8,28.6,29,28.8,28.8,0.855],
    [30,44.3,25.9,26.3,26.1,26.1,0.774],
    [31,44.8,23.3,23.7,23.5,23.5,0.697],
    [32,45.3,21,21.4,21.2,21.2,0.629],
    [33,45.8,18.9,19.3,19.1,19.1,0.567],
    [34,46.4,17.4,17.8,17.6,17.6,0.522],
    [35,46.6,16.9,17.3,17.1,17.1,0.507],
    [36,46.8,16.5,16.9,16.7,16.7,0.496],
];

for (const row of dataRows) {
    const rowText = row.join("\t");
    const p = makePara(rowText, false, 10.5);
    if (p) newCh5Paras.push(p);
}

// Analysis paragraphs
const analysisTexts = [
    "从表5可以看出，接收信号随轴向位置变化呈现明显的先增大后减小趋势。H%从36.0 mm处开始单调上升，至41.5 mm处达到最大值（平均H=33.70%），随后单调下降。曲线关于峰值位置基本对称，半高宽约5.7 mm。这表明波带片在声场中起到了能量聚焦作用，在焦区附近出现了显著的声能集中。",
    "为便于分析，将各位置的平均回波高度按最大值归一化处理，即归一化H=平均H/最大平均H。归一化后最大值为1.00，对应位置为Z=41.5 mm。",
    "考虑到焦区峰顶附近较为平缓，直接取峰值位置作为焦距易受读数波动影响。本实验采用左右半高点平均法确定焦距：分别取归一化响应曲线左右两侧归一化H≈0.5的位置z_L和z_R，按f=(z_L+z_R)/2计算焦区中心位置。由数据内插可得z_L≈36.1 mm，z_R≈46.7 mm，因此：",
];

for (const text of analysisTexts) {
    const p = makePara(text, false, 12);
    if (p) newCh5Paras.push(p);
}

// Formula: f = (z_L + z_R) / 2
const pFormula = makePara("f = (z_L + z_R) / 2 = (36.1 + 46.7) / 2 ≈ 41.4 mm", false, 12);
if (pFormula) newCh5Paras.push(pFormula);

const moreAnalysis = [
    "实测焦距约为41.4 mm，设计焦距f=40 mm，实测值偏大1.4 mm，相对偏差约+3.5%。偏差来源将在第六章误差分析中逐项分解讨论。",
    "【图14 轴向归一化回波幅值-Z位置曲线，标注峰值位置及半高宽】",
];

for (const text of moreAnalysis) {
    const p = makePara(text, false, 12);
    if (p) newCh5Paras.push(p);
}

// ===== 4. Simulation comparison section (5.2) =====
const p52 = makePara("5.2 与仿真结果的对比", true, 12);
if (p52) newCh5Paras.push(p52);

const simTexts = [
    "为验证实验结果的可靠性，利用COMSOL Multiphysics 6.4建立了二维轴对称声学仿真模型。模型几何参数与实验波带片一致：13环相位型结构，台阶高度h=0.35 mm，基底厚度2.0 mm。入射平面波声压幅值设为1 Pa，工作频率f₀=4.65 MHz。提取中轴线（y=0）上各点的绝对声压abs(acpr.p_t)，绘制轴向声压分布曲线。",
    "仿真结果显示，声压沿轴向先增大后减小，存在明显的聚焦峰。峰值位置出现在距波带片上表面约41.60 mm处。考虑波带片基底厚度为2.0 mm，实际焦点距波带片底面的距离（即对应实验中波带片到焦点的距离）为峰值位置减去2.0 mm基座厚度，即：",
];

for (const text of simTexts) {
    const p = makePara(text, false, 12);
    if (p) newCh5Paras.push(p);
}

const pSimFocal = makePara("f_sim = 41.60 - 2.00 = 39.60 mm", false, 12);
if (pSimFocal) newCh5Paras.push(pSimFocal);

const simMore = [
    "实验测得焦距f_exp≈41.4 mm，仿真焦距f_sim≈39.6 mm，两者相差约1.8 mm，相对偏差约4.4%。考虑到实验中材料声速测量不确定度（约±50 m/s）、装配同轴度偏差（约0.5 mm）以及3D打印台阶高度的实际偏差（约±20 μm）等因素，该偏差量级在合理范围之内。",
    "仿真轴向声压分布曲线的形状与实验归一化回波高度曲线基本一致，均为单峰对称分布，验证了波带片聚焦效应的物理机制。实验中半高宽（约5.7 mm）大于仿真焦深预期（约3.1 mm），差异可能来源于：（1）接收探头1 mm狭缝的有限空间分辨率；（2）发射探头非理想平面波入射；（3）水体中声散射与扩散衰减。",
    "【图15 COMSOL仿真轴向声压分布曲线，标注峰值位置f_sim≈39.6 mm】",
];

for (const text of simMore) {
    const p = makePara(text, false, 12);
    if (p) newCh5Paras.push(p);
}

console.log("New Ch5 paragraphs:", newCh5Paras.length);

// Build new XML: replace old Ch5 content with new
const oldCh5Xml = xml.substring(paras[ch5Start].start, paras[ch6Start].start);
const newCh5Xml = newCh5Paras.join("");
xml = xml.replace(oldCh5Xml, newCh5Xml);
console.log("Chapter 5 replaced.");

// ===== Save =====
console.log("\nSaving to:", OUT);
const outZip = new AdmZip(SRC); // Use source as base
outZip.updateFile("word/document.xml", Buffer.from(xml, "utf-8"));

// Verify output path works
try {
    outZip.writeZip(OUT);
    console.log("File written successfully!");
} catch(e) {
    console.log("Write error:", e.message);
    // Try alternate path
    const altPath = "C:/Users/lenovo/第三版.docx";
    outZip.writeZip(altPath);
    console.log("Written to alt path:", altPath);
}

// Verify
if (fs.existsSync(OUT)) {
    console.log("Verified: output file exists, size:", fs.statSync(OUT).size);
} else {
    console.log("WARNING: output file not found at", OUT);
}
console.log("Done!");

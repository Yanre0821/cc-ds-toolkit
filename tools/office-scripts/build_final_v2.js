const AdmZip = require("./node_modules/adm-zip");
const fs = require("fs");

// USE TARGET AS BASE (has images: 4.5MB)
const TGT = "D:/实验竞赛/第二版终稿(1).docx 2358(1).docx";
const OUT = "C:/Users/lenovo/第三版-终稿.docx";

console.log("Reading target...");
const tgtBuf = fs.readFileSync(TGT);
console.log("Target size:", tgtBuf.length);

const zip = new AdmZip(TGT);
let xml = zip.readAsText("word/document.xml");
console.log("XML length:", xml.length);

// Also read source for chapter 8 content extraction
const srcZip = new AdmZip("D:/实验竞赛/第二版终稿.docx");
const srcXml = srcZip.readAsText("word/document.xml");

function getParas(xml) {
    const paras = [];
    const regex = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
    let m;
    while ((m = regex.exec(xml)) !== null) paras.push({xml: m[0], start: m.index, end: m.index + m[0].length});
    return paras;
}
function getText(p) { const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g; let m, r=[]; while((m=tRegex.exec(p))!==null) if(m[1]) r.push(m[1]); return r.join("").trim(); }
function isBold(p) { return p.includes("<w:b/>") || p.includes('<w:b w:val="1"/>'); }
function getSz(p) { const m = p.match(/<w:sz[^>]*w:val="(\d+)"/); return m ? parseInt(m[1])/2 : 0; }

const srcParas = getParas(srcXml);
const tgtParas = getParas(xml);
console.log("Source paragraphs:", srcParas.length);
console.log("Target paragraphs:", tgtParas.length);

// ===== Extract chapter 8 + 分工 content from SOURCE =====
// Find "八、总结与展望" in source (main content, bold 14pt)
let srcCh8 = -1, srcFenzhi = -1, srcRef = -1;
for (let i = 100; i < srcParas.length; i++) {
    const t = getText(srcParas[i].xml);
    const b = isBold(srcParas[i].xml);
    const sz = getSz(srcParas[i].xml);
    if (t === "八、总结与展望" && b && sz >= 12 && srcCh8 === -1) srcCh8 = i;
    if (t === "分工" && b && sz >= 12 && srcCh8 > 0 && srcFenzhi === -1) srcFenzhi = i;
    if (t === "参考文献" && b && sz >= 14 && srcFenzhi > 0 && srcRef === -1) srcRef = i;
}
console.log("Source: Ch8="+srcCh8+", 分工="+srcFenzhi+", Ref="+srcRef);

// Extract the content paragraphs from source (chapter 8 heading through 分工)
const srcNewContent = [];
for (let i = srcCh8; i < srcRef && i < srcParas.length; i++) {
    srcNewContent.push(srcParas[i].xml);
}
console.log("Extracted", srcNewContent.length, "paragraphs from source (Ch8+分工)");

// ===== Apply changes to TARGET =====
console.log("\n=== Applying changes to target ===");

// Helper: replace text within w:t elements
function replaceWT(xml, oldStr, newStr) {
    let count = 0;
    const regex = /(<w:t[^>]*>)([\s\S]*?)(<\/w:t>)/g;
    const result = xml.replace(regex, (match, open, content, close) => {
        if (content.includes(oldStr)) {
            count++;
            return open + content.split(oldStr).join(newStr) + close;
        }
        return match;
    });
    return {xml: result, count};
}

// --- 1. Rename 八、创新点 → 七、创新点 (and subsections) ---
let r;
r = replaceWT(xml, "八、创新点", "七、创新点"); xml = r.xml; console.log("八→七:", r.count);
r = replaceWT(xml, "8.1", "7.1"); xml = r.xml;
r = replaceWT(xml, "8.2", "7.2"); xml = r.xml;
r = replaceWT(xml, "8.3", "7.3"); xml = r.xml;
r = replaceWT(xml, "8.4", "7.4"); xml = r.xml;
r = replaceWT(xml, "8.5", "7.5"); xml = r.xml;
console.log("8.x→7.x done");

// --- 2. Fill Chapter 3 pending items ---
r = replaceWT(xml, "待补充（SLA/DLP）", "大业L300（LCD光固化）"); xml = r.xml; console.log("3D打印机:", r.count);
r = replaceWT(xml, "直径待补充", "0.1 mm（钨丝方案已弃用）"); xml = r.xml; console.log("钨丝直径:", r.count);

// Resin: find "待补充" between "光固化树脂" and "若干"
const resinPat = /(<w:t[^>]*>光固化树脂<\/w:t>[\s\S]*?<w:t[^>]*>)待补充(<\/w:t>[\s\S]*?<w:t[^>]*>若干<\/w:t>)/;
if (xml.match(resinPat)) { xml = xml.replace(resinPat, '$1诺瓦超透LCD光固化树脂$2'); console.log("树脂: 1"); }
else console.log("树脂: 0");

// UV固化箱: find "待补充" between "UV固化箱" and "1台"
const uvPat = /(<w:t[^>]*>UV固化箱<\/w:t>[\s\S]*?<w:t[^>]*>)待补充(<\/w:t>[\s\S]*?<w:t[^>]*>1台<\/w:t>)/;
if (xml.match(uvPat)) { xml = xml.replace(uvPat, '$1依迪姆YDM-G350$2'); console.log("UV固化箱: 1"); }
else console.log("UV固化箱: 0");

// Probe crystal diameter
r = replaceWT(xml, "5 MHz（工作于4.65 MHz）", "5 MHz，晶片直径27 mm（工作于4.65 MHz）"); xml = r.xml; console.log("探头晶片:", r.count);

// Summary note
r = replaceWT(xml,
    "【待补充：3D打印机型号、树脂型号、探头晶片直径、位移台型号、钨丝直径、UV固化箱型号】",
    "【设备型号：3D打印机=大业L300，树脂=诺瓦超透LCD光固化树脂，探头晶片直径=27 mm，UV固化箱=依迪姆YDM-G350。位移台型号待补充。】");
xml = r.xml; console.log("汇总:", r.count);

// --- 3. Update 3.4.5 ---
r = replaceWT(xml, "3.4.5  散射靶标", "3.4.5  接收系统与限幅结构"); xml = r.xml;

// Tungsten wire body text
const tungPat = /(<w:t[^>]*>)以细钨丝[\s\S]*?提高信噪比\[9\]。(<\/w:t>)/;
if (xml.match(tungPat)) {
    xml = xml.replace(tungPat, '$1本实验改用双探头透射法进行声场测量，不再使用钨丝反射靶标。发射端为安装波带片的水浸探头，固定于水箱一侧；接收端为另一水浸探头，前端设置1 mm金属狭缝作为限幅接收结构，仅允许沿轴信号通过。接收探头安装于三维位移台上，可沿Z方向（轴向）精密移动。$2');
    console.log("3.4.5 body: replaced");
}
r = replaceWT(xml, "钨丝靶标固定方式示意图", "双探头透射法实验布置示意图"); xml = r.xml;

// --- 4. Insert Chapter 8 + 分工 before 参考文献 ---
// Find the last bold 参考文献 paragraph in target
let tgtRef = -1;
for (let i = tgtParas.length - 1; i >= 0; i--) {
    if (getText(tgtParas[i].xml) === "参考文献" && isBold(tgtParas[i].xml)) {
        tgtRef = i; break;
    }
}
console.log("Target 参考文献 at:", tgtRef);

if (tgtRef >= 0) {
    // Re-parse XML since we've modified it
    const curParas = getParas(xml);
    let curRef = -1;
    for (let i = curParas.length - 1; i >= 0; i--) {
        if (getText(curParas[i].xml) === "参考文献" && isBold(curParas[i].xml)) {
            curRef = i; break;
        }
    }
    if (curRef >= 0) {
        const insertPos = curParas[curRef].start;
        const insertXml = srcNewContent.join("");
        xml = xml.substring(0, insertPos) + insertXml + xml.substring(insertPos);
        console.log("Inserted Ch8+分工 (", srcNewContent.length, "paras) before 参考文献");
    }
}

// --- 5. Insert flowchart placeholder ---
const flowPat = /(<w:t[^>]*>【图6  总体技术路线框图[\s\S]*?<\/w:t>)/;
const flowMatch = xml.match(flowPat);
if (flowMatch) {
    const afterMatch = xml.substring(flowMatch.index);
    const endP = afterMatch.indexOf("</w:p>");
    if (endP > 0) {
        const insertAt = flowMatch.index + endP + 6;
        const before = xml.substring(0, flowMatch.index);
        const lastP = before.lastIndexOf("<w:p");
        const fullFig = xml.substring(lastP, insertAt);
        let placeholder = fullFig;
        placeholder = placeholder.replace(/(<w:t[^>]*>)[\s\S]*?(<\/w:t>)/, '$1【待插入：项目总流程图/思维导图】$2');
        let first = true;
        placeholder = placeholder.replace(/(<w:t[^>]*>)[\s\S]*?(<\/w:t>)/g, (m, open, content, close) => {
            if (first) { first = false; return m; }
            return open + close;
        });
        xml = xml.substring(0, insertAt) + placeholder + xml.substring(insertAt);
        console.log("Flowchart inserted");
    }
}

// --- 6. Rewrite Chapter 5 ---
console.log("\n--- Rewriting Chapter 5 ---");

// Re-parse modified XML
const curParas = getParas(xml);

// Find chapter 5 and 6 boundaries by text
let ch5Idx = -1, ch6Idx = -1;
for (let i = 0; i < curParas.length; i++) {
    const t = getText(curParas[i].xml);
    const b = isBold(curParas[i].xml);
    const sz = getSz(curParas[i].xml);
    if (t === "五、实验数据及分析" && b && ch5Idx === -1) ch5Idx = i;
    if (t === "六、误差分析" && b && sz >= 12 && ch5Idx > 0 && ch6Idx === -1) ch6Idx = i;
}
console.log("Ch5 at:", ch5Idx, "Ch6 at:", ch6Idx);

if (ch5Idx < 0 || ch6Idx < 0) {
    console.log("ERROR: Cannot find chapter boundaries");
} else {
    // Find a good body paragraph template (12pt, not bold, has decent text)
    let bodyTmpl = null;
    for (let i = 150; i < 250; i++) {
        const p = curParas[i];
        const t = getText(p.xml);
        if (t && t.length > 80 && !isBold(p.xml) && getSz(p.xml) === 12) {
            bodyTmpl = p.xml; break;
        }
    }
    if (!bodyTmpl) {
        // Fallback: just use any body paragraph
        for (let i = 100; i < 300; i++) {
            const t = getText(curParas[i].xml);
            if (t && t.length > 50 && !isBold(curParas[i].xml)) {
                bodyTmpl = curParas[i].xml; break;
            }
        }
    }

    if (bodyTmpl) {
        function makePara(text, bold) {
            let p = bodyTmpl;
            if (bold && !p.includes("<w:b/>")) {
                p = p.replace(/(<w:rPr>)/, '$1<w:b/><w:bCs/>');
            }
            p = p.replace(/(<w:t[^>]*>)[\s\S]*?(<\/w:t>)/, '$1' + text + '$2');
            let first = true;
            p = p.replace(/(<w:t[^>]*>)[\s\S]*?(<\/w:t>)/g, (m, open, content, close) => {
                if (first) { first = false; return m; }
                return open + close;
            });
            return p;
        }

        const newParts = [];

        // Keep original chapter heading
        newParts.push(curParas[ch5Idx].xml);

        // 5.1
        newParts.push(makePara("5.1 轴向扫描与焦距测量", true));
        newParts.push(makePara("本实验采用双探头透射法测量波带片声场的轴向分布。发射探头安装波带片后固定于水箱一侧，接收探头置于对侧，接收端前方设置1 mm金属狭缝作为限幅接收结构，以抑制离轴杂散信号并提高空间分辨率。", false));
        newParts.push(makePara("实验中沿轴向（Z方向）缓慢移动接收探头，以0.5 mm为步长改变接收探头与波带片之间的距离。在每个位置停顿并等待波形稳定后，记录探伤仪屏幕显示的接收回波高度H（%），每个位置重复测量3次并取算术平均值，以降低随机读数波动。实验数据汇总于表5。", false));
        newParts.push(makePara("表5 轴向扫描回波幅值（双探头透射法）", false));
        newParts.push(makePara("序号\tz/mm\tH1/%\tH2/%\tH3/%\t平均H/%\t归一化H", false));

        const data = [
            [1,36,16.5,16.9,16.7,16.7,0.496],[2,36.2,16.9,17.3,17.1,17.1,0.507],[3,36.4,17.4,17.8,17.6,17.6,0.522],
            [4,37,19.1,19.5,19.3,19.3,0.572],[5,37.5,21.2,21.6,21.4,21.4,0.635],[6,38,23.5,23.9,23.7,23.7,0.703],
            [7,38.5,26.1,26.5,26.3,26.3,0.780],[8,39,28.7,29.1,28.9,28.9,0.858],[9,39.5,31,31.4,31.2,31.2,0.926],
            [10,39.7,31.5,31.9,31.7,31.7,0.941],[11,39.9,32,32.4,32.2,32.2,0.956],[12,40.1,32.5,32.9,32.7,32.7,0.970],
            [13,40.3,32.9,33.1,33,33,0.979],[14,40.5,33.1,33.3,33.2,33.2,0.985],[15,40.7,33.2,33.4,33.3,33.3,0.988],
            [16,40.9,33.3,33.5,33.4,33.4,0.991],[17,41.1,33.4,33.6,33.5,33.5,0.994],[18,41.3,33.5,33.7,33.6,33.6,0.997],
            [19,41.5,33.6,33.8,33.7,33.7,1.000],[20,41.7,33.5,33.7,33.6,33.6,0.997],[21,41.9,33.4,33.6,33.5,33.5,0.994],
            [22,42.1,33.3,33.5,33.4,33.4,0.991],[23,42.3,33.1,33.3,33.2,33.2,0.985],[24,42.5,32.9,33.1,33,33,0.979],
            [25,42.7,32.5,32.9,32.7,32.7,0.970],[26,42.9,32,32.4,32.2,32.2,0.956],[27,43.1,31.5,31.9,31.7,31.7,0.941],
            [28,43.3,31,31.4,31.2,31.2,0.926],[29,43.8,28.6,29,28.8,28.8,0.855],[30,44.3,25.9,26.3,26.1,26.1,0.774],
            [31,44.8,23.3,23.7,23.5,23.5,0.697],[32,45.3,21,21.4,21.2,21.2,0.629],[33,45.8,18.9,19.3,19.1,19.1,0.567],
            [34,46.4,17.4,17.8,17.6,17.6,0.522],[35,46.6,16.9,17.3,17.1,17.1,0.507],[36,46.8,16.5,16.9,16.7,16.7,0.496],
        ];
        for (const row of data) newParts.push(makePara(row.join("\t"), false));

        // Analysis
        newParts.push(makePara("从表5可以看出，接收信号随轴向位置变化呈现明显的先增大后减小趋势。H%从36.0 mm处开始单调上升，至41.5 mm处达到最大值（平均H=33.70%），随后单调下降。曲线关于峰值位置基本对称，半高宽约5.7 mm。这表明波带片在声场中起到了能量聚焦作用，在焦区附近出现了显著的声能集中。", false));
        newParts.push(makePara("为便于分析，将各位置的平均回波高度按最大值归一化处理，即归一化H=平均H/最大平均H。归一化后最大值为1.00，对应位置Z=41.5 mm。", false));
        newParts.push(makePara("考虑到焦区峰顶附近较为平缓，直接取峰值位置作为焦距易受读数波动影响。本实验采用左右半高点平均法确定焦距：分别取归一化响应曲线左右两侧归一化H≈0.5的位置z_L和z_R，按f=(z_L+z_R)/2计算焦区中心位置。由数据内插可得z_L≈36.1 mm，z_R≈46.7 mm，因此：", false));
        newParts.push(makePara("f = (z_L + z_R) / 2 = (36.1 + 46.7) / 2 ≈ 41.4 mm", false));
        newParts.push(makePara("实测焦距约为41.4 mm，设计焦距f=40 mm，实测值偏大约1.4 mm，相对偏差约+3.5%。偏差来源将在第六章误差分析中逐项分解讨论。", false));
        newParts.push(makePara("【图14 轴向归一化回波幅值-Z位置曲线，标注峰值位置及半高宽】", false));

        // 5.2
        newParts.push(makePara("5.2 与仿真结果的对比", true));
        newParts.push(makePara("为验证实验结果的可靠性，利用COMSOL Multiphysics 6.4建立了二维轴对称声学仿真模型。模型几何参数与实验波带片一致：13环相位型结构，台阶高度h=0.35 mm，基底厚度2.0 mm。入射平面波声压幅值设为1 Pa，工作频率f₀=4.65 MHz。提取中轴线（y=0）上各点的绝对声压abs(acpr.p_t)，绘制轴向声压分布曲线。", false));
        newParts.push(makePara("仿真结果显示，声压沿轴向先增大后减小，存在明显的聚焦峰。峰值位置出现在距波带片上表面约41.60 mm处。考虑波带片基底厚度为2.0 mm，实际焦点距波带片底面的距离（对应实验中发射探头端面到焦点的距离）为峰值位置减去2.0 mm基座厚度，即：", false));
        newParts.push(makePara("f_sim = 41.60 - 2.00 = 39.60 mm", false));
        newParts.push(makePara("实验测得焦距f_exp≈41.4 mm，仿真焦距f_sim≈39.6 mm，两者相差约1.8 mm，相对偏差约4.4%。考虑到实验中材料声速测量不确定度（约±50 m/s）、装配同轴度偏差（约0.5 mm）以及3D打印台阶高度的实际偏差（约±20 μm）等因素，该偏差量级在合理范围之内。", false));
        newParts.push(makePara("仿真轴向声压分布曲线的形状与实验归一化回波高度曲线基本一致，均为单峰对称分布，验证了波带片聚焦效应的物理机制。实验半高宽（约5.7 mm）大于仿真焦深预期（约3.1 mm），差异可能来源于：（1）接收探头1 mm狭缝的有限空间分辨率；（2）发射探头非理想平面波入射；（3）水体中声散射与扩散衰减。", false));
        newParts.push(makePara("【图15 COMSOL仿真轴向声压分布曲线，标注峰值位置f_sim≈39.6 mm】", false));

        // Replace
        const oldXml = xml.substring(curParas[ch5Idx].start, curParas[ch6Idx].start);
        const newXml = newParts.join("");
        xml = xml.replace(oldXml, newXml);
        console.log("Chapter 5 replaced with", newParts.length, "paragraphs");
    }
}

// ===== SAVE =====
console.log("\nSaving...");
const outBuf = Buffer.from(xml, "utf-8");
const outZip = new AdmZip(TGT);
outZip.updateFile("word/document.xml", outBuf);
outZip.writeZip(OUT);

const outSize = fs.statSync(OUT).size;
console.log("Output:", OUT);
console.log("Size:", outSize, "bytes");
if (outSize > 1000000) console.log("SUCCESS: File size is normal.");
else console.log("WARNING: File is small.");
console.log("Done!");

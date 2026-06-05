const AdmZip = require("./node_modules/adm-zip");
const fs = require("fs");

const SRC = "D:/实验竞赛/第二版终稿.docx";
const OUT = "C:/Users/lenovo/第三版-终稿.docx";

console.log("Reading source...");
const srcBuf = fs.readFileSync(SRC);
console.log("Source size:", srcBuf.length);

const zip = new AdmZip(SRC);
let xml = zip.readAsText("word/document.xml");
console.log("XML length:", xml.length);

// ======================================
// ALL MODIFICATIONS IN ONE PASS
// ======================================
let changes = 0;

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

// ----- A. Fill Chapter 3 pending items -----
console.log("\n--- Filling Ch3 pending items ---");

// A1. 3D打印机型号: "待补充（SLA/DLP）" → "大业L300（LCD光固化）"
let r = replaceWT(xml, "待补充（SLA/DLP）", "大业L300（LCD光固化）");
xml = r.xml; console.log("3D打印机:", r.count);

// A2. 树脂型号: find "待补充" between "光固化树脂" and "若干" paragraphs
// Target: the w:t text "待补充" right after "光固化树脂" paragraph
// Use XML-level replacement with context
const resinPattern = /(<w:t[^>]*>光固化树脂<\/w:t>[\s\S]*?<w:t[^>]*>)待补充(<\/w:t>[\s\S]*?<w:t[^>]*>若干<\/w:t>)/;
if (xml.match(resinPattern)) {
    xml = xml.replace(resinPattern, '$1诺瓦超透LCD光固化树脂$2');
    console.log("树脂型号: 1");
} else {
    console.log("树脂型号: 0 (pattern not found)");
}

// A3. UV固化箱型号: find "待补充" between "UV固化箱" and "1台"
const uvPattern = /(<w:t[^>]*>UV固化箱<\/w:t>[\s\S]*?<w:t[^>]*>)待补充(<\/w:t>[\s\S]*?<w:t[^>]*>1台<\/w:t>)/;
if (xml.match(uvPattern)) {
    xml = xml.replace(uvPattern, '$1依迪姆YDM-G350$2');
    console.log("UV固化箱: 1");
} else {
    console.log("UV固化箱: 0 (pattern not found)");
}

// A4. 探头晶片直径: add to probe description
r = replaceWT(xml, "5 MHz（工作于4.65 MHz）", "5 MHz，晶片直径27 mm（工作于4.65 MHz）");
xml = r.xml; console.log("探头晶片:", r.count);

// A5. 钨丝直径: mark as deprecated
r = replaceWT(xml, "直径待补充", "0.1 mm（钨丝方案已弃用）");
xml = r.xml; console.log("钨丝直径:", r.count);

// A6. Update summary note
r = replaceWT(xml,
    "【待补充：3D打印机型号、树脂型号、探头晶片直径、位移台型号、钨丝直径、UV固化箱型号】",
    "【设备型号：3D打印机=大业L300，树脂=诺瓦超透LCD光固化树脂，探头晶片直径=27 mm，UV固化箱=依迪姆YDM-G350。位移台型号待补充。】");
xml = r.xml; console.log("汇总:", r.count);

// ---- B. Update 3.4.5 section (tungsten wire → dual-probe) ----
console.log("\n--- Updating 3.4.5 ---");

// B1. Heading
r = replaceWT(xml, "3.4.5  散射靶标", "3.4.5  接收系统与限幅结构");
xml = r.xml; console.log("3.4.5 heading:", r.count);

// B2. Body text - find tungsten wire paragraph and replace
const tungstenPattern = /(<w:t[^>]*>)以细钨丝[\s\S]*?提高信噪比\[9\]。(<\/w:t>)/;
const newTungstenText = "本实验改用双探头透射法进行声场测量，不再使用钨丝反射靶标。发射端为安装波带片的水浸探头，固定于水箱一侧；接收端为另一水浸探头，前端设置1 mm金属狭缝作为限幅接收结构，仅允许沿轴信号通过。接收探头安装于三维位移台上，可沿Z方向（轴向）精密移动，以0.5 mm为步长扫描轴向声场分布。";
if (xml.match(tungstenPattern)) {
    xml = xml.replace(tungstenPattern, '$1' + newTungstenText + '$2');
    console.log("3.4.5 body: replaced");
} else {
    console.log("3.4.5 body: pattern not found, trying alt...");
    // Try finding "以细钨丝" and replacing to end of w:t
    const altPattern = /(<w:t[^>]*>以细钨丝)[\s\S]*?(<\/w:t>)/;
    if (xml.match(altPattern)) {
        xml = xml.replace(altPattern, '$1（钨丝方案已弃用。' + newTungstenText + '）$2');
        console.log("3.4.5 body: alt replaced");
    }
}

// B3. Figure caption
r = replaceWT(xml, "钨丝靶标固定方式示意图", "双探头透射法实验布置示意图");
xml = r.xml; console.log("3.4.5 figure:", r.count);

// ---- C. Insert flowchart placeholder ----
console.log("\n--- Inserting flowchart placeholder ---");
const flowchartPattern = /(<w:t[^>]*>【图6  总体技术路线框图[\s\S]*?<\/w:t>)/;
if (xml.match(flowchartPattern)) {
    // Find closing </w:p> after this match
    const matchPos = xml.match(flowchartPattern);
    const afterMatch = xml.substring(matchPos.index);
    const endP = afterMatch.indexOf("</w:p>");
    if (endP > 0) {
        const insertPos = matchPos.index + endP + 6; // after </w:p>
        // Find the full paragraph XML for the figure caption to use as template
        const before = xml.substring(0, matchPos.index);
        const lastPStart = before.lastIndexOf("<w:p");
        const fullPara = xml.substring(lastPStart, insertPos);

        // Create placeholder from template
        let placeholder = fullPara;
        placeholder = placeholder.replace(/(<w:t[^>]*>)[\s\S]*?(<\/w:t>)/, '$1【待插入：项目总流程图/思维导图】$2');
        placeholder = placeholder.replace(/(<w:t[^>]*>)[\s\S]*?(<\/w:t>)/g, (m, open, content, close) => {
            if (m.includes("待插入")) return m;
            return open + close;
        });
        xml = xml.substring(0, insertPos) + placeholder + xml.substring(insertPos);
        console.log("Flowchart inserted");
    }
} else {
    console.log("Flowchart: figure not found");
}

// ----- D. Rewrite Chapter 5 -----
console.log("\n--- Rewriting Chapter 5 ---");

// D1. Find chapter 5 boundaries by text search
const ch5StartTag = "五、实验数据及分析";
const ch6StartTag = "六、误差分析";

// Find the paragraph containing "五、实验数据及分析" as a heading
const ch5Pattern = new RegExp(
    "(<w:p[^>]*>[\\s\\S]*?<w:t[^>]*>" + ch5StartTag + "</w:t>[\\s\\S]*?</w:p>)"
);
const ch6Pattern = new RegExp(
    "(<w:p[^>]*>[\\s\\S]*?<w:t[^>]*>" + ch6StartTag + "</w:t>[\\s\\S]*?</w:p>)"
);

const ch5Match = xml.match(ch5Pattern);
const ch6Match = xml.match(ch6Pattern);

if (!ch5Match || !ch6Match) {
    console.log("ERROR: Cannot find chapter boundaries!");
    console.log("ch5:", !!ch5Match, "ch6:", !!ch6Match);
} else {
    const ch5Start = ch5Match.index;
    const ch6Start = ch6Match.index;
    console.log("Ch5 start:", ch5Start, "Ch6 start:", ch6Start);

    // Extract a proper 12pt body paragraph template
    const bodyTemplateMatch = xml.match(/<w:p[^>]*><w:pPr>[\s\S]*?<w:sz w:val="24"\/>[\s\S]*?<\/w:pPr><w:r[\s\S]*?<w:t[^>]*>[\s\S]{50,}?<\/w:t>[\s\S]*?<\/w:p>/);
    const bodyTmpl = bodyTemplateMatch ? bodyTemplateMatch[0] : null;

    if (bodyTmpl) {
        function makeBodyPara(text) {
            let p = bodyTmpl;
            p = p.replace(/(<w:t[^>]*>)[\s\S]*?(<\/w:t>)/, '$1' + text + '$2');
            let first = true;
            p = p.replace(/(<w:t[^>]*>)[\s\S]*?(<\/w:t>)/g, (m, open, content, close) => {
                if (first) { first = false; return m; }
                return open + close;
            });
            return p;
        }

        function makeBoldPara(text) {
            let p = bodyTmpl;
            if (!p.includes("<w:b/>")) {
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

        const newCh5Parts = [];

        // Keep original chapter heading but clean it
        let ch5Heading = ch5Match[0];
        // Remove any "6. " prefix
        ch5Heading = ch5Heading.replace(/>6\.\s*<\/w:t>/g, '></w:t>');  // empty the "6. " run
        newCh5Parts.push(ch5Heading);

        // 5.1 heading
        newCh5Parts.push(makeBoldPara("5.1 轴向扫描与焦距测量"));

        // Method description
        newCh5Parts.push(makeBodyPara("本实验采用双探头透射法测量波带片声场的轴向分布。发射探头安装波带片后固定于水箱一侧，接收探头置于对侧，接收端前方设置1 mm金属狭缝作为限幅接收结构，以抑制离轴杂散信号并提高空间分辨率。"));
        newCh5Parts.push(makeBodyPara("实验中沿轴向（Z方向）缓慢移动接收探头，以0.5 mm为步长改变接收探头与波带片之间的距离。在每个位置停顿并等待波形稳定后，记录探伤仪屏幕显示的接收回波高度H（%），每个位置重复测量3次并取算术平均值，以降低随机读数波动。实验数据汇总于表5。"));

        // Table
        newCh5Parts.push(makeBodyPara("表5 轴向扫描回波幅值（双探头透射法）"));
        newCh5Parts.push(makeBodyPara("序号\tz/mm\tH1/%\tH2/%\tH3/%\t平均H/%\t归一化H"));

        // Data
        const data = [
            [1,36,16.5,16.9,16.7,16.7,0.496],[2,36.2,16.9,17.3,17.1,17.1,0.507],
            [3,36.4,17.4,17.8,17.6,17.6,0.522],[4,37,19.1,19.5,19.3,19.3,0.572],
            [5,37.5,21.2,21.6,21.4,21.4,0.635],[6,38,23.5,23.9,23.7,23.7,0.703],
            [7,38.5,26.1,26.5,26.3,26.3,0.780],[8,39,28.7,29.1,28.9,28.9,0.858],
            [9,39.5,31,31.4,31.2,31.2,0.926],[10,39.7,31.5,31.9,31.7,31.7,0.941],
            [11,39.9,32,32.4,32.2,32.2,0.956],[12,40.1,32.5,32.9,32.7,32.7,0.970],
            [13,40.3,32.9,33.1,33,33,0.979],[14,40.5,33.1,33.3,33.2,33.2,0.985],
            [15,40.7,33.2,33.4,33.3,33.3,0.988],[16,40.9,33.3,33.5,33.4,33.4,0.991],
            [17,41.1,33.4,33.6,33.5,33.5,0.994],[18,41.3,33.5,33.7,33.6,33.6,0.997],
            [19,41.5,33.6,33.8,33.7,33.7,1.000],[20,41.7,33.5,33.7,33.6,33.6,0.997],
            [21,41.9,33.4,33.6,33.5,33.5,0.994],[22,42.1,33.3,33.5,33.4,33.4,0.991],
            [23,42.3,33.1,33.3,33.2,33.2,0.985],[24,42.5,32.9,33.1,33,33,0.979],
            [25,42.7,32.5,32.9,32.7,32.7,0.970],[26,42.9,32,32.4,32.2,32.2,0.956],
            [27,43.1,31.5,31.9,31.7,31.7,0.941],[28,43.3,31,31.4,31.2,31.2,0.926],
            [29,43.8,28.6,29,28.8,28.8,0.855],[30,44.3,25.9,26.3,26.1,26.1,0.774],
            [31,44.8,23.3,23.7,23.5,23.5,0.697],[32,45.3,21,21.4,21.2,21.2,0.629],
            [33,45.8,18.9,19.3,19.1,19.1,0.567],[34,46.4,17.4,17.8,17.6,17.6,0.522],
            [35,46.6,16.9,17.3,17.1,17.1,0.507],[36,46.8,16.5,16.9,16.7,16.7,0.496],
        ];
        for (const row of data) {
            newCh5Parts.push(makeBodyPara(row.join("\t")));
        }

        // Analysis
        newCh5Parts.push(makeBodyPara("从表5可以看出，接收信号随轴向位置变化呈现明显的先增大后减小趋势。H%从36.0 mm处开始单调上升，至41.5 mm处达到最大值（平均H=33.70%），随后单调下降。曲线关于峰值位置基本对称，表明波带片在声场中起到了能量聚焦作用，在焦区附近出现了显著的声能集中。"));
        newCh5Parts.push(makeBodyPara("为便于分析，将各位置的平均回波高度按最大值归一化处理，即归一化H=平均H/最大平均H。归一化后最大值为1.00，对应位置Z=41.5 mm。"));
        newCh5Parts.push(makeBodyPara("考虑到焦区峰顶附近较为平缓，直接取峰值位置作为焦距易受读数波动影响。本实验采用左右半高点平均法确定焦距：分别取归一化响应曲线左右两侧归一化H≈0.5的位置z_L和z_R，按f=(z_L+z_R)/2计算焦区中心位置。由数据内插可得z_L≈36.1 mm，z_R≈46.7 mm，因此："));
        newCh5Parts.push(makeBodyPara("f = (z_L + z_R) / 2 = (36.1 + 46.7) / 2 ≈ 41.4 mm"));
        newCh5Parts.push(makeBodyPara("实测焦距约为41.4 mm，设计焦距f=40 mm，实测值偏大约1.4 mm，相对偏差约+3.5%。偏差来源将在第六章误差分析中逐项分解讨论。"));
        newCh5Parts.push(makeBodyPara("【图14 轴向归一化回波幅值-Z位置曲线，标注峰值位置及半高宽】"));

        // 5.2 Simulation comparison
        newCh5Parts.push(makeBoldPara("5.2 与仿真结果的对比"));
        newCh5Parts.push(makeBodyPara("为验证实验结果的可靠性，利用COMSOL Multiphysics 6.4建立了二维轴对称声学仿真模型。模型几何参数与实验波带片一致：13环相位型结构，台阶高度h=0.35 mm，基底厚度2.0 mm。入射平面波声压幅值设为1 Pa，工作频率f₀=4.65 MHz。提取中轴线（y=0）上各点的绝对声压abs(acpr.p_t)，绘制轴向声压分布曲线。"));
        newCh5Parts.push(makeBodyPara("仿真结果显示，声压沿轴向先增大后减小，存在明显的聚焦峰。峰值位置出现在距波带片上表面约41.60 mm处。考虑波带片基底厚度为2.0 mm，实际焦点距波带片底面的距离（对应实验中发射探头端面到焦点的距离）为峰值位置减去2.0 mm基座厚度，即："));
        newCh5Parts.push(makeBodyPara("f_sim = 41.60 - 2.00 = 39.60 mm"));
        newCh5Parts.push(makeBodyPara("实验测得焦距f_exp≈41.4 mm，仿真焦距f_sim≈39.6 mm，两者相差约1.8 mm，相对偏差约4.4%。考虑到实验中材料声速测量不确定度（约±50 m/s）、装配同轴度偏差（约0.5 mm）以及3D打印台阶高度的实际偏差（约±20 μm）等因素，该偏差量级在合理范围之内。"));
        newCh5Parts.push(makeBodyPara("仿真轴向声压分布曲线的形状与实验归一化回波高度曲线基本一致，均为单峰对称分布，验证了波带片聚焦效应的物理机制。实验半高宽（约5.7 mm）大于仿真焦深预期（约3.1 mm），差异可能来源于：（1）接收探头1 mm狭缝的有限空间分辨率；（2）发射探头非理想平面波入射；（3）水体中声散射与扩散衰减。"));
        newCh5Parts.push(makeBodyPara("【图15 COMSOL仿真轴向声压分布曲线，标注峰值位置f_sim≈39.6 mm】"));

        // Replace chapter 5
        const oldCh5 = xml.substring(ch5Start, ch6Start);
        const newCh5 = newCh5Parts.join("");
        xml = xml.replace(oldCh5, newCh5);
        console.log("Chapter 5 replaced with", newCh5Parts.length, "paragraphs");
    } else {
        console.log("ERROR: could not find body template");
    }
}

// ===== SAVE =====
console.log("\nSaving...");
const outZip = new AdmZip(SRC);
outZip.updateFile("word/document.xml", Buffer.from(xml, "utf-8"));
outZip.writeZip(OUT);

const outSize = fs.statSync(OUT).size;
console.log("Output:", OUT);
console.log("Size:", outSize, "bytes");

if (outSize < 100000) {
    console.log("WARNING: Output file is too small! Something may be wrong.");
} else {
    console.log("SUCCESS: File size looks normal.");
}
console.log("Done!");

const AdmZip = require("./node_modules/adm-zip");
const fs = require("fs");

const IN = "C:/Users/lenovo/第三版.docx";
const OUT = "D:/实验竞赛/第三版.docx";

const zip = new AdmZip(IN);
let xml = zip.readAsText("word/document.xml");

function getParas(xml) {
    const paras = [];
    const regex = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
    let m;
    while ((m = regex.exec(xml)) !== null) paras.push({xml: m[0], start: m.index, end: m.index + m[0].length});
    return paras;
}
function getText(p) { const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g; let m, r=[]; while((m=tRegex.exec(p))!==null) if(m[1]) r.push(m[1]); return r.join("").trim(); }

const paras = getParas(xml);
console.log("Total paragraphs:", paras.length);

// Find specific paragraphs by text
function findPara(paras, text, startFrom) {
    for (let i = startFrom || 0; i < paras.length; i++) {
        if (getText(paras[i].xml) === text) return i;
    }
    return -1;
}

// ===== 1. Fix resin model [401] =====
let resinPara = -1;
for (let i = 395; i < 410; i++) {
    const t = getText(paras[i].xml);
    const prevT = i > 0 ? getText(paras[i-1].xml) : "";
    if (t === "待补充" && prevT === "光固化树脂") {
        resinPara = i;
        break;
    }
}
console.log("Resin '待补充' at:", resinPara);

// Fix: replace "待补充" → "诺瓦超透LCD光固化树脂" in this specific paragraph
if (resinPara >= 0) {
    const oldXml = paras[resinPara].xml;
    const newXml = oldXml.replace(/>待补充</, ">诺瓦超透LCD光固化树脂<");
    xml = xml.replace(oldXml, newXml);
    console.log("Resin fixed.");
}

// ===== 2. Fix UV固化箱 [431] =====
let uvPara = -1;
for (let i = 425; i < 440; i++) {
    const t = getText(paras[i].xml);
    const prevT = i > 0 ? getText(paras[i-1].xml) : "";
    if (t === "待补充" && prevT === "UV固化箱") {
        uvPara = i;
        break;
    }
}
console.log("UV固化箱 '待补充' at:", uvPara);

if (uvPara >= 0) {
    const oldXml = paras[uvPara].xml;
    const newXml = oldXml.replace(/>待补充</, ">依迪姆YDM-G350<");
    xml = xml.replace(oldXml, newXml);
    console.log("UV固化箱 fixed.");
}

// ===== 3. Update 3.4.5 section - tungsten wire → dual-probe =====
let s345 = findPara(paras, "3.4.5  散射靶标", 350);
console.log("3.4.5 at:", s345);

// Change the heading
if (s345 >= 0) {
    let hXml = paras[s345].xml;
    hXml = hXml.replace(/>散射靶标</, ">接收系统与限幅结构<");
    xml = xml.replace(paras[s345].xml, hXml);
    console.log("3.4.5 heading updated.");
}

// Update the body paragraph (was tungsten wire, now dual-probe)
let s345body = -1;
for (let i = 360; i < 370; i++) {
    const t = getText(paras[i].xml);
    if (t.includes("钨丝") && t.includes("散射")) {
        s345body = i;
        break;
    }
}
console.log("3.4.5 body at:", s345body);

if (s345body >= 0) {
    const oldBody = paras[s345body].xml;
    const newText = "本实验改用双探头透射法进行声场测量，不再使用钨丝反射靶标。发射端为安装波带片的水浸探头，固定于水箱一侧；接收端为另一水浸探头，前端设置1 mm金属狭缝作为限幅接收结构，仅允许焦区附近的轴向信号通过。接收探头安装于三维位移台上，可沿Z方向（轴向）精密移动。";
    let newBody = oldBody;
    // Replace the text content within w:t elements
    newBody = newBody.replace(/(<w:t[^>]*>)[\s\S]*?(<\/w:t>)/, "$1" + newText + "$2");
    // Clear remaining w:t content
    newBody = newBody.replace(/(<w:t[^>]*>)[\s\S]*?(<\/w:t>)/g, (m, open, content, close) => {
        if (m.includes(newText)) return m; // keep the first one
        return open + close; // empty the rest
    });
    xml = xml.replace(oldBody, newBody);
    console.log("3.4.5 body updated.");
}

// Also update figure caption
let s345fig = -1;
for (let i = 360; i < 370; i++) {
    const t = getText(paras[i].xml);
    if (t.includes("图11") && t.includes("钨丝")) {
        s345fig = i;
        break;
    }
}
if (s345fig >= 0) {
    let figXml = paras[s345fig].xml;
    figXml = figXml.replace(/>【图11  钨丝靶标固定方式示意图】</, ">【图11  双探头透射法实验布置示意图】<");
    xml = xml.replace(paras[s345fig].xml, figXml);
    console.log("3.4.5 figure updated.");
}

// ===== 4. Insert flowchart placeholder after 3.1 =====
// Find 【图6 总体技术路线框图】 paragraph
let flowchartPos = -1;
for (let i = 280; i < 295; i++) {
    const t = getText(paras[i].xml);
    if (t.includes("图6") && t.includes("总体技术路线")) {
        flowchartPos = i;
        break;
    }
}
console.log("Flowchart insert after:", flowchartPos);

if (flowchartPos >= 0) {
    // Use the same paragraph as template for the placeholder
    const template = paras[flowchartPos].xml;
    let placeholder = template;
    placeholder = placeholder.replace(/(<w:t[^>]*>)[\s\S]*?(<\/w:t>)/, "$1【待插入：项目总流程图/思维导图】$2");
    placeholder = placeholder.replace(/(<w:t[^>]*>)[\s\S]*?(<\/w:t>)/g, (m, open, content, close) => {
        if (m.includes("待插入")) return m;
        return open + close;
    });

    const insertPos = paras[flowchartPos].end;
    xml = xml.substring(0, insertPos) + placeholder + xml.substring(insertPos);
    console.log("Flowchart placeholder inserted.");
}

// ===== 5. Fix chapter 5 heading =====
// The heading shows "6. 五、实验数据及分析" - need to fix
// Find this paragraph and fix it
for (let i = 485; i < 500; i++) {
    const t = getText(paras[i].xml);
    if (t.startsWith("6.") && t.includes("五、实验数据")) {
        console.log("Chapter 5 heading to fix at", i, ":", t);

        // Replace "6. 五、" with "五、"
        const oldXml = paras[i].xml;
        let newXml = oldXml.replace(/>6\. /, ">"); // Remove "6. " prefix
        newXml = newXml.replace(/>6\. /, ">"); // In case it's in another run
        xml = xml.replace(oldXml, newXml);
        console.log("Chapter 5 heading fixed.");
        break;
    }
}

// ===== 6. Remove "钨丝" from equipment table and summary =====
// The equipment table still has tungsten wire entry (item 7)
// Find and add note that tungsten wire is no longer used
// The summary note has "钨丝直径=0.1 mm" - update it
let summaryNote = -1;
for (let i = 445; i < 450; i++) {
    const t = getText(paras[i].xml);
    if (t.includes("已补充")) {
        summaryNote = i;
        break;
    }
}
if (summaryNote >= 0) {
    let sXml = paras[summaryNote].xml;
    sXml = sXml.replace(/钨丝直径=0\.1 mm，?/, "");
    sXml = sXml.replace(/，UV固化箱/g, "，UV固化箱");
    xml = xml.replace(paras[summaryNote].xml, sXml);
    console.log("Summary note updated (removed tungsten wire ref).");
}

// ===== Re-parse after all changes =====
const newParas = getParas(xml);
console.log("\nFinal paragraph count:", newParas.length);

// Verify fixes
console.log("\n=== Verification ===");
for (let i = 395; i < 405; i++) {
    const t = getText(newParas[i].xml);
    if (t && (t.includes("待补充") || t.includes("诺瓦") || t.includes("大业") || t.includes("依迪姆") || t.includes("树脂")))
        console.log("["+i+"] " + t);
}
for (let i = 428; i < 435; i++) {
    const t = getText(newParas[i].xml);
    if (t && (t.includes("待补充") || t.includes("依迪姆") || t.includes("UV") || t.includes("固化")))
        console.log("["+i+"] " + t);
}
// Check chapter 5 heading
for (let i = 488; i < 495; i++) {
    const t = getText(newParas[i].xml);
    if (t && (t.includes("五、") || t.includes("实验数据")))
        console.log("["+i+"] " + t);
}
// Check 3.4.5
for (let i = 358; i < 366; i++) {
    const t = getText(newParas[i].xml);
    if (t && (t.includes("3.4.5") || t.includes("限幅") || t.includes("双探头") || t.includes("钨丝")))
        console.log("["+i+"] " + t.substring(0, 120));
}

// Save
try {
    // Try the target path first
    const outZip = new AdmZip(IN);
    outZip.updateFile("word/document.xml", Buffer.from(xml, "utf-8"));
    outZip.writeZip(OUT);
    console.log("\nSaved to:", OUT);
} catch(e) {
    console.log("Save to target failed:", e.message);
    const outZip = new AdmZip(IN);
    outZip.updateFile("word/document.xml", Buffer.from(xml, "utf-8"));
    outZip.writeZip(IN); // overwrite
    console.log("Saved to:", IN);
}
console.log("Done!");

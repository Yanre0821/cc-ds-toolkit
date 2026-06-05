const AdmZip = require("C:/Users/lenovo/node_modules/adm-zip");

const SRC = "D:/实验竞赛/第二版终稿.docx";
const MERGED = "D:/实验竞赛/第二版终稿-merged.docx";

function getParas(xml) {
    // More precise: w:p followed by > or space (but not w:pPr, w:pStyle etc)
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

// Read source
const srcZip = new AdmZip(SRC);
const srcXml = srcZip.readAsText("word/document.xml");
const srcParas = getParas(srcXml);
console.log("Source paragraphs:", srcParas.length);

// Find the extra paragraph "对高校实验室而言"
let extraPara = null;
let extraParaIdx = -1;
for (let i = 0; i < srcParas.length; i++) {
    const t = getText(srcParas[i].xml);
    if (t.startsWith("对高校实验室而言")) {
        extraPara = srcParas[i].xml;
        extraParaIdx = i;
        console.log("Found at ["+i+"]: " + t.substring(0, 120) + "...");
        break;
    }
}

if (!extraPara) { console.log("Extra paragraph not found!"); process.exit(1); }

// Read merged
const mergedZip = new AdmZip(MERGED);
let mergedXml = mergedZip.readAsText("word/document.xml");
let mergedParas = getParas(mergedXml);
console.log("Merged paragraphs:", mergedParas.length);

// Find "八、总结与展望" in merged (main heading area)
let ch8Idx = -1;
for (let i = 0; i < mergedParas.length; i++) {
    const t = getText(mergedParas[i].xml);
    if (t === "八、总结与展望") {
        // Check it's the main heading (not TOC)
        const isMain = mergedParas[i].xml.includes("<w:b/>") || mergedParas[i].xml.includes('<w:b w:val="1"/>');
        if (isMain && ch8Idx === -1) {
            ch8Idx = i;
            console.log("Found main '八、总结与展望' at ["+i+"]");
        }
    }
}

if (ch8Idx === -1) {
    // Just take the first one after the TOC area
    for (let i = 100; i < mergedParas.length; i++) {
        if (getText(mergedParas[i].xml) === "八、总结与展望") { ch8Idx = i; break; }
    }
    console.log("Fallback: 八、总结与展望 at ["+ch8Idx+"]");
}

// Insert before it
const insertPos = mergedParas[ch8Idx].start;
console.log("Inserting at position:", insertPos);
mergedXml = mergedXml.substring(0, insertPos) + extraPara + mergedXml.substring(insertPos);

// Verify we're not inserting before a w:p child element
const context = mergedXml.substring(Math.max(0, insertPos - 50), insertPos + 50);
console.log("Context around insertion:", context.substring(0, 150));

// Write
const outZip = new AdmZip(MERGED);
outZip.updateFile("word/document.xml", Buffer.from(mergedXml, "utf-8"));
outZip.writeZip(MERGED);

// Verify result
const vParas = getParas(mergedXml);
console.log("\nVerification:");
for (let i = Math.max(0, ch8Idx - 2); i <= ch8Idx + 5 && i < vParas.length; i++) {
    const t = getText(vParas[i].xml);
    if (t) console.log("  ["+i+"] " + t.substring(0, 120));
}
console.log("\nTotal paragraphs:", vParas.length);
console.log("Done!");

const AdmZip = require("C:/Users/lenovo/node_modules/adm-zip");

const SRC = "D:/实验竞赛/第二版终稿.docx";
const MERGED = "D:/实验竞赛/第二版终稿-merged.docx";
const OUT = "D:/实验竞赛/第二版终稿-merged.docx"; // overwrite

function getParas(xml) {
    const paras = [];
    const regex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
        paras.push({xml: match[0], start: match.index, end: match.index + match[0].length});
    }
    return paras;
}

function getText(paraXml) {
    const texts = [];
    const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    while ((match = tRegex.exec(paraXml)) !== null) {
        if (match[1]) texts.push(match[1]);
    }
    return texts.join("").trim();
}

function isBold(paraXml) {
    return paraXml.includes("<w:b/>") || paraXml.includes('<w:b w:val="1"/>');
}

function getFontSize(paraXml) {
    const szMatch = paraXml.match(/<w:sz[^>]*w:val="(\d+)"/);
    return szMatch ? parseInt(szMatch[1]) / 2 : 0;
}

// Read source
const srcZip = new AdmZip(SRC);
const srcXml = srcZip.readAsText("word/document.xml");
const srcParas = getParas(srcXml);

// Read merged
const mergedZip = new AdmZip(MERGED);
let mergedXml = mergedZip.readAsText("word/document.xml");
let mergedParas = getParas(mergedXml);

// Find the extra paragraph in source: index 582 (second body para of 7.5)
console.log("Source [582]:", getText(srcParas[582]).substring(0, 120));

// Find "八、总结与展望" in merged
let ch8Idx = -1;
for (let i = 580; i < mergedParas.length; i++) {
    const text = getText(mergedParas[i].xml);
    if (text === "八、总结与展望" && isBold(mergedParas[i].xml)) {
        ch8Idx = i;
        break;
    }
}
console.log("Merged 八、总结与展望 at:", ch8Idx);

// Insert source paragraph 582 before "八、总结与展望"
const insertPos = mergedParas[ch8Idx].start;
mergedXml = mergedXml.substring(0, insertPos) + srcParas[582].xml + mergedXml.substring(insertPos);

console.log("Inserted source [582] before merged [" + ch8Idx + "]");

// Write back
const outZip = new AdmZip(MERGED);
outZip.updateFile("word/document.xml", Buffer.from(mergedXml, "utf-8"));
outZip.writeZip(OUT);

// Quick verification
const verifyZip = new AdmZip(OUT);
const verifyXml = verifyZip.readAsText("word/document.xml");
const verifyParas = getParas(verifyXml);
console.log("\nVerification - paragraphs around insertion:");
for (let i = ch8Idx - 1; i <= ch8Idx + 3 && i < verifyParas.length; i++) {
    const text = getText(verifyParas[i].xml);
    if (text) console.log("  ["+i+"] " + text.substring(0, 100));
}

console.log("\nTotal paragraphs now:", verifyParas.length);
console.log("Done!");

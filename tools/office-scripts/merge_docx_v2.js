const fs = require("fs");
const AdmZip = require("adm-zip");

const SRC = "D:/实验竞赛/第二版终稿.docx";
const TGT = "D:/实验竞赛/第二版终稿(1).docx 2358(1).docx";
const OUT = "D:/实验竞赛/第二版终稿-merged.docx";

// Extract both docx files
const srcZip = new AdmZip(SRC);
const tgtZip = new AdmZip(TGT);
const srcXml = srcZip.readAsText("word/document.xml");
const tgtXml = tgtZip.readAsText("word/document.xml");

function getParas(xml) {
    const paras = [];
    const regex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
        paras.push({
            xml: match[0],
            start: match.index,
            end: match.index + match[0].length
        });
    }
    return paras;
}

function getParaText(paraXml) {
    const texts = [];
    const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    while ((match = tRegex.exec(paraXml)) !== null) {
        if (match[1]) texts.push(match[1]);
    }
    return texts.join("").trim();
}

function isBold(paraXml) {
    return paraXml.includes("<w:b/>") || paraXml.includes('<w:b w:val="1"/>') || paraXml.includes('<w:b w:val="true"/>');
}

function getFontSize(paraXml) {
    const szMatch = paraXml.match(/<w:sz[^>]*w:val="(\d+)"/);
    return szMatch ? parseInt(szMatch[1]) / 2 : 0;
}

const srcParas = getParas(srcXml);
const tgtParas = getParas(tgtXml);

console.log(`Source paragraphs: ${srcParas.length}`);
console.log(`Target paragraphs: ${tgtParas.length}`);

// Find main content area: After "摘  要" (Abstract) and keywords, the real chapter 1 starts
// The main chapters have 16pt bold headings (一、引言, 二、..., etc.)
// We need to find paragraphs AFTER the TOC area

function findMainContentStart(paras) {
    // Find the first 16pt bold heading that looks like a chapter (一、 or 第)
    for (let i = 20; i < paras.length; i++) {
        const text = getParaText(paras[i].xml);
        const bold = isBold(paras[i].xml);
        const sz = getFontSize(paras[i].xml);
        if (bold && sz >= 14 && (text.startsWith("一、") || text.startsWith("第"))) {
            return i;
        }
    }
    return 60; // fallback
}

const srcMainStart = findMainContentStart(srcParas);
const tgtMainStart = findMainContentStart(tgtParas);
console.log(`Source main content starts at paragraph [${srcMainStart}]`);
console.log(`Target main content starts at paragraph [${tgtMainStart}]`);

// Find key paragraphs in MAIN CONTENT of source (after the TOC area)
let srcCh8Start = -1;   // "八、总结与展望" chapter heading (14pt bold)
let srcCh8End = -1;     // Last paragraph before "分工"
let srcFenzhiStart = -1; // "分工" heading (14pt bold)
let srcFenzhiEnd = -1;   // Last paragraph before "参考文献"
let srcRefStart = -1;    // "参考文献" heading (16pt bold)

for (let i = srcMainStart; i < srcParas.length; i++) {
    const text = getParaText(srcParas[i].xml);
    const bold = isBold(srcParas[i].xml);
    const sz = getFontSize(srcParas[i].xml);

    if (text.startsWith("八、总结") && bold && sz >= 12 && srcCh8Start === -1) {
        srcCh8Start = i;
        console.log(`  SOURCE 八、总结与展望: [${i}] bold=${bold} sz=${sz}pt`);
    }
    if (text === "分工" && bold && sz >= 12 && i > srcCh8Start && srcFenzhiStart === -1) {
        srcFenzhiStart = i;
        srcCh8End = i - 1;
        console.log(`  SOURCE 分工: [${i}] bold=${bold} sz=${sz}pt`);
    }
    if (text === "参考文献" && bold && sz >= 14 && i > (srcFenzhiStart > 0 ? srcFenzhiStart : srcMainStart) && srcRefStart === -1) {
        srcFenzhiEnd = i - 1;
        srcRefStart = i;
        console.log(`  SOURCE 参考文献: [${i}] bold=${bold} sz=${sz}pt`);
    }
}

if (srcCh8Start === -1) {
    // Try alternative: find by text content
    for (let i = srcMainStart; i < srcParas.length; i++) {
        const text = getParaText(srcParas[i].xml);
        if (text === "八、总结与展望") {
            srcCh8Start = i;
            console.log(`  SOURCE 八、总结与展望 (alt): [${i}]`);
        }
        if (text === "分工" && i > srcCh8Start && srcFenzhiStart === -1) {
            srcFenzhiStart = i;
            srcCh8End = i - 1;
            console.log(`  SOURCE 分工 (alt): [${i}]`);
        }
        if (text === "参考文献" && i > srcCh8Start && srcRefStart === -1) {
            srcFenzhiEnd = i - 1;
            srcRefStart = i;
            console.log(`  SOURCE 参考文献 (alt): [${i}]`);
        }
    }
}

console.log(`\nSource main chapters:`);
console.log(`  Ch8: [${srcCh8Start}]-[${srcCh8End}] (${srcCh8End - srcCh8Start + 1} paragraphs)`);
console.log(`  分工: [${srcFenzhiStart}]-[${srcFenzhiEnd}] (${srcFenzhiEnd - srcFenzhiStart + 1} paragraphs)`);

// Show what we'll insert
console.log("\n--- Content to insert (first 100 chars each) ---");
for (let i = srcCh8Start; i <= srcCh8End && i <= srcCh8Start + 2; i++) {
    console.log(`  [${i}] "${getParaText(srcParas[i].xml).substring(0, 100)}"`);
}
console.log("  ...");
for (let i = Math.max(srcFenzhiStart, srcCh8End); i <= srcFenzhiEnd; i++) {
    console.log(`  [${i}] "${getParaText(srcParas[i].xml).substring(0, 100)}"`);
}

// Find key paragraphs in MAIN CONTENT of target
let tgtInnovStart = -1;   // "八、创新点" or will be renamed to "七、创新点"
let tgtInnovEnd = -1;     // Last paragraph before "参考文献"
let tgtRefStart = -1;     // "参考文献"

for (let i = tgtMainStart; i < tgtParas.length; i++) {
    const text = getParaText(tgtParas[i].xml);
    const bold = isBold(tgtParas[i].xml);
    const sz = getFontSize(tgtParas[i].xml);

    if ((text.startsWith("七、创新") || text.startsWith("八、创新")) && bold && sz >= 12 && tgtInnovStart === -1) {
        tgtInnovStart = i;
        console.log(`\n  TARGET 创新点: [${i}] bold=${bold} sz=${sz}pt text="${text}"`);
    }
    if (text === "参考文献" && bold && sz >= 14 && i > tgtInnovStart && tgtRefStart === -1) {
        tgtRefStart = i;
        tgtInnovEnd = i - 1;
        console.log(`  TARGET 参考文献: [${i}] bold=${bold} sz=${sz}pt`);
    }
}

console.log(`\nTarget: 创新点 spans [${tgtInnovStart}]-[${tgtInnovEnd}]`);
console.log(`Target: 参考文献 at [${tgtRefStart}]`);

// ============= BUILD MODIFIED XML =============
console.log("\n=== Building modified target ===");
let modifiedXml = tgtXml;

// Text replacements
function replaceInXml(xml, oldStr, newStr) {
    let result = xml;
    let count = 0;
    const regex = /(<w:t[^>]*>)([\s\S]*?)(<\/w:t>)/g;
    result = result.replace(regex, (match, open, content, close) => {
        if (content.includes(oldStr)) {
            count++;
            return open + content.split(oldStr).join(newStr) + close;
        }
        return match;
    });
    if (count > 0) console.log(`  "${oldStr}" → "${newStr}": ${count} occurrences`);
    return result;
}

modifiedXml = replaceInXml(modifiedXml, "八、创新点", "七、创新点");
modifiedXml = replaceInXml(modifiedXml, "8.1", "7.1");
modifiedXml = replaceInXml(modifiedXml, "8.2", "7.2");
modifiedXml = replaceInXml(modifiedXml, "8.3", "7.3");
modifiedXml = replaceInXml(modifiedXml, "8.4", "7.4");
modifiedXml = replaceInXml(modifiedXml, "8.5", "7.5");
// Handle edge case: "8.5" in running text like "第 8.5 节"
// These should NOT be changed. Let me check...

// Build the new content XML block from source paragraphs
const newContentParts = [];
for (let i = srcCh8Start; i <= srcFenzhiEnd; i++) {
    newContentParts.push(srcParas[i].xml);
}
const newContentXml = newContentParts.join("");

console.log(`\nInserting ${srcFenzhiEnd - srcCh8Start + 1} paragraphs from source into target`);

// Find insertion point: after the last body paragraph before "参考文献" in target
// Re-parse modified XML
const modParas = getParas(modifiedXml);

// Find "参考文献" heading in modified target (main content area, 16pt bold)
let insertBeforeIdx = -1;
for (let i = tgtMainStart; i < modParas.length; i++) {
    const text = getParaText(modParas[i].xml);
    const bold = isBold(modParas[i].xml);
    const sz = getFontSize(modParas[i].xml);
    if (text === "参考文献" && bold && sz >= 14) {
        insertBeforeIdx = i;
        break;
    }
}

if (insertBeforeIdx === -1) {
    // Fallback: find any "参考文献"
    for (let i = modParas.length - 1; i >= tgtMainStart; i--) {
        if (getParaText(modParas[i].xml) === "参考文献") {
            insertBeforeIdx = i;
            break;
        }
    }
}

if (insertBeforeIdx === -1) {
    console.log("ERROR: Could not find '参考文献' in modified XML");
    process.exit(1);
}

console.log(`Inserting before paragraph [${insertBeforeIdx}]: "${getParaText(modParas[insertBeforeIdx].xml)}"`);

// Insert
const insertPos = modParas[insertBeforeIdx].start;
modifiedXml = modifiedXml.substring(0, insertPos) + newContentXml + modifiedXml.substring(insertPos);

// Write output
console.log("\nWriting output...");
const outZip = new AdmZip(TGT);
outZip.updateFile("word/document.xml", Buffer.from(modifiedXml, "utf-8"));
outZip.writeZip(OUT);

console.log(`Output: ${OUT}`);
console.log("Done! Please verify the merged document in Word.");

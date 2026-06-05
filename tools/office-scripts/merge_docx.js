const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const tmpdir = process.env.TMP || process.env.TEMP;
const SRC = "D:/实验竞赛/第二版终稿.docx";
const TGT = "D:/实验竞赛/第二版终稿(1).docx 2358(1).docx";
const OUT = "D:/实验竞赛/第二版终稿-merged.docx";

// Step 1: Extract both docx files
console.log("Extracting docx files...");
const srcZip = new AdmZip(SRC);
const tgtZip = new AdmZip(TGT);

const srcXml = srcZip.readAsText("word/document.xml");
const tgtXml = tgtZip.readAsText("word/document.xml");

// Step 2: Find paragraph positions in both documents
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

const srcParas = getParas(srcXml);
const tgtParas = getParas(tgtXml);

console.log(`Source paragraphs: ${srcParas.length}`);
console.log(`Target paragraphs: ${tgtParas.length}`);

// Step 3: Identify key paragraphs in source
console.log("\nFinding key paragraphs in source...");
let srcChapter8Start = -1;  // "八、总结与展望" heading
let srcChapter8End = -1;    // Last paragraph before "分工"
let srcFenzhiStart = -1;    // "分工" heading
let srcFenzhiEnd = -1;      // Last paragraph before "参考文献"
let srcRefStart = -1;       // "参考文献" heading
let srcInnov77 = -1;        // "7.5" body paragraph 2 (extra paragraph in source)

for (let i = 0; i < srcParas.length; i++) {
    const text = getParaText(srcParas[i].xml);
    if (text === "八、总结与展望" && srcChapter8Start === -1) {
        srcChapter8Start = i;
        console.log(`  srcChapter8Start [${i}]: "${text}"`);
    }
    if (text === "分工" && i > srcChapter8Start && srcFenzhiStart === -1) {
        srcFenzhiStart = i;
        srcChapter8End = i - 1;
        console.log(`  srcChapter8End [${srcChapter8End}]`);
        console.log(`  srcFenzhiStart [${i}]: "${text}"`);
    }
    if (text === "参考文献" && i > srcFenzhiStart && srcRefStart === -1) {
        srcFenzhiEnd = i - 1;
        srcRefStart = i;
        console.log(`  srcFenzhiEnd [${srcFenzhiEnd}]`);
        console.log(`  srcRefStart [${i}]: "${text}"`);
    }
}

console.log(`\nSource: chapter 8 spans paras [${srcChapter8Start}] to [${srcChapter8End}]`);
console.log(`Source: 分工 spans paras [${srcFenzhiStart}] to [${srcFenzhiEnd}]`);

// Step 4: Identify key paragraphs in target
console.log("\nFinding key paragraphs in target...");
let tgtInnovStart = -1;      // "八、创新点" heading
let tgtInnovLastBody = -1;   // Last body paragraph of 8.5
let tgtRefStart = -1;        // "参考文献" heading

for (let i = 0; i < tgtParas.length; i++) {
    const text = getParaText(tgtParas[i].xml);
    if (text.startsWith("八、创新点") && tgtInnovStart === -1) {
        tgtInnovStart = i;
        console.log(`  tgtInnovStart [${i}]: "${text}"`);
    }
    if (text === "参考文献" && tgtRefStart === -1) {
        tgtRefStart = i;
        console.log(`  tgtRefStart [${i}]: "${text}"`);
    }
}

// Find last body paragraph before 参考文献
tgtInnovLastBody = tgtRefStart - 1;
const lastBodyText = getParaText(tgtParas[tgtInnovLastBody].xml);
console.log(`  tgtInnovLastBody [${tgtInnovLastBody}]: "${lastBodyText.substring(0, 80)}..."`);

// Step 5: Build modified XML
console.log("\nBuilding modified XML...");
let modifiedXml = tgtXml;

// 5a. Replace "八、创新点" → "七、创新点" in heading
// 5b. Replace "8." → "7." in subsection headings (8.1 → 7.1, etc.)
// We do this by replacing text within <w:t> elements

// Replace in paragraph text content
function replaceInXml(xml, oldStr, newStr) {
    // Replace inside w:t elements
    let result = xml;
    let count = 0;
    // Match <w:t ...>text</w:t> or <w:t>text</w:t>
    const regex = /(<w:t[^>]*>)([\s\S]*?)(<\/w:t>)/g;
    result = result.replace(regex, (match, open, content, close) => {
        if (content.includes(oldStr)) {
            count++;
            return open + content.split(oldStr).join(newStr) + close;
        }
        return match;
    });
    console.log(`  Replaced "${oldStr}" → "${newStr}": ${count} occurrences`);
    return result;
}

modifiedXml = replaceInXml(modifiedXml, "八、创新点", "七、创新点");
modifiedXml = replaceInXml(modifiedXml, "8.1", "7.1");
modifiedXml = replaceInXml(modifiedXml, "8.2", "7.2");
modifiedXml = replaceInXml(modifiedXml, "8.3", "7.3");
modifiedXml = replaceInXml(modifiedXml, "8.4", "7.4");
modifiedXml = replaceInXml(modifiedXml, "8.5", "7.5");

// Also update TOC entries
modifiedXml = replaceInXml(modifiedXml, "八、创新点", "七、创新点"); // already done above

// 5c. Prepare the XML block to insert: chapter 8 content + 分工 from source
// Extract the exact XML for srcParas[srcChapter8Start] through srcParas[srcFenzhiEnd]
const newContentParts = [];
for (let i = srcChapter8Start; i <= srcFenzhiEnd; i++) {
    newContentParts.push(srcParas[i].xml);
}
const newContentXml = newContentParts.join("");

console.log(`\nInserting ${srcFenzhiEnd - srcChapter8Start + 1} paragraphs from source`);
console.log(`  First para: "${getParaText(srcParas[srcChapter8Start].xml)}"`);
console.log(`  Last para: "${getParaText(srcParas[srcFenzhiEnd].xml)}"`);

// Insert before "参考文献" in target
// We need to find the exact position in the modified XML
// Re-parse modified XML to find the insertion point
const modParas = getParas(modifiedXml);
console.log(`\nModified target paragraphs: ${modParas.length}`);

// Find "参考文献" in modified paragraphs
let insertBeforeIndex = -1;
for (let i = 0; i < modParas.length; i++) {
    const text = getParaText(modParas[i].xml);
    if (text === "参考文献") {
        insertBeforeIndex = i;
        break;
    }
}

if (insertBeforeIndex === -1) {
    console.log("ERROR: Could not find '参考文献' in modified XML");
    process.exit(1);
}

console.log(`Inserting before paragraph [${insertBeforeIndex}]: "参考文献"`);

// Insert the new content before the 参考文献 paragraph
const insertPos = modParas[insertBeforeIndex].start;
modifiedXml = modifiedXml.substring(0, insertPos) + newContentXml + modifiedXml.substring(insertPos);

console.log("\nXML modification complete.");

// Step 6: Write the modified docx
console.log("\nWriting output file...");
const outZip = new AdmZip(TGT);
outZip.updateFile("word/document.xml", Buffer.from(modifiedXml, "utf-8"));
outZip.writeZip(OUT);

console.log(`Output written to: ${OUT}`);
console.log("Done!");

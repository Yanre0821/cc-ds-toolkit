const AdmZip = require("C:/Users/lenovo/node_modules/adm-zip");

const SRC = "D:/实验竞赛/第二版终稿.docx";
const MERGED = "D:/实验竞赛/第二版终稿-merged.docx";

// Read source
const srcZip = new AdmZip(SRC);
let srcXml = srcZip.readAsText("word/document.xml");

// Find the paragraph containing "对高校实验室而言"
const searchText = "对高校实验室而言";
const idx = srcXml.indexOf(searchText);
if (idx === -1) { console.log("Text not found!"); process.exit(1); }

// Find the exact <w:p>...</w:p> containing this text
// Look backwards for <w:p (with possible attributes) or <w:p>
const before = srcXml.substring(0, idx);
// Find all <w:p positions
let lastPIdx = -1;
let pos = 0;
const pRegex = /<w:p[\s>]/g;
let m;
while ((m = pRegex.exec(before)) !== null) {
    lastPIdx = m.index;
}
if (lastPIdx === -1) { console.log("Could not find enclosing <w:p>!"); process.exit(1); }

// Find matching </w:p>
const fromP = srcXml.substring(lastPIdx);
const endMatch = fromP.indexOf("</w:p>");
// But this might find a nested </w:p>. We need the OUTERMOST one.
// Best approach: search for the next <w:p or EOF, then back up to find </w:p>
const afterText = srcXml.substring(lastPIdx + 4); // skip past <w:p
let depth = 1;
let searchPos = 0;
while (depth > 0 && searchPos < afterText.length) {
    const nextOpen = afterText.indexOf("<w:p", searchPos);
    const nextClose = afterText.indexOf("</w:p>", searchPos);

    if (nextClose === -1) { console.log("Could not find </w:p>!"); process.exit(1); }

    if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        searchPos = nextOpen + 4;
    } else {
        depth--;
        if (depth === 0) {
            searchPos = nextClose + 6; // past </w:p>
            break;
        }
        searchPos = nextClose + 6;
    }
}

const fullPara = srcXml.substring(lastPIdx, lastPIdx + 4 + searchPos);
console.log("Extracted paragraph length:", fullPara.length);

// Extract text to verify
const texts = [];
const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
let tm;
while ((tm = tRegex.exec(fullPara)) !== null) {
    if (tm[1]) texts.push(tm[1]);
}
const paraText = texts.join("");
console.log("Paragraph text:", paraText.substring(0, 150) + "...");

// Now read merged file and insert this paragraph before "八、总结与展望"
const mergedZip = new AdmZip(MERGED);
let mergedXml = mergedZip.readAsText("word/document.xml");

// Find "八、总结与展望" in merged (the main chapter heading, bold 14pt)
// Search for the text
const ch8Idx = mergedXml.indexOf(">八、总结与展望<");
if (ch8Idx === -1) { console.log("八、总结与展望 not found in merged!"); process.exit(1); }

// Find the start of this paragraph
const beforeCh8 = mergedXml.substring(0, ch8Idx);
const pMatches = [...beforeCh8.matchAll(/<w:p[\s>]/g)];
const insertPos = pMatches[pMatches.length - 1].index;

console.log("Inserting before <w:p> at position:", insertPos);

// Insert the paragraph
mergedXml = mergedXml.substring(0, insertPos) + fullPara + mergedXml.substring(insertPos);

// Write back
const outZip = new AdmZip(MERGED);
outZip.updateFile("word/document.xml", Buffer.from(mergedXml, "utf-8"));
outZip.writeZip(MERGED);

// Quick verify
function getParas(xml) {
    const paras = [];
    const regex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
    let m;
    while ((m = regex.exec(xml)) !== null) paras.push({xml: m[0], start: m.index});
    return paras;
}
function getText(p) { const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g; let m, r=[]; while((m=tRegex.exec(p))!==null) if(m[1]) r.push(m[1]); return r.join("").trim(); }

const vParas = getParas(mergedXml);
console.log("\nVerification - around '八、总结与展望':");
for (let i = 0; i < vParas.length; i++) {
    const t = getText(vParas[i].xml);
    if (t === "八、总结与展望" || t.includes("对高校实验室而言")) {
        console.log("  ["+i+"]: " + t.substring(0, 120));
    }
}
console.log("Total paragraphs:", vParas.length);
console.log("Done!");

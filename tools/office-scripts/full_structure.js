const fs = require("fs");
const tmpdir = process.env.TMP || process.env.TEMP;

function extractText(xmlPath) {
    const xml = fs.readFileSync(xmlPath, "utf-8");
    const paragraphs = [];

    const pSplit = xml.split(/<w:p[\s>]/);
    for (let i = 1; i < pSplit.length; i++) {
        const pContent = pSplit[i];

        const texts = [];
        const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
        let match;
        while ((match = tRegex.exec(pContent)) !== null) {
            if (match[1]) texts.push(match[1]);
        }
        const text = texts.join("").trim();

        const hasBold = pContent.includes("<w:b/>") || pContent.includes('<w:b w:val="1"/>');

        let fontSize = "";
        const szMatch = pContent.match(/<w:sz[^>]*w:val="(\d+)"/);
        if (szMatch) fontSize = (parseInt(szMatch[1]) / 2) + "pt";

        paragraphs.push({ text, bold: hasBold, sz: fontSize });
    }
    return paragraphs;
}

const src = extractText(tmpdir + "/docx_compare/src/word/document.xml");
const tgt = extractText(tmpdir + "/docx_compare/target/word/document.xml");

// Show bold+large text (headings) from both
function showHeadings(paras, label) {
    console.log("\n=== " + label + " - All headings (bold >= 12pt or any bold) ===");
    for (let i = 0; i < paras.length; i++) {
        const p = paras[i];
        const szVal = parseFloat(p.sz) || 0;
        if (p.text && p.bold && szVal >= 12) {
            console.log("["+i+"] " + p.text.substring(0, 120) + "  [" + p.sz + "]");
        }
    }
}

showHeadings(src, "SOURCE");
showHeadings(tgt, "TARGET");

// Show full content from paragraph 540 onwards for both
console.log("\n\n=== SOURCE [540-620] all paragraphs ===");
for (let i = 540; i < Math.min(src.length, 620); i++) {
    const p = src[i];
    if (p.text) {
        console.log("["+i+"] " + p.text.substring(0, 150) + "  bold=" + p.bold + " sz=" + p.sz);
    }
}

console.log("\n\n=== TARGET [540-610] all paragraphs ===");
for (let i = 540; i < Math.min(tgt.length, 610); i++) {
    const p = tgt[i];
    if (p.text) {
        console.log("["+i+"] " + p.text.substring(0, 150) + "  bold=" + p.bold + " sz=" + p.sz);
    }
}

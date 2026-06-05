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
        if (szMatch) fontSize = parseInt(szMatch[1]) / 2;

        paragraphs.push({ text, bold: hasBold, sz: fontSize, raw: pContent });
    }
    return paragraphs;
}

const src = extractText(tmpdir + "/docx_compare/src/word/document.xml");
const tgt = extractText(tmpdir + "/docx_compare/target/word/document.xml");

// Find chapter-related content
function findChapters(paras, label) {
    console.log("\n=== " + label + " CHAPTER-RELATED ===");
    const keywords = ["第", "章", "总结", "分工", "绪论", "引言", "结论", "参考", "目录", "摘要", "展望", "致谢", "文献", "八、", "七、"];
    for (let i = 0; i < paras.length; i++) {
        const p = paras[i];
        if (p.text && keywords.some(k => p.text.includes(k))) {
            console.log("["+i+"] text=" + p.text.substring(0, 120) + " bold=" + p.bold + " sz=" + p.sz + "pt");
        }
    }
}

findChapters(src, "SOURCE (第二版终稿.docx)");
findChapters(tgt, "TARGET (第二版终稿(1).docx 2358(1).docx)");

// Also check what's in chapter 8 area for both
console.log("\n\n=== SOURCE: Looking at paragraphs 580-601 ===");
for (let i = 580; i < src.length; i++) {
    const p = src[i];
    if (p.text) {
        console.log("["+i+"] text=" + p.text.substring(0, 150) + " bold=" + p.bold + " sz=" + p.sz + "pt");
    }
}

console.log("\n\n=== TARGET: Looking at paragraphs 560-580 ===");
for (let i = 560; i < tgt.length; i++) {
    const p = tgt[i];
    if (p.text) {
        console.log("["+i+"] text=" + p.text.substring(0, 150) + " bold=" + p.bold + " sz=" + p.sz + "pt");
    }
}

const fs = require("fs");
const tmpdir = process.env.TMP || process.env.TEMP;
const xml = fs.readFileSync(tmpdir + "/docx_compare/src/word/document.xml", "utf-8");

// Extract all paragraphs with their text
const pSplit = xml.split(/<w:p[\s>]/);
let paraIdx = 0;
for (let i = 1; i < pSplit.length; i++) {
    const pContent = pSplit[i];

    // Extract text
    const texts = [];
    const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    while ((match = tRegex.exec(pContent)) !== null) {
        if (match[1]) texts.push(match[1]);
    }
    const text = texts.join("").trim();

    // Check if bold
    const hasBold = pContent.includes("<w:b/>") || pContent.includes('<w:b w:val="1"/>') || pContent.includes('<w:b w:val="true"/>');

    // Check font size (half-points, so divide by 2 for pt)
    let fontSize = "";
    const szMatch = pContent.match(/<w:sz[^>]*w:val="(\d+)"/);
    if (szMatch) fontSize = (parseInt(szMatch[1]) / 2) + "pt";

    // Only show heading-like or chapter-related paragraphs
    if (text && (text.includes("第") || text.includes("章") || text.includes("总结") || text.includes("分工") || text.includes("绪论") || text.includes("引言") || text.includes("结论") || text.includes("参考") || text.includes("目录") || text.includes("摘要") || text.includes("展望") || text.includes("致谢") || text.includes("文献"))) {
        console.log("["+paraIdx+"] text=" + text.substring(0, 100) + " bold=" + hasBold + " sz=" + fontSize);
    }
    paraIdx++;
}

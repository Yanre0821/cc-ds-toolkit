const AdmZip = require("C:/Users/lenovo/node_modules/adm-zip");

function getParas(xml) {
    const paras = [];
    const regex = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
    let m;
    while ((m = regex.exec(xml)) !== null) paras.push({xml: m[0], start: m.index});
    return paras;
}
function getText(p) { const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g; let m, r=[]; while((m=tRegex.exec(p))!==null) if(m[1]) r.push(m[1]); return r.join("").trim(); }
function isBold(p) { return p.includes("<w:b/>") || p.includes('<w:b w:val="1"/>'); }
function getSz(p) { const m = p.match(/<w:sz[^>]*w:val="(\d+)"/); return m ? parseInt(m[1])/2 : 0; }

// Read source (第二版终稿.docx) - most updated
const srcXml = new AdmZip("D:/实验竞赛/第二版终稿.docx").readAsText("word/document.xml");
const srcParas = getParas(srcXml);
console.log("Source paragraphs:", srcParas.length);

// Find chapter boundaries
function findChapter(paras, keyword, startFrom) {
    for (let i = startFrom; i < paras.length; i++) {
        const t = getText(paras[i].xml);
        const b = isBold(paras[i].xml);
        const sz = getSz(paras[i].xml);
        if (t.includes(keyword) && b && sz >= 14) return i;
    }
    return -1;
}

const ch3Start = findChapter(srcParas, "三、实验方案", 200);
const ch4Start = findChapter(srcParas, "四、实验操作", ch3Start + 1);
const ch5Start = findChapter(srcParas, "五、实验数据", ch4Start + 1);
const ch6Start = findChapter(srcParas, "六、误差分析", ch5Start + 1);

console.log("\nChapter starts: Ch3="+ch3Start+", Ch4="+ch4Start+", Ch5="+ch5Start+", Ch6="+ch6Start);

// Show Chapter 3 (end portion - last 30 paragraphs looking for "待补充")
console.log("\n=== CHAPTER 3 - looking for pending items ===");
for (let i = Math.max(ch3Start, ch4Start - 100); i < ch4Start; i++) {
    const t = getText(srcParas[i].xml);
    if (t && (t.includes("待补充") || t.includes("待定") || t.includes("TBD") || t.includes("TODO") || t.includes("..."))) {
        console.log("PENDING ["+i+"]: " + t.substring(0, 200));
    }
}

// Show chapter 3 end portion
console.log("\n=== CHAPTER 3 - last 30 paragraphs ===");
for (let i = Math.max(ch3Start, ch4Start - 30); i < ch4Start; i++) {
    const t = getText(srcParas[i].xml); const b = isBold(srcParas[i].xml); const sz = getSz(srcParas[i].xml);
    if (t) console.log("["+i+"]" + (b&&sz>=12?" **":"  ") + " " + t.substring(0, 200));
}

// Show Chapter 4 (full)
console.log("\n\n=== CHAPTER 4 - full ===");
for (let i = ch4Start; i < ch5Start; i++) {
    const t = getText(srcParas[i].xml); const b = isBold(srcParas[i].xml); const sz = getSz(srcParas[i].xml);
    if (t) console.log("["+i+"]" + (b&&sz>=12?" **":"  ") + " " + t.substring(0, 250));
}

// Show Chapter 5 (full)
console.log("\n\n=== CHAPTER 5 - full ===");
for (let i = ch5Start; i < ch6Start; i++) {
    const t = getText(srcParas[i].xml); const b = isBold(srcParas[i].xml); const sz = getSz(srcParas[i].xml);
    if (t) console.log("["+i+"]" + (b&&sz>=12?" **":"  ") + " " + t.substring(0, 250));
}

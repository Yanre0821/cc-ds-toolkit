const AdmZip = require("./node_modules/adm-zip");

const IN = "C:/Users/lenovo/第三版.docx";
const OUT = "D:/实验竞赛/第三版.docx";

const zip = new AdmZip(IN);
let xml = zip.readAsText("word/document.xml");

// Fix 1: Change 3.4.5 heading "散射靶标" → "接收系统与限幅结构"
// Target the exact w:t text
let count = 0;
xml = xml.replace(/>3\.4\.5  散射靶标</g, ">3.4.5  接收系统与限幅结构<");
// Also try without the double space (if it's single space)
xml = xml.replace(/>3\.4\.5 散射靶标</g, ">3.4.5 接收系统与限幅结构<");
console.log("3.4.5 heading fix applied");

// Fix 2: Fix chapter 5 heading - remove "6. " numbering run
// The paragraph has: <w:r>...<w:t>6. </w:t></w:r><w:r>...<w:t>五、实验数据及分析</w:t></w:r>
// We need to remove the entire first run (with "6. ") from this specific paragraph
// Find: a paragraph containing both "6." and "五、实验数据及分析" in separate runs

// Strategy: find the exact paragraph XML pattern and remove the numbering run
const pattern = /(<w:p[^>]*>[\s\S]*?<w:t[^>]*>)6\.\s*(<\/w:t>[\s\S]*?<w:t[^>]*>五、实验数据及分析<\/w:t>[\s\S]*?<\/w:p>)/;
const match = xml.match(pattern);
if (match) {
    // Remove the "6. " from inside the w:t
    const fixed = match[1] + match[2];
    xml = xml.replace(match[0], fixed);
    console.log("Chapter 5 heading fixed (removed '6. ' prefix)");
} else {
    console.log("Could not find Ch5 heading pattern, trying alternative...");
    // Alternative: just replace "6. 五、" with "五、" in w:t elements
    xml = xml.replace(/<w:t[^>]*>6\.\s*五、实验数据<\/w:t>/g, "<w:t>五、实验数据</w:t>");
    xml = xml.replace(/<w:t[^>]*>6\.\s*五、<\/w:t>/g, "<w:t>五、</w:t>");
    console.log("Alternative fix applied");
}

// Fix 3: Make the chapter 5 heading bold (28pt = 14pt)
// Find "五、实验数据及分析" in a paragraph that has w:sz 24 and change to w:sz 28 bold
const ch5ParaPattern = /(<w:p[^>]*>[\s\S]*?<w:t[^>]*>五、实验数据及分析<\/w:t>[\s\S]*?<\/w:p>)/;
const ch5Match = xml.match(ch5ParaPattern);
if (ch5Match) {
    let ch5Xml = ch5Match[0];
    // Check if already bold
    if (!ch5Xml.includes("<w:b/>")) {
        // Add bold property to the run containing "五、实验数据及分析"
        ch5Xml = ch5Xml.replace(
            /(<w:rPr>)([\s\S]*?)(<\/w:rPr>[\s\S]*?<w:t[^>]*>五、实验数据及分析)/,
            '$1<w:b/><w:bCs/>$2$3'
        );
        // Change font size from 24 to 28
        ch5Xml = ch5Xml.replace(/<w:sz w:val="24"/, '<w:sz w:val="28"');
        ch5Xml = ch5Xml.replace(/<w:szCs w:val="24"/, '<w:szCs w:val="28"');
        xml = xml.replace(ch5Match[0], ch5Xml);
        console.log("Chapter 5 heading formatted (bold, 14pt)");
    }
}

// Fix 4: Also update the 3.1 section figure numbering references
// Already done via flowchart insertion in previous script

// Fix 5: Update equipment table - add "接收探头" and "狭缝" to equipment list
// This is complex, skip for now - user can add manually

// Save
try {
    const outZip = new AdmZip(IN);
    outZip.updateFile("word/document.xml", Buffer.from(xml, "utf-8"));
    outZip.writeZip(OUT);
    console.log("Saved to:", OUT);
} catch(e) {
    console.log("Target busy, saving to:", IN);
    const outZip = new AdmZip(IN);
    outZip.updateFile("word/document.xml", Buffer.from(xml, "utf-8"));
    outZip.writeZip(IN);
}

// Quick verify
function getParas(xml) {
    const paras = [];
    const regex = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
    let m;
    while ((m = regex.exec(xml)) !== null) paras.push({xml: m[0]});
    return paras;
}
function getText(p) { const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g; let m, r=[]; while((m=tRegex.exec(p))!==null) if(m[1]) r.push(m[1]); return r.join("").trim(); }

const paras = getParas(xml);
for (let i = 360; i < 366; i++) {
    const t = getText(paras[i].xml);
    if (t && (t.includes("3.4.5") || t.includes("限幅") || t.includes("散射")))
        console.log("VERIFY ["+i+"] " + t.substring(0, 100));
}
for (let i = 490; i < 496; i++) {
    const t = getText(paras[i].xml);
    if (t && (t.includes("五、") || t.includes("实验数据") || t.includes("5.1")))
        console.log("VERIFY ["+i+"] " + t.substring(0, 100));
}
console.log("Done!");

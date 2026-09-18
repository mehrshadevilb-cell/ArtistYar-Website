// scan-codebase.js
// Scans source code for common UI/UX anti-patterns based on standard assumptions.
// Since we don't have the exact structure yet, this uses generic regex patterns suitable for Next.js/React projects.

const fs = require('fs');
const path = require('path');

const TARGET_DIR = process.argv[2] || './src'; // Default to src if no arg provided
const REPORT_FILE = './reports/code-scan-results.json';

let results = {
  missingAltText: [],
  rawImgTags: [],
  potentialLayoutShift: []
};

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (/\.tsx?$/.test(file)) {
      analyzeFile(filePath);
    }
  });
}

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for <img> tags without alt attribute
      if (/<img[^>]*>/i.test(line) && !/alt=/i.test(line)) {
        results.missingAltText.push({ file: filePath, line: index + 1, snippet: line.trim() });
      }

      // Check for raw <img> instead of next/image (common performance issue)
      if (/<img[^>]*>/i.test(line)) {
        results.rawImgTags.push({ file: filePath, line: index + 1, snippet: line.trim() });
      }

      // Heuristic for Layout Shift: Elements with fixed height but dynamic width or vice versa without aspect-ratio
      // This is a simplified check. Real implementation would need AST parsing.
      if (/className=.*h-[0-9]+.*w-full/i.test(line) && !/aspect-/i.test(line)) {
         results.potentialLayoutShift.push({ file: filePath, line: index + 1, reason: 'Potential CLS risk: Fixed height with fluid width' });
      }
    });
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
}

console.log(`Scanning directory: ${TARGET_DIR}`);
walkDir(TARGET_DIR);

fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2));

console.log(`Scan complete. Results written to ${REPORT_FILE}`);
console.log(`Found ${results.missingAltText.length} images missing alt text.`);
console.log(`Found ${results.rawImgTags.length} raw <img> tags.`);
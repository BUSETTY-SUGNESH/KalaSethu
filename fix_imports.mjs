import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.join(__dirname, 'app');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(appDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replace relative imports to components
  content = content.replace(/from\s+['"](?:\.\.\/)+components\/(.*?)['"]/g, 'from "@/app/components/$1"');
  content = content.replace(/from\s+['"](?:\.\/)+components\/(.*?)['"]/g, 'from "@/app/components/$1"');
  content = content.replace(/from\s+['"](?:\.\.\/)+ui\/(.*?)['"]/g, 'from "@/app/components/ui/$1"');
  content = content.replace(/from\s+['"]\.\/Icon['"]/g, 'from "@/app/components/ui/Icon"');

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});

console.log("Done");

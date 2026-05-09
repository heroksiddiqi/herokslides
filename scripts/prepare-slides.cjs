const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const publicSlidesDir = path.join(rootDir, 'public', 'slides');

if (!fs.existsSync(publicSlidesDir)) {
    fs.mkdirSync(publicSlidesDir, { recursive: true });
}

const folders = fs.readdirSync(rootDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && /^\d{3}-/.test(dirent.name))
    .map(dirent => dirent.name);

folders.forEach(folder => {
    const oldPath = path.join(rootDir, folder);
    const newPath = path.join(publicSlidesDir, folder);
    
    if (!fs.existsSync(newPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`Moved ${folder} to public/slides/`);
    } else {
        console.log(`${folder} already exists in public/slides/`);
    }
});

const manifest = [];
const scanDir = (dir, category = '') => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir, { withFileTypes: true });
    files.forEach(file => {
        if (file.isDirectory()) {
            scanDir(path.join(dir, file.name), file.name);
        } else if (/\.(png|jpe?g|webp)$/i.test(file.name)) {
            const relativePath = path.relative(path.join(rootDir, 'public'), path.join(dir, file.name)).replace(/\\/g, '/');
            manifest.push({
                id: manifest.length + 1,
                path: '/' + relativePath,
                category: category || 'General',
                name: file.name
            });
        }
    });
};

scanDir(publicSlidesDir);

if (!fs.existsSync(path.join(rootDir, 'src'))) {
    fs.mkdirSync(path.join(rootDir, 'src'));
}

fs.writeFileSync(path.join(rootDir, 'src', 'slides.json'), JSON.stringify(manifest, null, 2));
console.log(`Generated manifest with ${manifest.length} slides.`);

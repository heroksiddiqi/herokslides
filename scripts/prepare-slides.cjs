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

const imageSlides = [];
const scanDir = (dir, category = '') => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir, { withFileTypes: true });
    files.forEach(file => {
        if (file.isDirectory()) {
            scanDir(path.join(dir, file.name), file.name);
        } else if (/\.(png|jpe?g|webp)$/i.test(file.name)) {
            const relativePath = path.relative(path.join(rootDir, 'public'), path.join(dir, file.name)).replace(/\\/g, '/');
            imageSlides.push({
                id: `img-${imageSlides.length + 1}`,
                path: '/' + relativePath,
                category: category || 'General',
                name: file.name
            });
        }
    });
};

scanDir(publicSlidesDir);

const forwardDynamic = [
    { id: 'dynamic-job-hot', name: 'হট জবস', type: 'dynamic-job', category: 'Dynamic', subType: 'hot' },
    { id: 'dynamic-job-deadline', name: 'আগামীকালের ডেডলাইন', type: 'dynamic-job', category: 'Dynamic', subType: 'deadline' },
    { id: 'dynamic-job-latest', name: 'লেটেস্ট জব ইনফো', type: 'dynamic-job', category: 'Dynamic', subType: 'latest' },
    { id: 'dynamic-job-faridpur', name: 'ফরিদপুরের সরকারী চাকরী', type: 'dynamic-job', category: 'Dynamic', subType: 'faridpur' },
    { id: 'dynamic-job-govt', name: 'সরকারী চাকরী', type: 'dynamic-job', category: 'Dynamic', subType: 'govt' },
    { id: 'dynamic-job-exams', name: 'পরীক্ষার সময়সূচী', type: 'dynamic-job', category: 'Dynamic', subType: 'exams' },
    { id: 'dynamic-job-prebd', name: 'বাছাইকৃত সার্কুলার', type: 'dynamic-job', category: 'Dynamic', subType: 'prebd' },
    { id: 'dynamic-job-deadline3', name: 'আগামী ৩ দিনের ডেডলাইন', type: 'dynamic-job', category: 'Dynamic', subType: 'deadline3' }
];

const reverseDynamic = [...forwardDynamic].reverse();
const dynamicSequence = [...forwardDynamic, ...reverseDynamic];

const manifest = [];
let dynamicIndex = 0;

for (let i = 0; i < imageSlides.length; i++) {
    manifest.push(imageSlides[i]);
    
    // After every 5 image slides, insert 1 dynamic slide
    if ((i + 1) % 5 === 0) {
        manifest.push({
            ...dynamicSequence[dynamicIndex % dynamicSequence.length],
            tempId: `auto-dynamic-${Date.now()}-${i}`
        });
        dynamicIndex++;
    }
}

if (!fs.existsSync(path.join(rootDir, 'src'))) {
    fs.mkdirSync(path.join(rootDir, 'src'));
}

fs.writeFileSync(path.join(rootDir, 'src', 'slides.json'), JSON.stringify(manifest, null, 2));
console.log(`Generated manifest with ${manifest.length} slides (${imageSlides.length} images and ${dynamicIndex} dynamic slides).`);

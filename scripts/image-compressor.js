/**
 * 图片压缩脚本
 * 将 source/images/_originals/ 中的原图压缩到 source/images/
 * Hexo 生成时会自动将压缩后的图片复制到输出目录
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ORIGINALS_DIR = path.join(__dirname, '..', 'source', 'images', '_originals');
const OUTPUT_DIR = path.join(__dirname, '..', 'source', 'images');

// 压缩配置
const JPEG_QUALITY = 82;
const PNG_QUALITY = 85;

async function compressImage(srcPath, destPath, ext) {
    const start = Date.now();
    let pipeline = sharp(srcPath);

    if (ext === '.jpg' || ext === '.jpeg') {
        pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true });
    } else if (ext === '.png') {
        pipeline = pipeline.png({ quality: PNG_QUALITY, compressionLevel: 9 });
    } else {
        // 其他格式直接复制
        fs.copyFileSync(srcPath, destPath);
        return;
    }

    await pipeline.toFile(destPath);

    const srcSize = fs.statSync(srcPath).size;
    const destSize = fs.statSync(destPath).size;
    const ratio = ((1 - destSize / srcSize) * 100).toFixed(1);
    console.log(`  ${path.basename(srcPath)}: ${(srcSize/1024).toFixed(0)}KB → ${(destSize/1024).toFixed(0)}KB (${ratio}%)`);
}

async function compressAll() {
    if (!fs.existsSync(ORIGINALS_DIR)) {
        console.log('[image-compressor] _originals 目录不存在，跳过压缩');
        return;
    }

    const files = fs.readdirSync(ORIGINALS_DIR);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

    if (imageFiles.length === 0) return;

    console.log(`[image-compressor] 开始压缩 ${imageFiles.length} 张图片...`);

    for (const file of imageFiles) {
        const srcPath = path.join(ORIGINALS_DIR, file);
        const destPath = path.join(OUTPUT_DIR, file);
        const ext = path.extname(file).toLowerCase();

        // 如果压缩版已存在且比原图新，跳过
        if (fs.existsSync(destPath)) {
            const srcStat = fs.statSync(srcPath);
            const destStat = fs.statSync(destPath);
            if (destStat.mtime >= srcStat.mtime) continue;
        }

        try {
            await compressImage(srcPath, destPath, ext);
        } catch (err) {
            console.error(`  [ERROR] ${file}: ${err.message}`);
        }
    }
    console.log('[image-compressor] 压缩完成');
}

// 注册 Hexo before_generate 过滤器
hexo.extend.filter.register('before_generate', async function () {
    await compressAll();
    // 强制 Hexo 重新扫描 source 目录，确保新压缩的文件被识别
    await hexo.source.process();
});

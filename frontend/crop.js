import { Jimp } from 'jimp';
import path from 'path';

async function cropImage(filename) {
    console.log(`Processing ${filename}...`);
    try {
        const image = await Jimp.read(filename);
        image.autocrop();
        await image.write(filename);
        console.log(`Cropped and saved ${filename}`);
    } catch (err) {
        console.error(`Error processing ${filename}:`, err);
    }
}

async function main() {
    const light = path.join(process.cwd(), 'src/assets/smarth2wo_logo.png');
    const dark = path.join(process.cwd(), 'src/assets/smarth2wo_logo_dark.png');
    await cropImage(light);
    await cropImage(dark);
    console.log("Done");
}

main();

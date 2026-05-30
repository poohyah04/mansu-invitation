const fs = require('fs');
const path = require('path');

const framesDir = path.join(__dirname, '../public/frames');
if (!fs.existsSync(framesDir)) {
  fs.mkdirSync(framesDir, { recursive: true });
}

async function downloadFrame(index) {
  const paddedIndex = String(index).padStart(4, '0');
  const filename = `frame_${paddedIndex}.jpg`;
  // Using a dummy image service with some nice colors
  const url = `https://dummyimage.com/1280x720/0f172a/38bdf8.jpg&text=3D+Explosion+Frame+${index}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(path.join(framesDir, filename), Buffer.from(buffer));
    console.log(`Downloaded ${filename}`);
  } catch (err) {
    console.error(`Failed to download ${filename}:`, err);
  }
}

async function main() {
  console.log('Starting dummy frames download...');
  const totalFrames = 60;
  const promises = [];
  
  // Download in batches of 10 to avoid rate limits / socket issues
  for (let i = 1; i <= totalFrames; i++) {
    promises.push(downloadFrame(i));
    if (i % 10 === 0) {
      await Promise.all(promises);
      promises.length = 0;
    }
  }
  if (promises.length > 0) await Promise.all(promises);
  
  console.log('Finished generating 60 dummy frames.');
}

main();

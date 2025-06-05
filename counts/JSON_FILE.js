/*
Manual One-Time Script in Browser Console

Open Chrome DevTools → Console on any site and paste in.
*/
const TOKEN = P1 + P2;

const API_BASE_JSON = `https://api.github.com/repos/${USER}/${REPO}/contents/photos`;

async function getCounts() {
    const headers = { Authorization: `token ${TOKEN}` };
    const folders = await fetch(API_BASE_JSON, { headers }).then(r => r.json());
    let total = 0;
    let byFolder = {};

    for (const folder of folders.filter(f => f.type === 'dir')) {
        const contents = await fetch(`${API_BASE_JSON}/${folder.name}?per_page=100`, { headers }).then(r => r.json());
        const count = contents.filter(f => /\.(jpe?g|png)$/i.test(f.name)).length;
        byFolder[folder.name] = count;
        total += count;
    }

    console.log(JSON.stringify({ total, byFolder }, null, 2));
}

getCounts();

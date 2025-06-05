let currentFolder = '';
let photos = [];

document.addEventListener('DOMContentLoaded', async () => {
    const res = await fetch('/random-photos');
    const data = await res.json();
    currentFolder = data.folder;
    photos = data.files;
    renderPhotos(data.files);
});

function renderPhotos(files) {
    const grid = document.getElementById('photo-grid');
    grid.innerHTML = '';

    files.forEach(file => {
        const div = document.createElement('div');
        div.className = 'photo';
        div.innerHTML = `
      <img src="/photos/${currentFolder}/${file}" alt="${file}">
      <div class="selector">
        <label><input type="radio" name="${file}" value="kept" checked> Keep</label>
        <label><input type="radio" name="${file}" value="deleted"> Delete</label>
      </div>
    `;
        grid.appendChild(div);
    });
}

document.getElementById('submitBtn').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const selections = photos.map(file => {
        const status = document.querySelector(`input[name="${file}"]:checked`).value;
        return { filename: file, status };
    });

    const res = await fetch('/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, folder: currentFolder, selections })
    });

    const result = await res.json();
    document.getElementById('status').textContent = result.message;
});

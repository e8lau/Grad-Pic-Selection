async function loadPhotos() {
    const username = document.getElementById('username').value;
    const folders = await fetch('/folders').then(res => res.json());
    const folder = folders[Math.floor(Math.random() * folders.length)];
    const files = await fetch(`/images/${folder}`).then(res => res.json());
    const selected = files.sort(() => 0.5 - Math.random()).slice(0, 10);

    const container = document.getElementById('photo-container');
    container.innerHTML = '';

    selected.forEach(file => {
        const wrapper = document.createElement('div');
        wrapper.classList.add('photo-block');

        const img = document.createElement('img');
        img.src = `/photos/${folder}/${file}`;
        img.width = 150;

        const keep = document.createElement('input');
        keep.type = 'radio';
        keep.name = file;
        keep.value = 'keep';
        keep.checked = true;

        const del = document.createElement('input');
        del.type = 'radio';
        del.name = file;
        del.value = 'delete';

        wrapper.append(img, document.createTextNode(' Keep '), keep, document.createTextNode(' Delete '), del);
        container.appendChild(wrapper);
    });

    document.getElementById('submit').onclick = async () => {
        const selections = selected.map(file => {
            const choice = document.querySelector(`input[name='${file}']:checked`).value;
            return { file, status: choice };
        });
        await fetch('/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, folder, selections })
        });
        alert('Submitted!');
        updateCounter();
    };
}

document.getElementById('load').onclick = loadPhotos;

async function updateCounter() {
    const res = await fetch('/count');
    const { kept } = await res.json();
    document.getElementById('counter').textContent = `Remaining kept images: ${kept}`;
}

updateCounter();
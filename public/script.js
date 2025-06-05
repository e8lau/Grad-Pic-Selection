const photoContainer = document.getElementById('photo-container');
const submitButton = document.getElementById('submit-button');
const usernameSelect = document.getElementById('username');
const counterDisplay = document.getElementById('counter');

// Mock data (replace with actual fetch to backend or JSON file)
const folders = ['outfit1', 'beachshoot', 'nightshoot'];
const photosPerFolder = {
    'outfit1': ['IMG_1001.jpg', 'IMG_1002.jpg', 'IMG_1003.jpg'],
    'beachshoot': ['IMG_2001.jpg', 'IMG_2002.jpg', 'IMG_2003.jpg'],
    'nightshoot': ['IMG_3001.jpg', 'IMG_3002.jpg', 'IMG_3003.jpg']
};

const getRandom = (arr, n) => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
};

let currentFolder = '';
let selectedPhotos = [];

function loadPhotos() {
    photoContainer.innerHTML = '';
    selectedPhotos = [];
    currentFolder = folders[Math.floor(Math.random() * folders.length)];
    const selected = getRandom(photosPerFolder[currentFolder], 10);

    selected.forEach(filename => {
        const div = document.createElement('div');
        div.className = 'photo-entry';
        div.dataset.filename = filename;
        div.innerHTML = `<img src="photos/${currentFolder}/${filename}" alt="${filename}" />`;

        div.addEventListener('click', () => {
            div.classList.toggle('selected');
            const index = selectedPhotos.indexOf(filename);
            if (index === -1) selectedPhotos.push(filename);
            else selectedPhotos.splice(index, 1);
        });

        photoContainer.appendChild(div);
    });
}

submitButton.addEventListener('click', async () => {
    const username = usernameSelect.value;
    const results = Array.from(document.querySelectorAll('.photo-entry')).map(div => {
        return {
            timestamp: new Date().toISOString(),
            username,
            folder: currentFolder,
            image: div.dataset.filename,
            action: div.classList.contains('selected') ? 'kept' : 'deleted'
        };
    });

    const payload = {
        submitted_at: new Date().toISOString(),
        results
    };

    const filename = `submission_${payload.submitted_at.replace(/[:.]/g, '-')}.json`;
    const repo = "your-username/photo-review-app"; // 🔁 Replace with your actual GitHub username and repo name
    const branch = "main"; // or 'master', depending on your repo

    // 🚨 IMPORTANT: You must generate a fine-scoped GitHub token with 'repo content' access
    const token = "ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"; // 🔁 Replace with a secure token (ideally NOT stored in JS in prod)

    const response = await fetch(`https://api.github.com/repos/${repo}/contents/submissions/${filename}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: `Add photo review submission: ${filename}`,
            content: btoa(unescape(encodeURIComponent(JSON.stringify(payload)))), // base64 encode the JSON
            branch
        })
    });

    if (response.ok) {
        alert("Submission uploaded to GitHub!");
        loadPhotos();
    } else {
        alert("Error uploading to GitHub");
        console.error(await response.json());
    }
});

function updateCounter() {
    // Placeholder (replace with fetch to actual count file if available)
    counterDisplay.textContent = 'Remaining photos: 123';
}

loadPhotos();
updateCounter();

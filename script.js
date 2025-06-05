const USER = 'e8lau';
const REPO = 'Grad-Pic-Selection';
const BASE_PATH = 'photos';
const API_BASE = `https://api.github.com/repos/${USER}/${REPO}/contents`;
const PHOTO_COUNT = 10;

const P1 = 'github_pat_11AKAUWFI0WCKITVtVJzlY_zoxDyrHOUxWLw47';
const P2 = 'bkW3oEWfmAlkr9YBqNZTq53CEVHfTGS5GMYC9aA1AyGo';
const GITHUB_TOKEN = P1 + P2;

const SUPABASE_URL = 'https://hmhfnlsdaqtpkmzhhhpw.supabase.co';
const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtaGZubHNkYXF0cGttemhoaHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMTA1NzksImV4cCI6MjA2NDY4NjU3OX0.JThwSSJ12uXzu5xPikqvzt-AAqceNsiiqT1qsSktF8E';

async function fetchFolders() {
    const res = await fetch(`${API_BASE}/${BASE_PATH}`, {
        headers: {
            Authorization: `token ${GITHUB_TOKEN}`
        }
    });
    const data = await res.json();
    return data.filter(item => item.type === 'dir').map(item => item.name);
}

async function fetchAllFiles(folder) {
    let page = 1;
    let allFiles = [];
    let more = true;

    while (more) {
        const res = await fetch(`${API_BASE}/${BASE_PATH}/${folder}?per_page=100&page=${page}`, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`
            }
        });
        const data = await res.json();

        if (!Array.isArray(data)) break;

        const imageFiles = data.filter(item =>
            item.type === 'file' && /\.(jpg|jpeg|png)$/i.test(item.name)
        );

        allFiles.push(...imageFiles);
        more = data.length === 100;
        page++;
    }

    return allFiles.map(file => ({
        filename: `photos/${folder}/${file.name}`,
        url: file.download_url
    }));
}

async function getUserDeletedFilenames(folder, username) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews?select=filename,status&filename=like.photos/${folder}%25&username=eq.${username}`, {
        headers: {
            'apikey': SUPABASE_API_KEY,
            'Authorization': `Bearer ${SUPABASE_API_KEY}`
        }
    });
    const data = await res.json();
    const deletedFilenames = new Set(data.filter(d => d.status === 'deleted').map(d => d.filename));
    console.log(`Deleted files for ${username} in ${folder}:`, [...deletedFilenames]);
    return deletedFilenames;
}

function renderPhotos(photoObjects) {
    const container = document.getElementById('photo-container');
    container.innerHTML = '';
    photoObjects.forEach((photo, index) => {
        const label = document.createElement('label');
        label.innerHTML = `
      <div class="photo-entry">
        <input type="checkbox" name="photo-${index}" value="${photo.filename}" checked>
        <img src="${photo.url}" alt="photo" class="review-photo">
      </div>
    `;
        container.appendChild(label);
    });
}

async function submitReviews(username, reviews) {
    const formatted = reviews.map(r => ({
        username,
        filename: r.filename,
        status: r.status
    }));

    const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_API_KEY,
            'Authorization': `Bearer ${SUPABASE_API_KEY}`,
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(formatted)
    });

    if (res.ok) {
        alert('Submitted successfully!');
    } else {
        const error = await res.text();
        console.error('Submission error:', error);
        alert('Error submitting review.');
    }
}

function updateKeptCounter() {
    document.getElementById('kept-count').textContent = 'loading...';
}

document.getElementById('photo-review-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const inputs = document.querySelectorAll('input[type="checkbox"]');

    const results = Array.from(inputs).map(input => ({
        filename: input.value,
        status: input.checked ? 'kept' : 'deleted'
    }));

    await submitReviews(username, results);
    window.location.reload();
});

async function populateUsernameSuggestions() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews?select=username`, {
        headers: {
            'apikey': SUPABASE_API_KEY,
            'Authorization': `Bearer ${SUPABASE_API_KEY}`
        }
    });

    if (!res.ok) {
        console.error("Failed to fetch usernames", await res.text());
        return;
    }

    const data = await res.json();
    const usernames = [...new Set(data.map(d => d.username))];

    const datalist = document.getElementById('usernames');
    datalist.innerHTML = '';

    usernames.forEach(username => {
        const option = document.createElement('option');
        option.value = username;
        datalist.appendChild(option);
    });

    console.log('Username suggestions loaded:', usernames);
}

async function init() {
    await populateUsernameSuggestions();

    const username = document.getElementById('username').value;
    const folders = await fetchFolders();
    const randomFolder = folders[Math.floor(Math.random() * folders.length)];

    const allPhotos = await fetchAllFiles(randomFolder);
    const deletedSet = await getUserDeletedFilenames(randomFolder, username);

    console.log(`Total photos in folder '${randomFolder}':`, allPhotos.length);

    const filteredPhotos = allPhotos.filter(p => !deletedSet.has(p.filename));
    console.log(`Photos remaining after filtering for ${username}:`, filteredPhotos.map(p => p.filename));

    const selectedPhotos = shuffleArray(filteredPhotos).slice(0, PHOTO_COUNT);

    renderPhotos(selectedPhotos);
    updateKeptCounter();
}

function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

window.onload = init;

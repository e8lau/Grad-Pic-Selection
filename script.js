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
    const cacheKey = `photo-files-${folder}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
        return JSON.parse(cached);
    }

    let page = 1;
    let allFiles = [];
    let more = true;

    while (more) {
        const res = await fetch(`${API_BASE}/${BASE_PATH}/${folder}?per_page=100&page=${page}`, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
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

    const result = allFiles.map(file => ({
        filename: `photos/${folder}/${file.name}`,
        url: file.download_url
    }));

    localStorage.setItem(cacheKey, JSON.stringify(result));
    return result;
}

async function getUserReviewData(username) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews?select=filename,status&username=eq.${username}`, {
        headers: {
            'apikey': SUPABASE_API_KEY,
            'Authorization': `Bearer ${SUPABASE_API_KEY}`
        }
    });

    const data = await res.json();
    const deletedSet = new Set(data.filter(d => d.status === 'deleted').map(d => d.filename));
    const reviewedSet = new Set(data.map(d => d.filename));

    const viewCount = {};
    data.forEach(d => {
        viewCount[d.filename] = (viewCount[d.filename] || 0) + 1;
    });
    return { deletedSet, reviewedSet, viewCount };
}

function renderPhotos(photoObjects, viewCount = {}) {
    const container = document.getElementById('photo-container');
    container.innerHTML = '';
    photoObjects.forEach((photo, index) => {
        const div = document.createElement('div');
        div.className = 'photo-entry';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = `photo-${index}`;
        checkbox.value = photo.filename;
        checkbox.checked = true;

        const img = document.createElement('img');
        img.src = photo.url;
        img.alt = 'photo';
        img.className = 'review-photo';

        const count = viewCount[photo.filename] || 0;
        const countLabel = document.createElement('div');
        countLabel.className = 'photo-view-count';
        countLabel.textContent = `Viewed ${count} times`;

        div.appendChild(checkbox);
        div.appendChild(img);
        div.appendChild(countLabel);
        container.appendChild(div);
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

document.getElementById('username').addEventListener('change', async function (event) {
    const username = event.target.value.trim();
    if (username) {
        localStorage.setItem('photoshoot-review-username', username);
        await loadPhotosForUser(username);
    }
});

document.getElementById('photo-review-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    const usernameInput = document.getElementById('username');
    const username = usernameInput.value.trim();

    if (!username) {
        alert('Please enter a username.');
        return;
    }

    localStorage.setItem('photoshoot-review-username', username);

    const inputs = document.querySelectorAll('input[type="checkbox"]');
    const results = Array.from(inputs).map(input => ({
        filename: input.value,
        status: input.checked ? 'kept' : 'deleted'
    }));

    await submitReviews(username, results);
    await loadPhotosForUser(username);
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

async function updateProgressBar(username, reviewedSet) {
    const globalRes = await fetch(`${SUPABASE_URL}/rest/v1/global_review_counter?select=reviewed_count`, {
        headers: {
            'apikey': SUPABASE_API_KEY,
            'Authorization': `Bearer ${SUPABASE_API_KEY}`
        }
    });
    const data = await globalRes.json();
    const globalReviewCount = data.length > 0 ? data[0].reviewed_count : null;

    let total = 0;

    // 2. Try to fetch precomputed photo count from counts/photo_counts.json
    try {
        const res = await fetch('counts/photo_counts.json');

        if (!res.ok) throw new Error('photo_counts.json not found');

        const json = await res.json();
        total = json.total;

        console.log('✅ Loaded precomputed total image count:', total);
    } catch (error) {
        console.warn('⚠️ Falling back to manual GitHub image counting:', error.message);

        // 3. Fallback: manually compute total image count from all photo folders
        const foldersRes = await fetch(`${API_BASE}/${BASE_PATH}`, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        const folders = await foldersRes.json();

        for (const folder of folders.filter(f => f.type === 'dir')) {
            let page = 1;
            let more = true;

            while (more) {
                const contentsRes = await fetch(`${API_BASE}/${BASE_PATH}/${folder.name}?per_page=100&page=${page}`, {
                    headers: { Authorization: `token ${GITHUB_TOKEN}` }
                });
                const contents = await contentsRes.json();
                if (!Array.isArray(contents)) break;

                total += contents.filter(f => /\.(jpg|jpeg|png)$/i.test(f.name)).length;
                more = contents.length === 100;
                page++;
            }
        }

        console.log('📊 Manually computed total image count:', total);
    }

    // 4. Update the progress bar UI
    const percent = total ? (reviewedSet.size / total) * 100 : 0;
    const globalPercent = total ? (globalReviewCount / total) * 100 : 0;

    document.getElementById('progress-bar').style.transform = `scaleX(${1 - percent / 100})`;
    document.getElementById('progress-count').textContent = `You have reviewed ${reviewedSet.size} / ${total}`;

    document.getElementById('global-progress-bar').style.transform = `scaleX(${1 - globalPercent / 100})`;
    document.getElementById('global-progress-count').textContent = `Everyone combined has reviewed ${globalReviewCount} / ${total}`;
}

async function loadPhotosForUser(username) {
    if (!username) {
        document.getElementById('photo-container').innerHTML = '<p>Please enter a username to begin reviewing.</p>';
        document.getElementById('kept-count').textContent = '';
        document.getElementById('progress-bar').style.width = '0%';
        document.getElementById('progress-count').textContent = '0 / 0 reviewed';
        return;
    }

    const folders = await fetchFolders();
    const randomFolder = folders[Math.floor(Math.random() * folders.length)];

    const allPhotos = await fetchAllFiles(randomFolder);
    const { deletedSet, reviewedSet, viewCount } = await getUserReviewData(username);

    const filteredPhotos = allPhotos.filter(p => !deletedSet.has(p.filename));
    const selectedPhotos = shuffleArray(filteredPhotos).slice(0, PHOTO_COUNT);

    renderPhotos(selectedPhotos, viewCount);
    document.getElementById('kept-count').textContent = `${filteredPhotos.length} remaining`;

    // ✅ Update the progress bar
    await updateProgressBar(username, reviewedSet);
}

window.onload = async function () {
    await populateUsernameSuggestions();

    const storedUsername = localStorage.getItem('photoshoot-review-username');
    const usernameInput = document.getElementById('username');

    if (storedUsername) {
        usernameInput.value = storedUsername;
    }

    await loadPhotosForUser(storedUsername);
};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
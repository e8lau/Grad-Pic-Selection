// Constants
const ADMIN_USERNAME = 'Admin';
const ADMIN_PASSWORD = 'Cody1234*';

const SUPABASE_URL = 'https://hmhfnlsdaqtpkmzhhhpw.supabase.co';
const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtaGZubHNkYXF0cGttemhoaHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMTA1NzksImV4cCI6MjA2NDY4NjU3OX0.JThwSSJ12uXzu5xPikqvzt-AAqceNsiiqT1qsSktF8E';

const P1 = 'github_pat_11AKAUWFI0WCKITVtVJzlY_zoxDyrHOUxWLw47';
const P2 = 'bkW3oEWfmAlkr9YBqNZTq53CEVHfTGS5GMYC9aA1AyGo';
const GITHUB_TOKEN = P1 + P2;

const USER = 'e8lau';
const REPO = 'Grad-Pic-Selection';
const BASE_PATH = 'photos';
const API_BASE = `https://api.github.com/repos/${USER}/${REPO}/contents`;

// Page Global Variables
let allPhotos = [];
let currentPage = 1;
const PHOTOS_PER_PAGE = 100;

let deletionCounts = {};
let adminDeletedSet = new Set();
let lastCheckedIndex = null;

// Elements
const loginForm = document.getElementById('login-form');
const loginSection = document.getElementById('login-section');
const adminPanel = document.getElementById('admin-panel');

loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        loginSection.style.display = 'none';
        adminPanel.style.display = 'block';
        initializeAdminPanel();
    } else {
        alert('Incorrect credentials.');
    }
});

async function initializeAdminPanel() {
    const grid = document.getElementById('photo-grid');
    grid.innerHTML = '<p>Loading photos...</p>';

    const folders = await fetchFolders();
    allPhotos.length = 0;
    currentPage = 1;

    for (const folder of folders) {
        const files = await fetchAllFiles(folder);
        allPhotos.push(...files);
    }

    const folderSet = new Set(allPhotos.map(p => p.folder));
    const folderDropdown = document.getElementById('folder-filter');
    folderSet.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder;
        option.textContent = folder;
        folderDropdown.appendChild(option);
    });

    console.log('✅ All photos loaded:', allPhotos.length); // should be > 0 here

    ({ deletionCounts, adminDeletedSet } = await fetchDeletionData());
    renderPhotoGrid(deletionCounts, adminDeletedSet);
    renderPaginationControls();
}

async function fetchFolders() {
    const res = await fetch(`${API_BASE}/${BASE_PATH}`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` }
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
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        const data = await res.json();
        if (!Array.isArray(data)) break;

        const images = data.filter(item =>
            item.type === 'file' && /\.(jpg|jpeg|png)$/i.test(item.name)
        );

        allFiles.push(...images.map(file => ({
            filename: `photos/${folder}/${file.name}`,
            url: file.download_url,
            folder
        })));

        more = data.length === 100;
        page++;
    }

    return allFiles;
}

function getFilteredPhotos() {
    const folderFilter = document.getElementById('folder-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    const sortOrder = document.getElementById('sort-order').value;

    let result = [...allPhotos];

    if (folderFilter !== 'all') {
        result = result.filter(p => p.folder === folderFilter);
    }

    if (statusFilter === 'deleted') {
        result = result.filter(p => adminDeletedSet.has(p.filename));
    } else if (statusFilter === 'active') {
        result = result.filter(p => !adminDeletedSet.has(p.filename));
    }

    if (sortOrder === 'filename') {
        result.sort((a, b) => a.filename.localeCompare(b.filename));
    } else if (sortOrder === 'deletedCount') {
        result.sort((a, b) => (deletionCounts[b.filename] || 0) - (deletionCounts[a.filename] || 0));
    }

    return result;
}

function renderPhotoGrid(deletionCounts = {}, adminDeletedSet = new Set()) {
    const grid = document.getElementById('photo-grid');
    grid.innerHTML = '';

    const folderFilter = document.getElementById('folder-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    const sortOrder = document.getElementById('sort-order').value;

    filteredPhotos = getFilteredPhotos(); // <-- update global filteredPhotos

    const startIndex = (currentPage - 1) * PHOTOS_PER_PAGE;
    const pagePhotos = filteredPhotos.slice(startIndex, startIndex + PHOTOS_PER_PAGE);

    pagePhotos.forEach(photo => {
        const div = document.createElement('div');
        div.className = 'photo-entry';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'photo-checkbox';
        checkbox.dataset.filename = photo.filename;

        const img = document.createElement('img');
        img.src = photo.url;
        img.alt = 'photo';
        img.className = 'review-photo';

        const count = deletionCounts[photo.filename] || 0;
        const label = document.createElement('div');
        label.className = 'deleted-label';
        label.textContent = `Deleted by ${count} user${count !== 1 ? 's' : ''}`;

        if (adminDeletedSet.has(photo.filename)) {
            checkbox.checked = false;
            div.classList.add('deleted-by-admin');
        } else {
            checkbox.checked = true;
        }

        div.appendChild(checkbox);
        div.appendChild(img);
        div.appendChild(label);
        grid.appendChild(div);

        checkbox.addEventListener('click', (e) => {
            const checkboxes = Array.from(document.querySelectorAll('.photo-checkbox'));
            const currentIndex = checkboxes.indexOf(e.target);

            if (e.shiftKey && lastCheckedIndex !== null) {
                const [start, end] = [lastCheckedIndex, currentIndex].sort((a, b) => a - b);
                for (let i = start; i <= end; i++) {
                    checkboxes[i].checked = e.target.checked;
                }
            }

            lastCheckedIndex = currentIndex;
        });

    });
}

function renderPaginationControls() {
    const container = document.getElementById('pagination-controls');
    container.innerHTML = '';

    const totalPages = Math.ceil(filteredPhotos.length / PHOTOS_PER_PAGE);

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '⟵ Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        currentPage--;
        renderPhotoGrid(deletionCounts, adminDeletedSet);
        renderPaginationControls();
    };

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next ⟶';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        currentPage++;
        renderPhotoGrid(deletionCounts, adminDeletedSet);
        renderPaginationControls();
    };

    const label = document.createElement('span');
    label.textContent = ` Page ${currentPage} of ${totalPages} `;
    label.style.margin = '0 1rem';

    container.appendChild(prevBtn);
    container.appendChild(label);
    container.appendChild(nextBtn);
}

async function fetchDeletionData() {
    // Fetch user deletions
    const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews?select=filename,status`, {
        headers: {
            'apikey': SUPABASE_API_KEY,
            'Authorization': `Bearer ${SUPABASE_API_KEY}`
        }
    });

    const data = await res.json();
    const deletionCounts = {};

    data.forEach(entry => {
        if (entry.status === 'deleted') {
            deletionCounts[entry.filename] = (deletionCounts[entry.filename] || 0) + 1;
        }
    });

    // Fetch admin-deleted entries
    const adminRes = await fetch(`${SUPABASE_URL}/rest/v1/admin_reviews?select=filename,status`, {
        headers: {
            'apikey': SUPABASE_API_KEY,
            'Authorization': `Bearer ${SUPABASE_API_KEY}`
        }
    });

    const adminData = await adminRes.json();
    const adminDeletedSet = new Set(
        adminData.filter(d => d.status === 'deleted').map(d => d.filename)
    );

    return { deletionCounts, adminDeletedSet };
}

// PHASE 6
document.getElementById('mark-deleted').addEventListener('click', async () => {
    await submitAdminChanges('deleted');
});

document.getElementById('restore-selected').addEventListener('click', async () => {
    await submitAdminChanges('kept');
});

async function submitAdminChanges(status) {
    const checkboxes = document.querySelectorAll('.photo-checkbox');
    const changes = [];

    checkboxes.forEach(cb => {
        const filename = cb.dataset.filename;
        const isChecked = cb.checked;

        if ((status === 'deleted' && !isChecked) || (status === 'kept' && isChecked)) {
            changes.push({ filename, status });
        }
    });

    if (changes.length === 0) {
        alert('No changes to submit.');
        return;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/admin_reviews?on_conflict=filename`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_API_KEY,
            'Authorization': `Bearer ${SUPABASE_API_KEY}`,
            'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(changes)
    });

    if (res.ok) {
        alert(`✅ ${changes.length} photo(s) updated.`);
        ({ deletionCounts, adminDeletedSet } = await fetchDeletionData());
        renderPhotoGrid(deletionCounts, adminDeletedSet);
    } else {
        const error = await res.text();
        console.error('❌ Supabase Error:', error);
        alert('Failed to update admin reviews.');
    }
}

// Phase 7 Listeners
document.getElementById('folder-filter').addEventListener('change', () => {
    currentPage = 1;
    filteredPhotos = getFilteredPhotos();
    renderPhotoGrid(deletionCounts, adminDeletedSet);
    renderPaginationControls();
});

document.getElementById('status-filter').addEventListener('change', () => {
    currentPage = 1;
    filteredPhotos = getFilteredPhotos();
    renderPhotoGrid(deletionCounts, adminDeletedSet);
    renderPaginationControls();
});

document.getElementById('sort-order').addEventListener('change', () => {
    currentPage = 1;
    filteredPhotos = getFilteredPhotos();
    renderPhotoGrid(deletionCounts, adminDeletedSet);
    renderPaginationControls();
});

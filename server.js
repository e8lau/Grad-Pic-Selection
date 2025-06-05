// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const PHOTO_DIR = path.join(__dirname, 'photos');
const CSV_PATH = path.join(__dirname, 'data', 'photo_log.csv');

// Ensure CSV exists with headers
if (!fs.existsSync(CSV_PATH)) {
    fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true });
    fs.writeFileSync(CSV_PATH, 'timestamp,username,folder,filename,status\n');
}

app.get('/random-photos', (req, res) => {
    const folders = fs.readdirSync(PHOTO_DIR).filter(f => fs.statSync(path.join(PHOTO_DIR, f)).isDirectory());
    const folder = folders[Math.floor(Math.random() * folders.length)];
    const files = fs.readdirSync(path.join(PHOTO_DIR, folder)).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
    const selected = files.sort(() => 0.5 - Math.random()).slice(0, 10);
    res.json({ folder, files: selected });
});

app.post('/submit', (req, res) => {
    const { username, folder, selections } = req.body;
    const timestamp = new Date().toISOString();
    const lines = selections.map(sel => `${timestamp},${username},${folder},${sel.filename},${sel.status}`).join('\n') + '\n';
    fs.appendFileSync(CSV_PATH, lines);
    res.json({ message: 'Logged successfully.' });
});

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
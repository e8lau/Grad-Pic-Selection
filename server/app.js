const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PHOTOS_DIR = path.join(__dirname, '../photos');
const CSV_PATH = path.join(__dirname, '../data/photo_log.csv');

const csvWriter = createCsvWriter({
    path: CSV_PATH,
    header: [
        { id: 'timestamp', title: 'timestamp' },
        { id: 'username', title: 'username' },
        { id: 'folder', title: 'folder' },
        { id: 'file', title: 'file' },
        { id: 'status', title: 'status' }
    ],
    append: true
});

app.get('/folders', (req, res) => {
    fs.readdir(PHOTOS_DIR, (err, folders) => {
        if (err) return res.status(500).send('Unable to list folders');
        res.json(folders);
    });
});

app.get('/images/:folder', (req, res) => {
    const folderPath = path.join(PHOTOS_DIR, req.params.folder);
    fs.readdir(folderPath, (err, files) => {
        if (err) return res.status(500).send('Unable to list images');
        res.json(files);
    });
});

app.post('/submit', (req, res) => {
    const { username, folder, selections } = req.body;
    const timestamp = new Date().toISOString();

    const records = selections.map(sel => ({
        timestamp,
        username,
        folder,
        file: sel.file,
        status: sel.status
    }));

    csvWriter.writeRecords(records).then(() => res.sendStatus(200));
});

app.get('/count', (req, res) => {
    fs.readFile(CSV_PATH, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Could not read CSV');
        const lines = data.trim().split('\n').slice(1); // skip header
        const keptCount = lines.filter(line => line.endsWith(',keep')).length;
        res.json({ kept: keptCount });
    });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
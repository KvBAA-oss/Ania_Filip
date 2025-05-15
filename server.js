const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const mime = require('mime');

const app = express();
const PORT = 3000;

const PHOTO_DIR = path.join(__dirname, 'uploads/photos');
const VIDEO_DIR = path.join(__dirname, 'uploads/videos');
const META_FILE = path.join(__dirname, 'data/metadata.json');

fs.ensureDirSync(PHOTO_DIR);
fs.ensureDirSync(VIDEO_DIR);
fs.ensureFileSync(META_FILE);
if (fs.readFileSync(META_FILE).length === 0) fs.writeJsonSync(META_FILE, []);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = file.mimetype.startsWith('video') ? VIDEO_DIR : PHOTO_DIR;
    cb(null, type);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}-${file.originalname}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

app.use(express.static('public'));
app.use(express.json());

app.post('/upload', upload.single('file'), async (req, res) => {
  const { name } = req.body;
  const type = req.file.mimetype.startsWith('video') ? 'video' : 'photo';
  const meta = await fs.readJson(META_FILE);
  meta.push({
    file: req.file.filename,
    original: req.file.originalname,
    type,
    name,
    timestamp: Date.now()
  });
  await fs.writeJson(META_FILE, meta);
  res.redirect('/');
});

app.get('/files', async (req, res) => {
  const meta = await fs.readJson(META_FILE);
  res.json(meta);
});

app.post('/delete', async (req, res) => {
  const { file, name } = req.body;
  const meta = await fs.readJson(META_FILE);
  const index = meta.findIndex(m => m.file === file && m.name === name);
  if (index === -1) return res.status(403).send('Brak uprawnień.');

  const targetPath = path.join(
    meta[index].type === 'photo' ? PHOTO_DIR : VIDEO_DIR,
    file
  );
  fs.unlinkSync(targetPath);
  meta.splice(index, 1);
  await fs.writeJson(META_FILE, meta);
  res.sendStatus(200);
});

app.get('/media/:type/:filename', (req, res) => {
  const folder = req.params.type === 'video' ? VIDEO_DIR : PHOTO_DIR;
  const filePath = path.join(folder, req.params.filename);
  res.sendFile(filePath);
});

app.listen(PORT, () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
});

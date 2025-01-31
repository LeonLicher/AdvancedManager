import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method === 'POST') {
    const form = new formidable.IncomingForm();
    form.uploadDir = path.join(process.cwd(), 'public', 'player-images');
    form.keepExtensions = true;

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.status(500).json({ error: 'Error saving file' });
        return;
      }

      const file = files.image;
      const newPath = path.join(form.uploadDir, file.name);

      fs.rename(file.path, newPath, (renameErr) => {
        if (renameErr) {
          res.status(500).json({ error: 'Error saving file' });
          return;
        }

        res.status(200).json({ message: 'File saved successfully' });
      });
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
// 

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const form = new IncomingForm({ keepExtensions: true });
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Error procesando PDF' });

    const filePath = (files.file as any).filepath;
    const calidad = fields.calidad as string || '20';
    const nombreSalida = path.basename(filePath, '.pdf');
    const outputDir = path.resolve('/tmp', 'images');

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const command = `magick -quiet -density 600 "${filePath}" -resize 1920 -quality ${calidad} "${path.join(outputDir, nombreSalida)}_%03d.jpg"`;

    exec(command, (error) => {
      if (error) return res.status(500).json({ error: error.message });

      const base64Array = fs.readdirSync(outputDir)
        .filter(f => f.startsWith(nombreSalida))
        .map(f => fs.readFileSync(path.join(outputDir, f)).toString('base64'));

      // Limpiar
      fs.rmSync(filePath, { force: true });
      fs.rmSync(outputDir, { recursive: true, force: true });

      res.status(200).json({ images: base64Array });
    });
  });
}

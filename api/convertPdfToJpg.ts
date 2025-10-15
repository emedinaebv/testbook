// 


import type { VercelRequest, VercelResponse } from '@vercel/node';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import { fromPath } from 'pdf2pic';

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const form = new IncomingForm({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Error procesando PDF' });

    const filePath = (files.file as any).filepath;
    const calidad = parseInt(fields.calidad as string) || 20;
    const outputDir = path.resolve('/tmp', 'images');

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    try {
      const storeAsImage = fromPath(filePath, {
        density: 100,
        savePath: outputDir,
        format: 'jpeg',
        width: 1920,
        quality: calidad,
      });

      // Convertir todas las páginas automáticamente
      const result = await storeAsImage.convertBulk(-1); // -1 significa "todas las páginas"
      const base64Array: string[] = result.map(r => {
        const buffer = fs.readFileSync(r.path);
        fs.rmSync(r.path, { force: true }); // limpiar JPG temporal
        return buffer.toString('base64');
      });

      fs.rmSync(filePath, { force: true }); // limpiar PDF temporal
      res.status(200).json({ images: base64Array });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });
}

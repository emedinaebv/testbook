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
    const nombreSalida = path.basename(filePath, '.pdf');
    const outputDir = path.resolve('/tmp', 'images');

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    try {
      // Configuración pdf2pic
      const storeAsImage = fromPath(filePath, {
        density: 100,
        savePath: outputDir,
        format: 'jpeg',
        width: 1920,
        height: 0, // altura automática proporcional
        quality: calidad
      });

      const pdfPages = JSON.parse(
        require('child_process')
          .execSync(`pdfinfo "${filePath}" | grep Pages | awk '{print $2}'`)
          .toString()
      ) || 1;

      const base64Array: string[] = [];

      // Convertir todas las páginas
      for (let i = 1; i <= pdfPages; i++) {
        const result = await storeAsImage(i);
        const imgBuffer = fs.readFileSync(result.path);
        base64Array.push(imgBuffer.toString('base64'));
        fs.rmSync(result.path, { force: true }); // limpiar JPG temporal
      }

      fs.rmSync(filePath, { force: true }); // limpiar PDF temporal
      res.status(200).json({ images: base64Array });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });
}

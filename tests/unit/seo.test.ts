import fs from 'fs';
import path from 'path';
import os from 'os';
import { parseAndOptimizeHtml } from '../../src/seo/parser';
import { optimizeFile, optimizeDirectory } from '../../src/seo/index';
import { runCli, parseArgs } from '../../bin/seo-optimizer';

describe('SEO Optimizer - Unit Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Tag Transformations & HTML Parsing', () => {
    test('1. Title Tag Injection and Brand Suffix Appending', () => {
      const html = `<!DOCTYPE html>
<html>
<head></head>
<body>
  <h1>Anillos de Compromiso en Oro 18K</h1>
</body>
</html>`;
      const result = parseAndOptimizeHtml(html, { brandName: 'Aguamarina Joyería' });

      expect(result.isModified).toBe(true);
      expect(result.html).toContain('<title>Anillos de Compromiso en Oro 18K | Aguamarina Joyería</title>');
      expect(result.modifications.some(m => m.tag === 'title')).toBe(true);
    });

    test('1b. Generic Title Replacement', () => {
      const html = `<!DOCTYPE html>
<html>
<head><title>Untitled Document</title></head>
<body>
  <h1>Colección de Relojes de Lujo</h1>
</body>
</html>`;
      const result = parseAndOptimizeHtml(html, { brandName: 'Aguamarina Joyería' });

      expect(result.html).toContain('<title>Colección de Relojes de Lujo | Aguamarina Joyería</title>');
    });

    test('1c. Existing Title with Brand Suffix is Preserved', () => {
      const html = `<!DOCTYPE html>
<html>
<head><title>Pendientes de Diamante | Aguamarina Joyería</title></head>
<body><h1>Pendientes de Diamante</h1></body>
</html>`;
      const result = parseAndOptimizeHtml(html, { brandName: 'Aguamarina Joyería' });

      const titleMods = result.modifications.filter(m => m.tag === 'title');
      expect(titleMods.length).toBe(0);
      expect(result.html).toContain('<title>Pendientes de Diamante | Aguamarina Joyería</title>');
    });

    test('2. Meta Description Injection and Truncation', () => {
      const longParagraph = 'En Aguamarina Joyería diseñamos piezas exclusivas con los más altos estándares de calidad artesanales en oro de 18 kilates, diamantes certificados por el GIA y gemas preciosas de origen ético para momentos inolvidables.';
      const html = `<!DOCTYPE html>
<html>
<head><title>Joyería Fina | Aguamarina Joyería</title></head>
<body>
  <h1>Joyería Fina</h1>
  <p>${longParagraph}</p>
</body>
</html>`;

      const result = parseAndOptimizeHtml(html, { brandName: 'Aguamarina Joyería' });
      expect(result.html).toContain('<meta name="description" content="En Aguamarina Joyería diseñamos piezas exclusivas con los más altos estándares de calidad artesanales en oro de 18 kilates, diamantes certificados por el...');
      expect(result.modifications.some(m => m.tag === 'meta-description')).toBe(true);
    });

    test('3. Meta Viewport Injection', () => {
      const html = `<!DOCTYPE html>
<html>
<head><title>Boutique | Aguamarina Joyería</title></head>
<body><h1>Nuestra Boutique</h1></body>
</html>`;

      const result = parseAndOptimizeHtml(html);
      expect(result.html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
      expect(result.modifications.some(m => m.tag === 'meta-viewport')).toBe(true);
    });

    test('4. OpenGraph and Twitter Social Tags Injection', () => {
      const html = `<!DOCTYPE html>
<html>
<head><title>Anillos de Boda | Aguamarina Joyería</title></head>
<body>
  <h1>Anillos de Boda</h1>
  <img src="/images/anillo-boda.jpg" alt="Anillo de Boda">
</body>
</html>`;

      const result = parseAndOptimizeHtml(html, { brandName: 'Aguamarina Joyería' });

      expect(result.html).toContain('<meta property="og:title" content="Anillos de Boda | Aguamarina Joyería">');
      expect(result.html).toContain('<meta property="og:site_name" content="Aguamarina Joyería">');
      expect(result.html).toContain('<meta property="og:image" content="/images/anillo-boda.jpg">');
      expect(result.html).toContain('<meta name="twitter:card" content="summary_large_image">');
      expect(result.html).toContain('<meta name="twitter:title" content="Anillos de Boda | Aguamarina Joyería">');
    });

    test('5. Heading Hierarchy Normalizer (Single H1 & Skipped Levels)', () => {
      const html = `<!DOCTYPE html>
<html>
<head><title>Catálogo | Aguamarina Joyería</title></head>
<body>
  <h1>Primer H1 Principal</h1>
  <p>Descripción corta de la sección.</p>
  <h1>Segundo H1 Duplicado</h1>
  <h3>Sección Desconectada H3</h3>
</body>
</html>`;

      const result = parseAndOptimizeHtml(html);

      // Second <h1> should be demoted to <h2>
      expect(result.html).toContain('<h2>Segundo H1 Duplicado</h2>');
      // Skipped <h3> after <h2> should be converted to <h3> or normalized properly
      expect(result.modifications.some(m => m.tag === 'heading' && m.action === 'demoted')).toBe(true);
    });

    test('5b. Promotion of First Heading when H1 is missing', () => {
      const html = `<!DOCTYPE html>
<html>
<head><title>Colección Oro | Aguamarina Joyería</title></head>
<body>
  <h2>Joyas en Oro Amarillo</h2>
</body>
</html>`;

      const result = parseAndOptimizeHtml(html);
      expect(result.html).toContain('<h1>Joyas en Oro Amarillo</h1>');
      expect(result.modifications.some(m => m.tag === 'heading' && m.action === 'promoted')).toBe(true);
    });

    test('6. Image Alt Attribute Contextual Injection', () => {
      const html = `<!DOCTYPE html>
<html>
<head><title>Gemas Preciosas | Aguamarina Joyería</title></head>
<body>
  <h1>Gemas Preciosas</h1>
  <figure>
    <img src="/images/esmeralda-colombiana.jpg">
    <figcaption>Esmeralda colombiana de 2 quilates</figcaption>
  </figure>
  <img src="/images/anillo-zafiro-azul.png">
  <img src="/images/img1.jpg">
</body>
</html>`;

      const result = parseAndOptimizeHtml(html, { brandName: 'Aguamarina Joyería' });

      // Figcaption context
      expect(result.html).toContain('alt="Esmeralda colombiana de 2 quilates"');
      // Filename context
      expect(result.html).toContain('alt="Anillo Zafiro Azul - Aguamarina Joyería"');
      // Fallback context
      expect(result.html).toContain('alt="Joyería fina Aguamarina"');
      expect(result.modifications.some(m => m.tag === 'img-alt')).toBe(true);
    });
  });

  describe('Spanish UTF-8 Character Preservation', () => {
    test('Preserves raw Spanish characters (ñ, á, é, í, ó, ú, ¿, ¡)', () => {
      const spanishHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <title>Diseños de Joyería en Bogotá &amp; Medellín</title>
</head>
<body>
  <h1>¿Buscas los mejores anillos de compromiso? ¡Visítanos!</h1>
  <p>En nuestra joyería diseñamos piezas únicas con diamantes, zafiros y esmeraldas de alta pureza. Envió gratis a todo el país.</p>
</body>
</html>`;

      const result = parseAndOptimizeHtml(spanishHtml, { brandName: 'Aguamarina Joyería' });

      expect(result.html).toContain('¿Buscas los mejores anillos de compromiso? ¡Visítanos!');
      expect(result.html).toContain('Diseños de Joyería en Bogotá &amp; Medellín | Aguamarina Joyería');
      expect(result.html).not.toContain('&aacute;');
      expect(result.html).not.toContain('&ntilde;');
      expect(result.html).not.toContain('&iexcl;');
      expect(result.html).not.toContain('Ã¡');
    });
  });

  describe('Edge Cases', () => {
    test('Handles missing <head> tag by creating it', () => {
      const htmlWithoutHead = `<html><body><h1>Sin Encabezado</h1></body></html>`;
      const result = parseAndOptimizeHtml(htmlWithoutHead, { brandName: 'Aguamarina Joyería' });

      expect(result.html).toContain('<head>');
      expect(result.html).toContain('</head>');
      expect(result.html).toContain('<title>Sin Encabezado | Aguamarina Joyería</title>');
      expect(result.modifications.some(m => m.tag === 'head')).toBe(true);
    });

    test('Handles empty 0-byte file', () => {
      const result = parseAndOptimizeHtml('');

      expect(result.isModified).toBe(true);
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<title>Inicio | Aguamarina Joyería</title>');
      expect(result.html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
    });

    test('Already optimized file returns unmodified status', () => {
      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Colección Relojes | Aguamarina Joyería</title>
  <meta name="description" content="Descubre la elegancia y distinción en Aguamarina Joyería. Colección exclusiva de joyas, anillos de compromiso, oro 18k y diamantes.">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:title" content="Colección Relojes | Aguamarina Joyería">
  <meta property="og:description" content="Descubre la elegancia y distinción en Aguamarina Joyería. Colección exclusiva de joyas, anillos de compromiso, oro 18k y diamantes.">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Aguamarina Joyería">
  <meta property="og:image" content="/images/reloj.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Colección Relojes | Aguamarina Joyería">
  <meta name="twitter:description" content="Descubre la elegancia y distinción en Aguamarina Joyería. Colección exclusiva de joyas, anillos de compromiso, oro 18k y diamantes.">
  <meta name="twitter:image" content="/images/reloj.jpg">
</head>
<body>
  <h1>Colección Relojes</h1>
  <img src="/images/reloj.jpg" alt="Reloj Elegante">
</body>
</html>`;

      const result = parseAndOptimizeHtml(html, { brandName: 'Aguamarina Joyería' });
      expect(result.isModified).toBe(false);
      expect(result.modifications.length).toBe(0);
    });
  });

  describe('File and Directory Operations (optimizeFile & optimizeDirectory)', () => {
    test('optimizeFile updates file on disk when modified and dryRun is false', () => {
      const filePath = path.join(tempDir, 'test.html');
      fs.writeFileSync(filePath, '<html><body><h1>Prueba</h1></body></html>', 'utf-8');

      const result = optimizeFile(filePath, { dryRun: false, brandName: 'Aguamarina Joyería' });

      expect(result.status).toBe('modified');
      const updatedContent = fs.readFileSync(filePath, 'utf-8');
      expect(updatedContent).toContain('<title>Prueba | Aguamarina Joyería</title>');
    });

    test('optimizeFile does NOT modify disk when dryRun is true', () => {
      const filePath = path.join(tempDir, 'test_dry.html');
      const originalHtml = '<html><body><h1>Prueba Dry Run</h1></body></html>';
      fs.writeFileSync(filePath, originalHtml, 'utf-8');

      const result = optimizeFile(filePath, { dryRun: true, brandName: 'Aguamarina Joyería' });

      expect(result.status).toBe('modified');
      const onDiskContent = fs.readFileSync(filePath, 'utf-8');
      expect(onDiskContent).toBe(originalHtml);
    });

    test('optimizeDirectory scans recursively and writes JSON audit report', async () => {
      const subDir = path.join(tempDir, 'sub');
      fs.mkdirSync(subDir, { recursive: true });

      const file1 = path.join(tempDir, 'index.html');
      const file2 = path.join(subDir, 'producto.html');
      const reportPath = path.join(tempDir, 'reports', 'audit.json');

      fs.writeFileSync(file1, '<html><body><h1>Página Inicio</h1></body></html>', 'utf-8');
      fs.writeFileSync(file2, '<html><body><h1>Producto Anillo</h1></body></html>', 'utf-8');

      const report = await optimizeDirectory({
        directoryPath: tempDir,
        recursive: true,
        dryRun: false,
        outputReportPath: reportPath,
        brandName: 'Aguamarina Joyería'
      });

      expect(report.totalFilesScanned).toBe(2);
      expect(report.filesModified).toBe(2);
      expect(fs.existsSync(reportPath)).toBe(true);

      const savedReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      expect(savedReport.totalFilesScanned).toBe(2);
      expect(savedReport.results.length).toBe(2);
    });
  });

  describe('CLI Command Execution', () => {
    test('parseArgs parses CLI flags correctly', () => {
      const args = ['--dir', './public', '--recursive', '--dry-run', '--report', './report.json', '--brand', 'TestBrand'];
      const parsed = parseArgs(args);

      expect(parsed.directoryPath).toBe('./public');
      expect(parsed.recursive).toBe(true);
      expect(parsed.dryRun).toBe(true);
      expect(parsed.outputReportPath).toBe('./report.json');
      expect(parsed.brandName).toBe('TestBrand');
    });

    test('runCli executes successfully with --dir flag', async () => {
      const filePath = path.join(tempDir, 'cli_test.html');
      fs.writeFileSync(filePath, '<html><body><h1>Prueba CLI</h1></body></html>', 'utf-8');

      const exitCode = await runCli(['--dir', tempDir, '--dry-run']);
      expect(exitCode).toBe(0);
    });
  });
});

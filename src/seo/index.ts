import fs from 'fs';
import path from 'path';
import { parseAndOptimizeHtml, ModificationDetail, ParseAndOptimizeOptions } from './parser';

export interface SeoOptimizeOptions {
  directoryPath: string;
  recursive?: boolean;
  brandName?: string;
  defaultLanguage?: string;
  dryRun?: boolean;
  outputReportPath?: string;
}

export interface FileOptimizationResult {
  filePath: string;
  relativePath: string;
  status: 'modified' | 'unmodified' | 'error';
  modified: boolean;
  modifications: ModificationDetail[];
  outputHtml?: string;
  error?: string;
}

export interface SeoAuditReport {
  timestamp: string;
  scannedDirectory: string;
  totalFilesScanned: number;
  filesModified: number;
  filesUnmodified: number;
  filesFailed: number;
  results: FileOptimizationResult[];
}

export function optimizeFile(
  filePath: string,
  options?: Partial<SeoOptimizeOptions>
): FileOptimizationResult {
  const absPath = path.resolve(filePath);
  const baseDir = options?.directoryPath ? path.resolve(options.directoryPath) : path.dirname(absPath);
  const relativePath = path.relative(baseDir, absPath);

  try {
    const rawContent = fs.readFileSync(absPath, 'utf-8');
    const filename = path.basename(absPath);
    const parseOpts: ParseAndOptimizeOptions = {
      brandName: options?.brandName || 'Aguamarina Joyería',
      filename,
      defaultLanguage: options?.defaultLanguage || 'es'
    };

    const parseResult = parseAndOptimizeHtml(rawContent, parseOpts);

    if (parseResult.isModified) {
      if (!options?.dryRun) {
        fs.writeFileSync(absPath, parseResult.html, 'utf-8');
      }
      return {
        filePath: absPath,
        relativePath,
        status: 'modified',
        modified: true,
        modifications: parseResult.modifications,
        outputHtml: parseResult.html
      };
    }

    return {
      filePath: absPath,
      relativePath,
      status: 'unmodified',
      modified: false,
      modifications: [],
      outputHtml: rawContent
    };
  } catch (err: any) {
    return {
      filePath: absPath,
      relativePath,
      status: 'error',
      modified: false,
      modifications: [],
      error: err?.message || String(err)
    };
  }
}

function scanHtmlFilesSync(dirPath: string, recursive: boolean = true): string[] {
  let files: string[] = [];
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Directory not found: ${dirPath}`);
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (recursive) {
        files = files.concat(scanHtmlFilesSync(fullPath, recursive));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === '.html' || ext === '.htm') {
        files.push(fullPath);
      }
    }
  }
  return files;
}

export async function optimizeDirectory(
  options: SeoOptimizeOptions
): Promise<SeoAuditReport> {
  const targetDir = path.resolve(options.directoryPath);
  const isRecursive = options.recursive !== undefined ? options.recursive : true;

  const htmlFiles = scanHtmlFilesSync(targetDir, isRecursive);
  const results: FileOptimizationResult[] = [];

  for (const file of htmlFiles) {
    const res = optimizeFile(file, {
      ...options,
      directoryPath: targetDir
    });
    results.push(res);
  }

  const filesModified = results.filter(r => r.status === 'modified').length;
  const filesUnmodified = results.filter(r => r.status === 'unmodified').length;
  const filesFailed = results.filter(r => r.status === 'error').length;

  const report: SeoAuditReport = {
    timestamp: new Date().toISOString(),
    scannedDirectory: targetDir,
    totalFilesScanned: results.length,
    filesModified,
    filesUnmodified,
    filesFailed,
    results
  };

  if (options.outputReportPath) {
    const reportAbsPath = path.resolve(options.outputReportPath);
    const reportDir = path.dirname(reportAbsPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(reportAbsPath, JSON.stringify(report, null, 2), 'utf-8');
  }

  return report;
}

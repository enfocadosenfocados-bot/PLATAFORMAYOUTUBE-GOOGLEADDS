#!/usr/bin/env node
import path from 'path';
import fs from 'fs';
import { optimizeDirectory, SeoOptimizeOptions } from '../src/seo';

export function parseArgs(args: string[]): Partial<SeoOptimizeOptions> {
  const options: Partial<SeoOptimizeOptions> = {
    recursive: true,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dir' || arg === '-d') {
      options.directoryPath = args[++i];
    } else if (arg.startsWith('--dir=')) {
      options.directoryPath = arg.split('=')[1];
    } else if (arg === '--recursive' || arg === '-r') {
      options.recursive = true;
    } else if (arg === '--no-recursive') {
      options.recursive = false;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--report') {
      options.outputReportPath = args[++i];
    } else if (arg.startsWith('--report=')) {
      options.outputReportPath = arg.split('=')[1];
    } else if (arg === '--brand') {
      options.brandName = args[++i];
    } else if (arg.startsWith('--brand=')) {
      options.brandName = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

export function printHelp(): void {
  console.log(`
Aguamarina Joyería - Local SEO HTML Optimizer CLI

Usage:
  npx ts-node bin/seo-optimizer.ts --dir <path> [options]

Options:
  --dir, -d <path>     Target directory path containing HTML files (Required)
  --recursive, -r     Scan directory recursively (Default: true)
  --no-recursive      Scan target directory only without subdirectories
  --dry-run           Perform SEO audit and output modifications without writing files
  --report <path>     Output path for JSON audit report
  --brand <name>      Brand name suffix (Default: "Aguamarina Joyería")
  --help, -h          Display this help message
`);
}

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const parsed = parseArgs(argv);

  if (!parsed.directoryPath) {
    console.error('Error: --dir parameter is required.');
    printHelp();
    return 1;
  }

  console.log('=====================================================');
  console.log('  Aguamarina Joyería - Local SEO HTML Optimizer');
  console.log('=====================================================');
  console.log(`Scanned Directory: ${parsed.directoryPath}`);
  console.log(`Mode:              ${parsed.dryRun ? 'DRY RUN (No files written)' : 'LIVE OPTIMIZATION'}`);
  console.log(`Recursive:         ${parsed.recursive}`);
  if (parsed.outputReportPath) {
    console.log(`Report Path:       ${parsed.outputReportPath}`);
  }
  console.log('-----------------------------------------------------\n');

  try {
    const report = await optimizeDirectory({
      directoryPath: parsed.directoryPath,
      recursive: parsed.recursive,
      dryRun: parsed.dryRun,
      outputReportPath: parsed.outputReportPath,
      brandName: parsed.brandName
    });

    console.log(`Scan Complete at ${report.timestamp}`);
    console.log(`Total Files Scanned: ${report.totalFilesScanned}`);
    console.log(`Files Modified:      ${report.filesModified}`);
    console.log(`Files Unmodified:    ${report.filesUnmodified}`);
    console.log(`Files Failed:        ${report.filesFailed}\n`);

    if (report.results.length > 0) {
      console.log('Modification Summary:');
      report.results.forEach(res => {
        const badge = res.status === 'modified' ? '[MODIFIED]' : res.status === 'unmodified' ? '[OK]' : '[ERROR]';
        console.log(`  ${badge} ${res.relativePath}`);
        if (res.modifications.length > 0) {
          res.modifications.forEach(m => {
            console.log(`     - [${m.tag}] ${m.action.toUpperCase()}: ${m.reason}`);
          });
        }
        if (res.error) {
          console.log(`     - Error: ${res.error}`);
        }
      });
    }

    return 0;
  } catch (err: any) {
    console.error(`CLI Execution Error: ${err?.message || err}`);
    return 1;
  }
}

if (require.main === module) {
  runCli().then(code => process.exit(code));
}

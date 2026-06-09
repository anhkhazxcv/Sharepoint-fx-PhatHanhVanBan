'use strict';

const fs = require('fs');
const path = require('path');

const supportedEnvironments = ['uat', 'prod'];
const selectedEnvironment = (process.argv[2] || '').toLowerCase();

if (supportedEnvironments.indexOf(selectedEnvironment) === -1) {
  console.error(`Invalid environment. Use one of: ${supportedEnvironments.join(', ')}`);
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const configDir = path.join(rootDir, 'config');
const envConfigDir = path.join(configDir, 'env', selectedEnvironment);

const filesToCopy = [
  'package-solution.json',
  'write-manifests.json',
  'deploy-azure-storage.json'
];

filesToCopy.forEach(fileName => {
  const sourcePath = path.join(envConfigDir, fileName);
  const targetPath = path.join(configDir, fileName);

  if (!fs.existsSync(sourcePath)) {
    console.error(`Missing environment config file: ${sourcePath}`);
    process.exit(1);
  }

  fs.copyFileSync(sourcePath, targetPath);
  console.log(`Applied ${selectedEnvironment.toUpperCase()} config: ${fileName}`);
});

const sourceWebPartManifest = path.join(envConfigDir, 'PhvbMagWebPart.manifest.json');
const webPartDir = path.join(rootDir, 'src', 'webparts', 'phvbMag');
const targetWebPartManifest = path.join(webPartDir, 'PhvbMagWebPart.manifest.json');

if (!fs.existsSync(sourceWebPartManifest)) {
  console.error(`Missing environment web part manifest: ${sourceWebPartManifest}`);
  process.exit(1);
}

fs.copyFileSync(sourceWebPartManifest, targetWebPartManifest);
console.log(`Applied ${selectedEnvironment.toUpperCase()} web part manifest`);

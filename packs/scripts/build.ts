import * as path from 'path';
import * as fs from 'fs';
import { CompendiumPack, PackError } from './packman/compendium-pack';

const packsDataPath = path.resolve(__dirname, '../data');
const packDirPaths = fs.readdirSync(packsDataPath).map((dirName) => path.resolve(__dirname, packsDataPath, dirName));

// Loads all packs into memory for the sake of making all entity name/id mappings available
const packs = packDirPaths.map((dirPath) => CompendiumPack.loadJSON(dirPath));
const entityCounts = packs.map((pack) => pack.save());
const total = entityCounts.reduce((runningTotal, entityCount) => runningTotal + entityCount, 0);

if (entityCounts.length > 0) {
    console.log(`Created ${entityCounts.length} packs with ${total} entities.`);
} else {
    throw PackError('No data available to build packs.');
}

var path = require('path');
var fs = require('fs-extra');
var Datastore = require('nedb');

const config = getFoundryConfig();
const foundryPacksPath = path.resolve(config.dataPath, 'Data/systems/pf2e/packs');

const tempDataPath = path.resolve(process.cwd(), 'packs/temp-data');
const dataPath = path.resolve(process.cwd(), 'packs/data');

if (!fs.existsSync(foundryPacksPath)) {
   throw "Error: Foundry directory not found! Check your foundryconfig.json.";
}
if (fs.existsSync(tempDataPath)) {
    console.log('Cleaning up old temp data...');
    fs.rmdirSync(tempDataPath, {recursive: true});
}
fs.mkdir(tempDataPath);

if (!fs.existsSync(dataPath)) {
    fs.mkdir(dataPath);
}

const args = process.argv.slice(2);

if (args.length > 0) {
    const arg = args[0].trim().replace("'", '');
    if (arg === 'all') {
        // Extract all Packs
        extractAllPacks().catch(err => console.error(err));
    } else if (arg.endsWith('.db')) {
        // Extract single pack
        const file = path.resolve(foundryPacksPath, arg);
        if (fs.existsSync(file)) {
            extractPack(file, arg).then(() => {
                console.log('Moving extracted files from temp directory to data directory...');
                try {
                    const outPath = path.resolve(dataPath, arg);
                    if (fs.existsSync(outPath)) {
                        // Remove the old ./packs/data/[packname].db/ directory recursively
                        fs.rmdirSync(outPath, { recursive: true });
                    }
                    // Create a new ./packs/data/[packname].db/ directory
                    fs.mkdirSync(outPath);
                    // Move files from ./packs/temp-data/[packname].db/ to ./packs/data/[packname].db/
                    const tempFiles = fs.readdirSync(path.resolve(tempDataPath, arg));
                    for (const file of tempFiles) {
                        fs.renameSync(path.resolve(tempDataPath, arg, file), path.resolve(outPath, file));
                    }
                    // Remove ./packs/temp-data/ directory recursively
                    fs.rmdirSync(tempDataPath, {recursive: true});
                } catch (e) {
                    console.error(e.message);
                }
                console.log('Extraction complete.');
            }).catch(err => console.error(err));
        } else {
            console.error(`File not found: '${file}'`);
        }
    } else {
        // Wrong args
        console.log(`The first argument must be a specific pack file name e.g. 'spells.db' or 'all'.`);
    }
} else {
    // No args
    console.log(`Please supply a specific pack file name e.g. 'spells.db', or 'all' to extract all packs.`);
}

async function extractAllPacks() {
    const foundryPacks = await fs.readdir(foundryPacksPath);
    const startTime = process.hrtime();
    let packCount = 0;
    let entitiyCount = 0;
    for (const pack of foundryPacks) {
        if (!pack.endsWith('.db')) continue;
        packCount += 1;
        const filePath = path.resolve(foundryPacksPath, pack);
        try {
            entitiyCount += await extractPack(filePath, pack)
        } catch (e) {
            throw e;
        }
    }
    const endTime = process.hrtime(startTime);
    console.log(`Extraction of ${entitiyCount} entities from ${packCount} packs succeeded in ${endTime[0]} seconds.`);
    console.log('Moving extracted files from temp directory to data directory...');
    try {
        // Remove old ./packs/data/ directory recursively
        await fs.rmdir(dataPath, { recursive: true });
        // Rename ./packs/data-temp/ to ./packs/data/
        fs.rename(tempDataPath, dataPath);
    } catch (e) {
        throw e.message;
    }
    console.log('Extraction complete.');
}

async function extractPack(filePath, packName) {
    console.log(`Extracting pack: ${packName}`)
    const outPath = path.resolve(tempDataPath, packName);

    if (!fs.existsSync(outPath)) {
        fs.mkdir(outPath);
    }

    const packEntities = await getAllData(filePath).then((result) => {
        return result;
    }, (err) => {
        throw(err);
    });

    let outData;
    let count = 0;
    for (const entity of packEntities) {
        count += 1;

        // Remove or replace unwanted values from the entitiy
        sanitizeEntity(entity);

        // Pretty print json data
        outData = JSON.stringify(entity, null, 4);
        // Add new line to end of data
        outData += '\n';

        let entityName = entity.name || entity._id;
        // Remove all non-alphanumeric characters from the name
        entityName = entityName
          .toLowerCase()
          .replace(/[^a-z0-9]/gi, ' ')
          .trim()
          .replace(/\s/gi, '-')
          .replace('--', '-');

        const outFileName = `${entityName}.json`;
        const outFile = path.resolve(outPath, outFileName);

        if (fs.existsSync(outFile)) {
            throw `Error: Duplicate name '${entity.name}' in pack: ${packName}`;
        }

        if (entitiyIdChanged(entity, packName, outFileName)) {
            throw `Error: The id '${entity._id}' of entity '${entity.name}' does not match the current id. Entities that are already in the system must keep their current id.`
        }

        try {
            // Write the json file
            fs.writeFile(outFile, outData);
        } catch (e) {
            throw `Writing file '${outFile}' failed with error: ${e.message}`;
        }
    }
    console.log(`Finished extracting ${count} entities from pack: ${packName}`);
    return count;
}

function entitiyIdChanged(newEntity, packName, fileName) {
    const oldFile = path.resolve(dataPath, packName, fileName);
    if (fs.existsSync(oldFile)) {
        const oldEntity = JSON.parse(fs.readFileSync(oldFile));
        return !(oldEntity._id === newEntity._id);
    } else {
        return false;
    }
}

function sanitizeEntity(entity) {
    // Remove individual permissions
    entity.permission = {
        default: 0
    };

    // Delete folder value
    delete entity.folder;

    // Delete sort value
    delete entity.sort;

    // Delete unneeded flags
    delete entity.flags._sheetTab;
    // TODO: Check if there can be anything important in flags.pf2e
    delete entity.flags.pf2e;

}

async function getAllData(filename) {
    const packDB = new Datastore({
        filename,
        corruptAlertThreshold: 10
    });

    packDB.loadDatabase((err) => {
        if (err) {
            throw err;
        }
    });

    const data = new Promise((resolve, reject) => {
        packDB.find({ }, function (err, docs) {
            if (err) {
                reject(err);
            } else {
                resolve(docs);
            }
        });
    });

    return data;
}

function getFoundryConfig() {
    const configPath = path.resolve(process.cwd(), 'foundryconfig.json');
    let config;

    if (fs.existsSync(configPath)) {
        config = fs.readJSONSync(configPath);
        return config;
    }
}

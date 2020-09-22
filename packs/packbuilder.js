var path = require('path');
var fs = require('fs-extra');
var Datastore = require('nedb');

const packsDataPath = path.resolve(process.cwd(), 'packs/data');
const staticPacksPath = path.resolve(process.cwd(), 'static/packs');

async function buildPacks() {
    const packs = fs.readdirSync(packsDataPath);
    let packsCount = 0;
    let entityCount = 0;
    for (const pack of packs) {
        console.log(`Collecting data for Pack '${pack}'`);

        let packFiles;
        try {
            // Create an array of files in the ./packs/data/[packname].db/ directory
            packFiles = fs.readdirSync(path.resolve(packsDataPath, pack));
        } catch (e) {
            console.error(e.message);
            return;
        }

        let count = 0;
        try {
            const entities = [];
            for (const fileName of packFiles) {
                const sourceFilePath = path.resolve(packsDataPath, pack, fileName);
                const content = fs.readFileSync(sourceFilePath);
                let entitiy;
                try {
                    // Parse file content
                    entitiy = JSON.parse(content);
                } catch (e) {
                    throw { message: `File ${filePath} could not be parsed. Error: ${e.message}` };
                }

                if (entitiy) {
                    // Insert  to the pack file
                    entities.push(entitiy);
                }
                count += 1;
            }

            if (entities.length > 0) {
                await writeDBFile(pack, entities).then(() => {
                    console.log(`Pack '${pack}' with ${entities.length} entries built successfully.`);
                }, (err) => {
                    throw err;
                });
            }
        } catch (e) {
            console.error(e.message);
            return;
        }
        packsCount += 1;
        entityCount += count;
    }

    if (packsCount > 0) {
        console.log(`Created ${packsCount} packs with ${entityCount} entities.`);
    } else {
        console.log('No data available to build packs.')
    }
}

async function writeDBFile(pack, entities) {
    const outFile = path.resolve(staticPacksPath, pack);
    if (fs.existsSync(outFile)) {
        try {
            // Delete old pack file
            fs.unlinkSync(outFile);
        } catch (e) {
            console.error(e.message);
            return;
        }
    }

    const dbFile = new Datastore({
        filename: outFile
    });
    dbFile.loadDatabase((err) => {
        if (err) {
            throw err
        }
    });

    const result = new Promise((resolve, reject) => {
        dbFile.insert(entities, (err) => {
            if (err) {
                reject(err);
            } else {
                dbFile.persistence.compactDatafile();
                resolve();
            }
        });
    });

    return result
}

buildPacks().catch((err) => console.error(err));

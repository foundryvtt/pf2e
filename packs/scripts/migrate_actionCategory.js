// this is a one-time script to quickly go through the .json files and update them for a particular migration.
// it is not used, but it might be useful as a reference to quickly update all of them

var path = require('path');
var fs = require('fs-extra');

const packsDataPath = path.resolve(process.cwd(), 'packs/data');

function JSONstringifyOrder(obj, space) {
    const allKeys = [];
    JSON.stringify(obj, (key, value) => {
        allKeys.push(key);
        return value;
    });
    allKeys.sort();
    return JSON.stringify(obj, allKeys, space);
}

function migrateAction(item) {
    if (item.flags.hasOwnProperty('pf2e_updatednpcsheet')) {
        const oldValue = item.flags.pf2e_updatednpcsheet.npcActionType.value;
        if (!item.data.actionCategory.value) {
            item.data.actionCategory.value = oldValue || 'offensive';
        }

        delete item.flags.pf2e_updatednpcsheet;
    }
}

function migrateNpc(npc) {
    for (const item of npc.items) {
        if (item.type === 'action') {
            migrateAction(item);
        }
    }
}

async function migrate() {
    const allEntries = [];

    const packs = fs.readdirSync(packsDataPath);
    for (const pack of packs) {
        console.log(`Collecting data for '${pack}'`);

        let packFiles;
        try {
            // Create an array of files in the ./packs/data/[packname].db/ directory
            packFiles = fs.readdirSync(path.resolve(packsDataPath, pack));
        } catch (e) {
            console.error(e.message);
            return;
        }

        for (const fileName of packFiles) {
            allEntries.push(path.resolve(packsDataPath, pack, fileName));
        }
    }

    for (const entry of allEntries) {
        // console.log(`Checking ${entry}`);
        let updated = false;
        const content = fs.readFileSync(entry);
        let entity;
        try {
            // Parse file content
            entity = JSON.parse(content);
        } catch (e) {
            throw { message: `File ${filePath} could not be parsed. Error: ${e.message}` };
        }

        if (entity.type === 'npc') {
            migrateNpc(entity);
            updated = true;
        } else if (entity.type === 'action') {
            migrateAction(entity);
            updated = true;
        }

        if (updated) {
            const outData = JSONstringifyOrder(entity, 4) + '\n';

            try {
                fs.writeFile(entry, outData);
            } catch (e) {
                throw { message: `File ${filePath} could not be parsed. Error: ${e.message}` };
            }
        }
    }
}

migrate().catch((err) => console.error(err));

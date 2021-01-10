const fs = require('fs');
const path = require('path');
const process = require('process');
const Datastore = require('nedb-promises');
const yargs = require('yargs');
const { JSDOM } = require('jsdom');

const { window } = new JSDOM('');
const $ = require('jquery')(window);

// show error message without needless traceback
const throwPackError = (message) => {
    console.error(`Error: ${message}`);
    process.exit(1);
};

// include commander in git clone of commander repo

const args = yargs(process.argv.slice(2))
    .command('$0 <packDb> [foundryConfig]', 'Extract one or all compendium packs to packs/data', () => {
        yargs
            .positional('packDb', {
                describe: 'A compendium pack filename (*.db) or otherwise "all"',
            })
            .positional('foundryConfig', {
                describe: "The path to your local Foundry server's config.json file",
                default: 'foundryconfig.json',
            })
            .example([
                ['npm run $0 spells.db /path/to/foundryvtt/Config/options.json'],
                ['npm run $0 spells.db C:\\Users\\me\\this\\way\\to\\options.json'],
                ['npm run $0 spells.db # copy of config at ./foundryconfig.json'],
                ['npm run $0 all       # same'],
            ]);
    })
    .check((argv) => {
        if (!(fs.existsSync(argv.foundryConfig) && fs.statSync(argv.foundryConfig).isFile())) {
            throw Error(`Error: No config file found at "${argv.foundryConfig}"`);
        }
        return true;
    })
    .help(false)
    .version(false)
    .parse();

const config = (() => {
    const content = fs.readFileSync(args.foundryConfig, { encoding: 'utf-8' });
    try {
        return JSON.parse(content);
    } catch (_error) {
        throwPackError(`${args.foundryConfig} is not well-formed JSON.`);
        return undefined; // make eslint happy until eslint-config-airbnb-base is tossed
    }
})();

const packsPath = path.resolve(config.dataPath, 'Data/systems/pf2e/packs');
const tempDataPath = path.resolve(process.cwd(), 'packs/temp-data');
const dataPath = path.resolve(process.cwd(), 'packs/data');

const idsToNames = new Map();

const linkPatterns = {
    world: /@(?:Item|JournalEntry|Actor)\[[^\]]+\]|@Compendium\[world\.[^\]]+\]/g,
    compendium: /@Compendium\[pf2e\.(?<packName>[^.]+)\.(?<entityName>[^\]]+)\]\{?/g,
    components: /@Compendium\[pf2e\.(?<packName>[^.]+)\.(?<entityName>[^\]]+)\]\{?/,
};

function entityIdChanged(newEntity, packDir, fileName) {
    const oldFile = path.resolve(dataPath, packDir, fileName);
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
        default: 0,
    };

    // Delete folder value
    delete entity.folder;

    // Delete sort value
    delete entity.sort;

    // Delete unneeded flags
    delete entity.flags._sheetTab;

    // Clean up description HTML
    if (typeof entity.data?.description?.value === 'string') {
        const $description = (() => {
            const description = entity.data.description.value;
            try {
                return $(description);
            } catch (_) {
                try {
                    return $(`<p>${description}</p>`);
                } catch (_error) {
                    console.warn(`Failed to parse description of ${entity.name}`);
                    return null;
                }
            }
        })();

        if ($description === null) {
            return entity;
        }

        // Be rid of span tags from AoN copypasta
        const selectors = ['span#ctl00_MainContent_DetailedOutput', 'span.fontstyle0'];
        for (const selector of selectors) {
            $description.find(selector).each((_i, span) => {
                $(span)
                    .contents()
                    .unwrap(selector)
                    .each((_j, node) => {
                        if (node.nodeName === '#text') {
                            node.textContent = node.textContent.trim();
                        }
                    });
            });
        }

        // Reject Foundry's attempt to change compendium links into HTML anchors
        const $anchors = $description.find('a.entity-link');
        $anchors.each((_i, anchor) => {
            const $anchor = $(anchor);
            const label = $anchor.text().trim();
            const packName = $anchor.attr('data-pack');
            const entityId = $anchor.attr('data-id');
            $anchor.text(`@Compendium[${packName}.${entityId}]{${label}}`);
            $anchor.contents().unwrap();
        });

        const cleanDescription = $('<div>')
            .append($description)
            .html()
            .replace(/<([hb]r)>/g, '<$1 />'); // Restore Foundry's self-closing tags

        entity.data.description.value = cleanDescription;
    }

    return entity;
}

const newEntityIdMap = {};

function convertLinks(entityData, packName) {
    newEntityIdMap[entityData._id] = entityData.name;

    const entityJson = JSON.stringify(sanitizeEntity(entityData));

    // Link checks

    const worldItemLinks = Array.from(entityJson.matchAll(linkPatterns.world));
    if (worldItemLinks.length > 0) {
        const linkString = worldItemLinks.map((match) => match[0]).join(', ');
        console.warn(`${entityData.name} (${packName}) has links to world items: ${linkString}`);
    }

    const compendiumLinks = Array.from(entityJson.matchAll(linkPatterns.compendium)).map((match) => match[0]);
    const linksLackingLabels = compendiumLinks.filter((link) => !link.endsWith('{'));

    if (linksLackingLabels.length > 0) {
        const linkString = linksLackingLabels.map((match) => match[0]).join(', ');
        throwPackError(`${entityData.name} (${packName}) has links with no labels: ${linkString}`);
    }

    // Convert links by ID to links by name

    const notFound = [];
    const convertedJson = compendiumLinks.reduce((partiallyConverted, linkById) => {
        const [match, packId, entityId] = linkById.match(linkPatterns.components);

        const packMap = idsToNames.get(packId);
        if (packMap === undefined) {
            throwPackError(`Pack ${packId} has no ID-to-name map.`);
        }

        const entityName = packMap.get(entityId);
        if (entityName === undefined) {
            const newName = newEntityIdMap[entityId];
            if (newName === undefined) {
                notFound.push(match.replace(/\{$/, ''));
            } else {
                partiallyConverted.replace(entityId, newName);
            }
        }

        const replacePattern = new RegExp(`(?<!"_id":")${entityId}`);
        return partiallyConverted.replace(replacePattern, entityName);
    }, entityJson);

    // In case some new items with links to other new items weren't found
    if (notFound.length > 0) {
        const idsNotFound = notFound.join(', ');
        console.debug(
            `Warning: Unable to find names for the following links in ${entityData.name} ` +
                `(${packName}): ${idsNotFound}`,
        );
    }

    return JSON.parse(convertedJson);
}

async function getAllData(filename) {
    const packDB = Datastore.create({ filename, corruptAlertThreshold: 10 });
    await packDB.load();

    return packDB.find({});
}

async function extractPack(filePath, packFilename) {
    console.log(`Extracting pack: ${packFilename}`);
    const outPath = path.resolve(tempDataPath, packFilename);

    const packEntities = await getAllData(filePath);
    const idPattern = /^[a-z0-9]{20,}$/g;

    const count = await packEntities.reduce(async (runningCount, entityData) => {
        // Remove or replace unwanted values from the entity
        const preparedEntity = convertLinks(entityData, packFilename);

        // Pretty print JSON data
        const outData = (() => {
            const allKeys = new Set();
            const idKeys = [];
            JSON.stringify(preparedEntity, (key, value) => {
                if (idPattern.test(key)) {
                    idKeys.push(key);
                } else {
                    allKeys.add(key);
                }

                return value;
            });
            const sortedKeys = Array.from(allKeys).sort().concat(idKeys);

            const newJson = JSON.stringify(preparedEntity, sortedKeys, 4);
            return `${newJson}\n`;
        })();

        // Remove all non-alphanumeric characters from the name
        const entityName = entityData.name
            .toLowerCase()
            .replace(/[^a-z0-9]/gi, ' ')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-{2,}/g, '-');

        const outFileName = `${entityName}.json`;
        const outFilePath = path.resolve(outPath, outFileName);

        if (fs.existsSync(outFilePath)) {
            throwPackError(`Error: Duplicate name "${entityData.name}" in pack: ${packFilename}`);
        }

        if (entityIdChanged(preparedEntity, packFilename, outFileName)) {
            throwPackError(
                `The ID "${entityData._id}" of entity "${entityData.name}" does not match ` +
                    'the current ID. Entities that are already in the system must keep their ' +
                    'current ID.',
            );
        }

        // Write the JSON file
        await fs.promises.writeFile(outFilePath, outData, 'utf-8');

        return (await runningCount) + 1;
    }, 0);

    return count;
}

function populateIdNameMap() {
    const systemPackData = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'system.json'), 'utf-8')).packs;
    const packDirs = fs.readdirSync(dataPath);

    for (const packDir of packDirs) {
        const systemPack = systemPackData.find((pack) => path.basename(pack.path) === packDir);
        if (systemPack === undefined) {
            throwPackError(`Compendium at ${packDir} has no name in the local system.json file.`);
        }

        const packMap = new Map();
        idsToNames.set(systemPack.name, packMap);

        const filenames = fs.readdirSync(path.resolve(dataPath, packDir));
        const filePaths = filenames.map((filename) => path.resolve(dataPath, packDir, filename));

        for (const filePath of filePaths) {
            const jsonString = fs.readFileSync(filePath, 'utf-8');
            const entityData = (() => {
                try {
                    return JSON.parse(jsonString);
                } catch (error) {
                    throwPackError(`File at ${filePath} could not be parsed: ${error.message}`);
                    return undefined;
                }
            })();
            packMap.set(entityData._id, entityData.name);
        }
    }
}

// Extract one or all packs
async function extractPacks() {
    if (!fs.existsSync(dataPath)) {
        await fs.promises.mkdir(dataPath);
    }
    if (!fs.existsSync(packsPath)) {
        throw Error('Foundry directory not found! Check your foundryconfig.json.');
    }

    console.log('Cleaning up old temp data...');
    await fs.promises.rmdir(tempDataPath, { recursive: true });
    await fs.promises.mkdir(tempDataPath);

    populateIdNameMap();

    const foundryPacks = (args.packDb === 'all' ? fs.readdirSync(packsPath) : [args.packDb])
        .filter((filename) => filename.endsWith('.db'))
        .map((filename) => path.resolve(packsPath, filename));

    return (
        await Promise.all(
            foundryPacks.map(async (filePath) => {
                const filename = path.basename(filePath);

                if (!filename.endsWith('.db')) {
                    throwPackError(`Pack file is not a DB file: '${filename}'`);
                }
                if (!fs.existsSync(filePath)) {
                    throwPackError(`File not found: '${filename}'`);
                }

                const outDirPath = path.resolve(dataPath, filename);
                const tempOutDirPath = path.resolve(tempDataPath, filename);

                await fs.promises.mkdir(tempOutDirPath);

                const entityCount = await extractPack(filePath, filename);

                if (fs.existsSync(outDirPath)) {
                    // Remove the old ./packs/data/[packname].db/ directory recursively
                    await fs.promises.rmdir(outDirPath, { recursive: true });
                }
                // Create a new ./packs/data/[packname].db/ directory
                await fs.promises.mkdir(outDirPath);

                // Move files from ./packs/temp-data/[packname].db/ to ./packs/data/[packname].db/
                const tempFiles = await fs.promises.readdir(path.resolve(tempDataPath, filename));

                for await (const tempFile of tempFiles) {
                    fs.promises.rename(path.resolve(tempOutDirPath, tempFile), path.resolve(outDirPath, tempFile));
                }

                // Remove ./packs/temp-data/ directory recursively

                console.log(`Finished extracting ${entityCount} entities from pack ${filename}`);
                return entityCount;
            }),
        )
    ).reduce((runningTotal, entityCount) => runningTotal + entityCount, 0);
}

extractPacks()
    .then((grandTotal) => {
        console.log(`Extraction complete (${grandTotal} total entities).`);
        fs.rmdirSync(tempDataPath, { recursive: true });
    })
    .catch((error) => {
        console.error(throwPackError(error));
    });

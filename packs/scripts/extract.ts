import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import Datastore from 'nedb-promises';
import yargs from 'yargs';
import { JSDOM } from 'jsdom';
import { ActorDataPF2e } from '@actor/actor-data-definitions';
import { ItemData } from '@item/data-definitions';

const { window } = new JSDOM('');
const $ = require('jquery')(window);

// show error message without needless traceback
const PackError = (message: string) => {
    console.error(`Error: ${message}`);
    process.exit(1);
};

interface ExtractArgs {
    foundryConfig?: string;
    packDb: string;
}
const args = (yargs(process.argv.slice(2)) as yargs.Argv<ExtractArgs>)
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
        if (
            typeof argv.foundryConfig === 'string' &&
            !(fs.existsSync(argv.foundryConfig) && fs.statSync(argv.foundryConfig).isFile())
        ) {
            argv.foundryConfig = undefined;
        }
        return true;
    })
    .help(false)
    .version(false)
    .parse();

const packsPath = (() => {
    try {
        const content = fs.readFileSync(args.foundryConfig ?? '', { encoding: 'utf-8' });
        return path.join(JSON.parse(content).dataPath, 'Data/systems/pf2e/packs');
    } catch (_error) {
        return path.join(process.cwd(), 'dist/packs');
    }
})();

const tempDataPath = path.resolve(process.cwd(), 'packs/temp-data');
const dataPath = path.resolve(process.cwd(), 'packs/data');
const packsMetadata = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'system.json'), 'utf-8'))
    .packs as CompendiumMetadata[];

const idsToNames: Map<string, Map<string, string>> = new Map();

const linkPatterns = {
    world: /@(?:Item|JournalEntry|Actor)\[[^\]]+\]|@Compendium\[world\.[^\]]+\]/g,
    compendium: /@Compendium\[pf2e\.(?<packName>[^.]+)\.(?<entityName>[^\]]+)\]\{?/g,
    components: /@Compendium\[pf2e\.(?<packName>[^.]+)\.(?<entityName>[^\]]+)\]\{?/,
};

type CompendiumEntityPF2e =
    | (Actor & { data: ActorDataPF2e })
    | (Item & { data: ItemData })
    | JournalEntry
    | Macro
    | RollTable;
type PackEntry = CompendiumEntityPF2e['data'];

function assertEntityIdSame(newEntity: PackEntry, jsonPath: string): void {
    if (fs.existsSync(jsonPath)) {
        const oldEntity = JSON.parse(fs.readFileSync(jsonPath, { encoding: 'utf-8' })) as PackEntry;
        if (oldEntity._id !== newEntity._id) {
            throw PackError(
                `The ID of entity "${newEntity.name}" (${newEntity._id}) does not match the current ID ` +
                    `(${oldEntity._id}). Entities that are already in the system must keep their current ID.`,
            );
        }
    }
}

/** Walk object tree and make appropriate deletions */
function pruneTree(entityData: PackEntry, topLevel: PackEntry): void {
    const physicalItemTypes = ['armor', 'weapon', 'equipment', 'consumable', 'melee', 'backpack', 'kit', 'treasure'];
    type EntityKey = keyof PackEntry;
    for (const key in entityData) {
        if (key === '_id') {
            topLevel = entityData;
        } else if (['_modifiers', '_sheetTab'].includes(key)) {
            delete entityData[key as EntityKey];
        } else if (key === 'containerId' && 'type' in topLevel && !physicalItemTypes.includes(topLevel.type)) {
            delete entityData[key as EntityKey];
        } else if (entityData[key as EntityKey] instanceof Object) {
            pruneTree(entityData[key as EntityKey] as PackEntry, topLevel);
        }
    }
}

function sluggify(entityName: string) {
    return entityName
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, ' ')
        .trim()
        .replace(/\s+|-{2,}/g, '-');
}

function sanitizeEntity(entityData: PackEntry) {
    // Remove individual permissions
    entityData.permission = { default: entityData.permission.default ?? 0 };

    delete (entityData as Partial<typeof entityData>).sort;
    delete entityData.flags.core;
    delete entityData.flags.pf2e;
    delete entityData.flags.pf2e_updatednpcsheet;
    if ('type' in entityData && entityData.type === 'condition') {
        entityData.flags = { pf2e: { condition: true } };
    }

    if ('data' in entityData && 'slug' in entityData.data) {
        const slug = entityData.data.slug;
        if (typeof slug === 'string') {
            if (slug !== sluggify(entityData.name)) {
                console.warn(
                    `Warning: Name change detected on ${entityData.name}. ` +
                        'Please remember to create a slug migration before next release.',
                );
            }
        }

        delete entityData.data.slug;
    }

    pruneTree(entityData, entityData);

    // Clean up description HTML
    const description: { value: string | null } =
        'data' in entityData && 'description' in entityData.data ? entityData.data.description : null;
    if (description) {
        const $description = ((): JQuery | null => {
            try {
                return $(description.value);
            } catch (_) {
                try {
                    return $(`<p>${description.value}</p>`);
                } catch (_error) {
                    console.warn(`Failed to parse description of ${entityData.name}`);
                    return null;
                }
            }
        })();

        if ($description === null) {
            return entityData;
        }

        // Be rid of span tags from AoN copypasta
        const selectors = ['span#ctl00_MainContent_DetailedOutput', 'span.fontstyle0'];
        for (const selector of selectors) {
            $description.find(selector).each((_i, span) => {
                ($(span) as JQuery)
                    .contents()
                    .unwrap(selector)
                    .each((_j, node) => {
                        if (node.nodeName === '#text') {
                            node.textContent = node.textContent!.trim();
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

        description.value = cleanDescription;
    }

    return entityData;
}

const newEntityIdMap: Record<string, string> = {};

function convertLinks(entityData: PackEntry, packName: string): PackEntry {
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
        throw PackError(`${entityData.name} (${packName}) has links with no labels: ${linkString}`);
    }

    // Convert links by ID to links by name

    const notFound: string[] = [];
    const convertedJson = compendiumLinks.reduce((partiallyConverted, linkById) => {
        const match = linkPatterns.components.exec(linkById);
        if (!Array.isArray(match)) {
            throw PackError('Unexpected error looking for compendium link');
        }
        const [packId, entityId] = match.slice(1, 3);
        const packMap = idsToNames.get(packId);
        if (packMap === undefined) {
            throw PackError(`Pack ${packId} has no ID-to-name map.`);
        }

        const entityName = packMap.get(entityId) ?? newEntityIdMap[entityId];
        if (entityName === undefined) {
            notFound.push(match[0].replace(/\{$/, ''));
            return partiallyConverted;
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

    return JSON.parse(convertedJson) as PackEntry;
}

async function getAllData(filename: string): Promise<PackEntry[]> {
    const packDB = Datastore.create({ filename, corruptAlertThreshold: 10 });
    await packDB.load();

    return packDB.find({}) as Promise<PackEntry[]>;
}

async function extractPack(filePath: string, packFilename: string) {
    console.log(`Extracting pack: ${packFilename}`);
    const outPath = path.resolve(tempDataPath, packFilename);

    const packEntities = await getAllData(filePath);
    const idPattern = /^[a-z0-9]{20,}$/g;

    for await (const entityData of packEntities) {
        // Remove or replace unwanted values from the entity
        const preparedEntity = convertLinks(entityData, packFilename);

        // Pretty print JSON data
        const outData = (() => {
            const allKeys: Set<string> = new Set();
            const idKeys: string[] = [];
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
        const slug = sluggify(entityData.name);

        const outFileName = `${slug}.json`;
        const outFilePath = path.resolve(outPath, outFileName);

        if (fs.existsSync(outFilePath)) {
            throw PackError(`Error: Duplicate name "${entityData.name}" in pack: ${packFilename}`);
        }

        assertEntityIdSame(preparedEntity, outFilePath);

        // Write the JSON file
        await fs.promises.writeFile(outFilePath, outData, 'utf-8');
    }

    return packEntities.length;
}

function populateIdNameMap() {
    const packDirs = fs.readdirSync(dataPath);

    for (const packDir of packDirs) {
        const metadata = packsMetadata.find((pack) => path.basename(pack.path) === packDir);
        if (metadata === undefined) {
            throw PackError(`Compendium at ${packDir} has metadata in the local system.json file.`);
        }

        const packMap: Map<string, string> = new Map();
        idsToNames.set(metadata.name, packMap);

        const filenames = fs.readdirSync(path.resolve(dataPath, packDir));
        const filePaths = filenames.map((filename) => path.resolve(dataPath, packDir, filename));

        for (const filePath of filePaths) {
            const jsonString = fs.readFileSync(filePath, 'utf-8');
            const entityData = (() => {
                try {
                    return JSON.parse(jsonString);
                } catch (error) {
                    throw PackError(`File at ${filePath} could not be parsed: ${error.message}`);
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
        .filter((filename) => filename !== 'Spells (SRD) - LICENSE')
        .map((filename) => path.resolve(packsPath, filename));

    return (
        await Promise.all(
            foundryPacks.map(async (filePath) => {
                const dbFilename = path.basename(filePath);

                if (!dbFilename.endsWith('.db')) {
                    throw PackError(`Pack file is not a DB file: '${dbFilename}'`);
                }
                if (!fs.existsSync(filePath)) {
                    throw PackError(`File not found: '${dbFilename}'`);
                }

                const outDirPath = path.resolve(dataPath, dbFilename);
                const tempOutDirPath = path.resolve(tempDataPath, dbFilename);

                await fs.promises.mkdir(tempOutDirPath);

                const entityCount = await extractPack(filePath, dbFilename);

                // Move ./packs/temp-data/[packname].db/ to ./packs/data/[packname].db/
                fs.rmdirSync(outDirPath, { recursive: true });
                await fs.promises.rename(tempOutDirPath, outDirPath);

                console.log(`Finished extracting ${entityCount} entities from pack ${dbFilename}`);
                return entityCount;
            }),
        )
    ).reduce((runningTotal, entityCount) => runningTotal + entityCount, 0);
}

extractPacks()
    .then((grandTotal) => {
        fs.rmdirSync(tempDataPath, { recursive: true });
        console.log(`Extraction complete (${grandTotal} total entities).`);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

import * as fs from 'fs-extra';
import * as path from 'path';
import { populateFoundryUtilFunctions } from '../../tests/fixtures/foundryshim';
import { MigrationRunnerBase } from '../../src/module/migration-runner-base';
import { Migration595AddItemSize } from '../../src/module/migrations/595-item-sizes';
import { ItemData } from '@item/dataDefinitions';
import { PF2EActor } from '@actor/actor';
import { PF2EItem } from '@item/item';
import { ActorDataPF2e } from '@actor/actorDataDefinitions';

const migrations = [new Migration595AddItemSize()];

const packsDataPath = path.resolve(process.cwd(), 'packs/data');

type CompendiumEntityPF2e = PF2EActor | PF2EItem | Exclude<CompendiumEntity, Actor | Item>;
const actorTypes = ['character', 'npc', 'hazard', 'loot', 'familiar', 'vehicle'];
const itemTypes = [
    'backpack',
    'treasure',
    'weapon',
    'armor',
    'kit',
    'melee',
    'consumable',
    'equipment',
    'ancestry',
    'background',
    'class',
    'feat',
    'lore',
    'martial',
    'action',
    'spell',
    'spellcastingEntry',
    'status',
    'condition',
    'effect',
];

const isActorData = (entityData: { type: string }): entityData is ActorDataPF2e => {
    return actorTypes.includes(entityData.type);
};
const isItemData = (entityData: { type: string }): entityData is ItemData => {
    return itemTypes.includes(entityData.type);
};

function JSONstringifyOrder(obj: object, space: number): string {
    const allKeys: string[] = [];
    JSON.stringify(obj, (key, value) => {
        allKeys.push(key);
        return value;
    });
    allKeys.sort();
    return JSON.stringify(obj, allKeys, space);
}

async function getAllFiles(): Promise<string[]> {
    let allEntries = [];
    const packs = fs.readdirSync(packsDataPath);
    for (const pack of packs) {
        console.log(`Collecting data for '${pack}'`);

        let packFiles: string[];
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

    return allEntries;
}

async function migrate() {
    const allEntries = await getAllFiles();

    const migrationRunner = new MigrationRunnerBase(migrations);

    for (const filePath of allEntries) {
        const content = await fs.readFile(filePath, { encoding: 'utf-8' });

        let entity: CompendiumEntityPF2e['data'];
        try {
            // Parse file content
            entity = JSON.parse(content);
        } catch (e) {
            throw { message: `File ${filePath} could not be parsed. Error: ${e.message}` };
        }

        // skip journal entries, rollable tables, and macros
        if (!('type' in entity) || ['chat', 'script'].includes(entity.type)) continue;

        let updatedEntity: ActorData | ItemData;
        if (isActorData(entity)) {
            updatedEntity = await migrationRunner.getUpdatedActor(entity, migrationRunner.migrations);
        } else if (isItemData(entity)) {
            updatedEntity = await migrationRunner.getUpdatedItem(entity, migrationRunner.migrations);
        } else {
            console.log(`unknown item type ${entity.type} in ${entity.name}`);
            continue;
        }

        const origData = JSONstringifyOrder(entity, 4) + '\n';
        const outData = JSONstringifyOrder(updatedEntity, 4) + '\n';

        if (outData !== origData) {
            console.log(`${filePath} is different. writing`);
            try {
                await fs.writeFile(filePath, outData);
            } catch (e) {
                throw { message: `File ${filePath} could not be parsed. Error: ${e.message}` };
            }
        }
    }
}

populateFoundryUtilFunctions();

migrate().catch((err) => console.error(err));

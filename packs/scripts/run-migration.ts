import * as fs from 'fs-extra';
import * as path from 'path';
import { populateFoundryUtilFunctions } from '../../tests/fixtures/foundryshim';
import { MigrationRunnerBase } from '@module/migration-runner-base';
import { ItemDataPF2e } from '@item/data-definitions';
import { ActorPF2e } from '@actor/base';
import { ItemPF2e } from '@item/base';
import { ActorDataPF2e } from '@actor/data-definitions';
import { MigrationBase } from '@module/migrations/base';
import { Migration615RemoveInstinctTrait } from '@module/migrations/615-remove-instinct-trait';
import { Migration616MigrateFeatPrerequisites } from '@module/migrations/616-migrate-feat-prerequisites';
import { Migration619TraditionLowercaseAndRemoveWandScroll } from '@module/migrations/619-remove-wand-and-scroll-tradition';
import { Migration620RenameToWebp } from '@module/migrations/620-rename-to-webp';
import { Migration621RemoveConfigSpellSchools } from '@module/migrations/621-remove-config-spellSchools';
import { Migration623NumifyPotencyRunes } from '@module/migrations/623-numify-potency-runes';
import { Migration625EnsurePresenceOfSaves } from '@module/migrations/625-ensure-presence-of-saves';
import { Migration626UpdateSpellCategory } from '@module/migrations/626-update-spell-category';
import { Migration627LowerCaseSpellSaves } from '@module/migrations/627-lowercase-spell-saves';

const migrations: MigrationBase[] = [
    new Migration615RemoveInstinctTrait(),
    new Migration616MigrateFeatPrerequisites(),
    new Migration619TraditionLowercaseAndRemoveWandScroll(),
    new Migration620RenameToWebp(),
    new Migration621RemoveConfigSpellSchools(),
    new Migration623NumifyPotencyRunes(),
    new Migration625EnsurePresenceOfSaves(),
    new Migration626UpdateSpellCategory(),
    new Migration627LowerCaseSpellSaves(),
];

const packsDataPath = path.resolve(process.cwd(), 'packs/data');

type CompendiumEntityPF2e = ActorPF2e | ItemPF2e | Exclude<CompendiumEntity, Actor | Item>;
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

const isActorData = (entityData: CompendiumEntity['data']): entityData is ActorDataPF2e => {
    return 'type' in entityData && actorTypes.includes(entityData.type);
};
const isItemData = (entityData: CompendiumEntity['data']): entityData is ItemDataPF2e => {
    return 'type' in entityData && itemTypes.includes(entityData.type);
};
const isMacroData = (entityData: CompendiumEntity['data']): entityData is MacroData => {
    return 'type' in entityData && ['chat', 'script'].includes(entityData.type);
};
const isTableData = (entityData: CompendiumEntity['data']): entityData is RollTableData => {
    return 'results' in entityData && Array.isArray(entityData.results);
};

function JSONstringifyOrder(obj: object): string {
    const allKeys: Set<string> = new Set();
    const idKeys: string[] = [];
    JSON.stringify(obj, (key, value) => {
        if (/^[a-z0-9]{20,}$/g.test(key)) {
            idKeys.push(key);
        } else {
            allKeys.add(key);
        }

        return value;
    });
    const sortedKeys = Array.from(allKeys).sort().concat(idKeys);

    const newJson = JSON.stringify(obj, sortedKeys, 4);
    return `${newJson}\n`;
}

async function getAllFiles(): Promise<string[]> {
    const allEntries = [];
    const packs = fs.readdirSync(packsDataPath);
    for (const pack of packs) {
        console.log(`Collecting data for '${pack}'`);

        let packFiles: string[];
        try {
            // Create an array of files in the ./packs/data/[packname].db/ directory
            packFiles = fs.readdirSync(path.resolve(packsDataPath, pack));
        } catch (e) {
            console.error(e.message);
            return [];
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
        let updatedEntity: ActorData | ItemDataPF2e | MacroData | RollTableData;
        if (isActorData(entity)) {
            updatedEntity = await migrationRunner.getUpdatedActor(entity, migrationRunner.migrations);
        } else if (isItemData(entity)) {
            updatedEntity = await migrationRunner.getUpdatedItem(entity, migrationRunner.migrations);
        } else if (isMacroData(entity)) {
            updatedEntity = await migrationRunner.getUpdatedMacro(entity, migrationRunner.migrations);
        } else if (isTableData(entity)) {
            updatedEntity = await migrationRunner.getUpdatedTable(entity, migrationRunner.migrations);
        } else {
            continue;
        }

        const origData = JSONstringifyOrder(entity);
        const outData = JSONstringifyOrder(updatedEntity);

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

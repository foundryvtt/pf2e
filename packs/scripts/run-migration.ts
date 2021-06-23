import { ActorSourcePF2e } from '@actor/data';
import { ItemSourcePF2e } from '@item/data';
import { MigrationRunnerBase } from '@module/migration/runner/base';
import { Migration621RemoveConfigSpellSchools } from '@module/migration/migrations/621-remove-config-spellSchools';
import { Migration623NumifyPotencyRunes } from '@module/migration/migrations/623-numify-potency-runes';
import { Migration625EnsurePresenceOfSaves } from '@module/migration/migrations/625-ensure-presence-of-saves';
import { Migration626UpdateSpellCategory } from '@module/migration/migrations/626-update-spell-category';
import { Migration627LowerCaseSpellSaves } from '@module/migration/migrations/627-lowercase-spell-saves';
import { Migration628UpdateIdentificationData } from '@module/migration/migrations/628-update-identification-data';
import { Migration629SetBaseItems } from '@module/migration/migrations/629-set-base-items';
import { Migration630FixTalismanSpelling } from '@module/migration/migrations/630-fix-talisman-spelling';
import { Migration631FixSenseRuleElementSelector } from '@module/migration/migrations/631-fix-sense-rule-element-selector';
import { Migration632DeleteOrphanedSpells } from '@module/migration/migrations/632-delete-orphaned-spells';
import { Migration633DeleteUnidentifiedTraits } from '@module/migration/migrations/633-delete-unidentified-traits';
import { Migration634PurgeMartialItems } from '@module/migration/migrations/634-purge-martial-items';
import { Migration635NumifyACAndQuantity } from '@module/migration/migrations/635-numify-ac-and-quantity';
import { Migration636NumifyArmorData } from '@module/migration/migrations/636-numify-armor-data';
import { Migration637CleanMeleeItems } from '@module/migration/migrations/637-clean-melee-items';
import { Migration638SpellComponents } from '@module/migration/migrations/638-spell-components';
import { Migration639NormalizeLevelAndPrice } from '@module/migration/migrations/639-normalize-level-and-price';

import { MigrationBase } from '@module/migration/base';
import * as fs from 'fs-extra';
import * as path from 'path';
import { populateFoundryUtilFunctions } from '../../tests/fixtures/foundryshim';

const migrations: MigrationBase[] = [
    new Migration621RemoveConfigSpellSchools(),
    new Migration623NumifyPotencyRunes(),
    new Migration625EnsurePresenceOfSaves(),
    new Migration626UpdateSpellCategory(),
    new Migration627LowerCaseSpellSaves(),
    new Migration628UpdateIdentificationData(),
    new Migration629SetBaseItems(),
    new Migration630FixTalismanSpelling(),
    new Migration631FixSenseRuleElementSelector(),
    new Migration632DeleteOrphanedSpells(),
    new Migration633DeleteUnidentifiedTraits(),
    new Migration634PurgeMartialItems(),
    new Migration635NumifyACAndQuantity(),
    new Migration636NumifyArmorData(),
    new Migration637CleanMeleeItems(),
    new Migration638SpellComponents(),
    new Migration639NormalizeLevelAndPrice(),
];

global.deepClone = function (original: any): any {
    // Simple types
    if (typeof original !== 'object' || original === null) return original;

    // Arrays
    if (Array.isArray(original)) return original.map(deepClone);

    // Dates
    if (original instanceof Date) return new Date(original);

    // Unsupported advanced objects
    if ('constructor' in original && original['constructor'] !== Object) return original;

    // Other objects
    const clone: Record<string, unknown> = {};
    for (const k of Object.keys(original)) {
        clone[k] = deepClone(original[k]);
    }
    return clone;
};

const packsDataPath = path.resolve(process.cwd(), 'packs/data');

type CompendiumSource = CompendiumDocument['data']['_source'];

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

const isActorData = (docSource: CompendiumSource): docSource is ActorSourcePF2e => {
    return 'type' in docSource && actorTypes.includes(docSource.type);
};
const isItemData = (docSource: CompendiumSource): docSource is ItemSourcePF2e => {
    return 'type' in docSource && itemTypes.includes(docSource.type);
};
const isMacroData = (docSource: CompendiumSource): docSource is foundry.data.MacroSource => {
    return 'type' in docSource && ['chat', 'script'].includes(docSource.type);
};
const isTableData = (docSource: CompendiumSource): docSource is foundry.data.RollTableSource => {
    return 'results' in docSource && Array.isArray(docSource.results);
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
    const allEntries: string[] = [];
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

        let source: CompendiumSource;
        try {
            // Parse file content
            source = JSON.parse(content);
        } catch (e) {
            throw { message: `File ${filePath} could not be parsed. Error: ${e.message}` };
        }

        // skip journal entries, rollable tables, and macros
        let updatedEntity:
            | foundry.data.ActorSource
            | ItemSourcePF2e
            | foundry.data.MacroSource
            | foundry.data.RollTableSource;
        if (isActorData(source)) {
            updatedEntity = await migrationRunner.getUpdatedActor(source, migrationRunner.migrations);
        } else if (isItemData(source)) {
            updatedEntity = await migrationRunner.getUpdatedItem(source, migrationRunner.migrations);
        } else if (isMacroData(source)) {
            updatedEntity = await migrationRunner.getUpdatedMacro(source, migrationRunner.migrations);
        } else if (isTableData(source)) {
            updatedEntity = await migrationRunner.getUpdatedTable(source, migrationRunner.migrations);
        } else {
            continue;
        }

        const origData = JSONstringifyOrder(source);
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

import fs from "fs-extra";
import path from "path";
import { populateFoundryUtilFunctions } from "../tests/fixtures/foundryshim.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { JSDOM } from "jsdom";
import { sluggify } from "@util";
import { MigrationBase } from "@module/migration/base.ts";
import { MigrationRunnerBase } from "@module/migration/runner/base.ts";
import { Migration821InlineDamageRolls } from "@module/migration/migrations/821-inline-damage-rolls.ts";
import { Migration822BladeAllyConsolidation } from "@module/migration/migrations/822-blade-ally-consolidation.ts";
import { Migration824SneakAttackDamageSource } from "@module/migration/migrations/824-sneak-attack-damage-source.ts";
import { Migration825KhakkharaFengHuoLun } from "@module/migration/migrations/825-khakkhara-feng-huo-lun.ts";
import { Migration826GutConditionData } from "@module/migration/migrations/826-gut-condition-data.ts";
import { Migration827FixTVShieldTraits } from "@module/migration/migrations/827-fix-tv-shield-traits.ts";
import { Migration828PruneInvalidTraits } from "@module/migration/migrations/828-prune-invalid-traits.ts";
import { Migration829RMRitualEntries } from "@module/migration/migrations/829-rm-ritual-entries.ts";
import { Migration830BarbarianRework } from "@module/migration/migrations/830-condense-instincts.ts";
import { Migration831ClericDoctrines } from "@module/migration/migrations/831-cleric-doctrines.ts";
import { Migration832ChoiceSetFlags } from "@module/migration/migrations/832-choice-set-flags.ts";
import { Migration833AddRogueToysFixPrecision } from "@module/migration/migrations/833-add-rogue-toys-fix-precision.ts";
import { Migration834FeatCategories } from "@module/migration/migrations/834-feat-categories.ts";
import { Migration835InitiativeLongform } from "@module/migration/migrations/835-initiative-longform.ts";
import { Migration836EnergizingConsolidation } from "@module/migration/migrations/836-energizing-consolidation.ts";
import { Migration837MoveHazardBookSources } from "@module/migration/migrations/837-move-hazard-book-source.ts";
import { Migration838StrikeAttackRollSelector } from "@module/migration/migrations/838-strike-attack-roll-selector.ts";
import { Migration839ActionCategories } from "@module/migration/migrations/839-action-categories.ts";
import { Migration841V11UUIDFormat } from "@module/migration/migrations/841-v11-uuid-format.ts";
import { Migration844DeityDomainUUIDs } from "@module/migration/migrations/844-deity-domains-uuids.ts";
import { Migration846SpellSchoolOptional } from "@module/migration/migrations/846-spell-school-optional.ts";
import { Migration847TempHPRuleEvents } from "@module/migration/migrations/847-temp-hp-rule-events.ts";

// ^^^ don't let your IDE use the index in these imports. you need to specify the full path ^^^

const { window } = new JSDOM();
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLParagraphElement = window.HTMLParagraphElement;
globalThis.Text = window.Text;

const migrations: MigrationBase[] = [
    new Migration821InlineDamageRolls(),
    new Migration822BladeAllyConsolidation(),
    new Migration824SneakAttackDamageSource(),
    new Migration825KhakkharaFengHuoLun(),
    new Migration826GutConditionData(),
    new Migration827FixTVShieldTraits(),
    new Migration828PruneInvalidTraits(),
    new Migration829RMRitualEntries(),
    new Migration830BarbarianRework(),
    new Migration831ClericDoctrines(),
    new Migration832ChoiceSetFlags(),
    new Migration833AddRogueToysFixPrecision(),
    new Migration834FeatCategories(),
    new Migration835InitiativeLongform(),
    new Migration836EnergizingConsolidation(),
    new Migration837MoveHazardBookSources(),
    new Migration838StrikeAttackRollSelector(),
    new Migration839ActionCategories(),
    new Migration841V11UUIDFormat(),
    new Migration844DeityDomainUUIDs(),
    new Migration846SpellSchoolOptional(),
    new Migration847TempHPRuleEvents(),
];

global.deepClone = <T>(original: T): T => {
    // Simple types
    if (typeof original !== "object" || original === null) return original;

    // Arrays
    if (Array.isArray(original)) return original.map(deepClone) as unknown as T;

    // Dates
    if (original instanceof Date) return new Date(original) as T & Date;

    // Unsupported advanced objects
    if ("constructor" in original && (original as { constructor?: unknown })["constructor"] !== Object) return original;

    // Other objects
    const clone: Record<string, unknown> = {};
    for (const k of Object.keys(original)) {
        clone[k] = deepClone((original as Record<string, unknown>)[k]);
    }
    return clone as T;
};

global.randomID = function randomID(length = 16): string {
    const rnd = () => Math.random().toString(36).substring(2);
    let id = "";
    while (id.length < length) id += rnd();
    return id.substring(0, length);
};

const packsDataPath = path.resolve(process.cwd(), "packs");

type CompendiumSource = CompendiumDocument["_source"];

const actorTypes = ["character", "npc", "hazard", "loot", "familiar", "vehicle"];
const itemTypes = [
    "action",
    "ancestry",
    "armor",
    "background",
    "backpack",
    "class",
    "condition",
    "consumable",
    "deity",
    "effect",
    "equipment",
    "feat",
    "formula",
    "heritage",
    "kit",
    "lore",
    "martial",
    "melee",
    "spell",
    "spellcastingEntry",
    "status",
    "treasure",
    "weapon",
];

const isActorData = (docSource: CompendiumSource): docSource is ActorSourcePF2e => {
    return "type" in docSource && actorTypes.includes(docSource.type);
};

const isItemData = (docSource: CompendiumSource): docSource is ItemSourcePF2e => {
    return "type" in docSource && itemTypes.includes(docSource.type);
};

const isJournalEntryData = (docSource: CompendiumSource): docSource is foundry.documents.JournalEntrySource => {
    return "pages" in docSource && Array.isArray(docSource.pages);
};

const isMacroData = (docSource: CompendiumSource): docSource is foundry.documents.MacroSource => {
    return "type" in docSource && ["chat", "script"].includes(docSource.type);
};

const isTableData = (docSource: CompendiumSource): docSource is foundry.documents.RollTableSource => {
    return "results" in docSource && Array.isArray(docSource.results);
};

function JSONstringifyOrder(obj: object): string {
    const allKeys: Set<string> = new Set();
    const idKeys: string[] = [];
    JSON.stringify(obj, (key, value) => {
        if (key.startsWith("-=") || key.includes(".-=")) return;

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
        console.log(`Collecting data for "${pack}"`);

        let packFiles: string[];
        try {
            // Create an array of files in the ./packs/[packname].db/ directory
            packFiles = fs.readdirSync(path.resolve(packsDataPath, pack));
        } catch (error) {
            if (error instanceof Error) console.error(error.message);
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
        const content = await fs.readFile(filePath, { encoding: "utf-8" });

        let source:
            | ActorSourcePF2e
            | ItemSourcePF2e
            | foundry.documents.JournalEntrySource
            | foundry.documents.MacroSource
            | foundry.documents.RollTableSource;
        try {
            // Parse file content
            source = JSON.parse(content);
        } catch (error) {
            if (error instanceof Error) {
                throw Error(`File ${filePath} could not be parsed. Error: ${error.message}`);
            }
            return;
        }

        const updated = await (async (): Promise<
            | ActorSourcePF2e
            | ItemSourcePF2e
            | foundry.documents.JournalEntrySource
            | foundry.documents.MacroSource
            | foundry.documents.RollTableSource
        > => {
            source.flags ??= {};
            try {
                if (isActorData(source)) {
                    for (const embedded of source.items) {
                        embedded.flags ??= {};
                    }

                    const updatedActor = await migrationRunner.getUpdatedActor(source, migrationRunner.migrations);
                    delete (updatedActor.system as { schema?: unknown }).schema;
                    pruneFlags(source);
                    pruneFlags(updatedActor);
                    for (const item of source.items) {
                        pruneFlags(item);
                    }

                    for (const updatedItem of updatedActor.items) {
                        delete (updatedItem.system as { schema?: unknown }).schema;
                        if (updatedItem.type === "consumable" && !updatedItem.system.spell) {
                            delete (updatedItem.system as { spell?: unknown }).spell;
                        }
                        pruneFlags(updatedItem);
                    }

                    return updatedActor;
                } else if (isItemData(source)) {
                    source.system.slug = sluggify(source.name);
                    const updatedItem = await migrationRunner.getUpdatedItem(source, migrationRunner.migrations);
                    delete (source.system as { slug?: unknown }).slug;
                    delete (updatedItem.system as { schema?: unknown }).schema;
                    delete (updatedItem.system as { slug?: unknown }).slug;
                    if (updatedItem.type === "consumable" && !updatedItem.system.spell) {
                        delete (updatedItem.system as { spell?: unknown }).spell;
                    }
                    pruneFlags(source);
                    pruneFlags(updatedItem);

                    return updatedItem;
                } else if (isJournalEntryData(source)) {
                    const updated = await migrationRunner.getUpdatedJournalEntry(source, migrationRunner.migrations);
                    pruneFlags(source);
                    pruneFlags(updated);
                    return updated;
                } else if (isMacroData(source)) {
                    const updated = await migrationRunner.getUpdatedMacro(source, migrationRunner.migrations);
                    pruneFlags(source);
                    pruneFlags(updated);
                    return updated;
                } else if (isTableData(source)) {
                    const updated = await migrationRunner.getUpdatedTable(source, migrationRunner.migrations);
                    pruneFlags(source);
                    pruneFlags(updated);
                    return updated;
                } else {
                    pruneFlags(source);
                    return source;
                }
            } catch (error) {
                console.error(`Error encountered migrating "${filePath}":`);
                throw error;
            }
        })();

        const origData = JSONstringifyOrder(source);
        const outData = JSONstringifyOrder(updated);

        if (outData !== origData) {
            console.log(`${filePath} is different. writing`);
            try {
                await fs.writeFile(filePath, outData);
            } catch (error) {
                if (error instanceof Error) {
                    throw { message: `File ${filePath} could not be parsed. Error: ${error.message}` };
                }
            }
        }
    }
}

function pruneFlags(source: { flags?: Record<string, Record<string, unknown> | undefined> }): void {
    if (source.flags && Object.keys(source.flags.pf2e ?? {}).length === 0) {
        delete source.flags.pf2e;
    }
    if (Object.keys(source.flags ?? {}).length === 0) {
        delete (source as { flags?: object }).flags;
    }
}

populateFoundryUtilFunctions();

migrate().catch((err) => console.error(err));

import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { sluggify } from "@util";
import fs from "fs-extra";
import { JSDOM } from "jsdom";
import path from "path";
import { populateFoundryUtilFunctions } from "../tests/fixtures/foundryshim.ts";
import { getFilesRecursively } from "./lib/helpers.ts";

import { MigrationBase } from "@module/migration/base.ts";
import { MigrationRunnerBase } from "@module/migration/runner/base.ts";

import { Migration836EnergizingConsolidation } from "@module/migration/migrations/836-energizing-consolidation.ts";
import { Migration837MoveHazardBookSources } from "@module/migration/migrations/837-move-hazard-book-source.ts";
import { Migration838StrikeAttackRollSelector } from "@module/migration/migrations/838-strike-attack-roll-selector.ts";
import { Migration839ActionCategories } from "@module/migration/migrations/839-action-categories.ts";
import { Migration841V11UUIDFormat } from "@module/migration/migrations/841-v11-uuid-format.ts";
import { Migration844DeityDomainUUIDs } from "@module/migration/migrations/844-deity-domains-uuids.ts";
import { Migration846SpellSchoolOptional } from "@module/migration/migrations/846-spell-school-optional.ts";
import { Migration847TempHPRuleEvents } from "@module/migration/migrations/847-temp-hp-rule-events.ts";
import { Migration848NumericArmorProperties } from "@module/migration/migrations/848-numeric-armor-properties.ts";
import { Migration849DeleteBrokenThreshold } from "@module/migration/migrations/849-delete-broken-threshold.ts";
import { Migration850FlatFootedToOffGuard } from "@module/migration/migrations/850-flat-footed-to-off-guard.ts";
import { Migration851JustInnovationId } from "@module/migration/migrations/851-just-innovation-id.ts";
import { Migration852AbilityScoresToModifiers } from "@module/migration/migrations/852-ability-scores-to-modifiers.ts";
import { Migration853RemasterLanguages } from "@module/migration/migrations/853-remaster-languages.ts";
import { Migration854BracketedAbilityScoresToModifiers } from "@module/migration/migrations/854-bracketed-ability-scores-to-modifiers.ts";
import { Migration855ApexEquipmentSystemData } from "@module/migration/migrations/855-apex-equipment-system-data.ts";
import { Migration856NoSystemDotCustom } from "@module/migration/migrations/856-no-system-dot-custom.ts";
import { Migration857WeaponSpecializationRE } from "@module/migration/migrations/857-weapon-spec-re.ts";

// ^^^ don't let your IDE use the index in these imports. you need to specify the full path ^^^

const { window } = new JSDOM();
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLParagraphElement = window.HTMLParagraphElement;
globalThis.Text = window.Text;

const migrations: MigrationBase[] = [
    new Migration836EnergizingConsolidation(),
    new Migration837MoveHazardBookSources(),
    new Migration838StrikeAttackRollSelector(),
    new Migration839ActionCategories(),
    new Migration841V11UUIDFormat(),
    new Migration844DeityDomainUUIDs(),
    new Migration846SpellSchoolOptional(),
    new Migration847TempHPRuleEvents(),
    new Migration848NumericArmorProperties(),
    new Migration849DeleteBrokenThreshold(),
    new Migration850FlatFootedToOffGuard(),
    new Migration851JustInnovationId(),
    new Migration852AbilityScoresToModifiers(),
    new Migration853RemasterLanguages(),
    new Migration854BracketedAbilityScoresToModifiers(),
    new Migration855ApexEquipmentSystemData(),
    new Migration856NoSystemDotCustom(),
    new Migration857WeaponSpecializationRE(),
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
    "campaignFeature",
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

async function getAllFiles(directory: string = packsDataPath, allEntries: string[] = []): Promise<string[]> {
    const packs = fs.readdirSync(directory);
    for (const pack of packs) {
        console.log(`Collecting data for "${pack}"`);
        allEntries.push(...getFilesRecursively(path.join(directory, pack)));
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

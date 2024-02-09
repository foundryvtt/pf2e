import { ActorSourcePF2e } from "@actor/data/index.ts";
import { CREATURE_ACTOR_TYPES } from "@actor/values.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { PHYSICAL_ITEM_TYPES } from "@item/physical/values.ts";
import { MigrationBase } from "@module/migration/base.ts";
import { MigrationRunnerBase } from "@module/migration/runner/base.ts";
import { sluggify } from "@util";
import fs from "fs-extra";
import { JSDOM } from "jsdom";
import path from "path";
import * as R from "remeda";
import "./lib/foundry-utils.ts";
import { getFilesRecursively } from "./lib/helpers.ts";

import { Migration901ReorganizeBulkData } from "@module/migration/migrations/901-reorganize-bulk-data.ts";
import { Migration902DuskwoodDawnsilver } from "@module/migration/migrations/902-duskwood-dawnsilver.ts";
import { Migration903PhysicalNumericData } from "@module/migration/migrations/903-physical-numeric-data.ts";
import { Migration904UndercommonToSakvroth } from "@module/migration/migrations/904-undercommon-to-sakvroth.ts";
import { Migration905UnpersistUsage } from "@module/migration/migrations/905-unpersist-usage.ts";
import { Migration906LimitStackGroup } from "@module/migration/migrations/906-limit-stack-group.ts";
import { Migration907RestructureArmorWeaponRunes } from "@module/migration/migrations/907-restructure-armor-weapon-runes.ts";
import { Migration909RefineConsumableData } from "@module/migration/migrations/909-refine-consumable-data.ts";
import { Migration910EdictsAnathemaArrays } from "@module/migration/migrations/910-edicts-anathema-arrays.ts";
import { Migration911CoinBulk } from "@module/migration/migrations/911-coin-bulk.ts";
import { Migration912RmFocusTraitFocusCantrips } from "@module/migration/migrations/912-rm-focus-trait-focus-cantrips.ts";
import { Migration913SpellSustainedText } from "@module/migration/migrations/913-spell-sustained-text.ts";
import { Migration914MovePerceptionSenses } from "@module/migration/migrations/914-move-perception-senses.ts";
import { Migration915MoveLanguages } from "@module/migration/migrations/915-move-languages.ts";
import { Migration916NewPCToys } from "@module/migration/migrations/916-new-pc-toys.ts";
import { Migration917ScrollWandSpellIds } from "@module/migration/migrations/917-scroll-wand-spell-ids.ts";
// ^^^ don't let your IDE use the index in these imports. you need to specify the full path ^^^

const { window } = new JSDOM();
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLParagraphElement = window.HTMLParagraphElement;
globalThis.Text = window.Text;

const migrations: MigrationBase[] = [
    new Migration901ReorganizeBulkData(),
    new Migration902DuskwoodDawnsilver(),
    new Migration903PhysicalNumericData(),
    new Migration904UndercommonToSakvroth(),
    new Migration905UnpersistUsage(),
    new Migration906LimitStackGroup(),
    new Migration907RestructureArmorWeaponRunes(),
    new Migration909RefineConsumableData(),
    new Migration910EdictsAnathemaArrays(),
    new Migration911CoinBulk(),
    new Migration912RmFocusTraitFocusCantrips(),
    new Migration913SpellSustainedText(),
    new Migration914MovePerceptionSenses(),
    new Migration915MoveLanguages(),
    new Migration916NewPCToys(),
    new Migration917ScrollWandSpellIds(),
];

const packsDataPath = path.resolve(process.cwd(), "packs");

type CompendiumSource = CompendiumDocument["_source"];

const actorTypes = new Set([...CREATURE_ACTOR_TYPES, "army", "hazard", "loot", "vehicle"]);
const itemTypes = new Set([
    ...PHYSICAL_ITEM_TYPES,
    "action",
    "ancestry",
    "background",
    "campaignFeature",
    "class",
    "condition",
    "deity",
    "effect",
    "feat",
    "heritage",
    "kit",
    "lore",
    "melee",
    "spell",
    "spellcastingEntry",
]);

const isActorData = (docSource: CompendiumSource): docSource is ActorSourcePF2e => {
    return "type" in docSource && actorTypes.has(docSource.type);
};

const isItemData = (docSource: CompendiumSource): docSource is ItemSourcePF2e => {
    return "type" in docSource && itemTypes.has(docSource.type);
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

function jsonStringifyOrder(obj: object): string {
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
                        if (itemIsOfType(embedded, "armor", "equipment", "shield", "weapon")) {
                            embedded.system.subitems ??= [];
                        }
                    }

                    const update = await migrationRunner.getUpdatedActor(source, migrationRunner.migrations);
                    update.items = update.items.map((i) => fu.mergeObject({}, i, { performDeletions: true }));

                    pruneDefaults(source);
                    pruneDefaults(update);

                    return fu.mergeObject(source, update, { inplace: false, performDeletions: true });
                } else if (isItemData(source)) {
                    source.system.slug = sluggify(source.name);
                    if (itemIsOfType(source, "armor", "equipment", "shield", "weapon")) {
                        source.system.subitems ??= [];
                    }
                    const update = await migrationRunner.getUpdatedItem(source, migrationRunner.migrations);

                    pruneDefaults(source);
                    pruneDefaults(update);

                    return fu.mergeObject(source, update, { inplace: false, performDeletions: true });
                } else if (isJournalEntryData(source)) {
                    const update = await migrationRunner.getUpdatedJournalEntry(source, migrationRunner.migrations);
                    pruneDefaults(source);
                    pruneDefaults(update);
                    return fu.mergeObject(source, update, { inplace: false, performDeletions: true });
                } else if (isMacroData(source)) {
                    const update = await migrationRunner.getUpdatedMacro(source, migrationRunner.migrations);
                    pruneDefaults(source);
                    pruneDefaults(update);
                    return fu.mergeObject(source, update, { inplace: false, performDeletions: true });
                } else if (isTableData(source)) {
                    const update = await migrationRunner.getUpdatedTable(source, migrationRunner.migrations);
                    pruneDefaults(source);
                    pruneDefaults(update);
                    return fu.mergeObject(source, update, { inplace: false, performDeletions: true });
                } else {
                    pruneDefaults(source);
                    return source;
                }
            } catch (error) {
                console.error(`Error encountered migrating "${filePath}":`);
                throw error;
            }
        })();

        if (!R.equals(source, updated)) {
            console.log(`${filePath} is different. writing`);
            try {
                await fs.writeFile(filePath, jsonStringifyOrder(updated));
            } catch (error) {
                if (error instanceof Error) {
                    throw { message: `File ${filePath} could not be parsed. Error: ${error.message}` };
                }
            }
        }
    }
}

/** Prune several default properties from a document source that would otherwise bloat the compendium. */
function pruneDefaults(
    source: { type?: string; items?: ItemSourcePF2e[]; flags?: Record<string, Record<string, unknown> | undefined> },
    { deleteSlug = true } = {},
): void {
    if (source.flags && Object.keys(source.flags.pf2e ?? {}).length === 0) {
        delete source.flags.pf2e;
    }
    if (Object.keys(source.flags ?? {}).length === 0) {
        delete source.flags;
    }

    if ("system" in source && R.isObject(source.system)) {
        if (deleteSlug) delete source.system.slug;
        delete source.system._migrations;
        if (source.type === "consumable" && !source.system.spell) {
            delete source.system.spell;
        }
        if (
            "subitems" in source.system &&
            Array.isArray(source.system.subitems) &&
            source.system.subitems.length === 0
        ) {
            delete source.system.subitems;
        }
    }

    if (Array.isArray(source.items)) {
        for (const item of source.items) {
            pruneDefaults(item, { deleteSlug: false });
        }
    }
}

migrate().catch((err) => console.error(err));

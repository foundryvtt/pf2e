import type { ActorSourcePF2e } from "@actor/data/index.ts";
import { ACTOR_TYPES } from "@actor/values.ts";
import type { CompendiumDocument } from "@client/documents/_module.d.mts";
import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { ITEM_TYPES } from "@item/values.ts";
import { MigrationBase } from "@module/migration/base.ts";
import { MigrationRunnerBase } from "@module/migration/runner/base.ts";
import { sluggify } from "@util";
import fs from "fs-extra";
import { JSDOM } from "jsdom";
import path from "path";
import * as R from "remeda";
import "./lib/foundry-utils.ts";
import { getFilesRecursively } from "./lib/helpers.ts";
import type { PackEntry } from "./lib/types.ts";

import { Migration937RemoveInvalidAuraTraits } from "@module/migration/migrations/937-remove-invalid-aura-traits.ts";
import { Migration938RenameBroochesAndThroned } from "@module/migration/migrations/938-rename-brooches-and-throned.ts";
import { Migration940WeaponExpend } from "@module/migration/migrations/940-weapon-expend.ts";
import { Migration942EquipmentGrade } from "@module/migration/migrations/942-equipment-grade.ts";
import { Migration943UpdateSpeedPath } from "@module/migration/migrations/943-update-speed-paths.ts";
import { Migration944RmDamageDiceValue } from "@module/migration/migrations/944-rm-damage-dice-value.ts";
import { Migration945REBracketsToStrings } from "@module/migration/migrations/945-re-brackets-to-strings.ts";
import { Migration946RetirePotencyStrikingREs } from "@module/migration/migrations/946-retire-potency-striking-res.ts";
import { Migration947FixPostPotencyStrikingPredicates } from "@module/migration/migrations/947-fix-post-potency-striking-predicates.ts";
import { Migration949NPCRangeData } from "@module/migration/migrations/949-npc-range-data.ts";
import { Migration950AmmoConsumableToAmmoAmmo } from "@module/migration/migrations/950-ammo-consumable-to-ammo-ammo.ts";
import { Migration951TreasureCategories } from "@module/migration/migrations/951-treasure-categories.ts";
import { Migration952AmmoTraitsAndOptions } from "@module/migration/migrations/952-ammo-traits-options.ts";

const { window } = new JSDOM();
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLParagraphElement = window.HTMLParagraphElement;
globalThis.Text = window.Text;

const migrations: MigrationBase[] = [
    new Migration937RemoveInvalidAuraTraits(),
    new Migration938RenameBroochesAndThroned(),
    new Migration940WeaponExpend(),
    new Migration942EquipmentGrade(),
    new Migration943UpdateSpeedPath(),
    new Migration944RmDamageDiceValue(),
    new Migration945REBracketsToStrings(),
    new Migration946RetirePotencyStrikingREs(),
    new Migration947FixPostPotencyStrikingPredicates(),
    new Migration949NPCRangeData(),
    new Migration950AmmoConsumableToAmmoAmmo(),
    new Migration951TreasureCategories(),
    new Migration952AmmoTraitsAndOptions(),
];

const packsDataPath = path.resolve(process.cwd(), "packs");

type CompendiumSource = CompendiumDocument["_source"];

const actorTypes: readonly string[] = ACTOR_TYPES;
const itemTypes: readonly string[] = ITEM_TYPES;

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

/** Recursively set defaults such as flags on a document source */
function setDefaults(source: PackEntry) {
    source.flags ??= {};

    if (isActorData(source)) {
        for (const item of source.items) {
            setDefaults(item);
        }
    } else if (isItemData(source)) {
        if (itemIsOfType(source, "physical")) {
            source.system.subitems ??= [];
            for (const subItem of source.system.subitems) {
                setDefaults(subItem);
            }
        }
        if (itemIsOfType(source, "consumable") && source.system.spell) {
            setDefaults(source.system.spell);
        }
    }
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
            try {
                setDefaults(source);

                if (isActorData(source)) {
                    const update = await migrationRunner.getUpdatedActor(source, migrationRunner.migrations);
                    update.items = update.items.map((i) => fu.mergeObject({}, i, { performDeletions: true }));

                    pruneDefaults(source);
                    pruneDefaults(update);

                    return fu.mergeObject(source, update, { inplace: false, performDeletions: true });
                } else if (isItemData(source)) {
                    source.system.slug = sluggify(source.name);
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

        if (!R.isDeepEqual(source, updated)) {
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

    if ("system" in source && R.isPlainObject(source.system)) {
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

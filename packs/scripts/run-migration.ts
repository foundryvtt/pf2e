import * as fs from "fs-extra";
import * as path from "path";
import { populateFoundryUtilFunctions } from "../../tests/fixtures/foundryshim";
import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { JSDOM } from "jsdom";
import { sluggify } from "@util";
import { MigrationBase } from "@module/migration/base";
import { MigrationRunnerBase } from "@module/migration/runner/base";
import { Migration743FixWeaknessStructure } from "@module/migration/migrations/743-fix-weakness-structure";
import { Migration744MigrateSpellHeighten } from "@module/migration/migrations/744-migrate-spell-heighten";
import { Migration745EffectTargetToChoiceSet } from "@module/migration/migrations/745-effect-target-to-choice-set";
import { Migration746StandardizePricing } from "@module/migration/migrations/746-standardize-pricing";
import { Migration748BatchConsumablePricing } from "@module/migration/migrations/748-batch-consumable-pricing";
import { Migration749AssuranceREs } from "@module/migration/migrations/749-assurance-res";
import { Migration752StrikeVsWeaponTraits } from "@module/migration/migrations/752-strike-vs-weapon-traits";
import { Migration753WeaponReloadTimes } from "@module/migration/migrations/753-weapon-reload-times";
import { Migration754MightyBulwarkAdjustModifiers } from "@module/migration/migrations/754-mighty-bulwark-adjust-modifiers";
import { Migration755GrantIdsToData } from "@module/migration/migrations/755-grant-ids-to-data";
import { Migration757HillockHalfling } from "@module/migration/migrations/757-hillock-halfling";
import { Migration759CritSpecRE } from "@module/migration/migrations/759-crit-spec-re";
import { Migration760SeparateNoteTitle } from "@module/migration/migrations/760-separate-note-title";
import { Migration761ShotRules } from "@module/migration/migrations/761-update-shot-rules";
import { Migration762UpdateBackgroundItems } from "@module/migration/migrations/762-update-background-items";
import { Migration763RestoreAnimalStrikeOptions } from "@module/migration/migrations/763-restore-animal-strike-options";
import { Migration764PanacheVivaciousREs } from "@module/migration/migrations/764-panache-vivacious-res";
import { Migration765ChoiceOwnedItemTypes } from "@module/migration/migrations/765-choice-owned-item-types";
import { Migration766WipeURLSources } from "@module/migration/migrations/766-wipe-url-sources";
import { Migration767ConvertVoluntaryFlaws } from "@module/migration/migrations/767-convert-voluntary-flaws";
import { Migration768AddNewAuras } from "@module/migration/migrations/768-add-new-auras";
import { Migration769NoUniversalistFocusPool } from "@module/migration/migrations/769-no-universalist-focus-pool";
import { Migration770REDataToSystem } from "@module/migration/migrations/770-re-data-to-system";
import { Migration771SpellVariantsToSystem } from "@module/migration/migrations/771-spell-variants-to-system";
import { Migration772V10EmbeddedSpellData } from "@module/migration/migrations/772-v10-embedded-spell-data";
import { Migration773ReligiousSymbolUsage } from "@module/migration/migrations/773-religious-symbol-usage";
import { Migration774UnpersistCraftingEntriesAndAddPredicate } from "@module/migration/migrations/774-unpersist-crafting-entries-and-add-predicate";
// ^^^ don't let your IDE use the index in these imports. you need to specify the full path ^^^

const { window } = new JSDOM();
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLParagraphElement = window.HTMLParagraphElement;
globalThis.Text = window.Text;

const migrations: MigrationBase[] = [
    new Migration743FixWeaknessStructure(),
    new Migration744MigrateSpellHeighten(),
    new Migration745EffectTargetToChoiceSet(),
    new Migration746StandardizePricing(),
    new Migration748BatchConsumablePricing(),
    new Migration749AssuranceREs(),
    new Migration752StrikeVsWeaponTraits(),
    new Migration753WeaponReloadTimes(),
    new Migration754MightyBulwarkAdjustModifiers(),
    new Migration755GrantIdsToData(),
    new Migration757HillockHalfling(),
    new Migration759CritSpecRE(),
    new Migration760SeparateNoteTitle(),
    new Migration761ShotRules(),
    new Migration762UpdateBackgroundItems(),
    new Migration763RestoreAnimalStrikeOptions(),
    new Migration764PanacheVivaciousREs(),
    new Migration765ChoiceOwnedItemTypes(),
    new Migration766WipeURLSources(),
    new Migration767ConvertVoluntaryFlaws(),
    new Migration768AddNewAuras(),
    new Migration769NoUniversalistFocusPool(),
    new Migration770REDataToSystem(),
    new Migration771SpellVariantsToSystem(),
    new Migration772V10EmbeddedSpellData(),
    new Migration773ReligiousSymbolUsage(),
    new Migration774UnpersistCraftingEntriesAndAddPredicate(),
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

const packsDataPath = path.resolve(process.cwd(), "packs/data");

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
const isMacroData = (docSource: CompendiumSource): docSource is foundry.data.MacroSource => {
    return "type" in docSource && ["chat", "script"].includes(docSource.type);
};
const isTableData = (docSource: CompendiumSource): docSource is foundry.data.RollTableSource => {
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
            // Create an array of files in the ./packs/data/[packname].db/ directory
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

        let source: ActorSourcePF2e | ItemSourcePF2e | foundry.data.MacroSource | foundry.data.RollTableSource;
        try {
            // Parse file content
            source = JSON.parse(content);
        } catch (error) {
            if (error instanceof Error) {
                throw Error(`File ${filePath} could not be parsed. Error: ${error.message}`);
            }
            return;
        }

        // skip journal entries, rollable tables, and macros
        const updated = await (async (): Promise<
            ActorSourcePF2e | ItemSourcePF2e | foundry.data.MacroSource | foundry.data.RollTableSource
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
                console.log(error);
                throw {};
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

import * as fs from "fs-extra";
import * as path from "path";
import { populateFoundryUtilFunctions } from "../../tests/fixtures/foundryshim";
import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { JSDOM } from "jsdom";
import { sluggify } from "@util";
import { MigrationBase } from "@module/migration/base";
import { MigrationRunnerBase } from "@module/migration/runner/base";
import { Migration772V10EmbeddedSpellData } from "@module/migration/migrations/772-v10-embedded-spell-data";
import { Migration773ReligiousSymbolUsage } from "@module/migration/migrations/773-religious-symbol-usage";
import { Migration774UnpersistCraftingEntries } from "@module/migration/migrations/774-unpersist-crafting-entries";
import { Migration775AgileFinesseRanged } from "@module/migration/migrations/775-agile-finesse-ranged";
import { Migration776SlugifyConditionOverrides } from "@module/migration/migrations/776-sluggify-condition-overrides";
import { Migration777HandOfTheApprentice } from "@module/migration/migrations/777-hand-of-the-apprentice";
import { Migration778RenameRetiredPackRefs } from "@module/migration/migrations/778-rename-feature-effects-refs";
import { Migration779EliteWeak } from "@module/migration/migrations/779-elite-weak";
import { Migration780NumifySpeeds } from "@module/migration/migrations/780-numify-speeds";
import { Migration781SuppressNoCrowbar } from "@module/migration/migrations/781-suppress-no-crowbar";
import { Migration782UnnestActorTraits } from "@module/migration/migrations/782-unnest-actor-traits";
import { Migration783RemoveClassSkillAELikes } from "@module/migration/migrations/783-remove-class-skill-ae-likes";
import { Migration785ABCKitItemUUIDs } from "@module/migration/migrations/785-abc-kit-items";
import { Migration787ResolvablesToSystem } from "@module/migration/migrations/787-resolvables-to-system";
import { Migration788UpdateTanglefootBags } from "@module/migration/migrations/788-update-tanglefoot-bags";
import { Migration789UpdatePreciseStrike } from "@module/migration/migrations/789-update-precise-strike";
import { Migration790MultipleClassDCs } from "@module/migration/migrations/790-multiple-class-dcs";
import { Migration791RuffianHands } from "@module/migration/migrations/791-ruffian-hands";
import { Migration793MakePredicatesArrays } from "@module/migration/migrations/793-make-predicates-arrays";

// ^^^ don't let your IDE use the index in these imports. you need to specify the full path ^^^

const { window } = new JSDOM();
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLParagraphElement = window.HTMLParagraphElement;
globalThis.Text = window.Text;

const migrations: MigrationBase[] = [
    new Migration772V10EmbeddedSpellData(),
    new Migration773ReligiousSymbolUsage(),
    new Migration774UnpersistCraftingEntries(),
    new Migration775AgileFinesseRanged(),
    new Migration776SlugifyConditionOverrides(),
    new Migration777HandOfTheApprentice(),
    new Migration778RenameRetiredPackRefs(),
    new Migration779EliteWeak(),
    new Migration780NumifySpeeds(),
    new Migration781SuppressNoCrowbar(),
    new Migration782UnnestActorTraits(),
    new Migration783RemoveClassSkillAELikes(),
    new Migration785ABCKitItemUUIDs(),
    new Migration787ResolvablesToSystem(),
    new Migration788UpdateTanglefootBags(),
    new Migration789UpdatePreciseStrike(),
    new Migration790MultipleClassDCs(),
    new Migration791RuffianHands(),
    new Migration793MakePredicatesArrays(),
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

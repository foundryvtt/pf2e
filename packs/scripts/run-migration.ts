import * as fs from "fs-extra";
import * as path from "path";
import { populateFoundryUtilFunctions } from "../../tests/fixtures/foundryshim";
import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { sluggify } from "@util";
import { MigrationBase } from "@module/migration/base";
import { MigrationRunnerBase } from "@module/migration/runner/base";
import { Migration673RemoveBulwarkREs } from "@module/migration/migrations/673-remove-bulwark-res";
import { Migration675FlatModifierAEsToREs } from "@module/migration/migrations/675-flat-modifier-aes-to-res";
import { Migration677RuleValueDataRefs } from "@module/migration/migrations/677-rule-value-data-refs";
import { Migration678SeparateNPCAttackTraits } from "@module/migration/migrations/678-separate-npc-attack-traits";
import { Migration679TowerShieldSpeedPenalty } from "@module/migration/migrations/679-tower-shield-speed-penalty";
import { Migration680SetWeaponHands } from "@module/migration/migrations/680-set-weapon-hands";
import { Migration681GiantLanguageToJotun } from "@module/migration/migrations/681-giant-language-to-jotun";
import { Migration682BiographyFields } from "@module/migration/migrations/682-biography-fields";
import { Migration683FlavorTextToPublicNotes } from "@module/migration/migrations/683-flavortext-to-public-notes";
import { Migration685FixMeleeUsageTraits } from "@module/migration/migrations/685-fix-melee-usage-traits";
import { Migration686HeroPointsToResources } from "@module/migration/migrations/686-hero-points-to-resources";
import { Migration687FamiliarityAEsToREs } from "@module/migration/migrations/687-familiarity-aes-to-res";
import { Migration688ClampSpellLevel } from "@module/migration/migrations/688-clamp-spell-level";

const migrations: MigrationBase[] = [
    new Migration673RemoveBulwarkREs(),
    new Migration675FlatModifierAEsToREs(),
    new Migration677RuleValueDataRefs(),
    new Migration678SeparateNPCAttackTraits(),
    new Migration679TowerShieldSpeedPenalty(),
    new Migration680SetWeaponHands(),
    new Migration681GiantLanguageToJotun(),
    new Migration682BiographyFields(),
    new Migration683FlavorTextToPublicNotes(),
    new Migration685FixMeleeUsageTraits(),
    new Migration686HeroPointsToResources(),
    new Migration687FamiliarityAEsToREs(),
    new Migration688ClampSpellLevel(),
];

// eslint-disable @typescript-eslint/no-explicit-any
global.deepClone = function (original: any): any {
    // Simple types
    if (typeof original !== "object" || original === null) return original;

    // Arrays
    if (Array.isArray(original)) return original.map(deepClone);

    // Dates
    if (original instanceof Date) return new Date(original);

    // Unsupported advanced objects
    if ("constructor" in original && original["constructor"] !== Object) return original;

    // Other objects
    const clone: Record<string, unknown> = {};
    for (const k of Object.keys(original)) {
        clone[k] = deepClone(original[k]);
    }
    return clone;
};
// eslint-enable @typescript-eslint/no-explicit-any

const packsDataPath = path.resolve(process.cwd(), "packs/data");

type CompendiumSource = CompendiumDocument["data"]["_source"];

const actorTypes = ["character", "npc", "hazard", "loot", "familiar", "vehicle"];
const itemTypes = [
    "backpack",
    "treasure",
    "weapon",
    "armor",
    "kit",
    "melee",
    "consumable",
    "equipment",
    "ancestry",
    "background",
    "class",
    "feat",
    "lore",
    "martial",
    "action",
    "spell",
    "spellcastingEntry",
    "status",
    "condition",
    "effect",
    "formula",
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
        if (key.startsWith("-=")) return;

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
            try {
                if (isActorData(source)) {
                    const updatedActor = await migrationRunner.getUpdatedActor(source, migrationRunner.migrations);
                    delete (updatedActor.data as { schema?: unknown }).schema;
                    for (const updatedItem of updatedActor.items) {
                        delete (updatedItem.data as { schema?: unknown }).schema;
                    }
                    return updatedActor;
                } else if (isItemData(source)) {
                    source.data.slug = sluggify(source.name);
                    const updatedItem = await migrationRunner.getUpdatedItem(source, migrationRunner.migrations);
                    delete (updatedItem.data as { schema?: unknown }).schema;
                    delete (updatedItem.data as { slug?: unknown }).slug;
                    delete (source.data as { slug?: unknown }).slug;

                    return updatedItem;
                } else if (isMacroData(source)) {
                    return await migrationRunner.getUpdatedMacro(source, migrationRunner.migrations);
                } else if (isTableData(source)) {
                    return await migrationRunner.getUpdatedTable(source, migrationRunner.migrations);
                } else {
                    return source;
                }
            } catch (error) {
                if (error instanceof Error) throw Error(`Error while trying to edit ${filePath}: ${error.message}`);
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

populateFoundryUtilFunctions();

migrate().catch((err) => console.error(err));

import * as fs from "fs-extra";
import * as path from "path";
import { populateFoundryUtilFunctions } from "../../tests/fixtures/foundryshim";
import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { sluggify } from "@util";
import { MigrationBase } from "@module/migration/base";
import { MigrationRunnerBase } from "@module/migration/runner/base";
import { Migration689EncumberanceActiveEffects } from "@module/migration/migrations/689-encumberance-aes";
import { Migration690InitiativeTiebreakItems } from "@module/migration/migrations/690-tiebreak-items";
import { Migration691WeaponRangeAbilityCategoryGroup } from "@module/migration/migrations/691-weapon-range-ability-category-group";
import { Migration693ArmorCategoryGroup } from "@module/migration/migrations/693-armor-category-group";
import { Migration695SummonToSummoned } from "@module/migration/migrations/695-summon-to-summoned";
import { Migration696FlatAbilityModifiers } from "@module/migration/migrations/696-flat-ability-modifiers";
import { Migration697WeaponReachTrait } from "@module/migration/migrations/697-weapon-reach-trait";
import { Migration698RemoveDerivedActorTraits } from "@module/migration/migrations/698-remove-derived-actor-traits";
import { Migration699ItemDescriptionEmptyString } from "@module/migration/migrations/699-item-description-empty-string";
import { Migration700SingleClassFeatures } from "@module/migration/migrations/700-single-class-features";
import { Migration701ModifierNameToSlug } from "@module/migration/migrations/701-modifier-name-to-slug";
import { Migration702REFormulasAtInstanceLevel } from "@module/migration/migrations/702-re-formulas-at-instance-level";
import { Migration703SpellDamageStructure } from "@module/migration/migrations/703-spell-damage-structure";
import { Migration704MartialProficiencyRE } from "@module/migration/migrations/704-martial-proficiency-re";
import { Migration705GunslingerCatchUp } from "@module/migration/migrations/705-gunslinger-catch-up";
import { Migration706FormulasAtInstanceLevelEverythingElse } from "@module/migration/migrations/706-formulas-at-instance-level-everything-else";
import { Migration707BracketedFormulasAtInstanceLevel } from "@module/migration/migrations/707-bracketed-formulas-at-instance-level";
import { Migration708SpecificRuleLabel } from "@module/migration/migrations/708-specific-rule-label";
import { Migration709REFormulasAtInstanceLevelRedux } from "@module/migration/migrations/709-re-formulas-at-instance-level-redux";
import { Migration710RarityToString } from "@module/migration/migrations/710-rarity-to-string";
import { Migration711HeritageItems } from "@module/migration/migrations/711-heritage-items";
import { Migration712ActorShieldStructure } from "@module/migration/migrations/712-actor-shield-structure";
import { Migration713FistToStrikeRE } from "@module/migration/migrations/713-fist-to-strike-re";

const migrations: MigrationBase[] = [
    new Migration689EncumberanceActiveEffects(),
    new Migration690InitiativeTiebreakItems(),
    new Migration691WeaponRangeAbilityCategoryGroup(),
    new Migration693ArmorCategoryGroup(),
    new Migration695SummonToSummoned(),
    new Migration696FlatAbilityModifiers(),
    new Migration697WeaponReachTrait(),
    new Migration698RemoveDerivedActorTraits(),
    new Migration699ItemDescriptionEmptyString(),
    new Migration700SingleClassFeatures(),
    new Migration701ModifierNameToSlug(),
    new Migration702REFormulasAtInstanceLevel(),
    new Migration703SpellDamageStructure(),
    new Migration704MartialProficiencyRE(),
    new Migration705GunslingerCatchUp(),
    new Migration706FormulasAtInstanceLevelEverythingElse(),
    new Migration707BracketedFormulasAtInstanceLevel(),
    new Migration708SpecificRuleLabel(),
    new Migration709REFormulasAtInstanceLevelRedux(),
    new Migration710RarityToString(),
    new Migration711HeritageItems(),
    new Migration712ActorShieldStructure(),
    new Migration713FistToStrikeRE(),
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

global.randomID = function randomID(length = 16): string {
    const rnd = () => Math.random().toString(36).substring(2);
    let id = "";
    while (id.length < length) id += rnd();
    return id.substring(0, length);
};

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

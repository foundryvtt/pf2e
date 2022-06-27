import * as fs from "fs-extra";
import * as path from "path";
import { populateFoundryUtilFunctions } from "../../tests/fixtures/foundryshim";
import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { JSDOM } from "jsdom";
import { sluggify } from "@util";
import { MigrationBase } from "@module/migration/base";
import { MigrationRunnerBase } from "@module/migration/runner/base";
import { Migration730DeruneHandwraps } from "@module/migration/migrations/730-derune-handwraps";
import { Migration731TogglePropertyToRollOption } from "@module/migration/migrations/731-toggle-property-to-roll-option";
import { Migration732FixDedicationFeatTypes } from "@module/migration/migrations/732-fix-dedication-feat-types";
import { Migration733ItemBonusFromEquipment } from "@module/migration/migrations/733-item-bonus-from-equipment";
import { Migration734SpellLocationPropsAndSignature } from "@module/migration/migrations/734-spell-location-props-and-signature";
import { Migration735FirearmAmmoAlchemical } from "@module/migration/migrations/735-firearm-ammo-alchemical";
import { Migration736RemoveBrokenThreshold } from "@module/migration/migrations/736-remove-broken-threshold";
import { Migration737NormalizeRuleElementKeys } from "@module/migration/migrations/737-normalize-re-keys";
import { Migration739RecoveryCheckDC } from "@module/migration/migrations/739-recovery-check-dc";
import { Migration740MaxTakable } from "@module/migration/migrations/740-fix-max-takable";
import { Migration741RollOptionToggleToItem } from "@module/migration/migrations/741-roll-option-toggle-to-item";
import { Migration742RMAbilityBoostLevels } from "@module/migration/migrations/742-rm-class-ability-boost-levels";
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
// ^^^ don't let your IDE use the index in these imports. you need to specify the full path ^^^

const { window } = new JSDOM();
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLParagraphElement = window.HTMLParagraphElement;
globalThis.Text = window.Text;

const migrations: MigrationBase[] = [
    new Migration730DeruneHandwraps(),
    new Migration731TogglePropertyToRollOption(),
    new Migration732FixDedicationFeatTypes(),
    new Migration733ItemBonusFromEquipment(),
    new Migration734SpellLocationPropsAndSignature(),
    new Migration735FirearmAmmoAlchemical(),
    new Migration736RemoveBrokenThreshold(),
    new Migration737NormalizeRuleElementKeys(),
    new Migration739RecoveryCheckDC(),
    new Migration740MaxTakable(),
    new Migration741RollOptionToggleToItem(),
    new Migration742RMAbilityBoostLevels(),
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

type CompendiumSource = CompendiumDocument["data"]["_source"];

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
            source.flags ??= {};
            try {
                if (isActorData(source)) {
                    for (const embedded of source.items) {
                        embedded.flags ??= {};
                    }
                    const updatedActor = await migrationRunner.getUpdatedActor(source, migrationRunner.migrations);
                    delete (updatedActor.data as { schema?: unknown }).schema;
                    pruneFlags(source);
                    pruneFlags(updatedActor);
                    for (const item of source.items) {
                        pruneFlags(item);
                    }
                    for (const updatedItem of updatedActor.items) {
                        delete (updatedItem.data as { schema?: unknown }).schema;
                        pruneFlags(updatedItem);
                    }
                    return updatedActor;
                } else if (isItemData(source)) {
                    source.data.slug = sluggify(source.name);
                    const updatedItem = await migrationRunner.getUpdatedItem(source, migrationRunner.migrations);
                    delete (source.data as { slug?: unknown }).slug;
                    delete (updatedItem.data as { schema?: unknown }).schema;
                    delete (updatedItem.data as { slug?: unknown }).slug;
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

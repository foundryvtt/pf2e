import * as fs from "fs-extra";
import * as path from "path";
import { populateFoundryUtilFunctions } from "../../tests/fixtures/foundryshim";
import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "@module/migration/base";
import { MigrationRunnerBase } from "@module/migration/runner/base";
import { Migration650StringifyWeaponProperties } from "@module/migration/migrations/650-stringify-weapon-properties";
import { Migration651EphemeralFocusPool } from "@module/migration/migrations/651-ephemeral-focus-pool";
import { Migration652KillHalcyonTradition } from "@module/migration/migrations/652-kill-halcyon-tradition";
import { Migration653AEstoREs } from "@module/migration/migrations/653-aes-to-res";
import { Migration654ActionTypeAndCount } from "@module/migration/migrations/654-action-type-count";
import { Migration655CreatureTokenSizes } from "@module/migration/migrations/655-creature-token-sizes";
import { Migration656OtherFocusPoolSources } from "@module/migration/migrations/656-other-focus-pool-sources";
import { Migration657RemoveSetProperty } from "@module/migration/migrations/657-remove-set-property";
import { Migration658MonkUnarmoredProficiency } from "@module/migration/migrations/658-monk-unarmored-proficiency";
import { Migration659MultipleDamageRows } from "@module/migration/migrations/659-multiple-damage-rows";
import { Migration660DerivedSpellTraits } from "@module/migration/migrations/660-derived-spell-traits";
import { Migration661NumifyVehicleDimensions } from "@module/migration/migrations/661-numify-vehicle-dimensions";
import { Migration663FixSpellDamage } from "@module/migration/migrations/663-fix-spell-damage";
import { Migration665HandwrapsCorrections } from "@module/migration/migrations/665-handwraps-corrections";
import { Migration666UsageAndStowingContainers } from "@module/migration/migrations/666-usage-and-stowing-containers";
import { Migration667HPSubProperties } from "@module/migration/migrations/667-hp-subproperties";
import { Migration668ArmorSpeedPenalty } from "@module/migration/migrations/668-armor-speed-penalty";
import { Migration669NPCAttackEffects } from "@module/migration/migrations/669-npc-attack-effects";
import { Migration670NoCustomTrait } from "@module/migration/migrations/670-no-custom-trait";
import { Migration670AncestryVision } from "@module/migration/migrations/670-ancestry-vision";
import { Migration671NoPCItemsOnNonPCs } from "@module/migration/migrations/671-no-pc-items-on-non-pcs";
import { Migration672RemoveNPCBaseProperties } from "@module/migration/migrations/672-remove-npc-base-properties";

const migrations: MigrationBase[] = [
    new Migration650StringifyWeaponProperties(),
    new Migration651EphemeralFocusPool(),
    new Migration652KillHalcyonTradition(),
    new Migration653AEstoREs(),
    new Migration654ActionTypeAndCount(),
    new Migration655CreatureTokenSizes(),
    new Migration656OtherFocusPoolSources(),
    new Migration657RemoveSetProperty(),
    new Migration658MonkUnarmoredProficiency(),
    new Migration659MultipleDamageRows(),
    new Migration660DerivedSpellTraits(),
    new Migration661NumifyVehicleDimensions(),
    new Migration663FixSpellDamage(),
    new Migration665HandwrapsCorrections(),
    new Migration666UsageAndStowingContainers(),
    new Migration667HPSubProperties(),
    new Migration668ArmorSpeedPenalty(),
    new Migration669NPCAttackEffects(),
    new Migration670NoCustomTrait(),
    new Migration670AncestryVision(),
    new Migration671NoPCItemsOnNonPCs(),
    new Migration672RemoveNPCBaseProperties(),
];

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
                    const updatedItem = await migrationRunner.getUpdatedItem(source, migrationRunner.migrations);
                    delete (updatedItem.data as { schema?: unknown }).schema;
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

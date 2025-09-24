import type { ActorSourcePF2e } from "@actor/data/index.ts";
import { CREATURE_ACTOR_TYPES } from "@actor/values.ts";
import type { CompendiumDocument } from "@client/documents/_module.d.mts";
import type { ItemSourcePF2e } from "@item/base/data/index.ts";
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
import type { PackEntry } from "./lib/types.ts";

import { Migration913SpellSustainedText } from "@module/migration/migrations/913-spell-sustained-text.ts";
import { Migration917ScrollWandSpellIds } from "@module/migration/migrations/917-scroll-wand-spell-ids.ts";
import { Migration918DeitySkills } from "@module/migration/migrations/918-deity-skills.ts";
import { Migration919WeaponToggleStructure } from "@module/migration/migrations/919-trait-toggle-structure.ts";
import { Migration920SuboptionSelection } from "@module/migration/migrations/920-suboption-selection.ts";
import { Migration921SpellSlotArrays } from "@module/migration/migrations/921-spell-slot-arrays.ts";
import { Migration922SwashbucklerFinishers } from "@module/migration/migrations/922-swashbuckler-finisher-suboptions.ts";
import { Migration923KineticistRestructure } from "@module/migration/migrations/923-kineticist-restructure.ts";
import { Migration924JiuHuanDoa } from "@module/migration/migrations/924-jiu-huan-dao.ts";
import { Migration925TouchOfCorruption } from "@module/migration/migrations/925-touch-of-corruption.ts";
import { Migration926RemoveVisionFeatureLinks } from "@module/migration/migrations/926-remove-vision-feature-links.ts";
import { Migration927ClassBackgroundBattleFormSkillLongform } from "@module/migration/migrations/927-class-background-skill-longform.ts";
import { Migration928CharacterSkillsLongform } from "@module/migration/migrations/928-character-skills-longform.ts";
import { Migration929RemoveSkillAbbreviations } from "@module/migration/migrations/929-remove-skill-abbreviations.ts";
import { Migration930ChoiceSetMedium } from "@module/migration/migrations/930-choice-set-medium.ts";
import { Migration931ExpandREPermissions } from "@module/migration/migrations/931-expand-re-permissions.ts";
import { Migration932NPCSystemSkills } from "@module/migration/migrations/932-npc-system-skills.ts";
import { Migration933CraftingAbility } from "@module/migration/migrations/933-crafting-ability.ts";
import { Migration934MythicCallingCategory } from "@module/migration/migrations/934-mythic-calling-category.ts";
import { Migration935DeityIconPaths } from "@module/migration/migrations/935-deity-icon-paths.ts";
import { Migration937RemoveInvalidAuraTraits } from "@module/migration/migrations/937-remove-invalid-aura-traits.ts";
import { Migration938RenameBroochesAndThroned } from "@module/migration/migrations/938-rename-brooches-and-throned.ts";
import { Migration940WeaponExpend } from "@module/migration/migrations/940-weapon-expend.ts";
import { Migration942EquipmentGrade } from "@module/migration/migrations/942-equipment-grade.ts";
import { Migration943UpdateSpeedPath } from "@module/migration/migrations/943-update-speed-paths.ts";

const { window } = new JSDOM();
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLParagraphElement = window.HTMLParagraphElement;
globalThis.Text = window.Text;

const migrations: MigrationBase[] = [
    new Migration913SpellSustainedText(),
    new Migration917ScrollWandSpellIds(),
    new Migration918DeitySkills(),
    new Migration919WeaponToggleStructure(),
    new Migration920SuboptionSelection(),
    new Migration921SpellSlotArrays(),
    new Migration922SwashbucklerFinishers(),
    new Migration923KineticistRestructure(),
    new Migration924JiuHuanDoa(),
    new Migration925TouchOfCorruption(),
    new Migration926RemoveVisionFeatureLinks(),
    new Migration927ClassBackgroundBattleFormSkillLongform(),
    new Migration928CharacterSkillsLongform(),
    new Migration929RemoveSkillAbbreviations(),
    new Migration930ChoiceSetMedium(),
    new Migration931ExpandREPermissions(),
    new Migration932NPCSystemSkills(),
    new Migration933CraftingAbility(),
    new Migration934MythicCallingCategory(),
    new Migration935DeityIconPaths(),
    new Migration937RemoveInvalidAuraTraits(),
    new Migration938RenameBroochesAndThroned(),
    new Migration940WeaponExpend(),
    new Migration942EquipmentGrade(),
    new Migration943UpdateSpeedPath(),
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

import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { sluggify } from "@util";
import fs from "fs-extra";
import { JSDOM } from "jsdom";
import path from "path";
import { populateFoundryUtilFunctions } from "../tests/fixtures/foundryshim.ts";
import "./lib/core-helpers.ts";
import { getFilesRecursively } from "./lib/helpers.ts";

import { MigrationBase } from "@module/migration/base.ts";
import { MigrationRunnerBase } from "@module/migration/runner/base.ts";

import { Migration876FeatLevelTaken } from "@module/migration/migrations/876-feat-level-taken.ts";
import { Migration877PublicationData } from "@module/migration/migrations/877-publication-data.ts";
import { Migration878TakeABreather } from "@module/migration/migrations/878-take-a-breather.ts";
import { Migration879DeviseAStratagemAndFriends } from "@module/migration/migrations/879-devise-a-stratagem-and-friends.ts";
import { Migration882SpellDataReorganization } from "@module/migration/migrations/882-spell-data-reorganization.ts";
import { Migration884UnifiedSpellcasting } from "@module/migration/migrations/884-unified-spellcasting.ts";
import { Migration886CrossbowGroup } from "@module/migration/migrations/886-crossbow-group.ts";
import { Migration887RedirectSpellLinks } from "@module/migration/migrations/887-redirect-spell-links.ts";
import { Migration888RemasterLanguagesHeritages } from "@module/migration/migrations/888-remaster-languages-heritages.ts";
import { Migration889RemoveFocusMaxIncreases } from "@module/migration/migrations/889-remove-focus-max-increases.ts";
import { Migration890RMClassItemClassDC } from "@module/migration/migrations/890-rm-class-item-class-dc.ts";
import { Migration891DruidicToWildsong } from "@module/migration/migrations/891-druidic-to-wildsong.ts";
import { Migration894NoLayOnHandsVsUndead } from "@module/migration/migrations/894-no-lay-on-hands-vs-undead.ts";
import { Migration895FixVariantSpellTraits } from "@module/migration/migrations/895-fix-variant-spell-traits.ts";
import { Migration896HealingDomains } from "@module/migration/migrations/896-healing-domains.ts";
import { Migration897ClearLayOnHandsDamage } from "@module/migration/migrations/897-clear-lay-on-hands-damage.ts";
import { Migration899ArmorShieldToShieldShield } from "@module/migration/migrations/899-armor-shields-to-shield-shields.ts";
// ^^^ don't let your IDE use the index in these imports. you need to specify the full path ^^^

const { window } = new JSDOM();
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLParagraphElement = window.HTMLParagraphElement;
globalThis.Text = window.Text;

const migrations: MigrationBase[] = [
    new Migration876FeatLevelTaken(),
    new Migration877PublicationData(),
    new Migration878TakeABreather(),
    new Migration879DeviseAStratagemAndFriends(),
    new Migration882SpellDataReorganization(),
    new Migration884UnifiedSpellcasting(),
    new Migration886CrossbowGroup(),
    new Migration887RedirectSpellLinks(),
    new Migration888RemasterLanguagesHeritages(),
    new Migration889RemoveFocusMaxIncreases(),
    new Migration890RMClassItemClassDC(),
    new Migration891DruidicToWildsong(),
    new Migration894NoLayOnHandsVsUndead(),
    new Migration895FixVariantSpellTraits(),
    new Migration896HealingDomains(),
    new Migration897ClearLayOnHandsDamage(),
    new Migration899ArmorShieldToShieldShield(),
];

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

                    const update = await migrationRunner.getUpdatedActor(source, migrationRunner.migrations);
                    delete (update.system as { _migrations?: object })._migrations;
                    pruneFlags(source);
                    pruneFlags(update);
                    for (const item of source.items) {
                        pruneFlags(item);
                    }

                    update.items = update.items.map((i) => mergeObject({}, i, { performDeletions: true }));
                    for (const updatedItem of update.items) {
                        delete (updatedItem.system as { _migrations?: object })._migrations;
                        if (updatedItem.type === "consumable" && !updatedItem.system.spell) {
                            delete (updatedItem.system as { spell?: object }).spell;
                        }
                        pruneFlags(updatedItem);
                    }

                    return mergeObject(source, update, { inplace: false, performDeletions: true });
                } else if (isItemData(source)) {
                    source.system.slug = sluggify(source.name);
                    const update = await migrationRunner.getUpdatedItem(source, migrationRunner.migrations);

                    delete (source.system as { slug?: string }).slug;
                    delete (update.system as { _migrations?: object })._migrations;
                    delete (update.system as { slug?: string }).slug;
                    if (update.type === "consumable" && !update.system.spell) {
                        delete (update.system as { spell?: null }).spell;
                    }
                    pruneFlags(source);
                    pruneFlags(update);

                    return mergeObject(source, update, { inplace: false, performDeletions: true });
                } else if (isJournalEntryData(source)) {
                    const update = await migrationRunner.getUpdatedJournalEntry(source, migrationRunner.migrations);
                    pruneFlags(source);
                    pruneFlags(update);
                    return mergeObject(source, update, { inplace: false, performDeletions: true });
                } else if (isMacroData(source)) {
                    const update = await migrationRunner.getUpdatedMacro(source, migrationRunner.migrations);
                    pruneFlags(source);
                    pruneFlags(update);
                    return mergeObject(source, update, { inplace: false, performDeletions: true });
                } else if (isTableData(source)) {
                    const update = await migrationRunner.getUpdatedTable(source, migrationRunner.migrations);
                    pruneFlags(source);
                    pruneFlags(update);
                    return mergeObject(source, update, { inplace: false, performDeletions: true });
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

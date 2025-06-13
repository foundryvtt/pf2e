import type { JournalEntrySource } from "@client/documents/_module.d.mts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Redirect links some to-be-deleted spells to replacements */
export class Migration887RedirectSpellLinks extends MigrationBase {
    static override version = 0.887;

    #spells = [
        {
            from: { _id: "kl2q6JvBZwed4B6v", name: "Dancing Lights" },
            to: { _id: "WBmvzNDfpwka3qT4", name: "Light" },
        },
        {
            from: { _id: "hkfH9Z53hPzcOwNB", name: "Veil" },
            to: { _id: "i35dpZFI7jZcRoBo", name: "Illusory Disguise" },
        },
        {
            from: { _id: "l4LFwY7iuzX6sDXr", name: "Commune with Nature" },
            to: { _id: "7DN13ILADW2N9Z1t", name: "Commune" },
        },
        {
            from: { _id: "OyFCwQuw8XRazsNr", name: "Remove Curse" },
            to: { _id: "SUKaxVZW2TlM8lu0", name: "Cleanse Affliction" },
        },
        {
            from: { _id: "RneiyehRO6f7LP44", name: "Remove Disease" },
            to: { _id: "SUKaxVZW2TlM8lu0", name: "Cleanse Affliction" },
        },
        {
            from: { _id: "c2bTWBNO1BYX4Zfg", name: "Misdirection" },
            to: { _id: "PRrZ7anETWPm90YY", name: "Disguise Magic" },
        },
    ];

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        for (const spell of this.#spells) {
            const { from, to } = spell;
            if ("game" in globalThis) {
                const isolatedUUID = new RegExp(String.raw`^Compendium\.pf2e\.spells-srd\.(?:Item\.)?${from._id}$`);
                source.system = recursiveReplaceString(source.system, (s) =>
                    s.replace(isolatedUUID, `Compendium.pf2e.spells-srd.Item.${to._id}`),
                );

                const { description } = source.system;
                description.value = description.value.replace(
                    `@UUID[Compendium.pf2e.spells-srd.Item.${from._id}]{${from.name}}`,
                    `@UUID[Compendium.pf2e.spells-srd.Item.${to._id}]{${to.name}}`,
                );
                description.gm &&= description.gm.replace(
                    `@UUID[Compendium.pf2e.spells-srd.Item.${from._id}]{${from.name}}`,
                    `@UUID[Compendium.pf2e.spells-srd.Item.${to._id}]{${to.name}}`,
                );
            } else {
                const isolatedUUID = new RegExp(String.raw`^Compendium\.pf2e\.spells-srd\.Item\.${from.name}$`);
                source.system = recursiveReplaceString(source.system, (s) =>
                    s.replace(isolatedUUID, `Compendium.pf2e.spells-srd.Item.${to.name}`),
                );

                const { description } = source.system;
                description.value = description.value.replaceAll(
                    `@UUID[Compendium.pf2e.spells-srd.Item.${from.name}]`,
                    `@UUID[Compendium.pf2e.spells-srd.Item.${to.name}]`,
                );
                description.gm &&= description.gm.replaceAll(
                    `@UUID[Compendium.pf2e.spells-srd.Item.${from.name}]`,
                    `@UUID[Compendium.pf2e.spells-srd.Item.${to.name}]`,
                );
            }
        }
    }

    override async updateJournalEntry(source: JournalEntrySource): Promise<void> {
        for (const spell of this.#spells) {
            const { from, to } = spell;
            for (const page of source.pages) {
                page.text.content &&= page.text.content.replace(
                    `@UUID[Compendium.pf2e.spells-srd.Item.${from._id}]{${from.name}}`,
                    `@UUID[Compendium.pf2e.spells-srd.Item.${to._id}]{${to.name}}`,
                );
                page.text.content &&= page.text.content.replace(
                    `@UUID[Compendium.pf2e.spells-srd.Item.${from.name}]`,
                    `@UUID[Compendium.pf2e.spells-srd.Item.${to.name}]`,
                );
            }
        }
    }
}

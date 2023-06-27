import { SkillAbbreviation } from "@actor/creature/data.ts";
import { Alignment } from "@actor/creature/types.ts";
import { DeityPF2e, ItemPF2e, SpellPF2e } from "@item";
import { ItemSheetPF2e } from "@item/sheet/base.ts";
import { ItemSheetDataPF2e } from "@item/sheet/data-types.ts";
import { SheetOptions, createSheetOptions } from "@module/sheet/helpers.ts";
import { ErrorPF2e, htmlClosest, htmlQuery, htmlQueryAll, tagify } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import * as R from "remeda";

export class DeitySheetPF2e extends ItemSheetPF2e<DeityPF2e> {
    static override get defaultOptions(): DocumentSheetOptions {
        return {
            ...super.defaultOptions,
            scrollY: [".item-details"],
            dragDrop: [{ dropSelector: ".sheet-header, .sheet-content" }],
        };
    }

    override async getData(options?: Partial<DocumentSheetOptions>): Promise<DeitySheetData> {
        const sheetData = await super.getData(options);

        const spellEntries = Object.entries(sheetData.data.spells);
        const spells = (await UUIDUtils.fromUUIDs(Object.values(sheetData.data.spells)))
            .filter((i): i is SpellPF2e => i instanceof SpellPF2e)
            .map((spell) => {
                const level = Number(spellEntries.find(([, uuid]) => uuid === spell.uuid)?.at(0));
                return { uuid: spell.uuid, level, name: spell.name, img: spell.img };
            })
            .sort((spellA, spellB) => spellA.level - spellB.level);

        return {
            ...sheetData,
            hasDetails: true,
            detailsTemplate: () => "systems/pf2e/templates/items/deity-details.hbs",
            alignments: CONFIG.PF2E.alignments,
            atheistic: this.item.category === "philosophy",
            skills: CONFIG.PF2E.skills,
            divineFonts: createSheetOptions(
                { harm: "PF2E.Item.Deity.DivineFont.Harm", heal: "PF2E.Item.Deity.DivineFont.Heal" },
                sheetData.data.font
            ),
            spells,
        };
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        // Create tagify selection inputs
        const html = $html.get(0)!;
        const getInput = (name: string): HTMLInputElement | null => html.querySelector(`input[name="${name}"]`);

        tagify(getInput("system.ability"), { whitelist: CONFIG.PF2E.abilities, maxTags: 2 });
        tagify(getInput("system.alignment.follower"), { whitelist: CONFIG.PF2E.alignments, maxTags: 9 });

        // Everything past this point requires a deity or pantheon
        if (this.item.category === "philosophy") return;

        tagify(getInput("system.weapons"), { whitelist: CONFIG.PF2E.baseWeaponTypes, maxTags: 2 });

        const domainWhitelist = R.omitBy(CONFIG.PF2E.deityDomains, (_v, k) => k.endsWith("-apocryphal"));
        tagify(getInput("system.domains.primary"), { whitelist: domainWhitelist, maxTags: 6 });
        tagify(getInput("system.domains.alternate"), { whitelist: domainWhitelist, maxTags: 6 });

        const clericSpells = htmlQuery(html, ".cleric-spells");
        if (!clericSpells) return;

        // View one of the spells
        for (const link of htmlQueryAll(clericSpells, "a[data-action=view-spell]")) {
            link.addEventListener("click", async (): Promise<void> => {
                const uuid = htmlClosest(link, "li")?.dataset.uuid ?? "";
                const spell = await fromUuid(uuid);
                if (!(spell instanceof SpellPF2e)) {
                    this.render(false);
                    return ui.notifications.error(`A spell with the UUID "${uuid}" no longer exists`);
                }

                spell.sheet.render(true);
            });
        }

        // Remove a stored spell reference
        for (const link of htmlQueryAll(clericSpells, "a[data-action=remove-spell]")) {
            link.addEventListener("click", async (): Promise<void> => {
                const uuidToRemove = htmlClosest(link, "li")?.dataset.uuid;
                const [levelToRemove] =
                    Object.entries(this.item.system.spells).find(([_level, uuid]) => uuid === uuidToRemove) ?? [];
                if (!levelToRemove) {
                    this.render(false);
                    return;
                }

                await this.item.update({ [`system.spells.-=${levelToRemove}`]: null });
            });
        }

        // Update the level of a spell
        const spellLevelInputs = htmlQueryAll<HTMLInputElement>(clericSpells, "input[data-action=update-spell-level]");
        for (const input of spellLevelInputs) {
            input.addEventListener("change", async (): Promise<void> => {
                const oldLevel = Number(input.dataset.level);
                const uuid = this.item.system.spells[oldLevel];
                // Shouldn't happen unless the sheet falls out of sync
                if (!uuid) {
                    this.render(false);
                    return;
                }

                const newLevel = Math.clamped(Number(input.value) || 1, 1, 10);
                if (oldLevel !== newLevel) {
                    await this.item.update({
                        [`system.spells.-=${oldLevel}`]: null,
                        [`system.spells.${newLevel}`]: uuid,
                    });
                }
            });
        }
    }

    override async _onDrop(event: ElementDragEvent): Promise<void> {
        if (!this.isEditable) return;

        const item = await (async (): Promise<ItemPF2e | null> => {
            try {
                const dataString = event.dataTransfer?.getData("text/plain");
                const dropData = JSON.parse(dataString ?? "");
                return (await ItemPF2e.fromDropData(dropData)) ?? null;
            } catch {
                return null;
            }
        })();
        if (!(item instanceof SpellPF2e)) throw ErrorPF2e("Invalid item drop on deity sheet");

        if (item.isCantrip || item.isFocusSpell || item.isRitual) {
            ui.notifications.error("PF2E.Item.Deity.ClericSpells.DropError", { localize: true });
            return;
        }

        await this.item.update({ [`system.spells.${item.level}`]: item.uuid });
    }

    /** Foundry inflexibly considers checkboxes to be booleans: set back to a string tuple for Divine Font */
    override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // Filter out null values from font that may have been inserted by Foundry's multi-checkbox handling
        if (Array.isArray(formData["system.font"])) {
            formData["system.font"] = formData["system.font"].filter((f) => !!f);
        }

        // Null out empty strings for some properties
        for (const property of ["system.alignment.own", "system.skill"]) {
            if (typeof formData[property] === "string") formData[property] ||= null;
        }

        return super._updateObject(event, formData);
    }
}

interface DeitySheetData extends ItemSheetDataPF2e<DeityPF2e> {
    alignments: Record<Alignment, string>;
    atheistic: boolean;
    skills: Record<SkillAbbreviation, string>;
    divineFonts: SheetOptions;
    spells: SpellBrief[];
}

interface SpellBrief {
    uuid: ItemUUID;
    level: number;
    name: string;
    img: ImageFilePath;
}

import { SkillAbbreviation } from "@actor/creature/data";
import { Alignment } from "@actor/creature/types";
import { DeityPF2e, ItemPF2e, SpellPF2e } from "@item";
import { ItemSheetPF2e } from "@item/sheet/base";
import { ItemSheetDataPF2e } from "@item/sheet/data-types";
import { createSheetOptions, SheetOptions } from "@module/sheet/helpers";
import { ErrorPF2e, tagify } from "@util";
import { fromUUIDs } from "@util/from-uuids";

export class DeitySheetPF2e<TItem extends DeityPF2e = DeityPF2e> extends ItemSheetPF2e<TItem> {
    static override get defaultOptions(): DocumentSheetOptions {
        return {
            ...super.defaultOptions,
            scrollY: [".item-details"],
            dragDrop: [{ dropSelector: ".sheet-header, .sheet-content" }],
        };
    }

    override async getData(options?: Partial<DocumentSheetOptions>): Promise<DeitySheetData> {
        const sheetData = super.getBaseData(options);

        const spellEntries = Object.entries(sheetData.data.spells);
        const spells = (await fromUUIDs(Object.values(sheetData.data.spells)))
            .filter((i): i is SpellPF2e => i instanceof SpellPF2e)
            .map((spell) => {
                const level = Number(spellEntries.find(([, uuid]) => uuid === spell.uuid)?.at(0));
                return { uuid: spell.uuid, level, name: spell.name, img: spell.img };
            })
            .sort((spellA, spellB) => spellA.level - spellB.level);

        return {
            ...sheetData,
            hasDetails: true,
            detailsTemplate: () => "systems/pf2e/templates/items/deity-details.html",
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

        tagify(getInput("data.ability"), { whitelist: CONFIG.PF2E.abilities, maxTags: 2 });
        tagify(getInput("data.alignment.follower"), { whitelist: CONFIG.PF2E.alignments, maxTags: 9 });

        // Everything past this point requires a deity or pantheon
        if (this.item.category === "philosophy") return;

        tagify(getInput("data.weapons"), { whitelist: CONFIG.PF2E.baseWeaponTypes, maxTags: 2 });
        tagify(getInput("data.domains.primary"), { whitelist: CONFIG.PF2E.deityDomains, maxTags: 4 });
        tagify(getInput("data.domains.alternate"), { whitelist: CONFIG.PF2E.deityDomains, maxTags: 4 });

        const $clericSpells = $html.find(".cleric-spells");
        // View one of the spells
        $clericSpells.find("a[data-action=view-spell]").on("click", async (event): Promise<void> => {
            const $target = $(event.currentTarget);
            const uuid = $target.closest("li").attr("data-uuid") ?? "";
            const spell = await fromUuid(uuid);
            if (!(spell instanceof SpellPF2e)) {
                this.render(false);
                return ui.notifications.error(`A spell with the UUID "${uuid}" no longer exists`);
            }

            spell.sheet.render(true);
        });

        // Remove a stored spell reference
        $clericSpells.find("a[data-action=remove-spell]").on("click", async (event): Promise<void> => {
            const $target = $(event.currentTarget);
            const uuidToRemove = $target.closest("li").attr("data-uuid") ?? "";
            const [levelToRemove] =
                Object.entries(this.item.system.spells).find(([_level, uuid]) => uuid === uuidToRemove) ?? [];
            if (!levelToRemove) {
                this.render(false);
                return;
            }

            await this.item.update({ [`data.spells.-=${levelToRemove}`]: null });
        });

        // Update the level of a spell
        $clericSpells
            .find<HTMLInputElement>("input[data-action=update-spell-level]")
            .on("change", async (event): Promise<void> => {
                const oldLevel = Number(event.target.dataset.level);
                const uuid = this.item.system.spells[oldLevel];
                // Shouldn't happen unless the sheet falls out of sync
                if (!uuid) {
                    this.render(false);
                    return;
                }

                const newLevel = Math.clamped(Number(event.target.value) || 1, 1, 10);
                if (oldLevel !== newLevel) {
                    await this.item.update({ [`data.spells.-=${oldLevel}`]: null, [`data.spells.${newLevel}`]: uuid });
                }
            });
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

        await this.item.update({ [`data.spells.${item.level}`]: item.uuid });
    }

    /** Foundry inflexibly considers checkboxes to be booleans: set back to a string tuple for Divine Font */
    override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // Null out empty strings for some properties
        for (const property of ["data.alignment.own", "data.skill"]) {
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
    img: ImagePath;
}

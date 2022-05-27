import { SkillAbbreviation } from "@actor/creature/data";
import { ItemPF2e, SpellPF2e } from "@item";
import { ItemSheetPF2e } from "@item/sheet/base";
import { ItemSheetDataPF2e } from "@item/sheet/data-types";
import { createSheetOptions, createSheetTags, SheetOptions } from "@module/sheet/helpers";
import { ErrorPF2e } from "@util";
import { DeityPF2e } from "./document";
import Tagify from "@yaireo/tagify";
import { fromUUIDs } from "@util/from-uuids";
import { Alignment } from "@actor/creature/types";

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
            followerAlignments: createSheetTags(CONFIG.PF2E.alignments, sheetData.data.alignment.follower),
            skills: CONFIG.PF2E.skills,
            divineFonts: createSheetOptions(
                { harm: "PF2E.Item.Deity.DivineFont.Harm", heal: "PF2E.Item.Deity.DivineFont.Heal" },
                sheetData.data.font
            ),
            spells,
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        // Create whitelist-enforced tagify selection inputs
        interface SheetTagifyOptions {
            whitelist: Record<string, string | { label: string }>;
            maxTags: number;
            dropdownSize: number;
        }

        const tagify = (inputName: string, { whitelist, maxTags, dropdownSize }: SheetTagifyOptions): void => {
            const input = $html[0].querySelector<HTMLInputElement>(`input[name="${inputName}"]`);
            if (!input) throw ErrorPF2e("Unexpected error looking up form element");
            new Tagify(input, {
                enforceWhitelist: true,
                skipInvalid: true,
                maxTags,
                dropdown: {
                    closeOnSelect: false,
                    enabled: 0,
                    maxItems: dropdownSize,
                    searchKeys: ["id", "value"],
                },
                whitelist: Object.entries(whitelist).map(([key, locPath]) => ({
                    id: key,
                    value: game.i18n.localize(typeof locPath === "string" ? locPath : locPath.label),
                })),
            });
        };

        tagify("data.ability", { whitelist: CONFIG.PF2E.abilities, maxTags: 2, dropdownSize: 6 });
        tagify("data.alignment.follower", { whitelist: CONFIG.PF2E.alignments, maxTags: 9, dropdownSize: 9 });
        tagify("data.weapons", { whitelist: CONFIG.PF2E.baseWeaponTypes, maxTags: 2, dropdownSize: 10 });
        tagify("data.domains.primary", { whitelist: CONFIG.PF2E.deityDomains, maxTags: 4, dropdownSize: 16 });
        tagify("data.domains.alternate", { whitelist: CONFIG.PF2E.deityDomains, maxTags: 4, dropdownSize: 16 });

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
                Object.entries(this.item.data.data.spells).find(([_level, uuid]) => uuid === uuidToRemove) ?? [];
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
                const uuid = this.item.data.data.spells[oldLevel];
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

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

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

        // Process Tagify outputs
        const inputNames = [
            "data.ability",
            "data.alignment.follower",
            "data.weapons",
            "data.domains.primary",
            "data.domains.alternate",
        ] as const;
        for (const path of inputNames) {
            const selections = formData[path];
            if (Array.isArray(selections)) {
                formData[path] = selections.map((w: { id: string }) => w.id);
            }
        }

        return super._updateObject(event, formData);
    }
}

interface DeitySheetData extends ItemSheetDataPF2e<DeityPF2e> {
    alignments: Record<Alignment, string>;
    followerAlignments: SheetOptions;
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

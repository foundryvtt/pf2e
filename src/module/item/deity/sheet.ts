import { Alignment, SkillAbbreviation } from "@actor/creature/data";
import { ItemSheetPF2e } from "@item/sheet/base";
import { ItemSheetDataPF2e, SheetOptions } from "@item/sheet/data-types";
import { DeityPF2e } from "./document";
import type * as TinyMCE from "tinymce";
import { ErrorPF2e } from "@util";
import { SpellPF2e } from "@item/spell";
import { ItemPF2e } from "@item";
import { fromUUIDs } from "@util/from-uuids";

export class DeitySheetPF2e extends ItemSheetPF2e<DeityPF2e> {
    #sidebarText = ["data.anathema", "data.edicts", "data.areasOfConcern"];

    static override get defaultOptions() {
        return {
            ...super.defaultOptions,
            scrollY: [".item-details"],
            dragDrop: [{ dropSelector: ".sheet-header, .sheet-content" }],
        };
    }

    override async getData(): Promise<DeitySheetData> {
        const sheetData = super.getBaseData();
        const spells = (await fromUUIDs(Object.values(sheetData.data.spells)))
            .map((spell) => {
                if (!(spell instanceof SpellPF2e)) {
                    throw ErrorPF2e(`Unexpected item referenced on deity ${this.item.name} (${this.item.uuid})`);
                }
                return spell;
            })
            .sort((spellA, spellB) => spellA.level - spellB.level);

        return {
            ...sheetData,
            hasDetails: true,
            hasSidebar: true,
            detailsTemplate: () => "systems/pf2e/templates/items/deity-details.html",
            sidebarTemplate: () => `systems/pf2e/templates/items/deity-sidebar.html`,
            alignments: CONFIG.PF2E.alignments,
            followerAlignments: this.prepareOptions(CONFIG.PF2E.alignments, sheetData.data.alignment.follower, {
                selectedOnly: true,
            }),
            abilities: this.prepareOptions(CONFIG.PF2E.abilities, sheetData.data.ability, { selectedOnly: true }),
            skills: CONFIG.PF2E.skills,
            favoredWeapons: this.prepareOptions(CONFIG.PF2E.baseWeaponTypes, sheetData.data.weapon, {
                selectedOnly: true,
            }),
            divineFonts: this.prepareOptions(
                { harm: "PF2E.Item.Deity.DivineFont.Harm", heal: "PF2E.Item.Deity.DivineFont.Heal" },
                sheetData.data.font
            ),
            spells,
        };
    }

    /** Close the sidebar editors when clicking outside of it */
    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        // Close the sidebar editors when the user clicks outside of them
        $html.find(".sheet-header, .sheet-content").on("click", (event) => {
            const openSidebarEditors = Object.entries(this.editors)
                .filter(([key, editor]) => this.#sidebarText.includes(key) && editor.active)
                .map(([_key, editor]) => editor);
            const $target = $(event.target);

            if (!($target.is("a") || $target.parents().is("a"))) {
                for (const editor of openSidebarEditors) {
                    editor.options.save_onsavecallback?.();
                }
            }
        });

        const $clericSpells = $html.find(".cleric-spells");
        // View one of the spells
        $clericSpells.find('a[data-action="view-spell"]').on("click", async (event) => {
            const $target = $(event.currentTarget);
            const uuid = $target.closest("li").attr("data-uuid") ?? "";
            const spell = await fromUuid(uuid);
            if (!(spell instanceof SpellPF2e)) {
                throw ErrorPF2e(`A spell with the UUID "${uuid}" no longer exists`);
            }
            spell.sheet.render(true);
        });

        // Remove a stored spell reference
        $clericSpells.find('a[data-action="remove-spell"]').on("click", (event) => {
            const $target = $(event.currentTarget);
            const uuidToRemove = $target.closest("li").attr("data-uuid") ?? "";
            const [keyToRemove] =
                Object.entries(this.item.data.data.spells).find(([_level, uuid]) => uuid === uuidToRemove) ?? [];
            if (!keyToRemove) return;
            this.item.update({ [`data.spells.-=${keyToRemove}`]: null });
        });
    }

    /** Hide the toolbar for the smaller sidebar editors */
    override activateEditor(name: string, options: Partial<TinyMCE.EditorSettings> = {}, initialContent = ""): void {
        if (this.#sidebarText.includes(name)) {
            options.toolbar = "";
            options.plugins = "paste";
            options.paste_as_text = true;
            options.body_class = "pf2e sidebar-text";
            if (typeof options.height === "number") options.height *= 1.5;
        }
        super.activateEditor(name, options, initialContent);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override async _onDrop(event: ElementDragEvent): Promise<void> {
        const item: ItemPF2e | null = await (async () => {
            try {
                const dataString = event.dataTransfer?.getData("text/plain");
                const dropData = JSON.parse(dataString ?? "");
                return (await ItemPF2e.fromDropData(dropData)) ?? null;
            } catch {
                return null;
            }
        })();
        if (!(item instanceof SpellPF2e)) {
            throw ErrorPF2e("Invalid item drop on deity sheet");
        }
        if (item.isCantrip || item.isFocusSpell || item.isRitual) {
            console.warn("PF2e System | A deity's cleric spells cannot be a cantrip, focus spell, or ritual.");
            return;
        }
        this.item.update({ [`data.spells.${item.level}`]: item.uuid });
    }

    /** Foundry inflexibly considers checkboxes to be booleans: set back to a string tuple for Divine Font */
    override async _updateObject(event: Event, formData: Record<string, unknown>) {
        if (Array.isArray(formData["data.font"])) {
            formData["data.font"] = [
                formData["data.font"][0] ? "harm" : [],
                formData["data.font"][1] ? "heal" : [],
            ].flat();
        }
        await super._updateObject(event, formData);
    }
}

interface DeitySheetData extends ItemSheetDataPF2e<DeityPF2e> {
    alignments: Record<Alignment, string>;
    followerAlignments: SheetOptions;
    abilities: SheetOptions;
    skills: Record<SkillAbbreviation, string>;
    favoredWeapons: SheetOptions;
    divineFonts: SheetOptions;
    spells: SpellPF2e[];
}

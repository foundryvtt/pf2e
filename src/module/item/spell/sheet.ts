import { ActorPF2e } from "@actor";
import { SpellPF2e, SpellSystemSource } from "@item/spell/index.ts";
import { OneToTen } from "@module/data.ts";
import { TraitTagifyEntry, createTagifyTraits } from "@module/sheet/helpers.ts";
import { DamageCategoryUnique } from "@system/damage/types.ts";
import { DAMAGE_CATEGORIES_UNIQUE } from "@system/damage/values.ts";
import {
    ErrorPF2e,
    fontAwesomeIcon,
    getActionGlyph,
    htmlClosest,
    htmlQuery,
    htmlQueryAll,
    objectHasKey,
    tagify,
    tupleHasValue,
} from "@util";
import * as R from "remeda";
import { ItemSheetDataPF2e, ItemSheetPF2e } from "../base/sheet/base.ts";
import { SpellDamage, SpellHeighteningInterval, SpellSystemData } from "./data.ts";

/** Set of properties that are legal for the purposes of spell overrides */
const spellOverridable: Partial<Record<keyof SpellSystemData, string>> = {
    traits: "PF2E.Traits",
    time: "PF2E.SpellTimeLabel",
    components: "PF2E.SpellComponentsLabel",
    target: "PF2E.SpellTargetLabel",
    area: "PF2E.AreaLabel",
    range: "PF2E.SpellRangeLabel",
    damage: "PF2E.DamageLabel",
};

export class SpellSheetPF2e extends ItemSheetPF2e<SpellPF2e> {
    override get id(): string {
        const baseId = super.id;
        const appliedOverlays = this.item.appliedOverlays;
        if (this.item.isVariant && appliedOverlays) {
            return `${baseId}-${[...appliedOverlays.keys()].join("-")}`;
        }
        return baseId;
    }

    override async getData(options?: Partial<DocumentSheetOptions>): Promise<SpellSheetData> {
        const sheetData = await super.getData(options);
        const { isCantrip, isFocusSpell, isRitual } = this.item;

        // Create a level label to show in the summary.
        // This one is a longer version than the chat card
        const itemType =
            isCantrip && isFocusSpell
                ? game.i18n.localize("PF2E.SpellCategoryFocusCantrip")
                : this.item.isCantrip
                ? game.i18n.localize("PF2E.TraitCantrip")
                : game.i18n.localize(CONFIG.PF2E.spellCategories[this.item.system.category.value]);

        const damageTypes = Object.fromEntries(
            Object.entries(CONFIG.PF2E.damageTypes)
                .map(([slug, localizeKey]): [string, string] => [slug, game.i18n.localize(localizeKey)])
                .sort((damageA, damageB) => damageA[1].localeCompare(damageB[1])),
        );

        const variants = this.item.overlays.overrideVariants
            .map((variant) => ({
                name: variant.name,
                id: variant.id,
                sort: variant.sort,
                actions: getActionGlyph(variant.system.time.value),
            }))
            .sort((variantA, variantB) => variantA.sort - variantB.sort);

        return {
            ...sheetData,
            hasSidebar: true,
            itemType,
            isCantrip,
            isFocusSpell,
            isRitual,
            variants,
            isVariant: this.item.isVariant,
            spellCategories: CONFIG.PF2E.spellCategories,
            spellTypes: CONFIG.PF2E.spellTypes,
            saves: CONFIG.PF2E.saves,
            magicSchools: CONFIG.PF2E.magicSchools,
            damageTypes,
            damageSubtypes: R.pick(CONFIG.PF2E.damageCategories, [...DAMAGE_CATEGORIES_UNIQUE]),
            damageCategories: CONFIG.PF2E.damageCategories,
            spellComponents: this.#formatSpellComponents(sheetData.data),
            areaSizes: CONFIG.PF2E.areaSizes,
            areaTypes: CONFIG.PF2E.areaTypes,
            heightenIntervals: [1, 2, 3, 4],
            heightenOverlays: this.#prepareHeighteningLevels(),
            canHeighten: this.getAvailableHeightenLevels().length > 0,
        };
    }

    static override get defaultOptions(): DocumentSheetOptions {
        return {
            ...super.defaultOptions,
            dragDrop: [{ dragSelector: "[data-variant-id]", dropSelector: "[data-can-drop=true]" }],
        };
    }

    override get title(): string {
        return this.item.isVariant
            ? game.i18n.format("PF2E.Item.Spell.Variants.SheetTitle", { originalName: this.item.original!.name })
            : super.title;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0]!;

        tagify(html.querySelector('input[name="system.traditions.value"]'), { whitelist: CONFIG.PF2E.magicTraditions });
        for (const tags of htmlQueryAll<HTMLInputElement>(html, "input.spell-traits")) {
            tagify(tags, { whitelist: CONFIG.PF2E.spellTraits });
        }

        $html.find(".toggle-trait").on("change", (evt) => {
            const target = evt.target as HTMLInputElement;
            const trait = target.dataset.trait ?? "";
            if (!objectHasKey(CONFIG.PF2E.spellTraits, trait)) {
                console.warn("Toggled trait is invalid");
                return;
            }

            if (target.checked && !this.item.traits.has(trait)) {
                const newTraits = this.item.system.traits.value.concat([trait]);
                this.item.update({ "system.traits.value": newTraits });
            } else if (!target.checked && this.item.traits.has(trait)) {
                const newTraits = this.item.system.traits.value.filter((t) => t !== trait);
                this.item.update({ "system.traits.value": newTraits });
            }
        });

        $html.find("[data-action=damage-create]").on("click", (event) => {
            event.preventDefault();
            const overlayData = this.#getOverlayFromElement(event.target);
            const baseKey = overlayData?.base ?? "system";
            const emptyDamage: SpellDamage = { value: "", type: { value: "bludgeoning", categories: [] } };
            this.item.update({ [`${baseKey}.damage.value.${randomID()}`]: emptyDamage });
        });

        $html.find("[data-action=damage-delete]").on("click", (event) => {
            event.preventDefault();
            const overlayData = this.#getOverlayFromElement(event.target);
            const baseKey = overlayData?.base ?? "system";
            const id = $(event.target).closest("[data-action=damage-delete]").attr("data-id");
            if (id) {
                const values = { [`${baseKey}.damage.value.-=${id}`]: null };
                if (!overlayData) {
                    values[`${baseKey}.heightening.damage.-=${id}`] = null;
                }
                this.item.update(values);
            }
        });

        for (const button of htmlQueryAll(html, "[data-action=heightening-interval-create]")) {
            button.addEventListener("click", (event) => {
                event.preventDefault();
                const baseKey = this.#getOverlayFromElement(event.target)?.base ?? "system";
                const data: SpellHeighteningInterval = {
                    type: "interval",
                    interval: 1,
                    damage: R.mapToObj(Object.keys(this.item.system.damage.value), (key) => [key, "0"]),
                };
                this.item.update({ [`${baseKey}.heightening`]: data });
            });
        }

        // Event used to delete all heightening, not just a particular one
        $html.find("[data-action=heightening-delete]").on("click", () => {
            this.item.update({ "system.-=heightening": null });
        });

        $html.find("[data-action=heightening-fixed-create]").on("click", () => {
            const highestLevel = this.item.getHeightenLayers().at(-1)?.level;
            const available = this.getAvailableHeightenLevels();
            const level = highestLevel && highestLevel < 10 ? highestLevel + 1 : available.at(0);
            if (level === undefined) return;

            this.item.update({ "system.heightening": { type: "fixed", levels: { [level]: {} } } });
        });

        // Add event handlers for heighten type overlays
        for (const overlayEditor of htmlQueryAll(html, "[data-overlay-type=heighten]")) {
            const overlay = this.#getOverlayFromElement(overlayEditor);
            if (!overlay) continue;

            htmlQuery(overlayEditor, "[data-action=overlay-delete]")?.addEventListener("click", () => {
                // If this is the last heighten overlay, delete all of it
                if (overlay.type === "heighten") {
                    const layers = this.item.getHeightenLayers();
                    if (layers.length === 1 && layers[0].level === overlay.level) {
                        this.item.update({ "system.-=heightening": null });
                        return;
                    }
                }

                const parts = overlay.base.split(".");
                parts.push(`-=${parts.pop()}`);
                this.item.update({ [parts.join(".")]: null });
            });

            // Handle adding properties to overlays
            for (const addProperty of htmlQueryAll(overlayEditor, "[data-action=overlay-add-property]")) {
                const property = addProperty.dataset.property;
                if (!overlay.system || !property || property in overlay.system) continue;
                addProperty.addEventListener("click", () => {
                    try {
                        const value = this.#getDefaultProperty(property);
                        this.item.update({ [`${overlay.base}.${property}`]: value });
                    } catch (ex) {
                        if (ex instanceof Error) {
                            ui.notifications.error(ex.message);
                        }
                    }
                });
            }

            // Handle deleting properties from overlays
            for (const removeProperty of htmlQueryAll(overlayEditor, "[data-action=overlay-remove-property]")) {
                const property = removeProperty.dataset.property;
                if (!property) continue;
                removeProperty.addEventListener("click", () => {
                    const updates = { [`${overlay.base}.-=${property}`]: null };
                    if (property === "damage") {
                        updates[`${overlay.base}.-=heightening`] = null;
                    }
                    this.item.update(updates);
                });
            }

            const levelSelect = htmlQuery<HTMLSelectElement>(overlayEditor, "[data-action=change-heighten-level]");
            levelSelect?.addEventListener("change", () => {
                const newLevel = Number(levelSelect.value);
                const existingData = this.item.getHeightenLayers().find((layer) => layer.level === overlay.level);
                this.item.update({
                    [`system.heightening.levels.-=${overlay.level}`]: null,
                    [`system.heightening.levels.${newLevel}`]: existingData?.system ?? {},
                });
            });
        }

        $html.find("[data-action=variant-create]").on("click", () => {
            this.item.overlays.create("override");
        });

        $html.find("[data-action=variant-edit]").on("click", (event) => {
            const id = $(event.target).closest("[data-action=variant-edit]").attr("data-id");
            if (id) {
                this.item.loadVariant({ overlayIds: [id] })?.sheet.render(true);
            }
        });

        $html.find("[data-action=variant-delete]").on("click", (event) => {
            const id = $(event.target).closest("[data-action=variant-delete]").attr("data-id");
            if (id) {
                const variant = this.item.loadVariant({ overlayIds: [id] });
                if (!variant) {
                    throw ErrorPF2e(
                        `Spell ${this.item.name} (${this.item.uuid}) does not have a variant with id: ${id}`,
                    );
                }
                new Dialog({
                    title: game.i18n.localize("PF2E.Item.Spell.Variants.DeleteDialogTitle"),
                    content: `<p>${game.i18n.format("PF2E.Item.Spell.Variants.DeleteDialogText", {
                        variantName: variant.name,
                    })}</p>`,
                    buttons: {
                        delete: {
                            icon: fontAwesomeIcon("fa-trash").outerHTML,
                            label: game.i18n.localize("PF2E.DeleteShortLabel"),
                            callback: () => {
                                this.item.overlays.deleteOverlay(id);
                            },
                        },
                        cancel: {
                            icon: fontAwesomeIcon("fa-times").outerHTML,
                            label: game.i18n.localize("Cancel"),
                        },
                    },
                    default: "cancel",
                }).render(true);
            }
        });
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // Set defaults for area properties or otherwise null out
        if (formData["system.area.value"]) {
            formData["system.area.type"] ||= "burst";
        } else {
            delete formData["system.area.value"];
            delete formData["system.area.type"];
            formData["system.area"] = null;
        }

        // Handle closing of override spell variant sheets
        if (this.item.original && this.item.appliedOverlays!.has("override") && !this.rendered) {
            await this.item.original.overlays.updateOverride(this.item as SpellPF2e<ActorPF2e>, formData);
            return;
        }

        super._updateObject(event, formData);
    }

    protected override _onDragStart(event: ElementDragEvent): void {
        const id = event.target.closest<HTMLElement>(".variant")?.dataset.variantId ?? "";
        event.dataTransfer.setData("text/plain", JSON.stringify({ action: "sort", data: { sourceId: id } }));
    }

    protected override async _onDrop(event: ElementDragEvent): Promise<void> {
        event.preventDefault();
        const transferString = event.dataTransfer.getData("text/plain");
        if (!transferString) return;

        const { action, data } = (JSON.parse(transferString) ?? {}) as { action?: string; data?: { sourceId: string } };

        switch (action) {
            case "sort": {
                // Sort spell variants
                const sourceId = data?.sourceId ?? "";
                const targetId = event.target.closest<HTMLElement>(".variant")?.dataset.variantId ?? "";
                if (sourceId && targetId && sourceId !== targetId) {
                    const sourceVariant = this.item.loadVariant({ overlayIds: [sourceId] });
                    const targetVariant = this.item.loadVariant({ overlayIds: [targetId] });
                    if (sourceVariant && targetVariant) {
                        // Workaround for SortingHelpers.performIntegerSort using object comparison to find the target
                        const siblings = this.item.overlays.overrideVariants.filter(
                            (variant) => variant.id !== sourceId && variant.id !== targetId,
                        );
                        siblings.push(targetVariant);

                        const sorting = SortingHelpers.performIntegerSort(sourceVariant, {
                            target: targetVariant,
                            siblings,
                            sortKey: "sort",
                            sortBefore: true,
                        });
                        for (const s of sorting) {
                            await this.item.overlays.updateOverride(s.target, s.update, { render: false });
                        }
                        this.render(true);
                    }
                }
                break;
            }
        }
    }

    private getAvailableHeightenLevels() {
        const heightenLayers = this.item.getHeightenLayers();
        return [2, 3, 4, 5, 6, 7, 8, 9, 10].filter(
            (level) => level > this.item.baseRank && !heightenLayers.some((layer) => layer.level === level),
        );
    }

    #getOverlayFromElement(target: HTMLElement | EventTarget | null): SpellSheetOverlayData | null {
        const overlayEl = htmlClosest(target, "[data-overlay-type]");
        if (!overlayEl) return null;

        const domData = overlayEl.dataset;
        const type = String(domData.overlayType);
        if (!tupleHasValue(["heighten", "variant"] as const, type)) {
            return null;
        }

        const id = "overlayId" in domData ? String(domData.overlayId) : null;
        const level = "level" in domData ? Number(domData.level) : null;
        const collectionPath = type === "heighten" ? "system.heightening.levels" : "system.variants";
        const base = type === "heighten" ? `${collectionPath}.${level}` : `${collectionPath}.${id}`;

        const system = (() => {
            if (type === "heighten") {
                const heightening = this.item.system.heightening;
                if (heightening?.type === "fixed") {
                    return heightening.levels[level as OneToTen];
                }
            }

            return null; // variants not supported yet
        })();

        return { id, level, type, base, dataPath: base, system };
    }

    /**
     * Retrieve the default value for this property.
     * The default attempts to reuse the most recent heightened value, or what's on the spell, but certain properties
     * have alternative defaults.
     */
    #getDefaultProperty(property: string): unknown {
        const scaling = this.item.getHeightenLayers().reverse();
        const baseValue = (() => {
            for (const entry of [...scaling, { system: this.item.system }]) {
                if (objectHasKey(entry.system, property)) {
                    return entry.system[property];
                }
            }

            return null;
        })();

        if (baseValue) {
            return baseValue;
        } else if (property === "area") {
            return { value: 5, type: "burst" } satisfies SpellSystemSource["area"];
        }

        throw ErrorPF2e(`Failed to initialize property ${property} for overlay`);
    }

    #formatSpellComponents(data: SpellSystemData): string[] {
        if (!data.components) return [];
        const comps: string[] = [];
        if (data.components.focus) comps.push(game.i18n.localize(CONFIG.PF2E.spellComponents.F));
        if (data.components.material) comps.push(game.i18n.localize(CONFIG.PF2E.spellComponents.M));
        if (data.components.somatic) comps.push(game.i18n.localize(CONFIG.PF2E.spellComponents.S));
        if (data.components.verbal) comps.push(game.i18n.localize(CONFIG.PF2E.spellComponents.V));
        if (data.materials.value) comps.push(data.materials.value);
        return comps;
    }

    #prepareHeighteningLevels(): SpellSheetHeightenOverlayData[] {
        const spell = this.item;
        const layers = spell.getHeightenLayers();

        return layers.map((layer) => {
            const base = `system.heightening.levels.${layer.level}`;
            const missing: SpellSheetHeightenOverlayData["missing"] = [];
            for (const [key, label] of Object.entries(spellOverridable)) {
                if (key in layer.system) continue;
                missing.push({ key: key as keyof SpellSystemData, label });
            }

            return {
                id: null,
                type: "heighten",
                level: layer.level,
                base,
                dataPath: base,
                system: layer.system,
                missing,
                heightenLevels: [layer.level, ...this.getAvailableHeightenLevels()].sort(),
                traits: layer.system.traits?.value
                    ? createTagifyTraits(layer.system.traits.value, { record: CONFIG.PF2E.spellTraits })
                    : null,
            };
        });
    }
}

interface SpellSheetData extends ItemSheetDataPF2e<SpellPF2e> {
    isCantrip: boolean;
    isFocusSpell: boolean;
    isRitual: boolean;
    isVariant: boolean;
    variants: {
        name: string;
        id: string;
        sort: number;
        actions: string;
    }[];
    magicSchools: ConfigPF2e["PF2E"]["magicSchools"];
    spellCategories: ConfigPF2e["PF2E"]["spellCategories"];
    spellTypes: ConfigPF2e["PF2E"]["spellTypes"];
    saves: ConfigPF2e["PF2E"]["saves"];
    damageCategories: ConfigPF2e["PF2E"]["damageCategories"];
    damageTypes: Record<string, string>;
    damageSubtypes: Pick<ConfigPF2e["PF2E"]["damageCategories"], DamageCategoryUnique>;
    spellComponents: string[];
    areaSizes: ConfigPF2e["PF2E"]["areaSizes"];
    areaTypes: ConfigPF2e["PF2E"]["areaTypes"];
    heightenIntervals: number[];
    heightenOverlays: SpellSheetHeightenOverlayData[];
    canHeighten: boolean;
}

interface SpellSheetOverlayData {
    id: string | null;
    /** Base path to the property, dot delimited */
    base: string;
    /** Base path to the spell override data, dot delimited. Currently this is the same as base */
    dataPath: string;
    level: number | null;
    type: "heighten" | "variant";
    system: Partial<SpellSystemSource> | null;
}

interface SpellSheetHeightenOverlayData extends SpellSheetOverlayData {
    system: Partial<SpellSystemSource>;
    heightenLevels: number[];
    missing: { key: keyof SpellSystemData; label: string }[];
    traits?: TraitTagifyEntry[] | null;
}

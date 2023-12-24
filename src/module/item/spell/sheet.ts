import type { ActorPF2e } from "@actor";
import { ItemSheetDataPF2e, ItemSheetOptions, ItemSheetPF2e } from "@item/base/sheet/sheet.ts";
import { OneToTen } from "@module/data.ts";
import { TraitTagifyEntry, createTagifyTraits } from "@module/sheet/helpers.ts";
import { DamageCategoryUnique, DamageType } from "@system/damage/types.ts";
import { DAMAGE_CATEGORIES_UNIQUE } from "@system/damage/values.ts";
import {
    ErrorPF2e,
    fontAwesomeIcon,
    getActionGlyph,
    htmlClosest,
    htmlQuery,
    htmlQueryAll,
    objectHasKey,
    sortStringRecord,
    tagify,
    tupleHasValue,
} from "@util";
import * as R from "remeda";
import { createDescriptionPrepend, createSpellRankLabel } from "./helpers.ts";
import type {
    SpellDamageSource,
    SpellHeighteningInterval,
    SpellPF2e,
    SpellSystemData,
    SpellSystemSource,
} from "./index.ts";
import { MAGIC_TRADITIONS } from "./values.ts";

/** Set of properties that are legal for the purposes of spell overrides */
const spellOverridable: Partial<Record<keyof SpellSystemData, string>> = {
    traits: "PF2E.Traits",
    time: "PF2E.Item.Spell.Cast",
    target: "PF2E.SpellTargetLabel",
    area: "PF2E.AreaLabel",
    range: "PF2E.SpellRangeLabel",
    damage: "PF2E.DamageLabel",
};

export class SpellSheetPF2e extends ItemSheetPF2e<SpellPF2e> {
    static override get defaultOptions(): ItemSheetOptions {
        return {
            ...super.defaultOptions,
            dragDrop: [{ dragSelector: "[data-variant-id]", dropSelector: "[data-can-drop=true]" }],
        };
    }

    override get id(): string {
        const baseId = super.id;
        const appliedOverlays = this.item.appliedOverlays;
        if (this.item.isVariant && appliedOverlays) {
            return `${baseId}-${[...appliedOverlays.keys()].join("-")}`;
        }
        return baseId;
    }

    protected override get validTraits(): Record<string, string> | null {
        return R.omit(CONFIG.PF2E.Item.traits.spell, Array.from(MAGIC_TRADITIONS));
    }

    override async getData(options?: Partial<ItemSheetOptions>): Promise<SpellSheetData> {
        const sheetData = await super.getData(options);
        const spell = this.item;

        const descriptionPrepend = await createDescriptionPrepend(spell, { includeTraditions: true });
        sheetData.enrichedContent.description = `${descriptionPrepend}${sheetData.enrichedContent.description}`;

        const variants = spell.overlays.overrideVariants
            .map((variant) => ({
                name: variant.name,
                variantId: variant.variantId,
                sort: variant.sort,
                actions: getActionGlyph(variant.system.time.value),
            }))
            .sort((a, b) => a.sort - b.sort);

        const passiveDefense = ((): string | null => {
            const statistic = spell.system.defense?.passive?.statistic;
            switch (statistic) {
                case "ac":
                    return "PF2E.Check.DC.Specific.armor";
                case "fortitude-dc":
                    return "PF2E.Check.DC.Specific.fortitude";
                case "reflex-dc":
                    return "PF2E.Check.DC.Specific.reflex";
                case "will-dc":
                    return "PF2E.Check.DC.Specific.will";
                default:
                    return null;
            }
        })();

        const damageKinds = R.mapValues(spell.system.damage, (damage, id) => {
            const healingDisabled = !["vitality", "void", "untyped"].includes(damage.type) || !!damage.category;
            const currentKinds = Array.from(spell.system.damage[id].kinds);
            return [
                {
                    value: ["damage"],
                    label: "PF2E.DamageLabel",
                    selected: R.equals(currentKinds, ["damage"]),
                    disabled: false,
                },
                {
                    value: ["healing"],
                    label: "PF2E.TraitHealing",
                    selected: R.equals(currentKinds, ["healing"]),
                    disabled: healingDisabled,
                },
                {
                    value: ["damage", "healing"],
                    label: "PF2E.Damage.Kind.Both.Label",
                    selected: R.equals(currentKinds, ["damage", "healing"]),
                    disabled: healingDisabled,
                },
            ];
        });

        return {
            ...sheetData,
            itemType: createSpellRankLabel(this.item),
            passiveDefense,
            variants,
            isVariant: this.item.isVariant,
            damageTypes: sortStringRecord(CONFIG.PF2E.damageTypes),
            damageSubtypes: R.pick(CONFIG.PF2E.damageCategories, [...DAMAGE_CATEGORIES_UNIQUE]),
            damageKinds,
            materials: CONFIG.PF2E.materialDamageEffects,
            areaSizes: CONFIG.PF2E.areaSizes,
            areaTypes: CONFIG.PF2E.areaTypes,
            heightenIntervals: [1, 2, 3, 4],
            heightenOverlays: this.#prepareHeighteningLevels(),
            canHeighten: this.isEditable && this.getAvailableHeightenLevels().length > 0,
        };
    }

    override get title(): string {
        return this.item.isVariant
            ? game.i18n.format("PF2E.Item.Spell.Variants.SheetTitle", { originalName: this.item.original?.name ?? "" })
            : super.title;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        // Prevent editing of spell variants' levels
        if (this.isEditable && this.item.isVariant) {
            const levelInput = htmlQuery<HTMLInputElement>(html, 'input[name="system.level.value"');
            if (levelInput) levelInput.readOnly = true;
        }

        tagify(html.querySelector('input[name="system.traits.traditions"]'), {
            whitelist: CONFIG.PF2E.magicTraditions,
        });

        for (const anchor of htmlQueryAll(html, "a[data-action=add-damage-partial]")) {
            anchor.addEventListener("click", () => {
                const overlayData = this.#getOverlayFromElement(anchor);
                const baseKey = overlayData?.base ?? "system";
                const emptyDamage: SpellDamageSource = {
                    formula: "",
                    kinds: ["damage"],
                    type: "bludgeoning",
                    category: null,
                    materials: [],
                };
                this.item.update({ [`${baseKey}.damage.${fu.randomID()}`]: emptyDamage });
            });
        }

        for (const anchor of htmlQueryAll(html, "a[data-action=delete-damage-partial]")) {
            anchor.addEventListener("click", () => {
                const overlayData = this.#getOverlayFromElement(anchor);
                const baseKey = overlayData?.base ?? "system";
                const key = anchor.dataset.id;
                if (key) {
                    const values = { [`${baseKey}.damage.-=${key}`]: null };
                    if (!overlayData) {
                        values[`${baseKey}.heightening.damage.-=${key}`] = null;
                    }
                    this.item.update(values);
                }
            });
        }

        htmlQuery(html, "button[data-action=add-interval-heightening]")?.addEventListener("click", (event) => {
            event.preventDefault();
            const baseKey = this.#getOverlayFromElement(event.target)?.base ?? "system";
            const data: SpellHeighteningInterval = {
                type: "interval",
                interval: 1,
                damage: R.mapToObj(Object.keys(this.item.system.damage), (key) => [key, "0"]),
            };
            this.item.update({ [`${baseKey}.heightening`]: data });
        });

        htmlQuery(html, "button[data-action=add-fixed-heightening]")?.addEventListener("click", () => {
            const highestLevel = this.item.getHeightenLayers().at(-1)?.level;
            const available = this.getAvailableHeightenLevels();
            const level = highestLevel && highestLevel < 10 ? highestLevel + 1 : available.at(0);
            if (level === undefined) return;

            this.item.update({ "system.heightening": { type: "fixed", levels: { [level]: {} } } });
        });

        // Event used to delete all heightening, not just a particular one
        htmlQuery(html, "a[data-action=delete-heightening]")?.addEventListener("click", () => {
            this.item.update({ "system.-=heightening": null });
        });

        // Add event handlers for heighten type overlays
        for (const overlayEditor of htmlQueryAll(html, "[data-overlay-type=heighten]")) {
            const overlay = this.#getOverlayFromElement(overlayEditor);
            if (!overlay) continue;

            htmlQuery(overlayEditor, "a[data-action=delete-overlay]")?.addEventListener("click", () => {
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
            for (const addProperty of htmlQueryAll(overlayEditor, "button[data-action=add-overlay-property]")) {
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
            for (const removeProperty of htmlQueryAll(overlayEditor, "a[data-action=delete-overlay-property]")) {
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

            const levelSelect = htmlQuery<HTMLSelectElement>(
                overlayEditor,
                "select[data-action=change-heighten-level]",
            );
            levelSelect?.addEventListener("change", () => {
                const newLevel = Number(levelSelect.value);
                const existingData = this.item.getHeightenLayers().find((layer) => layer.level === overlay.level);
                this.item.update({
                    [`system.heightening.levels.-=${overlay.level}`]: null,
                    [`system.heightening.levels.${newLevel}`]: existingData?.system ?? {},
                });
            });
        }

        htmlQuery(html, "a[data-action=variant-create]")?.addEventListener("click", () => {
            this.item.overlays.create("override");
        });

        for (const anchor of htmlQueryAll(html, "a[data-action=edit-variant]")) {
            anchor.addEventListener("click", () => {
                const overlayId = anchor.dataset.id;
                if (overlayId) {
                    this.item.loadVariant({ overlayIds: [overlayId] })?.sheet.render(true);
                }
            });
        }

        for (const anchor of htmlQueryAll(html, "a[data-action=delete-variant]")) {
            anchor.addEventListener("click", () => {
                const id = anchor.dataset.id;
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

        const ritualCheckbox = htmlQuery<HTMLInputElement>(html, "input[data-action=toggle-ritual-data]");
        ritualCheckbox?.addEventListener("click", async (event) => {
            event.preventDefault();
            ritualCheckbox.readOnly = true;

            await this.item.update({
                "system.ritual": this.item.system.ritual
                    ? null
                    : { primary: { check: "" }, secondary: { checks: "", casters: 0 } },
            });
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
        if (this.item.original && this.item.appliedOverlays?.has("override") && !this.rendered) {
            await this.item.original.overlays.updateOverride(this.item as SpellPF2e<ActorPF2e>, formData);
            return;
        }

        super._updateObject(event, formData);
    }

    protected override _onDragStart(event: DragEvent): void {
        const id = htmlClosest(event.target, ".variant")?.dataset.variantId ?? "";
        event.dataTransfer?.setData("text/plain", JSON.stringify({ action: "sort", data: { sourceId: id } }));
    }

    protected override async _onDrop(event: DragEvent): Promise<void> {
        event.preventDefault();
        const transferString = event.dataTransfer?.getData("text/plain");
        if (!transferString) return;

        const { action, data } = (JSON.parse(transferString) ?? {}) as { action?: string; data?: { sourceId: string } };

        switch (action) {
            case "sort": {
                // Sort spell variants
                const sourceId = data?.sourceId ?? "";
                const targetId = htmlClosest(event.target, ".variant")?.dataset.variantId ?? "";
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
                    return heightening.levels[level as OneToTen] ?? null;
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
            for (const entry of [...scaling, { system: fu.deepClone(this.item._source.system) }]) {
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
    passiveDefense: string | null;
    isVariant: boolean;
    variants: {
        name: string;
        variantId: string | null;
        sort: number;
        actions: string;
    }[];
    materials: typeof CONFIG.PF2E.materialDamageEffects;
    damageTypes: Record<DamageType, string>;
    damageSubtypes: Pick<typeof CONFIG.PF2E.damageCategories, DamageCategoryUnique>;
    damageKinds: Record<string, { value: string[]; label: string; selected: boolean; disabled: boolean }[]>;
    areaSizes: typeof CONFIG.PF2E.areaSizes;
    areaTypes: typeof CONFIG.PF2E.areaTypes;
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

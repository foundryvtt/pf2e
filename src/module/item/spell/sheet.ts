import { SpellPF2e } from "@item/spell";
import { ItemSheetPF2e } from "../sheet/base";
import { ItemSheetDataPF2e, SpellSheetData, SpellSheetOverlayData } from "../sheet/data-types";
import { SpellDamage, SpellHeighteningInterval, SpellSystemData } from "./data";
import { objectHasKey, tupleHasValue } from "@util";
import { createSheetOptions, createSheetTags } from "@module/sheet/helpers";
import { OneToTen } from "@module/data";

/** Set of properties that are legal for the purposes of spell overrides */
const spellOverridable: Partial<Record<keyof SpellSystemData, string>> = {
    time: "PF2E.SpellTimeLabel",
    components: "PF2E.SpellComponentsLabel",
    target: "PF2E.SpellTargetLabel",
    area: "PF2E.AreaLabel",
    range: "PF2E.SpellRangeLabel",
    damage: "PF2E.DamageLabel",
};

const DEFAULT_INTERVAL_SCALING: SpellHeighteningInterval = {
    type: "interval",
    interval: 1,
    damage: {},
};

export class SpellSheetPF2e extends ItemSheetPF2e<SpellPF2e> {
    override async getData(): Promise<SpellSheetData> {
        const sheetData: ItemSheetDataPF2e<SpellPF2e> = await super.getData();

        const { isCantrip, isFocusSpell, isRitual } = this.item;

        // Create a level label to show in the summary.
        // This one is a longer version than the chat card
        const itemType =
            isCantrip && isFocusSpell
                ? game.i18n.localize("PF2E.SpellCategoryFocusCantrip")
                : this.item.isCantrip
                ? game.i18n.localize("PF2E.TraitCantrip")
                : game.i18n.localize(CONFIG.PF2E.spellCategories[this.item.data.data.category.value]);

        return {
            ...sheetData,
            itemType,
            isCantrip,
            isFocusSpell,
            isRitual,
            spellCategories: CONFIG.PF2E.spellCategories,
            spellTypes: CONFIG.PF2E.spellTypes,
            magicSchools: CONFIG.PF2E.magicSchools,
            spellLevels: CONFIG.PF2E.spellLevels,
            magicTraditions: createSheetTags(CONFIG.PF2E.magicTraditions, sheetData.data.traditions),
            damageSubtypes: CONFIG.PF2E.damageSubtypes,
            damageCategories: CONFIG.PF2E.damageCategories,
            traits: createSheetTags(CONFIG.PF2E.spellTraits, sheetData.data.traits),
            rarities: createSheetOptions(CONFIG.PF2E.rarityTraits, { value: [sheetData.data.traits.rarity] }),
            spellComponents: this.formatSpellComponents(sheetData.data),
            areaSizes: CONFIG.PF2E.areaSizes,
            areaTypes: CONFIG.PF2E.areaTypes,
            heightenIntervals: [1, 2, 3, 4],
            heightenOverlays: this.prepareHeighteningLevels(),
            canHeighten: this.getAvailableHeightenLevels().length > 0,
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        $html.find(".toggle-trait").on("change", (evt) => {
            const target = evt.target as HTMLInputElement;
            const trait = target.dataset.trait ?? "";
            if (!objectHasKey(CONFIG.PF2E.spellTraits, trait)) {
                console.warn("Toggled trait is invalid");
                return;
            }

            if (target.checked && !this.item.traits.has(trait)) {
                const newTraits = this.item.data.data.traits.value.concat([trait]);
                this.item.update({ "data.traits.value": newTraits });
            } else if (!target.checked && this.item.traits.has(trait)) {
                const newTraits = this.item.data.data.traits.value.filter((t) => t !== trait);
                this.item.update({ "data.traits.value": newTraits });
            }
        });

        $html.find("[data-action=damage-create]").on("click", (event) => {
            event.preventDefault();
            const baseKey = this.getOverlayFromEvent(event) ?? "data";
            const emptyDamage: SpellDamage = { value: "", type: { value: "bludgeoning", categories: [] } };
            this.item.update({ [`${baseKey}.damage.value.${randomID()}`]: emptyDamage });
        });

        $html.find("[data-action=damage-delete]").on("click", (event) => {
            event.preventDefault();
            const overlayData = this.getOverlayFromEvent(event);
            const baseKey = overlayData?.base ?? "data";
            const id = $(event.target).closest("[data-action=damage-delete]").attr("data-id");
            if (id) {
                const values = { [`${baseKey}.damage.value.-=${id}`]: null };
                if (!overlayData) {
                    values[`${baseKey}.heightening.damage.-=${id}`] = null;
                }
                this.item.update(values);
            }
        });

        $html.find("[data-action=heightening-interval-create]").on("click", (event) => {
            event.preventDefault();
            const baseKey = this.getOverlayFromEvent(event)?.base ?? "data";
            this.item.update({ [`${baseKey}.heightening`]: DEFAULT_INTERVAL_SCALING });
        });

        // Event used to delete all heightening, not just a particular one
        $html.find("[data-action=heightening-delete]").on("click", () => {
            this.item.update({ "data.-=heightening": null });
        });

        $html.find("[data-action=heightening-fixed-create]").on("click", () => {
            const highestLevel = this.item.getHeightenLayers().at(-1)?.level;
            const available = this.getAvailableHeightenLevels();
            const level = highestLevel && highestLevel < 10 ? highestLevel + 1 : available.at(0);
            if (level === undefined) return;

            this.item.update({ "data.heightening": { type: "fixed", levels: { [level]: {} } } });
        });

        $html.find("[data-action=overlay-delete]").on("click", async (event) => {
            const overlay = this.getOverlayFromEvent(event);
            if (!overlay) return;

            // If this is the last heighten overlay, delete all of it
            if (overlay.type === "heighten") {
                const layers = this.item.getHeightenLayers();
                if (layers.length === 1 && layers[0].level === overlay.level) {
                    this.item.update({ "data.-=heightening": null });
                    return;
                }
            }

            const parts = overlay.base.split(".");
            parts.push(`-=${parts.pop()}`);
            this.item.update({ [parts.join(".")]: null });
        });

        // Adds a property to an existing overlay
        $html.find("[data-action=overlay-add-property]").on("click", (event) => {
            event.preventDefault();
            const overlay = this.getOverlayFromEvent(event);
            const property = $(event.target).closest("[data-action=overlay-add-property]").attr("data-property");

            if (overlay && overlay.data && property && !(property in overlay.data)) {
                // Retrieve the default value for this property, which is either the
                // default scaling object, or the most recent value among all overlays and base spell.
                const value = (() => {
                    const scaling = this.item.getHeightenLayers().reverse();
                    for (const entry of [...scaling, this.item.data]) {
                        if (objectHasKey(entry.data, property)) {
                            return entry.data[property];
                        }
                    }

                    return undefined;
                })();

                if (typeof value !== "undefined") {
                    this.item.update({ [`${overlay.base}.${property}`]: value });
                } else {
                    ui.notifications.warn(`PF2e System | Failed to initialize property ${property} for overlay`);
                }
            }
        });

        // Removes a property from an existing overlay
        $html.find("[data-action=overlay-remove-property]").on("click", (event) => {
            event.preventDefault();
            const overlayData = this.getOverlayFromEvent(event);
            const property = $(event.target).closest("[data-action=overlay-remove-property]").attr("data-property");
            if (overlayData && property) {
                const updates = { [`${overlayData.base}.-=${property}`]: null };
                if (property === "damage") {
                    updates[`${overlayData.base}.-=heightening`] = null;
                }
                this.item.update(updates);
            }
        });

        $html.find("[data-action=change-level]").on("change", (event) => {
            const overlay = this.getOverlayFromEvent(event);
            if (!overlay) return;

            const currentLevel = overlay.level;
            const element = event.target as HTMLSelectElement;
            const newLevel = Number(element.value);

            const existingData = this.item.getHeightenLayers().find((layer) => layer.level === currentLevel);
            this.item.update({
                [`${overlay.collectionPath}.-=${currentLevel}`]: null,
                [`${overlay.collectionPath}.${newLevel}`]: existingData?.data ?? {},
            });
        });
    }

    private formatSpellComponents(data: SpellSystemData): string[] {
        if (!data.components) return [];
        const comps: string[] = [];
        if (data.components.focus) comps.push(game.i18n.localize(CONFIG.PF2E.spellComponents.F));
        if (data.components.material) comps.push(game.i18n.localize(CONFIG.PF2E.spellComponents.M));
        if (data.components.somatic) comps.push(game.i18n.localize(CONFIG.PF2E.spellComponents.S));
        if (data.components.verbal) comps.push(game.i18n.localize(CONFIG.PF2E.spellComponents.V));
        if (data.materials.value) comps.push(data.materials.value);
        return comps;
    }

    private getAvailableHeightenLevels() {
        const heightenLayers = this.item.getHeightenLayers();
        return [2, 3, 4, 5, 6, 7, 8, 9, 10].filter(
            (level) => level > this.item.baseLevel && !heightenLayers.some((layer) => layer.level === level)
        );
    }

    private getOverlayFromEvent(event: JQuery.TriggeredEvent) {
        const $overlayEl = $(event.target).closest("[data-overlay-type]");
        if ($overlayEl.length === 0) return null;

        const domData = $overlayEl.data();
        const overlayType = String(domData.overlayType);
        if (!tupleHasValue(["heighten", "variant"] as const, overlayType)) {
            return null;
        }

        const id = "overlayId" in domData ? String(domData.overlayId) : null;
        const level = "level" in domData ? Number(domData.level) : null;
        const collectionPath = overlayType === "heighten" ? "data.heightening.levels" : "data.variants";
        const base = overlayType === "heighten" ? `${collectionPath}.${level}` : `${collectionPath}.${id}`;

        const data = (() => {
            if (overlayType === "heighten") {
                const heightening = this.item.data.data.heightening;
                if (heightening?.type === "fixed") {
                    return heightening.levels[level as OneToTen];
                }
            }

            return null; // variants not supported yet
        })();

        return { id, level, type: overlayType, collectionPath, base, data };
    }

    prepareHeighteningLevels(): SpellSheetOverlayData[] {
        const spell = this.item;
        const layers = spell.getHeightenLayers();

        return layers.map((layer) => {
            const { level, data } = layer;
            const base = `data.heightening.levels.${layer.level}`;
            const missing: SpellSheetOverlayData["missing"] = [];
            for (const [key, label] of Object.entries(spellOverridable)) {
                if (key in layer.data) continue;
                missing.push({ key: key as keyof SpellSystemData, label });
            }

            const heightenLevels = this.getAvailableHeightenLevels();
            heightenLevels.push(level);
            heightenLevels.sort((a, b) => a - b);

            return { id: null, level, base, dataPath: base, type: "heighten", data, missing, heightenLevels };
        });
    }
}

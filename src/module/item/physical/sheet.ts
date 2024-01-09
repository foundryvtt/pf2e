import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import type { PhysicalItemPF2e } from "@item";
import { ItemSheetDataPF2e, ItemSheetOptions, ItemSheetPF2e } from "@item/base/sheet/sheet.ts";
import { SheetOptions, createSheetTags, getAdjustment } from "@module/sheet/helpers.ts";
import { localizer, tupleHasValue } from "@util";
import * as R from "remeda";
import {
    BasePhysicalItemSource,
    CoinsPF2e,
    ItemActivation,
    MaterialValuationData,
    PhysicalItemType,
    PreciousMaterialGrade,
} from "./index.ts";
import { PRECIOUS_MATERIAL_GRADES } from "./values.ts";

class PhysicalItemSheetPF2e<TItem extends PhysicalItemPF2e> extends ItemSheetPF2e<TItem> {
    static override get defaultOptions(): ItemSheetOptions {
        const options = super.defaultOptions;
        options.classes.push("physical");
        return { ...options, hasSidebar: true };
    }

    /** Show the identified data for editing purposes */
    override async getData(options?: Partial<ItemSheetOptions>): Promise<PhysicalItemSheetData<TItem>> {
        const sheetData = await super.getData(options);
        const { item } = this;

        const bulkAdjustment = getAdjustment(item.system.bulk.value, item._source.system.bulk.value, {
            better: "lower",
        });
        const basePrice = new CoinsPF2e(item._source.system.price.value);
        const priceAdjustment = getAdjustment(item.system.price.value.copperValue, basePrice.copperValue);

        const { actionTraits } = CONFIG.PF2E;

        // Enrich content
        const rollData = { ...item.getRollData(), ...this.actor?.getRollData() };
        sheetData.enrichedContent.unidentifiedDescription = await TextEditor.enrichHTML(
            sheetData.item.system.identification.unidentified.data.description.value,
            { rollData, async: true },
        );
        const activations: PhysicalItemSheetData<TItem>["activations"] = [];
        for (const action of item.activations) {
            const description = await TextEditor.enrichHTML(action.description.value, { rollData, async: true });
            activations.push({
                action,
                id: action.id,
                base: `system.activations.${action.id}`,
                description,
                traits: createSheetTags(actionTraits, action.traits ?? { value: [] }),
            });
        }

        const adjustedLevelHint = ((): string | null => {
            const hintText = ABP.isEnabled(this.actor)
                ? "PF2E.Item.Weapon.FromABP"
                : "PF2E.Item.Weapon.FromMaterialAndRunes";
            const levelLabel =
                game.i18n.lang === "de"
                    ? game.i18n.localize("PF2E.LevelLabel")
                    : game.i18n.localize("PF2E.LevelLabel").toLocaleLowerCase(game.i18n.lang);
            return item.level !== item._source.system.level.value
                ? game.i18n.format(hintText, {
                      property: levelLabel,
                      value: item.level,
                  })
                : null;
        })();

        const adjustedPriceHint = (() => {
            if (!priceAdjustment) return null;
            const baseData = item._source;
            const basePrice = new CoinsPF2e(baseData.system.price.value).scale(baseData.system.quantity).copperValue;
            const derivedPrice = item.assetValue.copperValue;
            const priceLabel =
                game.i18n.lang === "de"
                    ? game.i18n.localize("PF2E.PriceLabel")
                    : game.i18n.localize("PF2E.PriceLabel").toLocaleLowerCase(game.i18n.lang);
            return basePrice !== derivedPrice
                ? game.i18n.format(game.i18n.localize("PF2E.Item.Weapon.FromMaterialAndRunes"), {
                      property: priceLabel,
                      value: item.price.value.toString(),
                  })
                : null;
        })();

        const localizeBulk = localizer("PF2E.Item.Physical.Bulk");
        const bulks = [0, 0.1, ...Array.fromRange(50, 1)].map((value) => {
            if (value === 0) return { value, label: localizeBulk("Negligible.Label") };
            if (value === 0.1) return { value, label: localizeBulk("Light.Label") };
            return { value, label: value.toString() };
        });

        return {
            ...sheetData,
            itemType: game.i18n.localize("PF2E.ItemTitle"),
            sidebarTemplate: "systems/pf2e/templates/items/physical-sidebar.hbs",
            bulkAdjustment,
            adjustedLevelHint,
            basePrice,
            priceAdjustment,
            adjustedPriceHint,
            attributes: CONFIG.PF2E.abilities,
            actionTypes: CONFIG.PF2E.actionTypes,
            bulks,
            actionsNumber: CONFIG.PF2E.actionsNumber,
            frequencies: CONFIG.PF2E.frequencies,
            sizes: R.omit(CONFIG.PF2E.actorSizes, ["sm"]),
            usages: CONFIG.PF2E.usages,
            isApex: tupleHasValue(item._source.system.traits.value, "apex"),
            isPhysical: true,
            activations,
            // Do not let user set bulk if in a stack group because the group determines bulk
            bulkDisabled: !!sheetData.data?.stackGroup?.trim(),
        };
    }

    /** If the item is unidentified, prevent players from opening this sheet. */
    override render(force?: boolean, options?: RenderOptions): this | Promise<this> {
        if (!this.item.isIdentified && !game.user.isGM) {
            ui.notifications.warn(this.item.description);
            return this;
        }

        return super.render(force, options);
    }

    protected getMaterialSheetData(item: PhysicalItemPF2e, valuationData: MaterialValuationData): MaterialSheetData {
        const preciousMaterials: Record<string, string> = CONFIG.PF2E.preciousMaterials;
        const isSpecificMagicItem = item.isSpecific;
        const materials = Object.entries(valuationData).reduce(
            (result, [materialKey, materialData]) => {
                const validGrades = [...PRECIOUS_MATERIAL_GRADES].filter(
                    (grade) =>
                        !!materialData[grade] && (!isSpecificMagicItem || item.system.material.type === materialKey),
                );
                if (validGrades.length) {
                    result[materialKey] = {
                        label: game.i18n.localize(preciousMaterials[materialKey]),
                        grades: Object.fromEntries(
                            validGrades.map((grade) => [
                                grade,
                                {
                                    value: JSON.stringify({ type: materialKey, grade: grade }),
                                    label: game.i18n.localize(CONFIG.PF2E.preciousMaterialGrades[grade]),
                                },
                            ]),
                        ),
                    };
                }

                return result;
            },
            {} as MaterialSheetData["materials"],
        );

        const value = JSON.stringify(R.pick(this.item.material, ["type", "grade"]));
        return { value, materials };
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        if (formData["system.quantity"] === null) {
            formData["system.quantity"] = 0;
        }

        // Process precious-material selection
        const [materialType, materialGrade] = [formData["system.material.type"], formData["system.material.grade"]];
        const typeIsValid =
            materialType === undefined ||
            (typeof materialType === "string" && materialType in CONFIG.PF2E.preciousMaterials);
        const gradeIsValid =
            materialGrade === undefined ||
            (typeof materialGrade === "string" && materialGrade in CONFIG.PF2E.preciousMaterialGrades);
        if (!typeIsValid || !gradeIsValid) {
            formData["system.material.type"] = null;
            formData["system.material.grade"] = null;
        }

        if (formData["system.baseItem"] === "") {
            formData["system.baseItem"] = null;
        }

        // Convert price from a string to an actual object
        if ("system.price.value" in formData) {
            formData["system.price.value"] = CoinsPF2e.fromString(String(formData["system.price.value"]));
        }

        // Normalize nullable fields for embedded actions
        const expanded = fu.expandObject(formData) as DeepPartial<BasePhysicalItemSource<PhysicalItemType>>;
        for (const action of Object.values(expanded.system?.activations ?? [])) {
            // Ensure activation time is in a proper format
            const actionCost = action.actionCost;
            if (actionCost) {
                const isAction = actionCost.type === "action";
                if (!actionCost.value) {
                    actionCost.value = isAction ? actionCost.value || 1 : null;
                }
            }
        }

        return super._updateObject(event, fu.flattenObject(expanded));
    }
}

interface PhysicalItemSheetData<TItem extends PhysicalItemPF2e> extends ItemSheetDataPF2e<TItem> {
    sidebarTemplate: string;
    isApex: boolean;
    isPhysical: true;
    bulkAdjustment: string | null;
    adjustedBulkHint?: string | null;
    adjustedLevelHint: string | null;
    basePrice: CoinsPF2e;
    priceAdjustment: string | null;
    adjustedPriceHint: string | null;
    attributes: typeof CONFIG.PF2E.abilities;
    actionTypes: typeof CONFIG.PF2E.actionTypes;
    actionsNumber: typeof CONFIG.PF2E.actionsNumber;
    bulks: { value: number; label: string }[];
    frequencies: typeof CONFIG.PF2E.frequencies;
    sizes: Omit<typeof CONFIG.PF2E.actorSizes, "sm">;
    usages: typeof CONFIG.PF2E.usages;
    bulkDisabled: boolean;
    activations: {
        action: ItemActivation;
        id: string;
        base: string;
        description: string;
        traits: SheetOptions;
    }[];
}

interface MaterialSheetEntry {
    label: string;
    grades: Partial<Record<PreciousMaterialGrade, { value: string; label: string }>>;
}

interface MaterialSheetData {
    value: string;
    materials: Record<string, MaterialSheetEntry>;
}

export { PhysicalItemSheetPF2e };
export type { MaterialSheetData, MaterialSheetEntry, PhysicalItemSheetData };

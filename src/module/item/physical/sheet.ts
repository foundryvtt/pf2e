import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import { createSheetTags, SheetOptions } from "@module/sheet/helpers.ts";
import { ItemSheetDataPF2e, ItemSheetPF2e } from "../base/sheet/base.ts";
import {
    BasePhysicalItemSource,
    CoinsPF2e,
    ItemActivation,
    MaterialValuationData,
    PhysicalItemPF2e,
    PhysicalItemType,
    PreciousMaterialGrade,
} from "./index.ts";
import { PRECIOUS_MATERIAL_GRADES } from "./values.ts";

class PhysicalItemSheetPF2e<TItem extends PhysicalItemPF2e> extends ItemSheetPF2e<TItem> {
    /** Show the identified data for editing purposes */
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<PhysicalItemSheetData<TItem>> {
        const sheetData: ItemSheetDataPF2e<TItem> = await super.getData(options);

        const { item } = this;
        const basePrice = new CoinsPF2e(item._source.system.price.value);
        const priceAdjustment = ((): "higher" | "lower" | null => {
            const baseCopperValue = basePrice.copperValue;
            const derivedCopperValue = item.system.price.value.copperValue;
            return derivedCopperValue > baseCopperValue
                ? "higher"
                : derivedCopperValue < baseCopperValue
                ? "lower"
                : null;
        })();

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

        // Show source value for item size in case it is changed by a rule element
        sheetData.data.size = this.item._source.system.size;

        const baseData = item._source;
        const hintText = ABP.isEnabled(this.actor)
            ? "PF2E.Item.Weapon.FromABP"
            : "PF2E.Item.Weapon.FromMaterialAndRunes";
        const adjustedLevelHint =
            item.level !== baseData.system.level.value
                ? game.i18n.format(hintText, {
                      property: game.i18n.localize("PF2E.LevelLabel"),
                      value: item.level,
                  })
                : null;
        const adjustedPriceHint = (() => {
            const basePrice = new CoinsPF2e(baseData.system.price.value).scale(baseData.system.quantity).copperValue;
            const derivedPrice = item.assetValue.copperValue;
            return basePrice !== derivedPrice
                ? game.i18n.format(hintText, {
                      property: game.i18n.localize("PF2E.PriceLabel"),
                      value: item.price.value.toString(),
                  })
                : null;
        })();

        return {
            ...sheetData,
            itemType: game.i18n.localize("PF2E.ItemTitle"),
            hasSidebar: true,
            baseLevel: baseData.system.level.value,
            adjustedLevelHint,
            basePrice,
            priceAdjustment,
            adjustedPriceHint,
            actionTypes: CONFIG.PF2E.actionTypes,
            actionsNumber: CONFIG.PF2E.actionsNumber,
            bulkTypes: CONFIG.PF2E.bulkTypes,
            frequencies: CONFIG.PF2E.frequencies,
            sizes: CONFIG.PF2E.actorSizes,
            stackGroups: CONFIG.PF2E.stackGroups,
            usages: CONFIG.PF2E.usages,
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

    protected prepareMaterials(valuationData: MaterialValuationData): MaterialSheetData {
        const preciousMaterials: Record<string, string> = CONFIG.PF2E.preciousMaterials;
        const materials = Object.entries(valuationData).reduce(
            (result, [materialKey, materialData]) => {
                const validGrades = [...PRECIOUS_MATERIAL_GRADES].filter((grade) => !!materialData[grade]);
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

        const value = JSON.stringify(this.item.material);
        return { value, materials };
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        $html.find("[data-action=activation-add]").on("click", (event) => {
            event.preventDefault();
            const id = randomID(16);
            const action: ItemActivation = {
                id,
                actionCost: { value: 1, type: "action" },
                components: { command: false, envision: false, interact: false, cast: false },
                description: { value: "" },
                traits: { value: [], custom: "" },
            };
            this.item.update({ [`system.activations.${id}`]: action });
        });

        $html.find("[data-action=activation-delete]").on("click", (event) => {
            event.preventDefault();
            const id = $(event.target).closest("[data-activation-id]").attr("data-activation-id");
            const isLast = Object.values(this.item.system.activations ?? []).length === 1;
            if (isLast && id && id in (this.item.system.activations ?? {})) {
                this.item.update({ "system.-=activations": null });
            } else {
                this.item.update({ [`system.activations.-=${id}`]: null });
            }
        });

        $html.find("[data-action=activation-frequency-add]").on("click", (event) => {
            const id = $(event.target).closest("[data-activation-id]").attr("data-activation-id");
            if (id && id in (this.item.system.activations ?? {})) {
                const per = CONFIG.PF2E.frequencies.day;
                this.item.update({ [`system.activations.${id}.frequency`]: { value: 1, max: 1, per } });
            }
        });

        $html.find("[data-action=activation-frequency-delete]").on("click", (event) => {
            const id = $(event.target).closest("[data-activation-id]").attr("data-activation-id");
            if (id && id in (this.item.system.activations ?? {})) {
                this.item.update({ [`system.activations.${id}.-=frequency`]: null });
            }
        });
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
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

        // Convert price from a string to an actual object
        if ("system.price.value" in formData) {
            formData["system.price.value"] = CoinsPF2e.fromString(String(formData["system.price.value"]));
        }

        // Normalize nullable fields for embedded actions
        const expanded = expandObject(formData) as DeepPartial<BasePhysicalItemSource<PhysicalItemType>>;
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

        return super._updateObject(event, flattenObject(expanded));
    }
}

interface PhysicalItemSheetData<TItem extends PhysicalItemPF2e> extends ItemSheetDataPF2e<TItem> {
    isPhysical: true;
    baseLevel: number;
    basePrice: CoinsPF2e;
    priceAdjustment: "higher" | "lower" | null;
    adjustedPriceHint: string | null;
    adjustedLevelHint: string | null;
    actionTypes: ConfigPF2e["PF2E"]["actionTypes"];
    actionsNumber: ConfigPF2e["PF2E"]["actionsNumber"];
    bulkTypes: ConfigPF2e["PF2E"]["bulkTypes"];
    frequencies: ConfigPF2e["PF2E"]["frequencies"];
    sizes: ConfigPF2e["PF2E"]["actorSizes"];
    stackGroups: ConfigPF2e["PF2E"]["stackGroups"];
    usages: ConfigPF2e["PF2E"]["usages"];
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

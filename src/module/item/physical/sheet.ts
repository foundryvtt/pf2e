import { ItemSheetDataPF2e } from "@item/sheet/data-types.ts";
import { createSheetTags, SheetOptions } from "@module/sheet/helpers.ts";
import { objectHasKey } from "@util";
import {
    BasePhysicalItemSource,
    CoinsPF2e,
    ItemActivation,
    MaterialGradeData,
    MaterialValuationData,
    PhysicalItemPF2e,
    PhysicalItemType,
    PreciousMaterialGrade,
} from "./index.ts";
import { ItemSheetPF2e } from "../sheet/base.ts";
import { PRECIOUS_MATERIAL_GRADES } from "./values.ts";

class PhysicalItemSheetPF2e<TItem extends PhysicalItemPF2e> extends ItemSheetPF2e<TItem> {
    /** Show the identified data for editing purposes */
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<PhysicalItemSheetData<TItem>> {
        const sheetData: ItemSheetDataPF2e<TItem> = await super.getData(options);

        const basePrice = new CoinsPF2e(this.item._source.system.price.value);
        const priceAdjustment = ((): "higher" | "lower" | null => {
            const baseCopperValue = basePrice.copperValue;
            const derivedCopperValue = this.item.system.price.value.copperValue;
            return derivedCopperValue > baseCopperValue
                ? "higher"
                : derivedCopperValue < baseCopperValue
                ? "lower"
                : null;
        })();

        const { actionTraits } = CONFIG.PF2E;

        // Enrich content
        const rollData = { ...this.item.getRollData(), ...this.actor?.getRollData() };
        sheetData.enrichedContent.unidentifiedDescription = await TextEditor.enrichHTML(
            sheetData.item.system.identification.unidentified.data.description.value,
            { rollData, async: true }
        );
        const activations: PhysicalItemSheetData<TItem>["activations"] = [];
        for (const action of this.item.activations) {
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

        return {
            ...sheetData,
            itemType: game.i18n.localize("PF2E.ItemTitle"),
            basePrice,
            priceAdjustment,
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

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        $html.find<HTMLInputElement>("input[data-property]").on("focus", (event) => {
            const $input = $(event.target);
            const propertyPath = $input.attr("data-property") ?? "";
            const value = $input.val();
            if (value !== undefined && !Array.isArray(value)) {
                $input.attr("data-value", value);
            }
            const baseValue = $input.attr("data-value-base") ?? String(getProperty(this.item._source, propertyPath));
            $input.val(baseValue).attr({ name: propertyPath });
        });

        $html.find<HTMLInputElement>("input[data-property]").on("blur", (event) => {
            const $input = $(event.target);
            $input.removeAttr("name").removeAttr("style").attr({ type: "text" });
            const propertyPath = $input.attr("data-property") ?? "";
            const preparedValue = $input.attr("data-value") ?? String(getProperty(this.item, propertyPath));
            $input.val(preparedValue);
        });

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

        const $otherTagsHint = $html.find("i.other-tags-hint");
        $otherTagsHint.tooltipster({
            maxWidth: 350,
            theme: "crb-hover",
            content: game.i18n.localize($otherTagsHint.attr("title") ?? ""),
        });
    }

    protected prepareMaterials(valuationData: MaterialValuationData): PreparedMaterials {
        const { material } = this.item;
        const preciousMaterials: Record<string, string> = CONFIG.PF2E.preciousMaterials;
        const materials = Object.entries(valuationData).reduce((result, [materialKey, materialData]) => {
            const validGrades = [...PRECIOUS_MATERIAL_GRADES].filter((grade) => !!materialData[grade]);
            if (validGrades.length) {
                result[materialKey] = {
                    label: game.i18n.localize(preciousMaterials[materialKey]),
                    grades: Object.fromEntries(
                        validGrades.map((grade) => [
                            grade,
                            {
                                ...materialData[grade],
                                label: game.i18n.localize(CONFIG.PF2E.preciousMaterialGrades[grade]),
                            },
                        ])
                    ),
                };
            }

            return result;
        }, {} as MaterialSheetData["materials"]);

        const value = material.precious ? `${material.precious.type}|${material.precious.grade}` : "";
        return { value, materials };
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        if (typeof formData["system.level.value"] === "number") {
            formData["system.level.value"] = Math.trunc(Math.abs(formData["system.level.value"]));
        }

        // Process precious-material selection
        if (typeof formData["preciousMaterial"] === "string") {
            const typeGrade = formData["preciousMaterial"].split("|");
            const isValidSelection =
                objectHasKey(CONFIG.PF2E.preciousMaterials, typeGrade[0] ?? "") &&
                objectHasKey(CONFIG.PF2E.preciousMaterialGrades, typeGrade[1] ?? "");
            if (isValidSelection) {
                formData["system.preciousMaterial.value"] = typeGrade[0];
                formData["system.preciousMaterialGrade.value"] = typeGrade[1];
            } else {
                formData["system.preciousMaterial.value"] = null;
                formData["system.preciousMaterialGrade.value"] = null;
            }

            delete formData["preciousMaterial"];
        }

        // Normalize nullable fields to actual `null`s
        const propertyPaths = [
            "system.baseItem",
            "system.preciousMaterial.value",
            "system.preciousMaterialGrade.value",
            "system.group",
            "system.group.value",
        ];
        for (const path of propertyPaths) {
            if (formData[path] === "") formData[path] = null;
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
    basePrice: CoinsPF2e;
    priceAdjustment: "higher" | "lower" | null;
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

interface PreparedMaterials {
    value: string;
    materials: Record<string, { label: string; grades: { [K in PreciousMaterialGrade]?: MaterialGradeData } }>;
}

type MaterialSheetEntry = {
    label: string;
    grades: Partial<Record<PreciousMaterialGrade, MaterialGradeData>>;
};

type MaterialSheetData = {
    value: string;
    materials: Record<string, MaterialSheetEntry>;
};

export { MaterialSheetData, MaterialSheetEntry, PhysicalItemSheetData, PhysicalItemSheetPF2e, PreparedMaterials };

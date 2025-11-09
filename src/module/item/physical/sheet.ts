import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import type { FormSelectOption } from "@client/applications/forms/fields.d.mts";
import type { AppV1RenderOptions } from "@client/appv1/api/application-v1.d.mts";
import type { PhysicalItemPF2e } from "@item";
import { ItemSheetDataPF2e, ItemSheetOptions, ItemSheetPF2e } from "@item/base/sheet/sheet.ts";
import { getAdjustment, isControlDown } from "@module/sheet/helpers.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { ErrorPF2e, htmlClosest, htmlQuery, localizer, sortStringRecord, tupleHasValue } from "@util";
import * as R from "remeda";
import { Coins, MaterialValuationData } from "./index.ts";
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
        const basePrice = new Coins(item._source.system.price.value);
        const priceAdjustment = getAdjustment(item.system.price.value.copperValue, basePrice.copperValue);

        // Enrich content
        const rollData = { ...item.getRollData(), ...this.actor?.getRollData() };
        sheetData.enrichedContent.unidentifiedDescription = await TextEditorPF2e.enrichHTML(
            sheetData.item.system.identification.unidentified?.data.description.value ?? "",
            { rollData },
        );

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
            const basePrice = new Coins(baseData.system.price.value).scale(baseData.system.quantity).copperValue;
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
            price: {
                base: new Coins(item._source.system.price.value).toString({ short: true }),
                label: item.system.price.value.toString({ short: true }),
                adjustment: priceAdjustment,
                adjustmentHint: adjustedPriceHint,
                per: item.system.price.per,
            },
            attributes: CONFIG.PF2E.abilities,
            actionTypes: CONFIG.PF2E.actionTypes,
            bulks,
            actionsNumber: CONFIG.PF2E.actionsNumber,
            frequencies: CONFIG.PF2E.frequencies,
            sizes: R.omit(CONFIG.PF2E.actorSizes, ["sm"]),
            usages: sortStringRecord(CONFIG.PF2E.usages),
            usageOptions: [
                { label: "0", value: "worngloves" },
                { label: "1", value: "held-in-one-hand" },
                { label: "1+", value: "held-in-one-plus-hands" },
                { label: "2", value: "held-in-two-hands" },
            ],
            identificationStatusOptions: [
                { label: "PF2E.identification.Identified", value: "identified" },
                { label: "PF2E.identification.Unidentified", value: "unidentified" },
            ],
            isApex: tupleHasValue(item._source.system.traits.value, "apex"),
            isPhysical: true,
            // Do not let user set bulk if in a stack group because the group determines bulk
            bulkDisabled: !!sheetData.data?.stackGroup?.trim(),
        };
    }

    /** If the item is unidentified, prevent players from opening this sheet. */
    override render(force?: boolean, options?: AppV1RenderOptions): this {
        if (!this.item.isIdentified && !game.user.isGM) {
            ui.notifications.warn(this.item.description);
            return this;
        }

        return super.render(force, options);
    }

    protected getMaterialSheetData(item: PhysicalItemPF2e, valuationData: MaterialValuationData): MaterialSheetData {
        const preciousMaterials: Record<string, string> = CONFIG.PF2E.preciousMaterials;
        const isSpecificMagicItem = item.isSpecific;
        const materials: MaterialSheetEntry[] = [
            { value: JSON.stringify({ type: null, grade: null }), label: "", group: "" }, // Initial empty value
        ];
        for (const [materialKey, materialData] of Object.entries(valuationData)) {
            const validGrades = [...PRECIOUS_MATERIAL_GRADES].filter(
                (grade) => !!materialData[grade] && (!isSpecificMagicItem || item.system.material.type === materialKey),
            );
            if (validGrades.length) {
                const group = game.i18n.localize(preciousMaterials[materialKey]);
                for (const grade of validGrades) {
                    const gradeLabel = game.i18n.localize(CONFIG.PF2E.preciousMaterialGrades[grade]);
                    const label = game.i18n.format("PF2E.Item.Weapon.MaterialAndRunes.MaterialOption", {
                        type: group,
                        grade: gradeLabel,
                    });
                    materials.push({
                        value: JSON.stringify({ type: materialKey, grade: grade }),
                        label,
                        group,
                    });
                }
            }
        }
        materials.sort((a, b) => a.group.localeCompare(b.group, game.i18n.lang));

        const value = JSON.stringify(R.pick(this.item.material, ["type", "grade"]));
        return { value, materials };
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        // Subitem management
        htmlQuery(html, "ul[data-subitems]")?.addEventListener("click", async (event) => {
            const anchor = htmlClosest(event.target, "a[data-action]");
            if (!anchor) return;

            const item = this.item;
            const subitemId = htmlClosest(anchor, "[data-subitem-id]")?.dataset.subitemId;
            const subitem = item.subitems.get(subitemId, { strict: true });

            switch (anchor.dataset.action) {
                case "edit-subitem":
                    return subitem.sheet.render(true);
                case "detach-subitem":
                    return subitem.detach({ skipConfirm: isControlDown(event) });
                case "delete-subitem": {
                    return event.ctrlKey ? subitem.delete() : subitem.deleteDialog();
                }
                default:
                    throw ErrorPF2e("Unexpected control options");
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

        if (formData["system.baseItem"] === "") {
            formData["system.baseItem"] = null;
        }

        // Convert price from a string to an actual object
        if ("system.price.value" in formData) {
            formData["system.price.==value"] = Coins.fromString(String(formData["system.price.value"])).toObject();
            delete formData["system.price.value"];
        }

        return super._updateObject(event, formData);
    }
}

interface PhysicalItemSheetData<TItem extends PhysicalItemPF2e> extends ItemSheetDataPF2e<TItem> {
    sidebarTemplate: string;
    isApex: boolean;
    isPhysical: true;
    bulkAdjustment: string | null;
    adjustedBulkHint?: string | null;
    adjustedLevelHint: string | null;
    price: {
        label: string;
        base: string;
        adjustment: string | null;
        adjustmentHint: string | null;
        per: number | null;
    };
    attributes: typeof CONFIG.PF2E.abilities;
    actionTypes: typeof CONFIG.PF2E.actionTypes;
    actionsNumber: typeof CONFIG.PF2E.actionsNumber;
    bulks: { value: number; label: string }[];
    frequencies: typeof CONFIG.PF2E.frequencies;
    sizes: Omit<typeof CONFIG.PF2E.actorSizes, "sm">;
    usages: typeof CONFIG.PF2E.usages;
    usageOptions: FormSelectOption[];
    identificationStatusOptions: FormSelectOption[];
    bulkDisabled: boolean;
}

interface MaterialSheetEntry {
    value: string;
    label: string;
    group: string;
}

interface MaterialSheetData {
    value: string;
    materials: MaterialSheetEntry[];
}

export { PhysicalItemSheetPF2e };
export type { MaterialSheetData, MaterialSheetEntry, PhysicalItemSheetData };

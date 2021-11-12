import { ItemSheetPF2e } from "../sheet/base";
import { PhysicalItemPF2e } from "@item/physical";
import { ItemSheetDataPF2e, PhysicalItemSheetData } from "@item/sheet/data-types";
import { BasePhysicalItemSource, ItemActivation } from "./data";

export class PhysicalItemSheetPF2e<TItem extends PhysicalItemPF2e = PhysicalItemPF2e> extends ItemSheetPF2e<TItem> {
    /** Show the identified data for editing purposes */
    override async getData(): Promise<PhysicalItemSheetData<TItem>> {
        const sheetData: ItemSheetDataPF2e<TItem> = await super.getData();

        // Set the source item data for editing
        const identifiedData = this.item.getMystifiedData("identified", { source: true });
        mergeObject(sheetData.item, identifiedData, { insertKeys: false, insertValues: false });

        return {
            ...sheetData,
            itemType: game.i18n.localize("PF2E.ItemTitle"),
            actionTypes: CONFIG.PF2E.actionTypes,
            actionsNumber: CONFIG.PF2E.actionsNumber,
            frequencies: CONFIG.PF2E.frequencies,
            activations: this.item.activations.map((action) => ({
                action,
                id: action.id,
                base: `data.activations.${action.id}`,
                traits: this.prepareOptions(CONFIG.PF2E.actionTraits, action.traits ?? { value: [] }, {
                    selectedOnly: true,
                }),
            })),
        };
    }

    override activateListeners($html: JQuery<HTMLElement>) {
        super.activateListeners($html);

        $html.find<HTMLInputElement>("input[data-property]").on("focus", (event) => {
            const $input = $(event.target);
            const propertyPath = $input.attr("data-property") ?? "";
            const baseValue = getProperty(this.item.data._source, propertyPath);
            $input.val(baseValue).attr({ name: propertyPath });
        });

        $html.find<HTMLInputElement>("input[data-property]").on("blur", (event) => {
            const $input = $(event.target);
            $input.removeAttr("name").removeAttr("style").attr({ type: "text" });
            const propertyPath = $input.attr("data-property") ?? "";
            const preparedValue = getProperty(this.item.data, propertyPath);
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
                frequency: { value: 0, max: 0, duration: null },
                traits: { value: [], custom: "" },
            };
            this.item.update({ [`data.activations.${id}`]: action });
        });

        $html.find("[data-action=activation-delete]").on("click", (event) => {
            event.preventDefault();
            const id = $(event.target).closest("[data-action=activation-delete]").attr("data-action-id") ?? "";
            const isLast = Object.values(this.item.data.data.activations ?? []).length === 1;
            if (isLast && id in (this.item.data.data.activations ?? {})) {
                this.item.update({ "data.-=activations": null });
            } else {
                this.item.update({ [`data.activations.-=${id}`]: null });
            }
        });
    }

    /** Normalize nullable fields to actual `null`s */
    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const propertyPaths = [
            "data.baseItem",
            "data.preciousMaterial.value",
            "data.preciousMaterialGrade.value",
            "data.group.value",
        ];
        for (const path of propertyPaths) {
            if (formData[path] === "") formData[path] = null;
        }

        // Normalize nullable fields for embedded actions
        const expanded = expandObject(formData) as DeepPartial<BasePhysicalItemSource>;
        for (const action of Object.values(expanded.data?.activations ?? [])) {
            // Ensure activation time is in a proper format
            const actionCost = action.actionCost;
            if (actionCost) {
                const isAction = actionCost.type === "action";
                if (!actionCost.value) {
                    actionCost.value = isAction ? actionCost.value || 1 : null;
                }
            }

            // Ensure frequency is a proper format
            if (action.frequency && !action.frequency?.duration) action.frequency.duration = null;
        }

        super._updateObject(event, flattenObject(expanded));
    }
}

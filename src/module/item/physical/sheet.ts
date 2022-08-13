import { ItemSheetPF2e } from "../sheet/base";
import { PhysicalItemPF2e } from "@item/physical";
import { ItemSheetDataPF2e, PhysicalItemSheetData } from "@item/sheet/data-types";
import { BasePhysicalItemSource, ItemActivation } from "./data";
import { createSheetTags } from "@module/sheet/helpers";
import { CoinsPF2e } from "@item/physical/helpers";

export class PhysicalItemSheetPF2e<TItem extends PhysicalItemPF2e = PhysicalItemPF2e> extends ItemSheetPF2e<TItem> {
    /** Show the identified data for editing purposes */
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<PhysicalItemSheetData<TItem>> {
        const sheetData: ItemSheetDataPF2e<TItem> = await super.getData(options);

        // Set the source item data for editing
        const identifiedData = this.item.getMystifiedData("identified", { source: true });
        sheetData.item.name = identifiedData.name;
        sheetData.item.img = identifiedData.img;
        sheetData.item.system.description.value = identifiedData.data.description.value;

        const { actionTraits } = CONFIG.PF2E;

        // Enrich content
        const rollData = { ...this.item.getRollData(), ...this.actor?.getRollData() };
        sheetData.enrichedContent.unidentifiedDescription = await game.pf2e.TextEditor.enrichHTML(
            sheetData.item.system.identification.unidentified.data.description.value,
            { rollData }
        );
        sheetData.enrichedContent.unidentifiedDescription = game.pf2e.TextEditor.processUserVisibility(
            sheetData.enrichedContent.unidentifiedDescription,
            { actor: this.item.actor }
        );

        return {
            ...sheetData,
            itemType: game.i18n.localize("PF2E.ItemTitle"),
            basePriceString: new CoinsPF2e(this.item._source.system.price.value).toString(),
            priceString: this.item.price.value.toString(),
            actionTypes: CONFIG.PF2E.actionTypes,
            actionsNumber: CONFIG.PF2E.actionsNumber,
            bulkTypes: CONFIG.PF2E.bulkTypes,
            frequencies: CONFIG.PF2E.frequencies,
            sizes: CONFIG.PF2E.actorSizes,
            stackGroups: CONFIG.PF2E.stackGroups,
            usage: CONFIG.PF2E.usageTraits,
            isPhysical: true,
            activations: this.item.activations.map((action) => ({
                action,
                id: action.id,
                base: `system.activations.${action.id}`,
                traits: createSheetTags(actionTraits, action.traits ?? { value: [] }),
            })),

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
            const baseValue = $input.attr("data-value-base") ?? getProperty(this.item._source, propertyPath);
            $input.val(baseValue).attr({ name: propertyPath });
        });

        $html.find<HTMLInputElement>("input[data-property]").on("blur", (event) => {
            const $input = $(event.target);
            $input.removeAttr("name").removeAttr("style").attr({ type: "text" });
            const propertyPath = $input.attr("data-property") ?? "";
            const preparedValue = $input.attr("data-value") ?? getProperty(this.item, propertyPath);
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

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
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
        if (formData["system.price.value"]) {
            formData["system.price.value"] = CoinsPF2e.fromString(String(formData["system.price.value"]));
        }

        // Normalize nullable fields for embedded actions
        const expanded = expandObject(formData) as DeepPartial<BasePhysicalItemSource>;
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

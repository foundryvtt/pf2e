import { PHYSICAL_ITEM_TYPES } from "@item/physical/values.ts";
import { PC_ITEM_TYPES } from "@item/values.ts";
import { localizer } from "@util";

export const RenderDialog = {
    listen: (): void => {
        Hooks.on("renderDialogV2", (_dialog, html) => {
            // Break up the item document dialog into option groups
            // The class we're checking for is injected by the item document's createDialog() method
            if (html.classList.contains("dialog") && html.classList.contains("item-create")) {
                const select = html.querySelector<HTMLSelectElement>("select[name=type]");
                const option = select?.querySelector("option");
                if (select && option) {
                    const localize = localizer("PF2E.Item.CreationDialog.Categories");
                    select.append(extractOptGroup(select, localize("Physical"), [...PHYSICAL_ITEM_TYPES, "kit"]));
                    select.append(extractOptGroup(select, localize("Character"), [...PC_ITEM_TYPES]));
                    select.append(extractOptGroup(select, localize("Other")));
                    option.selected = true;
                }
            }
        });
    },
};

function extractOptGroup(select: HTMLSelectElement, label: string, types?: string[]): HTMLOptGroupElement {
    const options = select.querySelectorAll<HTMLOptionElement>(":scope > option");
    const filtered = [...options.values()].filter((option) => !types || types.includes(option.value));
    const optgroup = document.createElement("optgroup");
    optgroup.label = label;
    for (const physicalElement of filtered) {
        optgroup.appendChild(physicalElement);
    }

    return optgroup;
}

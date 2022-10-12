import { PHYSICAL_ITEM_TYPES } from "@item/physical/values";
import { PC_ITEM_TYPES } from "@item/values";
import { InlineRollLinks } from "@scripts/ui/inline-roll-links";
import { LocalizePF2e } from "@system/localize";

export const RenderDialog = {
    listen: () => {
        Hooks.on("renderDialog", (_dialog, $html) => {
            // For macros and modules
            InlineRollLinks.listen($html);

            // Break up the item document dialog into option groups
            // The class we're checking for is injected by the item document's createDialog() method
            const element = $html[0];
            if (element.classList.contains("dialog-item-create")) {
                const select = element.querySelector<HTMLSelectElement>("select[name=type]");
                const categories = LocalizePF2e.translations.PF2E.Item.CreationDialog.Categories;
                if (select) {
                    select.append(extractOptGroup(select, categories.Physical, [...PHYSICAL_ITEM_TYPES, "kit"]));
                    select.append(extractOptGroup(select, categories.Character, Array.from(PC_ITEM_TYPES)));
                    select.append(extractOptGroup(select, categories.Other));
                    select.querySelector("option")!.selected = true;
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

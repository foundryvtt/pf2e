import { ItemSheetPF2e } from "@item";
import type { ItemSheetOptions } from "@item/base/sheet/sheet.ts";
import type { ConditionPF2e } from "./document.ts";

class ConditionSheetPF2e extends ItemSheetPF2e<ConditionPF2e> {
    static override get defaultOptions(): ItemSheetOptions {
        return { ...super.defaultOptions, hasSidebar: true };
    }

    protected override get validTraits(): Record<string, string> {
        return {};
    }
}

export { ConditionSheetPF2e };

import type { AbilityItemPF2e, FeatPF2e } from "@item";
import { DamageAlteration } from "@module/rules/rule-element/damage-alteration/alteration.ts";
import * as R from "remeda";

/** A helper class to handle toggleable ability traits */
class AbilityTraitToggles {
    parent: AbilityItemPF2e | FeatPF2e;

    mindshift: { selected: boolean } | null;

    constructor(item: AbilityItemPF2e | FeatPF2e) {
        this.parent = item;
        Object.defineProperty(this, "parent", { enumerable: false });

        const selected = item._source.system.traits.toggles?.mindshift?.selected ?? false;
        this.mindshift = item.system.traits.value.includes("mindshift") ? { selected } : null;
        if (this.mindshift?.selected) {
            item.system.traits.otherTags.push("mindshifted");
        }
    }

    get item(): AbilityItemPF2e | FeatPF2e {
        return this.parent;
    }

    get operableTraits(): "mindshift"[] {
        return this.item.system.traits.value.includes("mindshift") ? ["mindshift"] : [];
    }

    getDamageAlterations(): DamageAlteration[] {
        return this.mindshift?.selected
            ? [
                  new DamageAlteration({
                      mode: "override",
                      property: "damage-type",
                      slug: "mindshift",
                      value: "mental",
                  }),
              ]
            : [];
    }

    getSheetData(): TraitToggleViewData[] {
        return (["mindshift"] as const)
            .map((t) => {
                const data = this[t];
                return data
                    ? {
                          trait: t,
                          selected: data.selected,
                          icon: "brain",
                          classes: "damage color mental",
                          tooltip: CONFIG.PF2E.actionTraits[t],
                      }
                    : null;
            })
            .filter(R.isTruthy);
    }

    async update({ trait, selected }: { trait: "mindshift"; selected: boolean }): Promise<boolean> {
        const current = this[trait]?.selected;
        if (current === selected || typeof current !== "boolean") {
            return false;
        }

        return !!(await this.item.update({ [`system.traits.toggles.${trait}.selected`]: selected }));
    }
}

interface TraitToggleViewData {
    trait: string;
    selected: boolean;
    icon: string;
    classes: string;
    tooltip: string;
}

export { AbilityTraitToggles, type TraitToggleViewData };

import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type { AbilityItemPF2e, FeatPF2e } from "@item";
import type { FeatSystemData } from "@item/feat/data.ts";
import { DamageAlteration } from "@module/rules/rule-element/damage-alteration/alteration.ts";
import * as R from "remeda";
import type { AbilitySystemData } from "./data.ts";
import fields = foundry.data.fields;

/** A helper class to handle toggleable ability traits */
class AbilityTraitToggles extends foundry.abstract.DataModel<AbilitySystemData | FeatSystemData, TraitToggleSchema> {
    static override defineSchema(): TraitToggleSchema {
        return {
            mindshift: new fields.SchemaField(
                { selected: new fields.BooleanField() },
                { required: false, nullable: true, initial: undefined },
            ),
        };
    }

    /** The grandparent item */
    get item(): AbilityItemPF2e | FeatPF2e {
        return this.parent.parent;
    }

    /** Get all traits in the grandparent item that can be toggled. */
    get operableTraits(): "mindshift"[] {
        return this.item.system.traits.value.includes("mindshift") ? ["mindshift"] : [];
    }

    prepareData(): void {
        const selected = this.mindshift?.selected ?? false;
        const item = this.item;
        this.mindshift = item.system.traits.value.includes("mindshift") ? { selected } : null;
        if (this.mindshift?.selected) {
            item.system.traits.otherTags.push("mindshifted");
        }
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

interface AbilityTraitToggles
    extends foundry.abstract.DataModel<AbilitySystemData | FeatSystemData, TraitToggleSchema>,
        ModelPropsFromSchema<TraitToggleSchema> {}

type TraitToggleSchema = {
    mindshift: fields.SchemaField<
        { selected: fields.BooleanField },
        { selected: boolean },
        { selected: boolean },
        false,
        true,
        false
    >;
};

interface TraitToggleViewData {
    trait: string;
    selected: boolean;
    icon: string;
    classes: string;
    tooltip: string;
}

export { AbilityTraitToggles, type TraitToggleViewData };

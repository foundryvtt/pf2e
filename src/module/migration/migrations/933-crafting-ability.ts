import { CraftingFormulaData, PreparedFormulaData } from "@actor/character/crafting/types.ts";
import { CharacterSystemSource } from "@actor/character/data.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { CraftingAbilityRuleSource } from "@module/rules/rule-element/crafting-ability.ts";
import { sluggify } from "@util/misc.ts";
import { MigrationBase } from "../base.ts";

/** Renames CraftingEntry to CraftingAbility, and updates prepared formulas to no longer have the sort property */
export class Migration933CraftingAbility extends MigrationBase {
    static override version = 0.933;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "character") return;

        // Remove the sort field from character formulas
        const system: CharacterSystemSourceMaybeOld = source.system;
        if (system.crafting?.formulas?.some((f) => "sort" in f)) {
            system.crafting.formulas = system.crafting.formulas
                .sort((f) => f.sort ?? 0)
                .map((f) => {
                    return f;
                });
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.system.rules.some((r) => r.key === "CraftingEntry")) {
            source.system.rules = source.system.rules.map((r) => {
                if (r.key !== "CraftingEntry") return r;

                const clone = fu.deepClone(r);
                this.#updateCraftingEntry(clone as CraftingAbilityRuleSourceMaybeOld);
                return clone;
            });
        }
    }

    #updateCraftingEntry(source: CraftingAbilityRuleSourceMaybeOld) {
        source.key = "CraftingAbility";
        if (source.selector) {
            source.slug ??= sluggify(source.selector);
            delete source.selector;
        }
        if ("name" in source) {
            source.label ??= source.name;
            delete source.name;
        }

        // Remove the sort field and rename the uuid field from prepared formulas
        const prepared = source.prepared ?? source.preparedFormulas;
        if (prepared) {
            source.prepared = prepared
                .sort((f) => f.sort ?? 0)
                .map((f) => {
                    if (f.itemUUID) {
                        f.uuid ??= f.itemUUID;
                    }
                    delete f.itemUUID;
                    delete f.sort;
                    return f;
                });
            delete source.preparedFormulas;
        }
    }
}

interface CharacterSystemSourceMaybeOld extends CharacterSystemSource {
    crafting?: { formulas: (CraftingFormulaData & { sort?: number })[] };
}

interface CraftingAbilityRuleSourceMaybeOld extends CraftingAbilityRuleSource {
    key: "CraftingAbility" | "CraftingEntry";
    selector?: string;
    name?: string;
    prepared?: PreparedFormulaDataMaybeOld[];
    preparedFormulas?: PreparedFormulaDataMaybeOld[];
}

interface PreparedFormulaDataMaybeOld extends PreparedFormulaData {
    itemUUID?: ItemUUID;
    sort?: number;
}

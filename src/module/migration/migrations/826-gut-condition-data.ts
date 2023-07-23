import { ConditionSystemSource } from "@item/condition/data.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Remove unused cruft from condition data */
export class Migration826GutConditionData extends MigrationBase {
    static override version = 0.826;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "condition") return;

        const system: SystemSourceWithDeletions = source.system;
        const topLevel = ["active", "base", "removable", "hud", "modifiers", "sources", "alsoApplies"] as const;

        for (const key of topLevel) {
            if (key in system) {
                delete system[key];
                system[`-=${key}`] = null;
            }
        }

        const valueData: ValueSourceWithDeletions = system.value;
        for (const key of ["immutable", "modifiers"] as const) {
            if (key in valueData) {
                delete valueData[key];
                valueData[`-=${key}`] = null;
            }
        }

        const durationData: DurationSourceWithDeletions = system.duration;
        for (const key of ["perpetual", "text"] as const) {
            if (key in durationData) {
                delete durationData[key];
                durationData[`-=${key}`] = null;
            }
        }

        system.group ||= null;
    }
}

interface SystemSourceWithDeletions extends ConditionSystemSource {
    active?: unknown;
    "-=active"?: null;
    base?: unknown;
    "-=base"?: null;
    removable?: unknown;
    "-=removable"?: null;
    hud?: unknown;
    "-=hud"?: null;
    modifiers?: unknown;
    "-=modifiers"?: null;
    sources?: unknown;
    "-=sources"?: null;
    alsoApplies?: unknown;
    "-=alsoApplies"?: unknown;
}

type ValueSourceWithDeletions = {
    value: number | null;
    immutable?: unknown;
    "-=immutable"?: null;
    modifiers?: unknown;
    "-=modifiers"?: null;
};

type DurationSourceWithDeletions = {
    value: number;
    perpetual?: unknown;
    "-=perpetual"?: null;
    text?: unknown;
    "-=text"?: null;
};

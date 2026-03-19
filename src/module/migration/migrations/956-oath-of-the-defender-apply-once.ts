import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

type OathResistanceRule = {
    key?: unknown;
    type?: unknown;
    label?: unknown;
    definition?: unknown;
    applyOnce?: unknown;
};

/** Add apply-once behavior to existing Oath of the Defender effect resistances. */
export class Migration956OathOfTheDefenderApplyOnce extends MigrationBase {
    static override version = 0.956;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "effect") return;

        for (const rule of source.system.rules as OathResistanceRule[]) {
            if (!this.#isOathResistance(rule)) continue;
            rule.applyOnce ??= true;
        }
    }

    #isOathResistance(rule: OathResistanceRule): boolean {
        return (
            rule.key === "Resistance" &&
            rule.type === "custom" &&
            rule.label === "PF2E.IWR.Custom.DamageFromSwornCreatures" &&
            Array.isArray(rule.definition) &&
            rule.definition.includes("origin:trait:{item|origin.flags.system.oathOfTheDefender}")
        );
    }
}

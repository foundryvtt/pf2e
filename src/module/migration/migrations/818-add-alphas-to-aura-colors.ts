import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";
import { isObject } from "@util";
import { AuraEffectData, AuraPart } from "@actor/types";
import { ItemTrait } from "@item/data/base";
import { RuleElementSource } from "@module/rules";

/** Add alphas to aura colors */
export class Migration818AddAlphasToAuraColors extends MigrationBase {
    static override version = 0.818;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const filter = source.system.rules
            .filter((rule) => isObject<{ key: unknown }>(rule))
            .filter((rule) => rule.key === "Aura");
        for (const rule of filter) {
            const aura: MaybeWithColorsAuraData = <MaybeWithColorsAuraData>rule;
            if (aura.colors) {
                aura.border = {
                    color: aura.colors.border,
                    alpha: 0.75,
                };

                aura.fill = {
                    color: aura.colors.fill,
                    alpha: 0,
                };

                delete aura["colors"];
            }
        }
    }
}

interface MaybeWithColorsAuraData extends RuleElementSource {
    slug: string;
    radius: number;
    effects: AuraEffectData[];
    colors?: {
        border: `#${string}`;
        fill: `#${string}`;
    } | null;
    traits: ItemTrait[];
    border: AuraPart | null;
    fill: AuraPart | null;
}

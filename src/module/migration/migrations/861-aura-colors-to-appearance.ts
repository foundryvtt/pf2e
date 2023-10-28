import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** Move aura RE `colors` data to `appearance` property */
export class Migration861AuraColorsToAppearance extends MigrationBase {
    static override version = 0.861;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const auraREs = source.system.rules.filter(
            (r): r is AuraREWithColors => r.key === "Aura" && "colors" in r && isObject(r.colors),
        );

        for (const rule of auraREs) {
            rule.appearance = {};
            if (typeof rule.colors?.border === "string") {
                rule.appearance.border = { color: rule.colors.border };
            }
            if (typeof rule.colors?.fill === "string") {
                rule.appearance.highlight = { color: rule.colors.fill };
            }
            delete rule.colors;
        }
    }
}

interface AuraREWithColors extends RuleElementSource {
    colors?: {
        border?: unknown;
        fill?: unknown;
    };
    appearance?: {
        border?: {
            color?: string;
        };
        highlight?: {
            color?: string;
        };
    };
}

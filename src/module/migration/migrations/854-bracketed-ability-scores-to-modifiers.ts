import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";
import { AELikeChangeMode } from "@module/rules/rule-element/ae-like.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { isObject } from "@util";
import { BracketedValue } from "@module/rules/rule-element/data.ts";

/** Convert bracketed AE-like rule elements changing ability scores to instead change attribute modifiers */
export class Migration854BracketedAbilityScoresToModifiers extends MigrationBase {
    static override version = 0.854;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const aeLikes = source.system.rules.filter(
            (r: MaybeAELikeSource): r is BracketedAELikeSource =>
                r.key === "ActiveEffectLike" &&
                typeof r.path === "string" &&
                /^system\.abilities\..+\.value$/.test(r.path) &&
                isObject<BracketedValue>(r.value) &&
                typeof r.value.field === "string" &&
                /^actor\|system\.abilities\.[a-z]{3}\.value$/.test(r.value.field) &&
                Array.isArray(r.value.brackets) &&
                r.value.brackets.every((b) => isObject(b) && typeof b.value === "number"),
        );

        for (const aeLike of aeLikes) {
            aeLike.path = aeLike.path.replace(/\.value$/, ".mod");
            aeLike.value.field &&= aeLike.value.field.replace(/\.value$/, ".mod");
            for (const bracket of aeLike.value.brackets) {
                if (typeof bracket.start === "number") {
                    bracket.start = Math.trunc((bracket.start - 10) / 2);
                }
                if (typeof bracket.end === "number") {
                    bracket.end = Math.trunc((bracket.end - 10) / 2);
                }
                bracket.value = bracket.value / 2;
            }
        }
    }
}

interface MaybeAELikeSource extends RuleElementSource {
    mode?: unknown;
    path?: unknown;
    phase?: unknown;
}

interface BracketedAELikeSource extends RuleElementSource {
    mode: AELikeChangeMode;
    path: string;
    value: BracketedValue<number>;
}

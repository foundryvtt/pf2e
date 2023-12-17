import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { AELikeChangeMode } from "@module/rules/rule-element/ae-like.ts";
import { MigrationBase } from "../base.ts";

/** Convert ability scores to attribute modifiers */
export class Migration852AbilityScoresToModifiers extends MigrationBase {
    static override version = 0.852;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "character") return;

        if (source.system.abilities && Object.keys(source.system.abilities).length > 0) {
            const abilityObjects: MaybeOldAbilityData[] = Object.values(source.system.abilities);
            for (const data of abilityObjects) {
                if (typeof data.value === "number") {
                    data.mod = Math.min(Math.max(Math.trunc((data.value - 10) / 2), -5), 10) || 0;
                    delete data.value;
                    data["-=value"] = null;
                }
            }
        } else if (source.system.abilities) {
            const systemData: { abilities?: unknown; "-=abilities"?: null } = source.system;
            delete systemData.abilities;
            systemData["-=abilities"] = null;
        }

        const build: { attributes?: unknown; abilities?: unknown; "-=abilities"?: unknown } = source.system.build ?? {};
        if (build.abilities) {
            build.attributes = build.abilities;
            delete build.abilities;
            build["-=abilities"] = null;
        }
    }

    /** Convert AE-like rule elements (typically on apex items) to increase ability modifiers instead of scores */
    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const apexRules = source.system.rules.filter(
            (r: MaybeAELikeSource): r is ApexRuleSource =>
                r.key === "ActiveEffectLike" &&
                typeof r.path === "string" &&
                /^system\.abilities\..+\.value$/.test(r.path) &&
                typeof r.value === "number",
        );

        for (const rule of apexRules) {
            rule.path = rule.path.replace(/\.value$/, ".mod");
            switch (rule.mode) {
                case "add":
                case "remove":
                case "subtract":
                    rule.value = Math.min(Math.max(Math.trunc(rule.value / 2), -5), 10) || 0;
                    break;
                case "downgrade":
                case "override":
                case "upgrade":
                    rule.value = Math.min(Math.max(Math.trunc((rule.value - 10) / 2), -5), 10) || 0;
                    break;
            }
        }

        // Handle other rule elements with calculated values that incorporate ability scores
        const otherRules = source.system.rules.filter(
            (r): r is RuleElementSource & { value: string } =>
                "value" in r && typeof r.value === "string" && /\.abilities\.[a-z]{3}\.value\b/.test(r.value),
        );
        for (const rule of otherRules) {
            rule.value = rule.value
                .replace(
                    /(?:floor\()?\(?@actor.abilities.([a-z]{3})\.value ?- ?10\) ?\/ ?2\)?/,
                    `@actor.abilities.$1.mod`,
                )
                .replace(/\s+/g, " ")
                .trim();
        }

        if (source.system.slug === "thaumaturges-investiture") {
            source.system.rules = source.system.rules.filter((r) => r.key !== "ActiveEffectLike");
            const bracketedAELike = {
                key: "ActiveEffectLike",
                mode: "upgrade",
                path: "system.resources.investiture.max",
                value: {
                    brackets: [
                        { end: 4, start: 4, value: 14 },
                        { end: 5, start: 5, value: 16 },
                        { end: 6, start: 6, value: 18 },
                        { start: 7, value: 20 },
                    ],
                    field: "system.abilities.cha.mod",
                },
            };
            source.system.rules.push(bracketedAELike);
        }
    }
}

interface MaybeOldAbilityData {
    mod?: number;
    value?: number;
    "-=value"?: null;
}

interface MaybeAELikeSource extends RuleElementSource {
    mode?: unknown;
    path?: unknown;
    phase?: unknown;
}

interface ApexRuleSource extends RuleElementSource {
    mode: AELikeChangeMode;
    path: string;
    value: number;
}

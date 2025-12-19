import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { AELikeSource } from "@module/rules/rule-element/ae-like.ts";
import { MigrationBase } from "../base.ts";

/**
 * Update rule elements on the Cleric doctrines to include references to the granted doctrines.
 */
export class Migration831ClericDoctrines extends MigrationBase {
    static override version = 0.831;

    get #cloisteredClericSetFlags(): AELikeSource {
        return {
            key: "ActiveEffectLike",
            mode: "override",
            path: "flags.pf2e.cleric",
            value: {
                firstDoctrine: "Compendium.pf2e.class-features.aiwxBj5MjnafCMyn",
                secondDoctrine: "Compendium.pf2e.class-features.sa7BWfnyCswAvBVa",
                thirdDoctrine: "Compendium.pf2e.class-features.s8WEmc4GGZSHSC7q",
                fourthDoctrine: "Compendium.pf2e.class-features.vxOf4LXZcqUG3P7a",
                fifthDoctrine: "Compendium.pf2e.class-features.n9W8MjjRgPpUTvWf",
                finalDoctrine: "Compendium.pf2e.class-features.DgGefatQ4v6xT6f9",
            },
        };
    }

    get #warpriestSetFlags(): AELikeSource {
        return {
            key: "ActiveEffectLike",
            mode: "override",
            path: "flags.pf2e.cleric",
            value: {
                firstDoctrine: "Compendium.pf2e.class-features.xxkszluN9icAiTO4",
                secondDoctrine: "Compendium.pf2e.class-features.D34mPo29r1J3DPaX",
                thirdDoctrine: "Compendium.pf2e.class-features.Zp81uTBItG1xlH4O",
                fourthDoctrine: "Compendium.pf2e.class-features.px3gVYp7zlEQIpcl",
                fifthDoctrine: "Compendium.pf2e.class-features.kmimy4VOaoEOgOiQ",
                finalDoctrine: "Compendium.pf2e.class-features.N1ugDqZlslxbp3Uy",
            },
        };
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat" || !source.system.slug) return;

        if (
            source.system.rules.some(
                (r: MaybeAELikeSource): r is MaybeAELikeSource =>
                    r.key === "ActiveEffectLike" && r.path === "flags.pf2e.cleric",
            )
        ) {
            return;
        }

        switch (source.system.slug) {
            case "cloistered-cleric": {
                source.system.rules.push(this.#cloisteredClericSetFlags);
                break;
            }
            case "warpriest": {
                source.system.rules.push(this.#warpriestSetFlags);
                break;
            }
        }
    }
}

interface MaybeAELikeSource extends RuleElementSource {
    path?: unknown;
}

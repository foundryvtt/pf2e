import { ActorSourcePF2e } from "@actor/data/index.ts";
import { FeatSource, ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { AELikeSource } from "@module/rules/rule-element/ae-like.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** Add support for multiple class DCs  */
export class Migration790MultipleClassDCs extends MigrationBase {
    static override version = 0.79;

    #otherClassDCs = new Map([
        ["call-implement", "thaumaturge"],
        ["eerie-proclamation", "ranger"],
        ["stunning-fist", "monk"],
        ["ring-bell", "thaumaturge"],
    ]);

    #isClassFeature(source: ItemSourcePF2e): source is FeatSource & { system: { featType: "classfeature" } } {
        return (
            source.type === "feat" &&
            "featType" in source.system &&
            isObject<{ value: string }>(source.system.featType) &&
            source.system.featType.value === "classfeature"
        );
    }

    // Remove custom modifiers at old "class" selector
    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "character") return;

        const customModifiers: Record<string, unknown> = source.system.customModifiers ?? {};
        if (customModifiers?.class) {
            customModifiers["-=class"] = null;
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (this.#isClassFeature(source)) {
            const classSlug = source.system.traits.value.at(0);
            if (!classSlug) return;
            const aeLikes = source.system.rules.filter((r): r is AELikeSource => r.key === "ActiveEffectLike");
            for (const aeLike of aeLikes) {
                if (aeLike.path === "system.attributes.classDC.rank") {
                    aeLike.path = `system.proficiencies.classDCs.${classSlug}.rank`;
                }
            }
        }

        const itemSlug = source.system.slug ?? "";
        if (this.#otherClassDCs.has(itemSlug)) {
            const oldClassDCPattern = /\bsystem\.attributes\.classDC\b/;
            const classSlug = this.#otherClassDCs.get(itemSlug)!;
            const { description } = source.system;
            description.value = description.value.replace(
                oldClassDCPattern,
                `system.proficiencies.classDCs.${classSlug}`
            );

            const notes = source.system.rules.filter(
                (r: MaybeREWithText): r is REWithText => r.key === "Note" && typeof r.text === "string"
            );
            for (const note of notes) {
                note.text = note.text.replace(oldClassDCPattern, `system.proficiencies.classDCs.${classSlug}`);
            }
        }
    }
}

interface MaybeREWithText extends RuleElementSource {
    text?: unknown;
}

interface REWithText extends RuleElementSource {
    text: string;
}

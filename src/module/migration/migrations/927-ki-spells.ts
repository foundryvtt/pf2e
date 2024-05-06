import { ItemSourcePF2e } from "@item/base/data/index.ts";
import type { AELikeSource } from "@module/rules/rule-element/ae-like.ts";
import type { RollOptionSource } from "@module/rules/rule-element/roll-option/rule-element.ts";
import { sluggify } from "@util/misc.ts";
import { MigrationBase } from "../base.ts";

export class Migration927KiSpells extends MigrationBase {
    static override version = 0.927;

    /**
     * All KI Spell Feats. Includes those with pre-requisites.
     * Even if a pre-requisite is skipped, the monk should still be treated as having ki spells (because they do).
     */
    #KI_SPELL_FEATS = new Set([
        "ki-rush",
        "ki-strike",
        "wholeness-of-body",
        "abundant-step",
        "ki-blast",
        "ki-cutting-sight",
        "clinging-shadow-stance",
        "wild-winds-initiate",
        "wind-jump",
        "wronged-monks-wrath",
        "speaking-sky",
        "shadows-web",
        "medusas-wrath",
        "quivering-palm",
        "empty-body",
        "ki-form",
        "irori-moderate-boon",
    ]);

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const slug = source.system.slug ?? sluggify(source.name);

        if (source.type === "class" && slug === "monk") {
            if (!hasSpellcastingRE(source)) {
                source.system.rules.push({
                    key: "ActiveEffectLike",
                    mode: "upgrade",
                    path: "system.proficiencies.spellcasting.rank",
                    predicate: ["qi-spell"],
                    priority: 51,
                    value: 1,
                } as AELikeSource);
            }
        }

        if (source.type !== "feat") return;

        if (this.#KI_SPELL_FEATS.has(slug)) {
            const hasKiOption = source.system.rules.some(
                (r) => r.key === "RollOption" && "option" in r && r.option === "qi-spell",
            );
            if (!hasKiOption) {
                source.system.rules.push({
                    key: "RollOption",
                    option: "qi-spell",
                } as RollOptionSource);
            }
        } else if (slug === "monk-expertise") {
            if (!hasSpellcastingRE(source)) {
                source.system.rules.push({
                    key: "ActiveEffectLike",
                    mode: "upgrade",
                    path: "system.proficiencies.spellcasting.rank",
                    predicate: ["qi-spell"],
                    priority: 51,
                    value: 2,
                } as AELikeSource);
            }
        } else if (slug === "graceful-legend") {
            if (!hasSpellcastingRE(source)) {
                source.system.rules.push({
                    key: "ActiveEffectLike",
                    mode: "upgrade",
                    path: "system.proficiencies.spellcasting.rank",
                    predicate: ["qi-spell"],
                    priority: 51,
                    value: 3,
                } as AELikeSource);
            }
        }
    }
}

function hasSpellcastingRE(source: ItemSourcePF2e) {
    return source.system.rules.some(
        (r) => r.key === "ActiveEffectLike" && "path" in r && r.path === "system.proficiencies.spellcasting.rank",
    );
}

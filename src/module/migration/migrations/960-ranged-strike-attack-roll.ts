import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString, sluggify } from "@util";
import { MigrationBase } from "../base.ts";

/** Migrate weapon-only attack rules from *-attack-roll to *-strike-attack-roll domains/selectors */
export class Migration960RangedStrikeAttackRoll extends MigrationBase {
    static override version = 0.96;

    readonly #AFFECTED_SLUGS = new Set([
        "assisting-shot",
        "double-shot",
        "effect-aquatic-combat",
        "forge-blessed-shot",
        "handspring-kick",
        "incredible-aim",
        "multishot-stance",
        "release-me",
        "sharpshooter",
        "snipers-aim",
        "stance-multishot-stance",
        "triple-shot",
        "triangle-shot",
        "underwater-marauder",
    ]);

    readonly #AFFECTED_NAMES = new Set([
        "Felling Assault",
        "Gang Up",
        "Handspring Kick",
        "Sentry's Aim",
        "Sudden Dive",
    ]);

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const slug = source.system.slug ?? sluggify(source.name);
        if (!this.#AFFECTED_SLUGS.has(slug) && !this.#AFFECTED_NAMES.has(source.name)) {
            return;
        }

        source.system.rules = recursiveReplaceString(source.system.rules, (s) => this.#migrateDomain(s));
    }

    #migrateDomain(domain: string): string {
        return domain === "ranged-attack-roll"
            ? "ranged-strike-attack-roll"
            : domain === "melee-attack-roll"
              ? "melee-strike-attack-roll"
              : domain;
    }
}

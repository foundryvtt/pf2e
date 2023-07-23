import { RuleElementSource } from "@module/rules/index.ts";
import { MigrationBase } from "../base.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { AELikeSource } from "@module/rules/rule-element/ae-like.ts";

/** Add roll options to abilities allowing one to ignore the flat-footed condition from being flanked */
export class Migration719ShrugFlanking extends MigrationBase {
    static override version = 0.719;

    override async updateItem(source: ItemSourcePF2e, actorSource?: ActorSourcePF2e): Promise<void> {
        const slug = source.system.slug ?? "";
        switch (source.type) {
            case "action": {
                if (slug === "all-around-vision") {
                    source.system.rules = [this.allAroundVision];
                } else if (actorSource?.type === "npc" && source.name === "Deny Advantage") {
                    // No slugs, unfortunately
                    const sourceId = actorSource.flags.core?.sourceId;
                    const npcId = sourceId?.replace(/^Compendium\.[^.]+\./, "") ?? actorSource._id;

                    if (this.needsDenyAdvantage(source.system.rules)) {
                        const rule = this.npcDenyAvantage(npcId);
                        source.system.rules.push(rule);
                    }
                }
                return;
            }
            case "effect": {
                if (slug === "stance-wolf-stance") {
                    source.system.rules = this.wolfStanceRules;
                }
                return;
            }
            case "feat": {
                source.system.slug = source.system.slug?.replace(/^deny-advantage-level-\d$/, "deny-advantage") ?? null;
                const featSlug = source.system.slug ?? "";

                if (
                    ["constant-gaze", "deny-advantage"].includes(featSlug) &&
                    this.needsDenyAdvantage(source.system.rules)
                ) {
                    source.system.rules.push(this.denyAdvantage);
                } else if (featSlug === "gang-up") {
                    source.system.rules = [this.gangUp];
                } else if (featSlug.startsWith("side-by-side")) {
                    const sideBySide = this.gangUp;
                    sideBySide.value = "animal-companion";
                    source.system.rules = [sideBySide];
                } else if (["pack-tactics", "squad-tactics"].includes(featSlug)) {
                    const tactics = this.gangUp;
                    tactics.value = 2;
                    source.system.rules = [tactics];
                }
            }
        }
    }

    /** Instead of merely shrugging the flat--footed condition, this will suppress all benefits of flanking */
    private get allAroundVision(): AELikeSource {
        return {
            key: "ActiveEffectLike",
            mode: "override",
            path: "system.attributes.flanking.flankable",
            value: false,
        };
    }

    private get denyAdvantage(): AELikeSource {
        return {
            key: "ActiveEffectLike",
            mode: "override",
            path: "system.attributes.flanking.flatFootable",
            value: "@actor.level",
        };
    }

    private get gangUp(): AELikeSource {
        return {
            key: "ActiveEffectLike",
            mode: "add",
            path: "system.attributes.flanking.canGangUp",
            value: 1,
        };
    }

    /** NPCs with variant Deny Advantage rules */
    private npcVariants: Map<string, number> = new Map([
        ["YsBSkW3aFwU1bl3w", 13], // Ajbal Kimon
        ["0Kb4z4h8KVqfrIju", 8], // Assassin
        ["B09JfuBZHjcRXztU", 4], // Burglar
        ["aaDiR0EIWRQx8wdy", 3], // Calmont
        ["x4m5ks6Rd8fYzXPm", 4], // Daughter Of Cocytus Enforcer
        ["qKHkamxIPbqxEiwp", 6], // Delamar Gianvin
        ["lCvJquCqvZJVnafy", 8], // Froglegs
        ["vkLhqX5oR1t89puZ", 7], // Gang Leader
        ["aIT5S2fKgMZ6pVP2", 11], // Ginjana Mindkeeper
        ["l6EuZR6zCdqyCywW", 6], // Kolbo

        ["QKkvnlqrhgLHuP1t", 10], // Mialari Docur
        ["ZY3q7AV1qbwWwNl2", 8], // Mobana
        ["6pPolNZycfDiOl2I", 8], // Nairu
        ["cQMM2Ld0IBM9GcDo", 11], // Norgorberite Poisoner
        ["VkG5yl9xcmziwpQD", 4], // Pathfinder Field Agent
        ["JrowrtDilEG8dN2s", 11], // Quara Orshendiel
        ["1lkay2gwgEquq0NF", 6], // Scarlet Triad Sneak
        ["EMl8hARVJk8SNVyW", 4], // Charming Scoundrel

        ["j31HXlZiUqQrAHSB", 12], // Tashlock Banyan
        ["pjnTEh0NVd1DB6jI", 4], // Yorulu
    ]);

    private get wolfStanceRules(): RuleElementSource[] {
        const rules = [
            {
                category: "unarmed",
                damage: { base: { damageType: "piercing", dice: 1, die: "d8" } },
                group: "brawling",
                key: "Strike",
                label: "PF2E.SpecificRule.Stance.Attack.WolfJaws",
                range: null,
                slug: "wolf-jaws",
                traits: ["agile", "backstabber", "finesse", "unarmed", "nonlethal"],
            },
            {
                definition: { all: ["weapon:wolf-jaws"] },
                key: "AdjustStrike",
                mode: "add",
                predicate: { all: ["self:flanking"] },
                property: "traits",
                value: "trip",
            },
        ];
        return rules;
    }

    private npcDenyAvantage(npcId = ""): AELikeSource {
        const { denyAdvantage } = this;
        denyAdvantage.value = this.npcVariants.get(npcId) ?? "@actor.level";
        return denyAdvantage;
    }

    private needsDenyAdvantage(rules: AELikeSource[]): boolean {
        return !rules.some(
            (r: Partial<AELikeSource>) =>
                r.key === "ActiveEffectLike" && r.path === "system.attributes.flanking.flatFootable"
        );
    }
}

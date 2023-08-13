import { ActorPF2e, CharacterPF2e } from "@actor";
import { SKILL_DICTIONARY } from "@actor/values.ts";
import { ABCItemPF2e, FeatPF2e } from "@item";
import { BackgroundSource, BackgroundSystemData } from "./data.ts";

class BackgroundPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ABCItemPF2e<TParent> {
    /** Set a skill feat granted by a GrantItem RE as one of this background's configured items */
    override prepareSiblingData(this: BackgroundPF2e<ActorPF2e>): void {
        if (Object.keys(this.system.items).length > 0) return;
        const grantedSkillFeat = Object.values(this.flags.pf2e.itemGrants)
            .flatMap((g) => this.actor.items.get(g.id) ?? [])
            .find((i): i is FeatPF2e<ActorPF2e> => i.isOfType("feat") && i.category === "skill");

        if (grantedSkillFeat) {
            this.system.items["GRANT"] = {
                uuid: grantedSkillFeat.sourceId ?? grantedSkillFeat.uuid,
                img: grantedSkillFeat.img,
                name: grantedSkillFeat.name,
                level: 1,
            };
            grantedSkillFeat.system.location = this.id;
        }
    }

    override prepareActorData(this: BackgroundPF2e<CharacterPF2e>): void {
        if (!this.actor.isOfType("character")) {
            console.error("Only a character can have a background");
            return;
        }

        this.actor.background = this;
        const { build } = this.actor.system;

        // Add ability boosts
        const boosts = Object.values(this.system.boosts);
        for (const boost of boosts) {
            if (boost.selected) {
                build.attributes.boosts.background.push(boost.selected);
            }
        }

        build.skills.increases.background = this.system.trainedSkills.value.map((s) => ({
            item: this,
            skill: SKILL_DICTIONARY[s],
            rank: 1,
            onConflict: "reallocate",
        }));
    }
}

interface BackgroundPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ABCItemPF2e<TParent> {
    readonly _source: BackgroundSource;
    system: BackgroundSystemData;
}

export { BackgroundPF2e };

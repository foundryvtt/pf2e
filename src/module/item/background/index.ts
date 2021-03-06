import { ABCItemPF2e, FeatPF2e, ItemPF2e } from "@item";
import { OneToFour } from "@module/data";
import { BackgroundData } from "./data";

class BackgroundPF2e extends ABCItemPF2e {
    /** Set a skill feat granted by a GrantItem RE as one of this background's configured items */
    override prepareSiblingData(this: Embedded<BackgroundPF2e>): void {
        if (Object.keys(this.data.data.items).length > 0) return;
        const grantedSkillFeat = this.data.flags.pf2e.itemGrants
            .flatMap((g) => this.actor.items.get(g.id) ?? [])
            .find((i: Embedded<ItemPF2e> & { featType?: unknown }): i is Embedded<FeatPF2e> => i.featType === "skill");

        if (grantedSkillFeat) {
            this.data.data.items["GRANT"] = {
                id: grantedSkillFeat.id,
                img: grantedSkillFeat.img,
                name: grantedSkillFeat.name,
                level: 1,
            };
            grantedSkillFeat.data.data.location = this.id;
        }
    }

    override prepareActorData(this: Embedded<BackgroundPF2e>): void {
        if (!this.actor.isOfType("character")) {
            console.error("Only a character can have a background");
            return;
        }

        this.actor.background = this;
        const { build } = this.actor.data.data;

        // Add ability boosts
        const boosts = Object.values(this.data.data.boosts);
        for (const boost of boosts) {
            if (boost.selected) {
                build.abilities.boosts.background.push(boost.selected);
            }
        }

        const { trainedSkills } = this.data.data;
        if (trainedSkills.value.length === 1) {
            const key = trainedSkills.value[0];
            const skill = this.actor.data.data.skills[key];
            skill.rank = Math.max(skill.rank, 1) as OneToFour;
        }
    }
}

interface BackgroundPF2e {
    readonly data: BackgroundData;
}

export { BackgroundPF2e };

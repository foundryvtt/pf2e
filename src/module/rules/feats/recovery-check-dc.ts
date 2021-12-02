import { CharacterPF2e, NPCPF2e } from "@actor";
import { ActorType } from "@actor/data";
import { RuleElementPF2e } from "../rule-element";

/**
 * @category RuleElement
 */
class RecoveryCheckDCRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    override onBeforePrepareData() {
        const slug = this.data.slug || this.item.slug;
        if (slug) {
            const actorData = this.actor.data;
            let recoveryModifier = getProperty(actorData.data.attributes, "dying.recoveryMod") || 0;
            const synergizers: string[] = getProperty(actorData.data.attributes, "dying.synergizers") || [];
            if (!synergizers.includes(slug)) {
                synergizers.push(slug);
            }

            // figure out recovery check DC modifier
            const toughness = synergizers.includes("toughness");
            const mountainsStoutness =
                synergizers.includes("mountains-stoutness") || synergizers.includes("mountainsStoutness");
            const defyDeath = synergizers.includes("defy-death") || synergizers.includes("defyDeath");
            if (toughness && mountainsStoutness) {
                recoveryModifier = -4;
            } else if (toughness && defyDeath) {
                recoveryModifier = -2;
            } else if (toughness || mountainsStoutness || defyDeath) {
                recoveryModifier = -1;
            }

            setProperty(actorData.data.attributes, "dying.recoveryMod", recoveryModifier);
            setProperty(actorData.data.attributes, "dying.synergizers", synergizers);
        } else {
            console.warn("PF2E | Recovery check DC requires at least a slug field or item slug");
        }
    }
}

interface RecoveryCheckDCRuleElement extends RuleElementPF2e {
    get actor(): CharacterPF2e | NPCPF2e;
}

export { RecoveryCheckDCRuleElement };

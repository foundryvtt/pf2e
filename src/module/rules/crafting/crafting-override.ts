import { RuleElementPF2e } from "../rule-element";

export class PF2CraftingOverrideRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(actorData: CharacterData | NPCData) {
        console.log(actorData);
    }
}
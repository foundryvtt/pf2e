import { htmlQueryAll, tagify } from "@util";
import { RuleElementForm } from "./base.ts";

class ActorTraitsForm extends RuleElementForm {
    override template = "systems/pf2e/templates/items/rules/actor-traits.hbs";
    override activateListeners(html: HTMLElement): void {
        super.activateListeners(html);
        for (const input of htmlQueryAll<HTMLInputElement>(html, "input.pf2e-tagify")) {
            tagify(input, { whitelist: CONFIG.PF2E.creatureTraits });
        }
    }
}

export { ActorTraitsForm };

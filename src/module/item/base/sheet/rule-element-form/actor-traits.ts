import { htmlQueryAll } from "@util/dom.ts";
import { tagify } from "@util/tags.ts";
import { RuleElementForm } from "./base.ts";

class ActorTraitsForm extends RuleElementForm {
    override template = `${SYSTEM_ROOT}/templates/items/rules/actor-traits.hbs`;
    override activateListeners(html: HTMLElement): void {
        super.activateListeners(html);
        for (const input of htmlQueryAll<HTMLInputElement>(html, "input.pf2e-tagify")) {
            tagify(input, { whitelist: CONFIG.PF2E.creatureTraits, enforceWhitelist: false });
        }
    }
}

export { ActorTraitsForm };

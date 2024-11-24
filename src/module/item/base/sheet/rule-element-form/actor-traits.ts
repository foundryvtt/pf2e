import { htmlQueryAll, tagify } from "@util";
import { RuleElementForm } from "./base.ts";

class ActorTraitsForm extends RuleElementForm {
    /** Active tagify instances. Have to be cleaned up to avoid memory leaks */
    #tagifyInstances: Tagify<Record<"id" | "value", string>>[] = [];

    override template = "systems/pf2e/templates/items/rules/actor-traits.hbs";
    override activateListeners(html: HTMLElement): void {
        super.activateListeners(html);
        for (const input of htmlQueryAll<HTMLInputElement>(html, "input.pf2e-tagify")) {
            this.#tagifyInstances.push(
                tagify(input, { whitelist: CONFIG.PF2E.creatureTraits, enforceWhitelist: false }),
            );
        }
    }

    protected override _resetListeners(): void {
        super._resetListeners();
        this.#tagifyInstances.forEach((tagified) => tagified.destroy());
        this.#tagifyInstances = [];
    }
}

export { ActorTraitsForm };

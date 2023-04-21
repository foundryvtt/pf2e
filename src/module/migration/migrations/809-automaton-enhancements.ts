import { ItemSourcePF2e } from "@item/data/index.ts";
import { AELikeSource } from "@module/rules/rule-element/ae-like.ts";
import { MigrationBase } from "../base.ts";

/** Add base REs to Automaton anncestry to allow for automation of enhancements */
export class Migration809AutomatonEnhancements extends MigrationBase {
    static override version = 0.809;

    get #automatonEnhancements(): AELikeSource {
        return {
            key: "ActiveEffectLike",
            mode: "override",
            path: "flags.pf2e.automaton.enhancements",
            priority: 10,
            value: { greater: [], lesser: [] },
        };
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const isAutomaton = source.type === "ancestry" && source.system.slug === "automaton";
        const rules: Record<string, unknown>[] = source.system.rules;
        if (isAutomaton && !rules.some((r) => r.path === "flags.pf2e.automaton.enhancements")) {
            source.system.rules.push(this.#automatonEnhancements);
        }
    }
}

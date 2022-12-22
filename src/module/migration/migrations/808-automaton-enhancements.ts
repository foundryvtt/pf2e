import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Add base REs to Automaton anncestry to allow for automation of enhancements */
export class Migration808AutomatonEnhancements extends MigrationBase {
    static override version = 0.808;

    get #automatonEnhancements() {
        return {
            key: "ActiveEffectLike",
            path: "flags.pf2e.automaton",
            mode: "override",
            value: { GreaterEnhancements: [], LesserEnhancements: [] },
        };
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!source.system.slug) return;
        const isAutomaton = source.type === "ancestry" && source.system.slug === "automaton";
        const rules: Record<string, unknown>[] = source.system.rules;
        if (isAutomaton && !rules.some((r) => r.path === "flags.pf2e.automaton")) {
            source.system.rules.push(this.#automatonEnhancements);
        }
    }
}

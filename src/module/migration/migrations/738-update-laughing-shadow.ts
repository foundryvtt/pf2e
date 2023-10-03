import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { MigrationBase } from "../base.ts";

/** Update the rule elements of the Laughing Shadow hybrid study, remove its presence from Arcane Cascade rules */
export class Migration738UpdateLaughingShadow extends MigrationBase {
    static override version = 0.738;

    #shadowPromise = fromUuid("Compendium.pf2e.classfeatures.3gVDqDPSz4fB5T9G");

    #cascadePromise = fromUuid("Compendium.pf2e.feature-effects.fsjO5oTKttsbpaKl");

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        const rollOptionsAll = source.flags.pf2e?.rollOptions?.all;
        if (rollOptionsAll instanceof Object && "feature:laughing-shadow:damage" in rollOptionsAll) {
            rollOptionsAll["-=feature:laughing-shadow:damage"] = false;
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "feat" && source.system.slug === "laughing-shadow") {
            const laughingShadow = await this.#shadowPromise;
            if (!(laughingShadow instanceof ItemPF2e)) return;
            source.system.rules = deepClone(laughingShadow._source.system.rules);
        } else if (source.type === "effect" && source.system.slug === "stance-arcane-cascade") {
            const arcaneCascade = await this.#cascadePromise;
            if (!(arcaneCascade instanceof ItemPF2e)) return;

            const newRules = deepClone(arcaneCascade._source.system.rules);

            // Retrieve the ChoiceSet selection if one has been made
            const withSelection = source.system.rules.find(
                (r: RuleElementSource & { selection?: unknown }): r is RuleElementSource & { selection: string } =>
                    r.key === "ChoiceSet" && typeof r.selection === "string"
            );

            if (withSelection) {
                const unselected = newRules.find(
                    (r: RuleElementSource & { selection?: unknown }): r is RuleElementSource & { selection?: string } =>
                        r.key === "ChoiceSet"
                );
                if (unselected) unselected.selection = withSelection.selection;
            }

            source.system.rules = newRules;
        }
    }
}

import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { ModifierType } from "@actor/modifiers.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { MigrationBase } from "../base.ts";

/** Convert experimental FlatModifier `ActiveEffect`s to Rule Elements */
export class Migration675FlatModifierAEsToREs extends MigrationBase {
    static override version = 0.675;

    #isFlatModifier(data: unknown): data is ActiveEffectModifier {
        const dataIsModifier = (obj: {
            modifier?: unknown;
            type?: unknown;
        }): obj is { modifier: string | number; type: string } =>
            (typeof obj.modifier === "number" || typeof obj.modifier === "string") && typeof obj.type === "string";
        return typeof data === "object" && data !== null && dataIsModifier(data);
    }

    #toRuleElement(aeValue: string): FlatModifierSource | null {
        const aeModifier = ((): ActiveEffectModifier | null => {
            try {
                const parsed = JSON.parse(aeValue);
                return this.#isFlatModifier(parsed) ? parsed : null;
            } catch (error) {
                console.warn(error);
                return null;
            }
        })();
        if (typeof aeModifier?.modifier === "string") {
            aeModifier.modifier.replace("@data.", "@");
        }

        return aeModifier && { key: "FlatModifier", type: aeModifier.type, value: aeModifier.modifier, selector: "hp" };
    }

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        for (const effect of [...actorSource.effects]) {
            if (effect.changes.some((change) => change.key.endsWith(".modifiers"))) {
                actorSource.effects.splice(actorSource.effects.indexOf(effect), 1);
            }
        }
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        for (const effect of [...itemSource.effects]) {
            for (const change of effect.changes.filter((change) => change.key.endsWith(".modifiers"))) {
                const reData = this.#toRuleElement(change.value);
                if (reData) {
                    effect.changes.splice(effect.changes.indexOf(change), 1);
                    itemSource.system.rules.push(reData);
                }
            }
            if (effect.changes.length === 0) {
                itemSource.effects.splice(itemSource.effects.indexOf(effect), 1);
            }
        }
    }
}

interface ActiveEffectModifier {
    name: string;
    key: string;
    type: ModifierType;
    modifier: string | number;
}

interface FlatModifierSource extends RuleElementSource {
    selector: string;
    type?: ModifierType;
}

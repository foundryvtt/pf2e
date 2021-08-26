import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";
import { RuleElementSource, RuleValue } from "@module/rules/rules-data-definitions";
import { ActorSourcePF2e } from "@actor/data";

export class Migration657RemoveSetProperty extends MigrationBase {
    static override version = 0.657;

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        const systemFlags = actorSource.flags.pf2e ?? {};
        delete systemFlags["set-property"];
        if ("game" in globalThis && "set-property" in systemFlags) {
            systemFlags["-=set-property"] = null;
        }
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        itemSource.data.rules ??= [];
        const rules = itemSource.data.rules;
        const setPropertyRules = itemSource.data.rules.filter(
            (rule): rule is SetPropertySource =>
                ["SetProperty", "PF2E.RuleElement.SetProperty"].includes(rule.key) &&
                "property" in rule &&
                typeof rule["property"] === "string" &&
                "on" in rule &&
                typeof rule["on"] === "object" &&
                rule["on"] !== null &&
                "added" in rule["on"]
        );
        const aeLikes = setPropertyRules.map(
            (setProperty): AELikeSource => ({
                key: "ActiveEffectLike",
                mode: "override",
                path: setProperty.property.replace(/^flags\.2e/, "flags.pf2e"),
                value: setProperty.on.added,
                priority: 10,
            })
        );
        for (const setPropertyRule of setPropertyRules) {
            const index = rules.indexOf(setPropertyRule);
            rules.splice(index, 1, aeLikes.shift()!);
        }
    }
}

interface SetPropertySource extends RuleElementSource {
    property: string;
    on: {
        added: RuleValue;
    };
}

interface AELikeSource extends RuleElementSource {
    mode: "override";
    path: string;
    value: RuleValue;
}

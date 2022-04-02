import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { sluggify } from "@util";
import { Migration727TrimSelfRollOptions } from "./727-trim-self-roll-options";

/** Retire ToggleProperty rule element, converting them to toggleable RollOption ones */
export class Migration731TogglePropertyToRollOption extends Migration727TrimSelfRollOptions {
    static override version = 0.731;

    protected override optionPattern = /^target:flatFooted$/;

    protected override optionReplacement = "target:condition:flat-footed";

    #pathPattern = /^flags\.pf2e\.rollOptions\.([^.]+)\.([^.]+)$/;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.data.rules = source.data.rules.map((r) => this.trimPredicates(r)) as RuleElementSource[];

        const rules: TogglePropertyOrRollOption[] = source.data.rules;
        for (const rule of [...rules]) {
            if (rule.key !== "ToggleProperty") continue;

            const match = this.#pathPattern.exec(rule.property?.trim() ?? "");
            if (!(match?.length === 3 && match[1].length >= 2 && match[2].length >= 1)) {
                rules.splice(rules.indexOf(rule), 1);
                continue;
            }

            rule.key = "RollOption";
            rule.domain = match[1];
            rule.option = match[2];
            rule.toggleable = true;
            delete rule.property;

            if (typeof rule.default === "boolean") {
                rule.value = rule.default;
                delete rule.default;
            }

            if (sluggify(rule.label ?? "") === source.data.slug) {
                delete rule.label;
            }
        }
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.flags.pf2e?.rollOptions?.all) {
            source.flags.pf2e.rollOptions.all["-=panache"] = false;
            source.flags.pf2e.rollOptions.all["-=rage"] = false;
            source.flags.pf2e.rollOptions.all["-=target:flatFooted"] = false;
        }
    }
}

type TogglePropertyOrRollOption = RuleElementSource & {
    domain?: string;
    option?: string;
    toggleable?: boolean;
    default?: boolean;
    property?: string;
};

import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { isObject } from "@util";
import { MigrationBase } from "../base";

/** Trim roll options with "self:" prefixes but are unnecessary for targeting */
export class Migration727TrimSelfRollOptions extends MigrationBase {
    static override version = 0.727;

    protected optionPattern = /^self:(ability|class|feat(?:ure)?|perception|skill):/;

    protected optionReplacement = "$1:";

    protected trimRollOption(option: string): string {
        return option.replace(this.optionPattern, this.optionReplacement);
    }

    protected trimPredicates(obj: Record<string, unknown>): Record<string, unknown> {
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === "string") {
                obj[key] = this.trimRollOption(value);
            } else if (Array.isArray(value)) {
                obj[key] = value.map((e: unknown) =>
                    typeof e === "string"
                        ? this.trimRollOption(e)
                        : isObject<Record<string, unknown>>(e)
                        ? this.trimPredicates(e)
                        : e
                );
            } else if (isObject<Record<string, unknown>>(value)) {
                obj[key] = this.trimPredicates(value);
            }
        }

        return obj;
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.data.rules = source.data.rules.map((r) => this.trimPredicates(r)) as RuleElementSource[];
    }
}

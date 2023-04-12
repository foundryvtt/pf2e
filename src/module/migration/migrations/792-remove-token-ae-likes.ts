import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { MigrationBase } from "../base.ts";

/** Remove older AE-like REs that set properties in an actor's prototype token  */
export class Migration792RemoveTokenAELikes extends MigrationBase {
    static override version = 0.792;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const rules: RESourceWithOtherStuff[] = source.system.rules;
        for (const rule of [...rules]) {
            if (rule.key === "ActiveEffectLike" && typeof rule.path === "string" && /^token\./.test(rule.path)) {
                rules.splice(rules.indexOf(rule), 1);
            }
        }
    }
}

type RESourceWithOtherStuff = RuleElementSource & Record<string, unknown>;

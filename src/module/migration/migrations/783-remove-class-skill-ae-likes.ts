import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { MigrationBase } from "../base.ts";

/** Remove class AE-likes setting skill proficiencies to trained */
export class Migration783RemoveClassSkillAELikes extends MigrationBase {
    static override version = 0.783;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "class") {
            source.system.rules = source.system.rules.filter(
                (r: RuleElementSource & { path?: unknown; value?: unknown }) =>
                    !(
                        r.key === "ActiveEffectLike" &&
                        typeof r.path === "string" &&
                        /^system.skills\.[a-z]{3}\.rank$/.test(r.path) &&
                        r.value === 1
                    )
            );
        }
    }
}

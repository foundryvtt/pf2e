import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { sluggify } from "@util";
import { MigrationBase } from "../base";

/** Add AE-likes to set encumbrance "bonuses" */
export class Migration689EncumberanceActiveEffects extends MigrationBase {
    static override version = 0.689;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        const systemData = itemSource.data;
        const slug = systemData.slug ?? sluggify(itemSource.name);

        const amountToIncreaseBy = (() => {
            if (itemSource.type === "feat" && slug === "hefty-hauler") {
                return 2;
            } else if (itemSource.type === "feat" && slug === "hardy-traveler") {
                return 1;
            } else if (itemSource.type === "equipment" && slug === "lifting-belt") {
                return 1;
            }

            return 0;
        })();

        if (amountToIncreaseBy === 0) return;

        const alreadyMigrated = systemData.rules.some((x: { key: string }) => x.key === "ActiveEffectLike");
        if (alreadyMigrated) return;

        const rules: (RuleElementSource & { [key: string]: unknown })[] = [
            {
                key: "ActiveEffectLike",
                path: "data.attributes.bonusEncumbranceBulk",
                mode: "add",
                value: amountToIncreaseBy,
            },
            {
                key: "ActiveEffectLike",
                path: "data.attributes.bonusLimitBulk",
                mode: "add",
                value: amountToIncreaseBy,
            },
        ];

        for (const rule of rules) {
            systemData.rules.push(rule);
        }
    }
}

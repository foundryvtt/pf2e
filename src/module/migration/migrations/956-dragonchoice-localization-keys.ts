import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Migrate Dragon Disciple ChoiceSet label keys to use PF2E.Dragon.* */
export class Migration956DragonChoiceLocalizationKeys extends MigrationBase {
    static override version = 0.956;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const OLD_PREFIX = "PF2E.SpecificRule.DragonDisciple.DragonChoice.";
        const NEW_PREFIX = "PF2E.Dragon.";

        const migrate = (value: unknown): void => {
            if (!value) return;
            if (Array.isArray(value)) {
                for (const element of value) migrate(element);
                return;
            }
            if (typeof value !== "object") return;

            const record = value as Record<string, unknown>;
            const label = record.label;
            if (typeof label === "string" && label.includes(OLD_PREFIX)) {
                record.label = label.replace(OLD_PREFIX, NEW_PREFIX);
            }

            for (const child of Object.values(record)) {
                migrate(child);
            }
        };

        migrate(source.system.rules);
    }
}


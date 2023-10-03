import { ItemSourcePF2e } from "@item/data/index.ts";
import { isObject } from "@util";
import { Migration702REFormulasAtInstanceLevel } from "./702-re-formulas-at-instance-level.ts";

export class Migration709REFormulasAtInstanceLevelRedux extends Migration702REFormulasAtInstanceLevel {
    static override version = 0.709;

    private walkObject(obj: Record<string | number, unknown> | unknown[]): void {
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                obj[i] = this.findAndMigrateFormulas(obj[i]);
            }
        } else {
            for (const [key, value] of Object.entries(obj)) {
                obj[key] = this.findAndMigrateFormulas(value);
            }
        }
    }

    private findAndMigrateFormulas(value: unknown): unknown {
        if (typeof value === "string" && value.includes("@")) {
            return this.raiseToInstanceLevel(value);
        } else if (isObject<Record<string | number, unknown>>(value)) {
            this.walkObject(value);
        }

        return value;
    }

    /** Migrate nested roll formulas on rule elements */
    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        const rules = itemSource.system.rules.filter((r) => r.key === "BattleForm");
        for (const rule of rules) {
            this.walkObject(rule);
        }

        // Empty rule elements on wild-shape spell, as they interfere with battle forms
        if (itemSource.type === "spell" && itemSource.system.slug === "wild-shape") {
            itemSource.system.rules = [];
        }
    }
}

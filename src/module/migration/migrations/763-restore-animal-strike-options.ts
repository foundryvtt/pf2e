import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { MigrationBase } from "../base.ts";

/** Restore options array to Strike REs on Animal Instinct class features */
export class Migration763RestoreAnimalStrikeOptions extends MigrationBase {
    static override version = 0.763;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat" || !/^[a-z]+-animal-instinct$/.test(source.system.slug ?? "")) {
            return;
        }

        const strikeRE = source.system.rules.find(
            (r: RESourceWithOptions): r is RESourceWithOptions => r.key === "Strike" && !Array.isArray(r.options)
        );
        if (strikeRE) strikeRE.options = ["animal-instinct"];
    }
}

interface RESourceWithOptions extends RuleElementSource {
    options?: string[];
}

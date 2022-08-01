import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { MigrationBase } from "../base";

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

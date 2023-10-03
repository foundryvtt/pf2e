import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Remove duplicate Recall Knowledge action items */
export class Migration799RMRecallKnowledgeDuplicates extends MigrationBase {
    static override version = 0.799;

    #oldIdsPattern = new RegExp(
        "pf2e\\.actionspf2e\\.(?:"
            .concat(
                [
                    "KygTSeDvsFoSO6HW",
                    "B0Eu3EfwIa9kyDEA",
                    "SeUolRoPzorFUAaI",
                    "eT1jXYvz2YH70Ovp",
                    "B2BpIZFHoF9Kjzpx",
                    "LZgjpWd0pL3vK9Q1",
                    "KUfLlXDWTcAWhl8l",
                ].join("|")
            )
            .concat(")"),
        "g"
    );

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system.description.value ??= ""; // In case of uncorrected `null` value due to upstream bug from V9
        source.system.description.value = source.system.description.value.replace(
            this.#oldIdsPattern,
            "pf2e.actionspf2e.1OagaWtBpVXExToo"
        );
    }
}

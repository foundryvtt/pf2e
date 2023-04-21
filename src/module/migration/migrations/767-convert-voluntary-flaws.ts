import { AbilityString } from "@actor/types.ts";
import { AncestrySystemData } from "@item/ancestry/data.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

export class Migration767ConvertVoluntaryFlaws extends MigrationBase {
    static override version = 0.767;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "ancestry") return;

        const system: AncestrySystemDataMaybeOld = source.system;
        const oldFlaws = Object.values(system.voluntaryFlaws ?? {})
            .map((b) => b.selected)
            .filter((a): a is AbilityString => !!a);
        const oldBoosts = Object.values(system.voluntaryBoosts ?? {})
            .map((b) => b.selected)
            .filter((a): a is AbilityString => !!a);

        if (oldBoosts.length || oldFlaws.length) {
            system.voluntary = {
                boost: oldBoosts.at(0) || null,
                flaws: oldFlaws,
            };
        }

        if (system.voluntaryBoosts) {
            delete system.voluntaryBoosts;
            delete system["-=voluntaryBoosts"];
        }

        if (system.voluntaryFlaws) {
            delete system.voluntaryFlaws;
            delete system["voluntaryFlaws"];
        }
    }
}

interface DatumOld {
    value: AbilityString[];
    selected: AbilityString | null;
}

interface AncestrySystemDataMaybeOld extends AncestrySystemData {
    voluntaryBoosts?: Record<string, DatumOld>;
    voluntaryFlaws?: Record<string, DatumOld>;
    "-=voluntaryBoosts"?: null;
    "-=voluntaryFlaws"?: null;
    voluntary?: {
        flaws: AbilityString[];
        boost?: AbilityString | null;
    };
}

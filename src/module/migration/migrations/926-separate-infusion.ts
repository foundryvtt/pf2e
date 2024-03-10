import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

export class Migration926SeparateBlastInfusion extends MigrationBase {
    static override version = 0.926;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system.rules = recursiveReplaceString(source.system.rules, (s) =>
            s.replaceAll("flags.pf2e.kineticist.elementalBlast.infusion", "flags.pf2e.kineticist.blastInfusion"),
        );
    }
}

import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Remove redundant "sustained for up to" in free-text spell durations. */
export class Migration913SpellSustainedText extends MigrationBase {
    static override version = 0.913;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "spell") return;

        const duration = source.system.duration;
        duration.value &&= duration.value.trim();

        if (/^sustained$/i.test(duration.value)) {
            duration.value = "";
            duration.sustained = true;
        } else if (/^sustained/i.test(duration.value)) {
            duration.value = duration.value.replace(/^sustained.+?(?=\d)/i, "");
            duration.sustained = true;
        }
    }
}

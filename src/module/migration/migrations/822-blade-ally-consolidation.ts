import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Rename references to retired compendiums */
export class Migration822BladeAllyConsolidation extends MigrationBase {
    static override version = 0.822;

    #rename(text: string): string {
        return text
            .replace(/\bfeat-effects\.Effect: Blade Ally Anarchic Rune\b/g, "equipment-srd.Anarchic")
            .replace(/\bfeat-effects\.xLXFK4mtzgAF4zvx\b/g, "equipment-srd.65YL6nk1jIzCWutt")
            .replace(/\bfeat-effects\.Effect: Blade Ally Axiomatic Rune\b/g, "equipment-srd.Axiomatic")
            .replace(/\bfeat-effects\.ZzE6jPbCyUqEqhcb\b/g, "equipment-srd.6xu6dPIaUZ7edKEB")
            .replace(/\bfeat-effects\.Effect: Blade Ally Disrupting Rune\b/g, "equipment-srd.Disrupting")
            .replace(/\bfeat-effects\.eippbzuocVM6ftcj\b/g, "equipment-srd.LwQb7ryTC8FlOXgX")
            .replace(/\bfeat-effects\.Effect: Blade Ally Fearsome Rune\b/g, "equipment-srd.Fearsome")
            .replace(/\bfeat-effects\.6LgJB4ypaSTWSJLu\b/g, "equipment-srd.P6v2AtJw7AUwaDzf")
            .replace(/\bfeat-effects\.Effect: Blade Ally Flaming Rune\b/g, "equipment-srd.Flaming")
            .replace(/\bfeat-effects\.YxYr18vleIt2t3RS\b/g, "equipment-srd.XszNvxnymWYRaoTp")
            .replace(/\bfeat-effects\.Effect: Blade Ally Holy Rune\b/g, "equipment-srd.Holy")
            .replace(/\bfeat-effects\.l98IthkklgLDJXIo\b/g, "equipment-srd.DH0kB9Wbr5pDeunX")
            .replace(/\bfeat-effects\.Effect: Blade Ally Keen Rune\b/g, "equipment-srd.Keen")
            .replace(/\bfeat-effects\.Gf7h44DcTB43464h\b/g, "equipment-srd.hg3IogR8ue2IWwgS")
            .replace(/\bfeat-effects\.Effect: Blade Ally Unholy Rune\b/g, "equipment-srd.Unholy")
            .replace(/\bfeat-effects\.rGSc2PtvU3mgm18S\b/g, "equipment-srd.gmMrJREf4JSHd2dZ")
            .replace(/\bfeat-effects\.Effect: Blade Ally Ghost Touch Rune\b/g, "equipment-srd.Ghost Touch")
            .replace(/\bfeat-effects\.Rgio0hasm2epEMfh\b/g, "equipment-srd.JQdwHECogcTzdd8R")
            .replace(
                /\bfeat-effects\.Effect: Blade Ally Disrupting Rune (Greater)\b/g,
                "equipment-srd.Disrupting (Greater)"
            )
            .replace(/\bfeat-effects\.HjfIXg5btodThCTW\b/g, "equipment-srd.oVrVzML63VFvVfKk");
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!source.system.description.value.includes("feat-effects")) {
            return;
        }
        source.system.description.value = this.#rename(source.system.description.value);
    }
}

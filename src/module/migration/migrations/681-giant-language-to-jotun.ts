import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Replace the "Giant" language with "Jotun" */
export class Migration681GiantLanguageToJotun extends MigrationBase {
    static override version = 0.681;

    private replaceGiant({ value }: { value: string[] }): void {
        const giantIndex = value.indexOf("giant");
        if (giantIndex !== -1) value.splice(giantIndex, 1, "jotun");
    }

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if (!(actorSource.type === "character" || actorSource.type === "npc")) return;
        this.replaceGiant(actorSource.data.traits.languages);
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type !== "ancestry") return;
        this.replaceGiant(itemSource.data.additionalLanguages);
    }
}

import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

export class Migration710RarityToString extends MigrationBase {
    static override version = 0.71;

    private updateTraits(traits: { rarity?: string | { value: string } } | null): void {
        if (typeof traits?.rarity === "object" && traits.rarity !== null) {
            traits.rarity = traits.rarity.value;
        }
    }

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if ("traits" in actorSource.data) this.updateTraits(actorSource.data.traits ?? null);
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if ("traits" in itemSource.data) this.updateTraits(itemSource.data.traits ?? null);
    }
}

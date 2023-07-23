import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

export class Migration710RarityToString extends MigrationBase {
    static override version = 0.71;

    private updateTraits(traits: { rarity?: string | { value: string } } | null): void {
        if (typeof traits?.rarity === "object" && traits.rarity !== null) {
            traits.rarity = traits.rarity.value;
        }
    }

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if ("traits" in actorSource.system) this.updateTraits(actorSource.system.traits ?? null);
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if ("traits" in itemSource.system) this.updateTraits(itemSource.system.traits ?? null);
    }
}

import type { ActorPF2e } from "@actor";
import type { ItemPF2e } from "@item";

export class ActiveEffectPF2e<TParent extends ActorPF2e | ItemPF2e | null> extends ActiveEffect<TParent> {
    protected override async _preCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        user: User,
    ): Promise<boolean | void> {
        // Only allow the death overlay effect
        if (!data.statuses.includes("dead")) return false;

        return super._preCreate(data, operation, user);
    }
}

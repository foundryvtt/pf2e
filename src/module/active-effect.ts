import type { ActorPF2e } from "@actor";
import type { ItemPF2e } from "@item";

/** Disable Active Effects */
export class ActiveEffectPF2e<TParent extends ActorPF2e | ItemPF2e | null> extends ActiveEffect<TParent> {
    constructor(
        data: DeepPartial<foundry.documents.ActiveEffectSource>,
        context?: DocumentConstructionContext<TParent>,
    ) {
        data.disabled = true;
        data.transfer = false;
        super(data, context);
    }

    static override async createDocuments<T extends foundry.abstract.Document>(this: ConstructorOf<T>): Promise<T[]> {
        return [];
    }
}

/** Disable Active Effects */
export class ActiveEffectPF2e extends ActiveEffect {
    constructor(
        data: DeepPartial<foundry.data.ActiveEffectSource>,
        context?: DocumentConstructionContext<ActiveEffectPF2e>
    ) {
        data.disabled = true;
        data.transfer = false;
        super(data, context);
    }

    static override async createDocuments<T extends foundry.abstract.Document>(this: ConstructorOf<T>): Promise<T[]> {
        return [];
    }
}

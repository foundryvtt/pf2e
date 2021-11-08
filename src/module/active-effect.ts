export class ActiveEffectPF2e extends ActiveEffect {
    /** Disable ActiveEffects */
    constructor(
        data: DeepPartial<foundry.data.ActiveEffectSource>,
        context?: DocumentConstructionContext<ActiveEffectPF2e>
    ) {
        data.disabled = true;
        data.transfer = false;
        super(data, context);
    }
}

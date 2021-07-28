import { ItemConstructionContextPF2e, ItemPF2e } from '@item/base';
import { ItemSourcePF2e } from '@item/data';
import { EffectPF2e } from '@item/effect';
import { tupleHasValue } from '@module/utils';
import { ConditionData } from './data';

interface ConditionConstructionContext extends ItemConstructionContextPF2e {
    pf2e?: ItemConstructionContextPF2e['pf2e'] & {
        conditionReady?: true;
    };
}

export class ConditionPF2e extends ItemPF2e {
    /** Is this condition locked by another condition? */
    isLocked!: boolean;

    /** The effect that applied this condition, if any */
    appliedBy!: EffectPF2e | ConditionPF2e | null;

    /** The list of conditions that override this condition */
    overriders!: ConditionPF2e[];

    /** Conditions that have subclasses */
    private static SUBCLASSED = ['blinded', 'dazzled', 'drained'] as const;

    constructor(data: PreCreate<ItemSourcePF2e>, context: ConditionConstructionContext) {
        const slug = data.data?.slug ?? '';
        if (context.pf2e?.ready && context.pf2e.conditionReady) {
            super(data, context);
        } else if (tupleHasValue(ConditionPF2e.SUBCLASSED, slug)) {
            context.pf2e = { ready: true, conditionReady: true };
            return new CONFIG.PF2E.Item.conditionClasses[slug](data, context);
        } else {
            context.pf2e = { ready: true };
            super(data, context);
        }
    }

    static override get schema(): typeof ConditionData {
        return ConditionData;
    }

    static get Blinded() {
        return CONFIG.PF2E.Item.conditionClasses.blinded;
    }

    static get Dazzled() {
        return CONFIG.PF2E.Item.conditionClasses.dazzled;
    }

    static get Drained() {
        return CONFIG.PF2E.Item.conditionClasses.drained;
    }

    /** Is the condition currently active? */
    get isActive(): boolean {
        return this.data.data.active && !this.isOverridden;
    }

    /** This condition's value, if any */
    get value(): number | null {
        return this.data.data.value.value;
    }

    /** This condition's duration, if any */
    get duration(): number | null {
        return this.data.data.duration.perpetual ? null : this.data.data.duration.value;
    }

    /** Is the condition from the pf2e system or a module? */
    get fromSystem(): boolean {
        return !!this.getFlag('pf2e', 'condition');
    }

    /** Is the condition found in the token HUD menu? */
    get isInHUD(): boolean {
        return this.data.data.sources.hud;
    }

    get isOverridden(): boolean {
        return this.overriders.length > 0;
    }

    isAppliedBy(condition: ConditionPF2e): boolean {
        return this.data.data.references.parent?.id === condition.id;
    }

    override prepareBaseData() {
        super.prepareBaseData();
        this.isLocked = false;
        this.appliedBy = null;
        this.overriders = [];

        // Ensure value.isValued and value.value are in sync
        const systemData = this.data.data;
        systemData.value.value = systemData.value.isValued ? Number(systemData.value.value) || 1 : null;
    }

    override prepareSiblingData(): void {
        super.prepareSiblingData();
        this.appliedBy = this.actor.conditions.find((condition) => this.isAppliedBy(condition)) ?? null;
        this.isLocked = !!this.appliedBy;
    }
}

export interface ConditionPF2e {
    readonly data: ConditionData;

    getFlag(scope: 'core', key: 'sourceId'): string | undefined;
    getFlag(scope: 'pf2e', key: 'condition'): true | undefined;
    getFlag(scope: string, key: string): any;
}

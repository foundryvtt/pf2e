import { CreaturePF2e } from '@actor';
import { ConditionSource } from '@item/data';
import { UserPF2e } from '@module/user';
import { ConditionPF2e } from './base';

export class DrainedConditionPF2e extends ConditionPF2e {
    /** Deduct level * value from current hit points */
    override _onCreate(data: ConditionSource, options: DocumentModificationContext, userId: string) {
        if (userId == game.user.id && this.actor instanceof CreaturePF2e) {
            const currentHP = this.actor.data._source.data.attributes.hp.value;
            const hpLoss = this.value * this.actor.level;
            this.actor.update({ 'data.attributes.hp.value': Math.max(currentHP - hpLoss, 0) });
        }
        super._onCreate(data, options, userId);
    }

    /** If the drained value was increased, deduct the difference */
    override async _preUpdate(
        data: DeepPartial<ConditionSource>,
        options: DocumentModificationContext,
        user: UserPF2e,
    ): Promise<void> {
        const newValue = mergeObject(this.toObject(), data).data.value.value!;
        if (newValue > this.value) {
            const currentHP = this.actor.data._source.data.attributes.hp.value;
            const hpLoss = newValue * this.actor.level - this.value * this.actor.level;
            await this.actor.update({ 'data.attributes.hp.value': currentHP - hpLoss });
        }
        await super._preUpdate(data, options, user);
    }
}

export interface DrainedConditionPF2e extends ConditionPF2e {
    get value(): number;
}

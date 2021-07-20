import { RuleElementPF2e } from '../rule-element';

const SIZE_TO_TOKEN_SIZE: Record<string, number> = {
    tiny: 0.5,
    small: 1,
    medium: 1,
    large: 2,
    huge: 3,
    gargantuan: 4,
};

/**
 * @category RuleElement
 */
export class PF2TokenSizeRuleElement extends RuleElementPF2e {
    override onAfterPrepareData() {
        const value = this.data.value;
        const size = typeof value === 'string' ? SIZE_TO_TOKEN_SIZE[value] : this.resolveValue(this.data.value);
        if (!Object.values(SIZE_TO_TOKEN_SIZE).includes(size)) {
            const sizes = Object.keys(SIZE_TO_TOKEN_SIZE).join(', ');
            console.warn(`PF2E System | Token Size requires one of ${sizes}`);
            this.ignored = true;
            return;
        }

        mergeObject(this.actor.overrides, { token: { height: size, width: size } });
    }
}

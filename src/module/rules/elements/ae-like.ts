import { ItemPF2e } from '@item';
import { RuleElementPF2e } from '../rule-element';
import { RuleElementConstructionData, RuleElementData } from '../rules-data-definitions';

const CHANGE_MODES = ['multiply', 'add', 'downgrade', 'upgrade', 'override'];

/**
 * Make a numeric modification to an arbitrary property in a similar way as `ActiveEffect`s
 * @category RuleElement
 */
export class AELikeRuleElement extends RuleElementPF2e {
    constructor(data: AELikeConstructionData, item: Embedded<ItemPF2e>) {
        data.priority ??=
            typeof data.mode === 'string' && CHANGE_MODES.includes(data.mode)
                ? CHANGE_MODES.indexOf(data.mode) * 10 + 10
                : NaN;

        super(data, item);

        if (Number.isNaN(data.priority)) {
            this.ignored = true;
            return;
        }

        // Validate all data properties
        const actor = item.actor;
        const pathIsValid =
            typeof data.path === 'string' &&
            [data.path, data.path.replace(/(?<=\.)\w+$/, ''), data.path.replace(/(?<=\.\w\.)\w+$/, '')].some(
                (path) => typeof getProperty(actor.data, path) !== undefined,
            );
        if (!pathIsValid) this.warn('path');

        const valueIsValid = typeof data.value === 'number' || typeof data.value === 'string';
        if (!valueIsValid) this.warn('value');

        const priorityIsValid = typeof data.priority === 'number';
        if (!priorityIsValid) this.warn('priority');

        const dataIsValid = pathIsValid && valueIsValid && priorityIsValid;

        if (!dataIsValid) this.ignored = true;
    }

    override onBeforePrepareData(): void {
        if (this.ignored) return;

        const change: unknown = this.resolveValue(this.data.value);
        const current: unknown = getProperty(this.actor.data, this.data.path);

        switch (this.data.mode) {
            case 'multiply': {
                if (!(typeof change === 'number' && (typeof current === 'number' || current === undefined))) {
                    return this.warn('path');
                }
                setProperty(this.actor.data, this.data.path, current ?? 0 * change);
                break;
            }
            case 'add': {
                if (!(typeof change === 'number' && (typeof current === 'number' || current === undefined))) {
                    return this.warn('path');
                }
                setProperty(this.actor.data, this.data.path, current ?? 0 + change);
                break;
            }
            case 'downgrade': {
                if (!(typeof change === 'number' && (typeof current === 'number' || current === undefined))) {
                    return this.warn('path');
                }
                setProperty(this.actor.data, this.data.path, Math.min(current ?? 0, change));
                break;
            }
            case 'upgrade': {
                if (!(typeof change === 'number' && (typeof current === 'number' || current === undefined))) {
                    return this.warn('path');
                }
                setProperty(this.actor.data, this.data.path, Math.max(current ?? 0, change));
                break;
            }
            case 'override': {
                const currentValue = getProperty(this.actor.data, this.data.path);
                if (typeof change === typeof currentValue || currentValue === undefined) {
                    setProperty(this.actor.data, this.data.path, change);
                }
            }
        }
    }

    private warn(path: string): void {
        const item = this.item;
        console.warn(
            `PF2e System | "${path}" property on RuleElement from item ${item.name} (${item.uuid}) is invalid`,
        );
    }
}

export interface AELikeRuleElement extends RuleElementPF2e {
    data: AELikeRuleElementData;
}

type AELikeChangeMode = 'add' | 'multiply' | 'upgrade' | 'downgrade' | 'override';

interface AELikeRuleElementData extends RuleElementData {
    path: string;
    value: string | number;
    mode: AELikeChangeMode;
    priority: number;
}

interface AELikeConstructionData extends RuleElementConstructionData {
    mode?: unknown;
    path?: unknown;
}

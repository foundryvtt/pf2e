import { ActionsPF2e, SkillActionOptions } from '../actions';

export function impersonate(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'deception');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph,
        'PF2E.Actions.Impersonate.Title',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:impersonate'],
        ['action:impersonate'],
        ['concentrate', 'exploration', 'manipulate', 'secret'],
        checkType,
        options.event,
        (target) => target.perception,
        (selector: string) => [
            ActionsPF2e.note(selector, 'PF2E.Actions.Impersonate', 'success'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Impersonate', 'failure'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Impersonate', 'criticalFailure'),
        ],
    );
}

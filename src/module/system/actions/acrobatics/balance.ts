import { ActionsPF2e, SkillActionOptions } from '../actions';

export function balance(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'acrobatics');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.Balance.Title',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:balance'],
        ['action:balance'],
        ['move'],
        checkType,
        options.event,
        undefined,
        (selector: string) => [
            ActionsPF2e.note(selector, 'PF2E.Actions.Balance', 'criticalSuccess'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Balance', 'success'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Balance', 'failure'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Balance', 'criticalFailure'),
        ],
    );
}

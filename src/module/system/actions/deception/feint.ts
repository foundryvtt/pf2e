import { ActionsPF2e, SkillActionOptions } from '../actions';

export function feint(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'deception');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.Feint.Title',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:feint'],
        ['action:feint'],
        ['mental'],
        checkType,
        options.event,
        (target) => target.perception,
        (selector: string) => [
            ActionsPF2e.note(selector, 'PF2E.Actions.Feint', 'criticalSuccess'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Feint', 'success'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Feint', 'criticalFailure'),
        ],
    );
}

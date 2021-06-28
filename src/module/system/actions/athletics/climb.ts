import { ActionsPF2e, SkillActionOptions } from '../actions';

export function climb(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'athletics');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.Climb.Title',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:climb'],
        ['action:climb'],
        ['move'],
        checkType,
        options.event,
        undefined,
        (selector: string) => [
            ActionsPF2e.note(selector, 'PF2E.Actions.Climb', 'criticalSuccess'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Climb', 'success'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Climb', 'criticalFailure'),
        ],
    );
}

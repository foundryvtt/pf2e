import { ActionsPF2e, SkillActionOptions } from '../actions';

export function shove(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'athletics');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.Shove.Title',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:shove'],
        ['action:shove'],
        ['attack'],
        checkType,
        options.event,
        (target) => target.fortitude,
        (selector: string) => [
            ActionsPF2e.note(selector, 'PF2E.Actions.Shove', 'criticalSuccess'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Shove', 'success'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Shove', 'criticalFailure'),
        ],
    );
}

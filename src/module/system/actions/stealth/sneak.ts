import { ActionsPF2e, SkillActionOptions } from '../actions';

export function sneak(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'stealth');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.Sneak.Title',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:sneak'],
        ['action:sneak'],
        ['move', 'secret'],
        checkType,
        options.event,
        (target) => target.perception,
        (selector: string) => [
            ActionsPF2e.note(selector, 'PF2E.Actions.Sneak', 'success'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Sneak', 'failure'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Sneak', 'criticalFailure'),
        ],
    );
}

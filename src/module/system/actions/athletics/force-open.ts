import { ActionsPF2e, SkillActionOptions } from '../actions';

export function forceOpen(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'athletics');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.ForceOpen.Title',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:force-open'],
        ['action:force-open'],
        ['attack'],
        checkType,
        options.event,
        undefined,
        (selector: string) => [
            ActionsPF2e.note(selector, 'PF2E.Actions.ForceOpen', 'criticalSuccess'),
            ActionsPF2e.note(selector, 'PF2E.Actions.ForceOpen', 'success'),
            ActionsPF2e.note(selector, 'PF2E.Actions.ForceOpen', 'criticalFailure'),
        ],
    );
}

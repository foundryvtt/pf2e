import { ActionsPF2e, SkillActionOptions } from '../actions';

export function pickALock(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'thievery');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'D',
        'PF2E.Actions.PickALock.Title',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:pick-a-lock'],
        ['action:pick-a-lock'],
        ['manipulate'],
        checkType,
        options.event,
        undefined,
        (selector: string) => [
            ActionsPF2e.note(selector, 'PF2E.Actions.PickALock', 'criticalSuccess'),
            ActionsPF2e.note(selector, 'PF2E.Actions.PickALock', 'success'),
            ActionsPF2e.note(selector, 'PF2E.Actions.PickALock', 'criticalFailure'),
        ],
    );
}

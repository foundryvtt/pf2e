import { ActionsPF2e, SkillActionOptions } from '../actions';
import { RollNotePF2e } from '@module/notes';
import { DegreeOfSuccessString } from '@system/check-degree-of-success';
import { ModifierPredicate } from '@module/modifiers';

function note(selector: string, outcome: DegreeOfSuccessString): RollNotePF2e {
    const visibility = game.settings.get('pf2e', 'metagame.showResults');
    const translated = game.i18n.localize(`PF2E.Actions.Trip.Notes.${outcome}`);
    return new RollNotePF2e(
        selector,
        `<p class="compact-text">${translated}</p>`,
        new ModifierPredicate(),
        visibility === 'all' ? [outcome] : [],
    );
}

export function trip(options: SkillActionOptions) {
    const selector = options?.skill ?? 'athletics';
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(selector);
    const extraNotes = [
        note(selector, 'criticalSuccess'),
        note(selector, 'success'),
        note(selector, 'criticalFailure'),
    ];
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.Trip.Title',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:trip'],
        ['action:trip'],
        ['attack'],
        checkType,
        options.event,
        (target) => target.reflex,
        extraNotes,
    );
}

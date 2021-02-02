import { ActionDefaultOptions, PF2Actions } from '../actions';

type CreateADiversionVariant = 'distracting-words' | 'gesture' | 'trick';

export function createADiversion(options: { variant: CreateADiversionVariant } & ActionDefaultOptions) {
    let title = 'PF2E.Actions.CreateADiversion.';
    const traits = ['mental'];
    switch (options.variant) {
        case 'distracting-words':
            title += 'DistractingWords';
            traits.push('auditory', 'linguistic');
            break;
        case 'gesture':
            title += 'Gesture';
            traits.push('manipulate');
            break;
        case 'trick':
            title += 'Trick';
            traits.push('manipulate');
            break;
        default:
            const msg = game.i18n.format('PF2E.ActionsWarning.DeceptionUnknownVariant', { variant: options.variant });
            ui.notifications.error(msg);
            return;
    }
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.skills.dec',
        options.glyph ?? 'A',
        title,
        'PF2E.ActionsCheck.Deception',
        ['all', 'skill-check', 'deception', 'action:create-a-diversion'],
        ['action:create-a-diversion', options.variant],
        traits.sort(),
        'skill-check',
        options.event,
    );
}

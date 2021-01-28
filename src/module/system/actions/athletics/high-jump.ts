import { PF2EActor } from '@actor/actor';
import { PF2Actions } from '../actions';

export function highJump(options: { event: JQuery.Event; actors: PF2EActor | PF2EActor[] }) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.skills.ath',
        'D',
        'PF2E.Actions.HighJump',
        'PF2E.ActionsCheck.Athletics',
        ['all', 'skill-check', 'athletics', 'action:stride', 'action:leap', 'action:high-jump'],
        ['action:stride', 'action:leap', 'action:high-jump'],
        ['move'],
        'skill-check',
        options.event,
    );
}

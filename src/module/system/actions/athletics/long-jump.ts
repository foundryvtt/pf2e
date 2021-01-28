import { PF2EActor } from '@actor/actor';
import { PF2Actions } from '../actions';

export function longJump(options: { event: JQuery.Event; actors: PF2EActor | PF2EActor[] }) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.skills.ath',
        'D',
        'PF2E.Actions.LongJump',
        'PF2E.ActionsCheck.Athletics',
        ['all', 'skill-check', 'athletics', 'action:stride', 'action:leap', 'action:long-jump'],
        ['action:stride', 'action:leap', 'action:long-jump'],
        ['move'],
        'skill-check',
        options.event,
    );
}

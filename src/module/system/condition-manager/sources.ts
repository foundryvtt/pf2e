import { ConditionType } from '@item/condition/data';
import type { ConditionSource } from '@item/data';
import { sluggify } from '@module/utils';
import blinded from '../../../../packs/data/conditionitems.db/blinded.json';
import broken from '../../../../packs/data/conditionitems.db/broken.json';
import clumsy from '../../../../packs/data/conditionitems.db/clumsy.json';
import concealed from '../../../../packs/data/conditionitems.db/concealed.json';
import confused from '../../../../packs/data/conditionitems.db/confused.json';
import controlled from '../../../../packs/data/conditionitems.db/controlled.json';
import dazzled from '../../../../packs/data/conditionitems.db/dazzled.json';
import deafened from '../../../../packs/data/conditionitems.db/deafened.json';
import doomed from '../../../../packs/data/conditionitems.db/doomed.json';
import drained from '../../../../packs/data/conditionitems.db/drained.json';
import dying from '../../../../packs/data/conditionitems.db/dying.json';
import encumbered from '../../../../packs/data/conditionitems.db/encumbered.json';
import enfeebled from '../../../../packs/data/conditionitems.db/enfeebled.json';
import fascinated from '../../../../packs/data/conditionitems.db/fascinated.json';
import fatigued from '../../../../packs/data/conditionitems.db/fatigued.json';
import flatFooted from '../../../../packs/data/conditionitems.db/flat-footed.json';
import fleeing from '../../../../packs/data/conditionitems.db/fleeing.json';
import friendly from '../../../../packs/data/conditionitems.db/friendly.json';
import frightened from '../../../../packs/data/conditionitems.db/frightened.json';
import grabbed from '../../../../packs/data/conditionitems.db/grabbed.json';
import helpful from '../../../../packs/data/conditionitems.db/helpful.json';
import hidden from '../../../../packs/data/conditionitems.db/hidden.json';
import hostile from '../../../../packs/data/conditionitems.db/hostile.json';
import immobilized from '../../../../packs/data/conditionitems.db/immobilized.json';
import indifferent from '../../../../packs/data/conditionitems.db/indifferent.json';
import invisible from '../../../../packs/data/conditionitems.db/invisible.json';
import observed from '../../../../packs/data/conditionitems.db/observed.json';
import paralyzed from '../../../../packs/data/conditionitems.db/paralyzed.json';
import persistentDamage from '../../../../packs/data/conditionitems.db/persistent-damage.json';
import petrified from '../../../../packs/data/conditionitems.db/petrified.json';
import prone from '../../../../packs/data/conditionitems.db/prone.json';
import quickened from '../../../../packs/data/conditionitems.db/quickened.json';
import restrained from '../../../../packs/data/conditionitems.db/restrained.json';
import sickened from '../../../../packs/data/conditionitems.db/sickened.json';
import slowed from '../../../../packs/data/conditionitems.db/slowed.json';
import stunned from '../../../../packs/data/conditionitems.db/stunned.json';
import stupefied from '../../../../packs/data/conditionitems.db/stupefied.json';
import unconscious from '../../../../packs/data/conditionitems.db/unconscious.json';
import undetected from '../../../../packs/data/conditionitems.db/undetected.json';
import unfriendly from '../../../../packs/data/conditionitems.db/unfriendly.json';
import unnoticed from '../../../../packs/data/conditionitems.db/unnoticed.json';
import wounded from '../../../../packs/data/conditionitems.db/wounded.json';

export const ConditionSources = {
    get: (): ConditionSource[] => {
        const sources = deepClone([
            blinded,
            broken,
            clumsy,
            concealed,
            confused,
            controlled,
            dazzled,
            deafened,
            doomed,
            drained,
            dying,
            encumbered,
            enfeebled,
            fascinated,
            fatigued,
            flatFooted,
            fleeing,
            friendly,
            frightened,
            grabbed,
            helpful,
            hidden,
            hostile,
            immobilized,
            indifferent,
            invisible,
            observed,
            paralyzed,
            persistentDamage,
            petrified,
            prone,
            quickened,
            restrained,
            sickened,
            slowed,
            stunned,
            stupefied,
            unconscious,
            undetected,
            unfriendly,
            unnoticed,
            wounded,
        ]) as unknown as ConditionSource[];

        for (const source of sources) {
            source.data.slug = sluggify(source.name) as ConditionType;
            const sourceId = `Compendium.pf2e.conditionitems.${source._id}`;
            source.flags.core = { sourceId };
        }

        return sources;
    },
};

import { AbilityString } from '@actor/data-definitions';
import { CheckModifier, ensureProficiencyOption, ModifierPF2e, StatisticModifier } from '@module/modifiers';
import { PF2RollNote } from '@module/notes';
import { adaptRoll, CheckPF2e } from '@module/system/rolls';
import { ItemPF2e } from './base';
import { SpellAttackRollModifier, SpellcastingEntryData, SpellDifficultyClass } from './data-definitions';

export class SpellcastingEntryPF2e extends ItemPF2e {
    attack?: SpellAttackRollModifier;
    dc?: SpellDifficultyClass;

    get ability() {
        return this.data.data.ability.value || 'int';
    }

    get isSpontaneous(): boolean {
        return this.data.data.prepared.value === 'spontaneous';
    }

    get isInnate(): boolean {
        return this.data.data.prepared.value === 'innate';
    }

    /** @override */
    initializeAttack(
        this: Owned<SpellcastingEntryPF2e>,
        statisticsModifiers: Record<string, ModifierPF2e[]>,
        rollNotes: Record<string, PF2RollNote[]>,
        baseModifiers: ModifierPF2e[],
    ) {
        const tradition = this.data.data.tradition.value;
        const rank = this.data.data.proficiency.value;
        const ability = (this.data.data.ability.value || 'int') as AbilityString;

        const baseNotes = [] as PF2RollNote[];
        [`${ability}-based`, 'all'].forEach((key) => {
            (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => baseModifiers.push(m));
            (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => baseNotes.push(n));
        });

        {
            // add custom modifiers and roll notes relevant to the attack modifier for the spellcasting entry
            const modifiers = [...baseModifiers];
            const notes = [...baseNotes];
            [`${tradition}-spell-attack`, 'spell-attack', 'attack', 'attack-roll'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
            });

            const attack: StatisticModifier & Partial<SpellAttackRollModifier> = new StatisticModifier(
                this.data.name,
                modifiers,
            );
            attack.notes = notes;
            attack.value = attack.totalModifier;
            attack.breakdown = attack.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                .join(', ');
            attack.roll = adaptRoll((args) => {
                const label = game.i18n.format(`PF2E.SpellAttack.${tradition}`);
                const options = args.options ?? [];
                ensureProficiencyOption(options, rank);
                CheckPF2e.roll(
                    new CheckModifier(label, attack, args.modifiers ?? []),
                    { actor: this.actor, type: 'spell-attack-roll', options, dc: args.dc, notes },
                    args.event,
                    args.callback,
                );
            });

            this.attack = attack as Required<SpellAttackRollModifier>;
        }

        {
            // add custom modifiers and roll notes relevant to the DC for the spellcasting entry
            const modifiers = [...baseModifiers];
            const notes = [...baseNotes];
            [`${tradition}-spell-dc`, 'spell-dc'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
            });

            const dc: StatisticModifier & Partial<SpellDifficultyClass> = new StatisticModifier(
                this.data.name,
                modifiers,
            );
            dc.notes = notes;
            dc.value = 10 + dc.totalModifier;
            dc.breakdown = [game.i18n.localize('PF2E.SpellDCBase')]
                .concat(
                    dc.modifiers
                        .filter((m) => m.enabled)
                        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`),
                )
                .join(', ');

            this.dc = dc as Required<SpellDifficultyClass>;
        }

        // Backwards compatability
        this.data.data.attack = this.attack;
        this.data.data.dc = this.dc;
    }
}

export interface SpellcastingEntryPF2e {
    data: SpellcastingEntryData;
    _data: SpellcastingEntryData;
}

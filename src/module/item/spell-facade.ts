import { ActorPF2e } from '@actor/base';
import { SpellData } from './data-definitions';
import { SpellcastingEntryPF2e } from './spellcasting-entry';

/**
 * This is an outdated class.
 * All new spell functionality should go in spell.ts, and some
 * existing functionality is going to be duplicated in spell
 * until we can sever this class.
 */
export class SpellFacade {
    data: SpellData;
    castingActor?: ActorPF2e;
    _castLevel: number;
    spellcastingEntry?: SpellcastingEntryPF2e;

    constructor(data: SpellData, scope: { castingActor?: ActorPF2e; castLevel?: number } = {}) {
        this.data = data;
        this.castingActor = scope.castingActor;
        this._castLevel = scope.castLevel || this.spellLevel;
        this.spellcastingEntry = this.castingActor?.itemTypes?.spellcastingEntry?.find(
            (entry) => entry.id === this.spellcastingEntryId,
        );
    }

    get spellcastingEntryId() {
        return this.data.data.location.value;
    }

    get spellLevel() {
        return this.data.data.level.value;
    }

    get heightenedLevel(): number {
        return this.data.data.heightenedLevel?.value ?? this.spellLevel;
    }

    get damage() {
        return this.data.data.damage;
    }

    get damageValue() {
        if (this.damage.value && this.damage.value !== '' && this.damage.value !== '0') {
            return this.damage.value;
        }
        return null;
    }

    get damageParts() {
        const parts: (string | number)[] = [];
        if (this.damageValue) parts.push(this.damage.value);
        if (this.damage.applyMod && this.castingActor) {
            const entry = this.spellcastingEntry;
            if (!entry && this.data.data.trickMagicItemData) {
                parts.push(this.castingActor.getAbilityMod(this.data.data.trickMagicItemData.ability));
            } else if (entry) {
                parts.push(this.castingActor.getAbilityMod(entry.ability));
            }
        }
        if (this.data.data.duration.value === '' && this.castingActor) {
            const hasDangerousSorcery = this.castingActor.itemTypes.feat.some(
                (feat) => feat.slug === 'dangerous-sorcery',
            );
            if (hasDangerousSorcery && !this.isFocusSpell && this.spellLevel !== 0) {
                console.debug(`PF2e System | Adding Dangerous Sorcery spell damage for ${this.data.name}`);
                parts.push(this.castLevel);
            }
        }
        return parts.concat(this.heightenedParts);
    }

    get scaling() {
        return this.data.data?.scaling || { formula: '', mode: '' };
    }

    // Automatically scale cantrips/focus spells to the character's max spell
    // level.
    get castLevel() {
        if (this.autoScalingSpell && this.castingActor) {
            return Math.ceil(this.castingActor.level / 2);
        }
        return this._castLevel;
    }

    get autoScalingSpell() {
        return this.spellLevel === 0 || this.spellLevel === 11 || this.isFocusSpell;
    }

    get isCantrip(): boolean {
        return this.spellLevel === 0;
    }

    get isFocusSpell() {
        return this.data.data.category.value === 'focus';
    }

    get isRitual(): boolean {
        return this.data.data.category.value === 'ritual';
    }

    get traditions() {
        return this.data.data?.traditions?.value || [];
    }

    get heighteningModes(): Record<string, number> {
        return {
            level1: 1,
            level2: 2,
            level3: 3,
            level4: 4,
        };
    }

    get heightenedParts() {
        let parts: string[] = [];
        if (this.scaling.formula !== '') {
            const heighteningDivisor: number = this.heighteningModes[this.scaling.mode];
            if (heighteningDivisor) {
                let effectiveSpellLevel = 1;
                if (this.spellLevel > 0 && this.spellLevel < 11) {
                    effectiveSpellLevel = this.spellLevel;
                }
                let partCount = this.castLevel - effectiveSpellLevel;
                partCount = Math.floor(partCount / heighteningDivisor);
                parts = Array(partCount).fill(this.scaling.formula);
            }
        }
        return parts;
    }
}

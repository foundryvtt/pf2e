import { DicePF2e } from "@scripts/dice";
import { RollAttackOptions, RollDamageOptions } from "./base";
import { PhysicalItemPF2e } from "./physical";

export class MeleePF2e extends PhysicalItemPF2e {
    /**
     * Roll a NPC Attack
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
     rollAttack({ event, multiAttackPenalty = 1 }: RollAttackOptions) {
        if (this.type !== 'melee') throw new Error('Wrong item type!');
        if (!this.actor) throw new Error('Attempted to roll an attack without an actor!');
        // Prepare roll data
        // let itemData = this.data.data,
        const itemData: any = this.getChatData();
        const rollData = duplicate(this.actor.data.data) as any;
        const parts = ['@itemBonus'];
        const title = `${this.name} - Attack Roll${multiAttackPenalty > 1 ? ` (MAP ${multiAttackPenalty})` : ''}`;

        rollData.item = itemData;

        let adjustment = 0;
        const traits = this.actor.data.data.traits.traits.value;
        if (traits.some((trait) => trait === 'elite')) {
            adjustment = 2;
        } else if (traits.some((trait) => trait === 'weak')) {
            adjustment = -2;
        }

        rollData.itemBonus = itemData.bonus.value + adjustment;

        if (multiAttackPenalty === 2) parts.push(itemData.map2);
        else if (multiAttackPenalty === 3) parts.push(itemData.map3);

        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            actor: this.actor,
            data: rollData,
            rollType: 'attack-roll',
            title,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            dialogOptions: {
                width: 400,
                top: event ? event.clientY - 80 : 400,
                left: window.innerWidth - 710,
            },
        });
    }

    /**
     * Roll NPC Damage
     * Rely upon the DicePF2e.damageRoll logic for the core implementation
     */
    rollDamage({ event, critical = false }: RollDamageOptions) {
        const item = this.data;
        if (item.type !== 'melee') throw new Error('Wrong item type!');
        if (!this.actor) throw new Error('Attempted to roll damage without an actor!');

        // Get item and actor data and format it for the damage roll
        const itemData = item.data;
        const rollData = duplicate(this.actor.data.data) as any;
        let parts = [];
        const partsType = [];
        const dtype = []; // CONFIG.PF2E.damageTypes[itemData.damage.damageType];

        // If the NPC is using the updated NPC Attack data object
        if (itemData.damageRolls && typeof itemData.damageRolls === 'object') {
            Object.keys(itemData.damageRolls).forEach((key) => {
                if (itemData.damageRolls[key].damage) parts.push(itemData.damageRolls[key].damage);
                partsType.push(`${itemData.damageRolls[key].damage} ${itemData.damageRolls[key].damageType}`);
            });
        } else {
            parts = [(itemData as any).damage.die];
        }

        // Set the title of the roll
        let title = `${this.name}: ${partsType.join(', ')}`;
        if (dtype.length) title += ` (${dtype})`;

        // do nothing if no parts are provided in the damage roll
        if (parts.length === 0) {
            console.log('PF2e System | No damage parts provided in damage roll');
            parts = ['0'];
        }

        const traits = this.actor.data.data.traits.traits.value;
        if (traits.some((trait) => trait === 'elite')) {
            parts.push('+2');
        } else if (traits.some((trait) => trait === 'weak')) {
            parts.push('-2');
        }

        // Call the roll helper utility
        rollData.item = itemData;
        DicePF2e.damageRoll({
            event,
            parts,
            critical,
            actor: this.actor,
            data: rollData,
            title,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            dialogOptions: {
                width: 400,
                top: event.clientY - 80,
                left: window.innerWidth - 710,
            },
        });
    }

    getChatData(htmlOptions?: Record<string, boolean>) {
        const data = this.data.data;
        const traits = MeleePF2e.traitChatData(data.traits, CONFIG.PF2E.weaponTraits);

        const isAgile = this.traits.has('agile');
        const map2 = isAgile ? '-4' : '-5';
        const map3 = isAgile ? '-8' : '-10';

        return this.processChatData(htmlOptions, { ...data, traits, map2, map3 });
    }
}

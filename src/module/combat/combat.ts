import { CombatDataPF2e, CombatantDataPF2e } from './data';
import { PF2EActor, SKILL_DICTIONARY } from '../actor/actor';
import { PF2ECharacter } from '../actor/character';
import { ActorDataPF2e } from '../actor/actorDataDefinitions';

type ValidCombatant = CombatantDataPF2e & { actor: { data: { type: 'character' | 'npc' | 'hazard' } } };

export class PF2ECombat extends Combat<CombatantDataPF2e> {
    /** @override */
    data!: CombatDataPF2e;

    /** @override
     * Prevent familiar, loot, and vehicle actors from joining combat
     */
    createEmbeddedEntity(
        embeddedName: 'Combatant',
        data: Partial<CombatantDataPF2e>[] | CombatantDataPF2e[],
        options?: EntityCreateOptions,
    ): Promise<CombatantDataPF2e | CombatantDataPF2e[] | null>;
    createEmbeddedEntity(
        embeddedName: 'Combatant',
        data: Partial<CombatantDataPF2e> | CombatantDataPF2e,
        options?: EntityCreateOptions,
    ): Promise<CombatantDataPF2e | null>;
    async createEmbeddedEntity(
        embeddedName: 'Combatant',
        data: Partial<CombatantDataPF2e> | Partial<CombatantDataPF2e>[],
        options: EntityCreateOptions = {},
    ): Promise<CombatantDataPF2e | CombatantDataPF2e[] | null> {
        const createData = Array.isArray(data) ? data : [data];
        const validCreateData = createData.filter((datum) => {
            const token = canvas.tokens.placeables.find((token) => token.id === datum.tokenId);
            const actorType = token?.actor?.data?.type;
            return ['character', 'npc', 'hazard'].includes(actorType);
        });

        return super.createEmbeddedEntity(embeddedName, validCreateData, options);
    }

    /** @override
     * If combatant.initiative is being set to null, do the same for combatant trackerPosition flag
     */
    updateCombatant(data: EntityUpdateData, options?: EntityUpdateOptions): Promise<CombatantDataPF2e>;
    updateCombatant(
        data: EntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<CombatantDataPF2e | CombatantDataPF2e[]>;
    updateCombatant(
        data: EntityUpdateData | EntityUpdateData[],
        options: EntityUpdateOptions = {},
    ): Promise<CombatantDataPF2e | CombatantDataPF2e[]> {
        const updateData = Array.isArray(data) ? data : [data];
        for (const datum of updateData) {
            if (datum.initiative === null || '-=initiative' in datum) {
                datum['flags.pf2e.trackerPosition'] = null;
            }
        }

        return super.updateCombatant(updateData, options);
    }

    /** @override */
    async rollInitiative(
        ids: string | string[],
        {
            formula = null,
            updateTurn = true,
            messageOptions = {},
        }: {
            formula?: string | null;
            updateTurn?: boolean;
            messageOptions?: EntityCreateOptions;
        } = {},
    ): Promise<this> {
        const combatantIds = Array.isArray(ids) ? ids : [ids];
        const updates = combatantIds.map((id) => ({
            _id: id,
            'flags.pf2e.trackerPosition': null,
        }));
        await this.updateCombatant(updates);

        // Roll initiative of PF2ECharacters via attributes.initiative
        const combatants = combatantIds.map((id) => this.combatants.find((combatant) => combatant._id === id));
        const pcCombatants: CombatantDataPF2e<PF2ECharacter>[] = combatants.flatMap((combatant) =>
            combatant.actor instanceof PF2ECharacter ? combatant : [],
        );
        const characters = pcCombatants.map((combatant) => combatant.actor);

        for (const character of characters) {
            const checkType = character.data.data.attributes.initiative.ability;
            const opts = character.getRollOptions(
                ['all', 'initiative'].concat(SKILL_DICTIONARY[checkType] ?? checkType),
            );
            character.data.data.attributes.initiative.roll({ ctrlKey: false }, opts);
        }

        const otherIds: string[] = combatants.flatMap((combatant) =>
            combatant.actor.data.type === 'character' ? [] : combatant._id,
        );

        return super.rollInitiative(otherIds, { formula, updateTurn, messageOptions });
    }

    /** @override
     *  Reset all combatant initiative scores, setting the turn back to zero
     */
    async resetAll(): Promise<this> {
        const updates = this.combatants.map((combatant) => ({
            _id: combatant._id,
            initiative: null,
            'flags.pf2e.trackerPosition': null,
        }));
        await this.updateCombatant(updates);
        return this.update({ turn: 0 });
    }

    protected _prepareCombatant(
        combatant: CombatantDataPF2e,
        scene: Scene<ActorDataPF2e>,
        players: User<PF2EActor>[],
        settings = {},
    ): CombatantDataPF2e {
        super._prepareCombatant(combatant, scene, players, settings);

        combatant.hasTieBreakerItem = false;
        combatant.isNPC = combatant.actor === undefined ? true : !combatant.actor.hasPlayerOwner;
        combatant.flags.pf2e = combatant.flags.pf2e === undefined ? { trackerPosition: null } : combatant.flags.pf2e;
        if (!('trackerPosition' in combatant)) {
            Object.defineProperty(combatant, 'trackerPosition', {
                get: function (this: CombatantDataPF2e) {
                    return this.flags.pf2e.trackerPosition ?? this.initiative;
                },
            });
        }

        return combatant;
    }

    /** @override
     * used as callback for CombatantData[]['sort']
     */
    protected _sortCombatants(combatantA: CombatantDataPF2e, combatantB: CombatantDataPF2e): number {
        // Sort by (effective) initiative roll
        const initiativeA = combatantA.trackerPosition ?? 0;
        const initiativeB = combatantB.trackerPosition ?? 0;
        if (Number.isFinite(initiativeA) && Number.isFinite(initiativeB)) {
            const difference = Math.clamped(initiativeB - initiativeA, -1, 1);
            if (difference !== 0) {
                return difference;
            }
        }

        // Sort by possession of tie-breaker item or NPC status
        const combatants = [combatantA, combatantB];
        for (const thisCombatant of combatants) {
            const thatCombatant = thisCombatant === combatantB ? combatantA : combatantB;

            if (thisCombatant.hasTieBreakerItem && !thatCombatant.hasTieBreakerItem) {
                return thisCombatant === combatantA ? -1 : 1;
            }
            if (thisCombatant.isNPC && !thatCombatant.isNPC) {
                return thisCombatant === combatantA ? -1 : 1;
            }
        }

        // Sort by combatant ID (per-encounter random)
        return combatantA._id > combatantB._id ? -1 : 1;
    }

    /** @override */
    protected _getInitiativeFormula(combatant: ValidCombatant): string {
        const { actor } = combatant;
        if (actor === undefined) {
            return '1d20';
        }

        const modifier: number = (() => {
            switch (actor.data.type) {
                case 'character':
                    return actor.data.data.attributes.initiative.totalModifier;
                case 'npc':
                    return actor.data.data.attributes.perception.totalModifier;
                case 'hazard':
                    return actor.data.data.attributes.stealth.value;
            }
        })();

        // Don't show a modifier of "+ 0" on the initiative roll card.
        const parts = ['1d20', modifier].filter((part) => ['number', 'string'].includes(typeof part) && part !== 0);
        return parts.join(' + ');
    }
}

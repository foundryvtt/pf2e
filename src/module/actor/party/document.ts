import { ActorPF2e, CreaturePF2e } from "@actor";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { MemberData, PartySource, PartySystemData } from "./data.ts";
import { ItemType } from "@item/data/index.ts";
import { tupleHasValue } from "@util";
import { ActorUpdateContext } from "@actor/base.ts";
import { CombatantPF2e, EncounterPF2e } from "@module/encounter/index.ts";

class PartyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    declare members: CreaturePF2e[];

    override get allowedItemTypes(): (ItemType | "physical")[] {
        return ["effect", "physical"];
    }

    /** Friendship lives in our hearts */
    override get canAct(): false {
        return false;
    }

    /** Our bond is unbreakable */
    override isAffectedBy(): false {
        return false;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        this.members = this.system.details.members
            .map((m) => fromUuidSync(m.uuid))
            .filter((a): a is CreaturePF2e => a instanceof ActorPF2e && a.isOfType("creature"));

        for (const member of this.members) {
            member?.parties.add(this);
        }
    }

    addMembers(...newMembers: CreaturePF2e[]): void {
        const existing = this.system.details.members.filter((d) => this.members.some((m) => m.uuid === d.uuid));
        const members: MemberData[] = [...existing, ...newMembers.map((m) => ({ uuid: m.uuid }))];
        this.update({ system: { details: { members } } });
    }

    removeMembers(...remove: (ActorUUID | CreaturePF2e)[]): void {
        const uuids = remove.map((d) => (typeof d === "string" ? d : d.uuid));
        const existing = this.system.details.members.filter((d) => this.members.some((m) => m.uuid === d.uuid));
        const members: MemberData[] = existing.filter((m) => !tupleHasValue(uuids, m.uuid));
        this.update({ system: { details: { members } } });
    }

    /** Adds all members to combat */
    async addToCombat(options: { combat?: EncounterPF2e } = {}): Promise<CombatantPF2e<EncounterPF2e>[]> {
        const promises = this.members.map((a) => CombatantPF2e.fromActor(a, true, { combat: options.combat }));
        const combatants = (await Promise.all(promises)).filter((c): c is CombatantPF2e<EncounterPF2e> => !!c);
        return combatants;
    }

    /** Override to inform creatures when they were booted from a party */
    protected override _onUpdate(
        changed: DeepPartial<PartySource>,
        options: ActorUpdateContext<TParent>,
        userId: string
    ): void {
        super._onUpdate(changed, options, userId);

        const members = this.members;
        const newMemberUUIDs = changed?.system?.details?.members?.map((m) => m?.uuid);
        if (newMemberUUIDs) {
            const deletedMembers = members.filter((m) => m?.uuid && !newMemberUUIDs.includes(m.uuid));
            for (const deleted of deletedMembers) {
                deleted?.parties.delete(this);
            }
        }
    }

    /** Overriden to inform creatures the party is defunct */
    protected override _onDelete(options: DocumentModificationContext<TParent>, userId: string): void {
        super._onDelete(options, userId);
        for (const member of this.members) {
            member?.parties.delete(this);
        }
    }
}

interface PartyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    readonly _source: PartySource;
    readonly abilities?: never;
    system: PartySystemData;
}

export { PartyPF2e };

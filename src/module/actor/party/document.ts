import { ActorPF2e, CreaturePF2e } from "@actor";
import { ItemType } from "@item/data/index.ts";
import { UserPF2e } from "@module/documents.ts";
import { CombatantPF2e, EncounterPF2e } from "@module/encounter/index.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { Statistic } from "@system/statistic/index.ts";
import { sortBy, tupleHasValue } from "@util";
import { DataModelValidationOptions } from "types/foundry/common/abstract/data.js";
import { MemberData, PartySource, PartySystemData } from "./data.ts";
import { InvalidCampaign } from "./invalid-campaign.ts";
import { Kingdom } from "./kingdom/index.ts";
import { PartySheetRenderOptions } from "./sheet.ts";
import { PartyCampaign, PartyUpdateContext } from "./types.ts";
import { resetActors } from "@actor/helpers.ts";

class PartyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    override armorClass = null;

    declare members: CreaturePF2e[];
    campaign: PartyCampaign | null = null;

    get baseAllowedItemTypes(): (ItemType | "physical")[] {
        return ["effect", "physical"];
    }

    override get allowedItemTypes(): (ItemType | "physical")[] {
        return [...this.baseAllowedItemTypes, ...(this.campaign?.extraItemTypes ?? [])];
    }

    /** Parties use the campaign's level as their own level, as they otherwise don't have a level */
    override get level(): number {
        return this.campaign?.level ?? super.level;
    }

    /** Friendship lives in our hearts */
    override get canAct(): false {
        return false;
    }

    /** Part members can add and remove items (though system socket shenanigans)  */
    override canUserModify(user: UserPF2e, action: UserAction): boolean {
        return (
            super.canUserModify(user, action) ||
            (action === "update" && this.members.some((m) => m.canUserModify(user, action)))
        );
    }

    /** Our bond is unbreakable */
    override isAffectedBy(): false {
        return false;
    }

    /** Override validation to defer certain properties to the campaign model */
    override validate(options?: DataModelValidationOptions): boolean {
        if (!super.validate(options)) return false;

        const changes: DeepPartial<PartySource> = options?.changes ?? {};
        if (changes.system?.campaign) {
            const campaignValid = this.campaign?.validate({ ...options, changes: changes.system.campaign });
            if (!campaignValid) return false;
        }

        return true;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        this.members = this.system.details.members
            .map((m) => fromUuidSync(m.uuid))
            .filter((a): a is CreaturePF2e => a instanceof ActorPF2e && a.isOfType("creature"))
            .sort(sortBy((a) => a.name));

        for (const member of this.members) {
            member?.parties.add(this);
        }

        // Bind campaign data, though only kingmaker is supported (and hardcoded).
        // This will need to be expanded to allow modules to add to the list
        const campaignType = game.settings.get("pf2e", "campaignType");
        if (campaignType !== "none") {
            const typeMatches = this.system.campaign?.type === campaignType;
            if (this.system.campaign && !typeMatches) {
                this.campaign = new InvalidCampaign(this, { campaignType, reason: "mismatch" });
            } else {
                // Wrap in a try catch in case data preparation fails
                try {
                    if (this.campaign?.type === campaignType) {
                        this.campaign.updateSource(this.system.campaign);
                    } else {
                        const model = (this.campaign = new Kingdom(this.system.campaign, { parent: this }));
                        this.system.campaign = model._source;
                    }
                } catch (err) {
                    console.error(err);
                    this.campaign = new InvalidCampaign(this, { campaignType, reason: "error" });
                }
            }
        }
    }

    override prepareDerivedData(): void {
        // Compute travel speed. Creature travel speed isn't implemented yet
        const travelSpeed = Math.min(...this.members.map((m) => m.attributes.speed.value));
        this.attributes.speed = { value: travelSpeed };
    }

    async addMembers(...membersToAdd: CreaturePF2e[]): Promise<void> {
        const existing = this.system.details.members.filter((d) => this.members.some((m) => m.uuid === d.uuid));

        const existingUUIDs = new Set(existing.map((data) => data.uuid));
        const newMembers = membersToAdd.filter((a) => !existingUUIDs.has(a.uuid));
        const members: MemberData[] = [...existing, ...newMembers.map((m) => ({ uuid: m.uuid }))];
        await this.update({ system: { details: { members } } });

        // Remove all members from their original folder
        for (const member of newMembers) {
            if (member.folder) {
                await member.update({ folder: null });
            }
        }

        await resetActors(newMembers);
    }

    async removeMembers(...remove: (ActorUUID | CreaturePF2e)[]): Promise<void> {
        const uuids = remove.map((d) => (typeof d === "string" ? d : d.uuid));
        const existing = this.system.details.members.filter((d) => this.members.some((m) => m.uuid === d.uuid));
        const members: MemberData[] = existing.filter((m) => !tupleHasValue(uuids, m.uuid));
        await this.update({ system: { details: { members } } });
    }

    /** Adds all members to combat */
    async addToCombat(options: { combat?: EncounterPF2e } = {}): Promise<CombatantPF2e<EncounterPF2e>[]> {
        const promises = this.members.map((a) => CombatantPF2e.fromActor(a, true, { combat: options.combat }));
        const combatants = (await Promise.all(promises)).filter((c): c is CombatantPF2e<EncounterPF2e> => !!c);
        return combatants;
    }

    override getRollData(): Record<string, unknown> {
        return mergeObject(super.getRollData(), this.campaign?.getRollData?.() ?? {});
    }

    /** Re-render the sheet if data preparation is called from the familiar's master */
    override reset({ actor = false } = {}): void {
        if (actor) {
            this._resetAndRerenderDebounced();
        } else {
            super.reset();
        }
    }

    /** Include campaign statistics in party statistics */
    override getStatistic(slug: string): Statistic | null {
        const statistic = super.getStatistic(slug);
        if (statistic) return statistic;

        const campaignStat = this.campaign?.getStatistic?.(slug);

        return campaignStat ?? null;
    }

    private _resetAndRerenderDebounced = foundry.utils.debounce(() => {
        super.reset();
        this.sheet.render(false, { actor: true } as PartySheetRenderOptions);
    }, 50);

    protected override async _preUpdate(
        changed: DeepPartial<PartySource>,
        options: PartyUpdateContext<TParent>,
        user: UserPF2e
    ): Promise<void> {
        await super._preUpdate(changed, options, user);
        const members = this.members;
        const newMemberUUIDs = changed?.system?.details?.members?.map((m) => m?.uuid);
        if (newMemberUUIDs) {
            const deletedMembers = members.filter((m) => m?.uuid && !newMemberUUIDs.includes(m.uuid));
            options.removedMembers = deletedMembers.map((m) => m.uuid);
        }

        // Ensure the party campaign type is properly set if any data gets updated
        if (changed.system?.campaign && this.campaign && this.campaign.type !== "invalid") {
            changed.system.campaign.type = this.campaign.type;
        }
    }

    /** Override to inform creatures when they were booted from a party */
    protected override _onUpdate(
        changed: DeepPartial<PartySource>,
        options: PartyUpdateContext<TParent>,
        userId: string
    ): void {
        super._onUpdate(changed, options, userId);

        const removedCreatures = (options.removedMembers ?? [])
            .map((uuid) => fromUuidSync(uuid))
            .filter((a): a is CreaturePF2e => a instanceof ActorPF2e && a.isOfType("creature"));
        for (const actor of removedCreatures) {
            actor.parties.delete(this);
        }

        resetActors(removedCreatures);
    }

    /** Overriden to inform creatures the party is defunct */
    protected override _onDelete(options: DocumentModificationContext<TParent>, userId: string): void {
        super._onDelete(options, userId);
        for (const member of this.members) {
            member.parties.delete(this);
        }

        resetActors(this.members);
    }
}

interface PartyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    readonly _source: PartySource;
    readonly abilities?: never;
    system: PartySystemData;
}

export { PartyPF2e };

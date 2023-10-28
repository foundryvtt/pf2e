import { ActorPF2e, type CreaturePF2e } from "@actor";
import { resetActors } from "@actor/helpers.ts";
import { ItemType } from "@item/base/data/index.ts";
import { CombatantPF2e, EncounterPF2e } from "@module/encounter/index.ts";
import { RuleElementPF2e } from "@module/rules/index.ts";
import { RuleElementSchema } from "@module/rules/rule-element/data.ts";
import type { UserPF2e } from "@module/user/document.ts";
import type { TokenDocumentPF2e } from "@scene/index.ts";
import type { Statistic } from "@system/statistic/index.ts";
import { sortBy, tupleHasValue } from "@util";
import * as R from "remeda";
import type { DataModelValidationOptions } from "types/foundry/common/abstract/data.d.ts";
import { MemberData, PartySource, PartySystemData } from "./data.ts";
import { InvalidCampaign } from "./invalid-campaign.ts";
import { Kingdom } from "./kingdom/index.ts";
import { PartySheetRenderOptions } from "./sheet.ts";
import { PartyCampaign, PartyUpdateContext } from "./types.ts";

class PartyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    override armorClass = null;

    declare members: CreaturePF2e[];
    declare campaign: PartyCampaign | null;

    get active(): boolean {
        return game.actors.party === this;
    }

    get baseAllowedItemTypes(): (ItemType | "physical")[] {
        return ["physical"];
    }

    override get allowedItemTypes(): (ItemType | "physical")[] {
        return [...this.baseAllowedItemTypes, ...(this.campaign?.extraItemTypes ?? [])];
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

    override updateSource(
        data?: Record<string, unknown>,
        options?: DocumentSourceUpdateContext,
    ): DeepPartial<this["_source"]> {
        if (!this.campaign) return super.updateSource(data, options);

        // Note: inner data must be handled *before* outer data, otherwise it'll fail
        const expanded: DeepPartial<PartySource> = expandObject(data ?? {});
        const campaignDiff = expanded?.system?.campaign
            ? this.campaign.updateSource(expanded.system.campaign, options)
            : {};
        const diff = super.updateSource(data, options);
        return R.isEmpty(campaignDiff) ? diff : mergeObject(diff, campaignDiff);
    }

    /** Only prepare rule elements for non-physical items (in case campaigin items exist) */
    protected override prepareRuleElements(): RuleElementPF2e<RuleElementSchema>[] {
        return this.items.contents
            .filter((item) => !item.isOfType("physical"))
            .flatMap((item) => item.prepareRuleElements())
            .filter((rule) => !rule.ignored)
            .sort((elementA, elementB) => elementA.priority - elementB.priority);
    }

    /** Make `system.campaign` non-enumerable to prevent `TokenDocument.getTrackedAttributes` from recursing into it. */
    protected override _initialize(options?: Record<string, unknown> | undefined): void {
        super._initialize(options);
        Object.defineProperty(this.system, "campaign", { writable: true, enumerable: false });
    }

    override prepareBaseData(): void {
        // Provide base structure for parent method
        this.system.details.level = { value: 0 };

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
                    if (this.campaign?.type !== campaignType) {
                        this.campaign = new Kingdom(deepClone(this._source.system.campaign), { parent: this });
                    } else {
                        // System data models are normally cleaned with partial: false, allowing certain defaults to be set
                        // We fake such an update here so that elements like settlements can function
                        Kingdom.cleanData(this.campaign._source);
                        this.campaign.reset();
                    }

                    this.campaign.prepareBaseData?.();
                    this.system.campaign = this.campaign;
                } catch (err) {
                    console.error(err);
                    this.campaign = new InvalidCampaign(this, { campaignType, reason: "error" });
                }
            }
        } else {
            this.campaign = null;
        }

        // Filler until put into use for encounter metrics
        const partyLevel = Math.round(
            R.meanBy(
                this.members.filter((m) => m.isOfType("character")),
                (m) => m.level,
            ),
        );
        this.system.details.level.value = partyLevel;
    }

    /** Run rule elements (which may occur if it contains a kingdom) */
    override prepareEmbeddedDocuments(): void {
        super.prepareEmbeddedDocuments();
        for (const rule of this.rules) {
            rule.onApplyActiveEffects?.();
        }
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        // Compute travel speed. Creature travel speed isn't implemented yet
        const travelSpeed = Math.min(...this.members.map((m) => m.attributes.speed.total));
        this.attributes.speed = { total: travelSpeed };

        this.prepareSynthetics();
        this.campaign?.prepareDerivedData?.();
    }

    async addMembers(...membersToAdd: CreaturePF2e[]): Promise<void> {
        const existing = this.system.details.members.filter((d) => this.members.some((m) => m.uuid === d.uuid));
        const existingUUIDs = new Set(existing.map((data) => data.uuid));
        const newMembers = membersToAdd.filter((a) => a.uuid.startsWith("Actor.") && !existingUUIDs.has(a.uuid));

        // Remove all members from their original folder and set their alliance to "party" if it's `null`
        for (const member of newMembers) {
            const allianceUpdate = member.isOfType("character", "npc")
                ? { "system.details.alliance": member._source.system.details.alliance ?? "party" }
                : {};
            await member.update({ folder: null, ...allianceUpdate });
        }

        const members: MemberData[] = [...existing, ...newMembers.map((m) => ({ uuid: m.uuid }))];
        await this.update({ system: { details: { members } } });

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

    override getRollOptions(domains?: string[]): string[] {
        const options = super.getRollOptions(domains);
        return options.concat(this.campaign?.getRollOptions?.() ?? []);
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

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override async _preUpdate(
        changed: DeepPartial<PartySource>,
        options: PartyUpdateContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        const members = this.members;
        const newMemberUUIDs = changed?.system?.details?.members?.map((m) => m?.uuid);
        if (newMemberUUIDs) {
            const deletedMembers = members.filter((m) => m?.uuid && !newMemberUUIDs.includes(m.uuid));
            options.removedMembers = deletedMembers.map((m) => m.uuid);
        }

        // Ensure the party campaign type is properly set if any data gets updated
        if (changed.system?.campaign && this.campaign && this.campaign.type !== "invalid") {
            changed.system.campaign.type = this.campaign.type;
            this.campaign._preUpdate?.(changed.system.campaign);
        }

        return super._preUpdate(changed, options, user);
    }

    /** Override to inform creatures when they were booted from a party */
    protected override _onUpdate(
        changed: DeepPartial<PartySource>,
        options: PartyUpdateContext<TParent>,
        userId: string,
    ): void {
        super._onUpdate(changed, options, userId);

        const removedCreatures = (options.removedMembers ?? [])
            .map((uuid) => fromUuidSync(uuid))
            .filter((a): a is CreaturePF2e => a instanceof ActorPF2e && a.isOfType("creature"));
        for (const actor of removedCreatures) {
            actor.parties.delete(this);
        }

        resetActors(removedCreatures);

        // If members were added or removed, rerender the encounter tracker to show new XP calculation
        if (changed.system?.details?.members && game.combat) {
            for (const encounter of game.combats) {
                encounter.reset();
                ui.combat.render();
            }
        }

        // Update the actor directory if this included campaign changes
        if (game.ready && !!changed.system?.campaign && game.actors.get(this.id) === (this as ActorPF2e)) {
            ui.actors.render();
        }
    }

    /** Overriden to inform creatures the party is defunct */
    protected override _onDelete(options: DocumentModificationContext<TParent>, userId: string): void {
        super._onDelete(options, userId);
        for (const member of this.members) {
            member.parties.delete(this);
        }

        resetActors(this.members);
        ui.actors.saveActivePartyFolderState();
    }
}

interface PartyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    readonly _source: PartySource;
    system: PartySystemData;
}

export { PartyPF2e };

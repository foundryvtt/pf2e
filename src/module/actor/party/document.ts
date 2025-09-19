import { ActorPF2e, type CreaturePF2e } from "@actor";
import type { ActorUpdateCallbackOptions } from "@actor/base.ts";
import { resetActors } from "@actor/helpers.ts";
import type {
    DatabaseCreateCallbackOptions,
    DatabaseDeleteCallbackOptions,
    DataModelValidationOptions,
} from "@common/abstract/_module.d.mts";
import type { UserAction } from "@common/constants.d.mts";
import type { ActorUUID } from "@common/documents/_module.d.mts";
import type { ItemType } from "@item/base/data/index.ts";
import { RuleElement } from "@module/rules/index.ts";
import type { RuleElementSchema } from "@module/rules/rule-element/data.ts";
import type { TokenDocumentPF2e } from "@scene/index.ts";
import type { Statistic } from "@system/statistic/index.ts";
import { tupleHasValue } from "@util";
import type { PartySource, PartySystemData } from "./data.ts";
import { Kingdom } from "./kingdom/model.ts";
import type { PartySheetRenderOptions } from "./sheet.ts";
import type { PartyCampaign } from "./types.ts";

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
    override canUserModify(user: fd.BaseUser, action: UserAction): boolean {
        return (
            super.canUserModify(user, action) ||
            (action === "update" && this.members.some((m) => m.canUserModify(user, action)))
        );
    }

    /** Our bond is unbreakable. */
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
        if (!data || options?.dryRun || !this.campaign) return super.updateSource(data, options);
        const expanded: DeepPartial<PartySource> = fu.expandObject(data ?? {});
        if (expanded.system?.campaign) {
            this.campaign.updateSource(expanded.system.campaign, options);
            this.campaign.schema.clean(this.campaign._source);
            this.campaign.reset();
        }
        return super.updateSource(data, options);
    }

    /** Only prepare rule elements for non-physical items (in case campaign items exist) */
    protected override prepareRuleElements(): RuleElement<RuleElementSchema>[] {
        return this.items.contents
            .filter((item) => !item.isOfType("physical"))
            .flatMap((item) => item.prepareRuleElements())
            .filter((rule) => !rule.ignored)
            .sort((elementA, elementB) => elementA.priority - elementB.priority);
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Fetch members, and update their parties if this isn't a clone
        this.members = this.system.details.members
            .map((m) => fromUuidSync(m.uuid))
            .filter((a): a is CreaturePF2e => a instanceof ActorPF2e && a.isOfType("creature"))
            .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
        if (fromUuidSync(this.uuid) === this) {
            for (const member of this.members) {
                member.parties.add(this);
            }
        }

        // Kingmaker things
        if (game.pf2e.settings.campaign.type === "kingmaker" && !this.campaign) {
            Object.defineProperty(this, "campaign", {
                value: new Kingdom(fu.deepClone(this.system._source.campaign ?? {}), { parent: this.system }),
                writable: true,
                enumerable: false,
            });
        } else if (!game.pf2e.settings.campaign.type) {
            this.campaign = null;
        }
        this.campaign?.prepareBaseData();
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        this.prepareSynthetics();
        this.campaign?.prepareDerivedData();
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

        const members = [...existing, ...newMembers.map((m) => ({ uuid: m.uuid }))];
        await this.update({ system: { details: { members } } });

        await resetActors(newMembers);
    }

    async removeMembers(...remove: (ActorUUID | CreaturePF2e)[]): Promise<void> {
        const uuids = remove.map((d) => (typeof d === "string" ? d : d.uuid));
        const existing = this.system.details.members.filter((d) => this.members.some((m) => m.uuid === d.uuid));
        const members = existing.filter((m) => !tupleHasValue(uuids, m.uuid));
        await this.update({ system: { details: { members } } });
    }

    override getRollOptions(domains?: string[]): string[] {
        const options = super.getRollOptions(domains);
        return options.concat(this.campaign?.getRollOptions?.() ?? []);
    }

    override getRollData(): Record<string, unknown> {
        return fu.mergeObject(super.getRollData(), this.campaign?.getRollData?.() ?? {});
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
    override getStatistic(slug: string): Statistic<this> | null;
    override getStatistic(slug: string): Statistic | null {
        const statistic = super.getStatistic(slug);
        if (statistic) return statistic;

        const campaignStat = this.campaign?.getStatistic?.(slug);

        return campaignStat ?? null;
    }

    private _resetAndRerenderDebounced = fu.debounce(() => {
        super.reset();
        this.sheet.render(false, { actor: true } as PartySheetRenderOptions);
    }, 50);

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _preCreate(
        data: DeepPartial<this["_source"]>,
        options: DatabaseCreateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        data.folder = null;
        return super._preCreate(data, options, user);
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: PartyUpdateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        // Prevent party actors from being dragged to folders
        changed.folder = null;
        if (!changed.system) return super._preUpdate(changed, options, user);

        const members = this.members;
        const newMemberUUIDs = changed.system.details?.members?.map((m) => m?.uuid);
        if (newMemberUUIDs) {
            const deletedMembers = members.filter((m) => m?.uuid && !newMemberUUIDs.includes(m.uuid));
            options.removedMembers = deletedMembers.map((m) => m.uuid);
        }

        // Ensure the party campaign type is properly set if any data gets updated
        const campaign = this.system._source.campaign;
        if (campaign && changed.system.campaign && changed.system.campaign.type !== campaign.type) {
            changed.system.campaign.type = campaign.type;
            this.campaign?._preUpdate?.(changed.system.campaign);
        }

        return super._preUpdate(changed, options, user);
    }

    /** Override to inform creatures when they were booted from a party */
    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: PartyUpdateCallbackOptions,
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
    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void {
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

interface PartyUpdateCallbackOptions extends ActorUpdateCallbackOptions {
    removedMembers?: string[];
}

export { PartyPF2e };

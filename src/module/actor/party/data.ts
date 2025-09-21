import { CreatureReach } from "@actor/creature/index.ts";
import type { ActorAttributes, ActorDetails, BaseActorSourcePF2e } from "@actor/data/base.ts";
import { ActorSystemModel, ActorSystemSchema } from "@actor/data/model.ts";
import type {
    ModelPropFromDataField,
    ModelPropsFromSchema,
    SourceFromDataField,
    SourceFromSchema,
} from "@common/data/fields.d.mts";
import type { ActorUUID } from "@common/documents/_module.d.mts";
import * as R from "remeda";
import type { PartyPF2e } from "./document.ts";
import { Kingdom } from "./kingdom/model.ts";
import type { KingdomSchema } from "./kingdom/schema.ts";
import fields = foundry.data.fields;

type PartySource = BaseActorSourcePF2e<"party", PartySystemSource>;

class PartySystemData extends ActorSystemModel<PartyPF2e, PartySystemSchema> {
    static override defineSchema(): PartySystemSchema {
        return {
            ...super.defineSchema(),
            details: new fields.SchemaField({
                description: new fields.HTMLField({ required: true, nullable: false, blank: true, initial: "" }),
                members: new fields.ArrayField(
                    new fields.SchemaField({
                        uuid: new fields.DocumentUUIDField({ required: true, nullable: false, initial: undefined }),
                    }),
                ),
            }),
            campaign: new fields.SchemaField(Kingdom.defineSchema(), {
                required: false,
                nullable: true,
                initial: null,
            }),
        };
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        // Provide base structure for parent method
        this.details.level = { value: 0 };
        this.attributes = {
            reach: { base: 0, manipulate: 0 },
            flanking: { canFlank: false, canGangUp: [], flankable: false, offGuardable: false },
            immunities: [],
            weaknesses: [],
            resistances: [],
        };
        this.movement = { speeds: { travel: { value: 0 } } };
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        const members = this.parent.members;

        // Filler until put into use for encounter metrics
        this.details.level.value = Math.round(
            R.meanBy(
                members.filter((m) => m.isOfType("character")),
                (m) => m.level,
            ),
        );
        this.details.alliance = members.some((m) => m.alliance === "party")
            ? "party"
            : members.some((m) => m.alliance === "opposition")
              ? "opposition"
              : null;
        this.attributes.reach.manipulate = members.reduce(
            (highest, a) => Math.max(a.system.attributes.reach.manipulate, highest),
            0,
        );
        this.movement.speeds.travel.value = Math.min(
            ...(members.length === 0 ? [0] : members.map((a) => a.system.movement.speeds.travel.value)),
        );
    }
}

interface PartySystemData
    extends ActorSystemModel<PartyPF2e, PartySystemSchema>,
        ModelPropsFromSchema<PartySystemSchema> {
    attributes: PartyAttributes;
    details: PartyDetails;
    movement: PartyMovementData;
}

type PartySystemSchema = ActorSystemSchema & {
    details: fields.SchemaField<{
        description: fields.HTMLField<string, string, true, false, true>;
        members: fields.ArrayField<
            fields.SchemaField<{
                uuid: fields.DocumentUUIDField<ActorUUID, true, false, false>;
            }>
        >;
    }>;
    campaign: fields.SchemaField<
        KingdomSchema,
        SourceFromSchema<KingdomSchema>,
        ModelPropsFromSchema<KingdomSchema>,
        false,
        true,
        true
    >;
};

interface PartySystemSource extends SourceFromSchema<PartySystemSchema> {
    details: PartyDetailsSource;
    attributes?: never;
    traits?: never;
    schema?: never;
}

interface PartyDetailsSource extends SourceFromDataField<PartySystemSchema["details"]> {
    readonly alliance?: never;
    readonly level?: never;
}

interface PartyAttributes extends Omit<ActorAttributes, "attributes" | "initiative" | "ac" | "hp"> {
    reach: CreatureReach;
    immunities: never[];
    weaknesses: never[];
    resistances: never[];
}

interface PartyMovementData {
    speeds: { travel: { value: number } };
}

interface PartyDetails extends ModelPropFromDataField<PartySystemSchema["details"]>, ActorDetails {}

type PartyCampaignSource = { type: string } & Record<string, JSONValue>;

export { PartySystemData };
export type { PartyAttributes, PartyCampaignSource, PartySource };

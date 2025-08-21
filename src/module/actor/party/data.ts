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
}

interface PartySystemData
    extends ActorSystemModel<PartyPF2e, PartySystemSchema>,
        ModelPropsFromSchema<PartySystemSchema> {
    attributes: PartyAttributes;
    details: PartyDetails;
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

interface PartyAttributes extends Omit<ActorAttributes, "initiative" | "ac" | "hp"> {
    speed: { total: number };
    reach: CreatureReach;
    immunities: never[];
    weaknesses: never[];
    resistances: never[];
}

interface PartyDetails extends ModelPropFromDataField<PartySystemSchema["details"]>, ActorDetails {}

type PartyCampaignSource = { type: string } & Record<string, JSONValue>;

export { PartySystemData };
export type { PartyAttributes, PartyCampaignSource, PartySource };

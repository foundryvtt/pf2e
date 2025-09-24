import { DeferredValueParams } from "@actor/modifiers.ts";
import type Document from "@common/abstract/document.d.mts";
import { ItemPF2e } from "@item";
import { ConditionSource, EffectSource } from "@item/base/data/index.ts";
import { UUIDUtils } from "@util/uuid.ts";
import { RuleElement } from "./base.ts";
import { ModelPropsFromRESchema, RuleElementSchema } from "./data.ts";
import { ItemAlteration, ItemAlterationSchema } from "./item-alteration/alteration.ts";
import fields = foundry.data.fields;

/** An effect that applies ephemerally during a single action, such as a strike */
class EphemeralEffectRuleElement extends RuleElement<EphemeralEffectSchema> {
    static override defineSchema(): EphemeralEffectSchema {
        const alterationField = new fields.EmbeddedDataField(ItemAlteration);
        return {
            ...super.defineSchema(),
            affects: new fields.StringField({ required: true, choices: ["target", "origin"], initial: "target" }),
            selectors: new fields.ArrayField(
                new fields.StringField({ required: true, blank: false, nullable: false, initial: undefined }),
            ),
            uuid: new fields.StringField({ required: true, blank: false, nullable: false, initial: undefined }),
            adjustName: new fields.BooleanField({ required: true, nullable: false, initial: true }),
            alterations: new fields.ArrayField(alterationField, { required: false, nullable: false, initial: [] }),
        };
    }

    static override validateJoint(data: fields.SourceFromSchema<EphemeralEffectSchema>): void {
        super.validateJoint(data);

        if (data.selectors.length === 0) {
            throw Error("must have at least one selector");
        }
    }

    override afterPrepareData(): void {
        for (const selector of this.resolveInjectedProperties(this.selectors)) {
            const deferredEffect = this.#createDeferredEffect();
            const synthetics = (this.actor.synthetics.ephemeralEffects[selector] ??= { target: [], origin: [] });
            synthetics[this.affects].push(deferredEffect);
        }
    }

    #createDeferredEffect(): (params?: DeferredValueParams) => Promise<EffectSource | ConditionSource | null> {
        return async (params: DeferredValueParams = {}): Promise<EffectSource | ConditionSource | null> => {
            if (!this.test(params.test ?? this.actor.getRollOptions())) {
                return null;
            }

            const uuid = this.resolveInjectedProperties(this.uuid);
            if (!UUIDUtils.isItemUUID(uuid)) {
                this.failValidation(`"${uuid}" does not look like a UUID`);
                return null;
            }
            const effect: Document | null = game.pf2e.ConditionManager.conditions.get(uuid) ?? (await fromUuid(uuid));
            if (!(effect instanceof ItemPF2e && effect.isOfType("condition", "effect"))) {
                this.failValidation(`unable to find effect or condition item with uuid "${uuid}"`);
                return null;
            }

            const source = effect.toObject();

            // An ephemeral effect will be added to a contextual clone's item source array and cannot include any
            // asynchronous rule elements
            const hasForbiddenREs = source.system.rules.some(
                (r) =>
                    typeof r.key === "string" &&
                    (r.key === "ChoiceSet" ||
                        (r.key === "GrantItem" && !("inMemoryOnly" in r && r.inMemoryOnly === true))),
            );
            if (hasForbiddenREs) {
                this.failValidation("an ephemeral effect may not include a choice set or grant");
            }

            if (this.adjustName) {
                const label = this.getReducedLabel();
                source.name = `${source.name} (${label})`;
            }

            try {
                for (const alteration of this.alterations) {
                    alteration.applyTo(source);
                }
            } catch (error) {
                if (error instanceof Error) this.failValidation(error.message);
                return null;
            }

            return source;
        };
    }
}

interface EphemeralEffectRuleElement
    extends RuleElement<EphemeralEffectSchema>,
        ModelPropsFromRESchema<EphemeralEffectSchema> {}

type EphemeralEffectSchema = RuleElementSchema & {
    affects: fields.StringField<"target" | "origin", "target" | "origin", true, false, true>;
    selectors: fields.ArrayField<fields.StringField<string, string, true, false, false>>;
    uuid: fields.StringField<string, string, true, false, false>;
    adjustName: fields.BooleanField<boolean, boolean, true, false, true>;
    alterations: fields.ArrayField<
        fields.EmbeddedDataField<ItemAlteration>,
        fields.SourceFromSchema<ItemAlterationSchema>[],
        ItemAlteration[],
        false,
        false,
        true
    >;
};

export { EphemeralEffectRuleElement };

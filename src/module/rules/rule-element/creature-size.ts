import type { ActorType, CreaturePF2e } from "@actor";
import { SIZE_TO_REACH } from "@actor/creature/values.ts";
import { ActorSizePF2e } from "@actor/data/size.ts";
import { TreasurePF2e } from "@item";
import { SIZES, Size } from "@module/data.ts";
import { RecordField } from "@system/schema-data-fields.ts";
import { tupleHasValue } from "@util";
import * as R from "remeda";
import { RuleElement, RuleElementOptions } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema, RuleElementSource } from "./data.ts";
import fields = foundry.data.fields;

/**
 * @category RuleElement
 * Change a creature's size
 */
class CreatureSizeRuleElement extends RuleElement<CreatureSizeRuleSchema> {
    protected static override validActorTypes: ActorType[] = ["character", "npc", "familiar"];

    constructor(data: RuleElementSource, options: RuleElementOptions) {
        super(data, options);

        if (typeof this.value !== "string" && typeof this.value !== "number") {
            this.failValidation("value must be a number or string");
        }
    }

    static override defineSchema(): CreatureSizeRuleSchema {
        return {
            ...super.defineSchema(),
            value: new ResolvableValueField({ required: true, nullable: false }),
            reach: new RecordField(
                new fields.StringField({ required: true, nullable: false, choices: ["add", "upgrade", "override"] }),
                new ResolvableValueField({ required: true, nullable: false }),
                { required: false, nullable: true, initial: null },
            ),
            resizeEquipment: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
            minimumSize: new fields.StringField({
                required: false,
                nullable: false,
                choices: SIZES,
                initial: undefined,
            }),
            maximumSize: new fields.StringField({
                required: false,
                nullable: false,
                choices: SIZES,
                initial: undefined,
            }),
        };
    }

    static #WORD_TO_ABBREVIATION: Record<string, Size | undefined> = {
        tiny: "tiny",
        small: "sm",
        medium: "med",
        large: "lg",
        huge: "huge",
        gargantuan: "grg",
    };

    static #incrementMap = { tiny: "sm", sm: "med", med: "lg", lg: "huge", huge: "grg", grg: "grg" } as const;

    static #decrementMap = { tiny: "tiny", sm: "tiny", med: "sm", lg: "med", huge: "lg", grg: "huge" } as const;

    #incrementSize(size: Size, amount: number): Size {
        if (amount === 0) return size;
        return this.#incrementSize(CreatureSizeRuleElement.#incrementMap[size], amount - 1);
    }

    #decrementSize(size: Size, amount: number): Size {
        if (amount === 0) return size;
        return this.#decrementSize(CreatureSizeRuleElement.#decrementMap[size], amount - 1);
    }

    override beforePrepareData(): void {
        if (!this.test()) return;

        const value = this.resolveValue(this.value);
        if (!(typeof value === "string" || typeof value === "number")) {
            this.failValidation(
                `CreatureSize Rule Element on actor ${this.actor.id} (${this.actor.name})`,
                "has a non-string, non-numeric value",
            );
            return;
        }
        const size = CreatureSizeRuleElement.#WORD_TO_ABBREVIATION[value] ?? value;
        if (typeof size === "string" && !tupleHasValue(SIZES, size)) {
            this.failValidation(`"${size}" is not a recognized size`);
            return;
        }
        const actor = this.actor;
        const originalSize = new ActorSizePF2e({ value: actor.size });

        if (value === 1) {
            if (this.maximumSize && !originalSize.isSmallerThan(this.maximumSize)) {
                return;
            }
            actor.system.traits.size.increment();
        } else if (value === -1) {
            if (this.minimumSize && !originalSize.isLargerThan(this.minimumSize)) {
                return;
            }
            actor.system.traits.size.decrement();
        } else if (tupleHasValue(SIZES, size)) {
            actor.system.traits.size = new ActorSizePF2e({ value: size });
        } else {
            const validValues = Array.from(
                new Set(Object.entries(CreatureSizeRuleElement.#WORD_TO_ABBREVIATION).flat()),
            ).join('", "');
            this.failValidation(
                `CreatureSize Rule Element on actor ${actor.id} (${actor.name})`,
                `has an invalid value: must be one of "${validValues}", +1, or -1`,
            );
            return;
        }

        const reach = actor.system.attributes.reach;
        reach.base = this.#getReach(originalSize);
        reach.manipulate = Math.max(reach.manipulate, reach.base);

        if (this.resizeEquipment) {
            const sizeDifference = originalSize.difference(actor.system.traits.size, { smallIsMedium: true });
            for (const item of actor.inventory.filter((i) => !(i instanceof TreasurePF2e && i.isCoinage))) {
                if (sizeDifference < 0) {
                    item.system.size = this.#incrementSize(item.size, Math.abs(sizeDifference));
                } else if (sizeDifference > 0) {
                    item.system.size = this.#decrementSize(item.size, Math.abs(sizeDifference));
                }
            }

            // Update natural size so auto-scaling targets the original size, but only once per data preparation.
            actor.system.traits.naturalSize = actor.system.traits.naturalSize ?? originalSize.value;
        }
    }

    /** Return a new reach distance if one is specified */
    #getReach(originalSize: ActorSizePF2e): number {
        const current = this.actor.attributes.reach.base;

        if (this.reach) {
            const changeValue = Math.trunc(
                Number(this.resolveValue(this.reach.add ?? this.reach.upgrade ?? this.reach.override)),
            );
            if (this.ignored || !Number.isFinite(changeValue)) return current;
            if (!R.isNullish(this.reach.add)) return Math.max(0, current + changeValue);
            if (!R.isNullish(this.reach.upgrade)) return Math.max(current, changeValue);
            if (!R.isNullish(this.reach.override)) return Math.max(0, changeValue);
        }

        const newSize = this.actor.system.traits.size;
        return newSize.isLargerThan(originalSize)
            ? Math.max(SIZE_TO_REACH[this.actor.size], current)
            : newSize.isSmallerThan(originalSize)
              ? Math.min(SIZE_TO_REACH[this.actor.size], current)
              : current;
    }
}

interface CreatureSizeRuleElement
    extends RuleElement<CreatureSizeRuleSchema>,
        ModelPropsFromRESchema<CreatureSizeRuleSchema> {
    get actor(): CreaturePF2e;
}

type CreatureSizeRuleSchema = RuleElementSchema & {
    value: ResolvableValueField<true, false, true>;
    reach: RecordField<
        fields.StringField<"add" | "upgrade" | "override", "add" | "upgrade" | "override", true, false, false>,
        ResolvableValueField<true, false, false>,
        false,
        true,
        true
    >;
    resizeEquipment: fields.BooleanField<boolean, boolean, false, false, false>;
    minimumSize: fields.StringField<Size, Size, false, false, false>;
    maximumSize: fields.StringField<Size, Size, false, false, false>;
};

export { CreatureSizeRuleElement };

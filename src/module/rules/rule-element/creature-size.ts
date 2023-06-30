import { CreaturePF2e } from "@actor";
import { SIZE_TO_REACH } from "@actor/creature/values.ts";
import { ActorType } from "@actor/data/index.ts";
import { ActorSizePF2e } from "@actor/data/size.ts";
import { TreasurePF2e } from "@item";
import { SIZES, Size } from "@module/data.ts";
import { tupleHasValue } from "@util";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./index.ts";
import type { BooleanField, StringField } from "types/foundry/common/data/fields.d.ts";
import { ResolvableValueField } from "./data.ts";
import { RecordField } from "@system/schema-data-fields.ts";

/**
 * @category RuleElement
 * Change a creature's size
 */
class CreatureSizeRuleElement extends RuleElementPF2e<CreatureSizeRuleSchema> {
    protected static override validActorTypes: ActorType[] = ["character", "npc", "familiar"];

    static override defineSchema(): CreatureSizeRuleSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            value: new ResolvableValueField({ required: true, nullable: false }),
            reach: new RecordField(
                new fields.StringField({ required: true, nullable: false, choices: ["add", "upgrade", "override"] }),
                new ResolvableValueField({ required: true, nullable: false }),
                { required: false, nullable: false, initial: undefined }
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

    constructor(data: RuleElementSource, options: RuleElementOptions) {
        super(data, options);

        if (!(typeof this.value === "string" || typeof this.value === "number" || this.isBracketedValue(this.value))) {
            this.failValidation("value must be a number, string, or bracketed value");
        }
    }

    private static wordToAbbreviation: Record<string, Size | undefined> = {
        tiny: "tiny",
        small: "sm",
        medium: "med",
        large: "lg",
        huge: "huge",
        gargantuan: "grg",
    };

    private static incrementMap = { tiny: "sm", sm: "med", med: "lg", lg: "huge", huge: "grg", grg: "grg" } as const;

    private static decrementMap = { tiny: "tiny", sm: "tiny", med: "sm", lg: "med", huge: "lg", grg: "huge" } as const;

    private incrementSize(size: Size, amount: number): Size {
        if (amount === 0) return size;
        return this.incrementSize(CreatureSizeRuleElement.incrementMap[size], amount - 1);
    }

    private decrementSize(size: Size, amount: number): Size {
        if (amount === 0) return size;
        return this.decrementSize(CreatureSizeRuleElement.decrementMap[size], amount - 1);
    }

    override beforePrepareData(): void {
        if (!this.test()) return;

        const value = this.resolveValue(this.value);
        if (!(typeof value === "string" || typeof value === "number")) {
            this.failValidation(
                `CreatureSize Rule Element on actor ${this.actor.id} (${this.actor.name})`,
                "has a non-string, non-numeric value"
            );
            return;
        }
        const size = CreatureSizeRuleElement.wordToAbbreviation[value] ?? value;
        if (typeof size === "string" && !tupleHasValue(SIZES, size)) {
            this.failValidation(`"${size}" is not a recognized size`);
            return;
        }
        const { actor } = this;
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
                new Set(Object.entries(CreatureSizeRuleElement.wordToAbbreviation).flat())
            ).join('", "');
            this.failValidation(
                `CreatureSize Rule Element on actor ${actor.id} (${actor.name})`,
                `has an invalid value: must be one of "${validValues}", +1, or -1`
            );
            return;
        }

        const { reach } = actor.system.attributes;
        reach.base = this.#getReach(originalSize);
        reach.manipulate = Math.max(reach.manipulate, reach.base);

        if (this.resizeEquipment) {
            const sizeDifference = originalSize.difference(actor.system.traits.size, { smallIsMedium: true });
            for (const item of actor.inventory.filter((i) => !(i instanceof TreasurePF2e && i.isCoinage))) {
                if (sizeDifference < 0) {
                    item.system.size = this.incrementSize(item.size, Math.abs(sizeDifference));
                } else if (sizeDifference > 0) {
                    item.system.size = this.decrementSize(item.size, Math.abs(sizeDifference));
                }
            }
        }
    }

    /** Return a new reach distance if one is specified */
    #getReach(originalSize: ActorSizePF2e): number {
        const current = this.actor.attributes.reach.base;

        if (this.reach) {
            const changeValue = ((): number => {
                const resolved = this.resolveValue(this.reach.add ?? this.reach.upgrade ?? this.reach.override);
                return Math.trunc(Math.abs(Number(resolved)));
            })();

            if (!Number.isInteger(changeValue)) return current;
            if (this.reach.add) return current + changeValue;
            if (this.reach.upgrade) return Math.max(current, changeValue);
            if (this.reach.override) return changeValue;
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
    extends RuleElementPF2e<CreatureSizeRuleSchema>,
        ModelPropsFromSchema<CreatureSizeRuleSchema> {
    get actor(): CreaturePF2e;
}

type CreatureSizeRuleSchema = RuleElementSchema & {
    value: ResolvableValueField<true, false, true>;
    reach: RecordField<
        StringField<"add" | "upgrade" | "override", "add" | "upgrade" | "override", true, false, false>,
        ResolvableValueField<true, false, false>,
        false,
        false,
        false
    >;
    resizeEquipment: BooleanField<boolean, boolean, false, false, false>;
    minimumSize: StringField<Size, Size, false, false, false>;
    maximumSize: StringField<Size, Size, false, false, false>;
};

export { CreatureSizeRuleElement };

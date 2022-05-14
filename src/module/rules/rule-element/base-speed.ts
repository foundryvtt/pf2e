import { RuleElementPF2e } from "./";
import { ActorType } from "@actor/data";
import { CreaturePF2e } from "@actor";
import { tupleHasValue } from "@util";
import { MOVEMENT_TYPES } from "@actor/data/values";

/**
 * @category RuleElement
 */
class BaseSpeedRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    override beforePrepareData(): void {
        if (!this.test()) return;

        const value = this.resolveValue(this.data.value);
        const speedType = this.data.selector?.trim().replace(/-speed$/, "") ?? "land";
        if (!(tupleHasValue(MOVEMENT_TYPES, speedType) && typeof value === "number" && value > 0)) {
            return this.failValidation("Base speed requires a positive value field");
        }

        const speeds = this.actor.data.data.attributes.speed;
        const otherSpeeds: { value: string | number; type: string }[] = speeds.otherSpeeds;
        const existingOther = otherSpeeds.find((speed) => speed.type === speedType);
        if (speedType === "land") {
            const landSpeed: { value: string | number } = speeds;
            landSpeed.value = Math.max(Number(speeds.value), value);
        } else if (existingOther) {
            existingOther.value = Math.max(Number(existingOther.value), value);
        } else {
            const newSpeed = {
                label: game.i18n.localize(`PF2E.SpeedTypes${speedType.titleCase()}`),
                type: speedType,
                value,
            };
            otherSpeeds.push(newSpeed);
        }
    }
}

interface BaseSpeedRuleElement extends RuleElementPF2e {
    get actor(): CreaturePF2e;
}

export { BaseSpeedRuleElement };

import * as R from "remeda";
import { htmlClosest } from "./dom.ts";

/** Returns statistic dialog roll parameters based on held keys */
type ParamsFromEvent = { skipDialog: boolean; rollMode?: RollMode | "roll" };

function isRelevantEvent(
    event: Maybe<JQuery.TriggeredEvent | Event>,
): event is MouseEvent | TouchEvent | KeyboardEvent | WheelEvent | JQuery.TriggeredEvent {
    return !!event && "ctrlKey" in event && "metaKey" in event && "shiftKey" in event;
}

/** Set roll mode and dialog skipping from a user's input */
function eventToRollParams(
    event: Maybe<JQuery.TriggeredEvent | Event>,
    rollType: { type: "check" | "damage" },
): ParamsFromEvent {
    const key = rollType.type === "check" ? "showCheckDialogs" : "showDamageDialogs";
    const skipDefault = !game.user.settings[key];
    if (!isRelevantEvent(event)) return { skipDialog: skipDefault };

    const params: ParamsFromEvent = { skipDialog: event.shiftKey ? !skipDefault : skipDefault };
    if (event.ctrlKey || event.metaKey) {
        params.rollMode = game.user.isGM ? "gmroll" : "blindroll";
    }

    return params;
}

/** Set roll mode from a user's input: used for messages that are not actually rolls. */
function eventToRollMode(event: Maybe<Event>): RollMode | "roll" {
    if (!isRelevantEvent(event) || !(event.ctrlKey || event.metaKey)) return "roll";
    return game.user.isGM ? "gmroll" : "blindroll";
}

/** Creates a listener that can be used to create tooltips with dynamic content */
function createTooltipListener(
    element: HTMLElement,
    options: {
        /** Controls if the top edge of this tooltip aligns with the top edge of the target */
        align?: "top";
        /** If given, the tooltip will spawn on elements that match this selector */
        selector?: string;
        locked?: boolean;
        direction?: TooltipActivationOptions["direction"];
        cssClass?: string;
        render: (element: HTMLElement) => Promise<HTMLElement | null>;
    },
): void {
    const tooltipOptions = R.pick(options, ["cssClass", "direction", "locked"]);

    element.addEventListener(
        "pointerenter",
        async (event) => {
            const target = options.selector ? htmlClosest(event.target, options.selector) : element;
            if (!target) return;
            const content = await options.render(target);
            if (!content) return;

            if (options.locked) {
                game.tooltip.dismissLockedTooltips();
            }
            game.tooltip.activate(target, { content, ...tooltipOptions });

            // A very crude implementation only designed for align top. Make it more flexible if we need to later
            if (options.align === "top") {
                const pad = TooltipManager.TOOLTIP_MARGIN_PX;
                const actualTooltip = options.locked ? content.closest("aside") : game.tooltip.tooltip;
                if (actualTooltip) {
                    const bounds = target.getBoundingClientRect();
                    const maxH = window.innerHeight - actualTooltip.offsetHeight;
                    actualTooltip.style.top = `${Math.clamp(bounds.top, pad, maxH - pad)}px`;
                }
            }
        },
        true,
    );
}

export { createTooltipListener, eventToRollMode, eventToRollParams };

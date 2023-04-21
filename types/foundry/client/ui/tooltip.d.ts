export {};

declare global {
    /**
     * A singleton Tooltip Manager class responsible for rendering and positioning a dynamic tooltip element which is
     * accessible as `game.tooltip`.
     *
     * @example API Usage
     * ```js
     * game.tooltip.activate(htmlElement, {text: "Some tooltip text", direction: "UP"});
     * game.tooltip.deactivate();
     * ```
     *
     * @example HTML Usage
     * ```html
     * <span data-tooltip="Some Tooltip" data-tooltip-direction="LEFT">I have a tooltip</span>
     * <ol data-tooltip-direction="RIGHT">
     *   <li data-tooltip="The First One">One</li>
     *   <li data-tooltip="The Second One">Two</li>
     *   <li data-tooltip="The Third One">Three</li>
     * </ol>
     * ```
     */
    class TooltipManager {
        /**
         * A cached reference to the global tooltip element
         */
        tooltip: HTMLElement;

        /**
         * A reference to the HTML element which is currently tool-tipped, if any.
         */
        element: HTMLElement | null;

        /**
         * An amount of margin which is used to offset tooltips from their anchored element.
         */
        static TOOLTIP_MARGIN_PX: number;

        /**
         * The number of milliseconds delay which activates a tooltip on a "long hover".
         */
        static TOOLTIP_ACTIVATION_MS: number;

        /**
         * The directions in which a tooltip can extend, relative to its tool-tipped element.
         */
        static TOOLTIP_DIRECTIONS: {
            UP: "UP";
            DOWN: "DOWN";
            LEFT: "LEFT";
            RIGHT: "RIGHT";
            CENTER: "CENTER";
        };

        /**
         * Activate interactivity by listening for hover events on HTML elements which have a data-tooltip defined.
         */
        activateEventListeners(): void;

        /**
         * Activate the tooltip for a hovered HTML element which defines a tooltip localization key.
         * @param element     The HTML element being hovered.
         * @param options     Additional options which can override tooltip behavior.
         * @param options.text       Explicit tooltip text to display. If this is not provided the tooltip text is
         *                           acquired from the elements data-tooltip attribute. This text will be
         *                           automatically localized
         * @param options.direction  An explicit tooltip expansion direction. If this is not provided the
         *                           direction is acquired from the data-tooltip-direction attribute of the
         *                           element or one of its parents.
         * @param options.cssClass   An optional CSS class to apply to the activated tooltip.
         */
        activate(element: HTMLElement, { text, direction, cssClass }: TooltipActivationOptions): void;

        /**
         * Deactivate the tooltip from a previously hovered HTML element.
         */
        private deactivate(): void;

        /**
         * Clear any pending activation workflow.
         */
        protected clearPending(): void;

        /**
         * If an explicit tooltip expansion direction was not specified, figure out a valid direction based on the bounds
         * of the target element and the screen.
         */
        private _determineDirection(): "UP" | "DOWN";

        /**
         * Set tooltip position relative to an HTML element using an explicitly provided data-tooltip-direction.
         * @param direction  The tooltip expansion direction specified by the element or a parent element.
         */
        private _setAnchor(direction: TooltipDirection): void;

        /**
         * Apply inline styling rules to the tooltip for positioning and text alignment.
         * @param position  An object of positioning data, supporting top, right, bottom, left, and textAlign
         */
        private _setStyle(position: TooltipStylePosition): void;
    }

    type TooltipDirection = keyof (typeof TooltipManager)["TOOLTIP_DIRECTIONS"];

    interface TooltipActivationOptions {
        text?: string;
        direction?: TooltipDirection;
        cssClass?: string;
    }

    interface TooltipStylePosition {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
        textAlign?: string;
    }
}

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
        /** A cached reference to the global tooltip element */
        tooltip: HTMLElement;

        /** A reference to the HTML element which is currently tool-tipped, if any. */
        element: HTMLElement | null;

        /** An amount of margin which is used to offset tooltips from their anchored element. */
        static TOOLTIP_MARGIN_PX: number;

        /** The number of milliseconds delay which activates a tooltip on a "long hover". */
        static TOOLTIP_ACTIVATION_MS: number;

        /** The directions in which a tooltip can extend, relative to its tool-tipped element. */
        static TOOLTIP_DIRECTIONS: {
            UP: "UP";
            DOWN: "DOWN";
            LEFT: "LEFT";
            RIGHT: "RIGHT";
            CENTER: "CENTER";
        };

        /** The number of pixels buffer around a locked tooltip zone before they should be dismissed. */
        static LOCKED_TOOLTIP_BUFFER_PX: number;

        /** Activate interactivity by listening for hover events on HTML elements which have a data-tooltip defined. */
        activateEventListeners(): void;

        /**
         * Activate the tooltip for a hovered HTML element which defines a tooltip localization key.
         * @param element              The HTML element being hovered.
         * @param [options={}]         Additional options which can override tooltip behavior.
         */
        activate(element: HTMLElement, options?: TooltipActivationOptions): void;

        /** Deactivate the tooltip from a previously hovered HTML element. */
        deactivate(): void;

        /** Clear any pending activation workflow. */
        protected clearPending(): void;

        /** Lock the current tooltip. */
        lockTooltip(): HTMLElement;

        /**
         * Handle a request to lock the current tooltip.
         * @param event  The click event.
         */
        protected _onLockTooltip(event: MouseEvent): void;

        /**
         * Handle dismissing a locked tooltip.
         * @param event  The click event.
         */
        protected _onLockedTooltipDismiss(event: MouseEvent): void;

        /**
         * Dismiss a given locked tooltip.
         * @param element  The locked tooltip to dismiss.
         */
        dismissLockedTooltip(element: HTMLElement): void;

        /** Dismiss the set of active locked tooltips. */
        dismissLockedTooltips(): void;

        /**
         * Create a locked tooltip at the given position.
         * @param position             A position object with coordinates for where the tooltip should be placed
         * @param position.top         Explicit top position for the tooltip
         * @param position.right       Explicit right position for the tooltip
         * @param position.bottom      Explicit bottom position for the tooltip
         * @param position.left        Explicit left position for the tooltip
         * @param text                 Explicit tooltip text or HTML to display.
         * @param [options={}]         Additional options which can override tooltip behavior.
         * @param [options.cssClass]   An optional, space-separated list of CSS classes to apply to the activated
         *                             tooltip.
         */
        createLockedTooltip(position: TooltipPosition, text: string, options?: { cssClass?: string }): HTMLElement;

        /**
         * If an explicit tooltip expansion direction was not specified, figure out a valid direction based on the bounds
         * of the target element and the screen.
         */
        protected _determineDirection(): "UP" | "DOWN";

        /**
         * Set tooltip position relative to an HTML element using an explicitly provided data-tooltip-direction.
         * @param direction  The tooltip expansion direction specified by the element or a parent element.
         */
        protected _setAnchor(direction: TooltipDirection): void;

        /**
         * Apply inline styling rules to the tooltip for positioning and text alignment.
         * @param position  An object of positioning data, supporting top, right, bottom, left, and textAlign
         */
        protected _setStyle(position: TooltipStylePosition): void;
    }

    type TooltipDirection = keyof (typeof TooltipManager)["TOOLTIP_DIRECTIONS"];

    interface TooltipActivationOptions {
        /**
         * Explicit tooltip text to display. If this is not provided the tooltip text is acquired from the elements
         * data-tooltip attribute. This text will be automatically localized.
         */
        text?: string;
        /**
         * An explicit tooltip expansion direction. If this is not provided the direction is acquired from the
         * data-tooltip-direction attribute of the element or one of its parents.
         */
        direction?: TooltipDirection;
        /**
         * An optional, space-separated list of CSS classes to apply to the activated tooltip. If this is not provided,
         * the CSS classes are acquired from the data-tooltip-class attribute of the element or one of its parents.
         */
        cssClass?: string;
        /** An optional boolean to lock the tooltip after creation. Defaults to false. */
        locked?: boolean;
        /** Explicit HTML content to inject into the tooltip rather than using tooltip text. */
        content?: HTMLElement;
    }

    interface TooltipPosition {
        top: string;
        right: string;
        bottom: string;
        left: string;
    }

    interface TooltipStylePosition {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
        textAlign?: string;
    }
}

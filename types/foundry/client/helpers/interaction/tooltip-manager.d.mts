/**
 * A singleton Tooltip Manager class responsible for rendering and positioning a dynamic tooltip element which is
 * accessible as `game.tooltip`.
 *
 * @see {@link foundry.Game#tooltip}
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
export default class TooltipManager {
    constructor();

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
    static TOOLTIP_DIRECTIONS: Readonly<{
        UP: "UP";
        DOWN: "DOWN";
        LEFT: "LEFT";
        RIGHT: "RIGHT";
        CENTER: "CENTER";
    }>;

    /**
     * The number of pixels buffer around a locked tooltip zone before they should be dismissed.
     */
    static LOCKED_TOOLTIP_BUFFER_PX: number;

    /**
     * Activate interactivity by listening for hover events on HTML elements which have a data-tooltip defined.
     */
    activateEventListeners(): void;

    /**
     * Activate the tooltip for a hovered HTML element which defines a tooltip localization key.
     * @param element The HTML element being hovered.
     * @param options Additional options which can override tooltip behavior.
     * @param options.text Explicit tooltip text to display. If this is not provided the tooltip text is acquired from
     *                     the element's `data-tooltip-text` attribute if present and otherwise from its `data-tooltip`
     *                     attribute. The `data-tooltip` text will be automatically localized. If `data-tooltip` is not
     *                     a localization string, the text is rendered as HTML (cleaned). Both `options.text` and
     *                     `data-tooltip-text` do not support HTML. It is not recommended to use `data-tooltip` for
     *                     plain text and HTML as it could cause an unintentional localization. Instead use
     *                     `data-tooltip-text` and `data-tooltip-html`, respectively.
     * @param options.direction An explicit tooltip expansion direction. If this is not provided, the direction is
     *                          acquired from the `data-tooltip-direction` attribute of the element or one of its
     *                          parents.
     * @param options.cssClass An optional, space-separated list of CSS classes to apply to the activated tooltip. If
     *                         this is not provided, the CSS classes are acquired from the `data-tooltip-class`
     *                         attribute of the element or one of its parents.
     * @param options.locked An optional boolean to lock the tooltip after creation. Defaults to false.
     * @param options.html Explicit HTML to inject into the tooltip rather than using tooltip text. If passed as a
     *                     string, the HTML string is cleaned with {@link foundry.utils.cleanHTML}. An explicit HTML
     *                     string may also be set with the `data-tooltip-html` attribute on the element.
     */
    activate(element: HTMLElement, options?: TooltipActivationOptions): void;

    /**
     * Deactivate the tooltip from a previously hovered HTML element.
     */
    deactivate(): void;

    /**
     * Clear any pending activation workflow.
     * @internal
     */
    clearPending(): void;

    /**
     * Lock the current tooltip.
     */
    lockTooltip(): HTMLElement;

    /**
     * Handle a request to lock the current tooltip.
     * @param event The click event.
     */
    protected _onLockTooltip(event: PointerEvent): void;

    /**
     * Handle dismissing a locked tooltip.
     * @param event The click event.
     */
    protected _onLockedTooltipDismiss(event: PointerEvent): void;

    /**
     * Dismiss a given locked tooltip.
     * @param element The locked tooltip to dismiss.
     */
    dismissLockedTooltip(element: HTMLElement): void;

    /**
     * Dismiss the set of active locked tooltips.
     */
    dismissLockedTooltips(): void;

    /**
     * Create a locked tooltip at the given position.
     * @param position A position object with coordinates for where the tooltip should be placed
     * @param position.top Explicit top position for the tooltip
     * @param position.right Explicit right position for the tooltip
     * @param position.bottom Explicit bottom position for the tooltip
     * @param position.left Explicit left position for the tooltip
     * @param text Explicit tooltip text or HTML to display.
     * @param options Additional options which can override tooltip behavior.
     * @param options.cssClass An optional, space-separated list of CSS classes to apply to the activated tooltip.
     */
    createLockedTooltip(
        position: { top: string; right: string; bottom: string; left: string },
        text: string,
        options?: { cssClass?: string },
    ): HTMLElement;

    /**
     * If an explicit tooltip expansion direction was not specified, figure out a valid direction based on the bounds
     * of the target element and the screen.
     */
    protected _determineDirection(): "UP" | "DOWN";

    /**
     * Set tooltip position relative to an HTML element using an explicitly provided data-tooltip-direction.
     * @param direction The tooltip expansion direction specified by the element or a parent element.
     */
    protected _setAnchor(direction: TooltipDirection): void;

    /**
     * Apply inline styling rules to the tooltip for positioning and text alignment.
     * @param position An object of positioning data, supporting top, right, bottom, left, and textAlign
     */
    protected _setStyle(position?: {
        top?: number | null;
        right?: number | null;
        button?: number | null;
        left?: number | null;
        textAlign?: string | null;
    }): void;

    /* -------------------------------------------- */
    /*  Factory Methods                             */
    /* -------------------------------------------- */

    /**
     * Retrieve the configured TooltipManager implementation.
     */
    static get implementation(): typeof TooltipManager;
}

/**
 * Activate the tooltip for a hovered HTML element which defines a tooltip localization key.
 * @param {HTMLElement} element      The HTML element being hovered.
 * @param {object} [options={}]      Additional options which can override tooltip behavior.
 * @param {string} [options.text]
 * @param {TooltipDirection} [options.direction]  An explicit tooltip expansion direction. If this
 *                                      is not provided, the direction is acquired from the `data-tooltip-direction`
 *                                      attribute of the element or one of its parents.
 * @param {string} [options.cssClass]   An optional, space-separated list of CSS classes to apply to the activated
 *                                      tooltip. If this is not provided, the CSS classes are acquired from the
 *                                      `data-tooltip-class` attribute of the element or one of its parents.
 * @param {boolean} [options.locked=false]  An optional boolean to lock the tooltip after creation. Defaults to false.
 * @param {HTMLElement|string} [options.html]     Explicit HTML to inject into the tooltip rather than using
 *                                                tooltip text. If passed as a string, the HTML string is cleaned with
 *                                                {@link foundry.utils.cleanHTML}. An explicit HTML string may also
 *                                                be set with the `data-tooltip-html` attribute on the element.
 */

declare interface TooltipActivationOptions {
    /**
     * Explicit tooltip text to display. If this is not provided the tooltip text is acquired from the element's
     * `data-tooltip-text` attribute if present and otherwise from its `data-tooltip` attribute. The `data-tooltip`
     * text will be automatically localized. If `data-tooltip` is not a localization string, the text is rendered as
     * HTML (cleaned). Both `options.text` and `data-tooltip-text` do not support HTML. It is not recommended to use
     * `data-tooltip` for plain text and HTML as it could cause an unintentional localization. Instead use
     * `data-tooltip-text` and `data-tooltip-html`, respectively.
     */
    text?: string;
    /**
     * An explicit tooltip expansion direction. If this is not provided, the direction is acquired from the
     * `data-tooltip-direction` attribute of the element or one of its parents.
     */
    direction?: TooltipDirection;
    /**
     * An optional, space-separated list of CSS classes to apply to the activated tooltip. If this is not provided, the CSS
     * classes are acquired from the `data-tooltip-class` attribute of the element or one of its parents.
     */
    cssClass?: string;
    /** An optional boolean to lock the tooltip after creation. Defaults to false. */
    locked?: boolean;
    /**
     * Explicit HTML to inject into the tooltip rather than using tooltip text. If passed as a string, the HTML string
     * is cleaned with {@link foundry.utils.cleanHTML}. An explicit HTML string may also be set with the
     * `data-tooltip-html` attribute on the element.
     */
    html?: HTMLElement | string;
}

export type TooltipDirection = keyof typeof TooltipManager.TOOLTIP_DIRECTIONS;

export {};

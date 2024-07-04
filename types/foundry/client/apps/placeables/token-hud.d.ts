export {};

declare global {
    /**
     * An implementation of the PlaceableHUD base class which renders a heads-up-display interface for Token objects.
     * This interface provides controls for visibility, attribute bars, elevation, status effects, and more.
     * The TokenHUD implementation can be configured and replaced via {@link CONFIG.Token.hudClass}.
     */
    class TokenHUD<TObject extends Token | undefined = Token | undefined> extends BasePlaceableHUD<TObject> {
        static override get defaultOptions(): ApplicationOptions;

        /** Convenience reference to the Actor modified by this TokenHUD. */
        get actor(): NonNullable<TObject>["actor"] | undefined;

        override bind(object: NonNullable<TObject>): void;

        override setPosition(options?: ApplicationPosition): void;

        override getData(options?: Partial<ApplicationOptions>): TokenHUDData<NonNullable<TObject>>;

        /** Get an array of icon paths which represent valid status effect choices. */
        protected _getStatusEffectChoices(): object;

        /**
         * Toggle the expanded state of the status effects selection tray.
         * @param [active] Force the status tray to be active or inactive
         */
        toggleStatusTray(active?: boolean): void;

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */

        override activateListeners(html: JQuery): void;

        protected override _onClickControl(event: MouseEvent): void | Promise<void>;

        protected override _updateAttribute(name: string, input: string): Promise<void>;
    }

    interface TokenHUDStatusEffectChoice {
        id: string;
        title: string | null;
        src: ImageFilePath;
        isActive: boolean;
        isOverlay: boolean;
        cssClass: string;
    }

    type TokenHUDData<TObject extends Token = Token> = BasePlaceableHUDData<TObject> & {
        canConfigure: boolean;
        canToggleCombat: boolean;
        displayBar1: boolean;
        bar1Data: TokenResourceData | null;
        displayBar2: boolean;
        bar2Data: TokenResourceData | null;
        visibilityClass: string;
        effectsClass: string;
        combatClass: string;
        targetClass: string;
        statusEffects: Record<string, TokenHUDStatusEffectChoice>;
    };
}

/**
 * An implementation of the PlaceableHUD base class which renders a heads-up-display interface for Drawing objects.
 */
declare class DrawingHUD extends BasePlaceableHUD<Drawing> {}

/**
 * An implementation of the PlaceableHUD base class which renders a heads-up-display interface for Tile objects.
 */
declare class TileHUD extends BasePlaceableHUD<Tile> {}

/**
 * An implementation of the PlaceableHUD base class which renders a heads-up-display interface for Token objects.
 * This interface provides controls for visibility, attribute bars, elevation, status effects, and more.
 */
declare class TokenHUD extends BasePlaceableHUD<Token> {
    override getData(options?: ApplicationOptions): TokenHUDData;

    protected _getStatusEffectChoices(): Record<string, TokenHUDStatusEffectChoice | undefined>;
}

interface TokenHUDData extends BasePlaceableHUDData<Token> {
    canConfigure: boolean;
    canToggleCombat: boolean;
    displayBar1: boolean;
    bar1Data: ReturnType<TokenDocument["getBarAttribute"]>;
    displayBar2: boolean;
    bar2Data: ReturnType<TokenDocument["getBarAttribute"]>;
    visibilityClass: string;
    effectsClass: string;
    combatClass: string;
    targetClass: string;
    statusEffects: Record<string, TokenHUDStatusEffectChoice | undefined>;
}

interface TokenHUDStatusEffectChoice {
    id: string;
    title: string | null;
    src: ImagePath;
    isActive: boolean;
    isOverlay: boolean;
    cssClass: string;
}

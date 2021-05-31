declare class PointSource {
    constructor();

    /**
     * The light or darkness container for this source
     */
    illumination: PIXI.Container;

    /**
     * This visible color container for this source
     */
    coloration: PIXI.Container;

    /**
     * A flag for whether this source is currently active (rendered) or not
     */
    active: boolean;

    /**
     * Internal flag for whether this is a darkness source
     */
    darkness: boolean;

    /**
     * Is the light source limited by an angle of emission?
     */
    limited: boolean;

    /**
     * The maximum radius of emission for this source
     */
    radius: boolean;

    /**
     * Internal flag for animation throttling time
     */
    protected _animateTime: boolean;

    /**
     * An integer seed which de-synchronizes otherwise similar animations
     */
    protected _animateSeed: number | null;

    /**
     * A flag for whether to re-initialize illumination shader uniforms the next time the light is rendered.
     */
    _resetIlluminationUniforms: boolean;

    /**
     * A flag for whether to re-initialize coloration shader uniforms the next time the light is rendered.
     */
    _resetColorationUniforms: boolean;

    /** @todo: fill rest */
}

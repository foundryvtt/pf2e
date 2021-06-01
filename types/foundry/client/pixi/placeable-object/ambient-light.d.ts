declare class AmbientLight extends PlaceableObject<AmbientLightDocument> {
    /** @override */
    constructor(document: AmbientLightDocument);

    /**
     * A reference to the PointSource object which defines this light source area of effect
     */
    source: PointSource;

    /** @override */
    static get embeddedName(): 'AmbientLight';

    /** Test whether a specific AmbientLight source provides global illumination */
    get global(): boolean;

    /** @todo: fill rest */
}

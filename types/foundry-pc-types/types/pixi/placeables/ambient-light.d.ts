declare class AmbientLight extends PlaceableObject {
    constructor(data: PlaceableObjectData, scene: Scene);

    /**
     * A reference to the PointSource object which defines this light source area of effect
     */
    source: PointSource;

    /** @override */
    static get embeddedName(): 'AmbientLight';

    /** @todo: fill rest */
}

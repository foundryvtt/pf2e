/**
 * A SpriteMesh which visualizes a Token object in the PrimaryCanvasGroup.
 * @todo: fill in
 */
declare class TokenMesh extends SpriteMesh {
    data: PrimaryCanvasObjectData;

    get sort(): number;

    initialize(data: { sort?: number }): void;

    refresh(): void;
}

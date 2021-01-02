/**
 * The collection of Scene entities
 */
declare class Scenes extends Collection<Scene> {
    // @TODO: Declare
}

/**
 * The Scene entity
 */

declare interface SceneData extends BaseEntityData {
    tokens: TokenData[];
}

declare class Scene extends Entity {
    data: SceneData;
}

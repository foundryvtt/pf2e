/**
 * The collection of Scene entities
 */
declare class Scenes<ActorDataType extends ActorData> extends Collection<Scene<ActorDataType>> {
    // @TODO: Declare
}

/**
 * The Scene entity
 */

declare interface SceneData<ActorDataType extends ActorData = ActorData> extends BaseEntityData {
    tokens: TokenData<ActorDataType>[];
}

declare class Scene<ActorDataType extends ActorData = ActorData> extends Entity {
    data: SceneData<ActorDataType>;
}

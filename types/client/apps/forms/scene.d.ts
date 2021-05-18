/**
 * A Scene configuration sheet
 */
declare class SceneSheet extends BaseEntitySheet<Scene> {
    /**
     * Give each Scene Configuration sheet a unique css ID based on their entity ID
     */
    get id(): string;
}

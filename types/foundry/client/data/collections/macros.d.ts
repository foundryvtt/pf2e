/**
 * The Collection of Macro documents which exist within the active World.
 * This Collection is accessible within the Game object as game.macros.
 */
declare class Macros<TMacro extends Macro> extends WorldCollection<TMacro> {
    override get documentName(): "Macro";

    override get directory(): DocumentDirectory<TMacro>;

    override fromCompendium(document: TMacro): TMacro["_source"];
}

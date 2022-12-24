import { tupleHasValue } from "@util";
import { ChatContextFlag, CheckRollContextFlag } from "./data";

function isCheckContextFlag(flag?: ChatContextFlag): flag is CheckRollContextFlag {
    return !!flag && !tupleHasValue(["damage-roll", "spell-cast"], flag.type);
}

export { isCheckContextFlag };

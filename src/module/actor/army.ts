/*
// Array of expected statistics for populating sheet based on level, not finished obviously

function buildStats {
const level = 2
const statisticsArrays = {
    scoutingArray : [0, 7, 8, 9, 11, 12, 14, 15, 16, 18, 19, 21, 22, 23, 25, 26, 28, 29, 30, 32, 33],
    standardDCArray : [0, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35, 36, 38, 39, 40],
    acArray : [0, 16, 18, 19, 21, 22, 24, 25, 27, 28, 30, 31, 33, 34, 36, 37, 39, 40, 42, 43, 45],
    highsaveArray : [0, 10, 11, 12, 14, 15, 17, 18, 19, 21, 22, 24, 25, 26, 28, 29, 30, 32, 33, 35, 36],
    lowsaveArray : [0, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16, 18, 19, 20, 22, 23, 25, 26, 27, 29, 30],
    maxtacticsArray : [0, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6],
    };
const statistics = {
    scouting : scoutingArray[level],
    standardDC : standardDCArray[level],
    ac : acArray[level],
    highsave : highsaveArray[level],
    lowsave : lowsaveArray[level],
    maxtactics: maxtacticsArray[level],
    };
console.log(statistics);
};
*/

// ************************** //
//          IMPORTS           //
// ************************** //

import {
    ActorSystemData,
    ActorSystemSource,
    BaseActorSourcePF2e,
    GangUpCircumstance,
    FlatFootableCircumstance
} from "@actor/data/base";
import { ActorPF2e } from "@actor/base";
import { ItemType } from "@item/data";
import { ActorSizePF2e } from "@actor/data/size";
import { NPCStrike } from "@actor/npc";
import { Rarity } from "@module/data";
import { ActorAlliance } from "./types";
import { Alignment } from "./creature";

// ************************** //
//            TS              //
// ************************** //

    // ************************** //
    //           ARMY             //
    // ************************** //

    class ArmyPF2e extends ActorPF2e {

        override get allowedItemTypes(): (ItemType | "physical")[] {
            return [...super.allowedItemTypes, "physical", "action", "melee"];
        };

        get rarity(): Rarity {
            return this.system.traits.rarity;
        };

        override prepareBaseData(): void {
            super.prepareBaseData();
            this.system.traits.value = [];
            this.system.traits.size = new ActorSizePF2e({ value: "med" });
        };    
    }

    interface ArmyPF2e extends ActorPF2e {
        _source: ArmySource;
        system: ArmySystemData;
    }

    type ArmySource = BaseActorSourcePF2e<"army", ArmySystemSource>;
    interface ArmySystemSource extends ActorSystemSource {

        attributes: {

            immunities?: never;
            weaknesses?: never;
            resistances?: never;
            perception?: never;
            initiative?: never;
            shield?: never;
            flanking: {
                canFlank: boolean;
                canGangUp: GangUpCircumstance[];
                flankable: boolean;
                flatFootable: FlatFootableCircumstance;
            };
        
            hp: {
                value: number;
                max: number;
                temp: number;
                details: string;
            };
    
            ac: {
                value: number;
                details: string;
                magic: 0 | 1 | 2 | 3;
            };
    
            scouting: {
                value: number;
                details: string;
                darkvision: boolean;
            };
    
            strikes: {
                melee: {
                    bonus: number;
                    name: string;
                    magic: 0 | 1 | 2 | 3;
                };
                ranged: {
                    bonus: number;
                    name: string;
                    magic: 0 | 1 | 2 | 3;
                };
            };    
        };

        saves: {            
            maneuver: number;
            morale: number;
            details: string;
        };

        details: {
            level: { value: number; }
            alignment: Alignment;
            description: string;
            blurb: string;
            potions : 0 | 1 | 2 | 3;
            recruitmentDC: number;
            consumption: number;
        };

        conditions: {
            visibility : "clear" | "dim" | "dark";
            range : "engaged" | "near" | "distant";
            status : "OK" | "defeated" | "destroyed";
            position : "OK" | "outflanked" | "pinned";
            difficultterrain : boolean;
            wind : boolean;
            concealed : boolean;
            efficient : boolean;
            fortified : boolean;
            lost : boolean;
            mired : number;
            shaken : number; //1-4, 4 makes you routed
            routed : boolean;
            weary : number;
        }

        traits: {
            rarity: Rarity;
            armytype: "infantry" | "cavalry" | "skirmishers" | "siege";
            size: ActorSizePF2e;
            value: never[];
        };

        actions: NPCStrike[];

    }

    interface ArmySystemData extends ActorSystemData {
        attributes: {
            immunities: never[];
            weaknesses: never[];
            resistances: never[];
            flanking: {
                /** Whether the actor can flank at all */
                canFlank: boolean;
                /** Given the actor can flank, the conditions under which it can do so without an ally opposite the target */
                canGangUp: GangUpCircumstance[];
                /** Whether the actor can be flanked at all */
                flankable: boolean;
                /** Given the actor is flankable, whether it is flat-footed when flanked */
                flatFootable: FlatFootableCircumstance;
            };
        
        };
        details: {
            alliance: ActorAlliance;
            level: { value: number };
        };
        traits: {
            rarity: Rarity;
            armytype: "infantry" | "cavalry" | "skirmishers" | "siege";
            size: ActorSizePF2e;
            value: never[];
        };
    };
    
    export {ArmyPF2e, ArmySource };
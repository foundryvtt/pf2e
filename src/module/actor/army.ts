// ************************** 
//          IMPORTS
// ************************** 

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


// ************************** 
//            TS
// ************************** 

    // ************************** 
    //           ARMY
    // ************************** 

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

        saves: {            
            maneuver: {
                value: number;
            };
        morale: {
                value: number;
            };
        };

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
            };
    
            scouting: {
                value: number;
                details: string;
            };
    
            recruitmentDC: {
                value: number;
                details: string;
            };
    
            consumption: {
                value: number;
                details: string;
            };
    
            maneuver: {
                value: number;
                details: string;
            };
    
            morale: {
                value: number;
                details: string;
            };
    
            strikes: {
              melee: {
                    value: number;
                    details: string;
                };
    
                ranged: {
                    value: number;
                    details: string;
                };
            };    
        };

        details: {
            level: { value: number };
            description: string;
        };

        traits: {
            rarity: Rarity;
            type: "infantry" | "cavalry" | "skirmishers" | "siege";
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
            type: "infantry" | "cavalry" | "skirmishers" | "siege";
            size: ActorSizePF2e;
            value: never[];
        };
    };
    
    export {ArmyPF2e, ArmySource };
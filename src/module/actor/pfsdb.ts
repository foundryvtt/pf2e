import { Size } from '@item/data-definitions';
import ky from 'ky';
import {
    AbilityString,
    LabeledString,
    LabeledValue,
    Language,
    RawCharacterData,
    RawPathfinderSocietyData,
    ValuesList,
    ZeroToFour,
} from './data-definitions';

export interface PfsDbEntry {
    _id: string; // Concatenate player and character number
    pfsData: RawPathfinderSocietyData;
    characterData: {
        abilities: {
            strength: number;
            dexterity: number;
            constitution: number;
            intelligence: number;
            wisdom: number;
            charisma: number;
        };
        saves: {
            fortitude: ZeroToFour;
            reflex: ZeroToFour;
            will: ZeroToFour;
        };
        details: {
            keyability: { value: AbilityString };
            alignment: { value: string };
            class: { value: string };
            ancestry: { value: string };
            heritage: { value: string };
            deity: { value: string; image: string };
            background: { value: string };
            age: { value: string };
            height: { value: string };
            weight: { value: string };
            gender: { value: string };
            ethnicity: { value: string };
            nationality: { value: string };
            biography: { value: string; public?: string };
            xp: {
                value: number;
                min: number;
                max: number;
                pct: number;
            };
            level: {
                value: number;
                min: number;
            };
        };
        speed: {
            value: string;
            otherSpeeds: LabeledValue[];
            total: number;
        };
        size: Size;
        traits: ValuesList;
        senses: LabeledString[];
        languages: ValuesList<Language>;
    };
}

const dbUrl = 'http://localhost:9042';

export const ImportFromPfsDb = async (
    playerNumber: string,
    characterNumber: string,
    existingRawCharacterData: RawCharacterData,
): Promise<RawCharacterData> => {
    if (characterNumber === '' || playerNumber === '') {
        throw Error('PFS DB | No PFS identifier');
    }
    console.log(`PFS DB | Fetching ${playerNumber}-${characterNumber}`);
    // GET to DB using PFS ID
    try {
        const response = ky
            .get(`${dbUrl}/pathfinder/${playerNumber.toString()}${characterNumber.toString()}`)
            .json<PfsDbEntry>();
        console.log(`PFS DB | Retrieved ${JSON.stringify(await response, null, 1)}`);
        console.log(`PFS DB | Converting PFS DB Entry to RawCharacterData`);
        const newRawCharacterData = ConvertPfsDbEntryToRawCharacterData(await response, existingRawCharacterData);
        return newRawCharacterData;
    } catch (error) {
        console.log(`PFS DB | ${error}`);
    }
};
export const ExportIntoPfsDb = async (character: RawCharacterData): Promise<void> => {
    if (character.pfs.characterNumber === '' || character.pfs.playerNumber === '') {
        throw Error('PFS DB | No PFS identifier');
    }
    console.log(`PFS DB | Converting RawCharacterData to PFS DB Entry`);
    const pfsDataEntry = ConvertRawCharacterDataToPfsDbEntry(character);
    console.log(`PFS DB | Pushing data to DB`);
    console.log(`PFS DB | ${JSON.stringify(pfsDataEntry, null, 1)}`);
    // POST to DB using PFS Id and Data
    const response = ky.post(
        `${dbUrl}/pathfinder/${pfsDataEntry.pfsData.playerNumber.concat(pfsDataEntry.pfsData.characterNumber)}`,
        { json: pfsDataEntry },
    );
    if ((await response).status === 200 || (await (await response).status) === 201) {
        console.log(`PFS DB | Data Pushed. ${JSON.stringify(await response)}`);
    }
};
export const DeleteFromPfsDb = async (playerNumber: string, characterNumber: string): Promise<void> => {
    if (characterNumber === '' || playerNumber === '') {
        throw Error('PFS DB | No PFS identifier');
    }
    console.log(`PFS DB | Deleting ${playerNumber}-${characterNumber} from PFS DB.`);
    const response = ky.delete(`${dbUrl}/pathfinder/${playerNumber}${characterNumber}`);
    if ((await response).status === 200 || (await (await response).status) === 201) {
        console.log(`PFS DB | Data Deleted. ${(await response).status}`);
    }
};

const ConvertPfsDbEntryToRawCharacterData = (
    pfsDbEntry: PfsDbEntry,
    existingRawCharacterData: RawCharacterData,
): RawCharacterData => {
    const fortitude = existingRawCharacterData.saves.fortitude;
    fortitude.rank = pfsDbEntry.characterData.saves.fortitude;
    const reflex = existingRawCharacterData.saves.reflex;
    reflex.rank = pfsDbEntry.characterData.saves.reflex;
    const will = existingRawCharacterData.saves.will;
    will.rank = pfsDbEntry.characterData.saves.will;

    const mergedData: RawCharacterData = {
        ...existingRawCharacterData,
        pfs: pfsDbEntry.pfsData,
        abilities: {
            str: { ...existingRawCharacterData.abilities.str, value: pfsDbEntry.characterData.abilities.strength },
            dex: { ...existingRawCharacterData.abilities.dex, value: pfsDbEntry.characterData.abilities.dexterity },
            con: {
                ...existingRawCharacterData.abilities.con,
                value: pfsDbEntry.characterData.abilities.constitution,
            },
            int: {
                ...existingRawCharacterData.abilities.int,
                value: pfsDbEntry.characterData.abilities.intelligence,
            },
            wis: { ...existingRawCharacterData.abilities.wis, value: pfsDbEntry.characterData.abilities.wisdom },
            cha: { ...existingRawCharacterData.abilities.cha, value: pfsDbEntry.characterData.abilities.charisma },
        },
        details: { ...pfsDbEntry.characterData.details },
        saves: { fortitude, reflex, will },
        attributes: {
            ...existingRawCharacterData.attributes,
            speed: { ...existingRawCharacterData.attributes.speed, ...pfsDbEntry.characterData.speed },
        },
        traits: {
            ...existingRawCharacterData.traits,
            size: { value: pfsDbEntry.characterData.size },
            senses: pfsDbEntry.characterData.senses,
            traits: pfsDbEntry.characterData.traits,
            languages: pfsDbEntry.characterData.languages,
        },
    };
    return mergedData;
};

const ConvertRawCharacterDataToPfsDbEntry = (RawCharacterData: RawCharacterData): PfsDbEntry => {
    return {
        _id: `${RawCharacterData.pfs.playerNumber}${RawCharacterData.pfs.characterNumber}`,
        pfsData: RawCharacterData.pfs,
        characterData: {
            abilities: {
                strength: RawCharacterData.abilities.str.value,
                dexterity: RawCharacterData.abilities.dex.value,
                constitution: RawCharacterData.abilities.con.value,
                intelligence: RawCharacterData.abilities.int.value,
                wisdom: RawCharacterData.abilities.wis.value,
                charisma: RawCharacterData.abilities.cha.value,
            },
            saves: {
                fortitude: RawCharacterData.saves.fortitude.rank,
                reflex: RawCharacterData.saves.reflex.rank,
                will: RawCharacterData.saves.will.rank,
            },
            details: RawCharacterData.details,
            speed: RawCharacterData.attributes.speed,
            size: RawCharacterData.traits.size.value,
            traits: RawCharacterData.traits.traits,
            senses: RawCharacterData.traits.senses,
            languages: RawCharacterData.traits.languages,
        },
    };
};

import { MigrationBase } from "../base.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { objectHasKey } from "@util";

export class Migration601SplitEffectCompendia extends MigrationBase {
    static override version = 0.601;

    static effectLocations = {
        QuZ5frBMJF3gi7RY: "consumable-effects",
        "7z1iY4AaNEAIKuAU": "consumable-effects",
        "1mKjaWC65KWPuFR4": "consumable-effects",
        mi4Md1fB2XThCand: "consumable-effects",
        R106i7WCXvHLGMTu: "consumable-effects",
        kkDbalYEavzRpYlp: "consumable-effects",
        qVKrrKpTghgMIuGH: "consumable-effects",
        HeRHBo2NaKy5IxhU: "consumable-effects",
        tTBJ33UGtzXjWOJp: "consumable-effects",
        xVAdPzFaSvJXPMKv: "consumable-effects",
        fYjvLx9DHIdCHdDx: "consumable-effects",
        kwD0wuW5Ndkc9YXB: "consumable-effects",
        fIpzDpuwLdIS4tW5: "consumable-effects",
        "1ouUo8lLK6H79Rqh": "consumable-effects",
        xFQRiVU6h8EA6Lw9: "consumable-effects",
        MI5OCkF9IXmD2lPF: "consumable-effects",
        S4MZzALqFoXJsr6o: "consumable-effects",
        wFF0SZs1Hcf87Kk1: "consumable-effects",
        "2C1HuKDQDGFZuv7l": "consumable-effects",
        q1EhQ716bPSgJVnC: "consumable-effects",
        eh7EqmDBDW30ShCu: "consumable-effects",
        wTZnKkT0K4Tdy8mD: "consumable-effects",
        Cxa7MdgMCUoMqbKm: "consumable-effects",
        PeuUz7JaabCgl6Yh: "consumable-effects",
        lNWACCNe9RYgaFxb: "consumable-effects",
        j9zVZwRBVAcnpEkE: "consumable-effects",
        qit1mLbJUyRTYcPU: "consumable-effects",
        jaBMZKdoywOTrQvP: "consumable-effects",
        RT1BxXrbbGgk40Ti: "consumable-effects",
        ztxW3lBPRcesF7wK: "consumable-effects",
        "7vCenP9j6FuHRv5C": "consumable-effects",
        "7UL8belWmo7U5YGM": "consumable-effects",
        bcxVvIbuZWOvsKcA: "consumable-effects",
        "4tepFOJLhZSelPoa": "consumable-effects",
        qwoLV4awdezlEJ60: "consumable-effects",
        GBBjw61g4ekJymT0: "consumable-effects",
        vFOr2JAJxiVvvn2E: "consumable-effects",
        BV8RPntjc9FUzD3g: "consumable-effects",
        kgotU0sFmtAHYySB: "consumable-effects",
        VCypzSu659eC6jNi: "consumable-effects",
        wyLEew86nhNUXASu: "consumable-effects",
        Wa4317cqU4lJ8vAQ: "consumable-effects",
        Z9oPh462q82IYIZ6: "consumable-effects",
        EpB7yJPEuG6ez4z3: "consumable-effects",
        PpLxndUSgzgs6dd0: "consumable-effects",
        lPRuIRbu0rHBkoKY: "consumable-effects",
        Yxssrnh9UZJAM0V7: "consumable-effects",
        "9MeHc072G4L8AJkp": "consumable-effects",
        xLilBqqf34ZJYO9i: "consumable-effects",
        "1l139A2Qik4lBHKO": "consumable-effects",
        "2PNo8u4wxSbz5WEs": "consumable-effects",
        fUrZ4xcMJz0CfTyG: "consumable-effects",
        "6A8jsLR7upLGuRiv": "consumable-effects",
        Zdh2uO1vVYJmaqld: "consumable-effects",
        Mf9EBLhYmZerf0nS: "consumable-effects",
        ModBoFdCi7YQU4gP: "consumable-effects",
        W3xQBLj5hLOtb6Tj: "consumable-effects",
        "2Bds6d4UGQZqYSZM": "consumable-effects",
        "6PNLBIdlqqWNCFMy": "consumable-effects",
        "988f6NpOo4YzFzIr": "consumable-effects",
        VPtsrpbP0AE642al: "consumable-effects",
        MCny5ohCGf09a7Wl: "consumable-effects",
        RRusoN3HEGnDO1Dg: "consumable-effects",
        thOpQunbQr77XWdF: "consumable-effects",
        "9keegq0GdS1eSrNr": "consumable-effects",
        jw6Tr9FbErjLAFLQ: "consumable-effects",
        "5xgapIXn5DwbXHKh": "consumable-effects",
        t7VUJHSUT6bkVUjg: "consumable-effects",
        yrbz0rZzp8aZEqbv: "consumable-effects",
        "16tOZk4qy329s2aK": "consumable-effects",
        zd85Ny1RS46OL0TD: "consumable-effects",
        oAewXfq9c0ecaSfw: "consumable-effects",
        dpIrjd1UPY7EnWUD: "consumable-effects",
        "9FfFhu2kl2wMTsiI": "consumable-effects",
        v5Ht1V4MZvRKRBjL: "consumable-effects",
        TkRuKKYyPHTGPfgf: "consumable-effects",
        XrlChFETfe8avLsX: "consumable-effects",
        qzRcSQ0HTTp58hV2: "consumable-effects",
        TsWUTODTVi487SEz: "consumable-effects",
        "5Gof60StUppR2Xn9": "consumable-effects",
        mG6S6zm6hxaF7Tla: "consumable-effects",
        zlSNbMDIlTOpcO8R: "consumable-effects",
        b9DTIJyBT8kvIBpj: "consumable-effects",
        PEPOd38VfVzQMKG5: "consumable-effects",
        "1xHHvQlW4pRR89qj": "consumable-effects",
        AMhUb42NAJ1aisZp: "consumable-effects",
        kwOtHtmlH69ctK0O: "consumable-effects",
        VrYfR2WuyA15zFhq: "consumable-effects",
        OAN5Fj21PJPhIqRU: "consumable-effects",
        e6dXfbKzv5sNr1zh: "consumable-effects",
        Hnt3Trd7TiFICB06: "consumable-effects",
        p2aGtovaY1feytws: "equipment-effects",
        yvabfuAO74pvH8hh: "equipment-effects",
        etJW0w4CiSFgMrWP: "equipment-effects",
        vOU4Yv2MyAfYBbmF: "equipment-effects",
        FbFl95WRpzrrijh3: "equipment-effects",
        iK6JeCsZwm5Vakks: "equipment-effects",
        P7Y7pO2ulZ5wBgxU: "equipment-effects",
        cg5qyeMJUh6b4fta: "equipment-effects",
        fbSFwwp60AuDDKpK: "equipment-effects",
        "88kqcDmsoAEddzUt": "equipment-effects",
        lLP56tbG689TNKW5: "equipment-effects",
        PeiuJ951kkBPTCSM: "equipment-effects",
        G0lG7IIZnCZtYi6v: "equipment-effects",
        gDefAEEMXVVZgqXH: "equipment-effects",
        uXEp1rPU5fY4OiBf: "equipment-effects",
        Uadsb25G18pKdZ2e: "equipment-effects",
        viCX9fZzTWGuoO85: "equipment-effects",
        eeGWTG9ZAha4IIOY: "equipment-effects",
        ioGzmVSmMGXWWBYb: "equipment-effects",
        pAMyEbJzWBoYoGhs: "equipment-effects",
        "7dLsA9PAb5ij7Bc6": "equipment-effects",
        NE7Fm5YnUhD4ySX3: "equipment-effects",
        "8ersuvNJXX00XaIQ": "equipment-effects",
        EpNflrkmWzQ0lEb4: "equipment-effects",
        iEkH8BKLMUa2wxLX: "equipment-effects",
        bP40jr6wE6MCsRvY: "equipment-effects",
        eSIYyxi6uTKiP6W5: "equipment-effects",
        E4B02mJmNexQLa8F: "equipment-effects",
        "3O5lvuX4VHqtpCkU": "equipment-effects",
        ah41XCrV4LFsVyzl: "equipment-effects",
        W3BCLbX6j1IqL0uB: "equipment-effects",
        zqKzWGLODgIvtiKf: "equipment-effects",
        lBMhT2W2raYMa8JS: "equipment-effects",
        "5uK3fmGlfJrbWQz4": "equipment-effects",
        i0tm2ZHekp7rGGR3: "equipment-effects",
        Zb8RYgmzCI6fQE0o: "equipment-effects",
        QapoFh0tbUgMwSIB: "equipment-effects",
        UlalLihKzDxcOdXL: "equipment-effects",
        lO95TwgihBdTilAB: "equipment-effects",
        "9PASRixhNM0ogqmG": "equipment-effects",
        "7MgpgF8tOXOiDEwv": "equipment-effects",
        "1S51uIRb9bnZtpFU": "equipment-effects",
        "1nCwQErK6hpkNvfw": "feat-effects",
        "5IGz4iheaiUWm5KR": "feat-effects",
        uFYvW3kFP9iyNfVX: "feat-effects",
        CgxYa0lrLUjS2ZhI: "feat-effects",
        nwkYZs6YwXYAJ4ps: "feat-effects",
        qUowHpn79Dpt1hVn: "feat-effects",
        RozqjLocahvQWERr: "feat-effects",
        tPKXLtDJ3bzJcXlv: "feat-effects",
        gYpy9XBPScIlY93p: "feat-effects",
        Im5JBInybWFbHEYS: "feat-effects",
        BCyGDKcplkJiSAKJ: "feat-effects",
        PMHwCrnh9W4sMu5b: "feat-effects",
        pf9yvKNg6jZLrE30: "feat-effects",
        eeAlh6edygcZIz9c: "feat-effects",
        b2kWJuCPj1rDMdwz: "feat-effects",
        UQ7vZgmfK0VSFS8A: "feature-effects",
        s1tulrmW6teTFjVd: "feature-effects",
        aKRo5TIhUtu0kyEr: "feature-effects",
        yfbP64r4a9e5oyli: "feature-effects",
        n1vhmOd7aNiuR3nk: "feature-effects",
        FNTTeJHiK6iOjrSq: "feature-effects",
        "3gGBZHcUFsHLJeQH": "feature-effects",
        rJpkKaPRGaH0pLse: "feature-effects",
        "9AUcoY48H5LrVZiF": "feature-effects",
        KVbS7AbhQdeuA0J6: "feature-effects",
        "6fb15XuSV4TNuVAT": "feature-effects",
        vguxP8ukwVTWWWaA: "feature-effects",
        SVGW8CLKwixFlnTv: "feature-effects",
        ruRAfGJnik7lRavk: "feature-effects",
        uBJsxCzNhje8m8jj: "feature-effects",
        "7BFd8A9HFrmg6vwL": "feature-effects",
        z3uyCMBddrPK5umr: "feature-effects",
        Nv70aqcQgCBpDYp8: "feature-effects",
        OqH6IaeOwRWkGPrk: "feature-effects",
        Lb4q2bBAgxamtix5: "feature-effects",
        Gqy7K6FnbLtwGpud: "spell-effects",
        "41WThj17MZBXTO2X": "spell-effects",
        sPCWrhUHqlbGhYSD: "spell-effects",
        "3qHKBDF7lrHw8jFK": "spell-effects",
        l9HRQggofFGIxEse: "spell-effects",
        beReeFroAx24hj83: "spell-effects",
        qkwb5DD3zmKwvbk0: "spell-effects",
        GnWkI3T3LYRlm3X8: "spell-effects",
        dWbg2gACxMkSnZag: "spell-effects",
        Jemq5UknGdMO7b73: "spell-effects",
        LXf1Cqi1zyo4DaLv: "spell-effects",
    };

    override async updateItem(item: ItemSourcePF2e): Promise<void> {
        if (typeof item.system.description.value === "string") {
            item.system.description.value = item.system.description.value.replace(
                /(@Compendium\[pf2e\.)(spell-effects)(\.)([a-zA-Z0-9]{16})(\]{.*?})/g,
                (_full, first, _replace, dot, itemId, rest): string => {
                    const packName = objectHasKey(Migration601SplitEffectCompendia.effectLocations, itemId)
                        ? Migration601SplitEffectCompendia.effectLocations[itemId]
                        : "??";
                    return first + packName + dot + itemId + rest;
                }
            );
        }
        if (typeof item.flags.core?.sourceId === "string") {
            item.flags.core.sourceId = item.flags.core.sourceId.replace(
                /(Compendium\.pf2e\.)(spell-effects)(\.)([a-zA-Z0-9]{16})/g,
                (_full, first, _replace, dot, itemId): string => {
                    const packName = objectHasKey(Migration601SplitEffectCompendia.effectLocations, itemId)
                        ? Migration601SplitEffectCompendia.effectLocations[itemId]
                        : "??";
                    return first + packName + dot + itemId;
                }
            ) as ItemUUID;
        }
    }

    override async migrate(): Promise<void> {
        for (const macro of game.macros) {
            macro._source.command = macro._source.command.replace(
                /(Compendium\.pf2e\.)(spell-effects)(\.)([a-zA-Z0-9]{16})/g,
                (_full, first, _replace, dot, itemId): string => {
                    const packName = objectHasKey(Migration601SplitEffectCompendia.effectLocations, itemId)
                        ? Migration601SplitEffectCompendia.effectLocations[itemId]
                        : "??";
                    return first + packName + dot + itemId;
                }
            );
        }
    }
}

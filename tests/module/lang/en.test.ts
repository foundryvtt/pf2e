import json from "../../../static/lang/en.json";

describe("Load json file", () => {
    test("it should be a valid JSON object", async () => {
        const input = typeof json;

        const output = "object";

        expect(input).toEqual(output);
    });

    test("it should contain valid translation keys", async () => {
        const input = json["PF2E"]["condition"]["blinded"]["summary"];
        // EQUAL TO:  const input = json.PF2E.condition.blinded.summary;

        const output = "You're unable to see.";

        expect(input).toEqual(output);
    });
});

// @ts-check
import json from "eslint-plugin-json";

export default [
    { files: ["static/lang/*.json", "static/system.json", "static/template.json"] },
    json.configs["recommended"],
];

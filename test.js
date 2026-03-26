import cocochex from "./dist/index.js";

let data = {
    a: 1,
    b: "hello",
    c: [1, 2, 3, false],
    d: {
        x: 10,
        y: 20,
        z: [null, 0, 2]
    },
}

let result = cocochex(data, {
    a: "number",
    b: "string",
    c: ["number", "boolean"],
    d: {
        x: "number",
        y: 20,
        z: [0, v => v || "default"]
    },
});

console.log(result);
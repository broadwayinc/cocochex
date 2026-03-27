import cocochex from "./dist/index.js";

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function runTest(name, fn) {
    try {
        fn();
        passed += 1;
        console.log(`PASS ${name}`);
    }
    catch (err) {
        failed += 1;
        console.log(`FAIL ${name}`);
        console.log(`  ${err?.message || String(err)}`);
    }
}

function expectThrow(fn, expectedMessagePart) {
    let thrown = false;

    try {
        fn();
    }
    catch (err) {
        thrown = true;
        const message = err?.message || String(err);
        if (expectedMessagePart) {
            assert(
                message.includes(expectedMessagePart),
                `Expected error to include "${expectedMessagePart}", got "${message}"`
            );
        }
    }

    assert(thrown, "Expected function to throw");
}

runTest("[type] rejects scalar input", () => {
    expectThrow(
        () => cocochex({ check: "1" }, { check: ["string"] }),
        "Expected a list"
    );
});

runTest("[type] accepts list of matching type", () => {
    const result = cocochex({ check: ["1", "2"] }, { check: ["string"] });
    assert(Array.isArray(result.check), "Expected check to be an array");
    assert(result.check.length === 2, "Expected two items in check");
});

runTest("[type] rejects list with wrong item type", () => {
    expectThrow(
        () => cocochex({ check: ["1", 2] }, { check: ["string"] }),
        "Expected a list of Type <string>"
    );
});

runTest("[type1, type2] accepts scalar matching one option", () => {
    const result = cocochex({ check: 1 }, { check: ["string", "number"] });
    assert(result.check === 1, "Expected scalar number to pass unchanged");
});

runTest("[type1, type2] accepts array with per-item union", () => {
    const result = cocochex({ check: [1, "2"] }, { check: ["string", "number"] });
    assert(result.check[0] === 1, "Expected first item to be 1");
    assert(result.check[1] === "2", "Expected second item to be string '2'");
});

runTest("[type1, type2] rejects array item that matches no option", () => {
    expectThrow(
        () => cocochex({ check: [1, "2", true] }, { check: ["string", "number"] }),
        "allowed types or values are: Type<string>, Type<number>"
    );
});

runTest("function schema transforms scalar value", () => {
    const result = cocochex({ check: 1 }, { check: v => v + 1 });
    assert(result.check === 2, "Expected check to be incremented to 2");
});

runTest("[fn] does not set default for missing key", () => {
    const result = cocochex({}, { check: [() => "should not be used as default"] });
    assert(typeof result.check === "undefined", "Expected missing key to remain undefined");
});

runTest("[fn] rejects scalar because it expects a list", () => {
    expectThrow(
        () => cocochex({ check: 1 }, { check: [v => `given value is ${v}`] }),
        "Expected a list"
    );
});

runTest("[fn] applies transform to all list items", () => {
    const result = cocochex(
        { check: [1, "Hello", false] },
        { check: [v => `given value is ${v}`] }
    );
    assert(
        JSON.stringify(result.check) === JSON.stringify([
            "given value is 1",
            "given value is Hello",
            "given value is false"
        ]),
        "Expected transformed list items"
    );
});

runTest("[type, fn] uses function as fallback for non-matching scalar", () => {
    const result = cocochex(
        { check: 1 },
        { check: ["string", v => `no match. given value is ${v}`] }
    );
    assert(result.check === "no match. given value is 1", "Expected fallback function output");
});

runTest("[type, fn] preserves matching scalar type", () => {
    const result = cocochex(
        { check: "Hello" },
        { check: ["string", v => `no match. given value is ${v}`] }
    );
    assert(result.check === "Hello", "Expected matching string to remain unchanged");
});

runTest("[type, fn] applies per-item union rules for arrays", () => {
    const result = cocochex(
        { check: [1, "Hello", false] },
        { check: ["string", v => `no match. given value is ${v}`] }
    );
    assert(
        JSON.stringify(result.check) === JSON.stringify([
            "no match. given value is 1",
            "Hello",
            "no match. given value is false"
        ]),
        "Expected per-item union behavior"
    );
});

runTest("[type, fn] sets default for missing key", () => {
    const result = cocochex(
        {},
        { check: ["string", v => `setting default value, ignored given value is ${v}`] }
    );
    assert(
        result.check === "setting default value, ignored given value is undefined",
        "Expected default function to run for missing key"
    );
});

runTest("required key check runs before default assignment", () => {
    expectThrow(
        () => cocochex({}, { check: ["string", () => "default"] }, ["check"]),
        "Key \"check\" is required"
    );
});

runTest("nested required key path uses bracket notation", () => {
    expectThrow(
        () => cocochex({ user: { profile: {} } }, { user: { profile: { email: "string" } } }, ["user[profile][email]"]),
        "Key \"user[profile][email]\" is required"
    );
});

runTest("object schema rejects non-plain object", () => {
    expectThrow(
        () => cocochex([], { a: "number" }),
        "Data schema does not match"
    );
});

runTest("exact value matching passes and fails correctly", () => {
    const pass = cocochex({ status: "active" }, { status: "active" });
    assert(pass.status === "active", "Expected exact value match to pass");

    expectThrow(
        () => cocochex({ status: "inactive" }, { status: "active" }),
        "allowed type or value"
    );
});

runTest("undefined struct throws argument required error", () => {
    expectThrow(
        () => cocochex({ x: 1 }, undefined),
        "Argument \"struct\" is required"
    );
});

console.log("\nSummary");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
    process.exitCode = 1;
}

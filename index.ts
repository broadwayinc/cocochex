declare const _COCOCHEX_VERSION__: string;

const COCOCHEX_VERSION =
    typeof _COCOCHEX_VERSION__ === "string" ? _COCOCHEX_VERSION__ : "0.0.0";

export default function cocochex(params: any, struct: any, required: string[] = [], _parentKey: string | null = null) {
    const typeTokens = ['string', 'number', 'boolean', 'object', 'array', 'function', 'null', 'undefined'];

    function isPlainObject(value: any) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function isSchemaObject(value: any) {
        return isPlainObject(value);
    }

    function isSchemaList(value: any) {
        return Array.isArray(value);
    }

    function isTypeToken(value: any) {
        return typeof value === 'string' && typeTokens.indexOf(value) !== -1;
    }

    function getValueType(value: any) {
        if (Array.isArray(value)) {
            return 'array';
        }

        if (value === null) {
            return 'null';
        }

        return typeof value;
    }

    function stringifyValue(value: any) {
        try {
            return JSON.stringify(value);
        }
        catch (err) {
            return String(value);
        }
    }

    function describeSchema(schema: any): string {
        if (isTypeToken(schema)) {
            return `Type<${schema}>`;
        }

        if (typeof schema === 'function') {
            return 'custom validator';
        }

        try {
            return JSON.stringify(schema, (_key, value) => {
                if (typeof value === 'function') {
                    return 'custom validator';
                }
                return value;
            });
        }
        catch (err) {
            return String(schema);
        }
    }

    function matchesType(value: any, schema: string) {
        if (schema === 'array') {
            return Array.isArray(value);
        }

        if (schema === 'object') {
            return isPlainObject(value);
        }

        if (schema === 'null') {
            return value === null;
        }

        if (schema === 'undefined') {
            return typeof value === 'undefined';
        }

        return typeof value === schema;
    }

    function getKeyPath(key: string) {
        return _parentKey === null ? key : `${_parentKey}[${key}]`;
    }

    if (typeof struct === 'undefined') {
        throw new Error('Argument "struct" is required.');
    }

    if (typeof struct === 'function') {
        return struct(params);
    }

    if (isSchemaObject(struct)) {
        if (!isPlainObject(params)) {
            throw new Error('Data schema does not match:\n' + JSON.stringify(params, null, 2));
        }

        for (let key of Object.keys(struct)) {
            const keyPath = getKeyPath(key);

            if (Object.prototype.hasOwnProperty.call(params, key)) {
                params[key] = cocochex(params[key], struct[key], required, keyPath);
            }
            else {
                if (required.indexOf(keyPath) !== -1) {
                    throw new Error(`Key "${keyPath}" is required.`);
                }

                const schema = struct[key];
                if (isSchemaList(schema) && schema.length > 1 && typeof schema[schema.length - 1] === 'function') {
                    params[key] = schema[schema.length - 1]();
                }
            }
        }

        return params;
    }

    if (isSchemaList(struct)) {
        let passed = false;

        if (struct.length === 1 && !isSchemaList(struct[0]) && !isSchemaObject(struct[0])) {
            const itemSchema = struct[0];

            if (!Array.isArray(params)) {
                throw new Error(`Type <${getValueType(params)}> is invalid in "${_parentKey}". Expected a list.`);
            }

            for (let index = 0; index < params.length; index++) {
                const item = params[index];

                if (isTypeToken(itemSchema)) {
                    if (!matchesType(item, itemSchema)) {
                        throw new Error(`Type <${getValueType(item)}> is invalid in "${_parentKey}". Expected a list of Type <${itemSchema}>.`);
                    }
                }
                else if (typeof itemSchema === 'function') {
                    params[index] = itemSchema(item);
                }
                else if (item !== itemSchema) {
                    throw new Error(`Value ${stringifyValue(item)} is invalid in "${_parentKey}". Expected a list of ${stringifyValue(itemSchema)}.`);
                }
            }

            passed = true;
        }
        else {
            // Per-item union: if params is an array and no schema item is itself a list
            // or the 'array' type token, validate each element against the union of schemas.
            // Otherwise fall back to value-level union (the whole value must match one schema).
            const doPerItemUnion = Array.isArray(params) &&
                struct.every((s: any) => !isSchemaList(s) && s !== 'array');

            if (doPerItemUnion) {
                for (let index = 0; index < params.length; index++) {
                    let itemPassed = false;
                    let lastItemFunctionError = '';

                    for (let schema of struct) {
                        try {
                            params[index] = cocochex(params[index], schema, required, _parentKey);
                            itemPassed = true;
                            break;
                        }
                        catch (err: any) {
                            if (typeof schema === 'function') {
                                lastItemFunctionError = err?.message || String(err);
                            }
                        }
                    }

                    if (!itemPassed && lastItemFunctionError) {
                        throw new Error(lastItemFunctionError);
                    }

                    if (!itemPassed) {
                        const allowed = struct.map(describeSchema).join(', ');
                        throw new Error(`${stringifyValue(params[index])} is invalid in "${_parentKey}". allowed types or values are: ${allowed}.`);
                    }
                }
                passed = true;
            }
            else {
                let lastFunctionError = '';

                for (let schema of struct) {
                    try {
                        params = cocochex(params, schema, required, _parentKey);
                        passed = true;
                        break;
                    }
                    catch (err: any) {
                        if (typeof schema === 'function') {
                            lastFunctionError = err?.message || String(err);
                        }
                    }
                }

                if (!passed && lastFunctionError) {
                    throw new Error(lastFunctionError);
                }
            }
        }

        if (!passed) {
            const allowed = struct.map(describeSchema).join(', ');
            throw new Error(`${stringifyValue(params)} is invalid in "${_parentKey}". allowed types or values are: ${allowed}.`);
        }

        return params;
    }

    if ((isTypeToken(struct) && matchesType(params, struct)) || params === struct) {
        return params;
    }

    throw new Error(`${stringifyValue(params)} is invalid in "${_parentKey}". allowed type or value is: ${describeSchema(struct)}.`);
}
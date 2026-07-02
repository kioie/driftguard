import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HTTP_METHODS,
  normalizeOpenApiSpec,
  openApiSpecToSchema,
  pickParameters,
  resolveRef,
  resolveSchema,
} from "./openapi-normalize.js";

const minimalOas3 = {
  openapi: "3.0.0",
  paths: {
    "/pets": {
      get: {
        operationId: "listPets",
        parameters: [{ name: "limit", in: "query", schema: { type: "integer" }, required: true }],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { type: "array", items: { type: "object", properties: { id: { type: "string" } } } },
              },
            },
          },
        },
      },
    },
  },
};

describe("resolveRef", () => {
  it("resolves local component refs", () => {
    const spec = { components: { schemas: { Pet: { type: "object" } } } };
    assert.deepEqual(resolveRef(spec, "#/components/schemas/Pet"), { type: "object" });
  });

  it("returns undefined for external refs", () => {
    assert.equal(resolveRef({}, "http://example.com"), undefined);
  });
});

describe("resolveSchema", () => {
  it("follows $ref in schema objects", () => {
    const spec = { components: { schemas: { X: { type: "string" } } } };
    const schema = resolveSchema(spec, { $ref: "#/components/schemas/X" });
    assert.equal(schema.type, "string");
  });
});

describe("pickParameters", () => {
  it("builds required query parameter object schema", () => {
    const schema = pickParameters(minimalOas3, minimalOas3.paths["/pets"].get);
    assert.equal(schema.type, "object");
    assert.deepEqual(schema.required, ["limit"]);
    const props = schema.properties as Record<string, unknown> | undefined;
    assert.ok(props?.limit);
  });
});

describe("normalizeOpenApiSpec", () => {
  it("indexes operations by verb and path", () => {
    const ops = normalizeOpenApiSpec(minimalOas3);
    assert.ok(ops["GET /pets"]);
    assert.equal(ops["GET /pets"]?.operationId, "listPets");
    assert.ok(ops["GET /pets"]?.responseSchema);
  });

  it("normalizes an Xquik OpenAPI 3.1 search operation", () => {
    const ops = normalizeOpenApiSpec({
      openapi: "3.1.0",
      info: { title: "Xquik API", version: "1.0" },
      security: [{ apiKey: [] }],
      components: {
        securitySchemes: {
          apiKey: {
            type: "apiKey",
            name: "X-API-Key",
            in: "header",
          },
        },
      },
      paths: {
        "/api/v1/x/tweets/search": {
          get: {
            operationId: "searchTweets",
            parameters: [
              { name: "q", in: "query", required: true, schema: { type: "string" } },
              { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
            ],
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              text: { type: "string" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const op = ops["GET /api/v1/x/tweets/search"];
    const properties = op?.parameters.properties as Record<string, unknown> | undefined;

    assert.equal(op?.operationId, "searchTweets");
    assert.deepEqual(op?.parameters.required, ["q"]);
    assert.ok(properties?.q);
    assert.ok(properties?.limit);
    assert.ok(op?.responses["200"]);
    assert.equal(op?.responseSchema.type, "object");
    assert.equal(op?.security.type, "array");
  });

  it("throws on non-object spec", () => {
    assert.throws(() => normalizeOpenApiSpec(null), /JSON object/);
  });

  it("returns empty map when paths missing", () => {
    assert.deepEqual(normalizeOpenApiSpec({ openapi: "3.0.0" }), {});
  });
});

describe("openApiSpecToSchema", () => {
  it("wraps normalized operations", () => {
    const schema = openApiSpecToSchema(minimalOas3) as { operations: Record<string, unknown> };
    assert.ok(schema.operations["GET /pets"]);
  });
});

describe("HTTP_METHODS", () => {
  it("includes standard verbs", () => {
    assert.ok(HTTP_METHODS.has("get"));
    assert.ok(HTTP_METHODS.has("post"));
  });
});

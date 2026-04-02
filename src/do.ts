import { RestStagingDO } from "@bio-mcp/shared/staging/rest-staging-do";
import type { SchemaHints } from "@bio-mcp/shared/staging/schema-inference";

export class Icd10CodesDataDO extends RestStagingDO {
    protected getSchemaHints(data: unknown): SchemaHints | undefined {
        if (!data || typeof data !== "object") return undefined;

        if (Array.isArray(data)) {
            const sample = data[0];
            if (sample && typeof sample === "object") {
                // ICD-10-CM code results (normalized from NLM array response)
                if ("code" in sample && "name" in sample) {
                    return {
                        tableName: "codes",
                        indexes: ["code", "name"],
                    };
                }
            }
        }

        return undefined;
    }
}

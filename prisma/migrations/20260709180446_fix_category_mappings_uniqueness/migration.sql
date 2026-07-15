
-- Drop the existing unique constraint
DROP INDEX IF EXISTS "category_mappings_event_type_product_line_tenant_id_key";

--One default mapping per event type (productLine IS NULL AND tenantId IS NULL)
CREATE UNIQUE INDEX "category_mappings_default_unique"
ON "category_mappings" ("event_type")
WHERE "product_line" IS NULL AND "tenant_id" IS NULL;

--One product-line mapping per eventType+productLine (tenantId IS NULL)
CREATE UNIQUE INDEX "category_mappings_product_line_unique"
ON "category_mappings" ("event_type", "product_line")
WHERE "tenant_id" IS NULL AND "product_line" IS NOT NULL;

--One tenant mapping per eventType+tenantId (productLine irrelevant at this level)
CREATE UNIQUE INDEX "category_mappings_tenant_unique"
ON "category_mappings" ("event_type", "tenant_id")
WHERE "tenant_id" IS NOT NULL;
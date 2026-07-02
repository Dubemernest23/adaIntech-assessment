-- CreateTable
CREATE TABLE "category_mappings" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "product_line" TEXT,
    "tenant_id" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "category_mappings_tenant_id_idx" ON "category_mappings"("tenant_id");

-- CreateIndex
CREATE INDEX "category_mappings_product_line_idx" ON "category_mappings"("product_line");

-- CreateIndex
CREATE UNIQUE INDEX "category_mappings_event_type_product_line_tenant_id_key" ON "category_mappings"("event_type", "product_line", "tenant_id");

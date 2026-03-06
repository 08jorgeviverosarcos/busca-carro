-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourcePortal" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "priceCop" BIGINT,
    "mileage" INTEGER,
    "fuelType" TEXT,
    "transmission" TEXT,
    "city" TEXT,
    "department" TEXT,
    "images" TEXT[],
    "description" TEXT,
    "urlOriginal" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "filtersJson" JSONB NOT NULL,
    "lastSentAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeLog" (
    "id" TEXT NOT NULL,
    "portal" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "countNew" INTEGER NOT NULL DEFAULT 0,
    "countUpdated" INTEGER NOT NULL DEFAULT 0,
    "countDiscarded" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Listing_brand_model_year_idx" ON "Listing"("brand", "model", "year");

-- CreateIndex
CREATE INDEX "Listing_city_idx" ON "Listing"("city");

-- CreateIndex
CREATE INDEX "Listing_priceCop_idx" ON "Listing"("priceCop");

-- CreateIndex
CREATE INDEX "Listing_isActive_updatedAt_idx" ON "Listing"("isActive", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_sourcePortal_externalId_key" ON "Listing"("sourcePortal", "externalId");

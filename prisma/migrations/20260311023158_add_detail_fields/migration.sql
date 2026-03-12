-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "blindado" BOOLEAN,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "condition" TEXT,
ADD COLUMN     "detailScrapedAt" TIMESTAMP(3),
ADD COLUMN     "engineSize" INTEGER,
ADD COLUMN     "financiacion" BOOLEAN,
ADD COLUMN     "permuta" BOOLEAN,
ADD COLUMN     "plateDigit" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "viewCount" INTEGER;

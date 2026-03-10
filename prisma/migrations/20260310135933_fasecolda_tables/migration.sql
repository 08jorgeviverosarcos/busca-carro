-- CreateTable
CREATE TABLE "FasecoldaCode" (
    "codigo" TEXT NOT NULL,
    "homologoCodigo" TEXT,
    "marca" TEXT NOT NULL,
    "clase" TEXT NOT NULL,
    "referencia1" TEXT,
    "referencia2" TEXT,
    "referencia3" TEXT,
    "um" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FasecoldaCode_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "FasecoldaValue" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "valueCop" BIGINT NOT NULL,

    CONSTRAINT "FasecoldaValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FasecoldaAbreviatura" (
    "id" TEXT NOT NULL,
    "abreviatura" TEXT NOT NULL,
    "definicion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FasecoldaAbreviatura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FasecoldaCode_marca_idx" ON "FasecoldaCode"("marca");

-- CreateIndex
CREATE INDEX "FasecoldaCode_marca_clase_idx" ON "FasecoldaCode"("marca", "clase");

-- CreateIndex
CREATE INDEX "FasecoldaCode_clase_idx" ON "FasecoldaCode"("clase");

-- CreateIndex
CREATE INDEX "FasecoldaValue_codigo_year_idx" ON "FasecoldaValue"("codigo", "year");

-- CreateIndex
CREATE INDEX "FasecoldaValue_period_idx" ON "FasecoldaValue"("period");

-- CreateIndex
CREATE UNIQUE INDEX "FasecoldaValue_codigo_year_period_key" ON "FasecoldaValue"("codigo", "year", "period");

-- CreateIndex
CREATE UNIQUE INDEX "FasecoldaAbreviatura_abreviatura_key" ON "FasecoldaAbreviatura"("abreviatura");

-- AddForeignKey
ALTER TABLE "FasecoldaValue" ADD CONSTRAINT "FasecoldaValue_codigo_fkey" FOREIGN KEY ("codigo") REFERENCES "FasecoldaCode"("codigo") ON DELETE CASCADE ON UPDATE CASCADE;

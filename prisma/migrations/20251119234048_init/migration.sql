-- CreateEnum
CREATE TYPE "CriteriaType" AS ENUM ('BENEFIT', 'COST');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alternative" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alternative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Criteria" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CriteriaType" NOT NULL,
    "weight" DECIMAL(18,8),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlternativeScore" (
    "id" TEXT NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "criteriaId" TEXT NOT NULL,
    "value" DECIMAL(18,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlternativeScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AhpComparison" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "criteriaIId" TEXT NOT NULL,
    "criteriaJId" TEXT NOT NULL,
    "value" DECIMAL(10,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AhpComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopsisResult" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "scoreV" DECIMAL(18,6) NOT NULL,
    "dPlus" DECIMAL(18,6),
    "dMinus" DECIMAL(18,6),
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopsisResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Alternative_projectId_code_key" ON "Alternative"("projectId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Criteria_projectId_code_key" ON "Criteria"("projectId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "AlternativeScore_alternativeId_criteriaId_key" ON "AlternativeScore"("alternativeId", "criteriaId");

-- CreateIndex
CREATE UNIQUE INDEX "AhpComparison_projectId_criteriaIId_criteriaJId_key" ON "AhpComparison"("projectId", "criteriaIId", "criteriaJId");

-- CreateIndex
CREATE UNIQUE INDEX "TopsisResult_alternativeId_key" ON "TopsisResult"("alternativeId");

-- CreateIndex
CREATE INDEX "TopsisResult_projectId_rank_idx" ON "TopsisResult"("projectId", "rank");

-- AddForeignKey
ALTER TABLE "Alternative" ADD CONSTRAINT "Alternative_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Criteria" ADD CONSTRAINT "Criteria_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlternativeScore" ADD CONSTRAINT "AlternativeScore_alternativeId_fkey" FOREIGN KEY ("alternativeId") REFERENCES "Alternative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlternativeScore" ADD CONSTRAINT "AlternativeScore_criteriaId_fkey" FOREIGN KEY ("criteriaId") REFERENCES "Criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AhpComparison" ADD CONSTRAINT "AhpComparison_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AhpComparison" ADD CONSTRAINT "AhpComparison_criteriaIId_fkey" FOREIGN KEY ("criteriaIId") REFERENCES "Criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AhpComparison" ADD CONSTRAINT "AhpComparison_criteriaJId_fkey" FOREIGN KEY ("criteriaJId") REFERENCES "Criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopsisResult" ADD CONSTRAINT "TopsisResult_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopsisResult" ADD CONSTRAINT "TopsisResult_alternativeId_fkey" FOREIGN KEY ("alternativeId") REFERENCES "Alternative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

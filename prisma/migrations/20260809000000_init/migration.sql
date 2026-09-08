-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'scheduled', 'won', 'lost', 'spam');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "parentName" VARCHAR(80) NOT NULL,
    "childNameAge" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipHash" VARCHAR(64),
    "userAgent" VARCHAR(255),
    "source" VARCHAR(64),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_status_createdAt_idx" ON "leads"("status", "createdAt");

-- CreateIndex
CREATE INDEX "leads_phone_idx" ON "leads"("phone");


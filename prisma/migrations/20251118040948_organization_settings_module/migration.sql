/*
  Warnings:

  - You are about to drop the `app_configs` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('COA', 'GGZ', 'MUNICIPALITY');

-- DropTable
DROP TABLE "app_configs";

-- CreateTable
CREATE TABLE "organization_settings" (
    "id" TEXT NOT NULL,
    "organizationType" "OrganizationType" NOT NULL DEFAULT 'COA',
    "contactEmail" TEXT,
    "phoneNumber" TEXT,
    "address" TEXT,
    "additionalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("id")
);

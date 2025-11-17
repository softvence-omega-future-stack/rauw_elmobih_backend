/*
  Warnings:

  - A unique constraint covering the columns `[deviceId,ipHash]` on the table `rate_limits` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "app_configs" ALTER COLUMN "maxIpSubmissions" SET DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_deviceId_ipHash_key" ON "rate_limits"("deviceId", "ipHash");

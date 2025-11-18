-- CreateTable
CREATE TABLE "brand_settings" (
    "id" TEXT NOT NULL,
    "primaryColor" TEXT,
    "theme" TEXT,
    "logo" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_settings_pkey" PRIMARY KEY ("id")
);

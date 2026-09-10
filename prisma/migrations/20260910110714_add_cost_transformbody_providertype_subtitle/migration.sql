-- AlterTable
ALTER TABLE "CustomModel" ADD COLUMN     "cost" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "providerType" TEXT NOT NULL DEFAULT 'api',
ADD COLUMN     "transformBody" TEXT;

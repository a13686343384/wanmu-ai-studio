/*
  Warnings:

  - Made the column `workspaceId` on table `StyleTemplate` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "StyleTemplate" ALTER COLUMN "workspaceId" SET NOT NULL,
ALTER COLUMN "workspaceId" SET DEFAULT '__global__';

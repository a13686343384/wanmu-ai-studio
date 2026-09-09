-- AlterTable
ALTER TABLE "Costume" ADD COLUMN     "situation" TEXT;

-- AlterTable
ALTER TABLE "Prop" ADD COLUMN     "parentCharacterId" TEXT;

-- AlterTable
ALTER TABLE "Script" ADD COLUMN     "assetPromptTemplate" TEXT;

-- AddForeignKey
ALTER TABLE "Prop" ADD CONSTRAINT "Prop_parentCharacterId_fkey" FOREIGN KEY ("parentCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

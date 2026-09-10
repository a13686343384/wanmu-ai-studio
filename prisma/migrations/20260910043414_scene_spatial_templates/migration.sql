-- AlterTable
ALTER TABLE "Scene" ADD COLUMN     "refImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "spatialPack" JSONB;

-- AlterTable
ALTER TABLE "Script" ADD COLUMN     "outfitPromptTemplate" TEXT,
ADD COLUMN     "propPromptTemplate" TEXT,
ADD COLUMN     "scenePromptTemplate" TEXT;

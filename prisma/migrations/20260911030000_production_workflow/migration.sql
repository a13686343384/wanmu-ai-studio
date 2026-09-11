-- AlterTable
ALTER TABLE "Episode" ADD COLUMN     "productionStage" TEXT NOT NULL DEFAULT 'outline',
ADD COLUMN     "review" JSONB;

-- AlterTable
ALTER TABLE "Script" ADD COLUMN     "assetGenerationConfig" JSONB;

-- AlterTable
ALTER TABLE "Storyboard" ADD COLUMN     "segmentId" TEXT;

-- CreateTable
CREATE TABLE "Segment" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "products" JSONB,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationTask" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "episodeId" TEXT,
    "kind" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'queued',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER,
    "currentLabel" TEXT NOT NULL DEFAULT '等待执行',
    "error" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "leaseOwner" TEXT,
    "heartbeatAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Segment_episodeId_order_idx" ON "Segment"("episodeId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationTask_idempotencyKey_key" ON "GenerationTask"("idempotencyKey");

-- CreateIndex
CREATE INDEX "GenerationTask_state_createdAt_idx" ON "GenerationTask"("state", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationTask_workspaceId_episodeId_idx" ON "GenerationTask"("workspaceId", "episodeId");

-- AddForeignKey
ALTER TABLE "Storyboard" ADD CONSTRAINT "Storyboard_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;


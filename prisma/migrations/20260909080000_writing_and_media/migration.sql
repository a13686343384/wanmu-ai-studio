CREATE TABLE "WritingProject" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "title" TEXT NOT NULL, "genre" TEXT NOT NULL, "idea" TEXT NOT NULL,
  "totalEpisodes" INTEGER NOT NULL DEFAULT 30, "episodeDuration" INTEGER NOT NULL DEFAULT 90,
  "document" JSONB NOT NULL DEFAULT '{}', "revision" INTEGER NOT NULL DEFAULT 0, "importedScriptId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WritingProject_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WritingProject_workspaceId_idx" ON "WritingProject"("workspaceId");
ALTER TABLE "WritingProject" ADD CONSTRAINT "WritingProject_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "MediaFile" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "name" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "bytes" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MediaFile_workspaceId_idx" ON "MediaFile"("workspaceId");
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "EcomProject" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "module" TEXT NOT NULL DEFAULT 'set',
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "items" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EcomProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EcomProject_workspaceId_module_idx" ON "EcomProject"("workspaceId", "module");

-- AddForeignKey
ALTER TABLE "EcomProject" ADD CONSTRAINT "EcomProject_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

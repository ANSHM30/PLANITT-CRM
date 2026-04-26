-- CreateTable
CREATE TABLE "GoogleWorkspaceConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceEmail" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiryDate" TIMESTAMP(3),
    "grantedScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "connectedMeet" BOOLEAN NOT NULL DEFAULT false,
    "connectedSheets" BOOLEAN NOT NULL DEFAULT false,
    "connectedDrive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GoogleWorkspaceConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleWorkspaceConnection_userId_key" ON "GoogleWorkspaceConnection"("userId");

-- AddForeignKey
ALTER TABLE "GoogleWorkspaceConnection"
ADD CONSTRAINT "GoogleWorkspaceConnection_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

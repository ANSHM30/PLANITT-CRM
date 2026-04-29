DO $$ BEGIN
  ALTER TYPE "ChatChannelType" ADD VALUE IF NOT EXISTS 'GROUP';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "groupId" TEXT;
ALTER TABLE "ChatRoomRead" ADD COLUMN IF NOT EXISTS "groupId" TEXT;

CREATE TABLE IF NOT EXISTS "ChatGroup" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChatGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChatGroupMember" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "addedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatGroupMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChatMessage_channelType_groupId_createdAt_idx" ON "ChatMessage"("channelType", "groupId", "createdAt");
CREATE INDEX IF NOT EXISTS "ChatRoomRead_userId_channelType_groupId_idx" ON "ChatRoomRead"("userId", "channelType", "groupId");
CREATE INDEX IF NOT EXISTS "ChatGroupMember_userId_createdAt_idx" ON "ChatGroupMember"("userId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ChatGroupMember_groupId_userId_key" ON "ChatGroupMember"("groupId", "userId");

DO $$ BEGIN
  ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ChatGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ChatRoomRead" ADD CONSTRAINT "ChatRoomRead_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ChatGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ChatGroup" ADD CONSTRAINT "ChatGroup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ChatGroupMember" ADD CONSTRAINT "ChatGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ChatGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ChatGroupMember" ADD CONSTRAINT "ChatGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

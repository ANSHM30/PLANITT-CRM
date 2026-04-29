CREATE TABLE IF NOT EXISTS "ChatMessageHidden" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "hiddenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessageHidden_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChatRoomRead" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channelType" "ChatChannelType" NOT NULL,
  "departmentId" TEXT,
  "projectId" TEXT,
  "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatRoomRead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChatMessageHidden_userId_messageId_key" ON "ChatMessageHidden"("userId", "messageId");
CREATE INDEX IF NOT EXISTS "ChatMessageHidden_userId_hiddenAt_idx" ON "ChatMessageHidden"("userId", "hiddenAt");
CREATE INDEX IF NOT EXISTS "ChatRoomRead_userId_channelType_departmentId_projectId_idx" ON "ChatRoomRead"("userId", "channelType", "departmentId", "projectId");

DO $$ BEGIN
  ALTER TABLE "ChatMessageHidden" ADD CONSTRAINT "ChatMessageHidden_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChatMessageHidden" ADD CONSTRAINT "ChatMessageHidden_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChatRoomRead" ADD CONSTRAINT "ChatRoomRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

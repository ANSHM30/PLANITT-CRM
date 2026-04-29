ALTER TABLE "ChatMessage"
ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "replyToId" TEXT;

DO $$ BEGIN
  ALTER TABLE "ChatMessage"
  ADD CONSTRAINT "ChatMessage_replyToId_fkey"
  FOREIGN KEY ("replyToId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "ChatMessage_replyToId_idx" ON "ChatMessage"("replyToId");

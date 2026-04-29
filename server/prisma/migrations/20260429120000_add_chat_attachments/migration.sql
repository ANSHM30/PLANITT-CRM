-- AlterEnum
DO $$ BEGIN
  CREATE TYPE "ChatMessageType" AS ENUM ('TEXT', 'IMAGE', 'PDF', 'STICKER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "ChatMessage"
ADD COLUMN IF NOT EXISTS "messageType" "ChatMessageType" NOT NULL DEFAULT 'TEXT',
ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT,
ADD COLUMN IF NOT EXISTS "attachmentMimeType" TEXT,
ADD COLUMN IF NOT EXISTS "attachmentFileName" TEXT;

-- AtendeProMax - Database Schema V2 (Production Ready)
-- Focus: Multi-tenancy, Scalability, and AI Context

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Companies Table
CREATE TABLE IF NOT EXISTS "companies" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "ai_prompt" TEXT,
    "plan" TEXT DEFAULT 'free', -- free, pro, enterprise
    "status" TEXT DEFAULT 'active', -- active, suspended
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT DEFAULT 'agent', -- admin, agent
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_company ON "users"("company_id");

-- 3. Contacts Table (CRM)
CREATE TABLE IF NOT EXISTS "contacts" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Composite index for fast lookups by phone within a company
CREATE INDEX idx_contacts_company_phone ON "contacts"("company_id", "phone");

-- 4. Tags Table
CREATE TABLE IF NOT EXISTS "tags" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT '#6366f1',
    UNIQUE("company_id", "name")
);

-- 5. Contact Tags (Many-to-Many)
CREATE TABLE IF NOT EXISTS "_ContactTags" (
    "A" UUID NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
    "B" UUID NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_contact_tags_ab ON "_ContactTags"("A", "B");

-- 6. Chats Table
CREATE TABLE IF NOT EXISTS "chats" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
    "contact_id" UUID NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
    "status" TEXT DEFAULT 'open', -- open, closed, pending, snoozed
    "lead_temperature" TEXT DEFAULT 'warm', -- hot, warm, cold
    "last_message_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_chats_company_status ON "chats"("company_id", "status");
CREATE INDEX idx_chats_last_message ON "chats"("company_id", "last_message_at" DESC);

-- 7. Chat Messages Table
CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "chat_id" UUID NOT NULL REFERENCES "chats"("id") ON DELETE CASCADE,
    "message" TEXT NOT NULL,
    "sender" TEXT NOT NULL, -- client, bot, agent
    "type" TEXT DEFAULT 'text', -- text, image, audio
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Index for fetching chat history in order
CREATE INDEX idx_messages_chat_time ON "chat_messages"("chat_id", "created_at" ASC);

-- 8. Appointments Table
CREATE TABLE IF NOT EXISTS "appointments" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "chat_id" UUID NOT NULL REFERENCES "chats"("id") ON DELETE CASCADE,
    "date" TIMESTAMP WITH TIME ZONE NOT NULL,
    "status" TEXT DEFAULT 'pending', -- confirmed, pending, cancelled
    "notes" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_appointments_chat_date ON "appointments"("chat_id", "date");

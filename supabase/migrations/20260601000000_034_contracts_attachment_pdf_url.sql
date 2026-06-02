-- 034: Add attachment_pdf_url to contracts
-- Stores the cached URL of the separately-generated lease attachments PDF.
-- This document is entirely independent of the contract PDF.
alter table contracts add column if not exists attachment_pdf_url text;

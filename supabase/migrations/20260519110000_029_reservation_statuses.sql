-- Migration 029: add 'converted_to_lease' status for reservations that have been converted to a lease

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE contracts ADD CONSTRAINT contracts_status_check CHECK (
  status IN (
    'draft',
    'sent',
    'sent_for_sign',
    'viewed',
    'partially_signed',
    'signed',
    'finalized',
    'active',
    'completed',
    'cancelled',
    'terminated',
    'renewed',
    'converted_to_lease'
  )
);

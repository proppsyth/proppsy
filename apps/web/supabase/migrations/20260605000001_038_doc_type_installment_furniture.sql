-- Migration 038: Add installment_schedule and furniture_list to doc_type constraint

ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_doc_type_check;

ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_doc_type_check
  CHECK (doc_type IN (
    'rental', 'reservation', 'renewal', 'cancellation',
    'termination', 'notice', 'receipt_book', 'receipt_rent', 'commission',
    'invoice_reservation', 'receipt_reservation',
    'invoice_deposit', 'receipt_deposit',
    'commission_confirm',
    'co_agent',
    'installment_schedule',
    'furniture_list',
    'end_contract',
    'warning'
  ));

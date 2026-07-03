CREATE OR REPLACE FUNCTION enforce_transaction_balance() RETURNS trigger AS $$
DECLARE
  target_transaction_id INTEGER;
  old_transaction_id INTEGER;
  totals RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_transaction_id := OLD.transaction_id;
  ELSE
    target_transaction_id := NEW.transaction_id;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    old_transaction_id := OLD.transaction_id;
  END IF;

  IF target_transaction_id IS NOT NULL THEN
    SELECT
      COUNT(*) AS post_count,
      COALESCE(SUM(debet), 0)::numeric AS total_debet,
      COALESCE(SUM(kredit), 0)::numeric AS total_kredit
    INTO totals
    FROM posts
    WHERE transaction_id = target_transaction_id;

    IF totals.post_count > 0 AND ABS(totals.total_debet - totals.total_kredit) > 0.001 THEN
      RAISE EXCEPTION 'Debet och kredit måste vara lika för verifikat %', target_transaction_id;
    END IF;
  END IF;

  IF old_transaction_id IS NOT NULL AND old_transaction_id <> target_transaction_id THEN
    SELECT
      COUNT(*) AS post_count,
      COALESCE(SUM(debet), 0)::numeric AS total_debet,
      COALESCE(SUM(kredit), 0)::numeric AS total_kredit
    INTO totals
    FROM posts
    WHERE transaction_id = old_transaction_id;

    IF totals.post_count > 0 AND ABS(totals.total_debet - totals.total_kredit) > 0.001 THEN
      RAISE EXCEPTION 'Debet och kredit måste vara lika för verifikat %', old_transaction_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posts_balance_invariant ON posts;

CREATE CONSTRAINT TRIGGER posts_balance_invariant
AFTER INSERT OR UPDATE OR DELETE ON posts
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION enforce_transaction_balance();

-- Create notifications for pending royalty payments
CREATE OR REPLACE FUNCTION public.check_pending_royalty_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_pending_amount numeric;
BEGIN
  -- Get users with pending payments (more than €100 unpaid)
  FOR v_user_id, v_pending_amount IN
    SELECT 
      s.created_by,
      SUM((pe.amount * ss.percentage) / 100) as pending
    FROM songs s
    JOIN song_splits ss ON ss.song_id = s.id
    JOIN platform_earnings pe ON pe.song_id = s.id
    GROUP BY s.created_by
    HAVING SUM((pe.amount * ss.percentage) / 100) > 100
  LOOP
    -- Create notification if one doesn't exist recently
    INSERT INTO notifications (user_id, title, message, type)
    SELECT 
      v_user_id,
      'Pagos de royalties pendientes',
      'Tienes €' || ROUND(v_pending_amount, 2) || ' en pagos pendientes a colaboradores',
      'royalty_payment'
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE user_id = v_user_id 
      AND type = 'royalty_payment'
      AND created_at > now() - interval '7 days'
    );
  END LOOP;
END;
$$;
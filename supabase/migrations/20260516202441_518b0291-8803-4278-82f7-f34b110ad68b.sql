
CREATE OR REPLACE FUNCTION public.bump_conv_updated()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;

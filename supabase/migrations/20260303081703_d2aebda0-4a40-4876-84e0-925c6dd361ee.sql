
-- Block all client-side access to kiwify_events (only service_role can access)
CREATE POLICY "Deny all access to kiwify_events"
ON public.kiwify_events
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

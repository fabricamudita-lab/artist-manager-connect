-- Add DELETE policy for booking_availability_responses
CREATE POLICY "Users can delete responses"
ON public.booking_availability_responses
FOR DELETE
USING (auth.role() = 'authenticated'::text);
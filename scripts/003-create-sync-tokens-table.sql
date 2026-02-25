-- Create sync_tokens table for temporary QR code data storage
CREATE TABLE IF NOT EXISTS public.sync_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(255) UNIQUE NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  device_name VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  version VARCHAR(50) NOT NULL
);

-- Add index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_sync_tokens_token ON public.sync_tokens(token);
CREATE INDEX IF NOT EXISTS idx_sync_tokens_expires_at ON public.sync_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.sync_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert sync tokens (for QR code generation)
CREATE POLICY "Allow insert on sync_tokens" ON public.sync_tokens
  FOR INSERT WITH CHECK (true);

-- Allow anyone to read sync tokens that haven't expired
CREATE POLICY "Allow read on sync_tokens" ON public.sync_tokens
  FOR SELECT USING (expires_at > NOW());

-- Allow deleting expired tokens (cleanup)
CREATE POLICY "Allow delete expired sync_tokens" ON public.sync_tokens
  FOR DELETE USING (expires_at < NOW());

-- Create function to auto-delete expired tokens
CREATE OR REPLACE FUNCTION delete_expired_sync_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.sync_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION delete_expired_sync_tokens() TO anon, authenticated;

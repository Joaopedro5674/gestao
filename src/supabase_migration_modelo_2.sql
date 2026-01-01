-- Add flag to emprestimos table
ALTER TABLE emprestimos 
ADD COLUMN IF NOT EXISTS cobranca_mensal BOOLEAN DEFAULT false;

-- Create table for monthly interest tracking
CREATE TABLE IF NOT EXISTS emprestimo_meses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  emprestimo_id UUID NOT NULL REFERENCES emprestimos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  mes_referencia TEXT NOT NULL, -- Format: YYYY-MM
  valor_juros NUMERIC NOT NULL,
  pago BOOLEAN DEFAULT false,
  pago_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE emprestimo_meses ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for emprestimo_meses
CREATE POLICY "Users can view their own monthly interest records" 
ON emprestimo_meses FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly interest records" 
ON emprestimo_meses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly interest records" 
ON emprestimo_meses FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly interest records" 
ON emprestimo_meses FOR DELETE 
USING (auth.uid() = user_id);

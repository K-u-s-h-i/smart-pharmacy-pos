-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create medicines table
CREATE TABLE public.medicines (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_code TEXT NOT NULL UNIQUE,
  item_name TEXT NOT NULL,
  item_name2 TEXT,
  pack_name TEXT,
  batch_no TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  sale_rate DECIMAL(10,2) NOT NULL,
  mrp DECIMAL(10,2) NOT NULL,
  manufacturer TEXT NOT NULL,
  hsn_code TEXT,
  cgst_per DECIMAL(5,2) DEFAULT 0,
  sgst_per DECIMAL(5,2) DEFAULT 0,
  igst_per DECIMAL(5,2) DEFAULT 0,
  rack TEXT,
  ptr DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales table
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_no TEXT NOT NULL UNIQUE,
  invoice_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  customer_name TEXT,
  customer_code TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  cgst_total DECIMAL(10,2) DEFAULT 0,
  sgst_total DECIMAL(10,2) DEFAULT 0,
  igst_total DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sale_items table
CREATE TABLE public.sale_items (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES public.medicines(id),
  quantity INTEGER NOT NULL,
  sale_rate DECIMAL(10,2) NOT NULL,
  mrp DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  cgst_amount DECIMAL(10,2) DEFAULT 0,
  sgst_amount DECIMAL(10,2) DEFAULT 0,
  igst_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst_no TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_code TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst_no TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for demo - no authentication required)
CREATE POLICY "Allow public read access on medicines" 
ON public.medicines FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on medicines" 
ON public.medicines FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on medicines" 
ON public.medicines FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on medicines" 
ON public.medicines FOR DELETE USING (true);

CREATE POLICY "Allow public read access on sales" 
ON public.sales FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on sales" 
ON public.sales FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on sale_items" 
ON public.sale_items FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on sale_items" 
ON public.sale_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on suppliers" 
ON public.suppliers FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on suppliers" 
ON public.suppliers FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on suppliers" 
ON public.suppliers FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on suppliers" 
ON public.suppliers FOR DELETE USING (true);

CREATE POLICY "Allow public read access on customers" 
ON public.customers FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on customers" 
ON public.customers FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on customers" 
ON public.customers FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on customers" 
ON public.customers FOR DELETE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_medicines_updated_at
BEFORE UPDATE ON public.medicines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_medicines_batch_no ON public.medicines(batch_no);
CREATE INDEX idx_medicines_expiry_date ON public.medicines(expiry_date);
CREATE INDEX idx_medicines_manufacturer ON public.medicines(manufacturer);
CREATE INDEX idx_sales_invoice_date ON public.sales(invoice_date);
CREATE INDEX idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_medicine_id ON public.sale_items(medicine_id);
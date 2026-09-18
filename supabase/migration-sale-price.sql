-- Precio especial de rebaja (opcional). NULL = sin rebaja, usa price normal.
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price numeric(10,2) DEFAULT NULL;

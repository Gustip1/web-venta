-- =====================================================
-- ACTUALIZACIÓN DE SEGURIDAD - ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Este script mejora las políticas RLS para prevenir
-- acceso no autorizado a las órdenes
-- =====================================================

-- 1. ELIMINAR POLÍTICAS PERMISIVAS EXISTENTES
-- =====================================================

DROP POLICY IF EXISTS "public read orders" ON public.orders;
DROP POLICY IF EXISTS "public write orders" ON public.orders;
DROP POLICY IF EXISTS "public update orders" ON public.orders;

DROP POLICY IF EXISTS "public read order_items" ON public.order_items;
DROP POLICY IF EXISTS "public write order_items" ON public.order_items;
DROP POLICY IF EXISTS "public upsert order_items" ON public.order_items;

DROP POLICY IF EXISTS "public read shipping_addresses" ON public.shipping_addresses;
DROP POLICY IF EXISTS "public write shipping_addresses" ON public.shipping_addresses;
DROP POLICY IF EXISTS "public update shipping_addresses" ON public.shipping_addresses;

-- 2. POLÍTICAS SEGURAS PARA ORDERS
-- =====================================================

-- Lectura: Solo el propietario o admins pueden ver sus órdenes
CREATE POLICY "read_own_orders" ON public.orders
  FOR SELECT
  USING (
    -- Usuario autenticado puede ver sus propias órdenes
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    -- Admins pueden ver todas las órdenes
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Inserción: Usuarios autenticados pueden crear órdenes
-- (el checkout puede funcionar sin login, por eso permitimos NULL en user_id)
CREATE POLICY "insert_orders" ON public.orders
  FOR INSERT
  WITH CHECK (
    -- Permitir inserción si no hay usuario (checkout sin login)
    user_id IS NULL
    OR
    -- Si hay usuario, debe ser el usuario autenticado
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- Actualización: Solo el propietario o admin puede actualizar
CREATE POLICY "update_own_orders" ON public.orders
  FOR UPDATE
  USING (
    -- Usuario puede actualizar su propia orden
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    -- Admin puede actualizar cualquier orden
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    -- Mismo check al insertar
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Delete: Solo admins pueden eliminar órdenes
CREATE POLICY "delete_orders_admin_only" ON public.orders
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 3. POLÍTICAS SEGURAS PARA ORDER_ITEMS
-- =====================================================

-- Lectura: Solo si pueden ver la orden
CREATE POLICY "read_order_items" ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND (
        (o.user_id IS NOT NULL AND o.user_id = auth.uid())
        OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
    )
  );

-- Inserción: Solo al crear la orden (mismo usuario)
CREATE POLICY "insert_order_items" ON public.order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND (
        o.user_id IS NULL -- Checkout sin login
        OR
        (o.user_id IS NOT NULL AND o.user_id = auth.uid())
      )
    )
  );

-- Actualización: Solo admin
CREATE POLICY "update_order_items" ON public.order_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Delete: Solo admin
CREATE POLICY "delete_order_items" ON public.order_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 4. POLÍTICAS SEGURAS PARA SHIPPING_ADDRESSES
-- =====================================================

-- Lectura: Solo si pueden ver la orden
CREATE POLICY "read_shipping_addresses" ON public.shipping_addresses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = shipping_addresses.order_id
      AND (
        (o.user_id IS NOT NULL AND o.user_id = auth.uid())
        OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
    )
  );

-- Inserción: Solo al crear la orden
CREATE POLICY "insert_shipping_addresses" ON public.shipping_addresses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = shipping_addresses.order_id
      AND (
        o.user_id IS NULL
        OR
        (o.user_id IS NOT NULL AND o.user_id = auth.uid())
      )
    )
  );

-- Actualización: Solo el propietario o admin
CREATE POLICY "update_shipping_addresses" ON public.shipping_addresses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = shipping_addresses.order_id
      AND (
        (o.user_id IS NOT NULL AND o.user_id = auth.uid())
        OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
    )
  );

-- Delete: Solo admin
CREATE POLICY "delete_shipping_addresses" ON public.shipping_addresses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 5. PROTECCIÓN ADICIONAL: CUSTOM_ORDERS
-- =====================================================

-- Actualmente "create custom order" permite insertar sin autenticación
-- Esto está bien para el formulario de encargos, pero añadimos rate limiting
-- en el código (ya implementado en /api/encargos)

-- Lectura: Solo admins
DROP POLICY IF EXISTS "read custom orders" ON public.custom_orders;
CREATE POLICY "read_custom_orders_admin_only" ON public.custom_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Inserción: Permitir público (con rate limiting en API)
DROP POLICY IF EXISTS "create custom order" ON public.custom_orders;
CREATE POLICY "insert_custom_orders_public" ON public.custom_orders
  FOR INSERT
  WITH CHECK (true);

-- Actualización/Delete: Solo admin
CREATE POLICY "update_custom_orders_admin_only" ON public.custom_orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "delete_custom_orders_admin_only" ON public.custom_orders
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- =====================================================
-- RESUMEN DE CAMBIOS
-- =====================================================
-- ✅ Orders: Solo propietario o admin pueden leer/actualizar
-- ✅ Order Items: Solo propietario (al crear) o admin
-- ✅ Shipping Addresses: Solo propietario o admin
-- ✅ Custom Orders: Solo admin puede leer, público puede crear (con rate limit)
-- ✅ Prevención de acceso no autorizado
-- ✅ Protección contra modificación de órdenes ajenas
-- =====================================================


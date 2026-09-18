import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { adminLoginLimiter } from '@/lib/security/rate-limiter';
import { getClientIp } from '@/lib/security/get-client-ip';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  
  // Verificar si la IP está bloqueada
  if (adminLoginLimiter.isBlocked(clientIp)) {
    const remainingTime = adminLoginLimiter.getBlockedTime(clientIp);
    console.warn(`[SECURITY] Intento de login bloqueado desde IP: ${clientIp}`);
    
    return NextResponse.json(
      {
        error: 'Demasiados intentos fallidos',
        message: `Has excedido el número máximo de intentos. Intenta nuevamente en ${remainingTime} segundos.`,
        blockedUntil: remainingTime
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();

    // Intentar login
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      // Registrar intento fallido
      const result = adminLoginLimiter.recordFailedAttempt(clientIp);
      
      console.warn(`[SECURITY] Login fallido desde IP ${clientIp}: ${email}`);
      
      if (result.blocked) {
        return NextResponse.json(
          {
            error: 'Demasiados intentos fallidos',
            message: `Cuenta bloqueada temporalmente. Intenta nuevamente en ${result.remainingTime} segundos.`,
            blockedUntil: result.remainingTime
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    const user = signInData.user;
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar rol de admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      // Registrar intento fallido (no es admin)
      adminLoginLimiter.recordFailedAttempt(clientIp);
      
      console.warn(`[SECURITY] Intento de acceso admin sin permisos desde IP ${clientIp}: ${email}`);
      
      // Cerrar sesión
      await supabase.auth.signOut();
      
      return NextResponse.json(
        { error: 'No autorizado. Se requieren permisos de administrador.' },
        { status: 403 }
      );
    }

    // Login exitoso - resetear contador
    adminLoginLimiter.reset(clientIp);
    console.info(`[SECURITY] Login admin exitoso: ${email} desde IP ${clientIp}`);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error: any) {
    console.error('[ERROR] Error en admin login:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


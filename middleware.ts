import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Criar cliente Supabase
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Obter token de autenticação dos cookies
  const token = request.cookies.get('sb-access-token')?.value;

  // Verificar se usuário está autenticado
  const { data: { session } } = await supabase.auth.getSession();

  // Se não estiver autenticado e não estiver na página de login, redirecionar
  if (!session && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Se estiver autenticado e tentar acessar login, redirecionar para home
  if (session && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|lasy-bridge.js).*)'],
};

"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Apple, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se usuário já está logado
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/');
      } else {
        setLoading(false);
      }
    });

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.push('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 via-blue-500 to-yellow-400 rounded-xl flex items-center justify-center">
              <Apple className="w-6 h-6 text-black" />
            </div>
            <h1 className="text-2xl font-bold">BR CALL AI</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>Powered by AI</span>
          </div>
        </div>
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-green-400 via-blue-500 to-yellow-400 bg-clip-text text-transparent">
              Bem-vindo de volta!
            </h2>
            <p className="text-gray-400">
              Entre para continuar seu acompanhamento nutricional
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#10b981',
                      brandAccent: '#059669',
                      brandButtonText: 'white',
                      defaultButtonBackground: '#1f2937',
                      defaultButtonBackgroundHover: '#374151',
                      defaultButtonBorder: '#374151',
                      defaultButtonText: 'white',
                      dividerBackground: '#374151',
                      inputBackground: '#111827',
                      inputBorder: '#374151',
                      inputBorderHover: '#4b5563',
                      inputBorderFocus: '#10b981',
                      inputText: 'white',
                      inputLabelText: '#9ca3af',
                      inputPlaceholder: '#6b7280',
                      messageText: '#9ca3af',
                      messageTextDanger: '#ef4444',
                      anchorTextColor: '#10b981',
                      anchorTextHoverColor: '#059669',
                    },
                    space: {
                      spaceSmall: '8px',
                      spaceMedium: '16px',
                      spaceLarge: '24px',
                    },
                    fontSizes: {
                      baseBodySize: '14px',
                      baseInputSize: '14px',
                      baseLabelSize: '14px',
                      baseButtonSize: '14px',
                    },
                    borderWidths: {
                      buttonBorderWidth: '1px',
                      inputBorderWidth: '1px',
                    },
                    radii: {
                      borderRadiusButton: '8px',
                      buttonBorderRadius: '8px',
                      inputBorderRadius: '8px',
                    },
                  },
                },
                className: {
                  container: 'auth-container',
                  button: 'auth-button',
                  input: 'auth-input',
                  label: 'auth-label',
                },
              }}
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'Email',
                    password_label: 'Senha',
                    email_input_placeholder: 'seu@email.com',
                    password_input_placeholder: 'Sua senha',
                    button_label: 'Entrar',
                    loading_button_label: 'Entrando...',
                    social_provider_text: 'Entrar com {{provider}}',
                    link_text: 'Já tem uma conta? Entre',
                  },
                  sign_up: {
                    email_label: 'Email',
                    password_label: 'Senha',
                    email_input_placeholder: 'seu@email.com',
                    password_input_placeholder: 'Sua senha',
                    button_label: 'Criar conta',
                    loading_button_label: 'Criando conta...',
                    social_provider_text: 'Criar conta com {{provider}}',
                    link_text: 'Não tem uma conta? Cadastre-se',
                    confirmation_text: 'Verifique seu email para confirmar',
                  },
                  forgotten_password: {
                    email_label: 'Email',
                    password_label: 'Senha',
                    email_input_placeholder: 'seu@email.com',
                    button_label: 'Enviar instruções',
                    loading_button_label: 'Enviando...',
                    link_text: 'Esqueceu sua senha?',
                    confirmation_text: 'Verifique seu email para redefinir a senha',
                  },
                  update_password: {
                    password_label: 'Nova senha',
                    password_input_placeholder: 'Sua nova senha',
                    button_label: 'Atualizar senha',
                    loading_button_label: 'Atualizando...',
                    confirmation_text: 'Sua senha foi atualizada',
                  },
                },
              }}
              providers={[]}
              redirectTo={typeof window !== 'undefined' ? window.location.origin : ''}
            />
          </div>

          <p className="text-center text-gray-500 text-sm mt-6">
            Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade
          </p>
        </div>
      </main>
    </div>
  );
}

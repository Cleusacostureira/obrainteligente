import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!isSupabaseConfigured) {
        // Local fallback for development when Supabase isn't configured
        if (!isLogin) {
          if (formData.password !== formData.confirmPassword) {
            alert('As senhas não conferem');
            return;
          }
        }
        const mockUser = { id: Date.now().toString(), email: formData.email, name: formData.name };
        localStorage.setItem('user', JSON.stringify(mockUser));
        navigate('/projetos');
        return;
      }

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        const user = data.user;
        if (user) {
          localStorage.setItem('user', JSON.stringify({ id: user.id, email: user.email }));
          navigate('/projetos');
        }
      } else {
        if (formData.password !== formData.confirmPassword) {
          alert('As senhas não conferem');
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: { name: formData.name } }
        });
        if (error) throw error;
        // After sign up, try sign in to obtain session
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (signInError) {
          // signup can require email confirmation depending on Supabase settings
          alert('Conta criada. Confirme seu e-mail se necessário e faça login.');
          navigate('/projetos');
          return;
        }
        const newUser = signInData.user;
        if (newUser) {
          localStorage.setItem('user', JSON.stringify({ id: newUser.id, email: newUser.email }));
          navigate('/projetos');
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao autenticar');
    }
  };

  const handleRecovery = () => {
    alert('Link de recuperação enviado para seu e-mail!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="https://static.readdy.ai/image/32e34e04a919b9271ef3ff4f79b7fd86/cbe84a417d47b8c1155c0e22c6b2cec6.png" 
            alt="Logo"
            className="w-32 h-32 mx-auto object-contain"
          />
        </div>

        {/* Card de Login/Registro */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                isLogin 
                  ? 'bg-teal-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                !isLogin 
                  ? 'bg-teal-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required={!isLogin}
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="Seu nome"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mail
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                placeholder="••••••••"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  required={!isLogin}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="••••••••"
                />
              </div>
            )}

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleRecovery}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium whitespace-nowrap cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition-colors mt-6 whitespace-nowrap cursor-pointer"
            >
              {isLogin ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-sm mt-6">
          Sistema profissional de gestão de obras
        </p>
      </div>
    </div>
  );
}
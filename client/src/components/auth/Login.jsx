import React, { useState } from 'react';
import { Lock, Mail, Building2, ArrowRight, Loader2 } from 'lucide-react';

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', companyName: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const endpoint = isRegister ? '/api/register' : '/api/login';
    const payload = isRegister 
        ? { email: formData.email, password: formData.password, companyName: formData.companyName } 
        : { email: formData.email, password: formData.password };

    try {
      // FIX: Removed "http://localhost:5000"
      // Now it asks for "/api/login" on WHATEVER server it is currently loaded from
      const res = await fetch(`${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (isRegister) {
           alert("Registration successful! Please log in.");
           setIsRegister(false);
        } else {
           onLogin(data.token);
        }
      } else {
        setError(data.error || "Authentication failed");
      }
    } catch (err) {
        console.error(err);
        setError("Server connection failed. Is the backend running?");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-slate-200">
        <div className="text-center mb-8">
            <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
            <p className="text-sm text-slate-500 mt-2">{isRegister ? 'Start managing your invoices today.' : 'Sign in to access your dashboard.'}</p>
        </div>

        {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company Name</label>
                <div className="relative">
                    <Building2 className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        required 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        placeholder="Acme Corp"
                        value={formData.companyName}
                        onChange={e => setFormData({...formData, companyName: e.target.value})}
                    />
                </div>
             </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
            <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                    type="email" 
                    required 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
            <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                    type="password" 
                    required 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-teal-600 text-white font-bold py-3 rounded-lg hover:bg-teal-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20}/> : (isRegister ? 'Sign Up' : 'Sign In')}
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-6 text-center">
            <button onClick={() => setIsRegister(!isRegister)} className="text-sm text-teal-600 hover:underline">
                {isRegister ? 'Already have an account? Log In' : "Don't have an account? Create one"}
            </button>
        </div>
      </div>
    </div>
  );
}
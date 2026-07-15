'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = '/';
      } else {
        setError(data.message || 'Email atau kata sandi salah');
      }
    } catch {
      setError('Koneksi gagal. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Kiri: Branding & Status */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-secondary to-primary-container p-12 flex-col justify-between text-white">
        <Logo variant="light" className="scale-110 origin-left" />
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-success/20 rounded-full text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
            Sistem Berjalan Normal
          </div>
          <p className="text-sm text-white/75 mt-4">
            Aplikasi pendataan cepat logistik dan penyaluran bantuan berbasis QR Code.
          </p>
        </div>
      </div>

      {/* Kanan: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-2xl font-bold font-heading text-gray-900">Masuk ke GANTARA</h2>
            <p className="text-sm text-gray-500 mt-1">Masukkan kredensial Anda untuk mengakses dashboard.</p>
          </div>

          {error && (
            <div className="p-4 bg-danger/10 border border-danger/25 text-danger rounded-btn text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Alamat Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@gantara.id"
              required
            />
            <Input
              label="Kata Sandi"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-100 text-primary focus:ring-primary"
                />
                Ingat saya di perangkat ini
              </label>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

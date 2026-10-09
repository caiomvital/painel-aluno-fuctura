'use client';

import React, { useState, useEffect } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { LoginForm } from '@/components/auth/LoginForm';
import { StudentView } from '@/components/student/StudentView';
import { TeacherView } from '@/components/teacher/TeacherView';
import { DirectorView } from '@/components/director/DirectorView';
import { UserPreferences } from '@/components/layout/UserPreferences';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted) {
          setUser(data?.user || null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setUser(null);
    }
  };

  const handleLoginSuccess = (authenticatedUser: any) => {
    setUser(authenticatedUser);
  };

  const handleSwitchRole = (newRole: 'ALUNO' | 'PROFESSOR' | 'DIRETOR') => {
    if (newRole === 'DIRETOR') {
      setUser({
        id: 'user_director_1',
        name: 'Carlos Mendes',
        email: 'diretor@fuctura.com.br',
        role: 'DIRETOR',
      });
    } else if (newRole === 'PROFESSOR') {
      setUser({
        id: 'user_teacher_1',
        name: 'Prof. Henrique Silveira',
        email: 'henrique.silveira@fuctura.com.br',
        role: 'PROFESSOR',
      });
    } else {
      setUser({
        id: 'user_student_1',
        name: 'João Pedro da Silva',
        email: 'aluno@fuctura.com.br',
        role: 'ALUNO',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070a12]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-400">Carregando Fuctura Tecnologia...</span>
        </div>
      </div>
    );
  }

  const content = (
    <div className="min-h-screen bg-[#070a12] flex flex-col text-slate-100 selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Brand Header with PWA installation & profile info */}
      <AppHeader user={user} onLogout={handleLogout} onSwitchRole={handleSwitchRole} />

      {/* Main Dynamic Content based on User Role */}
      <main className="flex-1 pb-16">
        {!user ? (
          <div className="flex min-h-[calc(100vh-8rem)] flex-col justify-center px-4 py-8">
            <LoginForm onSuccess={handleLoginSuccess} />
          </div>
        ) : user.role === 'ALUNO' ? (
          <StudentView />
        ) : user.role === 'PROFESSOR' ? (
          <TeacherView />
        ) : user.role === 'DIRETOR' ? (
          <DirectorView />
        ) : (
          <div className="p-8 text-center text-sm text-slate-400">
            Perfil de usuário não identificado.
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/80 bg-[#05070d] py-5 text-center text-[11px] text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">Fuctura Tecnologia</span>
            <span>&bull;</span>
            <span>Painel do Aluno &amp; Gestão Acadêmica</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600">
            <span>PWA Instalável</span>
            <span>&bull;</span>
            <span>Prisma ORM</span>
            <span>&bull;</span>
            <span>PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
  return user ? <UserPreferences key={user.id}>{content}</UserPreferences> : content;
}

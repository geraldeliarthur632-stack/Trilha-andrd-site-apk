import React, { useState, useEffect } from 'react';
import { GradeLevel, SubjectId, UserProfile, AppLanguage, APP_LANGUAGES } from '../types';
import { GRADE_LABELS, CONFIGURABLE_SPECIFIC_SUBJECTS } from '../data/curriculumData';
import { soundEffects } from '../services/soundEffects';
import { generateUniqueNames } from '../utils/nameGenerator';
import { FirebaseService } from '../services/database/firebaseService';
import { languageService } from '../services/languageService';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  RefreshCw,
  Check,
  Atom,
  User,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Camera,
  Trash2,
  Mail,
  Languages,
  Globe,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  user?: UserProfile;
  onUpdateUser?: (profile: Partial<UserProfile>) => void;
  onSaveProfile?: (profile: {
    name: string;
    grade: GradeLevel;
    avatar: string;
    customSubjects?: SubjectId[];
    hasConfiguredSubjects?: boolean;
    email?: string;
    userId?: string;
    photoURL?: string;
    language?: AppLanguage;
  }) => void;
  onComplete?: () => void;
  onClose?: () => void;
  onOpenAuth?: (preselectedLanguage?: AppLanguage) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  user,
  onUpdateUser,
  onSaveProfile,
  onComplete,
  onClose,
  onOpenAuth,
}) => {
  // Steps:
  // 1: Perfil do Estudante / Conta (Nome, Série, Avatar, Google Login, Convidado)
  // 2: Matérias escolares opcionais (Biologia, Física, Química)
  const [step, setStep] = useState<1 | 2>(1);

  // Campos de perfil / convidado
  const [name, setName] = useState(user?.name && user.name !== 'Estudante' ? user.name : '');
  const [grade, setGrade] = useState<GradeLevel>(user?.grade || '6_fund');
  const [avatar, setAvatar] = useState(user?.avatar || 'graduation-cap');
  const [photoURL, setPhotoURL] = useState<string | undefined>(user?.photoURL);
  const [guestUserId, setGuestUserId] = useState<string>('');
  const [suggestedNames, setSuggestedNames] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectId[]>([]);

  // Estados de feedback e loading
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGoogleFallback, setShowGoogleFallback] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setName(user?.name && user.name !== 'Estudante' ? user.name : '');
      const initGrade = user?.grade || '6_fund';
      setGrade(initGrade);
      setAvatar(user?.avatar || 'graduation-cap');
      setPhotoURL(user?.photoURL);
      setError('');
      setSuccess('');
      setShowGoogleFallback(false);
      setSuggestedNames(generateUniqueNames(4));
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (user?.customSubjects && user.customSubjects.length > 0) {
      setSelectedSubjects(user.customSubjects);
    } else {
      setSelectedSubjects([]);
    }
  }, [grade, user]);

  if (!isOpen) return null;

  const handlePickSuggestion = (sug: string) => {
    soundEffects.playClick();
    setName(sug);
    setError('');
  };

  const handleRefreshSuggestions = () => {
    soundEffects.playClick();
    setSuggestedNames(generateUniqueNames(4));
  };

  const toggleSubject = (id: SubjectId) => {
    soundEffects.playClick();
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSelectSciencePack = () => {
    soundEffects.playClick();
    setSelectedSubjects(['biologia', 'fisica', 'quimica']);
  };

  const handleClearSciencePack = () => {
    soundEffects.playClick();
    setSelectedSubjects([]);
  };

  // ===================== 1. LOGIN COM GOOGLE =====================
  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      soundEffects.playClick();
      const firebaseUser = await FirebaseService.loginWithGoogle();
      if (!firebaseUser) throw new Error('Não foi possível conectar com o Google.');

      const cloudData = await FirebaseService.restoreProgress(firebaseUser.uid);

      const resolvedName = cloudData?.name || firebaseUser.displayName || name || 'Estudante';
      const resolvedGrade = (cloudData?.grade as GradeLevel) || grade;
      const resolvedAvatar = cloudData?.avatar || avatar;
      const resolvedCustomSubjects = cloudData?.customSubjects || selectedSubjects;

      const profilePayload = {
        name: resolvedName,
        grade: resolvedGrade,
        avatar: resolvedAvatar,
        customSubjects: resolvedCustomSubjects,
        hasConfiguredSubjects: true,
        email: firebaseUser.email || undefined,
        userId: firebaseUser.uid,
        photoURL: firebaseUser.photoURL || undefined,
        language: (cloudData?.language as AppLanguage) || user?.language || 'pt',
        totalPoints: cloudData?.totalPoints || 0,
        completedChallenges: cloudData?.completedChallenges || 0,
        totalCorrectAnswers: cloudData?.totalCorrectAnswers || 0,
      };

      await FirebaseService.syncProgress(firebaseUser.uid, profilePayload);

      soundEffects.playVictoryFanfare();
      setSuccess('Conectado com o Google com sucesso!');

      if (onUpdateUser) {
        onUpdateUser(profilePayload);
      }

      if (!cloudData?.hasConfiguredSubjects) {
        setTimeout(() => {
          setLoading(false);
          setStep(2);
        }, 800);
      } else {
        setTimeout(() => {
          setLoading(false);
          if (onSaveProfile) onSaveProfile(profilePayload);
          if (onComplete) onComplete();
          if (onClose) onClose();
        }, 900);
      }
    } catch (err: any) {
      setLoading(false);
      setShowGoogleFallback(true);
      const msg = FirebaseService.formatAuthErrorMessage(err);
      setError(msg);
      soundEffects.playError();
    }
  };

  // ===================== 2. ACESSO IMEDIATO COMO CONVIDADO =====================
  const handleImmediateGuestLogin = async () => {
    soundEffects.playSuccess();
    setError('');
    setLoading(true);

    let guestUid = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      const guestUser = await FirebaseService.loginAsGuest();
      if (guestUser?.uid) {
        guestUid = guestUser.uid;
      }
    } catch (e) {
      console.warn('Convidado local:', e);
    }
    setGuestUserId(guestUid);

    const cleanName = name.trim() || (user?.name && user.name !== 'Estudante' ? user.name : 'Estudante Convidado');
    const profilePayload: UserProfile = {
      name: cleanName,
      grade: grade || user?.grade || '6_fund',
      avatar: avatar || user?.avatar || 'graduation-cap',
      avatarId: user?.avatarId,
      customSubjects: selectedSubjects || [],
      hasConfiguredSubjects: true,
      email: undefined,
      userId: guestUid,
      photoURL: photoURL || user?.photoURL || undefined,
      language: user?.language || 'pt',
      isFirstTime: false,
      hasSeenIntro: true,
      totalPoints: user?.totalPoints || 0,
      completedChallenges: user?.completedChallenges || 0,
      totalCorrectAnswers: user?.totalCorrectAnswers || 0,
    };

    try {
      localStorage.setItem('estudahud_user_profile_v3', JSON.stringify(profilePayload));
      localStorage.setItem('estudahud_guest_uid', guestUid);
      localStorage.setItem('trilha_saber_first_time_tutorial_done', 'true');
    } catch {}

    if (onUpdateUser) {
      onUpdateUser(profilePayload);
    }
    if (onSaveProfile) {
      onSaveProfile(profilePayload);
    }
    if (onComplete) onComplete();
    if (onClose) onClose();
    setLoading(false);
  };

  // ===================== 3. CONTINUAR COMO CONVIDADO (COM PASSO 2) =====================
  const handleConfirmGuest = async () => {
    const cleanName = name.trim() || 'Estudante';
    soundEffects.playSuccess();
    setError('');

    let guestUid = guestUserId || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      const guestUser = await FirebaseService.loginAsGuest();
      if (guestUser?.uid) {
        guestUid = guestUser.uid;
      }
    } catch (e) {
      console.warn('Convidado local:', e);
    }
    setGuestUserId(guestUid);

    const profilePayload = {
      name: cleanName,
      grade,
      avatar: avatar || 'graduation-cap',
      customSubjects: selectedSubjects,
      hasConfiguredSubjects: false,
      email: undefined,
      userId: guestUid,
      photoURL: photoURL || undefined,
      language: user?.language || 'pt',
      isFirstTime: false,
    };

    try {
      localStorage.setItem('estudahud_user_profile_v3', JSON.stringify({ ...user, ...profilePayload }));
      localStorage.setItem('estudahud_guest_uid', guestUid);
    } catch {}

    if (onUpdateUser) {
      onUpdateUser(profilePayload);
    }

    // Avança para o Passo 2: Biologia, Física e Química
    setStep(2);
  };

  // ===================== FINALIZAR PASSO 2 (MATÉRIAS) =====================
  const handleFinalizeStep3 = async () => {
    soundEffects.playSuccess();

    try {
      localStorage.setItem('estudahud_subjects_prompted_once', 'true');
    } catch {}

    const cleanName = name.trim() || user?.name || 'Estudante';
    const effectiveUid = guestUserId || user?.userId || localStorage.getItem('estudahud_guest_uid') || `guest_${Date.now()}`;

    const profilePayload = {
      name: cleanName,
      grade,
      avatar: avatar || 'graduation-cap',
      customSubjects: selectedSubjects,
      hasConfiguredSubjects: true,
      email: user?.email || undefined,
      userId: effectiveUid,
      photoURL: photoURL || user?.photoURL || undefined,
      language: user?.language || 'pt',
      isFirstTime: false,
    };

    try {
      localStorage.setItem('estudahud_user_profile_v3', JSON.stringify({ ...user, ...profilePayload }));
      localStorage.setItem('trilha_saber_first_time_tutorial_done', 'true');
    } catch {}

    if (onUpdateUser) {
      onUpdateUser(profilePayload);
    }

    const currentUid = FirebaseService.getCurrentUser()?.uid;
    if (currentUid && !currentUid.startsWith('guest_')) {
      FirebaseService.syncProgress(currentUid, profilePayload).catch(() => {});
    }

    if (onSaveProfile) {
      onSaveProfile(profilePayload as UserProfile);
    }
    if (onComplete) onComplete();
    if (onClose) onClose();
  };

  const scienceSubjects = CONFIGURABLE_SPECIFIC_SUBJECTS;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 text-slate-900 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                step === 1 ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {step > 1 ? '✓' : '1'}
            </span>
            <span className={step === 1 ? 'text-slate-900 font-extrabold' : 'text-slate-500 font-semibold'}>
              Perfil
            </span>
            <span className="text-slate-300">→</span>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 font-medium'
              }`}
            >
              2
            </span>
            <span className={step === 2 ? 'text-slate-900 font-extrabold' : 'text-slate-500 font-semibold'}>
              Matérias
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-bold shrink-0">Passo {step} de 2</span>
        </div>

        {/* ================= PASSO 1: PERFIL DO ESTUDANTE OU LOGIN ================= */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2.5 mb-1.5">
                <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-xs border border-indigo-200 bg-indigo-950 flex items-center justify-center">
                  <img src="/app-logo.png" alt="Trilha do Saber" className="w-full h-full object-cover" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1 leading-none">
                    <span className="text-lg font-black tracking-tight text-slate-900">Trilha</span>
                    <span className="text-lg font-black tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-600 bg-clip-text text-transparent">
                      do Saber
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-bold">Aprenda se divertindo!</span>
                </div>
              </div>

              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-1">
                Boas-vindas aos Estudos!
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure seu perfil de estudante para começar ou acesse sua conta
              </p>
            </div>

            {/* Mensagens de Sucesso ou Erro */}
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="flex-1 leading-relaxed">{error}</span>
                </div>
                {showGoogleFallback && (
                  <button
                    type="button"
                    onClick={handleConfirmGuest}
                    className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Continuar com Perfil de Estudante (Sem Google)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* 1. SEÇÃO PRINCIPAL: PERFIL DO ESTUDANTE (ZERO FRICÇÃO PARA APK / PLAY STORE) */}
            <div className="space-y-3.5 p-4 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/70 border border-indigo-200/80 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Perfil do Estudante
                  </h4>
                </div>
                <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                  100% Grátis & Offline
                </span>
              </div>

              {/* Foto de Perfil Opcional / Chapéu de Formatura */}
              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center overflow-hidden shrink-0">
                  {photoURL ? (
                    <img src={photoURL} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <GraduationCap className="w-7 h-7 text-indigo-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-bold text-slate-800 block">
                    Foto ou Avatar (Opcional)
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {photoURL ? 'Foto adicionada!' : 'Padrão: chapéu de formatura'}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="file"
                      id="onboarding-photo"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setPhotoURL(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="onboarding-photo"
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3 h-3" />
                      <span>{photoURL ? 'Trocar foto' : 'Escolher foto'}</span>
                    </label>
                    {photoURL && (
                      <button
                        type="button"
                        onClick={() => setPhotoURL(undefined)}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Nome ou apelido */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-bold flex items-center gap-1 text-[11px]">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Nome ou Apelido</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRefreshSuggestions}
                    className="text-[10px] text-indigo-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Sugerir</span>
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={30}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Pedro, Sofia, Arthur..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 font-semibold bg-white focus:outline-hidden focus:border-indigo-500 transition"
                />

                {suggestedNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {suggestedNames.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handlePickSuggestion(sug)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold transition cursor-pointer ${
                          name === sug
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white border-slate-200 text-indigo-700 hover:border-indigo-400'
                        }`}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Série Escolar */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1 text-[11px]">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Série ou Ano Escolar</span>
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as GradeLevel)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-indigo-500 cursor-pointer shadow-2xs font-semibold"
                >
                  {(Object.keys(GRADE_LABELS) as GradeLevel[]).map((g) => (
                    <option key={g} value={g}>
                      {GRADE_LABELS[g].short} ({GRADE_LABELS[g].full})
                    </option>
                  ))}
                </select>
              </div>

              {/* Botão Principal de Início dos Estudos */}
              <button
                type="button"
                onClick={handleConfirmGuest}
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <span>Entrar e Começar a Estudar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Acesso Rápido de 1 Toque (para testes na Play Store / sem cadastro) */}
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2.5 shadow-2xs">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                  Acesso Imediato
                </span>
                <span className="text-xs font-bold text-slate-800 block truncate">
                  Testar app como Convidado (1 toque)
                </span>
              </div>
              <button
                type="button"
                onClick={handleImmediateGuestLogin}
                disabled={loading}
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer active:scale-95 shadow-xs shrink-0 flex items-center gap-1 disabled:opacity-50"
              >
                <span>Entrar Já</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Divisor */}
            <div className="relative flex items-center justify-center my-1">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                ou salvar na nuvem
              </span>
              <div className="border-t border-slate-200 w-full" />
            </div>

            {/* 2. SEÇÃO SECUNDÁRIA: SINCRONIZAÇÃO NA NUVEM (GOOGLE OU E-MAIL/USUÁRIO) */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                  Contas & Nuvem
                </span>
                <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Sincronização opcional
                </span>
              </div>

              {/* Botão Google com Adaptação para APK */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 font-extrabold text-xs rounded-xl shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loading ? 'Conectando...' : 'Conectar com Google'}</span>
              </button>

              {/* Botão Entrar com E-mail ou Usuário */}
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playClick();
                    onOpenAuth();
                  }}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-extrabold text-xs rounded-xl shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Entrar com Usuário ou E-mail</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================= PASSO 2: MATÉRIAS ESCOLARES ================= */}
        {step === 2 && (
          <div className="space-y-4 text-xs animate-in fade-in">
            <div className="text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">📚</span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Matérias da sua Escola
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sua escola tem matérias específicas separadas como <strong>Biologia, Física e Química</strong>?
                Selecione abaixo para adicioná-las aos seus estudos:
              </p>
            </div>

            {/* Ciências Específicas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                  <Atom className="w-3.5 h-3.5" />
                  <span>Ciências da Natureza Específicas</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectSciencePack}
                    className="text-[11px] text-indigo-600 hover:underline font-bold cursor-pointer"
                  >
                    Marcar as 3
                  </button>
                  <span className="text-slate-400">•</span>
                  <button
                    type="button"
                    onClick={handleClearSciencePack}
                    className="text-[11px] text-slate-500 hover:underline font-bold cursor-pointer"
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {scienceSubjects.map((s) => {
                  const isChecked = selectedSubjects.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSubject(s.id)}
                      className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-1 ring-indigo-500'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-2xl">{s.icon}</span>
                      <span className="text-xs font-bold block">{s.name}</span>
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          isChecked ? 'bg-indigo-600 text-white' : 'border border-slate-300'
                        }`}
                      >
                        {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              💡 As matérias básicas (Matemática, Português, Ciências geral, História, Geografia e Inglês) já vêm garantidas.
            </p>

            {/* Ações Passo 2 */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setStep(1);
                }}
                className="px-3.5 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>

              <button
                type="button"
                onClick={handleFinalizeStep3}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-98 cursor-pointer"
              >
                <span>Concluir e Começar</span>
                <Check className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

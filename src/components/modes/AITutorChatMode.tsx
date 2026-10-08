import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../../types';
import { GRADE_LABELS } from '../../data/curriculumData';
import { soundEffects } from '../../services/soundEffects';
import { speechNarrator } from '../../services/speechNarrator';
import {
  ArrowLeft,
  Send,
  Camera,
  MoreVertical,
  Trash2,
  Sparkles,
  Bot,
  Volume2,
  VolumeX,
  X,
  ShieldCheck,
  RefreshCw,
  Lightbulb,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  imageBase64?: string;
  mimeType?: string;
  timestamp: number;
  modelUsed?: string;
  provider?: string;
  fallbackTriggered?: boolean;
}

interface AITutorChatModeProps {
  user: UserProfile;
  onBack: () => void;
  onEarnPoints?: (points: number) => void;
}

const STORAGE_CHAT_KEY = 'estudahud_ai_tutor_chat_history_v2';
const STORAGE_OPENAI_KEY = 'estudahud_openai_api_key';
const STORAGE_CLAUDE_KEY = 'estudahud_claude_api_key';
const STORAGE_GROK_KEY = 'estudahud_grok_api_key';

export const AITutorChatMode: React.FC<AITutorChatModeProps> = ({
  user,
  onBack,
  onEarnPoints,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHAT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'welcome-tutor-socratic-1',
        role: 'model',
        text: `Olá, ${user.name || 'Estudante'}! Sou o seu Professor IA da Trilha do Saber. 🎓\n\n🛡️ **MÉTODO SOCRÁTICO DE ESTUDO**:\nMeu compromisso é fazer você aprender de verdade! Por isso, **eu não entrego respostas prontas nem gabaritos**.\n\n🔄 **SISTEMA DE IA RESILIENTE EM CASCATA**:\nNosso assistente conta com proteção contínua: se a cota do Gemini esgotar, alternamos automaticamente para OpenAI (GPTs), depois Anthropic (Claude), depois xAI (Grok) e motor local BNCC para seus estudos nunca pararem!\n\nSe você me mandar um exercício ou lição:\n• Explico o conceito por trás da matéria\n• Mostro o raciocínio em passos simples\n• Te dou pistas para você mesmo descobrir a solução!\n\nVocê também pode tirar foto do seu caderno ou apostila com a câmera 📷. O que vamos estudar agora?`,
        timestamp: Date.now(),
        modelUsed: 'gemini-3.1-flash-lite',
        provider: 'gemini',
      },
    ];
  });

  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeModelName, setActiveModelName] = useState<string>('gemini-3.1-flash-lite');
  const [activeProvider, setActiveProvider] = useState<string>('gemini');
  const [lastFallbackActive, setLastFallbackActive] = useState<boolean>(false);
  const [showCascadeModal, setShowCascadeModal] = useState<boolean>(false);

  // Optional personal custom API keys saved in browser
  const [customOpenAIKey, setCustomOpenAIKey] = useState<string>(() => localStorage.getItem(STORAGE_OPENAI_KEY) || '');
  const [customClaudeKey, setCustomClaudeKey] = useState<string>(() => localStorage.getItem(STORAGE_CLAUDE_KEY) || '');
  const [customGrokKey, setCustomGrokKey] = useState<string>(() => localStorage.getItem(STORAGE_GROK_KEY) || '');
  const [saveKeysNotice, setSaveKeysNotice] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSaveCustomKeys = () => {
    try {
      if (customOpenAIKey.trim()) localStorage.setItem(STORAGE_OPENAI_KEY, customOpenAIKey.trim());
      else localStorage.removeItem(STORAGE_OPENAI_KEY);

      if (customClaudeKey.trim()) localStorage.setItem(STORAGE_CLAUDE_KEY, customClaudeKey.trim());
      else localStorage.removeItem(STORAGE_CLAUDE_KEY);

      if (customGrokKey.trim()) localStorage.setItem(STORAGE_GROK_KEY, customGrokKey.trim());
      else localStorage.removeItem(STORAGE_GROK_KEY);

      setSaveKeysNotice('Chaves personalizadas salvas com sucesso!');
      soundEffects.playSuccess();
      setTimeout(() => setSaveKeysNotice(''), 3000);
    } catch {
      setSaveKeysNotice('Erro ao salvar localmente.');
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() && !selectedImage) return;

    soundEffects.playClick();
    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      text: textToSend.trim(),
      imageBase64: selectedImage || undefined,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setSelectedImage(null);
    setIsLoading(true);

    const aiMsgId = `msg_ai_${Date.now()}`;
    let accumulatedText = '';
    let detectedModel = 'gemini-3.1-flash-lite';
    let detectedProvider = 'gemini';
    let wasFallback = false;

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customOpenAIKey.trim()) headers['x-openai-key'] = customOpenAIKey.trim();
      if (customClaudeKey.trim()) headers['x-claude-key'] = customClaudeKey.trim();
      if (customGrokKey.trim()) headers['x-grok-key'] = customGrokKey.trim();

      const res = await fetch('/api/ai/tutor-chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          grade: user.grade,
          userName: user.name,
          message: textToSend,
          imageBase64: selectedImage || undefined,
          history: historyPayload,
          stream: true,
          openaiKey: customOpenAIKey.trim() || undefined,
          claudeKey: customClaudeKey.trim() || undefined,
          grokKey: customGrokKey.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('Falha na resposta do tutor');
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;
        let hasAppended = false;

        while (!done) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone) break;
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const dataContent = trimmed.replace(/^data:\s*/, '');
            if (dataContent === '[DONE]') {
              done = true;
              break;
            }
            try {
              const parsed = JSON.parse(dataContent);
              if (parsed.modelUsed) detectedModel = parsed.modelUsed;
              if (parsed.provider) detectedProvider = parsed.provider;
              if (parsed.fallbackTriggered) wasFallback = true;
              if (parsed.done) {
                done = true;
                break;
              }
              if (parsed.text) {
                accumulatedText += parsed.text;
                if (!hasAppended) {
                  hasAppended = true;
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: aiMsgId,
                      role: 'model',
                      text: accumulatedText,
                      timestamp: Date.now(),
                      modelUsed: detectedModel,
                      provider: detectedProvider,
                      fallbackTriggered: wasFallback,
                    },
                  ]);
                } else {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiMsgId
                        ? { ...m, text: accumulatedText, modelUsed: detectedModel, provider: detectedProvider, fallbackTriggered: wasFallback }
                        : m
                    )
                  );
                }
              }
            } catch {}
          }
        }
      } else {
        const data = await res.json();
        accumulatedText = data.text || data.reply || 'Entendido! Como posso te ajudar a avançar no raciocínio?';
        detectedModel = data.modelUsed || 'gemini-3.1-flash-lite';
        detectedProvider = data.provider || 'gemini';
        wasFallback = Boolean(data.fallbackTriggered);
        setMessages((prev) => [
          ...prev,
          {
            id: aiMsgId,
            role: 'model',
            text: accumulatedText,
            timestamp: Date.now(),
            modelUsed: detectedModel,
            provider: detectedProvider,
            fallbackTriggered: wasFallback,
          },
        ]);
      }

      setActiveModelName(detectedModel);
      setActiveProvider(detectedProvider);
      setLastFallbackActive(wasFallback);
      try {
        soundEffects.playLevelUp();
      } catch {}
      onEarnPoints?.(10);
    } catch (_err) {
      const fallbackMsg: ChatMessage = {
        id: `msg_fallback_${Date.now()}`,
        role: 'model',
        text:
          'Aqui na Trilha do Saber te ajudo a aprender com o raciocínio guiado! Tivemos uma oscilação na rede, mas vamos em frente: tente separar os dados da sua questão e me diga qual regra você acha que devemos aplicar!',
        timestamp: Date.now(),
        modelUsed: 'local-socratic-bncc',
        provider: 'local',
        fallbackTriggered: true,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      setActiveModelName('local-socratic-bncc');
      setActiveProvider('local');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearHistory = () => {
    soundEffects.playClick();
    setMessages([
      {
        id: 'msg_welcome_reset',
        role: 'model',
        text: `Chat reiniciado! Olá, ${user.name || 'Estudante'}! 🎓\n\nLembre-se: eu te explico o conceito e o passo a passo, sem entregar respostas prontas. Mande sua dúvida ou foto!`,
        timestamp: Date.now(),
        modelUsed: 'gemini-3.1-flash-lite',
        provider: 'gemini',
      },
    ]);
    setShowMenu(false);
  };

  const formatModelBadge = (model?: string, fallback?: boolean, provider?: string) => {
    const m = (model || '').toLowerCase();
    const p = (provider || '').toLowerCase();

    if (p === 'gemini' || m.includes('gemini')) {
      if (m.includes('3.1-flash-lite')) return '⚡ Gemini 3.1 Flash-Lite (Google)';
      if (m.includes('3.8-flash')) return '⚡ Gemini 3.8 Flash (Google)';
      return '⚡ Google Gemini (Principal)';
    }
    if (p === 'openai' || m.includes('gpt')) {
      if (m.includes('4o-mini')) return '🟢 OpenAI GPT-4o Mini (Fallback)';
      if (m.includes('4o')) return '🟢 OpenAI GPT-4o (Fallback)';
      return '🟢 OpenAI GPT (Fallback)';
    }
    if (p === 'claude' || m.includes('claude')) {
      if (m.includes('haiku')) return '🟠 Anthropic Claude 3.5 (Fallback)';
      return '🟠 Anthropic Claude (Fallback)';
    }
    if (p === 'grok' || m.includes('grok')) {
      if (m.includes('mini')) return '🟣 xAI Grok 2 Mini (Fallback)';
      return '🟣 xAI Grok (Fallback)';
    }
    if (p === 'deepseek' || m.includes('deepseek')) {
      return '🔵 DeepSeek V3 (Fallback)';
    }
    if (p === 'local' || m.includes('local') || m.includes('bncc')) {
      return '📘 Motor BNCC Local (Offline)';
    }
    return model || 'IA Educacional';
  };

  // Render text with math formula styling
  const renderMessageContent = (text: string) => {
    if (text.includes('$$')) {
      const parts = text.split('$$');
      return (
        <div className="space-y-2">
          {parts.map((part, index) => {
            if (index % 2 === 1) {
              return (
                <div
                  key={index}
                  className="my-2 p-3 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-center text-center shadow-2xs"
                >
                  <span className="font-mono text-sm font-black text-purple-700 tracking-wider">
                    {part
                      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) / ($2)')
                      .replace(/\\pm/g, '±')
                      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')}
                  </span>
                </div>
              );
            }
            return (
              <p key={index} className="whitespace-pre-line leading-relaxed">
                {part}
              </p>
            );
          })}
        </div>
      );
    }

    return <p className="whitespace-pre-line leading-relaxed">{text}</p>;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 text-slate-900 max-w-lg mx-auto w-full relative pb-2">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-20 shadow-xs">
        <button
          onClick={() => {
            soundEffects.playClick();
            onBack();
          }}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition cursor-pointer"
          title="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 border border-purple-300 flex items-center justify-center text-white text-base shadow-xs">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-slate-900">Professor IA Socrático</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[10px] text-purple-700 font-bold">
              Explica o conceito • Não dá resposta pronta
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition cursor-pointer"
            title="Mais opções"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-11 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-30 min-w-[160px]">
              <button
                onClick={handleClearHistory}
                className="w-full px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Conversa</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Socratic Guarantee & Multi-Model Fallback Banner (Clickable to open Cascade Info) */}
      <div className="px-3 py-2 bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 border-b border-purple-100 text-[11px] text-purple-900 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
          <span className="font-semibold truncate">
            Modo Socrático: te ensina a pensar passo a passo.
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            soundEffects.playClick();
            setShowCascadeModal(true);
          }}
          className="flex items-center gap-1 bg-white hover:bg-purple-100/70 border border-purple-200 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-purple-700 shrink-0 cursor-pointer shadow-2xs transition active:scale-95"
          title="Ver cascata resiliente de IA (Gemini -> GPT -> Claude -> Grok -> Local)"
        >
          <Sparkles className="w-3 h-3 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
          <span>{formatModelBadge(activeModelName, lastFallbackActive, activeProvider)}</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-3xl p-4 text-xs font-medium shadow-xs transition-all relative group ${
                  isUser
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-xs shadow-purple-200'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                }`}
              >
                {msg.imageBase64 && (
                  <img
                    src={msg.imageBase64}
                    alt="Foto do caderno/material escolar"
                    className="max-h-52 w-auto rounded-2xl mb-2 object-cover border border-slate-200"
                  />
                )}
                {renderMessageContent(msg.text)}

                {/* AI Footer with model badge and voice button */}
                {!isUser && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        const cleanText = msg.text
                          .replace(/\[MATH\][\s\S]*?\[\/MATH\]/g, 'fórmula matemática')
                          .replace(/\$\$/g, '');
                        speechNarrator.speak(cleanText);
                      }}
                      className="text-[10px] text-slate-500 hover:text-purple-700 flex items-center gap-1 transition cursor-pointer"
                      title="Ouvir explicação em voz alta"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Ouvir explicação</span>
                    </button>
                    <span className="text-[9px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                      {formatModelBadge(msg.modelUsed, msg.fallbackTriggered, msg.provider)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-purple-200 rounded-3xl rounded-bl-xs p-3.5 flex items-center gap-2 text-slate-600 text-xs shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse delay-75" />
              <span className="w-2 h-2 rounded-full bg-pink-600 animate-pulse delay-150" />
              <span className="ml-1 text-slate-600 font-semibold">
                Professor IA analisando e formulando raciocínio...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestion Chips */}
      {messages.length <= 3 && (
        <div className="px-3 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            'Me dá a resposta de 2x + 6 = 20?',
            'Como fazer Bhaskara passo a passo?',
            'Explique a regra da crase',
            'O que é fotossíntese?',
            'Dica para interpretar texto',
            'Como funciona a Revolução Francesa?',
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => {
                soundEffects.playClick();
                handleSendMessage(suggestion);
              }}
              className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-white hover:bg-purple-50 text-purple-900 border border-purple-200 whitespace-nowrap shrink-0 transition active:scale-95 shadow-2xs cursor-pointer flex items-center gap-1"
            >
              <Lightbulb className="w-3 h-3 text-amber-500" />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      )}

      {/* Selected Image Preview */}
      {selectedImage && (
        <div className="px-4 py-2 flex items-center gap-2 bg-purple-50 border-t border-purple-200">
          <div className="relative">
            <img
              src={selectedImage}
              alt="Foto do caderno"
              className="w-12 h-12 rounded-xl object-cover border border-purple-400 shadow-2xs"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1">
            <span className="text-xs text-purple-900 font-bold block">Foto anexada!</span>
            <span className="text-[10px] text-purple-600">
              O Professor analisará o conteúdo sem entregar gabaritos diretos.
            </span>
          </div>
        </div>
      )}

      {/* Bottom Input Area */}
      <div className="p-3 bg-white border-t border-slate-200 shadow-lg">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-200 rounded-full px-3 py-1.5 transition">
          {/* Camera Button */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-full transition cursor-pointer"
            title="Tirar foto do caderno, livro ou lição"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageCapture}
          />

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Digite sua dúvida ou peça para explicar um exercício..."
            className="flex-1 bg-transparent text-slate-900 text-xs outline-hidden placeholder:text-slate-400 py-1"
          />

          {/* Send Button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() && !selectedImage}
            className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-full transition shadow-xs cursor-pointer active:scale-95"
            title="Enviar para o Professor IA"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {/* Modal de Cascata Inteligente de IAs & Chaves Personalizadas */}
      {showCascadeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 text-slate-900 w-full max-w-md rounded-3xl p-5 shadow-2xl relative my-auto space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">
                    Cascata Resiliente de IAs
                  </h3>
                  <p className="text-[11px] text-purple-700 font-bold">
                    Proteção contínua contra queda ou fim de cota
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCascadeModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explicação da Cascata Automática */}
            <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-2xl text-xs space-y-2 text-purple-950">
              <p className="font-semibold leading-relaxed">
                Quando a API do <strong>Gemini</strong> atinge limite temporário ou cota de requisições, o assistente aciona automaticamente e sem travar a API dos <strong>GPTs (OpenAI)</strong>, depois do <strong>Claude (Anthropic)</strong>, depois do <strong>Grok (xAI)</strong>, e em último caso o <strong>Motor BNCC Local</strong>:
              </p>

              {/* Diagrama da Cascata */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-purple-200/80 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">1º</span>
                    <span className="font-black text-slate-900 text-xs">Google Gemini</span>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">Principal (Ultra-Rápido ⚡)</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">2º</span>
                    <span className="font-black text-slate-900 text-xs">OpenAI GPT (gpt-4o-mini)</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Fallback 1 🟢</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-black flex items-center justify-center">3º</span>
                    <span className="font-black text-slate-900 text-xs">Anthropic Claude (3.5 Haiku)</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">Fallback 2 🟠</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center">4º</span>
                    <span className="font-black text-slate-900 text-xs">xAI Grok (grok-2-mini)</span>
                  </div>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">Fallback 3 🟣</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-[10px] font-black flex items-center justify-center">5º</span>
                    <span className="font-black text-slate-900 text-xs">Motor BNCC Local</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">100% Offline 📘</span>
                </div>
              </div>
            </div>

            {/* Chaves Personalizadas Opcionais (para desenvolvedores ou uso próprio) */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">
                  Chaves de API Opcionais (Salvas no seu navegador):
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Se você tiver suas próprias chaves de OpenAI, Claude ou Grok, pode colá-las abaixo para prioridade:
              </p>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                    OpenAI API Key (sk-...):
                  </label>
                  <input
                    type="password"
                    value={customOpenAIKey}
                    onChange={(e) => setCustomOpenAIKey(e.target.value)}
                    placeholder="sk-proj-..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                    Anthropic Claude API Key (sk-ant-...):
                  </label>
                  <input
                    type="password"
                    value={customClaudeKey}
                    onChange={(e) => setCustomClaudeKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                    xAI Grok API Key (xai-...):
                  </label>
                  <input
                    type="password"
                    value={customGrokKey}
                    onChange={(e) => setCustomGrokKey(e.target.value)}
                    placeholder="xai-..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              {saveKeysNotice && (
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{saveKeysNotice}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveCustomKeys}
                  className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Salvar Chaves
                </button>
                <button
                  type="button"
                  onClick={() => setShowCascadeModal(false)}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

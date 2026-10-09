# 📚 Trilha do Saber — Plataforma Educacional (Web & Android)

> **Plataforma Educacional Completa, Interativa e Gamificada alinhada à BNCC**  
> *"Aprenda. Pratique. Evolua — Disponível na Web (PWA / GitHub Pages) e em Aplicativo Nativo Android (APK / Google Play Store)."*

O **Trilha do Saber** é uma plataforma educacional desenvolvida com **React 19, TypeScript, Vite 6, Tailwind CSS v4 e Capacitor 8**. Foi projetada com uma arquitetura híbrida de alto desempenho que permite tanto a execução como **aplicação web estática e PWA**, quanto a compilação como **aplicativo nativo Android (APK / AAB)** pronto para distribuição e publicação na Google Play Store.

---

## 🌟 1. Principais Recursos Educacionais

- 🗺️ **Jornada de Aprendizagem BNCC**: Trilhas curriculares do 1º ao 9º ano do Ensino Fundamental e Ensino Médio/ENEM.
- 📝 **Simulados & Exercícios**: Questões com correção automática imediata, gabarito explicado e pontuação de XP.
- 📸 **Criador de Provas por Foto**: Digitalização com foto da prova via câmera ou arquivo, leitura e correção de gabaritos.
- 🤖 **Professor & Tutor IA**: Explicações didáticas socráticas passo a passo com síntese de áudio e fallbacks pedagógicos.
- 📄 **Caderno Digital de Resumos em PDF**: Download e impressão direta de apostilas geradas via `jspdf`.
- ♟️ **Xadrez Escolar Completo**: Tabuleiro interativo (`chess.js`), partidas contra robôs com vários níveis e quebra-cabeças táticos.
- 🎮 **Jogos & Desafios**: Caça-palavras, jogo da memória, tabuada relâmpago e palavras cruzadas.
- 🏆 **Gamificação & Conquistas**: Ofensiva diária de estudos, medalhas desbloqueáveis, níveis de experiência e ranking.
- 🎨 **Interface Moderna**: Suporte completo a Modo Claro e Modo Escuro, design responsivo para telas pequenas e grandes.
- 📱 **Experiência Nativa Android**: Tratamento do botão Voltar do sistema, SplashScreen oficial, suporte offline e desempenho otimizado.

---

## ⚙️ 2. Arquitetura Multiplataforma

O projeto compartilha a mesma base de código para Web e Android:

| Recurso | Versão Web / PWA | Versão Android (Capacitor) |
| :--- | :--- | :--- |
| **Identificador / ID** | Trilha do Saber (`id: /?source=pwa`) | `com.trilhadosaber.app` |
| **Ponto de Distribuição** | GitHub Pages / Vercel / PWA | Google Play Store (`.aab`) / APK (`.apk`) |
| **Persistência de Dados** | `localStorage` + Firebase Firestore | `localStorage` + Firebase Firestore |
| **Botão Voltar** | Navegação padrão do navegador | Fechamento inteligente de modais e retorno à tela inicial |
| **Câmera & Mídia** | HTML5 File Input / MediaStream | HTML5 + Permissões Android integradas |
| **Modo Offline** | Service Worker (`sw.js`) | Assets compilados em `assets/public/` |

---

## 💻 3. Desenvolvimento Local

### Pré-requisitos
- **Node.js**: Versão 20 LTS (ou 18+)
- **npm**: Versão 10+
- **JDK (para Android)**: Java 21 (Temurin ou OpenJDK)
- **Android Studio** (opcional, para emulador e depuração visual)

### Instalação e Execução:
```bash
# 1. Instalar dependências em sincronia com o package-lock.json
npm ci

# 2. Executar o servidor de desenvolvimento local
npm run dev
```

Acesse a aplicação no navegador em **`http://localhost:3000`**.

---

## 📦 4. Scripts e Comandos de Compilação

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor local de desenvolvimento. |
| `npm run lint` | Executa a verificação estrita de tipagem TypeScript (`tsc --noEmit`). |
| `npm run build:pages` | Compila os assets estáticos web para a pasta `dist/` (usado pelo GitHub Pages e Capacitor). |
| `npm run build:android` | Compila o build web e executa a sincronização com o projeto nativo Android (`npx cap sync android`). |
| `npm run build` | Compila os assets web e gera o bundle para servidor Node.js opcional (`dist/server.cjs`). |
| `npm run cap:sync` | Sincroniza a pasta `dist/` e plugins com o diretório nativo `android/`. |

---

## 🤖 5. Compilação do Aplicativo Android (APK e AAB)

O projeto nativo está localizado no diretório **`android/`**.

### Passo 1: Compilar os assets web e sincronizar
```bash
npm run build:pages
npx cap sync android
```

### Passo 2: Gerar o APK de Teste (Debug)
```bash
cd android
./gradlew assembleDebug
```
O arquivo APK será gerado em:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Passo 3: Gerar o App Bundle para a Google Play Store (Release AAB)
```bash
cd android
./gradlew bundleRelease
```
O arquivo de pacote será gerado em:
`android/app/build/outputs/bundle/release/app-release.aab`

---

## 🔐 6. Configuração da Assinatura de Release (Google Play Store)

Para gerar pacotes de release assinados automaticamente pelo GitHub Actions ou localmente, é necessário configurar um arquivo de chaves (`keystore`).

### Como criar a chave de assinatura (caso ainda não possua):
```bash
keytool -genkey -v -keystore release.keystore -alias trilha-alias -keyalg RSA -keysize 2048 -validity 10000
```

### Como configurar os GitHub Secrets no repositório:
1. Converta seu arquivo `release.keystore` para base64:
   ```bash
   base64 -w 0 release.keystore > keystore_base64.txt
   ```
2. No seu repositório no GitHub, vá em **Settings** > **Secrets and variables** > **Actions** > **New repository secret**.
3. Crie os 4 segredos a seguir:
   - `ANDROID_KEYSTORE_BASE64`: Cole o conteúdo gerado em base64.
   - `KEYSTORE_PASSWORD`: A senha que você definiu para o arquivo keystore.
   - `KEY_ALIAS`: O alias da sua chave (ex: `trilha-alias`).
   - `KEY_PASSWORD`: A senha da chave (frequentemente a mesma da keystore).

> **Aviso Importante**: Se esses segredos não estiverem configurados no GitHub, o workflow compilará o AAB no modo padrão não assinado (*unsigned*). Nunca envie arquivos `.keystore` com senhas diretamente para o repositório público.

---

## 🚀 7. Automação com GitHub Actions

O repositório possui dois fluxos de trabalho automatizados:

1. **Deploy no GitHub Pages** (`.github/workflows/deploy.yml`):
   - Compila os arquivos estáticos (`npm run build:pages`).
   - Publica o site automaticamente no GitHub Pages a cada push na branch principal.

2. **Compilação Android APK & AAB** (`.github/workflows/android-build.yml`):
   - Executa `npm ci` e validação TypeScript (`npm run lint`).
   - Gera o build web e sincroniza o Capacitor (`npx cap sync android`).
   - Valida que `assets/public/index.html` e `capacitor.config.json` foram devidamente copiados.
   - Compila o **Debug APK** e inspeciona se o pacote contém os arquivos web obrigatórios.
   - Compila o **Release AAB** (com assinatura caso os secrets estejam preenchidos).
   - Exporta os artefatos `app-debug` e `app-release-bundle`.

---

## 📂 8. Estrutura do Repositório

```text
/
├── .github/
│   └── workflows/
│       ├── deploy.yml            # Publicação automática no GitHub Pages
│       └── android-build.yml     # Compilação e validação do APK e AAB Android
├── android/                      # Projeto nativo Android (Gradle + Capacitor)
│   ├── app/
│   │   ├── build.gradle          # Configurações de compilação, SDK e assinatura de release
│   │   ├── google-services.json  # Configuração do Firebase Android
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── assets/           # Destino dos assets web compilados e capacitor.config.json
│   │       └── res/              # Ícones adaptativos (mipmap) e telas de abertura
│   ├── build.gradle              # Configurações raiz do Gradle
│   └── variables.gradle          # Definições de SDK (compileSdk 36, targetSdk 36, minSdk 24)
├── capacitor.config.ts           # Configuração oficial única do Capacitor (@capacitor/cli)
├── public/                       # Arquivos estáticos públicos e Service Worker
├── src/                          # Código fonte da aplicação React + TypeScript
│   ├── components/               # Componentes visuais, modais e modos interativos
│   ├── services/                 # Serviços de banco de dados, áudio, IA e tarefas
│   └── App.tsx                   # Componente raiz com roteamento e controle de botão Voltar
├── package.json                  # Dependências e scripts npm
├── package-lock.json             # Árvore de dependências determinística e sincronizada
├── tsconfig.json                 # Configurações do compilador TypeScript
└── vite.config.ts                # Configurações do Vite (caminhos relativos e plugins)
```

---

**Trilha do Saber** — Educação transformadora, acessível a qualquer momento na web e no celular! 🎓✨

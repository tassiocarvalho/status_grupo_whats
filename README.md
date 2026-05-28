# 📲 WhatsApp Status Bot

> **Poste fotos e vídeos no status do seu grupo do WhatsApp direto pelo terminal — em qualquer sistema operacional.**

```
╔══════════════════════════════════════════════╗
║   🤖 Termux  🐧 Linux  🪟 Windows  🍎 macOS  ║
╚══════════════════════════════════════════════╝
```

---

## ✨ O que esse bot faz?

- 📸 **Posta imagens e vídeos** no status de grupos do WhatsApp
- 🔄 **Converte vídeos automaticamente** com ffmpeg para garantir compatibilidade
- 📝 **Suporte a legendas** (digitada no terminal ou lida de arquivo `.txt`)
- 🖼️ **Seletor gráfico de arquivos** nativo para cada sistema operacional
- 🔁 **Posta quantas vezes quiser** de uma só vez
- 🔗 **Vincula via código de pareamento** (sem precisar escanear QR code)
- 🧹 **Logs limpos** — sem spam de mensagens internas do Baileys no terminal

---

## 📋 Pré-requisitos

| Dependência | Versão mínima | Para quê |
|---|---|---|
| [Node.js](https://nodejs.org) | v18+ | Rodar o bot |
| [ffmpeg](https://ffmpeg.org) | qualquer | Converter vídeos (opcional, mas recomendado) |

---

## 🚀 Instalação

### 🤖 Termux (Android)

```bash
# Atualizar pacotes
pkg update && pkg upgrade -y

# Instalar Node.js e ffmpeg
pkg install nodejs ffmpeg -y

# Clonar o projeto
git clone https://github.com/seu-usuario/seu-repo.git
cd seu-repo

# Instalar dependências
npm install

# Rodar
node index.js
```

---

### 🐧 Linux (Ubuntu/Debian)

```bash
# Instalar Node.js (via NVM, recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20

# Instalar ffmpeg
sudo apt install ffmpeg -y

# Instalar seletor gráfico (escolha um)
sudo apt install zenity -y      # GNOME
# ou
sudo apt install yad -y         # alternativa
# ou
sudo apt install kdialog -y     # KDE

# Clonar e instalar
git clone https://github.com/seu-usuario/seu-repo.git
cd seu-repo
npm install

node index.js
```

---

### 🪟 Windows

1. Baixe e instale o [Node.js LTS](https://nodejs.org)
2. Baixe o [ffmpeg](https://ffmpeg.org/download.html) e adicione ao PATH
3. Abra o **PowerShell** ou **Prompt de Comando**:

```powershell
git clone https://github.com/seu-usuario/seu-repo.git
cd seu-repo
npm install
node index.js
```

> O seletor de arquivo abre automaticamente via PowerShell — sem necessidade de instalar nada extra.

---

### 🍎 macOS

```bash
# Instalar Homebrew (se não tiver)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar dependências
brew install node ffmpeg

# Clonar e instalar
git clone https://github.com/seu-usuario/seu-repo.git
cd seu-repo
npm install

node index.js
```

---

## 🔗 Primeira conexão (pareamento)

Na primeira vez que rodar, o bot vai pedir seu número de telefone:

```
Digite seu número (ex: 5518981938689): 5511999998888
```

Após digitar:

```
🔑 CODE: ABC-1234
```

**No WhatsApp do seu celular:**

> Configurações → Aparelhos conectados → Conectar com número de telefone

Digite o código exibido e pronto — o bot está conectado. ✅

---

## 🗂️ Estrutura de arquivos

```
.
├── index.js               # Código principal do bot
├── legenda_status.txt     # Edite aqui para usar legenda salva
├── auth_info_baileys/     # Sessão salva (gerada automaticamente)
└── package.json
```

---

## 📝 Usando legenda pelo arquivo

Edite o arquivo `legenda_status.txt` com o texto que quer usar como legenda padrão:

```
Bom dia! ☀️
Hoje vai ser incrível.
```

Na hora de postar, escolha a opção `(1) Usar texto do arquivo`.

---

## 🎬 Sobre a conversão de vídeo

O bot usa **ffmpeg** para recodificar vídeos antes de enviar, garantindo compatibilidade com o WhatsApp:

- Resolução limitada a 720p
- Codec: H.264 baseline (compatível com todos os dispositivos)
- Áudio: AAC 96kbps
- Container: MP4 faststart

> ⚠️ Arquivos acima de **15MB** podem ser rejeitados pelo WhatsApp.

Se o ffmpeg não estiver instalado, o bot tentará enviar o arquivo original sem conversão.

---

## 🛠️ Dependências npm

```json
{
  "gifted-baileys": "...",
  "pino": "..."
}
```

Instale com:

```bash
npm install gifted-baileys pino
```

---

## ❓ Dúvidas frequentes

**O código de pareamento não aparece:**
Verifique se o número foi digitado com DDI e DDD, sem espaços ou símbolos. Ex: `5511999998888`.

**Erro ao converter vídeo:**
Instale o ffmpeg conforme as instruções do seu sistema operacional.

**Seletor gráfico não abre no Linux:**
Instale o `zenity` (`sudo apt install zenity`) ou use a opção de digitar o caminho manualmente.

**Bot desconecta sozinho:**
O bot tenta reconectar automaticamente. Se for deslogado, delete a pasta `auth_info_baileys/` e faça o pareamento novamente.

---

## ⚖️ Aviso

Este projeto é para fins educacionais. O uso de automações no WhatsApp pode violar os Termos de Serviço da plataforma. Use com responsabilidade.

---

<p align="center">Feito com ☕ e Node.js</p>

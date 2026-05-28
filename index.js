// ─── SILENCIAR LOGS DO BAILEYS ───────────────────────────────
const RUIDO = [
    'Closing session', 'SessionEntry', '_chains', 'registrationId',
    'currentRatchet', 'ephemeralKeyPair', 'lastRemoteEphemeralKey',
    'previousCounter', 'rootKey', 'indexInfo', 'pendingPreKey',
    'signedKeyId', 'baseKey', 'preKeyId', 'remoteIdentityKey',
    'chainKey', 'chainType', 'messageKeys', '<Buffer', 'pubKey',
    'privKey', 'baseKeyType', 'closed:', 'used:', 'created:',
    'Failed to decrypt', 'Session error', 'Bad MAC',
    'verifyMAC', 'doDecryptWhisperMessage', 'decryptWithSessions',
    'session_cipher', 'queue_job', '_asyncQueueExecutor',
    'libsignal', 'crypto.js', 'awaitable', 'at Object.',
    'at SessionCipher', 'at async', 'at async _async'
];

const ehRuido = (s) => RUIDO.some(p => String(s).includes(p));

const _stdout = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, ...a) => ehRuido(chunk) ? true : _stdout(chunk, ...a);

const _stderr = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk, ...a) => ehRuido(chunk) ? true : _stderr(chunk, ...a);

const _log = console.log.bind(console);
console.log = (...a) => { if (!ehRuido(a.join(' '))) _log(...a); };

const _err = console.error.bind(console);
console.error = (...a) => { if (!ehRuido(a.join(' '))) _err(...a); };

// ─── DEPENDÊNCIAS ─────────────────────────────────────────────
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('gifted-baileys');
const pino = require('pino');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { spawn, execSync, spawnSync } = require('child_process');
const os = require('os');

process.on('uncaughtException', (err) => {
    if (err.code === 'ENOENT') return;
    console.error('Erro ignorado:', err.message);
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

const ARQUIVO_LEGENDA = './legenda_status.txt';
const TMP_MIDIA = path.join(os.tmpdir(), 'status_midia_tmp');

if (!fs.existsSync(ARQUIVO_LEGENDA)) {
    fs.writeFileSync(ARQUIVO_LEGENDA, 'Escreva sua legenda aqui...', 'utf8');
}

// ─── DETECÇÃO DE OS ───────────────────────────────────────────
function detectarOS() {
    const plat = process.platform;

    // Termux: Android com $PREFIX apontando para /data/data/com.termux
    if (process.env.PREFIX && process.env.PREFIX.includes('com.termux')) return 'termux';
    if (plat === 'win32') return 'windows';
    if (plat === 'darwin') return 'macos';
    if (plat === 'linux') return 'linux';
    return 'unknown';
}

const OS_ATUAL = detectarOS();
const OS_LABELS = { termux: '🤖 Termux (Android)', windows: '🪟 Windows', macos: '🍎 macOS', linux: '🐧 Linux', unknown: '❓ Desconhecido' };

// ─── SELETOR DE ARQUIVO POR OS ───────────────────────────────
async function pickFile() {
    const tmpPath = TMP_MIDIA + '_orig';
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);

    if (OS_ATUAL === 'termux') {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);

        spawn('termux-storage-get', [tmpPath], {
            detached: true,
            stdio: 'ignore'
        }).unref();

        console.log('📂 Selecione o arquivo na galeria e pressione ENTER quando terminar...');
        await question('');
        await new Promise(r => setTimeout(r, 1000));

        if (fs.existsSync(tmpPath)) return tmpPath;
        console.log('❌ Nenhum arquivo selecionado.');
        return null;
    }

    if (OS_ATUAL === 'windows') {
        return new Promise((resolve) => {
            console.log('\n📂 Abrindo seletor de arquivo (Windows)...');
            // PowerShell file picker
            const ps = `
Add-Type -AssemblyName System.Windows.Forms
$f = New-Object System.Windows.Forms.OpenFileDialog
$f.Title = "Selecionar mídia para status"
$f.Filter = "Mídia|*.jpg;*.jpeg;*.png;*.gif;*.mp4;*.3gp;*.mkv;*.webp|Todos|*.*"
$f.ShowDialog() | Out-Null
Write-Output $f.FileName
`;
            try {
                const result = spawnSync('powershell', ['-Command', ps], { encoding: 'utf8', timeout: 60000 });
                const filePath = result.stdout.trim();
                if (filePath && fs.existsSync(filePath)) resolve(filePath);
                else { console.log('❌ Nenhum arquivo selecionado.'); resolve(null); }
            } catch (e) {
                console.log('❌ Erro ao abrir seletor Windows:', e.message);
                resolve(null);
            }
        });
    }

    if (OS_ATUAL === 'linux') {
        return new Promise((resolve) => {
            console.log('\n📂 Abrindo seletor de arquivo (Linux)...');

            // Tenta zenity, depois yad, depois kdialog
            const pickers = [
                { cmd: 'zenity', args: ['--file-selection', '--title=Selecionar mídia para status', '--file-filter=Mídia | *.jpg *.jpeg *.png *.gif *.mp4 *.3gp *.mkv *.webp', '--file-filter=Todos | *'] },
                { cmd: 'yad',    args: ['--file-selection', '--title=Selecionar mídia', '--mime-type=image/*,video/*'] },
                { cmd: 'kdialog', args: ['--getopenfilename', '.', 'Mídia (*.jpg *.jpeg *.png *.gif *.mp4 *.mkv *.webp)'] },
            ];

            let tried = 0;
            const tryNext = () => {
                if (tried >= pickers.length) {
                    console.log('❌ Nenhum seletor gráfico encontrado (zenity/yad/kdialog). Digite o caminho manualmente.');
                    resolve(null);
                    return;
                }
                const { cmd, args } = pickers[tried++];
                try {
                    const result = spawnSync(cmd, args, { encoding: 'utf8', timeout: 60000 });
                    const filePath = (result.stdout || '').trim();
                    if (filePath && fs.existsSync(filePath)) resolve(filePath);
                    else tryNext();
                } catch { tryNext(); }
            };
            tryNext();
        });
    }

    if (OS_ATUAL === 'macos') {
        return new Promise((resolve) => {
            console.log('\n📂 Abrindo seletor de arquivo (macOS)...');
            const script = `set f to choose file with prompt "Selecionar mídia para status" of type {"public.image","public.movie"}\nreturn POSIX path of f`;
            try {
                const result = spawnSync('osascript', ['-e', script], { encoding: 'utf8', timeout: 60000 });
                const filePath = (result.stdout || '').trim();
                if (filePath && fs.existsSync(filePath)) resolve(filePath);
                else { console.log('❌ Nenhum arquivo selecionado.'); resolve(null); }
            } catch (e) {
                console.log('❌ Erro ao abrir seletor macOS:', e.message);
                resolve(null);
            }
        });
    }

    console.log(`❌ OS não suportado para seleção automática (${OS_ATUAL}).`);
    return null;
}

// ─── FALLBACK: digitar caminho manualmente ────────────────────
async function selecionarArquivo() {
    console.log(`\n🖥️  Sistema detectado: ${OS_LABELS[OS_ATUAL]}`);
    console.log('\nComo deseja selecionar a mídia?');
    console.log('  (1) Abrir galeria/seletor automático');
    console.log('  (2) Digitar caminho manualmente');
    console.log('  (v) Voltar');

    const op = await question('Escolha: ');
    if (op.trim().toLowerCase() === 'v') return null;

    if (op.trim() === '1') {
        const arquivo = await pickFile();
        if (arquivo) return arquivo;
        // Se falhou, oferece fallback
        console.log('\n⚠️  Seletor automático falhou. Tente digitar o caminho.');
        return selecionarArquivo();
    }

    if (op.trim() === '2') {
        const caminho = await question('\nDigite o caminho completo do arquivo (v para voltar): ');
        if (caminho.trim().toLowerCase() === 'v') return selecionarArquivo();
        const c = caminho.trim().replace(/^["']|["']$/g, ''); // remove aspas se houver
        if (!fs.existsSync(c)) {
            console.log('❌ Arquivo não encontrado:', c);
            return selecionarArquivo();
        }
        return c;
    }

    console.log('Inválido.');
    return selecionarArquivo();
}

// ─── DETECÇÃO DE TIPO DE MÍDIA ────────────────────────────────
function detectarTipoMidia(filePath) {
    // Tenta pela extensão primeiro
    const ext = path.extname(filePath).toLowerCase();
    const fotos = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.heic', '.heif'];
    const videos = ['.mp4', '.3gp', '.mkv', '.mov', '.avi', '.webm', '.ts', '.flv'];

    if (fotos.includes(ext)) return 'imagem';
    if (videos.includes(ext)) return 'video';

    // Sem extensão (comum no Termux): lê magic bytes
    try {
        const buf = Buffer.alloc(12);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buf, 0, 12, 0);
        fs.closeSync(fd);
        const hex = buf.toString('hex').toUpperCase();

        if (hex.startsWith('FFD8FF')) return 'imagem';           // JPEG
        if (hex.startsWith('89504E47')) return 'imagem';         // PNG
        if (hex.startsWith('47494638')) return 'imagem';         // GIF
        if (hex.startsWith('424D')) return 'imagem';             // BMP
        if (hex.startsWith('52494646') && buf.slice(8,12).toString('ascii') === 'WEBP') return 'imagem'; // WEBP
        if (['ftyp','moov','mdat','free','wide'].includes(buf.slice(4,8).toString('ascii'))) return 'video'; // MP4/MOV
        if (buf.slice(8,12).toString('ascii').toLowerCase().startsWith('3gp')) return 'video'; // 3GP
        if (hex.startsWith('1A45DFA3')) return 'video';          // MKV/WEBM
        if (hex.startsWith('52494646') && buf.slice(8,12).toString('ascii') === 'AVI ') return 'video'; // AVI
    } catch (e) { /* ignora */ }

    // Fallback: assume imagem (mais comum na galeria)
    console.log('⚠️  Formato não identificado, assumindo imagem...');
    return 'imagem';
}

// ─── CONVERSÃO DE VÍDEO (se necessário) ──────────────────────
// Resolve o caminho do ffmpeg considerando o PATH do Termux
function resolverFfmpeg() {
    const candidatos = [
        'ffmpeg',
        '/data/data/com.termux/files/usr/bin/ffmpeg',
        '/usr/bin/ffmpeg',
        '/usr/local/bin/ffmpeg',
    ];
    for (const bin of candidatos) {
        try {
            execSync(`${bin} -version`, {
                stdio: 'ignore',
                env: { ...process.env, PATH: `/data/data/com.termux/files/usr/bin:${process.env.PATH || ''}` }
            });
            return bin;
        } catch {}
    }
    return null;
}

async function converterVideoSeNecessario(filePath) {
    const saida = TMP_MIDIA + '_conv.mp4';

    const ffmpeg = resolverFfmpeg();
    if (!ffmpeg) {
        console.log('⚠️  ffmpeg não encontrado. Instale com: pkg install ffmpeg');
        // Sem ffmpeg, tenta enviar o arquivo original
        return filePath;
    }

    console.log('🔄 Convertendo vídeo para WhatsApp...');

    const env = { ...process.env, PATH: `/data/data/com.termux/files/usr/bin:${process.env.PATH || ''}` };

    // scale=720:-2  →  limita largura a 720px, altura proporcional divisível por 2
    // Para portrait (h>w) isso pode deixar altura >720 — adicionamos um segundo filtro
    // que limita pelo lado maior: scale=w=min(720\,iw):h=-2 e depois scale=-2:min(720\,ih)
    // Solução mais simples e compatível com ffmpeg do Termux:
    const args = [
        '-y',
        '-i', filePath,
        '-vf', 'scale=-2:720',
        '-c:v', 'libx264',
        '-profile:v', 'baseline',
        '-level', '3.1',
        '-pix_fmt', 'yuv420p',
        '-preset', 'fast',
        '-crf', '28',
        '-bf', '0',
        '-g', '30',
        '-c:a', 'aac',
        '-b:a', '96k',
        '-ar', '44100',
        '-ac', '2',
        '-movflags', '+faststart',
        '-f', 'mp4',
        saida
    ];

    return new Promise((resolve) => {
        const proc = spawn(ffmpeg, args, { stdio: 'inherit', env });
        proc.on('close', (code) => {
            if (code === 0 && fs.existsSync(saida)) {
                const kb = Math.round(fs.statSync(saida).size / 1024);
                console.log(`✅ Conversão concluída. Tamanho: ${kb}KB`);
                if (kb > 15360) console.log('⚠️  Arquivo acima de 15MB — WhatsApp pode rejeitar.');
                resolve(saida);
            } else {
                console.log('❌ Conversão ffmpeg falhou. Tentando enviar original...');
                resolve(filePath);
            }
        });
        proc.on('error', (e) => {
            console.log('❌ Erro ao executar ffmpeg:', e.message);
            resolve(filePath);
        });
    });
}

// ─── MENU DE LEGENDA ──────────────────────────────────────────
async function menuLegenda() {
    console.log('\nQual legenda deseja usar?');
    console.log(`  (1) Usar texto do arquivo (${ARQUIVO_LEGENDA})`);
    console.log('  (2) Digitar no terminal');
    console.log('  (3) Sem legenda');
    console.log('  (v) Voltar');

    const op = await question('Escolha: ');
    if (op.trim().toLowerCase() === 'v') return undefined; // undefined = voltar

    if (op.trim() === '1') {
        const texto = fs.readFileSync(ARQUIVO_LEGENDA, 'utf8').trim();
        if (!texto || texto === 'Escreva sua legenda aqui...') {
            console.log(`\n❌ Arquivo "${ARQUIVO_LEGENDA}" vazio ou não editado.`);
            return menuLegenda();
        }
        console.log('\n📄 Legenda:\n' + texto);
        return texto;
    }

    if (op.trim() === '2') {
        const texto = await question('\nDigite a legenda (v para voltar): ');
        if (texto.trim().toLowerCase() === 'v') return menuLegenda();
        return texto.trim() || '';
    }

    if (op.trim() === '3') return '';

    console.log('Inválido.');
    return menuLegenda();
}

// ─── MIME TYPE ────────────────────────────────────────────────
function getMime(filePath, tipo) {
    const ext = path.extname(filePath).toLowerCase();
    if (tipo === 'imagem') {
        if (ext === '.png') return 'image/png';
        if (ext === '.webp') return 'image/webp';
        if (ext === '.gif') return 'image/gif';
        // Sem extensão: lê magic bytes para diferenciar PNG/JPEG
        if (!ext) {
            try {
                const buf = Buffer.alloc(4);
                const fd = fs.openSync(filePath, 'r');
                fs.readSync(fd, buf, 0, 4, 0);
                fs.closeSync(fd);
                if (buf.toString('hex').toUpperCase().startsWith('89504E47')) return 'image/png';
                if (buf.toString('hex').toUpperCase().startsWith('47494638')) return 'image/gif';
            } catch {}
        }
        return 'image/jpeg';
    }
    if (tipo === 'video') {
        if (ext === '.3gp') return 'video/3gpp';
        return 'video/mp4';
    }
    return 'application/octet-stream';
}

// ─── POSTAR STATUS ────────────────────────────────────────────
async function postarStatus(sock, groupId, filePath, legenda, tipo, vezes) {
    const mime = getMime(filePath, tipo);

    for (let i = 0; i < vezes; i++) {
        try {
            const buffer = fs.readFileSync(filePath);
            if (tipo === 'imagem') {
                await sock.sendMessage(groupId, {
                    groupStatusMessage: {
                        image: buffer,
                        caption: legenda,
                        mimetype: mime
                    }
                });
            } else if (tipo === 'video') {
                await sock.sendMessage(groupId, {
                    groupStatusMessage: {
                        video: buffer,
                        caption: legenda,
                        mimetype: 'video/mp4'
                    }
                });
            }
            console.log(`✅ Status ${i + 1}/${vezes} postado!`);
        } catch (e) {
            console.log(`❌ Erro ao postar status ${i + 1}/${vezes}: ${e.message}`);
        }
        if (vezes > 1 && i < vezes - 1) await new Promise(r => setTimeout(r, 800));
    }
}

// ─── FLUXO PRINCIPAL DO GRUPO ─────────────────────────────────
async function fluxoStatus(sock, group) {
    // 1. Selecionar mídia
    const filePath = await selecionarArquivo();
    if (!filePath) return 'back';

    const tipo = detectarTipoMidia(filePath);

    // Converter vídeo — sempre recodifica para garantir compatibilidade WhatsApp
    let arquivoFinal = filePath;
    if (tipo === 'video') {
        arquivoFinal = await converterVideoSeNecessario(filePath);
    }

    console.log(`\n📎 Arquivo: ${path.basename(arquivoFinal)} (${tipo})`);

    // 2. Legenda
    const legenda = await menuLegenda();
    if (legenda === undefined) return fluxoStatus(sock, group); // voltou

    // 3. Quantas vezes
    const vezesStr = await question('\nQuantas vezes postar? (1 para envio único): ');
    const vezes = parseInt(vezesStr) || 1;

    // 4. Confirmar
    console.log(`\n📋 Resumo:`);
    console.log(`   Grupo : ${group.subject}`);
    console.log(`   Mídia : ${path.basename(arquivoFinal)}`);
    console.log(`   Tipo  : ${tipo}`);
    console.log(`   Vezes : ${vezes}`);
    console.log(`   Legenda: ${legenda || '(sem legenda)'}`);

    const ok = await question('\nConfirmar? (s/n): ');
    if (ok.toLowerCase() !== 's') return fluxoStatus(sock, group);

    await postarStatus(sock, group.id, arquivoFinal, legenda, tipo, vezes);

    const again = await question('\nPostar outro? (s/n): ');
    if (again.toLowerCase() === 's') return fluxoStatus(sock, group);
    return 'back';
}

// ─── MENU DE GRUPOS ───────────────────────────────────────────
async function menuGrupos(sock) {
    const groups = await sock.groupFetchAllParticipating();
    const list = Object.values(groups);

    console.log('\n📋 Grupos disponíveis:');
    list.forEach((g, i) => console.log(`  [${i}] ${g.subject}`));
    console.log('  (v) Sair');

    const idx = await question('\nEscolha o grupo: ');
    if (idx.trim().toLowerCase() === 'v') { console.log('👋 Encerrando.'); process.exit(0); }

    const group = list[parseInt(idx)];
    if (!group) { console.log('Inválido.'); return menuGrupos(sock); }

    const result = await fluxoStatus(sock, group);
    if (result === 'back') return menuGrupos(sock);
}

// ─── START ────────────────────────────────────────────────────
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    console.log(`\n📡 Versão WA Web: ${version.join('.')}`);
    console.log(`🖥️  OS detectado: ${OS_LABELS[OS_ATUAL]}`);

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        markOnlineOnConnect: true,
    });

    sock.ev.on('creds.update', saveCreds);

    if (!state.creds.registered) {
        const phoneNumber = await question('\nDigite seu número (ex: 5518981938689): ');
        const codeNumber = phoneNumber.replace(/[^0-9]/g, '');
        try {
            const code = await sock.requestPairingCode(codeNumber);
            console.log(`\n🔑 CODE: ${code}`);
            console.log("Entre no WhatsApp > Aparelhos conectados > Conectar com número de telefone\n");
        } catch (e) { console.log("Erro ao gerar código:", e.message); }
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) setTimeout(startBot, 2000);
            else console.log('🔴 Deslogado.');
        } else if (connection === 'open') {
            console.log('\n🚀 BOT DE STATUS ATIVADO.');
            await menuGrupos(sock);
        }
    });
}

startBot();
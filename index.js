const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot aktif ve arka planda çalışıyor! 🎣');
});

app.listen(PORT, () => {
    console.log(`Web sunucusu ${PORT} portunda başarıyla başlatıldı.`);
});

async function botuBaşlat() {
    const { state, saveCreds } = await useMultiFileAuthState('bot_oturum_data');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ["KiyidanAv", "Chrome", "1.0.0"]
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n=========================================');
            console.log('   LÜTFEN BU QR KODU WHATSAPP ILE TARATIN');
            console.log('=========================================\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`Bağlantı kapandı (Durum: ${statusCode}). Tekrar bağlanıyor: `, shouldReconnect);
            
            if (shouldReconnect) {
                setTimeout(() => botuBaşlat(), 5000);
            }
        } else if (connection === 'open') {
            console.log('\n🚀 BAŞARILI: Kral Bot başarıyla WhatsApp\'a bağlandı! 🎉\n');
        }
    });

    // 1. ÖZELLİK: YENİ ÜYE KARŞILAMA
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;

        if (action === 'add') {
            for (let numara of participants) {
                const etiketle = numara.split('@')[0]; 
                const karşılamaMetni = `Merhaba @${etiketle}, grubumuza hoş geldin! 🎉\n\nBalık avı paylaşımlarımızla keyifli ve güzel vakit geçirmeni dileriz. Rastgele! 🎣`;

                try {
                    await sock.sendMessage(id, { 
                        text: karşılamaMetni, 
                        mentions: [numara] 
                    });
                } catch (hata) {
                    console.error("Karşılama gönderilemedi: ", hata);
                }
            }
        }
    });

    // 2. ÖZELLİK: MESAJLARI DİNLEME VE CEVAPLAMA 💬
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return; // Boşsa veya botun kendi mesajıysa işlem yapma

        const chatId = msg.key.remoteJid;
        // Mesajın text içeriğini alıyoruz ve küçük harfe çeviriyoruz (büyük/küçük harf duyarlılığı olmasın diye)
        const gelenMesaj = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase().trim();

        // --- SORU VE CEVAPLARI BURADA AYARLIYORSUN ---
        
        // Örnek 1: Sa veya Selam denirse
        if (gelenMesaj === 'sa' || gelenMesaj === 'selam' || gelenMesaj === 'selamlar') {
            await sock.sendMessage(chatId, { text: 'Aleyküm selam, hoş geldin! Raporlar ne alemde, var mı kıyıda hareket? 🎣' }, { quoted: msg });
        }
        
        // Örnek 2: Merhaba denirse
        else if (gelenMesaj === 'merhaba') {
            await sock.sendMessage(chatId, { text: 'Merhaba! Keyifli sohbetler, rastgele. 🐟' }, { quoted: msg });
        }

        // Örnek 3: Botun ismini veya amacını sorarlarsa
        else if (gelenMesaj === 'bot' || gelenMesaj === 'sen kimsin') {
            await sock.sendMessage(chatId, { text: 'Ben KıyıdaBiriVar grubunun resmi nöbetçi asistanıyım! Gruba yeni katılanları karşılar, meralardan bilgi taşırım. 🚀' }, { quoted: msg });
        }
        
        // Örnek 4: Rastgele/Rast gelsin denirse
        else if (gelenMesaj === 'rastgele' || gelenMesaj === 'rastgelsin') {
            await sock.sendMessage(chatId, { text: 'Eyvallah kral, hepimize rastgele! İğnen keskin, livarın dolu olsun. 🎣⚓' }, { quoted: msg });
        }
    });
}

botuBaşlat().catch(err => console.error("Başlatma hatası: ", err));

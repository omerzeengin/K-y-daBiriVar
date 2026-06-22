const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const express = require('express');

// Render port hatasını çözmek için sahte web sunucusu başlatıyoruz
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

    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;

        if (action === 'add') {
            for (let numara of participants) {
                const etiketle = numara.split('@')[0]; 
                const karşılamaMetni = `Merhaba @${etiketle}, grubumuza hoş geldiniz! 🎉\n\nBalık avı paylaşımlarımızla keyifli ve güzel vakit geçirmeni dileriz. Rastgele! 🎣`;

                try {
                    await sock.sendMessage(id, { 
                        text: karşılamaMetni, 
                        mentions: [numara] 
                    });
                    console.log(`Yeni üye (${etiketle}) karşılandı.`);
                } catch (hata) {
                    console.error("Mesaj gönderilemedi: ", hata);
                }
            }
        }
    });
}

botuBaşlat().catch(err => console.error("Başlatma hatası: ", err));

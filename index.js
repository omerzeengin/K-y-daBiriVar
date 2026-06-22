const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

async function botuBaşlat() {
    // Hafıza ve klasör çakışmalarını önlemek için oturumu başlatıyoruz
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
        
        // QR kod üretildiğinde terminale küçük boyutta çizdiriyoruz
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
            
            // Eğer oturum tamamen çıkış yapmadıysa güvenli bir şekilde yeniden başlat
            if (shouldReconnect) {
                setTimeout(() => botuBaşlat(), 5000); // Sunucuyu yormamak için 5 saniye bekle
            }
        } else if (connection === 'open') {
            console.log('\n🚀 BAŞARILI: Kral Bot başarıyla WhatsApp\'a bağlandı! 🎉\n');
        }
    });

    // Yeni üye katılım takibi
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

// Olası ilk çalıştırma hatalarını yakalamak için catch bloğu ile başlatıyoruz
botuBaşlat().catch(err => console.error("Başlatma hatası: ", err));

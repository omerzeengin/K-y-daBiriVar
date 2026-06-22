const { 
    makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason 
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

async function botuBaşlat() {
    const { state, saveCreds } = await useMultiFileAuthState('bot_oturum');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state
    });

    sock.ev.on('creds.update', saveCreds);

    // QR kodun terminalde görünmesini sağlayan güncel kısım burası
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('--- LÜTFEN BU QR KODU WHATSAPP ILE TARATIN ---');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Bağlantı kapandı, tekrar bağlanıyor: ', shouldReconnect);
            if (shouldReconnect) botuBaşlat();
        } else if (connection === 'open') {
            console.log('Kral Bot başarıyla WhatsApp\'a bağlandı! 🚀');
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
                    console.log(`Yeni üye (${etiketle}) başarıyla karşılandı.`);
                } catch (hata) {
                    console.error("Mesaj gönderilirken hata oluştu: ", hata);
                }
            }
        }
    });
}

botuBaşlat();

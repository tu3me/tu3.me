/**
 * The ready-made set the catalogue gives a pair of languages.
 *
 * Composed rather than written out. A file holding a set for every ordered pair of
 * the languages offered would be 2,352 sets and 23,520 cards: not a file anybody
 * could write, and not one a popup could load. One column of 10 entries per language
 * gives the same pairs for 10 × N entries, because a pair is two columns read side by
 * side.
 *
 * So what is kept here is a table and not a catalogue: ten things, named once in each
 * language. Forty-nine columns is 490 entries and 2,352 pairs, and each language added
 * is one more column — 10 entries for 96 more pairs.
 *
 * Which forty-nine: the ones the extension itself is translated into, which is
 * what `_locales` holds. Those are the languages the app can be read in, so they
 * are the languages somebody is likely to be reading a translation in. Regional
 * pairs there are one column here — es and es_419, the two Portuguese, the two
 * Chinese — written in the more widely used of the two, which for Portuguese is
 * the Brazilian wording and for Chinese is simplified characters. A traveller
 * reading the other variant will be understood.
 *
 * The rows are the same ten in every column, in the same order, and that is what
 * makes a pair possible: row three is "to the left" whichever two columns are being
 * read.
 */
function vocab() {
    /*
     * One set of ten, the owner's call, 5 November 2026. It was three, in one run of
     * thirty rows: what is said on arrival, what gets you across a city, and ten pairs
     * of words past the travelling. The rows nobody is handed any more have left the
     * table. A set holds its own words, so the sets already built from them in
     * somebody's database have no need of it.
     *
     * "Hello" and "thank you" come first, and took the place of "street" and "key".
     *
     * Many of the ten are two or three words rather than one. "Straight ahead" is what
     * a traveller actually needs, and it is not a word; a table of bare nouns teaches
     * somebody to name things they cannot ask for.
     */

    /*
     * The table. Every column is the same ten rows in the same order:
     *
     *     hello thank-you to-the-left to-the-right straight-ahead
     *     open closed entrance exit the-bill
     *
     * Chosen so that the two sides of a card differ. A set of travel nouns walks
     * straight into the international ones, and "passport → passport" is a card
     * that teaches nothing and reads as a bug: a first pass of this table had
     * passport, hotel, menu, pharmacy, police, hospital, ticket and airport in
     * it, and those eight rows alone put 182 identical cards into the catalogue.
     *
     * What is left are the sibling languages: Czech and Slovak, Danish and
     * Norwegian, Indonesian and Malay, Spanish and Catalan. Those two columns
     * agree on a word because the languages do, and no choice of travel
     * vocabulary changes that. Only a word nobody packs would avoid it.
     *
     * German keeps its capitals and nothing else takes one. A noun is capitalised
     * in German wherever it stands, and the other forty-eight capitalise none of
     * these — squaring them up would put a spelling mistake on nearly every card.
     * The rows that are phrases rather than nouns stay lower case in German too.
     *
     * The columns are in tag order rather than in any order of importance: a
     * table where one language comes first is a table somebody has to justify,
     * and this one is only ever read by its keys.
     */
    const WORDS = {
        am: [
            'ሰላም', 'አመሰግናለሁ', 'ወደ ግራ', 'ወደ ቀኝ', 'በቀጥታ', 'ክፍት', 'ዝግ', 'መግቢያ', 'መውጫ', 'ሂሳብ'
        ],
        ar: [
            'مرحبا', 'شكرا', 'إلى اليسار', 'إلى اليمين', 'إلى الأمام', 'مفتوح', 'مغلق', 'مدخل', 'مخرج', 'الحساب'
        ],
        bg: [
            'здравейте', 'благодаря', 'наляво', 'надясно', 'направо', 'отворено', 'затворено', 'вход', 'изход', 'сметката'
        ],
        bn: [
            'নমস্কার', 'ধন্যবাদ', 'বাঁ দিকে', 'ডান দিকে', 'সোজা', 'খোলা', 'বন্ধ', 'প্রবেশপথ', 'প্রস্থান', 'বিল'
        ],
        ca: [
            'hola', 'gràcies', "a l'esquerra", 'a la dreta', 'tot recte', 'obert', 'tancat', 'entrada', 'sortida', 'el compte'
        ],
        cs: [
            'dobrý den', 'děkuji', 'doleva', 'doprava', 'rovně', 'otevřeno', 'zavřeno', 'vchod', 'východ', 'účet'
        ],
        da: [
            'hej', 'tak', 'til venstre', 'til højre', 'ligeud', 'åbent', 'lukket', 'indgang', 'udgang', 'regningen'
        ],
        de: [
            'hallo', 'danke', 'nach links', 'nach rechts', 'geradeaus', 'geöffnet', 'geschlossen', 'Eingang', 'Ausgang', 'die Rechnung'
        ],
        el: [
            'γεια σας', 'ευχαριστώ', 'αριστερά', 'δεξιά', 'ευθεία', 'ανοιχτά', 'κλειστά', 'είσοδος', 'έξοδος', 'ο λογαριασμός'
        ],
        en: [
            'hello', 'thank you', 'to the left', 'to the right', 'straight ahead', 'open', 'closed', 'entrance', 'exit', 'the bill'
        ],
        es: [
            'hola', 'gracias', 'a la izquierda', 'a la derecha', 'todo recto', 'abierto', 'cerrado', 'entrada', 'salida', 'la cuenta'
        ],
        et: [
            'tere', 'aitäh', 'vasakule', 'paremale', 'otse', 'avatud', 'suletud', 'sissepääs', 'väljapääs', 'arve'
        ],
        fa: [
            'سلام', 'متشکرم', 'به چپ', 'به راست', 'مستقیم', 'باز', 'بسته', 'ورودی', 'خروجی', 'صورتحساب'
        ],
        fi: [
            'hei', 'kiitos', 'vasemmalle', 'oikealle', 'suoraan', 'avoinna', 'suljettu', 'sisäänkäynti', 'uloskäynti', 'lasku'
        ],
        fr: [
            'salut', 'merci', 'à gauche', 'à droite', 'tout droit', 'ouvert', 'fermé', 'entrée', 'sortie', "l'addition"
        ],
        gu: [
            'નમસ્તે', 'આભાર', 'ડાબી બાજુ', 'જમણી બાજુ', 'સીધા', 'ખુલ્લું', 'બંધ', 'પ્રવેશ', 'નિર્ગમન', 'બિલ'
        ],
        he: [
            'שלום', 'תודה', 'שמאלה', 'ימינה', 'ישר', 'פתוח', 'סגור', 'כניסה', 'יציאה', 'החשבון'
        ],
        hi: [
            'नमस्ते', 'धन्यवाद', 'बाईं ओर', 'दाईं ओर', 'सीधे', 'खुला', 'बंद', 'प्रवेश', 'निकास', 'बिल'
        ],
        hr: [
            'dobar dan', 'hvala', 'lijevo', 'desno', 'ravno', 'otvoreno', 'zatvoreno', 'ulaz', 'izlaz', 'račun'
        ],
        hu: [
            'jó napot', 'köszönöm', 'balra', 'jobbra', 'egyenesen', 'nyitva', 'zárva', 'bejárat', 'kijárat', 'a számla'
        ],
        id: [
            'halo', 'terima kasih', 'ke kiri', 'ke kanan', 'lurus', 'buka', 'tutup', 'pintu masuk', 'pintu keluar', 'tagihan'
        ],
        it: [
            'ciao', 'grazie', 'a sinistra', 'a destra', 'sempre dritto', 'aperto', 'chiuso', 'ingresso', 'uscita', 'il conto'
        ],
        ja: [
            'こんにちは', 'ありがとうございます', '左へ', '右へ', 'まっすぐ', '営業中', '閉店', '入口', '出口', 'お会計'
        ],
        kn: [
            'ನಮಸ್ಕಾರ', 'ಧನ್ಯವಾದ', 'ಎಡಕ್ಕೆ', 'ಬಲಕ್ಕೆ', 'ನೇರವಾಗಿ', 'ತೆರೆದಿದೆ', 'ಮುಚ್ಚಿದೆ', 'ಪ್ರವೇಶ', 'ನಿರ್ಗಮನ', 'ಬಿಲ್'
        ],
        ko: [
            '안녕하세요', '감사합니다', '왼쪽으로', '오른쪽으로', '직진', '영업 중', '닫힘', '입구', '출구', '계산서'
        ],
        lt: [
            'labas', 'ačiū', 'į kairę', 'į dešinę', 'tiesiai', 'atidaryta', 'uždaryta', 'įėjimas', 'išėjimas', 'sąskaita'
        ],
        lv: [
            'sveiki', 'paldies', 'pa kreisi', 'pa labi', 'taisni', 'atvērts', 'slēgts', 'ieeja', 'izeja', 'rēķins'
        ],
        ml: [
            'നമസ്കാരം', 'നന്ദി', 'ഇടത്തേക്ക്', 'വലത്തേക്ക്', 'നേരെ', 'തുറന്നിരിക്കുന്നു', 'അടച്ചിരിക്കുന്നു', 'പ്രവേശനം', 'പുറത്തേക്ക്', 'ബിൽ'
        ],
        mr: [
            'नमस्कार', 'धन्यवाद', 'डावीकडे', 'उजवीकडे', 'सरळ', 'उघडे', 'बंद', 'प्रवेश', 'निर्गमन', 'बिल'
        ],
        ms: [
            'helo', 'terima kasih', 'ke kiri', 'ke kanan', 'terus', 'buka', 'tutup', 'pintu masuk', 'pintu keluar', 'bil'
        ],
        nl: [
            'hallo', 'dank u', 'naar links', 'naar rechts', 'rechtdoor', 'open', 'gesloten', 'ingang', 'uitgang', 'de rekening'
        ],
        no: [
            'hei', 'takk', 'til venstre', 'til høyre', 'rett frem', 'åpent', 'stengt', 'inngang', 'utgang', 'regningen'
        ],
        pl: [
            'cześć', 'dziękuję', 'w lewo', 'w prawo', 'prosto', 'otwarte', 'zamknięte', 'wejście', 'wyjście', 'rachunek'
        ],
        pt: [
            'olá', 'obrigado', 'à esquerda', 'à direita', 'em frente', 'aberto', 'fechado', 'entrada', 'saída', 'a conta'
        ],
        ro: [
            'bună ziua', 'mulțumesc', 'la stânga', 'la dreapta', 'drept înainte', 'deschis', 'închis', 'intrare', 'ieșire', 'nota de plată'
        ],
        ru: [
            'привет', 'спасибо', 'налево', 'направо', 'прямо', 'открыто', 'закрыто', 'вход', 'выход', 'счёт'
        ],
        sk: [
            'dobrý deň', 'ďakujem', 'doľava', 'doprava', 'rovno', 'otvorené', 'zatvorené', 'vchod', 'východ', 'účet'
        ],
        sl: [
            'dober dan', 'hvala', 'levo', 'desno', 'naravnost', 'odprto', 'zaprto', 'vhod', 'izhod', 'račun'
        ],
        sr: [
            'здраво', 'хвала', 'лево', 'десно', 'право', 'отворено', 'затворено', 'улаз', 'излаз', 'рачун'
        ],
        sv: [
            'hej', 'tack', 'till vänster', 'till höger', 'rakt fram', 'öppet', 'stängt', 'ingång', 'utgång', 'notan'
        ],
        sw: [
            'habari', 'asante', 'kushoto', 'kulia', 'moja kwa moja', 'wazi', 'imefungwa', 'mlango wa kuingia', 'njia ya kutoka', 'bili'
        ],
        ta: [
            'வணக்கம்', 'நன்றி', 'இடதுபுறம்', 'வலதுபுறம்', 'நேராக', 'திறந்துள்ளது', 'மூடப்பட்டுள்ளது', 'நுழைவு', 'வெளியேறு', 'பில்'
        ],
        te: [
            'నమస్కారం', 'ధన్యవాదాలు', 'ఎడమవైపు', 'కుడివైపు', 'నేరుగా', 'తెరిచి ఉంది', 'మూసి ఉంది', 'ప్రవేశం', 'నిష్క్రమణ', 'బిల్లు'
        ],
        th: [
            'สวัสดี', 'ขอบคุณ', 'เลี้ยวซ้าย', 'เลี้ยวขวา', 'ตรงไป', 'เปิด', 'ปิด', 'ทางเข้า', 'ทางออก', 'บิล'
        ],
        tl: [
            'kumusta', 'salamat', 'sa kaliwa', 'sa kanan', 'diretso', 'bukas', 'sarado', 'pasukan', 'labasan', 'ang bayarin'
        ],
        tr: [
            'merhaba', 'teşekkürler', 'sola', 'sağa', 'düz', 'açık', 'kapalı', 'giriş', 'çıkış', 'hesap'
        ],
        uk: [
            'привіт', 'дякую', 'ліворуч', 'праворуч', 'прямо', 'відчинено', 'зачинено', 'вхід', 'вихід', 'рахунок'
        ],
        vi: [
            'xin chào', 'cảm ơn', 'bên trái', 'bên phải', 'đi thẳng', 'mở cửa', 'đóng cửa', 'lối vào', 'lối ra', 'hóa đơn'
        ],
        zh: [
            '你好', '谢谢', '向左', '向右', '一直走', '营业中', '已关门', '入口', '出口', '账单'
        ]
    };

    /*
     * Two names for one column.
     *
     * The dropdowns list whatever tags the browser knows, and some of those are
     * two ways of saying the same thing: Norwegian is offered as both `no` and
     * `nb`, and the entries above are the same under either. Somebody who
     * picked the one spelled differently should not be told there is nothing
     * written for their language.
     *
     * Only for tags that read the same. Nynorsk is not here, because it is not
     * Bokmål spelled another way.
     */
    const SAME_AS = { nb: 'no' };

    const column = (tag) => SAME_AS[tag] || tag;

    vocab.has = (tag) => Object.prototype.hasOwnProperty.call(WORDS, column(tag));

    vocab.languages = () => Object.keys(WORDS);

    /*
     * The words of the one set a pair gets, built fresh on every call.
     *
     * Fresh because what comes out of here can end up in the store — a set that
     * is played becomes one of yours — and the store writes into what it is
     * given: languages onto words, repetitions as they are answered. One shared
     * array would hand the next reader somebody else's progress.
     *
     * An unknown language, or the same one twice, gives nothing rather than an
     * empty set: there is no set to show, and a card with no words in it says
     * there is one.
     */
    vocab.starter = (learn, translation) => {
        const from = column(learn);
        const into = column(translation);

        if (!vocab.has(from) || !vocab.has(into) || from === into) return null;

        return WORDS[from].map((word, row) => ({
            original: word,
            translation: WORDS[into][row],
            repetitions: []
        }));
    };
}
vocab();

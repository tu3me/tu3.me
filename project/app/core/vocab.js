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
 * makes a pair possible: row three is "excuse me" whichever two columns are being
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
     * Ten and no fewer, because a session of snake is ten words at the most and deals a
     * heart after every one but the last, and nine hearts are what fill its goblet --
     * see GOBLET_HEARTS in snake.js. With eight, the goblet could not be won on the
     * first set there is.
     *
     * "Hello" and "thank you" come first, and took the place of "street" and "key".
     * "Excuse me", "how much is it" and "goodbye" took the place of the three ways to
     * walk, "to the left", "to the right" and "straight ahead" (the owner, 6 November
     * 2026).
     *
     * "Excuse me" is the one that gets somebody's attention, and not the apology, where
     * a language tells the two apart: Korean 저기요, Chinese 打扰一下, Arabic لو سمحت.
     * "Goodbye" is what people say on leaving, which is not always the dictionary's
     * word: Hindi अलविदा and Brazilian adeus are for parting for good.
     *
     * Many of the ten are two or three words rather than one. "How much is it" is what
     * a traveller actually needs, and it is not a word; a table of bare nouns teaches
     * somebody to name things they cannot ask for.
     */

    /*
     * The table. Every column is the same ten rows in the same order:
     *
     *     hello thank-you excuse-me how-much-is-it goodbye
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
            'ሰላም', 'አመሰግናለሁ', 'ይቅርታ', 'ስንት ነው', 'ደህና ሁኑ', 'ክፍት', 'ዝግ', 'መግቢያ', 'መውጫ', 'ሂሳብ'
        ],
        ar: [
            'مرحبا', 'شكرا', 'لو سمحت', 'بكم هذا', 'مع السلامة', 'مفتوح', 'مغلق', 'مدخل', 'مخرج', 'الحساب'
        ],
        bg: [
            'здравейте', 'благодаря', 'извинете', 'колко струва', 'довиждане', 'отворено', 'затворено', 'вход', 'изход', 'сметката'
        ],
        bn: [
            'নমস্কার', 'ধন্যবাদ', 'মাফ করবেন', 'কত দাম', 'বিদায়', 'খোলা', 'বন্ধ', 'প্রবেশপথ', 'প্রস্থান', 'বিল'
        ],
        ca: [
            'hola', 'gràcies', 'perdoni', 'quant costa', 'adéu', 'obert', 'tancat', 'entrada', 'sortida', 'el compte'
        ],
        cs: [
            'dobrý den', 'děkuji', 'promiňte', 'kolik to stojí', 'na shledanou', 'otevřeno', 'zavřeno', 'vchod', 'východ', 'účet'
        ],
        da: [
            'hej', 'tak', 'undskyld', 'hvad koster det', 'farvel', 'åbent', 'lukket', 'indgang', 'udgang', 'regningen'
        ],
        de: [
            'hallo', 'danke', 'Entschuldigung', 'wie viel kostet das', 'auf Wiedersehen', 'geöffnet', 'geschlossen', 'Eingang', 'Ausgang', 'die Rechnung'
        ],
        el: [
            'γεια σας', 'ευχαριστώ', 'συγγνώμη', 'πόσο κάνει', 'αντίο', 'ανοιχτά', 'κλειστά', 'είσοδος', 'έξοδος', 'ο λογαριασμός'
        ],
        en: [
            'hello', 'thank you', 'excuse me', 'how much is it', 'goodbye', 'open', 'closed', 'entrance', 'exit', 'the bill'
        ],
        es: [
            'hola', 'gracias', 'disculpe', 'cuánto cuesta', 'adiós', 'abierto', 'cerrado', 'entrada', 'salida', 'la cuenta'
        ],
        et: [
            'tere', 'aitäh', 'vabandage', 'kui palju see maksab', 'head aega', 'avatud', 'suletud', 'sissepääs', 'väljapääs', 'arve'
        ],
        fa: [
            'سلام', 'متشکرم', 'ببخشید', 'قیمتش چند است', 'خداحافظ', 'باز', 'بسته', 'ورودی', 'خروجی', 'صورتحساب'
        ],
        fi: [
            'hei', 'kiitos', 'anteeksi', 'paljonko se maksaa', 'näkemiin', 'avoinna', 'suljettu', 'sisäänkäynti', 'uloskäynti', 'lasku'
        ],
        fr: [
            'salut', 'merci', 'excusez-moi', 'combien ça coûte', 'au revoir', 'ouvert', 'fermé', 'entrée', 'sortie', "l'addition"
        ],
        gu: [
            'નમસ્તે', 'આભાર', 'માફ કરશો', 'આ કેટલાનું છે', 'આવજો', 'ખુલ્લું', 'બંધ', 'પ્રવેશ', 'નિર્ગમન', 'બિલ'
        ],
        he: [
            'שלום', 'תודה', 'סליחה', 'כמה זה עולה', 'להתראות', 'פתוח', 'סגור', 'כניסה', 'יציאה', 'החשבון'
        ],
        hi: [
            'नमस्ते', 'धन्यवाद', 'माफ़ कीजिए', 'कितने का है', 'फिर मिलेंगे', 'खुला', 'बंद', 'प्रवेश', 'निकास', 'बिल'
        ],
        hr: [
            'dobar dan', 'hvala', 'oprostite', 'koliko to košta', 'doviđenja', 'otvoreno', 'zatvoreno', 'ulaz', 'izlaz', 'račun'
        ],
        hu: [
            'jó napot', 'köszönöm', 'elnézést', 'mennyibe kerül', 'viszontlátásra', 'nyitva', 'zárva', 'bejárat', 'kijárat', 'a számla'
        ],
        id: [
            'halo', 'terima kasih', 'permisi', 'berapa harganya', 'sampai jumpa', 'buka', 'tutup', 'pintu masuk', 'pintu keluar', 'tagihan'
        ],
        it: [
            'ciao', 'grazie', 'mi scusi', 'quanto costa', 'arrivederci', 'aperto', 'chiuso', 'ingresso', 'uscita', 'il conto'
        ],
        ja: [
            'こんにちは', 'ありがとうございます', 'すみません', 'いくらですか', 'さようなら', '営業中', '閉店', '入口', '出口', 'お会計'
        ],
        kn: [
            'ನಮಸ್ಕಾರ', 'ಧನ್ಯವಾದ', 'ಕ್ಷಮಿಸಿ', 'ಇದರ ಬೆಲೆ ಎಷ್ಟು', 'ಹೋಗಿ ಬರುತ್ತೇನೆ', 'ತೆರೆದಿದೆ', 'ಮುಚ್ಚಿದೆ', 'ಪ್ರವೇಶ', 'ನಿರ್ಗಮನ', 'ಬಿಲ್'
        ],
        ko: [
            '안녕하세요', '감사합니다', '저기요', '얼마예요', '안녕히 계세요', '영업 중', '닫힘', '입구', '출구', '계산서'
        ],
        lt: [
            'labas', 'ačiū', 'atsiprašau', 'kiek kainuoja', 'viso gero', 'atidaryta', 'uždaryta', 'įėjimas', 'išėjimas', 'sąskaita'
        ],
        lv: [
            'sveiki', 'paldies', 'atvainojiet', 'cik tas maksā', 'uz redzēšanos', 'atvērts', 'slēgts', 'ieeja', 'izeja', 'rēķins'
        ],
        ml: [
            'നമസ്കാരം', 'നന്ദി', 'ക്ഷമിക്കണം', 'എത്രയാണ് വില', 'പോയി വരാം', 'തുറന്നിരിക്കുന്നു', 'അടച്ചിരിക്കുന്നു', 'പ്രവേശനം', 'പുറത്തേക്ക്', 'ബിൽ'
        ],
        mr: [
            'नमस्कार', 'धन्यवाद', 'माफ करा', 'किती किंमत आहे', 'पुन्हा भेटू', 'उघडे', 'बंद', 'प्रवेश', 'निर्गमन', 'बिल'
        ],
        ms: [
            'helo', 'terima kasih', 'tumpang tanya', 'berapa harganya', 'selamat tinggal', 'buka', 'tutup', 'pintu masuk', 'pintu keluar', 'bil'
        ],
        nl: [
            'hallo', 'dank u', 'pardon', 'hoeveel kost het', 'tot ziens', 'open', 'gesloten', 'ingang', 'uitgang', 'de rekening'
        ],
        no: [
            'hei', 'takk', 'unnskyld', 'hva koster det', 'ha det', 'åpent', 'stengt', 'inngang', 'utgang', 'regningen'
        ],
        pl: [
            'cześć', 'dziękuję', 'przepraszam', 'ile to kosztuje', 'do widzenia', 'otwarte', 'zamknięte', 'wejście', 'wyjście', 'rachunek'
        ],
        pt: [
            'olá', 'obrigado', 'com licença', 'quanto custa', 'até logo', 'aberto', 'fechado', 'entrada', 'saída', 'a conta'
        ],
        ro: [
            'bună ziua', 'mulțumesc', 'scuzați-mă', 'cât costă', 'la revedere', 'deschis', 'închis', 'intrare', 'ieșire', 'nota de plată'
        ],
        ru: [
            'привет', 'спасибо', 'извините', 'сколько стоит', 'до свидания', 'открыто', 'закрыто', 'вход', 'выход', 'счёт'
        ],
        sk: [
            'dobrý deň', 'ďakujem', 'prepáčte', 'koľko to stojí', 'dovidenia', 'otvorené', 'zatvorené', 'vchod', 'východ', 'účet'
        ],
        sl: [
            'dober dan', 'hvala', 'oprostite', 'koliko stane', 'nasvidenje', 'odprto', 'zaprto', 'vhod', 'izhod', 'račun'
        ],
        sr: [
            'здраво', 'хвала', 'извините', 'колико кошта', 'довиђења', 'отворено', 'затворено', 'улаз', 'излаз', 'рачун'
        ],
        sv: [
            'hej', 'tack', 'ursäkta', 'vad kostar det', 'hej då', 'öppet', 'stängt', 'ingång', 'utgång', 'notan'
        ],
        sw: [
            'habari', 'asante', 'samahani', 'bei gani', 'kwaheri', 'wazi', 'imefungwa', 'mlango wa kuingia', 'njia ya kutoka', 'bili'
        ],
        ta: [
            'வணக்கம்', 'நன்றி', 'மன்னிக்கவும்', 'என்ன விலை', 'போய் வருகிறேன்', 'திறந்துள்ளது', 'மூடப்பட்டுள்ளது', 'நுழைவு', 'வெளியேறு', 'பில்'
        ],
        te: [
            'నమస్కారం', 'ధన్యవాదాలు', 'క్షమించండి', 'దీని ధర ఎంత', 'వెళ్ళొస్తాను', 'తెరిచి ఉంది', 'మూసి ఉంది', 'ప్రవేశం', 'నిష్క్రమణ', 'బిల్లు'
        ],
        th: [
            'สวัสดี', 'ขอบคุณ', 'ขอโทษ', 'ราคาเท่าไหร่', 'ลาก่อน', 'เปิด', 'ปิด', 'ทางเข้า', 'ทางออก', 'บิล'
        ],
        tl: [
            'kumusta', 'salamat', 'paumanhin', 'magkano ito', 'paalam', 'bukas', 'sarado', 'pasukan', 'labasan', 'ang bayarin'
        ],
        tr: [
            'merhaba', 'teşekkürler', 'affedersiniz', 'bu ne kadar', 'hoşça kalın', 'açık', 'kapalı', 'giriş', 'çıkış', 'hesap'
        ],
        uk: [
            'привіт', 'дякую', 'вибачте', 'скільки коштує', 'до побачення', 'відчинено', 'зачинено', 'вхід', 'вихід', 'рахунок'
        ],
        vi: [
            'xin chào', 'cảm ơn', 'xin lỗi', 'bao nhiêu tiền', 'tạm biệt', 'mở cửa', 'đóng cửa', 'lối vào', 'lối ra', 'hóa đơn'
        ],
        zh: [
            '你好', '谢谢', '打扰一下', '多少钱', '再见', '营业中', '已关门', '入口', '出口', '账单'
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

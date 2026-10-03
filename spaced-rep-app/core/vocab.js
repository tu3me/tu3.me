/**
 * The ready-made sets the catalogue offers for a pair of languages.
 *
 * Composed rather than written out. The dropdowns list every language the
 * browser can name — 183 of them — and a file holding three sets for every
 * ordered pair would be some 33,000 pairs and a million words: not a file
 * anybody could write, and not one a popup could load. One column of 30 entries
 * per language gives the same pairs for 30 × N entries, because a pair is two
 * columns read side by side.
 *
 * So what is kept here is a table and not a catalogue: thirty things, named once
 * in each language. Forty-nine columns is 1,470 lines and 2,352 pairs, and each
 * language added is one more column — 30 lines for 96 more pairs.
 *
 * Which forty-nine: the ones the extension itself is translated into, which is
 * what `_locales` holds. Those are the languages the app can be read in, so they
 * are the languages somebody is likely to be reading a translation in. Regional
 * pairs there are one column here — es and es_419, the two Portuguese, the two
 * Chinese — written in the more widely used of the two, which for Portuguese is
 * the Brazilian wording and for Chinese is simplified characters. A traveller
 * reading the other variant will be understood.
 *
 * The rows are the same thirty in every column, in the same order, and that is
 * what makes a pair possible: row seven is "water" whichever two columns are
 * being read.
 */
function vocab() {
    /*
     * Three sets of ten, in one run of thirty, and all of it for travelling.
     *
     * A set is what somebody can be handed before a trip and work through on the
     * plane, so the three are the order the words are needed in rather than three
     * grades of difficulty: what is said on arrival, what gets you across a city,
     * and what is said when something has gone wrong.
     *
     * Most of the entries are two or three words rather than one. "Straight
     * ahead" and "how much" are what a traveller actually needs, and neither of
     * them is a word; a table of bare nouns teaches somebody to name things they
     * cannot ask for.
     *
     * The last ten are whole phrases with verbs in them, which the first twenty
     * avoid. They are the ones nobody has time to assemble -- "I am lost" is said
     * while lost -- so they are learned the way a native speaker says them rather
     * than built out of a dictionary at the moment they are needed.
     */
    const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
    const PER_LEVEL = 10;

    /*
     * The table. Every column is the same thirty rows in the same order:
     *
     *   Beginner, the first hour:
     *     hello thank-you please excuse-me good-morning good-evening
     *     water bread how-much where-is
     *
     *   Intermediate, getting across a city:
     *     to-the-left to-the-right straight-ahead street open closed
     *     entrance exit key the-bill
     *
     *   Advanced, when it goes wrong:
     *     help I-am-lost I-do-not-understand I-am-ill it-hurts too-expensive
     *     I-need-a-doctor more-slowly do-you-speak-English where-is-the-toilet
     *
     * Chosen so that the two sides of a card differ. A set of travel nouns walks
     * straight into the international ones, and "passport → passport" is a card
     * that teaches nothing and reads as a bug: a first pass of this table had
     * passport, hotel, menu, pharmacy, police, hospital, ticket and airport in
     * it, and those eight rows alone put 182 identical cards into the catalogue.
     * What replaced them is either native-rooted in most languages -- a street, a
     * key, a way out -- or a whole phrase, which almost never matches end to end
     * even when one word inside it is borrowed.
     *
     * What is left are the sibling languages: Czech and Slovak, Danish and
     * Norwegian, Indonesian and Malay, Spanish and Catalan. Those two columns
     * agree on a word because the languages do, and no choice of travel
     * vocabulary changes that -- a Czech asking a Slovak for water says the same
     * thing he would say at home. Only a word nobody packs would avoid it.
     *
     * German keeps its capitals and nothing else takes one. A noun is capitalised
     * in German wherever it stands, and the other forty-eight capitalise none of
     * these — squaring them up would put a spelling mistake on nearly every card.
     * The rows that are phrases rather than nouns stay lower case in German too,
     * except where a proper noun lands inside one: Englisch is a language, and a
     * language is a name.
     *
     * The columns are in tag order rather than in any order of importance: a
     * table where one language comes first is a table somebody has to justify,
     * and this one is only ever read by its keys.
     */
    const WORDS = {
        am: [
            'ሰላም', 'አመሰግናለሁ', 'እባክዎ', 'ይቅርታ', 'እንደምን አደሩ', 'እንደምን አመሹ', 'ውሃ', 'ዳቦ', 'ስንት ነው', 'የት ነው',
            'ወደ ግራ', 'ወደ ቀኝ', 'በቀጥታ', 'መንገድ', 'ክፍት', 'ዝግ', 'መግቢያ', 'መውጫ', 'ቁልፍ', 'ሂሳብ',
            'እርዳታ', 'ጠፍቻለሁ', 'አልገባኝም', 'ታምሜያለሁ', 'ያማል', 'በጣም ውድ', 'ሐኪም እፈልጋለሁ', 'ቀስ ብለው', 'እንግሊዝኛ ይችላሉ', 'መጸዳጃ ቤት የት ነው'
        ],
        ar: [
            'مرحبا', 'شكرا', 'من فضلك', 'لو سمحت', 'صباح الخير', 'مساء الخير', 'ماء', 'خبز', 'بكم هذا', 'أين',
            'إلى اليسار', 'إلى اليمين', 'إلى الأمام', 'شارع', 'مفتوح', 'مغلق', 'مدخل', 'مخرج', 'مفتاح', 'الحساب',
            'مساعدة', 'أنا تائه', 'لا أفهم', 'أنا مريض', 'يؤلمني', 'غالي جدا', 'أحتاج طبيبا', 'ببطء', 'هل تتكلم الإنجليزية', 'أين الحمام'
        ],
        bg: [
            'здравейте', 'благодаря', 'моля', 'извинете', 'добро утро', 'добър вечер', 'вода', 'хляб', 'колко струва', 'къде е',
            'наляво', 'надясно', 'направо', 'улица', 'отворено', 'затворено', 'вход', 'изход', 'ключ', 'сметката',
            'помощ', 'изгубих се', 'не разбирам', 'болен съм', 'боли', 'твърде скъпо', 'трябва ми лекар', 'по-бавно', 'говорите ли английски', 'къде е тоалетната'
        ],
        bn: [
            'নমস্কার', 'ধন্যবাদ', 'দয়া করে', 'মাফ করবেন', 'সুপ্রভাত', 'শুভ সন্ধ্যা', 'পানি', 'রুটি', 'কত দাম', 'কোথায়',
            'বাঁ দিকে', 'ডান দিকে', 'সোজা', 'রাস্তা', 'খোলা', 'বন্ধ', 'প্রবেশপথ', 'প্রস্থান', 'চাবি', 'বিল',
            'সাহায্য', 'আমি হারিয়ে গেছি', 'আমি বুঝতে পারছি না', 'আমি অসুস্থ', 'ব্যথা করছে', 'খুব দামি', 'আমার ডাক্তার দরকার', 'আরও ধীরে', 'আপনি কি ইংরেজি বলেন', 'বাথরুম কোথায়'
        ],
        ca: [
            'hola', 'gràcies', 'si us plau', 'perdoni', 'bon dia', 'bona nit', 'aigua', 'pa', 'quant costa', 'on és',
            "a l'esquerra", 'a la dreta', 'tot recte', 'carrer', 'obert', 'tancat', 'entrada', 'sortida', 'clau', 'el compte',
            'ajuda', "m'he perdut", 'no ho entenc', 'estic malalt', 'em fa mal', 'massa car', 'necessito un metge', 'més a poc a poc', 'parla anglès', 'on és el lavabo'
        ],
        cs: [
            'dobrý den', 'děkuji', 'prosím', 'promiňte', 'dobré ráno', 'dobrý večer', 'voda', 'chléb', 'kolik to stojí', 'kde je',
            'doleva', 'doprava', 'rovně', 'ulice', 'otevřeno', 'zavřeno', 'vchod', 'východ', 'klíč', 'účet',
            'pomoc', 'ztratil jsem se', 'nerozumím', 'jsem nemocný', 'bolí to', 'příliš drahé', 'potřebuji lékaře', 'pomaleji', 'mluvíte anglicky', 'kde je toaleta'
        ],
        da: [
            'hej', 'tak', 'venligst', 'undskyld', 'godmorgen', 'godaften', 'vand', 'brød', 'hvad koster det', 'hvor er',
            'til venstre', 'til højre', 'ligeud', 'gade', 'åbent', 'lukket', 'indgang', 'udgang', 'nøgle', 'regningen',
            'hjælp', 'jeg er faret vild', 'jeg forstår ikke', 'jeg er syg', 'det gør ondt', 'for dyrt', 'jeg har brug for en læge', 'langsommere', 'taler du engelsk', 'hvor er toilettet'
        ],
        de: [
            'hallo', 'danke', 'bitte', 'Entschuldigung', 'guten Morgen', 'guten Abend', 'Wasser', 'Brot', 'wie viel kostet das', 'wo ist',
            'nach links', 'nach rechts', 'geradeaus', 'Straße', 'geöffnet', 'geschlossen', 'Eingang', 'Ausgang', 'Schlüssel', 'die Rechnung',
            'Hilfe', 'ich habe mich verirrt', 'ich verstehe nicht', 'ich bin krank', 'es tut weh', 'zu teuer', 'ich brauche einen Arzt', 'langsamer', 'sprechen Sie Englisch', 'wo ist die Toilette'
        ],
        el: [
            'γεια σας', 'ευχαριστώ', 'παρακαλώ', 'συγγνώμη', 'καλημέρα', 'καλησπέρα', 'νερό', 'ψωμί', 'πόσο κάνει', 'πού είναι',
            'αριστερά', 'δεξιά', 'ευθεία', 'δρόμος', 'ανοιχτά', 'κλειστά', 'είσοδος', 'έξοδος', 'κλειδί', 'ο λογαριασμός',
            'βοήθεια', 'έχω χαθεί', 'δεν καταλαβαίνω', 'είμαι άρρωστος', 'πονάει', 'πολύ ακριβό', 'χρειάζομαι γιατρό', 'πιο αργά', 'μιλάτε αγγλικά', 'πού είναι η τουαλέτα'
        ],
        en: [
            'hello', 'thank you', 'please', 'excuse me', 'good morning', 'good evening', 'water', 'bread', 'how much', 'where is',
            'to the left', 'to the right', 'straight ahead', 'street', 'open', 'closed', 'entrance', 'exit', 'key', 'the bill',
            'help', 'I am lost', 'I do not understand', 'I am ill', 'it hurts', 'too expensive', 'I need a doctor', 'more slowly', 'do you speak English', 'where is the toilet'
        ],
        es: [
            'hola', 'gracias', 'por favor', 'perdone', 'buenos días', 'buenas noches', 'agua', 'pan', 'cuánto cuesta', 'dónde está',
            'a la izquierda', 'a la derecha', 'todo recto', 'calle', 'abierto', 'cerrado', 'entrada', 'salida', 'llave', 'la cuenta',
            'ayuda', 'estoy perdido', 'no entiendo', 'estoy enfermo', 'me duele', 'demasiado caro', 'necesito un médico', 'más despacio', 'habla inglés', 'dónde está el baño'
        ],
        et: [
            'tere', 'aitäh', 'palun', 'vabandust', 'tere hommikust', 'tere õhtust', 'vesi', 'leib', 'kui palju maksab', 'kus on',
            'vasakule', 'paremale', 'otse', 'tänav', 'avatud', 'suletud', 'sissepääs', 'väljapääs', 'võti', 'arve',
            'appi', 'ma olen eksinud', 'ma ei saa aru', 'ma olen haige', 'valutab', 'liiga kallis', 'mul on arsti vaja', 'aeglasemalt', 'kas räägite inglise keelt', 'kus on tualett'
        ],
        fa: [
            'سلام', 'متشکرم', 'لطفا', 'ببخشید', 'صبح بخیر', 'عصر بخیر', 'آب', 'نان', 'چند است', 'کجاست',
            'به چپ', 'به راست', 'مستقیم', 'خیابان', 'باز', 'بسته', 'ورودی', 'خروجی', 'کلید', 'صورتحساب',
            'کمک', 'گم شده‌ام', 'نمی‌فهمم', 'بیمار هستم', 'درد می‌کند', 'خیلی گران', 'به پزشک نیاز دارم', 'آهسته‌تر', 'انگلیسی صحبت می‌کنید', 'دستشویی کجاست'
        ],
        fi: [
            'hei', 'kiitos', 'ole hyvä', 'anteeksi', 'hyvää huomenta', 'hyvää iltaa', 'vesi', 'leipä', 'paljonko maksaa', 'missä on',
            'vasemmalle', 'oikealle', 'suoraan', 'katu', 'avoinna', 'suljettu', 'sisäänkäynti', 'uloskäynti', 'avain', 'lasku',
            'apua', 'olen eksynyt', 'en ymmärrä', 'olen sairas', 'sattuu', 'liian kallis', 'tarvitsen lääkärin', 'hitaammin', 'puhutteko englantia', 'missä on vessa'
        ],
        fr: [
            'salut', 'merci', "s'il vous plaît", 'excusez-moi', 'bonjour', 'bonsoir', 'eau', 'pain', 'combien ça coûte', 'où est',
            'à gauche', 'à droite', 'tout droit', 'rue', 'ouvert', 'fermé', 'entrée', 'sortie', 'clé', "l'addition",
            'au secours', 'je suis perdu', 'je ne comprends pas', 'je suis malade', "j'ai mal", 'trop cher', "j'ai besoin d'un médecin", 'plus lentement', 'parlez-vous anglais', 'où sont les toilettes'
        ],
        gu: [
            'નમસ્તે', 'આભાર', 'કૃપા કરીને', 'માફ કરશો', 'સુપ્રભાત', 'શુભ સાંજ', 'પાણી', 'રોટલી', 'કેટલું છે', 'ક્યાં છે',
            'ડાબી બાજુ', 'જમણી બાજુ', 'સીધા', 'શેરી', 'ખુલ્લું', 'બંધ', 'પ્રવેશ', 'નિર્ગમન', 'ચાવી', 'બિલ',
            'મદદ', 'હું ખોવાઈ ગયો છું', 'મને સમજાતું નથી', 'હું બીમાર છું', 'દુખે છે', 'બહુ મોંઘું', 'મને ડૉક્ટરની જરૂર છે', 'વધુ ધીમે', 'શું તમે અંગ્રેજી બોલો છો', 'શૌચાલય ક્યાં છે'
        ],
        he: [
            'שלום', 'תודה', 'בבקשה', 'סליחה', 'בוקר טוב', 'ערב טוב', 'מים', 'לחם', 'כמה זה עולה', 'איפה',
            'שמאלה', 'ימינה', 'ישר', 'רחוב', 'פתוח', 'סגור', 'כניסה', 'יציאה', 'מפתח', 'החשבון',
            'עזרה', 'הלכתי לאיבוד', 'אני לא מבין', 'אני חולה', 'כואב לי', 'יקר מדי', 'אני צריך רופא', 'לאט יותר', 'אתה מדבר אנגלית', 'איפה השירותים'
        ],
        hi: [
            'नमस्ते', 'धन्यवाद', 'कृपया', 'माफ़ कीजिए', 'सुप्रभात', 'शुभ संध्या', 'पानी', 'रोटी', 'कितने का है', 'कहाँ है',
            'बाईं ओर', 'दाईं ओर', 'सीधे', 'सड़क', 'खुला', 'बंद', 'प्रवेश', 'निकास', 'चाबी', 'बिल',
            'मदद', 'मैं खो गया हूँ', 'मुझे समझ नहीं आया', 'मैं बीमार हूँ', 'दर्द हो रहा है', 'बहुत महंगा', 'मुझे डॉक्टर चाहिए', 'धीरे बोलिए', 'क्या आप अंग्रेज़ी बोलते हैं', 'शौचालय कहाँ है'
        ],
        hr: [
            'dobar dan', 'hvala', 'molim', 'oprostite', 'dobro jutro', 'dobra večer', 'voda', 'kruh', 'koliko košta', 'gdje je',
            'lijevo', 'desno', 'ravno', 'ulica', 'otvoreno', 'zatvoreno', 'ulaz', 'izlaz', 'ključ', 'račun',
            'pomoć', 'izgubio sam se', 'ne razumijem', 'bolestan sam', 'boli me', 'preskupo', 'trebam liječnika', 'sporije', 'govorite li engleski', 'gdje je zahod'
        ],
        hu: [
            'jó napot', 'köszönöm', 'kérem', 'elnézést', 'jó reggelt', 'jó estét', 'víz', 'kenyér', 'mennyibe kerül', 'hol van',
            'balra', 'jobbra', 'egyenesen', 'utca', 'nyitva', 'zárva', 'bejárat', 'kijárat', 'kulcs', 'a számla',
            'segítség', 'eltévedtem', 'nem értem', 'beteg vagyok', 'fáj', 'túl drága', 'orvosra van szükségem', 'lassabban', 'beszél angolul', 'hol van a mosdó'
        ],
        id: [
            'halo', 'terima kasih', 'tolong', 'permisi', 'selamat pagi', 'selamat malam', 'air', 'roti', 'berapa harganya', 'di mana',
            'ke kiri', 'ke kanan', 'lurus', 'jalan', 'buka', 'tutup', 'pintu masuk', 'pintu keluar', 'kunci', 'tagihan',
            'bantuan', 'saya tersesat', 'saya tidak mengerti', 'saya sakit', 'ini sakit', 'terlalu mahal', 'saya butuh dokter', 'lebih pelan', 'apakah anda bisa bahasa inggris', 'di mana toilet'
        ],
        it: [
            'ciao', 'grazie', 'per favore', 'scusi', 'buongiorno', 'buonasera', 'acqua', 'pane', 'quanto costa', "dov'è",
            'a sinistra', 'a destra', 'sempre dritto', 'strada', 'aperto', 'chiuso', 'ingresso', 'uscita', 'chiave', 'il conto',
            'aiuto', 'mi sono perso', 'non capisco', 'sono malato', 'mi fa male', 'troppo caro', 'ho bisogno di un medico', 'più lentamente', 'parla inglese', "dov'è il bagno"
        ],
        ja: [
            'こんにちは', 'ありがとうございます', 'お願いします', 'すみません', 'おはようございます', 'こんばんは', '水', 'パン', 'いくらですか', 'どこですか',
            '左へ', '右へ', 'まっすぐ', '通り', '営業中', '閉店', '入口', '出口', '鍵', 'お会計',
            '助けて', '道に迷いました', 'わかりません', '具合が悪いです', '痛いです', '高すぎます', '医者が必要です', 'もっとゆっくり', '英語を話せますか', 'トイレはどこですか'
        ],
        kn: [
            'ನಮಸ್ಕಾರ', 'ಧನ್ಯವಾದ', 'ದಯವಿಟ್ಟು', 'ಕ್ಷಮಿಸಿ', 'ಶುಭೋದಯ', 'ಶುಭ ಸಂಜೆ', 'ನೀರು', 'ರೊಟ್ಟಿ', 'ಎಷ್ಟು ಬೆಲೆ', 'ಎಲ್ಲಿದೆ',
            'ಎಡಕ್ಕೆ', 'ಬಲಕ್ಕೆ', 'ನೇರವಾಗಿ', 'ರಸ್ತೆ', 'ತೆರೆದಿದೆ', 'ಮುಚ್ಚಿದೆ', 'ಪ್ರವೇಶ', 'ನಿರ್ಗಮನ', 'ಕೀಲಿ', 'ಬಿಲ್',
            'ಸಹಾಯ', 'ನಾನು ದಾರಿ ತಪ್ಪಿದ್ದೇನೆ', 'ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ', 'ನನಗೆ ಹುಷಾರಿಲ್ಲ', 'ನೋವಾಗುತ್ತಿದೆ', 'ತುಂಬಾ ದುಬಾರಿ', 'ನನಗೆ ವೈದ್ಯರ ಅಗತ್ಯವಿದೆ', 'ನಿಧಾನವಾಗಿ', 'ನೀವು ಇಂಗ್ಲಿಷ್ ಮಾತನಾಡುತ್ತೀರಾ', 'ಶೌಚಾಲಯ ಎಲ್ಲಿದೆ'
        ],
        ko: [
            '안녕하세요', '감사합니다', '부탁합니다', '실례합니다', '좋은 아침', '좋은 저녁', '물', '빵', '얼마예요', '어디예요',
            '왼쪽으로', '오른쪽으로', '직진', '거리', '영업 중', '닫힘', '입구', '출구', '열쇠', '계산서',
            '도와주세요', '길을 잃었어요', '이해하지 못해요', '몸이 아파요', '여기가 아파요', '너무 비싸요', '의사가 필요해요', '더 천천히', '영어 하세요', '화장실이 어디예요'
        ],
        lt: [
            'labas', 'ačiū', 'prašau', 'atsiprašau', 'labas rytas', 'labas vakaras', 'vanduo', 'duona', 'kiek kainuoja', 'kur yra',
            'į kairę', 'į dešinę', 'tiesiai', 'gatvė', 'atidaryta', 'uždaryta', 'įėjimas', 'išėjimas', 'raktas', 'sąskaita',
            'pagalba', 'aš pasiklydau', 'nesuprantu', 'aš sergu', 'skauda', 'per brangu', 'man reikia gydytojo', 'lėčiau', 'ar kalbate angliškai', 'kur yra tualetas'
        ],
        lv: [
            'sveiki', 'paldies', 'lūdzu', 'atvainojiet', 'labrīt', 'labvakar', 'ūdens', 'maize', 'cik maksā', 'kur ir',
            'pa kreisi', 'pa labi', 'taisni', 'iela', 'atvērts', 'slēgts', 'ieeja', 'izeja', 'atslēga', 'rēķins',
            'palīgā', 'es esmu apmaldījies', 'es nesaprotu', 'es esmu slims', 'sāp', 'pārāk dārgs', 'man vajag ārstu', 'lēnāk', 'vai jūs runājat angliski', 'kur ir tualete'
        ],
        ml: [
            'നമസ്കാരം', 'നന്ദി', 'ദയവായി', 'ക്ഷമിക്കണം', 'സുപ്രഭാതം', 'ശുഭ സായാഹ്നം', 'വെള്ളം', 'ബ്രെഡ്', 'എത്ര വില', 'എവിടെയാണ്',
            'ഇടത്തേക്ക്', 'വലത്തേക്ക്', 'നേരെ', 'തെരുവ്', 'തുറന്നിരിക്കുന്നു', 'അടച്ചിരിക്കുന്നു', 'പ്രവേശനം', 'പുറത്തേക്ക്', 'താക്കോൽ', 'ബിൽ',
            'സഹായം', 'എനിക്ക് വഴി തെറ്റി', 'എനിക്ക് മനസ്സിലായില്ല', 'എനിക്ക് സുഖമില്ല', 'വേദനിക്കുന്നു', 'വളരെ വില കൂടുതൽ', 'എനിക്ക് ഡോക്ടറെ വേണം', 'പതുക്കെ', 'നിങ്ങൾ ഇംഗ്ലീഷ് സംസാരിക്കുമോ', 'ശൗചാലയം എവിടെയാണ്'
        ],
        mr: [
            'नमस्कार', 'धन्यवाद', 'कृपया', 'माफ करा', 'शुभ प्रभात', 'शुभ संध्याकाळ', 'पाणी', 'पाव', 'किती किंमत', 'कुठे आहे',
            'डावीकडे', 'उजवीकडे', 'सरळ', 'रस्ता', 'उघडे', 'बंद', 'प्रवेश', 'निर्गमन', 'किल्ली', 'बिल',
            'मदत', 'मी हरवलो आहे', 'मला समजत नाही', 'मी आजारी आहे', 'दुखत आहे', 'खूप महाग', 'मला डॉक्टर हवे आहेत', 'हळू बोला', 'तुम्ही इंग्रजी बोलता का', 'स्वच्छतागृह कुठे आहे'
        ],
        ms: [
            'helo', 'terima kasih', 'sila', 'maaf', 'selamat pagi', 'selamat petang', 'air', 'roti', 'berapa harganya', 'di mana',
            'ke kiri', 'ke kanan', 'terus', 'jalan', 'buka', 'tutup', 'pintu masuk', 'pintu keluar', 'kunci', 'bil',
            'tolong', 'saya sesat', 'saya tidak faham', 'saya sakit', 'ia sakit', 'terlalu mahal', 'saya perlukan doktor', 'lebih perlahan', 'adakah anda bercakap bahasa inggeris', 'di mana tandas'
        ],
        nl: [
            'hallo', 'dank u', 'alstublieft', 'pardon', 'goedemorgen', 'goedenavond', 'water', 'brood', 'hoeveel kost het', 'waar is',
            'naar links', 'naar rechts', 'rechtdoor', 'straat', 'open', 'gesloten', 'ingang', 'uitgang', 'sleutel', 'de rekening',
            'help', 'ik ben verdwaald', 'ik begrijp het niet', 'ik ben ziek', 'het doet pijn', 'te duur', 'ik heb een dokter nodig', 'langzamer', 'spreekt u Engels', 'waar is het toilet'
        ],
        no: [
            'hei', 'takk', 'vær så snill', 'unnskyld', 'god morgen', 'god kveld', 'vann', 'brød', 'hva koster det', 'hvor er',
            'til venstre', 'til høyre', 'rett frem', 'gate', 'åpent', 'stengt', 'inngang', 'utgang', 'nøkkel', 'regningen',
            'hjelp', 'jeg har gått meg vill', 'jeg forstår ikke', 'jeg er syk', 'det gjør vondt', 'for dyrt', 'jeg trenger en lege', 'saktere', 'snakker du engelsk', 'hvor er toalettet'
        ],
        pl: [
            'cześć', 'dziękuję', 'proszę', 'przepraszam', 'dzień dobry', 'dobry wieczór', 'woda', 'chleb', 'ile kosztuje', 'gdzie jest',
            'w lewo', 'w prawo', 'prosto', 'ulica', 'otwarte', 'zamknięte', 'wejście', 'wyjście', 'klucz', 'rachunek',
            'pomocy', 'zgubiłem się', 'nie rozumiem', 'jestem chory', 'boli', 'za drogo', 'potrzebuję lekarza', 'wolniej', 'czy mówisz po angielsku', 'gdzie jest toaleta'
        ],
        pt: [
            'olá', 'obrigado', 'por favor', 'desculpe', 'bom dia', 'boa noite', 'água', 'pão', 'quanto custa', 'onde fica',
            'à esquerda', 'à direita', 'em frente', 'rua', 'aberto', 'fechado', 'entrada', 'saída', 'chave', 'a conta',
            'socorro', 'estou perdido', 'não entendo', 'estou doente', 'dói', 'caro demais', 'preciso de um médico', 'mais devagar', 'fala inglês', 'onde fica o banheiro'
        ],
        ro: [
            'bună ziua', 'mulțumesc', 'vă rog', 'scuzați-mă', 'bună dimineața', 'bună seara', 'apă', 'pâine', 'cât costă', 'unde este',
            'la stânga', 'la dreapta', 'drept înainte', 'stradă', 'deschis', 'închis', 'intrare', 'ieșire', 'cheie', 'nota de plată',
            'ajutor', 'm-am rătăcit', 'nu înțeleg', 'sunt bolnav', 'mă doare', 'prea scump', 'am nevoie de un medic', 'mai rar', 'vorbiți engleză', 'unde este toaleta'
        ],
        ru: [
            'привет', 'спасибо', 'пожалуйста', 'извините', 'доброе утро', 'добрый вечер', 'вода', 'хлеб', 'сколько стоит', 'где находится',
            'налево', 'направо', 'прямо', 'улица', 'открыто', 'закрыто', 'вход', 'выход', 'ключ', 'счёт',
            'помогите', 'я заблудился', 'не понимаю', 'я болен', 'болит', 'слишком дорого', 'мне нужен врач', 'помедленнее', 'вы говорите по-английски', 'где туалет'
        ],
        sk: [
            'dobrý deň', 'ďakujem', 'prosím', 'prepáčte', 'dobré ráno', 'dobrý večer', 'voda', 'chlieb', 'koľko to stojí', 'kde je',
            'doľava', 'doprava', 'rovno', 'ulica', 'otvorené', 'zatvorené', 'vchod', 'východ', 'kľúč', 'účet',
            'pomoc', 'stratil som sa', 'nerozumiem', 'som chorý', 'bolí to', 'príliš drahé', 'potrebujem lekára', 'pomalšie', 'hovoríte po anglicky', 'kde je toaleta'
        ],
        sl: [
            'dober dan', 'hvala', 'prosim', 'oprostite', 'dobro jutro', 'dober večer', 'voda', 'kruh', 'koliko stane', 'kje je',
            'levo', 'desno', 'naravnost', 'ulica', 'odprto', 'zaprto', 'vhod', 'izhod', 'ključ', 'račun',
            'pomoč', 'izgubil sem se', 'ne razumem', 'bolan sem', 'boli', 'predrago', 'potrebujem zdravnika', 'počasneje', 'govorite angleško', 'kje je stranišče'
        ],
        sr: [
            'здраво', 'хвала', 'молим', 'извините', 'добро јутро', 'добро вече', 'вода', 'хлеб', 'колико кошта', 'где је',
            'лево', 'десно', 'право', 'улица', 'отворено', 'затворено', 'улаз', 'излаз', 'кључ', 'рачун',
            'помоћ', 'изгубио сам се', 'не разумем', 'болестан сам', 'боли', 'превише скупо', 'треба ми лекар', 'спорије', 'говорите ли енглески', 'где је тоалет'
        ],
        sv: [
            'hej', 'tack', 'snälla', 'ursäkta', 'god morgon', 'god kväll', 'vatten', 'bröd', 'vad kostar det', 'var är',
            'till vänster', 'till höger', 'rakt fram', 'gata', 'öppet', 'stängt', 'ingång', 'utgång', 'nyckel', 'notan',
            'hjälp', 'jag har gått vilse', 'jag förstår inte', 'jag är sjuk', 'det gör ont', 'för dyrt', 'jag behöver en läkare', 'långsammare', 'talar du engelska', 'var är toaletten'
        ],
        sw: [
            'habari', 'asante', 'tafadhali', 'samahani', 'habari ya asubuhi', 'habari ya jioni', 'maji', 'mkate', 'bei gani', 'iko wapi',
            'kushoto', 'kulia', 'moja kwa moja', 'barabara', 'wazi', 'imefungwa', 'mlango wa kuingia', 'njia ya kutoka', 'ufunguo', 'bili',
            'msaada', 'nimepotea', 'sielewi', 'ninaumwa', 'inauma', 'ghali sana', 'nahitaji daktari', 'polepole', 'unazungumza kiingereza', 'choo kiko wapi'
        ],
        ta: [
            'வணக்கம்', 'நன்றி', 'தயவுசெய்து', 'மன்னிக்கவும்', 'காலை வணக்கம்', 'மாலை வணக்கம்', 'தண்ணீர்', 'ரொட்டி', 'எவ்வளவு விலை', 'எங்கே இருக்கிறது',
            'இடதுபுறம்', 'வலதுபுறம்', 'நேராக', 'தெரு', 'திறந்துள்ளது', 'மூடப்பட்டுள்ளது', 'நுழைவு', 'வெளியேறு', 'சாவி', 'பில்',
            'உதவி', 'நான் வழி தவறிவிட்டேன்', 'எனக்குப் புரியவில்லை', 'எனக்கு உடல்நிலை சரியில்லை', 'வலிக்கிறது', 'மிகவும் விலை அதிகம்', 'எனக்கு மருத்துவர் வேண்டும்', 'மெதுவாக', 'நீங்கள் ஆங்கிலம் பேசுவீர்களா', 'கழிப்பறை எங்கே'
        ],
        te: [
            'నమస్కారం', 'ధన్యవాదాలు', 'దయచేసి', 'క్షమించండి', 'శుభోదయం', 'శుభ సాయంత్రం', 'నీరు', 'రొట్టె', 'ఎంత ధర', 'ఎక్కడ ఉంది',
            'ఎడమవైపు', 'కుడివైపు', 'నేరుగా', 'వీధి', 'తెరిచి ఉంది', 'మూసి ఉంది', 'ప్రవేశం', 'నిష్క్రమణ', 'తాళం', 'బిల్లు',
            'సహాయం', 'నేను దారి తప్పాను', 'నాకు అర్థం కావడం లేదు', 'నాకు ఒంట్లో బాగాలేదు', 'నొప్పిగా ఉంది', 'చాలా ఖరీదు', 'నాకు వైద్యుడు కావాలి', 'నెమ్మదిగా', 'మీరు ఇంగ్లీష్ మాట్లాడతారా', 'మరుగుదొడ్డి ఎక్కడ ఉంది'
        ],
        th: [
            'สวัสดี', 'ขอบคุณ', 'กรุณา', 'ขอโทษ', 'อรุณสวัสดิ์', 'สวัสดีตอนเย็น', 'น้ำ', 'ขนมปัง', 'ราคาเท่าไร', 'อยู่ที่ไหน',
            'เลี้ยวซ้าย', 'เลี้ยวขวา', 'ตรงไป', 'ถนน', 'เปิด', 'ปิด', 'ทางเข้า', 'ทางออก', 'กุญแจ', 'บิล',
            'ช่วยด้วย', 'ฉันหลงทาง', 'ไม่เข้าใจ', 'ฉันไม่สบาย', 'เจ็บ', 'แพงเกินไป', 'ฉันต้องการหมอ', 'ช้าลงหน่อย', 'คุณพูดภาษาอังกฤษได้ไหม', 'ห้องน้ำอยู่ที่ไหน'
        ],
        tl: [
            'kumusta', 'salamat', 'pakiusap', 'paumanhin', 'magandang umaga', 'magandang gabi', 'tubig', 'tinapay', 'magkano', 'nasaan',
            'sa kaliwa', 'sa kanan', 'diretso', 'kalye', 'bukas', 'sarado', 'pasukan', 'labasan', 'susi', 'ang bayarin',
            'tulong', 'naligaw ako', 'hindi ko maintindihan', 'may sakit ako', 'masakit', 'masyadong mahal', 'kailangan ko ng doktor', 'mas mabagal', 'marunong ka ba ng ingles', 'nasaan ang banyo'
        ],
        tr: [
            'merhaba', 'teşekkürler', 'lütfen', 'affedersiniz', 'günaydın', 'iyi akşamlar', 'su', 'ekmek', 'ne kadar', 'nerede',
            'sola', 'sağa', 'düz', 'sokak', 'açık', 'kapalı', 'giriş', 'çıkış', 'anahtar', 'hesap',
            'yardım', 'kayboldum', 'anlamıyorum', 'hastayım', 'ağrıyor', 'çok pahalı', 'doktora ihtiyacım var', 'daha yavaş', 'İngilizce biliyor musunuz', 'tuvalet nerede'
        ],
        uk: [
            'привіт', 'дякую', 'будь ласка', 'вибачте', 'доброго ранку', 'добрий вечір', 'вода', 'хліб', 'скільки коштує', 'де знаходиться',
            'ліворуч', 'праворуч', 'прямо', 'вулиця', 'відчинено', 'зачинено', 'вхід', 'вихід', 'ключ', 'рахунок',
            'допоможіть', 'я заблукав', 'не розумію', 'я хворий', 'болить', 'занадто дорого', 'мені потрібен лікар', 'повільніше', 'ви розмовляєте англійською', 'де туалет'
        ],
        vi: [
            'xin chào', 'cảm ơn', 'làm ơn', 'xin lỗi', 'chào buổi sáng', 'chào buổi tối', 'nước', 'bánh mì', 'bao nhiêu tiền', 'ở đâu',
            'bên trái', 'bên phải', 'đi thẳng', 'đường phố', 'mở cửa', 'đóng cửa', 'lối vào', 'lối ra', 'chìa khóa', 'hóa đơn',
            'cứu với', 'tôi bị lạc', 'tôi không hiểu', 'tôi bị ốm', 'đau quá', 'quá đắt', 'tôi cần bác sĩ', 'chậm hơn', 'bạn có nói tiếng anh không', 'nhà vệ sinh ở đâu'
        ],
        zh: [
            '你好', '谢谢', '请', '请问', '早上好', '晚上好', '水', '面包', '多少钱', '在哪里',
            '向左', '向右', '一直走', '街道', '营业中', '已关门', '入口', '出口', '钥匙', '账单',
            '救命', '我迷路了', '我不明白', '我生病了', '很疼', '太贵了', '我需要医生', '慢一点', '你会说英语吗', '洗手间在哪里'
        ]
    };

    /*
     * Two names for one column.
     *
     * The dropdowns list whatever tags the browser knows, and some of those are
     * two ways of saying the same thing: Norwegian is offered as both `no` and
     * `nb`, and the thirty entries below are the same under either. Somebody who
     * picked the one spelled differently should not be told there is nothing
     * written for their language.
     *
     * Only for tags that read the same. Nynorsk is not here, because it is not
     * Bokmål spelled another way.
     */
    const SAME_AS = { nb: 'no' };

    const column = (tag) => SAME_AS[tag] || tag;

    vocab.levels = () => LEVELS.slice();

    vocab.has = (tag) => Object.prototype.hasOwnProperty.call(WORDS, column(tag));

    vocab.languages = () => Object.keys(WORDS);

    /*
     * The three sets for one pair, built fresh on every call.
     *
     * Fresh because what comes out of here can end up in the store — a set that
     * is played becomes one of yours — and the store writes into what it is
     * given: languages onto words, repetitions as they are answered. One shared
     * array would hand the next reader somebody else's progress.
     *
     * Both languages are written on the set. The pair is known here, and a
     * ready-made set has no business leaving it to a detector to work out that
     * these ten lines are Greek.
     *
     * An unknown language, or the same one twice, gives nothing rather than an
     * empty set: there is no set to show, and a card with no words in it says
     * there is one.
     */
    vocab.sets = (learn, translation) => {
        const from = column(learn);
        const into = column(translation);

        if (!vocab.has(from) || !vocab.has(into) || from === into) return [];

        return LEVELS.map((level, i) => ({
            level: level,
            originalLang: learn,
            translationLang: translation,
            words: WORDS[from].slice(i * PER_LEVEL, (i + 1) * PER_LEVEL).map((word, j) => ({
                original: word,
                translation: WORDS[into][i * PER_LEVEL + j],
                repetitions: []
            }))
        }));
    };
}
vocab();

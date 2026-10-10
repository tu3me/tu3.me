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
     * Three sets of ten, in one run of thirty: two for travelling and one past
     * it.
     *
     * The first two are the order the words are needed in rather than two grades
     * of difficulty: what is said on arrival, and what gets you across a city.
     * They are what somebody can be handed before a trip and work through on the
     * plane.
     *
     * The third is the one that really is a grade. Ten pairs of words, nothing to
     * do with travelling: good health, fresh air, a close friend — what somebody
     * talks about once they can already ask for bread.
     *
     * Many of the first twenty are two or three words rather than one. "Straight
     * ahead" and "how much" are what a traveller actually needs, and neither of
     * them is a word; a table of bare nouns teaches somebody to name things they
     * cannot ask for.
     *
     * The last ten are two words apiece, and the pairing is what makes them the
     * hard set. Which word goes with which is the one thing neither word tells
     * you: English has heavy rain where Russian has strong, and somebody who
     * knows both words still says the wrong one. In most of these columns the
     * first word has to agree with the second as well, and in a few — Freizeit,
     * Alltag, äidinkieli — the two have grown into one word, which is itself
     * worth meeting. A bare noun teaches none of that.
     *
     * They were ten whole sentences before — "I am lost", "I need a doctor",
     * "where is the toilet" — and that made the third set a second travel set
     * rather than a harder one. An emergency sentence is learned where it is
     * needed, from a phrasebook open at the right page; what a daily drill is
     * good for is the vocabulary nobody picks up by being somewhere.
     *
     * Two of those sentences were "I am ill" and "it hurts", and whatever stands
     * here, those are not coming back. This is an app somebody opens for a few
     * minutes a day, most days, and the algorithm brings a card round again for
     * exactly as long as it keeps being answered — which is to say for months.
     * Reciting your own sickness for months is a mood nobody asked for.
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
     *   Advanced, past the travelling:
     *     good-health fresh-air free-time good-mood bad-weather
     *     close-friend hard-work good-advice daily-life mother-tongue
     *
     * Chosen so that the two sides of a card differ. A set of travel nouns walks
     * straight into the international ones, and "passport → passport" is a card
     * that teaches nothing and reads as a bug: a first pass of this table had
     * passport, hotel, menu, pharmacy, police, hospital, ticket and airport in
     * it, and those eight rows alone put 182 identical cards into the catalogue.
     * What replaced them is native-rooted in most languages -- a street, a key, a
     * way out -- or, in the last ten, a pair of words, which almost never matches
     * end to end even when one word inside it is borrowed.
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
     * language is a name. In the last ten the German noun takes its capital and
     * the adjective in front of it does not -- gute Gesundheit, frische Luft --
     * which is the rule and not an exception to it.
     *
     * The columns are in tag order rather than in any order of importance: a
     * table where one language comes first is a table somebody has to justify,
     * and this one is only ever read by its keys.
     */
    const WORDS = {
        am: [
            'ሰላም', 'አመሰግናለሁ', 'እባክዎ', 'ይቅርታ', 'እንደምን አደሩ', 'እንደምን አመሹ', 'ውሃ', 'ዳቦ', 'ስንት ነው', 'የት ነው',
            'ወደ ግራ', 'ወደ ቀኝ', 'በቀጥታ', 'መንገድ', 'ክፍት', 'ዝግ', 'መግቢያ', 'መውጫ', 'ቁልፍ', 'ሂሳብ',
            'ጥሩ ጤና', 'ንጹህ አየር', 'ነፃ ጊዜ', 'ጥሩ ስሜት', 'መጥፎ የአየር ሁኔታ', 'የቅርብ ጓደኛ', 'ከባድ ሥራ', 'ጥሩ ምክር', 'የዕለት ተዕለት ሕይወት', 'የአፍ መፍቻ ቋንቋ'
        ],
        ar: [
            'مرحبا', 'شكرا', 'من فضلك', 'لو سمحت', 'صباح الخير', 'مساء الخير', 'ماء', 'خبز', 'بكم هذا', 'أين',
            'إلى اليسار', 'إلى اليمين', 'إلى الأمام', 'شارع', 'مفتوح', 'مغلق', 'مدخل', 'مخرج', 'مفتاح', 'الحساب',
            'صحة جيدة', 'هواء نقي', 'وقت فراغ', 'مزاج جيد', 'طقس سيء', 'صديق مقرب', 'عمل شاق', 'نصيحة جيدة', 'الحياة اليومية', 'اللغة الأم'
        ],
        bg: [
            'здравейте', 'благодаря', 'моля', 'извинете', 'добро утро', 'добър вечер', 'вода', 'хляб', 'колко струва', 'къде е',
            'наляво', 'надясно', 'направо', 'улица', 'отворено', 'затворено', 'вход', 'изход', 'ключ', 'сметката',
            'добро здраве', 'чист въздух', 'свободно време', 'добро настроение', 'лошо време', 'близък приятел', 'тежка работа', 'добър съвет', 'всекидневен живот', 'роден език'
        ],
        bn: [
            'নমস্কার', 'ধন্যবাদ', 'দয়া করে', 'মাফ করবেন', 'সুপ্রভাত', 'শুভ সন্ধ্যা', 'পানি', 'রুটি', 'কত দাম', 'কোথায়',
            'বাঁ দিকে', 'ডান দিকে', 'সোজা', 'রাস্তা', 'খোলা', 'বন্ধ', 'প্রবেশপথ', 'প্রস্থান', 'চাবি', 'বিল',
            'ভালো স্বাস্থ্য', 'তাজা বাতাস', 'অবসর সময়', 'ভালো মেজাজ', 'খারাপ আবহাওয়া', 'ঘনিষ্ঠ বন্ধু', 'কঠিন পরিশ্রম', 'ভালো পরামর্শ', 'দৈনন্দিন জীবন', 'মাতৃভাষা'
        ],
        ca: [
            'hola', 'gràcies', 'si us plau', 'perdoni', 'bon dia', 'bona nit', 'aigua', 'pa', 'quant costa', 'on és',
            "a l'esquerra", 'a la dreta', 'tot recte', 'carrer', 'obert', 'tancat', 'entrada', 'sortida', 'clau', 'el compte',
            'bona salut', 'aire fresc', 'temps lliure', 'bon humor', 'mal temps', 'amic íntim', 'feina dura', 'bon consell', 'vida quotidiana', 'llengua materna'
        ],
        cs: [
            'dobrý den', 'děkuji', 'prosím', 'promiňte', 'dobré ráno', 'dobrý večer', 'voda', 'chléb', 'kolik to stojí', 'kde je',
            'doleva', 'doprava', 'rovně', 'ulice', 'otevřeno', 'zavřeno', 'vchod', 'východ', 'klíč', 'účet',
            'dobré zdraví', 'čerstvý vzduch', 'volný čas', 'dobrá nálada', 'špatné počasí', 'blízký přítel', 'těžká práce', 'dobrá rada', 'každodenní život', 'mateřský jazyk'
        ],
        da: [
            'hej', 'tak', 'venligst', 'undskyld', 'godmorgen', 'godaften', 'vand', 'brød', 'hvad koster det', 'hvor er',
            'til venstre', 'til højre', 'ligeud', 'gade', 'åbent', 'lukket', 'indgang', 'udgang', 'nøgle', 'regningen',
            'godt helbred', 'frisk luft', 'fritid', 'godt humør', 'dårligt vejr', 'nær ven', 'hårdt arbejde', 'godt råd', 'hverdagsliv', 'modersmål'
        ],
        de: [
            'hallo', 'danke', 'bitte', 'Entschuldigung', 'guten Morgen', 'guten Abend', 'Wasser', 'Brot', 'wie viel kostet das', 'wo ist',
            'nach links', 'nach rechts', 'geradeaus', 'Straße', 'geöffnet', 'geschlossen', 'Eingang', 'Ausgang', 'Schlüssel', 'die Rechnung',
            'gute Gesundheit', 'frische Luft', 'Freizeit', 'gute Laune', 'schlechtes Wetter', 'enger Freund', 'harte Arbeit', 'guter Rat', 'Alltag', 'Muttersprache'
        ],
        el: [
            'γεια σας', 'ευχαριστώ', 'παρακαλώ', 'συγγνώμη', 'καλημέρα', 'καλησπέρα', 'νερό', 'ψωμί', 'πόσο κάνει', 'πού είναι',
            'αριστερά', 'δεξιά', 'ευθεία', 'δρόμος', 'ανοιχτά', 'κλειστά', 'είσοδος', 'έξοδος', 'κλειδί', 'ο λογαριασμός',
            'καλή υγεία', 'καθαρός αέρας', 'ελεύθερος χρόνος', 'καλή διάθεση', 'κακός καιρός', 'στενός φίλος', 'σκληρή δουλειά', 'καλή συμβουλή', 'καθημερινή ζωή', 'μητρική γλώσσα'
        ],
        en: [
            'hello', 'thank you', 'please', 'excuse me', 'good morning', 'good evening', 'water', 'bread', 'how much', 'where is',
            'to the left', 'to the right', 'straight ahead', 'street', 'open', 'closed', 'entrance', 'exit', 'key', 'the bill',
            'good health', 'fresh air', 'free time', 'good mood', 'bad weather', 'close friend', 'hard work', 'good advice', 'daily life', 'mother tongue'
        ],
        es: [
            'hola', 'gracias', 'por favor', 'perdone', 'buenos días', 'buenas noches', 'agua', 'pan', 'cuánto cuesta', 'dónde está',
            'a la izquierda', 'a la derecha', 'todo recto', 'calle', 'abierto', 'cerrado', 'entrada', 'salida', 'llave', 'la cuenta',
            'buena salud', 'aire fresco', 'tiempo libre', 'buen humor', 'mal tiempo', 'amigo íntimo', 'trabajo duro', 'buen consejo', 'vida diaria', 'lengua materna'
        ],
        et: [
            'tere', 'aitäh', 'palun', 'vabandust', 'tere hommikust', 'tere õhtust', 'vesi', 'leib', 'kui palju maksab', 'kus on',
            'vasakule', 'paremale', 'otse', 'tänav', 'avatud', 'suletud', 'sissepääs', 'väljapääs', 'võti', 'arve',
            'hea tervis', 'värske õhk', 'vaba aeg', 'hea tuju', 'halb ilm', 'lähedane sõber', 'raske töö', 'hea nõuanne', 'igapäevaelu', 'emakeel'
        ],
        fa: [
            'سلام', 'متشکرم', 'لطفا', 'ببخشید', 'صبح بخیر', 'عصر بخیر', 'آب', 'نان', 'چند است', 'کجاست',
            'به چپ', 'به راست', 'مستقیم', 'خیابان', 'باز', 'بسته', 'ورودی', 'خروجی', 'کلید', 'صورتحساب',
            'سلامتی خوب', 'هوای تازه', 'وقت آزاد', 'حال خوب', 'هوای بد', 'دوست صمیمی', 'کار سخت', 'نصیحت خوب', 'زندگی روزمره', 'زبان مادری'
        ],
        fi: [
            'hei', 'kiitos', 'ole hyvä', 'anteeksi', 'hyvää huomenta', 'hyvää iltaa', 'vesi', 'leipä', 'paljonko maksaa', 'missä on',
            'vasemmalle', 'oikealle', 'suoraan', 'katu', 'avoinna', 'suljettu', 'sisäänkäynti', 'uloskäynti', 'avain', 'lasku',
            'hyvä terveys', 'raikas ilma', 'vapaa-aika', 'hyvä tuuli', 'huono sää', 'läheinen ystävä', 'kova työ', 'hyvä neuvo', 'arkielämä', 'äidinkieli'
        ],
        fr: [
            'salut', 'merci', "s'il vous plaît", 'excusez-moi', 'bonjour', 'bonsoir', 'eau', 'pain', 'combien ça coûte', 'où est',
            'à gauche', 'à droite', 'tout droit', 'rue', 'ouvert', 'fermé', 'entrée', 'sortie', 'clé', "l'addition",
            'bonne santé', 'air frais', 'temps libre', 'bonne humeur', 'mauvais temps', 'ami proche', 'travail dur', 'bon conseil', 'vie quotidienne', 'langue maternelle'
        ],
        gu: [
            'નમસ્તે', 'આભાર', 'કૃપા કરીને', 'માફ કરશો', 'સુપ્રભાત', 'શુભ સાંજ', 'પાણી', 'રોટલી', 'કેટલું છે', 'ક્યાં છે',
            'ડાબી બાજુ', 'જમણી બાજુ', 'સીધા', 'શેરી', 'ખુલ્લું', 'બંધ', 'પ્રવેશ', 'નિર્ગમન', 'ચાવી', 'બિલ',
            'સારું આરોગ્ય', 'તાજી હવા', 'ફુરસદનો સમય', 'સારો મિજાજ', 'ખરાબ હવામાન', 'ગાઢ મિત્ર', 'સખત મહેનત', 'સારી સલાહ', 'રોજિંદું જીવન', 'માતૃભાષા'
        ],
        he: [
            'שלום', 'תודה', 'בבקשה', 'סליחה', 'בוקר טוב', 'ערב טוב', 'מים', 'לחם', 'כמה זה עולה', 'איפה',
            'שמאלה', 'ימינה', 'ישר', 'רחוב', 'פתוח', 'סגור', 'כניסה', 'יציאה', 'מפתח', 'החשבון',
            'בריאות טובה', 'אוויר צח', 'זמן פנוי', 'מצב רוח טוב', 'מזג אוויר רע', 'חבר קרוב', 'עבודה קשה', 'עצה טובה', 'חיי היומיום', 'שפת אם'
        ],
        hi: [
            'नमस्ते', 'धन्यवाद', 'कृपया', 'माफ़ कीजिए', 'सुप्रभात', 'शुभ संध्या', 'पानी', 'रोटी', 'कितने का है', 'कहाँ है',
            'बाईं ओर', 'दाईं ओर', 'सीधे', 'सड़क', 'खुला', 'बंद', 'प्रवेश', 'निकास', 'चाबी', 'बिल',
            'अच्छा स्वास्थ्य', 'ताज़ी हवा', 'खाली समय', 'अच्छा मिजाज', 'खराब मौसम', 'करीबी दोस्त', 'कड़ी मेहनत', 'अच्छी सलाह', 'रोजमर्रा की जिंदगी', 'मातृभाषा'
        ],
        hr: [
            'dobar dan', 'hvala', 'molim', 'oprostite', 'dobro jutro', 'dobra večer', 'voda', 'kruh', 'koliko košta', 'gdje je',
            'lijevo', 'desno', 'ravno', 'ulica', 'otvoreno', 'zatvoreno', 'ulaz', 'izlaz', 'ključ', 'račun',
            'dobro zdravlje', 'svjež zrak', 'slobodno vrijeme', 'dobro raspoloženje', 'loše vrijeme', 'blizak prijatelj', 'težak posao', 'dobar savjet', 'svakodnevni život', 'materinski jezik'
        ],
        hu: [
            'jó napot', 'köszönöm', 'kérem', 'elnézést', 'jó reggelt', 'jó estét', 'víz', 'kenyér', 'mennyibe kerül', 'hol van',
            'balra', 'jobbra', 'egyenesen', 'utca', 'nyitva', 'zárva', 'bejárat', 'kijárat', 'kulcs', 'a számla',
            'jó egészség', 'friss levegő', 'szabadidő', 'jó hangulat', 'rossz idő', 'közeli barát', 'kemény munka', 'jó tanács', 'mindennapi élet', 'anyanyelv'
        ],
        id: [
            'halo', 'terima kasih', 'tolong', 'permisi', 'selamat pagi', 'selamat malam', 'air', 'roti', 'berapa harganya', 'di mana',
            'ke kiri', 'ke kanan', 'lurus', 'jalan', 'buka', 'tutup', 'pintu masuk', 'pintu keluar', 'kunci', 'tagihan',
            'kesehatan yang baik', 'udara segar', 'waktu luang', 'suasana hati yang baik', 'cuaca buruk', 'teman dekat', 'kerja keras', 'nasihat yang baik', 'kehidupan sehari-hari', 'bahasa ibu'
        ],
        it: [
            'ciao', 'grazie', 'per favore', 'scusi', 'buongiorno', 'buonasera', 'acqua', 'pane', 'quanto costa', "dov'è",
            'a sinistra', 'a destra', 'sempre dritto', 'strada', 'aperto', 'chiuso', 'ingresso', 'uscita', 'chiave', 'il conto',
            'buona salute', 'aria fresca', 'tempo libero', 'buon umore', 'brutto tempo', 'amico intimo', 'lavoro duro', 'buon consiglio', 'vita quotidiana', 'lingua madre'
        ],
        ja: [
            'こんにちは', 'ありがとうございます', 'お願いします', 'すみません', 'おはようございます', 'こんばんは', '水', 'パン', 'いくらですか', 'どこですか',
            '左へ', '右へ', 'まっすぐ', '通り', '営業中', '閉店', '入口', '出口', '鍵', 'お会計',
            '健康な体', '新鮮な空気', '自由な時間', '良い気分', '悪い天気', '親しい友達', '大変な仕事', '良い助言', '日常生活', '母国語'
        ],
        kn: [
            'ನಮಸ್ಕಾರ', 'ಧನ್ಯವಾದ', 'ದಯವಿಟ್ಟು', 'ಕ್ಷಮಿಸಿ', 'ಶುಭೋದಯ', 'ಶುಭ ಸಂಜೆ', 'ನೀರು', 'ರೊಟ್ಟಿ', 'ಎಷ್ಟು ಬೆಲೆ', 'ಎಲ್ಲಿದೆ',
            'ಎಡಕ್ಕೆ', 'ಬಲಕ್ಕೆ', 'ನೇರವಾಗಿ', 'ರಸ್ತೆ', 'ತೆರೆದಿದೆ', 'ಮುಚ್ಚಿದೆ', 'ಪ್ರವೇಶ', 'ನಿರ್ಗಮನ', 'ಕೀಲಿ', 'ಬಿಲ್',
            'ಉತ್ತಮ ಆರೋಗ್ಯ', 'ತಾಜಾ ಗಾಳಿ', 'ಬಿಡುವಿನ ಸಮಯ', 'ಒಳ್ಳೆಯ ಮನಸ್ಥಿತಿ', 'ಕೆಟ್ಟ ಹವಾಮಾನ', 'ಆಪ್ತ ಸ್ನೇಹಿತ', 'ಕಠಿಣ ಪರಿಶ್ರಮ', 'ಒಳ್ಳೆಯ ಸಲಹೆ', 'ದೈನಂದಿನ ಜೀವನ', 'ಮಾತೃಭಾಷೆ'
        ],
        ko: [
            '안녕하세요', '감사합니다', '부탁합니다', '실례합니다', '좋은 아침', '좋은 저녁', '물', '빵', '얼마예요', '어디예요',
            '왼쪽으로', '오른쪽으로', '직진', '거리', '영업 중', '닫힘', '입구', '출구', '열쇠', '계산서',
            '좋은 건강', '신선한 공기', '자유 시간', '좋은 기분', '나쁜 날씨', '가까운 친구', '힘든 일', '좋은 조언', '일상생활', '모국어'
        ],
        lt: [
            'labas', 'ačiū', 'prašau', 'atsiprašau', 'labas rytas', 'labas vakaras', 'vanduo', 'duona', 'kiek kainuoja', 'kur yra',
            'į kairę', 'į dešinę', 'tiesiai', 'gatvė', 'atidaryta', 'uždaryta', 'įėjimas', 'išėjimas', 'raktas', 'sąskaita',
            'gera sveikata', 'grynas oras', 'laisvas laikas', 'gera nuotaika', 'blogas oras', 'artimas draugas', 'sunkus darbas', 'geras patarimas', 'kasdienis gyvenimas', 'gimtoji kalba'
        ],
        lv: [
            'sveiki', 'paldies', 'lūdzu', 'atvainojiet', 'labrīt', 'labvakar', 'ūdens', 'maize', 'cik maksā', 'kur ir',
            'pa kreisi', 'pa labi', 'taisni', 'iela', 'atvērts', 'slēgts', 'ieeja', 'izeja', 'atslēga', 'rēķins',
            'laba veselība', 'svaigs gaiss', 'brīvais laiks', 'labs garastāvoklis', 'slikts laiks', 'tuvs draugs', 'smags darbs', 'labs padoms', 'ikdienas dzīve', 'dzimtā valoda'
        ],
        ml: [
            'നമസ്കാരം', 'നന്ദി', 'ദയവായി', 'ക്ഷമിക്കണം', 'സുപ്രഭാതം', 'ശുഭ സായാഹ്നം', 'വെള്ളം', 'ബ്രെഡ്', 'എത്ര വില', 'എവിടെയാണ്',
            'ഇടത്തേക്ക്', 'വലത്തേക്ക്', 'നേരെ', 'തെരുവ്', 'തുറന്നിരിക്കുന്നു', 'അടച്ചിരിക്കുന്നു', 'പ്രവേശനം', 'പുറത്തേക്ക്', 'താക്കോൽ', 'ബിൽ',
            'നല്ല ആരോഗ്യം', 'ശുദ്ധവായു', 'ഒഴിവു സമയം', 'നല്ല മാനസികാവസ്ഥ', 'മോശം കാലാവസ്ഥ', 'അടുത്ത സുഹൃത്ത്', 'കഠിനാധ്വാനം', 'നല്ല ഉപദേശം', 'ദൈനംദിന ജീവിതം', 'മാതൃഭാഷ'
        ],
        mr: [
            'नमस्कार', 'धन्यवाद', 'कृपया', 'माफ करा', 'शुभ प्रभात', 'शुभ संध्याकाळ', 'पाणी', 'पाव', 'किती किंमत', 'कुठे आहे',
            'डावीकडे', 'उजवीकडे', 'सरळ', 'रस्ता', 'उघडे', 'बंद', 'प्रवेश', 'निर्गमन', 'किल्ली', 'बिल',
            'चांगले आरोग्य', 'ताजी हवा', 'मोकळा वेळ', 'चांगला मूड', 'खराब हवामान', 'जवळचा मित्र', 'कठीण काम', 'चांगला सल्ला', 'दैनंदिन जीवन', 'मातृभाषा'
        ],
        ms: [
            'helo', 'terima kasih', 'sila', 'maaf', 'selamat pagi', 'selamat petang', 'air', 'roti', 'berapa harganya', 'di mana',
            'ke kiri', 'ke kanan', 'terus', 'jalan', 'buka', 'tutup', 'pintu masuk', 'pintu keluar', 'kunci', 'bil',
            'kesihatan yang baik', 'udara segar', 'masa lapang', 'suasana hati yang baik', 'cuaca buruk', 'kawan rapat', 'kerja keras', 'nasihat yang baik', 'kehidupan seharian', 'bahasa ibunda'
        ],
        nl: [
            'hallo', 'dank u', 'alstublieft', 'pardon', 'goedemorgen', 'goedenavond', 'water', 'brood', 'hoeveel kost het', 'waar is',
            'naar links', 'naar rechts', 'rechtdoor', 'straat', 'open', 'gesloten', 'ingang', 'uitgang', 'sleutel', 'de rekening',
            'goede gezondheid', 'frisse lucht', 'vrije tijd', 'goed humeur', 'slecht weer', 'goede vriend', 'hard werk', 'goed advies', 'dagelijks leven', 'moedertaal'
        ],
        no: [
            'hei', 'takk', 'vær så snill', 'unnskyld', 'god morgen', 'god kveld', 'vann', 'brød', 'hva koster det', 'hvor er',
            'til venstre', 'til høyre', 'rett frem', 'gate', 'åpent', 'stengt', 'inngang', 'utgang', 'nøkkel', 'regningen',
            'god helse', 'frisk luft', 'fritid', 'godt humør', 'dårlig vær', 'nær venn', 'hardt arbeid', 'godt råd', 'hverdagsliv', 'morsmål'
        ],
        pl: [
            'cześć', 'dziękuję', 'proszę', 'przepraszam', 'dzień dobry', 'dobry wieczór', 'woda', 'chleb', 'ile kosztuje', 'gdzie jest',
            'w lewo', 'w prawo', 'prosto', 'ulica', 'otwarte', 'zamknięte', 'wejście', 'wyjście', 'klucz', 'rachunek',
            'dobre zdrowie', 'świeże powietrze', 'wolny czas', 'dobry nastrój', 'zła pogoda', 'bliski przyjaciel', 'ciężka praca', 'dobra rada', 'codzienne życie', 'język ojczysty'
        ],
        pt: [
            'olá', 'obrigado', 'por favor', 'desculpe', 'bom dia', 'boa noite', 'água', 'pão', 'quanto custa', 'onde fica',
            'à esquerda', 'à direita', 'em frente', 'rua', 'aberto', 'fechado', 'entrada', 'saída', 'chave', 'a conta',
            'boa saúde', 'ar fresco', 'tempo livre', 'bom humor', 'mau tempo', 'amigo próximo', 'trabalho duro', 'bom conselho', 'vida cotidiana', 'língua materna'
        ],
        ro: [
            'bună ziua', 'mulțumesc', 'vă rog', 'scuzați-mă', 'bună dimineața', 'bună seara', 'apă', 'pâine', 'cât costă', 'unde este',
            'la stânga', 'la dreapta', 'drept înainte', 'stradă', 'deschis', 'închis', 'intrare', 'ieșire', 'cheie', 'nota de plată',
            'sănătate bună', 'aer curat', 'timp liber', 'bună dispoziție', 'vreme rea', 'prieten apropiat', 'muncă grea', 'sfat bun', 'viață de zi cu zi', 'limbă maternă'
        ],
        ru: [
            'привет', 'спасибо', 'пожалуйста', 'извините', 'доброе утро', 'добрый вечер', 'вода', 'хлеб', 'сколько стоит', 'где находится',
            'налево', 'направо', 'прямо', 'улица', 'открыто', 'закрыто', 'вход', 'выход', 'ключ', 'счёт',
            'крепкое здоровье', 'свежий воздух', 'свободное время', 'хорошее настроение', 'плохая погода', 'близкий друг', 'тяжёлая работа', 'хороший совет', 'повседневная жизнь', 'родной язык'
        ],
        sk: [
            'dobrý deň', 'ďakujem', 'prosím', 'prepáčte', 'dobré ráno', 'dobrý večer', 'voda', 'chlieb', 'koľko to stojí', 'kde je',
            'doľava', 'doprava', 'rovno', 'ulica', 'otvorené', 'zatvorené', 'vchod', 'východ', 'kľúč', 'účet',
            'dobré zdravie', 'čerstvý vzduch', 'voľný čas', 'dobrá nálada', 'zlé počasie', 'blízky priateľ', 'ťažká práca', 'dobrá rada', 'každodenný život', 'materinský jazyk'
        ],
        sl: [
            'dober dan', 'hvala', 'prosim', 'oprostite', 'dobro jutro', 'dober večer', 'voda', 'kruh', 'koliko stane', 'kje je',
            'levo', 'desno', 'naravnost', 'ulica', 'odprto', 'zaprto', 'vhod', 'izhod', 'ključ', 'račun',
            'dobro zdravje', 'svež zrak', 'prosti čas', 'dobro razpoloženje', 'slabo vreme', 'bližnji prijatelj', 'težko delo', 'dober nasvet', 'vsakdanje življenje', 'materni jezik'
        ],
        sr: [
            'здраво', 'хвала', 'молим', 'извините', 'добро јутро', 'добро вече', 'вода', 'хлеб', 'колико кошта', 'где је',
            'лево', 'десно', 'право', 'улица', 'отворено', 'затворено', 'улаз', 'излаз', 'кључ', 'рачун',
            'добро здравље', 'свеж ваздух', 'слободно време', 'добро расположење', 'лоше време', 'близак пријатељ', 'тежак посао', 'добар савет', 'свакодневни живот', 'матерњи језик'
        ],
        sv: [
            'hej', 'tack', 'snälla', 'ursäkta', 'god morgon', 'god kväll', 'vatten', 'bröd', 'vad kostar det', 'var är',
            'till vänster', 'till höger', 'rakt fram', 'gata', 'öppet', 'stängt', 'ingång', 'utgång', 'nyckel', 'notan',
            'god hälsa', 'frisk luft', 'fritid', 'gott humör', 'dåligt väder', 'nära vän', 'hårt arbete', 'gott råd', 'vardagsliv', 'modersmål'
        ],
        sw: [
            'habari', 'asante', 'tafadhali', 'samahani', 'habari ya asubuhi', 'habari ya jioni', 'maji', 'mkate', 'bei gani', 'iko wapi',
            'kushoto', 'kulia', 'moja kwa moja', 'barabara', 'wazi', 'imefungwa', 'mlango wa kuingia', 'njia ya kutoka', 'ufunguo', 'bili',
            'afya njema', 'hewa safi', 'muda wa kupumzika', 'hisia nzuri', 'hali mbaya ya hewa', 'rafiki wa karibu', 'kazi ngumu', 'ushauri mzuri', 'maisha ya kila siku', 'lugha ya mama'
        ],
        ta: [
            'வணக்கம்', 'நன்றி', 'தயவுசெய்து', 'மன்னிக்கவும்', 'காலை வணக்கம்', 'மாலை வணக்கம்', 'தண்ணீர்', 'ரொட்டி', 'எவ்வளவு விலை', 'எங்கே இருக்கிறது',
            'இடதுபுறம்', 'வலதுபுறம்', 'நேராக', 'தெரு', 'திறந்துள்ளது', 'மூடப்பட்டுள்ளது', 'நுழைவு', 'வெளியேறு', 'சாவி', 'பில்',
            'நல்ல ஆரோக்கியம்', 'புதிய காற்று', 'ஓய்வு நேரம்', 'நல்ல மனநிலை', 'மோசமான வானிலை', 'நெருங்கிய நண்பர்', 'கடின உழைப்பு', 'நல்ல அறிவுரை', 'அன்றாட வாழ்க்கை', 'தாய்மொழி'
        ],
        te: [
            'నమస్కారం', 'ధన్యవాదాలు', 'దయచేసి', 'క్షమించండి', 'శుభోదయం', 'శుభ సాయంత్రం', 'నీరు', 'రొట్టె', 'ఎంత ధర', 'ఎక్కడ ఉంది',
            'ఎడమవైపు', 'కుడివైపు', 'నేరుగా', 'వీధి', 'తెరిచి ఉంది', 'మూసి ఉంది', 'ప్రవేశం', 'నిష్క్రమణ', 'తాళం', 'బిల్లు',
            'మంచి ఆరోగ్యం', 'స్వచ్ఛమైన గాలి', 'ఖాళీ సమయం', 'మంచి మానసిక స్థితి', 'చెడు వాతావరణం', 'సన్నిహిత స్నేహితుడు', 'కఠిన శ్రమ', 'మంచి సలహా', 'దైనందిన జీవితం', 'మాతృభాష'
        ],
        th: [
            'สวัสดี', 'ขอบคุณ', 'กรุณา', 'ขอโทษ', 'อรุณสวัสดิ์', 'สวัสดีตอนเย็น', 'น้ำ', 'ขนมปัง', 'ราคาเท่าไร', 'อยู่ที่ไหน',
            'เลี้ยวซ้าย', 'เลี้ยวขวา', 'ตรงไป', 'ถนน', 'เปิด', 'ปิด', 'ทางเข้า', 'ทางออก', 'กุญแจ', 'บิล',
            'สุขภาพดี', 'อากาศบริสุทธิ์', 'เวลาว่าง', 'อารมณ์ดี', 'อากาศไม่ดี', 'เพื่อนสนิท', 'งานหนัก', 'คำแนะนำที่ดี', 'ชีวิตประจำวัน', 'ภาษาแม่'
        ],
        tl: [
            'kumusta', 'salamat', 'pakiusap', 'paumanhin', 'magandang umaga', 'magandang gabi', 'tubig', 'tinapay', 'magkano', 'nasaan',
            'sa kaliwa', 'sa kanan', 'diretso', 'kalye', 'bukas', 'sarado', 'pasukan', 'labasan', 'susi', 'ang bayarin',
            'magandang kalusugan', 'sariwang hangin', 'libreng oras', 'magandang kalooban', 'masamang panahon', 'malapit na kaibigan', 'mahirap na trabaho', 'magandang payo', 'pang-araw-araw na buhay', 'katutubong wika'
        ],
        tr: [
            'merhaba', 'teşekkürler', 'lütfen', 'affedersiniz', 'günaydın', 'iyi akşamlar', 'su', 'ekmek', 'ne kadar', 'nerede',
            'sola', 'sağa', 'düz', 'sokak', 'açık', 'kapalı', 'giriş', 'çıkış', 'anahtar', 'hesap',
            'iyi sağlık', 'temiz hava', 'boş zaman', 'iyi ruh hali', 'kötü hava', 'yakın arkadaş', 'ağır iş', 'iyi tavsiye', 'günlük hayat', 'ana dil'
        ],
        uk: [
            'привіт', 'дякую', 'будь ласка', 'вибачте', 'доброго ранку', 'добрий вечір', 'вода', 'хліб', 'скільки коштує', 'де знаходиться',
            'ліворуч', 'праворуч', 'прямо', 'вулиця', 'відчинено', 'зачинено', 'вхід', 'вихід', 'ключ', 'рахунок',
            'міцне здоров’я', 'свіже повітря', 'вільний час', 'гарний настрій', 'погана погода', 'близький друг', 'важка робота', 'добра порада', 'повсякденне життя', 'рідна мова'
        ],
        vi: [
            'xin chào', 'cảm ơn', 'làm ơn', 'xin lỗi', 'chào buổi sáng', 'chào buổi tối', 'nước', 'bánh mì', 'bao nhiêu tiền', 'ở đâu',
            'bên trái', 'bên phải', 'đi thẳng', 'đường phố', 'mở cửa', 'đóng cửa', 'lối vào', 'lối ra', 'chìa khóa', 'hóa đơn',
            'sức khỏe tốt', 'không khí trong lành', 'thời gian rảnh', 'tâm trạng tốt', 'thời tiết xấu', 'bạn thân', 'công việc vất vả', 'lời khuyên tốt', 'cuộc sống hằng ngày', 'tiếng mẹ đẻ'
        ],
        zh: [
            '你好', '谢谢', '请', '请问', '早上好', '晚上好', '水', '面包', '多少钱', '在哪里',
            '向左', '向右', '一直走', '街道', '营业中', '已关门', '入口', '出口', '钥匙', '账单',
            '身体健康', '新鲜空气', '空闲时间', '好心情', '坏天气', '好朋友', '辛苦的工作', '好建议', '日常生活', '母语'
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

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
 * the Brazilian wording (trem, ônibus, cardápio) and for Chinese is simplified
 * characters. A traveller reading the other variant will be understood.
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
     * Half of the entries are two or three words rather than one. "Train station"
     * and "how much" are what a traveller actually needs, and neither of them is
     * a word; a table of bare nouns teaches somebody to name things they cannot
     * ask for. Nothing here is longer than a phrase that fits on a card, and
     * nothing is a sentence with a verb to conjugate -- except the one everybody
     * needs, "I do not understand", which is a fixed phrase in every language
     * here and is learned as one.
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
     *     airport train-station bus-stop ticket luggage
     *     room-key the-bill menu pharmacy city-centre
     *
     *   Advanced, when it goes wrong:
     *     help doctor hospital police passport
     *     emergency-exit too-expensive I-do-not-understand lost-luggage customs
     *
     * German keeps its capitals and nothing else takes one. A noun is capitalised
     * in German wherever it stands, and the other forty-eight capitalise none of
     * these — squaring them up would put a spelling mistake on nearly every card.
     * "danke", "bitte" and "zu teuer" are not nouns, so they stay lower case
     * among them.
     *
     * The columns are in tag order rather than in any order of importance: a
     * table where one language comes first is a table somebody has to justify,
     * and this one is only ever read by its keys.
     */
    const WORDS = {
        am: [
            'ሰላም', 'አመሰግናለሁ', 'እባክህ', 'ይቅርታ', 'እንደምን አደርክ', 'እንደምን አመሸህ', 'ውሃ', 'ዳቦ', 'ስንት ነው', 'የት ነው',
            'አውሮፕላን ማረፊያ', 'ባቡር ጣቢያ', 'አውቶቡስ ፌርማታ', 'ትኬት', 'ሻንጣ', 'የክፍል ቁልፍ', 'ሂሳብ', 'ምናሌ', 'ፋርማሲ', 'የከተማ መሃል',
            'እርዳታ', 'ሐኪም', 'ሆስፒታል', 'ፖሊስ', 'ፓስፖርት', 'የአደጋ መውጫ', 'በጣም ውድ', 'አልገባኝም', 'የጠፋ ሻንጣ', 'ጉምሩክ'
        ],
        ar: [
            'مرحبا', 'شكرا', 'من فضلك', 'عفوا', 'صباح الخير', 'مساء الخير', 'ماء', 'خبز', 'كم الثمن', 'أين يوجد',
            'مطار', 'محطة القطار', 'موقف الحافلات', 'تذكرة', 'حقيبة', 'مفتاح الغرفة', 'الحساب', 'قائمة الطعام', 'صيدلية', 'وسط المدينة',
            'مساعدة', 'طبيب', 'مستشفى', 'شرطة', 'جواز سفر', 'مخرج الطوارئ', 'غالي جدا', 'لا أفهم', 'حقيبة مفقودة', 'الجمارك'
        ],
        bg: [
            'здравей', 'благодаря', 'моля', 'извинете', 'добро утро', 'добър вечер', 'вода', 'хляб', 'колко струва', 'къде е',
            'летище', 'гара', 'автобусна спирка', 'билет', 'багаж', 'ключ от стаята', 'сметката', 'меню', 'аптека', 'центъра на града',
            'помощ', 'лекар', 'болница', 'полиция', 'паспорт', 'авариен изход', 'твърде скъпо', 'не разбирам', 'изгубен багаж', 'митница'
        ],
        bn: [
            'নমস্কার', 'ধন্যবাদ', 'দয়া করে', 'মাফ করবেন', 'সুপ্রভাত', 'শুভ সন্ধ্যা', 'পানি', 'রুটি', 'কত দাম', 'কোথায় আছে',
            'বিমানবন্দর', 'রেল স্টেশন', 'বাস স্টপ', 'টিকিট', 'লাগেজ', 'ঘরের চাবি', 'বিল', 'মেনু', 'ওষুধের দোকান', 'শহরের কেন্দ্র',
            'সাহায্য', 'ডাক্তার', 'হাসপাতাল', 'পুলিশ', 'পাসপোর্ট', 'জরুরি নির্গমন', 'খুব দামি', 'আমি বুঝতে পারছি না', 'হারানো লাগেজ', 'শুল্ক'
        ],
        ca: [
            'hola', 'gràcies', 'si us plau', 'perdoni', 'bon dia', 'bona nit', 'aigua', 'pa', 'quant costa', 'on és',
            'aeroport', 'estació de tren', "parada d'autobús", 'bitllet', 'equipatge', "clau de l'habitació", 'el compte', 'carta', 'farmàcia', 'centre de la ciutat',
            'ajuda', 'metge', 'hospital', 'policia', 'passaport', "sortida d'emergència", 'massa car', 'no ho entenc', 'equipatge perdut', 'duana'
        ],
        cs: [
            'ahoj', 'děkuji', 'prosím', 'promiňte', 'dobré ráno', 'dobrý večer', 'voda', 'chléb', 'kolik to stojí', 'kde je',
            'letiště', 'nádraží', 'autobusová zastávka', 'jízdenka', 'zavazadlo', 'klíč od pokoje', 'účet', 'jídelní lístek', 'lékárna', 'centrum města',
            'pomoc', 'lékař', 'nemocnice', 'policie', 'pas', 'nouzový východ', 'příliš drahé', 'nerozumím', 'ztracené zavazadlo', 'celnice'
        ],
        da: [
            'hej', 'tak', 'venligst', 'undskyld', 'godmorgen', 'godaften', 'vand', 'brød', 'hvad koster det', 'hvor er',
            'lufthavn', 'togstation', 'busstoppested', 'billet', 'bagage', 'værelsesnøgle', 'regningen', 'menu', 'apotek', 'centrum',
            'hjælp', 'læge', 'hospital', 'politi', 'pas', 'nødudgang', 'for dyrt', 'jeg forstår ikke', 'forsvundet bagage', 'told'
        ],
        de: [
            'hallo', 'danke', 'bitte', 'Entschuldigung', 'guten Morgen', 'guten Abend', 'Wasser', 'Brot', 'wie viel kostet das', 'wo ist',
            'Flughafen', 'Bahnhof', 'Bushaltestelle', 'Fahrkarte', 'Gepäck', 'Zimmerschlüssel', 'die Rechnung', 'Speisekarte', 'Apotheke', 'Stadtzentrum',
            'Hilfe', 'Arzt', 'Krankenhaus', 'Polizei', 'Reisepass', 'Notausgang', 'zu teuer', 'ich verstehe nicht', 'verlorenes Gepäck', 'Zoll'
        ],
        el: [
            'γεια σου', 'ευχαριστώ', 'παρακαλώ', 'συγγνώμη', 'καλημέρα', 'καλησπέρα', 'νερό', 'ψωμί', 'πόσο κάνει', 'πού είναι',
            'αεροδρόμιο', 'σιδηροδρομικός σταθμός', 'στάση λεωφορείου', 'εισιτήριο', 'αποσκευές', 'κλειδί δωματίου', 'ο λογαριασμός', 'κατάλογος', 'φαρμακείο', 'κέντρο της πόλης',
            'βοήθεια', 'γιατρός', 'νοσοκομείο', 'αστυνομία', 'διαβατήριο', 'έξοδος κινδύνου', 'πολύ ακριβό', 'δεν καταλαβαίνω', 'χαμένες αποσκευές', 'τελωνείο'
        ],
        en: [
            'hello', 'thank you', 'please', 'excuse me', 'good morning', 'good evening', 'water', 'bread', 'how much', 'where is',
            'airport', 'train station', 'bus stop', 'ticket', 'luggage', 'room key', 'the bill', 'menu', 'pharmacy', 'city centre',
            'help', 'doctor', 'hospital', 'police', 'passport', 'emergency exit', 'too expensive', 'I do not understand', 'lost luggage', 'customs'
        ],
        es: [
            'hola', 'gracias', 'por favor', 'perdone', 'buenos días', 'buenas tardes', 'agua', 'pan', 'cuánto cuesta', 'dónde está',
            'aeropuerto', 'estación de tren', 'parada de autobús', 'billete', 'equipaje', 'llave de la habitación', 'la cuenta', 'carta', 'farmacia', 'centro de la ciudad',
            'ayuda', 'médico', 'hospital', 'policía', 'pasaporte', 'salida de emergencia', 'demasiado caro', 'no entiendo', 'equipaje perdido', 'aduana'
        ],
        et: [
            'tere', 'aitäh', 'palun', 'vabandust', 'tere hommikust', 'tere õhtust', 'vesi', 'leib', 'kui palju maksab', 'kus on',
            'lennujaam', 'raudteejaam', 'bussipeatus', 'pilet', 'pagas', 'toa võti', 'arve', 'menüü', 'apteek', 'kesklinn',
            'appi', 'arst', 'haigla', 'politsei', 'pass', 'hädaväljapääs', 'liiga kallis', 'ma ei saa aru', 'kadunud pagas', 'toll'
        ],
        fa: [
            'سلام', 'متشکرم', 'لطفا', 'ببخشید', 'صبح بخیر', 'عصر بخیر', 'آب', 'نان', 'چند است', 'کجاست',
            'فرودگاه', 'ایستگاه قطار', 'ایستگاه اتوبوس', 'بلیط', 'چمدان', 'کلید اتاق', 'صورتحساب', 'منو', 'داروخانه', 'مرکز شهر',
            'کمک', 'پزشک', 'بیمارستان', 'پلیس', 'گذرنامه', 'خروج اضطراری', 'خیلی گران', 'نمی‌فهمم', 'چمدان گمشده', 'گمرک'
        ],
        fi: [
            'hei', 'kiitos', 'ole hyvä', 'anteeksi', 'hyvää huomenta', 'hyvää iltaa', 'vesi', 'leipä', 'paljonko maksaa', 'missä on',
            'lentokenttä', 'rautatieasema', 'bussipysäkki', 'lippu', 'matkatavarat', 'huoneen avain', 'lasku', 'ruokalista', 'apteekki', 'keskusta',
            'apua', 'lääkäri', 'sairaala', 'poliisi', 'passi', 'hätäuloskäynti', 'liian kallis', 'en ymmärrä', 'kadonnut matkatavara', 'tulli'
        ],
        fr: [
            'salut', 'merci', "s'il vous plaît", 'excusez-moi', 'bonjour', 'bonsoir', 'eau', 'pain', 'combien ça coûte', 'où est',
            'aéroport', 'gare', 'arrêt de bus', 'billet', 'bagages', 'clé de la chambre', "l'addition", 'carte', 'pharmacie', 'centre-ville',
            'au secours', 'médecin', 'hôpital', 'police', 'passeport', 'sortie de secours', 'trop cher', 'je ne comprends pas', 'bagage perdu', 'douane'
        ],
        gu: [
            'નમસ્તે', 'આભાર', 'કૃપા કરીને', 'માફ કરશો', 'સુપ્રભાત', 'શુભ સાંજ', 'પાણી', 'રોટલી', 'કેટલું છે', 'ક્યાં છે',
            'એરપોર્ટ', 'રેલવે સ્ટેશન', 'બસ સ્ટોપ', 'ટિકિટ', 'સામાન', 'રૂમની ચાવી', 'બિલ', 'મેનુ', 'દવાની દુકાન', 'શહેરનું કેન્દ્ર',
            'મદદ', 'ડૉક્ટર', 'હોસ્પિટલ', 'પોલીસ', 'પાસપોર્ટ', 'કટોકટી બહાર નીકળો', 'બહુ મોંઘું', 'મને સમજાતું નથી', 'ખોવાયેલો સામાન', 'કસ્ટમ્સ'
        ],
        he: [
            'שלום', 'תודה', 'בבקשה', 'סליחה', 'בוקר טוב', 'ערב טוב', 'מים', 'לחם', 'כמה זה עולה', 'איפה נמצא',
            'שדה תעופה', 'תחנת רכבת', 'תחנת אוטובוס', 'כרטיס', 'מזוודה', 'מפתח החדר', 'החשבון', 'תפריט', 'בית מרקחת', 'מרכז העיר',
            'עזרה', 'רופא', 'בית חולים', 'משטרה', 'דרכון', 'יציאת חירום', 'יקר מדי', 'אני לא מבין', 'מזוודה אבודה', 'מכס'
        ],
        hi: [
            'नमस्ते', 'धन्यवाद', 'कृपया', 'माफ़ कीजिए', 'सुप्रभात', 'शुभ संध्या', 'पानी', 'रोटी', 'कितने का है', 'कहाँ है',
            'हवाई अड्डा', 'रेलवे स्टेशन', 'बस स्टॉप', 'टिकट', 'सामान', 'कमरे की चाबी', 'बिल', 'मेन्यू', 'दवा की दुकान', 'शहर का केंद्र',
            'मदद', 'डॉक्टर', 'अस्पताल', 'पुलिस', 'पासपोर्ट', 'आपातकालीन निकास', 'बहुत महंगा', 'मुझे समझ नहीं आया', 'खोया हुआ सामान', 'सीमा शुल्क'
        ],
        hr: [
            'bok', 'hvala', 'molim', 'oprostite', 'dobro jutro', 'dobra večer', 'voda', 'kruh', 'koliko košta', 'gdje je',
            'zračna luka', 'željeznički kolodvor', 'autobusna stanica', 'karta', 'prtljaga', 'ključ sobe', 'račun', 'jelovnik', 'ljekarna', 'centar grada',
            'pomoć', 'liječnik', 'bolnica', 'policija', 'putovnica', 'izlaz u nuždi', 'preskupo', 'ne razumijem', 'izgubljena prtljaga', 'carina'
        ],
        hu: [
            'szia', 'köszönöm', 'kérem', 'elnézést', 'jó reggelt', 'jó estét', 'víz', 'kenyér', 'mennyibe kerül', 'hol van',
            'repülőtér', 'vasútállomás', 'buszmegálló', 'jegy', 'poggyász', 'szobakulcs', 'a számla', 'étlap', 'gyógyszertár', 'városközpont',
            'segítség', 'orvos', 'kórház', 'rendőrség', 'útlevél', 'vészkijárat', 'túl drága', 'nem értem', 'elveszett poggyász', 'vám'
        ],
        id: [
            'halo', 'terima kasih', 'tolong', 'permisi', 'selamat pagi', 'selamat malam', 'air', 'roti', 'berapa harganya', 'di mana',
            'bandara', 'stasiun kereta', 'halte bus', 'tiket', 'bagasi', 'kunci kamar', 'tagihan', 'menu', 'apotek', 'pusat kota',
            'bantuan', 'dokter', 'rumah sakit', 'polisi', 'paspor', 'pintu darurat', 'terlalu mahal', 'saya tidak mengerti', 'bagasi hilang', 'bea cukai'
        ],
        it: [
            'ciao', 'grazie', 'per favore', 'scusi', 'buongiorno', 'buonasera', 'acqua', 'pane', 'quanto costa', "dov'è",
            'aeroporto', 'stazione ferroviaria', "fermata dell'autobus", 'biglietto', 'bagaglio', 'chiave della camera', 'il conto', 'menù', 'farmacia', 'centro città',
            'aiuto', 'medico', 'ospedale', 'polizia', 'passaporto', 'uscita di emergenza', 'troppo caro', 'non capisco', 'bagaglio smarrito', 'dogana'
        ],
        ja: [
            'こんにちは', 'ありがとう', 'お願いします', 'すみません', 'おはよう', 'こんばんは', '水', 'パン', 'いくらですか', 'どこですか',
            '空港', '駅', 'バス停', '切符', '荷物', '部屋の鍵', 'お会計', 'メニュー', '薬局', '市内中心部',
            '助けて', '医者', '病院', '警察', 'パスポート', '非常口', '高すぎる', 'わかりません', '紛失した荷物', '税関'
        ],
        kn: [
            'ನಮಸ್ಕಾರ', 'ಧನ್ಯವಾದ', 'ದಯವಿಟ್ಟು', 'ಕ್ಷಮಿಸಿ', 'ಶುಭೋದಯ', 'ಶುಭ ಸಂಜೆ', 'ನೀರು', 'ರೊಟ್ಟಿ', 'ಎಷ್ಟು ಬೆಲೆ', 'ಎಲ್ಲಿದೆ',
            'ವಿಮಾನ ನಿಲ್ದಾಣ', 'ರೈಲು ನಿಲ್ದಾಣ', 'ಬಸ್ ನಿಲ್ದಾಣ', 'ಟಿಕೆಟ್', 'ಸಾಮಾನು', 'ಕೋಣೆಯ ಕೀಲಿ', 'ಬಿಲ್', 'ಮೆನು', 'ಔಷಧ ಅಂಗಡಿ', 'ನಗರ ಕೇಂದ್ರ',
            'ಸಹಾಯ', 'ವೈದ್ಯ', 'ಆಸ್ಪತ್ರೆ', 'ಪೊಲೀಸ್', 'ಪಾಸ್‌ಪೋರ್ಟ್', 'ತುರ್ತು ನಿರ್ಗಮನ', 'ತುಂಬಾ ದುಬಾರಿ', 'ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ', 'ಕಳೆದುಹೋದ ಸಾಮಾನು', 'ಕಸ್ಟಮ್ಸ್'
        ],
        ko: [
            '안녕하세요', '감사합니다', '부탁합니다', '실례합니다', '좋은 아침', '좋은 저녁', '물', '빵', '얼마예요', '어디예요',
            '공항', '기차역', '버스 정류장', '표', '짐', '방 열쇠', '계산서', '메뉴', '약국', '시내 중심',
            '도와주세요', '의사', '병원', '경찰', '여권', '비상구', '너무 비싸요', '이해하지 못해요', '분실한 짐', '세관'
        ],
        lt: [
            'labas', 'ačiū', 'prašau', 'atsiprašau', 'labas rytas', 'labas vakaras', 'vanduo', 'duona', 'kiek kainuoja', 'kur yra',
            'oro uostas', 'geležinkelio stotis', 'autobusų stotelė', 'bilietas', 'bagažas', 'kambario raktas', 'sąskaita', 'meniu', 'vaistinė', 'miesto centras',
            'pagalba', 'gydytojas', 'ligoninė', 'policija', 'pasas', 'avarinis išėjimas', 'per brangu', 'nesuprantu', 'dingęs bagažas', 'muitinė'
        ],
        lv: [
            'sveiki', 'paldies', 'lūdzu', 'atvainojiet', 'labrīt', 'labvakar', 'ūdens', 'maize', 'cik maksā', 'kur ir',
            'lidosta', 'dzelzceļa stacija', 'autobusa pietura', 'biļete', 'bagāža', 'istabas atslēga', 'rēķins', 'ēdienkarte', 'aptieka', 'pilsētas centrs',
            'palīgā', 'ārsts', 'slimnīca', 'policija', 'pase', 'avārijas izeja', 'pārāk dārgs', 'es nesaprotu', 'pazudusi bagāža', 'muita'
        ],
        ml: [
            'നമസ്കാരം', 'നന്ദി', 'ദയവായി', 'ക്ഷമിക്കണം', 'സുപ്രഭാതം', 'ശുഭ സായാഹ്നം', 'വെള്ളം', 'അപ്പം', 'എത്ര വില', 'എവിടെയാണ്',
            'വിമാനത്താവളം', 'റെയിൽവേ സ്റ്റേഷൻ', 'ബസ് സ്റ്റോപ്പ്', 'ടിക്കറ്റ്', 'ലഗേജ്', 'മുറിയുടെ താക്കോൽ', 'ബിൽ', 'മെനു', 'മരുന്നുകട', 'നഗരമധ്യം',
            'സഹായം', 'ഡോക്ടർ', 'ആശുപത്രി', 'പോലീസ്', 'പാസ്‌പോർട്ട്', 'അടിയന്തര വാതിൽ', 'വളരെ വില കൂടുതൽ', 'എനിക്ക് മനസ്സിലായില്ല', 'നഷ്ടപ്പെട്ട ലഗേജ്', 'കസ്റ്റംസ്'
        ],
        mr: [
            'नमस्कार', 'धन्यवाद', 'कृपया', 'माफ करा', 'शुभ प्रभात', 'शुभ संध्याकाळ', 'पाणी', 'भाकरी', 'किती किंमत', 'कुठे आहे',
            'विमानतळ', 'रेल्वे स्टेशन', 'बस थांबा', 'तिकीट', 'सामान', 'खोलीची किल्ली', 'बिल', 'मेनू', 'औषधाचे दुकान', 'शहराचे केंद्र',
            'मदत', 'डॉक्टर', 'रुग्णालय', 'पोलीस', 'पासपोर्ट', 'आपत्कालीन निर्गमन', 'खूप महाग', 'मला समजत नाही', 'हरवलेले सामान', 'सीमाशुल्क'
        ],
        ms: [
            'helo', 'terima kasih', 'sila', 'maaf', 'selamat pagi', 'selamat petang', 'air', 'roti', 'berapa harganya', 'di mana',
            'lapangan terbang', 'stesen kereta api', 'perhentian bas', 'tiket', 'bagasi', 'kunci bilik', 'bil', 'menu', 'farmasi', 'pusat bandar',
            'tolong', 'doktor', 'hospital', 'polis', 'pasport', 'pintu kecemasan', 'terlalu mahal', 'saya tidak faham', 'bagasi hilang', 'kastam'
        ],
        nl: [
            'hallo', 'dank je', 'alsjeblieft', 'pardon', 'goedemorgen', 'goedenavond', 'water', 'brood', 'hoeveel kost het', 'waar is',
            'luchthaven', 'treinstation', 'bushalte', 'kaartje', 'bagage', 'kamersleutel', 'de rekening', 'menukaart', 'apotheek', 'centrum',
            'help', 'dokter', 'ziekenhuis', 'politie', 'paspoort', 'nooduitgang', 'te duur', 'ik begrijp het niet', 'verloren bagage', 'douane'
        ],
        no: [
            'hei', 'takk', 'vær så snill', 'unnskyld', 'god morgen', 'god kveld', 'vann', 'brød', 'hva koster det', 'hvor er',
            'flyplass', 'jernbanestasjon', 'bussholdeplass', 'billett', 'bagasje', 'romnøkkel', 'regningen', 'meny', 'apotek', 'sentrum',
            'hjelp', 'lege', 'sykehus', 'politi', 'pass', 'nødutgang', 'for dyrt', 'jeg forstår ikke', 'mistet bagasje', 'toll'
        ],
        pl: [
            'cześć', 'dziękuję', 'proszę', 'przepraszam', 'dzień dobry', 'dobry wieczór', 'woda', 'chleb', 'ile kosztuje', 'gdzie jest',
            'lotnisko', 'dworzec kolejowy', 'przystanek autobusowy', 'bilet', 'bagaż', 'klucz do pokoju', 'rachunek', 'menu', 'apteka', 'centrum miasta',
            'pomocy', 'lekarz', 'szpital', 'policja', 'paszport', 'wyjście awaryjne', 'za drogo', 'nie rozumiem', 'zgubiony bagaż', 'odprawa celna'
        ],
        pt: [
            'olá', 'obrigado', 'por favor', 'desculpe', 'bom dia', 'boa noite', 'água', 'pão', 'quanto custa', 'onde fica',
            'aeroporto', 'estação de trem', 'ponto de ônibus', 'bilhete', 'bagagem', 'chave do quarto', 'a conta', 'cardápio', 'farmácia', 'centro da cidade',
            'socorro', 'médico', 'hospital', 'polícia', 'passaporte', 'saída de emergência', 'caro demais', 'não entendo', 'bagagem perdida', 'alfândega'
        ],
        ro: [
            'salut', 'mulțumesc', 'vă rog', 'scuzați-mă', 'bună dimineața', 'bună seara', 'apă', 'pâine', 'cât costă', 'unde este',
            'aeroport', 'gară', 'stație de autobuz', 'bilet', 'bagaj', 'cheia camerei', 'nota de plată', 'meniu', 'farmacie', 'centrul orașului',
            'ajutor', 'medic', 'spital', 'poliție', 'pașaport', 'ieșire de urgență', 'prea scump', 'nu înțeleg', 'bagaj pierdut', 'vamă'
        ],
        ru: [
            'привет', 'спасибо', 'пожалуйста', 'извините', 'доброе утро', 'добрый вечер', 'вода', 'хлеб', 'сколько стоит', 'где находится',
            'аэропорт', 'вокзал', 'автобусная остановка', 'билет', 'багаж', 'ключ от номера', 'счёт', 'меню', 'аптека', 'центр города',
            'помогите', 'врач', 'больница', 'полиция', 'паспорт', 'запасной выход', 'слишком дорого', 'не понимаю', 'потерянный багаж', 'таможня'
        ],
        sk: [
            'ahoj', 'ďakujem', 'prosím', 'prepáčte', 'dobré ráno', 'dobrý večer', 'voda', 'chlieb', 'koľko to stojí', 'kde je',
            'letisko', 'železničná stanica', 'autobusová zastávka', 'lístok', 'batožina', 'kľúč od izby', 'účet', 'jedálny lístok', 'lekáreň', 'centrum mesta',
            'pomoc', 'lekár', 'nemocnica', 'polícia', 'pas', 'núdzový východ', 'príliš drahé', 'nerozumiem', 'stratená batožina', 'colnica'
        ],
        sl: [
            'živjo', 'hvala', 'prosim', 'oprostite', 'dobro jutro', 'dober večer', 'voda', 'kruh', 'koliko stane', 'kje je',
            'letališče', 'železniška postaja', 'avtobusna postaja', 'vozovnica', 'prtljaga', 'ključ sobe', 'račun', 'jedilni list', 'lekarna', 'center mesta',
            'pomoč', 'zdravnik', 'bolnišnica', 'policija', 'potni list', 'zasilni izhod', 'predrago', 'ne razumem', 'izgubljena prtljaga', 'carina'
        ],
        sr: [
            'здраво', 'хвала', 'молим', 'извините', 'добро јутро', 'добро вече', 'вода', 'хлеб', 'колико кошта', 'где је',
            'аеродром', 'железничка станица', 'аутобуска станица', 'карта', 'пртљаг', 'кључ собе', 'рачун', 'јеловник', 'апотека', 'центар града',
            'помоћ', 'лекар', 'болница', 'полиција', 'пасош', 'излаз за случај опасности', 'превише скупо', 'не разумем', 'изгубљен пртљаг', 'царина'
        ],
        sv: [
            'hej', 'tack', 'snälla', 'ursäkta', 'god morgon', 'god kväll', 'vatten', 'bröd', 'vad kostar det', 'var är',
            'flygplats', 'järnvägsstation', 'busshållplats', 'biljett', 'bagage', 'rumsnyckel', 'notan', 'meny', 'apotek', 'centrum',
            'hjälp', 'läkare', 'sjukhus', 'polis', 'pass', 'nödutgång', 'för dyrt', 'jag förstår inte', 'försvunnet bagage', 'tull'
        ],
        sw: [
            'jambo', 'asante', 'tafadhali', 'samahani', 'habari ya asubuhi', 'habari ya jioni', 'maji', 'mkate', 'bei gani', 'iko wapi',
            'uwanja wa ndege', 'stesheni ya treni', 'kituo cha basi', 'tikiti', 'mizigo', 'ufunguo wa chumba', 'bili', 'menyu', 'duka la dawa', 'katikati ya jiji',
            'msaada', 'daktari', 'hospitali', 'polisi', 'pasipoti', 'njia ya dharura', 'ghali sana', 'sielewi', 'mizigo iliyopotea', 'forodha'
        ],
        ta: [
            'வணக்கம்', 'நன்றி', 'தயவுசெய்து', 'மன்னிக்கவும்', 'காலை வணக்கம்', 'மாலை வணக்கம்', 'தண்ணீர்', 'ரொட்டி', 'எவ்வளவு விலை', 'எங்கே இருக்கிறது',
            'விமான நிலையம்', 'ரயில் நிலையம்', 'பேருந்து நிறுத்தம்', 'டிக்கெட்', 'சாமான்', 'அறையின் சாவி', 'பில்', 'மெனு', 'மருந்தகம்', 'நகர மையம்',
            'உதவி', 'மருத்துவர்', 'மருத்துவமனை', 'காவல்துறை', 'கடவுச்சீட்டு', 'அவசர வெளியேறு', 'மிகவும் விலை அதிகம்', 'எனக்குப் புரியவில்லை', 'தொலைந்த சாமான்', 'சுங்கம்'
        ],
        te: [
            'నమస్కారం', 'ధన్యవాదాలు', 'దయచేసి', 'క్షమించండి', 'శుభోదయం', 'శుభ సాయంత్రం', 'నీరు', 'రొట్టె', 'ఎంత ధర', 'ఎక్కడ ఉంది',
            'విమానాశ్రయం', 'రైల్వే స్టేషన్', 'బస్ స్టాప్', 'టికెట్', 'సామాను', 'గది తాళం', 'బిల్లు', 'మెనూ', 'మందుల దుకాణం', 'నగర కేంద్రం',
            'సహాయం', 'వైద్యుడు', 'ఆసుపత్రి', 'పోలీసు', 'పాస్‌పోర్ట్', 'అత్యవసర నిష్క్రమణ', 'చాలా ఖరీదు', 'నాకు అర్థం కావడం లేదు', 'పోయిన సామాను', 'కస్టమ్స్'
        ],
        th: [
            'สวัสดี', 'ขอบคุณ', 'กรุณา', 'ขอโทษ', 'อรุณสวัสดิ์', 'สวัสดีตอนเย็น', 'น้ำ', 'ขนมปัง', 'ราคาเท่าไร', 'อยู่ที่ไหน',
            'สนามบิน', 'สถานีรถไฟ', 'ป้ายรถเมล์', 'ตั๋ว', 'กระเป๋าเดินทาง', 'กุญแจห้อง', 'บิล', 'เมนู', 'ร้านขายยา', 'ใจกลางเมือง',
            'ช่วยด้วย', 'หมอ', 'โรงพยาบาล', 'ตำรวจ', 'หนังสือเดินทาง', 'ทางออกฉุกเฉิน', 'แพงเกินไป', 'ไม่เข้าใจ', 'กระเป๋าหาย', 'ศุลกากร'
        ],
        tl: [
            'kumusta', 'salamat', 'pakiusap', 'paumanhin', 'magandang umaga', 'magandang gabi', 'tubig', 'tinapay', 'magkano', 'nasaan',
            'paliparan', 'istasyon ng tren', 'hintuan ng bus', 'tiket', 'bagahe', 'susi ng kwarto', 'ang bayarin', 'menu', 'parmasya', 'sentro ng lungsod',
            'tulong', 'doktor', 'ospital', 'pulis', 'pasaporte', 'labasan sa emerhensiya', 'masyadong mahal', 'hindi ko maintindihan', 'nawalang bagahe', 'adwana'
        ],
        tr: [
            'merhaba', 'teşekkürler', 'lütfen', 'affedersiniz', 'günaydın', 'iyi akşamlar', 'su', 'ekmek', 'ne kadar', 'nerede',
            'havalimanı', 'tren istasyonu', 'otobüs durağı', 'bilet', 'bagaj', 'oda anahtarı', 'hesap', 'menü', 'eczane', 'şehir merkezi',
            'yardım', 'doktor', 'hastane', 'polis', 'pasaport', 'acil çıkış', 'çok pahalı', 'anlamıyorum', 'kayıp bagaj', 'gümrük'
        ],
        uk: [
            'привіт', 'дякую', 'будь ласка', 'вибачте', 'доброго ранку', 'добрий вечір', 'вода', 'хліб', 'скільки коштує', 'де знаходиться',
            'аеропорт', 'залізничний вокзал', 'автобусна зупинка', 'квиток', 'багаж', 'ключ від номера', 'рахунок', 'меню', 'аптека', 'центр міста',
            'допоможіть', 'лікар', 'лікарня', 'поліція', 'паспорт', 'запасний вихід', 'занадто дорого', 'не розумію', 'загублений багаж', 'митниця'
        ],
        vi: [
            'xin chào', 'cảm ơn', 'làm ơn', 'xin lỗi', 'chào buổi sáng', 'chào buổi tối', 'nước', 'bánh mì', 'bao nhiêu tiền', 'ở đâu',
            'sân bay', 'ga tàu', 'trạm xe buýt', 'vé', 'hành lý', 'chìa khóa phòng', 'hóa đơn', 'thực đơn', 'nhà thuốc', 'trung tâm thành phố',
            'cứu với', 'bác sĩ', 'bệnh viện', 'cảnh sát', 'hộ chiếu', 'lối thoát hiểm', 'quá đắt', 'tôi không hiểu', 'hành lý thất lạc', 'hải quan'
        ],
        zh: [
            '你好', '谢谢', '请', '请问', '早上好', '晚上好', '水', '面包', '多少钱', '在哪里',
            '机场', '火车站', '公交车站', '车票', '行李', '房间钥匙', '账单', '菜单', '药店', '市中心',
            '救命', '医生', '医院', '警察', '护照', '紧急出口', '太贵了', '我不明白', '丢失的行李', '海关'
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
     * Both languages are written on every entry. The pair is known here, and a
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
            words: WORDS[from].slice(i * PER_LEVEL, (i + 1) * PER_LEVEL).map((word, j) => ({
                original: word,
                originalLang: learn,
                translation: WORDS[into][i * PER_LEVEL + j],
                translationLang: translation,
                repetitions: []
            }))
        }));
    };
}
vocab();

/**
 * The ready-made sets the catalogue offers for a pair of languages.
 *
 * Composed rather than written out. The dropdowns list every language the
 * browser can name — 183 of them — and a file holding three sets for every
 * ordered pair would be some 33,000 pairs and 800,000 words: not a file anybody
 * could write, and not one a popup could load. One column of 24 words per
 * language gives the same pairs for 24 × N words, because a pair is two columns
 * read side by side.
 *
 * So what is kept here is a table and not a catalogue: twenty-four things, named
 * once in each language. Forty-nine columns is 1,176 lines and 2,352 pairs, and
 * each language added is one more column — 24 lines for 96 more pairs.
 *
 * Which forty-nine: the ones the extension itself is translated into, which is
 * what `_locales` holds. The store's listing languages are the languages the app
 * can be read in, so they are the languages somebody is likely to be reading a
 * translation in. Regional pairs there are one column here — es and es_419, the
 * two Portuguese, the two Chinese — because none of these twenty-four words is
 * one of the words those variants disagree about, and `fil` is `tl` because that
 * is the tag the dropdowns offer.
 *
 * The rows are the same twenty-four in every column, in the same order, and that
 * is what makes a pair possible: row seven is "morning" whichever two columns
 * are being read. The words are concrete and have one obvious translation each —
 * no "time" that is also "weather", no "dream" that is both the sleep and the
 * hope — because a row that means two things in one language means the wrong one
 * in the other.
 */
function vocab() {
    /*
     * Three sets of eight, in one run of twenty-four.
     *
     * Eight because that is what the first card set holds and what the window
     * fits: a set of eight is four rows of bubbles, and the games below it stay
     * on the screen.
     *
     * The levels are what the words are, not what they are labelled. Beginner is
     * what is on a table in front of you; intermediate is the rest of a street
     * and a day; advanced is what cannot be pointed at — freedom, patience,
     * silence. A learner who knows the first eight can read a menu, and a
     * learner who knows the last eight can read a page.
     */
    const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
    const PER_LEVEL = 8;

    /*
     * The table. Every column is the same twenty-four rows in the same order:
     *
     *   water bread house friend book city morning thank-you
     *   window kitchen journey language neighbour market question river
     *   freedom patience knowledge shadow promise silence courage truth
     *
     * German keeps its capitals and nothing else takes one. A noun is capitalised
     * in German wherever it stands, and the other forty-eight capitalise none of
     * these — squaring them up would put a spelling mistake on nearly every card.
     * "danke" is not a noun, so it stays lower case among them.
     *
     * The columns are in tag order rather than in any order of importance: a
     * table where one language comes first is a table somebody has to justify,
     * and this one is only ever read by its keys.
     */
    const WORDS = {
        am: [
            'ውሃ', 'ዳቦ', 'ቤት', 'ጓደኛ', 'መጽሐፍ', 'ከተማ', 'ጠዋት', 'አመሰግናለሁ',
            'መስኮት', 'ኩሽና', 'ጉዞ', 'ቋንቋ', 'ጎረቤት', 'ገበያ', 'ጥያቄ', 'ወንዝ',
            'ነፃነት', 'ትዕግሥት', 'እውቀት', 'ጥላ', 'ቃል ኪዳን', 'ዝምታ', 'ድፍረት', 'እውነት'
        ],
        ar: [
            'ماء', 'خبز', 'بيت', 'صديق', 'كتاب', 'مدينة', 'صباح', 'شكرا',
            'نافذة', 'مطبخ', 'رحلة', 'لغة', 'جار', 'سوق', 'سؤال', 'نهر',
            'حرية', 'صبر', 'معرفة', 'ظل', 'وعد', 'صمت', 'شجاعة', 'حقيقة'
        ],
        bg: [
            'вода', 'хляб', 'къща', 'приятел', 'книга', 'град', 'утро', 'благодаря',
            'прозорец', 'кухня', 'пътуване', 'език', 'съсед', 'пазар', 'въпрос', 'река',
            'свобода', 'търпение', 'знание', 'сянка', 'обещание', 'тишина', 'смелост', 'истина'
        ],
        bn: [
            'পানি', 'রুটি', 'বাড়ি', 'বন্ধু', 'বই', 'শহর', 'সকাল', 'ধন্যবাদ',
            'জানালা', 'রান্নাঘর', 'ভ্রমণ', 'ভাষা', 'প্রতিবেশী', 'বাজার', 'প্রশ্ন', 'নদী',
            'স্বাধীনতা', 'ধৈর্য', 'জ্ঞান', 'ছায়া', 'প্রতিশ্রুতি', 'নীরবতা', 'সাহস', 'সত্য'
        ],
        ca: [
            'aigua', 'pa', 'casa', 'amic', 'llibre', 'ciutat', 'matí', 'gràcies',
            'finestra', 'cuina', 'viatge', 'llengua', 'veí', 'mercat', 'pregunta', 'riu',
            'llibertat', 'paciència', 'coneixement', 'ombra', 'promesa', 'silenci', 'coratge', 'veritat'
        ],
        cs: [
            'voda', 'chléb', 'dům', 'přítel', 'kniha', 'město', 'ráno', 'děkuji',
            'okno', 'kuchyně', 'cesta', 'jazyk', 'soused', 'trh', 'otázka', 'řeka',
            'svoboda', 'trpělivost', 'znalost', 'stín', 'slib', 'ticho', 'odvaha', 'pravda'
        ],
        da: [
            'vand', 'brød', 'hus', 'ven', 'bog', 'by', 'morgen', 'tak',
            'vindue', 'køkken', 'rejse', 'sprog', 'nabo', 'marked', 'spørgsmål', 'flod',
            'frihed', 'tålmodighed', 'viden', 'skygge', 'løfte', 'stilhed', 'mod', 'sandhed'
        ],
        de: [
            'Wasser', 'Brot', 'Haus', 'Freund', 'Buch', 'Stadt', 'Morgen', 'danke',
            'Fenster', 'Küche', 'Reise', 'Sprache', 'Nachbar', 'Markt', 'Frage', 'Fluss',
            'Freiheit', 'Geduld', 'Wissen', 'Schatten', 'Versprechen', 'Stille', 'Mut', 'Wahrheit'
        ],
        el: [
            'νερό', 'ψωμί', 'σπίτι', 'φίλος', 'βιβλίο', 'πόλη', 'πρωί', 'ευχαριστώ',
            'παράθυρο', 'κουζίνα', 'ταξίδι', 'γλώσσα', 'γείτονας', 'αγορά', 'ερώτηση', 'ποτάμι',
            'ελευθερία', 'υπομονή', 'γνώση', 'σκιά', 'υπόσχεση', 'σιωπή', 'θάρρος', 'αλήθεια'
        ],
        en: [
            'water', 'bread', 'house', 'friend', 'book', 'city', 'morning', 'thank you',
            'window', 'kitchen', 'journey', 'language', 'neighbour', 'market', 'question', 'river',
            'freedom', 'patience', 'knowledge', 'shadow', 'promise', 'silence', 'courage', 'truth'
        ],
        es: [
            'agua', 'pan', 'casa', 'amigo', 'libro', 'ciudad', 'mañana', 'gracias',
            'ventana', 'cocina', 'viaje', 'idioma', 'vecino', 'mercado', 'pregunta', 'río',
            'libertad', 'paciencia', 'conocimiento', 'sombra', 'promesa', 'silencio', 'coraje', 'verdad'
        ],
        et: [
            'vesi', 'leib', 'maja', 'sõber', 'raamat', 'linn', 'hommik', 'aitäh',
            'aken', 'köök', 'reis', 'keel', 'naaber', 'turg', 'küsimus', 'jõgi',
            'vabadus', 'kannatlikkus', 'teadmine', 'vari', 'lubadus', 'vaikus', 'julgus', 'tõde'
        ],
        fa: [
            'آب', 'نان', 'خانه', 'دوست', 'کتاب', 'شهر', 'صبح', 'متشکرم',
            'پنجره', 'آشپزخانه', 'سفر', 'زبان', 'همسایه', 'بازار', 'سؤال', 'رودخانه',
            'آزادی', 'صبر', 'دانش', 'سایه', 'قول', 'سکوت', 'شجاعت', 'حقیقت'
        ],
        fi: [
            'vesi', 'leipä', 'talo', 'ystävä', 'kirja', 'kaupunki', 'aamu', 'kiitos',
            'ikkuna', 'keittiö', 'matka', 'kieli', 'naapuri', 'tori', 'kysymys', 'joki',
            'vapaus', 'kärsivällisyys', 'tieto', 'varjo', 'lupaus', 'hiljaisuus', 'rohkeus', 'totuus'
        ],
        fr: [
            'eau', 'pain', 'maison', 'ami', 'livre', 'ville', 'matin', 'merci',
            'fenêtre', 'cuisine', 'voyage', 'langue', 'voisin', 'marché', 'question', 'rivière',
            'liberté', 'patience', 'connaissance', 'ombre', 'promesse', 'silence', 'courage', 'vérité'
        ],
        gu: [
            'પાણી', 'રોટલી', 'ઘર', 'મિત્ર', 'પુસ્તક', 'શહેર', 'સવાર', 'આભાર',
            'બારી', 'રસોડું', 'મુસાફરી', 'ભાષા', 'પડોશી', 'બજાર', 'પ્રશ્ન', 'નદી',
            'સ્વતંત્રતા', 'ધીરજ', 'જ્ઞાન', 'પડછાયો', 'વચન', 'મૌન', 'હિંમત', 'સત્ય'
        ],
        he: [
            'מים', 'לחם', 'בית', 'חבר', 'ספר', 'עיר', 'בוקר', 'תודה',
            'חלון', 'מטבח', 'מסע', 'שפה', 'שכן', 'שוק', 'שאלה', 'נהר',
            'חופש', 'סבלנות', 'ידע', 'צל', 'הבטחה', 'שתיקה', 'אומץ', 'אמת'
        ],
        hi: [
            'पानी', 'रोटी', 'घर', 'दोस्त', 'किताब', 'शहर', 'सुबह', 'धन्यवाद',
            'खिड़की', 'रसोई', 'यात्रा', 'भाषा', 'पड़ोसी', 'बाज़ार', 'सवाल', 'नदी',
            'स्वतंत्रता', 'धैर्य', 'ज्ञान', 'छाया', 'वादा', 'मौन', 'साहस', 'सत्य'
        ],
        hr: [
            'voda', 'kruh', 'kuća', 'prijatelj', 'knjiga', 'grad', 'jutro', 'hvala',
            'prozor', 'kuhinja', 'putovanje', 'jezik', 'susjed', 'tržnica', 'pitanje', 'rijeka',
            'sloboda', 'strpljenje', 'znanje', 'sjena', 'obećanje', 'tišina', 'hrabrost', 'istina'
        ],
        hu: [
            'víz', 'kenyér', 'ház', 'barát', 'könyv', 'város', 'reggel', 'köszönöm',
            'ablak', 'konyha', 'utazás', 'nyelv', 'szomszéd', 'piac', 'kérdés', 'folyó',
            'szabadság', 'türelem', 'tudás', 'árnyék', 'ígéret', 'csend', 'bátorság', 'igazság'
        ],
        id: [
            'air', 'roti', 'rumah', 'teman', 'buku', 'kota', 'pagi', 'terima kasih',
            'jendela', 'dapur', 'perjalanan', 'bahasa', 'tetangga', 'pasar', 'pertanyaan', 'sungai',
            'kebebasan', 'kesabaran', 'pengetahuan', 'bayangan', 'janji', 'keheningan', 'keberanian', 'kebenaran'
        ],
        it: [
            'acqua', 'pane', 'casa', 'amico', 'libro', 'città', 'mattina', 'grazie',
            'finestra', 'cucina', 'viaggio', 'lingua', 'vicino', 'mercato', 'domanda', 'fiume',
            'libertà', 'pazienza', 'conoscenza', 'ombra', 'promessa', 'silenzio', 'coraggio', 'verità'
        ],
        ja: [
            '水', 'パン', '家', '友達', '本', '街', '朝', 'ありがとう',
            '窓', '台所', '旅行', '言語', '隣人', '市場', '質問', '川',
            '自由', '忍耐', '知識', '影', '約束', '沈黙', '勇気', '真実'
        ],
        kn: [
            'ನೀರು', 'ರೊಟ್ಟಿ', 'ಮನೆ', 'ಸ್ನೇಹಿತ', 'ಪುಸ್ತಕ', 'ನಗರ', 'ಬೆಳಿಗ್ಗೆ', 'ಧನ್ಯವಾದ',
            'ಕಿಟಕಿ', 'ಅಡುಗೆಮನೆ', 'ಪ್ರಯಾಣ', 'ಭಾಷೆ', 'ನೆರೆಹೊರೆಯವರು', 'ಮಾರುಕಟ್ಟೆ', 'ಪ್ರಶ್ನೆ', 'ನದಿ',
            'ಸ್ವಾತಂತ್ರ್ಯ', 'ತಾಳ್ಮೆ', 'ಜ್ಞಾನ', 'ನೆರಳು', 'ಭರವಸೆ', 'ಮೌನ', 'ಧೈರ್ಯ', 'ಸತ್ಯ'
        ],
        ko: [
            '물', '빵', '집', '친구', '책', '도시', '아침', '감사합니다',
            '창문', '부엌', '여행', '언어', '이웃', '시장', '질문', '강',
            '자유', '인내', '지식', '그림자', '약속', '침묵', '용기', '진실'
        ],
        lt: [
            'vanduo', 'duona', 'namas', 'draugas', 'knyga', 'miestas', 'rytas', 'ačiū',
            'langas', 'virtuvė', 'kelionė', 'kalba', 'kaimynas', 'turgus', 'klausimas', 'upė',
            'laisvė', 'kantrybė', 'žinios', 'šešėlis', 'pažadas', 'tyla', 'drąsa', 'tiesa'
        ],
        lv: [
            'ūdens', 'maize', 'māja', 'draugs', 'grāmata', 'pilsēta', 'rīts', 'paldies',
            'logs', 'virtuve', 'ceļojums', 'valoda', 'kaimiņš', 'tirgus', 'jautājums', 'upe',
            'brīvība', 'pacietība', 'zināšanas', 'ēna', 'solījums', 'klusums', 'drosme', 'patiesība'
        ],
        ml: [
            'വെള്ളം', 'അപ്പം', 'വീട്', 'സുഹൃത്ത്', 'പുസ്തകം', 'നഗരം', 'രാവിലെ', 'നന്ദി',
            'ജനൽ', 'അടുക്കള', 'യാത്ര', 'ഭാഷ', 'അയൽക്കാരൻ', 'ചന്ത', 'ചോദ്യം', 'നദി',
            'സ്വാതന്ത്ര്യം', 'ക്ഷമ', 'അറിവ്', 'നിഴൽ', 'വാഗ്ദാനം', 'നിശ്ശബ്ദത', 'ധൈര്യം', 'സത്യം'
        ],
        mr: [
            'पाणी', 'भाकरी', 'घर', 'मित्र', 'पुस्तक', 'शहर', 'सकाळ', 'धन्यवाद',
            'खिडकी', 'स्वयंपाकघर', 'प्रवास', 'भाषा', 'शेजारी', 'बाजार', 'प्रश्न', 'नदी',
            'स्वातंत्र्य', 'संयम', 'ज्ञान', 'सावली', 'वचन', 'मौन', 'धैर्य', 'सत्य'
        ],
        ms: [
            'air', 'roti', 'rumah', 'kawan', 'buku', 'bandar', 'pagi', 'terima kasih',
            'tingkap', 'dapur', 'perjalanan', 'bahasa', 'jiran', 'pasar', 'soalan', 'sungai',
            'kebebasan', 'kesabaran', 'pengetahuan', 'bayang', 'janji', 'kesunyian', 'keberanian', 'kebenaran'
        ],
        nl: [
            'water', 'brood', 'huis', 'vriend', 'boek', 'stad', 'ochtend', 'dank je',
            'raam', 'keuken', 'reis', 'taal', 'buur', 'markt', 'vraag', 'rivier',
            'vrijheid', 'geduld', 'kennis', 'schaduw', 'belofte', 'stilte', 'moed', 'waarheid'
        ],
        no: [
            'vann', 'brød', 'hus', 'venn', 'bok', 'by', 'morgen', 'takk',
            'vindu', 'kjøkken', 'reise', 'språk', 'nabo', 'marked', 'spørsmål', 'elv',
            'frihet', 'tålmodighet', 'kunnskap', 'skygge', 'løfte', 'stillhet', 'mot', 'sannhet'
        ],
        pl: [
            'woda', 'chleb', 'dom', 'przyjaciel', 'książka', 'miasto', 'poranek', 'dziękuję',
            'okno', 'kuchnia', 'podróż', 'język', 'sąsiad', 'rynek', 'pytanie', 'rzeka',
            'wolność', 'cierpliwość', 'wiedza', 'cień', 'obietnica', 'cisza', 'odwaga', 'prawda'
        ],
        pt: [
            'água', 'pão', 'casa', 'amigo', 'livro', 'cidade', 'manhã', 'obrigado',
            'janela', 'cozinha', 'viagem', 'língua', 'vizinho', 'mercado', 'pergunta', 'rio',
            'liberdade', 'paciência', 'conhecimento', 'sombra', 'promessa', 'silêncio', 'coragem', 'verdade'
        ],
        ro: [
            'apă', 'pâine', 'casă', 'prieten', 'carte', 'oraș', 'dimineață', 'mulțumesc',
            'fereastră', 'bucătărie', 'călătorie', 'limbă', 'vecin', 'piață', 'întrebare', 'râu',
            'libertate', 'răbdare', 'cunoaștere', 'umbră', 'promisiune', 'tăcere', 'curaj', 'adevăr'
        ],
        ru: [
            'вода', 'хлеб', 'дом', 'друг', 'книга', 'город', 'утро', 'спасибо',
            'окно', 'кухня', 'путешествие', 'язык', 'сосед', 'рынок', 'вопрос', 'река',
            'свобода', 'терпение', 'знание', 'тень', 'обещание', 'тишина', 'смелость', 'правда'
        ],
        sk: [
            'voda', 'chlieb', 'dom', 'priateľ', 'kniha', 'mesto', 'ráno', 'ďakujem',
            'okno', 'kuchyňa', 'cesta', 'jazyk', 'sused', 'trh', 'otázka', 'rieka',
            'sloboda', 'trpezlivosť', 'vedomosť', 'tieň', 'sľub', 'ticho', 'odvaha', 'pravda'
        ],
        sl: [
            'voda', 'kruh', 'hiša', 'prijatelj', 'knjiga', 'mesto', 'jutro', 'hvala',
            'okno', 'kuhinja', 'potovanje', 'jezik', 'sosed', 'tržnica', 'vprašanje', 'reka',
            'svoboda', 'potrpežljivost', 'znanje', 'senca', 'obljuba', 'tišina', 'pogum', 'resnica'
        ],
        sr: [
            'вода', 'хлеб', 'кућа', 'пријатељ', 'књига', 'град', 'јутро', 'хвала',
            'прозор', 'кухиња', 'путовање', 'језик', 'комшија', 'пијаца', 'питање', 'река',
            'слобода', 'стрпљење', 'знање', 'сенка', 'обећање', 'тишина', 'храброст', 'истина'
        ],
        sv: [
            'vatten', 'bröd', 'hus', 'vän', 'bok', 'stad', 'morgon', 'tack',
            'fönster', 'kök', 'resa', 'språk', 'granne', 'marknad', 'fråga', 'flod',
            'frihet', 'tålamod', 'kunskap', 'skugga', 'löfte', 'tystnad', 'mod', 'sanning'
        ],
        sw: [
            'maji', 'mkate', 'nyumba', 'rafiki', 'kitabu', 'jiji', 'asubuhi', 'asante',
            'dirisha', 'jikoni', 'safari', 'lugha', 'jirani', 'soko', 'swali', 'mto',
            'uhuru', 'subira', 'maarifa', 'kivuli', 'ahadi', 'ukimya', 'ujasiri', 'ukweli'
        ],
        ta: [
            'தண்ணீர்', 'ரொட்டி', 'வீடு', 'நண்பன்', 'புத்தகம்', 'நகரம்', 'காலை', 'நன்றி',
            'ஜன்னல்', 'சமையலறை', 'பயணம்', 'மொழி', 'அண்டை வீட்டார்', 'சந்தை', 'கேள்வி', 'ஆறு',
            'சுதந்திரம்', 'பொறுமை', 'அறிவு', 'நிழல்', 'வாக்குறுதி', 'மௌனம்', 'தைரியம்', 'உண்மை'
        ],
        te: [
            'నీరు', 'రొట్టె', 'ఇల్లు', 'స్నేహితుడు', 'పుస్తకం', 'నగరం', 'ఉదయం', 'ధన్యవాదాలు',
            'కిటికీ', 'వంటగది', 'ప్రయాణం', 'భాష', 'పొరుగువాడు', 'సంత', 'ప్రశ్న', 'నది',
            'స్వాతంత్ర్యం', 'ఓర్పు', 'జ్ఞానం', 'నీడ', 'వాగ్దానం', 'నిశ్శబ్దం', 'ధైర్యం', 'సత్యం'
        ],
        th: [
            'น้ำ', 'ขนมปัง', 'บ้าน', 'เพื่อน', 'หนังสือ', 'เมือง', 'เช้า', 'ขอบคุณ',
            'หน้าต่าง', 'ครัว', 'การเดินทาง', 'ภาษา', 'เพื่อนบ้าน', 'ตลาด', 'คำถาม', 'แม่น้ำ',
            'เสรีภาพ', 'ความอดทน', 'ความรู้', 'เงา', 'สัญญา', 'ความเงียบ', 'ความกล้าหาญ', 'ความจริง'
        ],
        tl: [
            'tubig', 'tinapay', 'bahay', 'kaibigan', 'aklat', 'lungsod', 'umaga', 'salamat',
            'bintana', 'kusina', 'paglalakbay', 'wika', 'kapitbahay', 'palengke', 'tanong', 'ilog',
            'kalayaan', 'pasensya', 'kaalaman', 'anino', 'pangako', 'katahimikan', 'tapang', 'katotohanan'
        ],
        tr: [
            'su', 'ekmek', 'ev', 'arkadaş', 'kitap', 'şehir', 'sabah', 'teşekkürler',
            'pencere', 'mutfak', 'yolculuk', 'dil', 'komşu', 'pazar', 'soru', 'nehir',
            'özgürlük', 'sabır', 'bilgi', 'gölge', 'söz', 'sessizlik', 'cesaret', 'gerçek'
        ],
        uk: [
            'вода', 'хліб', 'дім', 'друг', 'книга', 'місто', 'ранок', 'дякую',
            'вікно', 'кухня', 'подорож', 'мова', 'сусід', 'ринок', 'питання', 'річка',
            'свобода', 'терпіння', 'знання', 'тінь', 'обіцянка', 'тиша', 'сміливість', 'правда'
        ],
        vi: [
            'nước', 'bánh mì', 'nhà', 'bạn', 'sách', 'thành phố', 'buổi sáng', 'cảm ơn',
            'cửa sổ', 'nhà bếp', 'chuyến đi', 'ngôn ngữ', 'hàng xóm', 'chợ', 'câu hỏi', 'sông',
            'tự do', 'kiên nhẫn', 'kiến thức', 'bóng', 'lời hứa', 'im lặng', 'can đảm', 'sự thật'
        ],
        zh: [
            '水', '面包', '房子', '朋友', '书', '城市', '早上', '谢谢',
            '窗户', '厨房', '旅行', '语言', '邻居', '市场', '问题', '河',
            '自由', '耐心', '知识', '影子', '承诺', '沉默', '勇气', '真相'
        ]
    };

    /*
     * Two names for one column.
     *
     * The dropdowns list whatever tags the browser knows, and some of those are
     * two ways of saying the same thing: Norwegian is offered as both `no` and
     * `nb`, and the twenty-four words below are the same under either. Somebody
     * who picked the one spelled differently should not be told there is nothing
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
     * Both languages are written on every word. The pair is known here, and a
     * ready-made set has no business leaving it to a detector to work out that
     * these eight words are Greek.
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

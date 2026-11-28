# -*- coding: utf-8 -*-
"""Первая страница Google США (gl=us, hl=en) на 07.11.2026 по каждому запросу кластеров.

Снято из Chrome (залогиненный Semrush-аккаунт не нужен): поиск google.com, без персонализации (pws=0),
в списке только органические ссылки с заголовком, блоки «Люди также спрашивают», видео и реклама не
вошли. Ссылок на странице 7-9, не 10: часть выдачи Google держит в блоках.

Тип ссылки размечен мной по домену и заголовку, страницы не открывались:
  P — заниматься или играть сразу в браузере (игра, тест, карточки, генератор);
  A — поставить приложение или завести аккаунт (магазин, лендинг приложения/сервиса);
  R — читать, смотреть, обсуждать (статья, подборка, форум, видео, товар без интерактива).
"""

SERP = {
    "language games": ("PRRPRPRPR", [
        ("babadum.com", "Ba Ba Dum"), ("en.wikipedia.org", "Language game (philosophy)"),
        ("edutopia.org", "17 Fun Speaking Games to Get Language Learners Talking"),
        ("digitaldialects.com", "Digital Dialects: Language learning games & activities"),
        ("reddit.com", "Any Language learning games : r/languagelearning"), ("ixl.com", "IXL Language Arts Games"),
        ("sanako.com", "Six great language learning games to try in your classroom"),
        ("50languages.com", "Free language games"), ("klaschools.com", "25 DIY Games to Improve Children's Language Skills")]),
    "language learning games": ("PRPARPARR", [
        ("babadum.com", "Ba Ba Dum"), ("reddit.com", "Games for (effective) language learning?"),
        ("digitaldialects.com", "Digital Dialects: Language learning games & activities"),
        ("apps.apple.com", "Drops: Language Learning Games - App Store"),
        ("languagelearningathome.com", "Five Multi-Sensory Games for Homeschool Foreign ..."),
        ("noun.town", "Free Online Language Games | Noun Town"), ("play.google.com", "Lingo Legend Language Learning - Google Play"),
        ("edutopia.org", "21 Effective Learning Games for ELA Classes"), ("steamcommunity.com", "Group :: Language Learning Games")]),
    "learn language game": ("PARAPAAPA", [
        ("babadum.com", "Ba Ba Dum"), ("apps.apple.com", "Lingo Legend Language Learning - App Store"),
        ("reddit.com", "Games for (effective) language learning?"), ("play.google.com", "Lingo Legend Language Learning - Google Play"),
        ("noun.town", "Free Online Language Games | Noun Town"), ("lingolegend.com", "Lingo Legend: Language learning game"),
        ("playinfluent.com", "Influent | A Language Learning Video Game!"), ("50languages.com", "Free language games"),
        ("apps.apple.com", "Duolingo: Learn Languages - App Store")]),
    "spanish language learning games": ("PPRPAPPP", [
        ("pandatree.com", "Spanish Games"), ("digitaldialects.com", "Spanish games and learning activities"),
        ("reddit.com", "Know of any games that help with Spanish learning?"), ("letsspeakspanish.com", "Free Spanish Games"),
        ("apps.apple.com", "Spanish Learning Games - Match - App Store"), ("pbskids.org", "Spanish Games Topic Page"),
        ("calicospanish.com", "Spanish Games for Real Learning!"), ("conjuguemos.com", "Conjuguemos: Home Page")]),
    "japanese language learning games": ("APRPAPP", [
        ("store.steampowered.com", "Games for Learning Japanese"), ("digitaldialects.com", "Japanese games and learning activities"),
        ("reddit.com", "What are some of the best games to play as you learn ..."), ("lingual-ninja.com", "Lingual Ninja - Learn Japanese Online"),
        ("apps.apple.com", "Japanese Language RPG Quest - App Store"), ("tanoshiijapanese.com", "Fun Japanese Practice Games"),
        ("marumori.io", "Learn Japanese")]),
    "korean language learning games": ("PPPPARAPA", [
        ("deliciouskorean.com", "Games to Learn Korean | Korean Mini Games"), ("digitaldialects.com", "Learn Korean language: fun online games"),
        ("korean-game.modlangs.gatech.edu", "korean language game"), ("fun4thebrain.com", "Fun4theBrain Korean Games"),
        ("apps.apple.com", "Easy Korean Learning Games - App Store"), ("reddit.com", "Korean Video Game Recommendations for Learning"),
        ("play.google.com", "Learn Korean - 11000 Words - Google Play"), ("ekvis.com", "Korean Learning Games"),
        ("store.steampowered.com", "Korean Games for Learners")]),
    "vocabulary games": ("PPPRPRPPR", [
        ("merriam-webster.com", "How Strong Is Your Vocabulary? - Word Game"), ("knoword.com", "Knoword: Engaging Vocabulary Games & Custom Flashcards"),
        ("flocabulary.com", "Vocabulary Mini Games"), ("sadlier.com", "10 Classroom Vocabulary Games For All Ages"),
        ("babadum.com", "Ba Ba Dum"), ("edutopia.org", "5 Vocabulary Games That Build Content Knowledge"),
        ("gamestolearnenglish.com", "Vocab Game"), ("englishclub.com", "Vocabulary Games | ESL Games"),
        ("virginiaisforteachers.com", "3 Engaging Vocabulary Games That Your Students will LOVE!")]),
    "games and vocabulary": ("PPRPPRRPP", [
        ("merriam-webster.com", "Word Games & Quizzes"), ("flocabulary.com", "Vocabulary Mini Games"),
        ("edutopia.org", "5 Vocabulary Games That Build Content Knowledge"), ("mindgames.com", "Word Games and quizzes"),
        ("knoword.com", "Knoword: Engaging Vocabulary Games & Custom Flashcards"), ("sadlier.com", "10 Classroom Vocabulary Games For All Ages"),
        ("tryumphspeech.com", "6 Vocabulary Games for Kids to Make Learning Words Fun"), ("gamestolearnenglish.com", "Vocab Game"),
        ("babadum.com", "Ba Ba Dum")]),
    "vocabulary word games": ("PPPPPRPPP", [
        ("merriam-webster.com", "Word Games & Quizzes"), ("knoword.com", "Knoword: Engaging Vocabulary Games & Custom Flashcards"),
        ("flocabulary.com", "Vocabulary Mini Games"), ("learnenglishkids.britishcouncil.org", "Word games - LearnEnglish Kids"),
        ("dictionary.com", "Play Free Online Games"), ("sadlier.com", "10 Classroom Vocabulary Games For All Ages"),
        ("thefidgetgame.com", "The Vocabulary Game: Learn Vocab Words Like Never ..."), ("babadum.com", "Ba Ba Dum"),
        ("mindgames.com", "Word Games and quizzes")]),
    "vocabulary game": ("PPPRPPRPA", [
        ("merriam-webster.com", "How Strong Is Your Vocabulary? - Word Game"), ("knoword.com", "Knoword: Engaging Vocabulary Games & Custom Flashcards"),
        ("flocabulary.com", "Vocabulary Mini Games"), ("sadlier.com", "10 Classroom Vocabulary Games For All Ages"),
        ("gamestolearnenglish.com", "Vocab Game"), ("babadum.com", "Ba Ba Dum"),
        ("edutopia.org", "5 Vocabulary Games That Build Content Knowledge"), ("play.freerice.com", "Freerice"),
        ("apps.apple.com", "Vocabulary Builder by Magoosh - App Store")]),
    "vocabulary games online free": ("PPPPRPPPP", [
        ("dictionary.com", "Play Free Online Games"), ("merriam-webster.com", "How Strong Is Your Vocabulary? - Word Game"),
        ("wordgametime.com", "Vocabulary Games, Worksheets & Videos"), ("babadum.com", "Ba Ba Dum"),
        ("ultimateradioshow.com", "Free Online Vocabulary Games Kids Actually Want to Play"), ("flocabulary.com", "Free Vocabulary Review Games"),
        ("duckenglish.com", "Free Vocabulary Games Online"), ("knoword.com", "Knoword: Engaging Vocabulary Games & Custom Flashcards"),
        ("games.vocabularyninja.co.uk", "Vocab Ninja Mini Games")]),
    "vocabulary word games online": ("PPPPPPPPP", [
        ("merriam-webster.com", "Word Games & Quizzes"), ("mindgames.com", "Word Games and quizzes"), ("dictionary.com", "Play Free Online Games"),
        ("knoword.com", "Knoword: Engaging Vocabulary Games & Custom Flashcards"), ("babadum.com", "Ba Ba Dum"),
        ("wordwall.net", "Vocabulary Game - Teaching resources"), ("aarp.org", "Word Games and Crossword Puzzles"),
        ("wordgametime.com", "Vocabulary Games, Worksheets & Videos"), ("play.freerice.com", "Freerice")]),
    "vocabulary word games for adults": ("PPPPRPRAP", [
        ("merriam-webster.com", "Word Games & Quizzes"), ("mindgames.com", "Word Games and quizzes"), ("dictionary.com", "Play Free Online Games"),
        ("aarp.org", "Word Games and Crossword Puzzles"), ("reddit.com", "vocabulary game recommendations? : r/logophilia"),
        ("knoword.com", "Knoword: Engaging Vocabulary Games & Custom Flashcards"), ("educationtothecore.com", "10 Vocabulary Games to Play with ANY Vocabulary Word"),
        ("play.google.com", "Words of Wonders: Crossword - Google Play"), ("merriam-webster.com", "How Strong Is Your Vocabulary? - Word Game")]),
    "scramble words": ("PPPPPPPPP", [
        ("wordunscrambler.me", "Word Unscrambler - Unscramble Letters To Find Words"), ("word.tips", "Scramble Words Solver & Finder"),
        ("content.allscrabblewords.com", "Unscrambler | Unscramble Scrabble Words"), ("games.aarp.org", "Play This Word Scramble Word Game Today"),
        ("wordsies.com", "Word Unscrambler - Unscramble Letters Into Words Fast"), ("merriam-webster.com", "Word Finder: Scrabble & Word Game Solver"),
        ("hanginghyena.com", "Word Scramble Solver"), ("arkadium.com", "Play Word Scramble Game Online for Free"),
        ("scrabblewordfinder.org", "Scrabble Word Finder - Online Scrabble Solver")]),
    "word scramble game": ("PPPPAPPPP", [
        ("games.usatoday.com", "Play Scramble Words | USA TODAY"), ("games.aarp.org", "Play This Word Scramble Word Game Today"),
        ("arkadium.com", "Play Word Scramble Game Online for Free"), ("dictionary.cambridge.org", "Play Word Scramble | Cambridge Word Games"),
        ("play.google.com", "Word Scramble Game - Google Play"), ("wordunscrambler.me", "Word Scramble - WordUnscrambler.Me"),
        ("playscrabble.com", "Play Scrabble Online For Free"), ("mindgames.com", "Scramble Words game: Play online for free"),
        ("games.readersdigest.ca", "Scramble Words - Free Online Game")]),
    "spelling games": ("PPARPAPPR", [
        ("merriam-webster.com", "Spell It - A Spelling Word Game"), ("spellingtraining.com", "Free Online Spelling Training & Games for Grades 1-4"),
        ("play.google.com", "Spelling Quiz - Word Trivia - Google Play"), ("ted.com", "Spellcheck"),
        ("coolmathgames.com", "Spelling Games | Coolmath Games"), ("apps.apple.com", "Spelling: Spelling Games - App Store"),
        ("nytimes.com", "Spelling Bee"), ("loonylearn.com", "Spelling Games for Kids"), ("teachhub.com", "Classroom Spelling Games Your Students Will Love")]),
    "spelling bee games": ("PPPAPPPPA", [
        ("spellbee.org", "Spelling Bee Game - 100% Free"), ("nytimes.com", "Spelling Bee"), ("spellsbee.com", "Spelling Bee Game - Online and Free"),
        ("play.google.com", "Spelling Bee - Google Play"), ("lessgames.com", "Spelling Bee"), ("spellquiz.com", "Spelling Bee Online"),
        ("spellingbeegame.us", "Spell Bee Game - Free & Online"), ("nytimes.com", "Spelling Bee Past Puzzles"),
        ("apps.apple.com", "Spelling Bee: Today's Game - App Store")]),
    "quizlet alternatives": ("ARRRRRRR", [
        ("knowt.com", "Knowt: #1 Free Quizlet Alternative with AI Study Tools"), ("reddit.com", "Looking for alternatives to quizlet : r/languagelearning"),
        ("teachfloor.com", "9 Best Quizlet Alternatives for Study and Assessment"), ("questionpro.com", "Top 10 Quizlet Alternatives & Competitors in 2026"),
        ("flintk12.com", "Quizlet Alternatives (2026): 6 Free Options Compared"), ("scholarly.so", "Best Free Quizlet Alternatives in 2026"),
        ("riseguide.com", "Quizlet alternatives: 11 study apps to try instead"), ("mitti.com", "12 Must-try Quizlet flashcards alternatives")]),
    "quizlet alternative": ("ARRRRRRR", [
        ("knowt.com", "Knowt: #1 Free Quizlet Alternative with AI Study Tools"), ("reddit.com", "Looking for alternatives to quizlet : r/languagelearning"),
        ("flintk12.com", "Quizlet Alternatives (2026): 6 Free Options Compared"), ("kvistly.com", "10 Best Free Quizlet Alternatives in 2026"),
        ("questionpro.com", "Top 10 Quizlet Alternatives & Competitors in 2026"), ("scholarly.so", "Best Free Quizlet Alternatives in 2026"),
        ("riseguide.com", "Quizlet alternatives: 11 study apps to try instead"), ("edumo.io", "Best Quizlet Alternatives for Language Teachers")]),
    "free quizlet alternative": ("ARRRRRRA", [
        ("knowt.com", "Knowt: #1 Free Quizlet Alternative with AI Study Tools"), ("reddit.com", "Looking for alternatives to quizlet : r/languagelearning"),
        ("flintk12.com", "Quizlet Alternatives (2026): 6 Free Options Compared"), ("kvistly.com", "10 Best Free Quizlet Alternatives in 2026"),
        ("scholarly.so", "Best Free Quizlet Alternatives in 2026"), ("questionpro.com", "Top 10 Quizlet Alternatives & Competitors in 2026"),
        ("riseguide.com", "Quizlet alternatives: 11 study apps to try instead"), ("jungleai.com", "the best free quizlet alternative - jungle vs quizlet")]),
    "flashcard app": ("AAAAARAPR", [
        ("apps.apple.com", "Quizlet: More than Flashcards - App Store"), ("play.google.com", "AnkiDroid Flashcards - Google Play"),
        ("apps.ankiweb.net", "Anki - powerful, intelligent flashcards"), ("brainscape.com", "Brainscape: The Best Flashcards App"),
        ("play.google.com", "Flashcard maker - Google Play"), ("reddit.com", "Any recommendations on flashcard apps?"),
        ("apps.apple.com", "Amazing Flash Cards - App Store"), ("quizlet.com", "Online Flashcard Maker & Flashcard App"),
        ("laxuai.com", "5 Best Flashcard Apps for Students in 2026")]),
    "flashcards app": ("AAAAARAP", [
        ("apps.apple.com", "Quizlet: More than Flashcards - App Store"), ("play.google.com", "AnkiDroid Flashcards - Google Play"),
        ("apps.ankiweb.net", "Anki - powerful, intelligent flashcards"), ("brainscape.com", "Brainscape: The Best Flashcards App"),
        ("play.google.com", "Flashcard maker - Google Play"), ("reddit.com", "Any recommendations on flashcard apps?"),
        ("apps.apple.com", "Brainscape - Study Flashcards - App Store"), ("quizlet.com", "Online Flashcard Maker & Flashcard App")]),
    "anki alternatives": ("RRRRRRRR", [
        ("reddit.com", "Anki alternatives? : r/Anki"), ("remnote.com", "9 Best Anki Alternatives to Try in 2026"),
        ("boterview.com", "3 Modern Flashcards Alternatives to Anki"), ("voovostudy.com", "Best Anki Alternatives in 2026"),
        ("taalhammer.com", "The Best Anki Alternative for Language Learners"), ("scholarly.so", "7 Best Anki Alternatives"),
        ("kachika.app", "Best Anki Alternatives 2026: 9 Apps Tested"), ("youtube.com", "5 Best Anki Alternatives for Easy Flashcards & Study")]),
    "spaced repetition app": ("AAAARRRA", [
        ("play.google.com", "Spaced Repetition - Google Play"), ("apps.apple.com", "Spaced Repetition SmartCards+ - App Store"),
        ("remnote.com", "Spaced Repetition App: Study Less, Remember More"), ("apps.ankiweb.net", "Anki - powerful, intelligent flashcards"),
        ("reddit.com", "What's your favorite spaced repetition app"), ("evakeiffenheim.substack.com", "How to Choose a Spaced Repetition App That You'll Use"),
        ("mitti.com", "Spaced repetition apps - Mitti"), ("apps.apple.com", "Space: Spaced Repetition - App Store")]),
    "spaced repetition apps": ("ARARRRAA", [
        ("apps.apple.com", "Spaced Repetition SmartCards+ - App Store"), ("taalhammer.com", "Best Language Learning Apps with Spaced Repetition"),
        ("play.google.com", "Spaced Repetition - Google Play"), ("reddit.com", "What's your favorite spaced repetition app"),
        ("evakeiffenheim.substack.com", "How to Choose a Spaced Repetition App That You'll Use"), ("mitti.com", "Spaced repetition apps - Mitti"),
        ("remnote.com", "Spaced Repetition App: Study Less, Remember More"), ("mochi.cards", "Mochi - Spaced repetition flashcards")]),
    "flashcard app spaced repetition": ("AARARAA", [
        ("play.google.com", "Spaced Repetition - Google Play"), ("apps.apple.com", "Spaced Repetition SmartCards+ - App Store"),
        ("reddit.com", "Free flashcards app for spaced repetition learning"), ("mochi.cards", "Mochi - Spaced repetition flashcards"),
        ("fltmag.com", "The Benefits and Challenges of Spaced Repetition ..."), ("noji.io", "Noji: Flashcard App with Spaced Repetition"),
        ("brainscape.com", "Brainscape: The Best Flashcards App")]),
    "anki spaced repetition": ("ARRRARR", [
        ("apps.ankiweb.net", "Anki - powerful, intelligent flashcards"), ("reddit.com", "How do you approach spaced repetition in a deck with ..."),
        ("pmc.ncbi.nlm.nih.gov", "Exploring the Impact of Spaced Repetition Through Anki ..."), ("growexx.com", "Anki Algorithm Explained: How Spaced Repetition Works"),
        ("play.google.com", "AnkiDroid Flashcards - Google Play"), ("forums.ankiweb.net", "Combining spaced repetition with meaningful, structured ..."),
        ("scrubscommunity.com", "Anki: How Spaced Repetition Can Revolutionize Your Studying")]),
    "what is active recall": ("RRRRRAR", [
        ("bcu.ac.uk", "What is active recall? The best study method explained"), ("reddit.com", "Active Recall Studying : r/StudentNurse"),
        ("thrive.arizona.edu", "Active Recall to the Memory Rescue"), ("nscs.org", "Why Top Students Swear by Active Recall"),
        ("youtube.com", "How to Study & Learn Using Active Recall | Dr. Cal Newport"), ("activerecall.com", "Active Recall - Learn anything. Forever."),
        ("magneticmemorymethod.com", "What Is Active Recall and Does It Help You Remember?")]),
    "active recall app": ("AAAARAAAR", [
        ("activerecall.com", "Active Recall - Learn anything. Forever."), ("apps.apple.com", "Qsets: Active Recall Study - App Store"),
        ("play.google.com", "Qsets: Active Recall Study - Google Play"), ("activerecall.com", "Getting started with Active Recall"),
        ("kenznote.com", "Best Active Recall Apps: Top 20 Compared (2026)"), ("gizmo.ai", "Gizmo - Get addicted to learning"),
        ("apps.apple.com", "Active Recall: Ovido - App Store"), ("play.google.com", "Active Recall Cards - Google Play"),
        ("leapaheadapp.com", "The Best Active Recall Apps to Automate Your Study ...")]),
    "free language learning apps": ("RRRRAARA", [
        ("reddit.com", "What is the best free language learning app apart from ..."), ("polychatapp.com", "11 Best Free Language Learning Apps for 2026"),
        ("pcmag.com", "The Best Free Language Learning Apps for 2026"), ("hellonabu.com", "5 Best Free Language Learning Apps in 2026"),
        ("play.google.com", "Duolingo: Learn Languages - Google Play"), ("apps.apple.com", "Duolingo: Learn Languages - App Store"),
        ("tanyamozias.substack.com", "The Best Language Learning Apps You've Probably Never ..."), ("mondly.com", "Mondly - Learn Languages Online for Free")]),
    "vocabulary building apps": ("RAAPRRAAR", [
        ("reddit.com", "Which is the best app for improving vocabulary?"), ("apps.apple.com", "Vocabulary - Learn words daily - App Store"),
        ("play.google.com", "Vocabulary Builder - Google Play"), ("vocabulary.com", "Vocabulary.com - Learn Words - English Dictionary"),
        ("penguen.io", "The 7 Best Free Vocabulary Apps in 2026"), ("readabilitytutor.com", "8 Best Vocabulary Apps for Kids: Our Picks"),
        ("apps.apple.com", "WordUp - Vocabulary Builder - App Store"), ("play.google.com", "Zann WordUp: Build Vocabulary - Google Play"),
        ("polychatapp.com", "The 12 Best Vocabulary Building Apps for Language ...")]),
    "vocabulary quiz generator": ("PPPPPPPPP", [
        ("wordsmyth.net", "Multiple Choice Quiz Test Maker Generator"), ("getquizcraft.com", "Vocabulary Quiz Maker - Free Printable Quiz Generator"),
        ("essaygrader.ai", "Free Vocabulary Quiz Maker for Teachers"), ("jotform.com", "Free Vocabulary Quiz Maker"),
        ("teachquill.com", "Vocabulary Quiz Maker - Interactive Word Quiz Builder"), ("merriam-webster.com", "How Strong Is Your Vocabulary? - Word Game"),
        ("notelyn.com", "Vocab Quiz Generator: Build Tests From Your Notes"), ("canva.com", "Free Online Quiz Maker - Create Quizzes in Minutes"),
        ("myquizgpt.com", "Vocabulary Test Generator")]),
    "vocabulary quiz maker": ("PPPPPPPPP", [
        ("wordsmyth.net", "Multiple Choice Quiz Test Maker Generator"), ("getquizcraft.com", "Vocabulary Quiz Maker - Free Printable Quiz Generator"),
        ("essaygrader.ai", "Free Vocabulary Quiz Maker for Teachers"), ("teachquill.com", "Vocabulary Quiz Maker - Interactive Word Quiz Builder"),
        ("jotform.com", "Free Vocabulary Quiz Maker"), ("canva.com", "Free Online Quiz Maker - Create Quizzes in Minutes"),
        ("merriam-webster.com", "How Strong Is Your Vocabulary? - Word Game"), ("typeform.com", "Online Vocabulary Quiz & Test Maker Template"),
        ("notelyn.com", "Vocab Quiz Generator: Build Tests From Your Notes")]),
    "spanish vocabulary quiz": ("PPPPPPPPP", [
        ("play.howstuffworks.com", "Spanish Vocabulary Quiz"), ("quiz-tree.com", "Spanish Vocabulary Quizzes with Audio"),
        ("spanishdict.com", "Practice & Learn Vocabulary | SpanishDictionary"), ("quizlet.com", "Abeka: Spanish 1 Vocabulary Quiz 4B Flashcards"),
        ("sporcle.com", "Spanish Vocab Quiz - By moonberri"), ("englishnspanish.com", "Bilingual Vocabulary Quizzes - English & Spanish"),
        ("jetpunk.com", "Spanish Language Vocabulary Quizzes"), ("lenguia.com", "Spanish Vocabulary Level Test - Free CEFR Test (A1-C1)"),
        ("educationquizzes.com", "Spanish Difficult Review | vocabulary mixed words")]),
    "spanish vocabulary flashcards": ("PRPRPAPAR", [
        ("quizlet.com", "1000 Top Used Spanish Words Flashcards"), ("rosettastone.com", "Spanish Vocabulary Flashcards"),
        ("flashcardo.com", "Free Spanish Flashcards"), ("amazon.com", "Spanish Vocabulary Cards for Kids & Adults Beginners"),
        ("studystack.com", "Free Spanish Flashcards"), ("play.google.com", "Learn Spanish with flashcards! - Google Play"),
        ("spanishspanish.com", "Spanish Flash Cards - Spanish Flashcards"), ("apps.apple.com", "Learn Spanish with flashcards! - App Store"),
        ("reddit.com", "Spanish beginners vocab flashcards?")]),
    "sat vocabulary flashcards": ("PPRRARPPR", [
        ("quizlet.com", "SAT Vocabulary Flashcards"), ("manhattanreview.com", "Free SAT Vocabulary Flashcards"),
        ("amazon.com", "Sat Vocabulary Flashcards"), ("reddit.com", "Official Vocabulary Quizlet Sets : r/Sat"),
        ("apps.apple.com", "SAT Flashcards: Prep & Vocab - App Store"), ("satprepin.com", "SAT Vocabulary Flashcards for 2026 | Most Tested ..."),
        ("sat.magoosh.com", "Free SAT Flashcards"), ("crackd.it", "SAT Vocabulary & Word Parts"),
        ("collegeprep.uworld.com", "Best SAT Flashcards to Supercharge Your SAT Prep")]),
    "how to memorize vocabulary": ("RRRRRRR", [
        ("reddit.com", "How do I memorize vocabulary? : r/languagelearning"), ("ef.edu", "How to memorize new vocabulary faster: 9 tips"),
        ("learningcenter.unc.edu", "Memorization Strategies - UNC Learning Center"), ("magneticmemorymethod.com", "How to Memorize Vocabulary: A Step-By-Step Guide"),
        ("masterofmemory.com", "How to memorize vocabulary faster than ever"), ("pimsleur.com", "How to Memorize Foreign Language Vocabulary FAST"),
        ("forum.artofmemory.com", "Memory palace for vocabulary frustration")]),
}

# проверка: в разметке по букве на каждую ссылку
for q, (marks, links) in SERP.items():
    assert len(marks) == len(links), (q, len(marks), len(links))

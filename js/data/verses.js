const VERSES_BASE = [
    {
        id: 'genesis-1-1',
        book: 'Genesis',
        bookId: 'genesis',
        reference: 'Genesis 1:1',
        text: 'In the beginning when God created the heavens and the earth,',
        difficulty: 'easy',
        themes: ['creation', 'beginnings'],
        clue: 'Opening words of Scripture.'
    },
    {
        id: 'genesis-12-2',
        book: 'Genesis',
        bookId: 'genesis',
        reference: 'Genesis 12:2',
        text: 'I will make of you a great nation, and I will bless you, and make your name great, so that you will be a blessing.',
        difficulty: 'medium',
        themes: ['covenant', 'blessing', 'abraham'],
        clue: 'A promise given at the call of Abram.'
    },
    {
        id: 'genesis-50-20',
        book: 'Genesis',
        bookId: 'genesis',
        reference: 'Genesis 50:20',
        text: 'Even though you intended to do harm to me, God intended it for good, in order to preserve a numerous people, as he is doing today.',
        difficulty: 'medium',
        themes: ['providence', 'forgiveness', 'joseph'],
        clue: 'Joseph speaks about God bringing good from evil.'
    },
    {
        id: 'exodus-14-14',
        book: 'Exodus',
        bookId: 'exodus',
        reference: 'Exodus 14:14',
        text: 'The Lord will fight for you, and you have only to keep still.',
        difficulty: 'easy',
        themes: ['deliverance', 'trust'],
        clue: 'A moment of rescue and waiting.'
    },
    {
        id: 'exodus-3-14',
        book: 'Exodus',
        bookId: 'exodus',
        reference: 'Exodus 3:14',
        text: 'God said to Moses, “I AM WHO I AM.” He said further, “Thus you shall say to the Israelites, ‘I AM has sent me to you.’”',
        difficulty: 'easy',
        themes: ['name-of-god', 'calling', 'moses'],
        clue: 'God reveals his name from the burning bush.'
    },
    {
        id: 'exodus-20-12',
        book: 'Exodus',
        bookId: 'exodus',
        reference: 'Exodus 20:12',
        text: 'Honor your father and your mother, so that your days may be long in the land that the Lord your God is giving you.',
        difficulty: 'easy',
        themes: ['law', 'commandments', 'family'],
        clue: 'One of the Ten Commandments.'
    },
    {
        id: 'leviticus-19-18',
        book: 'Leviticus',
        bookId: 'leviticus',
        reference: 'Leviticus 19:18',
        text: 'but you shall love your neighbor as yourself: I am the Lord.',
        difficulty: 'medium',
        themes: ['law', 'love', 'holiness'],
        clue: 'A command later repeated by Jesus.'
    },
    {
        id: 'leviticus-19-2',
        book: 'Leviticus',
        bookId: 'leviticus',
        reference: 'Leviticus 19:2',
        text: 'Speak to all the congregation of the people of Israel and say to them: You shall be holy, for I the Lord your God am holy.',
        difficulty: 'medium',
        themes: ['holiness', 'law', 'identity'],
        clue: 'A central call to holiness.'
    },
    {
        id: 'leviticus-26-12',
        book: 'Leviticus',
        bookId: 'leviticus',
        reference: 'Leviticus 26:12',
        text: 'And I will walk among you, and will be your God, and you shall be my people.',
        difficulty: 'hard',
        themes: ['covenant', 'presence', 'promise'],
        clue: 'A covenant promise near the end of the book.'
    },
    {
        id: 'job-19-25',
        book: 'Job',
        bookId: 'job',
        reference: 'Job 19:25',
        text: 'For I know that my Redeemer lives, and that at the last he will stand upon the earth;',
        difficulty: 'medium',
        themes: ['suffering', 'hope', 'redemption'],
        clue: 'A declaration of hope in the middle of suffering.'
    },
    {
        id: 'job-1-21',
        book: 'Job',
        bookId: 'job',
        reference: 'Job 1:21',
        text: 'Naked I came from my mother’s womb, and naked shall I return there; the Lord gave, and the Lord has taken away; blessed be the name of the Lord.',
        difficulty: 'medium',
        themes: ['loss', 'worship', 'suffering'],
        clue: 'A response to devastating loss.'
    },
    {
        id: 'job-23-10',
        book: 'Job',
        bookId: 'job',
        reference: 'Job 23:10',
        text: 'But he knows the way that I take; when he has tested me, I shall come out like gold.',
        difficulty: 'medium',
        themes: ['testing', 'perseverance', 'hope'],
        clue: 'A statement about being refined through trial.'
    },
    {
        id: 'psalm-23-1',
        book: 'Psalms',
        bookId: 'psalms',
        reference: 'Psalm 23:1',
        text: 'The Lord is my shepherd, I shall not want.',
        difficulty: 'easy',
        themes: ['trust', 'shepherd', 'provision'],
        clue: 'One of the best-known lines in the Bible.'
    },
    {
        id: 'psalm-27-1',
        book: 'Psalms',
        bookId: 'psalms',
        reference: 'Psalm 27:1',
        text: 'The Lord is my light and my salvation; whom shall I fear? The Lord is the stronghold of my life; of whom shall I be afraid?',
        difficulty: 'easy',
        themes: ['trust', 'fear', 'salvation'],
        clue: 'A psalm about courage and confidence in God.'
    },
    {
        id: 'psalm-46-1',
        book: 'Psalms',
        bookId: 'psalms',
        reference: 'Psalm 46:1',
        text: 'God is our refuge and strength, a very present help in trouble.',
        difficulty: 'easy',
        themes: ['refuge', 'strength', 'help'],
        clue: 'A famous psalm of comfort in trouble.'
    },
    {
        id: 'psalm-119-105',
        book: 'Psalms',
        bookId: 'psalms',
        reference: 'Psalm 119:105',
        text: 'Your word is a lamp to my feet and a light to my path.',
        difficulty: 'easy',
        themes: ['word', 'guidance', 'light'],
        clue: 'A psalm line about God’s word guiding life.'
    },
    {
        id: 'proverbs-3-5',
        book: 'Proverbs',
        bookId: 'proverbs',
        reference: 'Proverbs 3:5',
        text: 'Trust in the Lord with all your heart, and do not rely on your own insight.',
        difficulty: 'easy',
        themes: ['wisdom', 'trust'],
        clue: 'A wisdom verse about depending on God rather than self.'
    },
    {
        id: 'proverbs-1-7',
        book: 'Proverbs',
        bookId: 'proverbs',
        reference: 'Proverbs 1:7',
        text: 'The fear of the Lord is the beginning of knowledge; fools despise wisdom and instruction.',
        difficulty: 'easy',
        themes: ['wisdom', 'fear-of-the-lord', 'instruction'],
        clue: 'A foundational statement at the start of the book.'
    },
    {
        id: 'proverbs-9-10',
        book: 'Proverbs',
        bookId: 'proverbs',
        reference: 'Proverbs 9:10',
        text: 'The fear of the Lord is the beginning of wisdom, and the knowledge of the Holy One is insight.',
        difficulty: 'medium',
        themes: ['wisdom', 'fear-of-the-lord', 'insight'],
        clue: 'A parallel wisdom statement later in the book.'
    },
    {
        id: 'ecclesiastes-3-1',
        book: 'Ecclesiastes',
        bookId: 'ecclesiastes',
        reference: 'Ecclesiastes 3:1',
        text: 'For everything there is a season, and a time for every matter under heaven:',
        difficulty: 'easy',
        themes: ['time', 'seasons', 'wisdom'],
        clue: 'A famous reflection on timing and human life.'
    },
    {
        id: 'ecclesiastes-3-11',
        book: 'Ecclesiastes',
        bookId: 'ecclesiastes',
        reference: 'Ecclesiastes 3:11',
        text: 'He has made everything suitable for its time; moreover he has put a sense of past and future into their minds, yet they cannot find out what God has done from the beginning to the end.',
        difficulty: 'hard',
        themes: ['time', 'mystery', 'wisdom'],
        clue: 'A meditation on time and the limits of human understanding.'
    },
    {
        id: 'ecclesiastes-12-13',
        book: 'Ecclesiastes',
        bookId: 'ecclesiastes',
        reference: 'Ecclesiastes 12:13',
        text: 'The end of the matter; all has been heard. Fear God, and keep his commandments; for that is the whole duty of everyone.',
        difficulty: 'medium',
        themes: ['wisdom', 'obedience', 'fear-of-the-lord'],
        clue: 'A concluding summary near the end of the book.'
    },
    {
        id: 'song-of-songs-2-1',
        book: 'Song of Solomon',
        bookId: 'song-of-solomon',
        reference: 'Song of Songs 2:1',
        text: 'I am a rose of Sharon, a lily of the valleys.',
        difficulty: 'hard',
        themes: ['love', 'poetry', 'beauty'],
        clue: 'A poetic line from a lyrical wisdom book.'
    },
    {
        id: 'song-of-songs-2-10',
        book: 'Song of Solomon',
        bookId: 'song-of-solomon',
        reference: 'Song of Songs 2:10',
        text: 'My beloved speaks and says to me: “Arise, my love, my fair one, and come away;',
        difficulty: 'hard',
        themes: ['love', 'poetry', 'invitation'],
        clue: 'A romantic invitation in poetic form.'
    },
    {
        id: 'song-of-songs-8-7',
        book: 'Song of Solomon',
        bookId: 'song-of-solomon',
        reference: 'Song of Songs 8:7',
        text: 'Many waters cannot quench love, neither can floods drown it. If one offered for love all the wealth of one’s house, it would be utterly scorned.',
        difficulty: 'medium',
        themes: ['love', 'poetry', 'endurance'],
        clue: 'A famous line about the power of love.'
    },
    {
        id: 'wisdom-3-1',
        book: 'Wisdom',
        bookId: 'wisdom',
        reference: 'Wisdom 3:1',
        text: 'But the souls of the righteous are in the hand of God, and no torment will ever touch them.',
        difficulty: 'medium',
        themes: ['righteousness', 'hope', 'eternal-life'],
        clue: 'A deuterocanonical wisdom passage about the righteous.'
    },
    {
        id: 'wisdom-1-7',
        book: 'Wisdom',
        bookId: 'wisdom',
        reference: 'Wisdom 1:7',
        text: 'Because the spirit of the Lord has filled the world, and that which holds all things together knows what is said,',
        difficulty: 'hard',
        themes: ['spirit', 'wisdom', 'presence'],
        clue: 'A deuterocanonical statement about the Spirit filling the world.'
    },
    {
        id: 'wisdom-6-12',
        book: 'Wisdom',
        bookId: 'wisdom',
        reference: 'Wisdom 6:12',
        text: 'Wisdom is radiant and unfading, and she is easily discerned by those who love her, and is found by those who seek her.',
        difficulty: 'medium',
        themes: ['wisdom', 'seeking', 'beauty'],
        clue: 'A personified description of wisdom.'
    },
    {
        id: 'sirach-2-1',
        book: 'Sirach',
        bookId: 'sirach',
        reference: 'Sirach 2:1',
        text: 'My child, when you come to serve the Lord, prepare yourself for testing.',
        difficulty: 'medium',
        themes: ['testing', 'discipleship', 'wisdom'],
        clue: 'A wisdom warning about trials in serving God.'
    },
    {
        id: 'sirach-6-14',
        book: 'Sirach',
        bookId: 'sirach',
        reference: 'Sirach 6:14',
        text: 'Faithful friends are a sturdy shelter: whoever finds one has found a treasure.',
        difficulty: 'medium',
        themes: ['friendship', 'wisdom', 'community'],
        clue: 'A deuterocanonical proverb about friendship.'
    },
    {
        id: 'sirach-26-1',
        book: 'Sirach',
        bookId: 'sirach',
        reference: 'Sirach 26:1',
        text: 'Happy is the husband of a good wife; the number of his days will be doubled.',
        difficulty: 'hard',
        themes: ['family', 'wisdom', 'blessing'],
        clue: 'A wisdom line about marriage.'
    },
    {
        id: 'isaiah-40-31',
        book: 'Isaiah',
        bookId: 'isaiah',
        reference: 'Isaiah 40:31',
        text: 'but those who wait for the Lord shall renew their strength, they shall mount up with wings like eagles, they shall run and not be weary, they shall walk and not faint.',
        difficulty: 'easy',
        themes: ['hope', 'strength', 'prophecy'],
        clue: 'A prophetic promise about renewed strength.'
    },
    {
        id: 'isaiah-6-8',
        book: 'Isaiah',
        bookId: 'isaiah',
        reference: 'Isaiah 6:8',
        text: 'Then I heard the voice of the Lord saying, “Whom shall I send, and who will go for us?” And I said, “Here am I; send me!”',
        difficulty: 'easy',
        themes: ['calling', 'mission', 'prophecy'],
        clue: 'A famous response to God’s call.'
    },
    {
        id: 'isaiah-9-6',
        book: 'Isaiah',
        bookId: 'isaiah',
        reference: 'Isaiah 9:6',
        text: 'For a child has been born for us, a son given to us; authority rests upon his shoulders; and he is named Wonderful Counselor, Mighty God, Everlasting Father, Prince of Peace.',
        difficulty: 'easy',
        themes: ['messiah', 'prophecy', 'hope'],
        clue: 'A famous prophetic line often heard at Christmas.'
    },
    {
        id: 'isaiah-53-5',
        book: 'Isaiah',
        bookId: 'isaiah',
        reference: 'Isaiah 53:5',
        text: 'But he was wounded for our transgressions, crushed for our iniquities; upon him was the punishment that made us whole, and by his bruises we are healed.',
        difficulty: 'medium',
        themes: ['suffering-servant', 'healing', 'prophecy'],
        clue: 'A famous line from the servant song.'
    },
    {
        id: 'jeremiah-29-11',
        book: 'Jeremiah',
        bookId: 'jeremiah',
        reference: 'Jeremiah 29:11',
        text: 'For surely I know the plans I have for you, says the Lord, plans for your welfare and not for harm, to give you a future with hope.',
        difficulty: 'easy',
        themes: ['hope', 'future', 'promise'],
        clue: 'A widely quoted promise about hope and future.'
    },
    {
        id: 'jeremiah-1-5',
        book: 'Jeremiah',
        bookId: 'jeremiah',
        reference: 'Jeremiah 1:5',
        text: 'Before I formed you in the womb I knew you, and before you were born I consecrated you; I appointed you a prophet to the nations.',
        difficulty: 'easy',
        themes: ['calling', 'formation', 'prophecy'],
        clue: 'A calling verse about being known before birth.'
    },
    {
        id: 'jeremiah-17-9',
        book: 'Jeremiah',
        bookId: 'jeremiah',
        reference: 'Jeremiah 17:9',
        text: 'The heart is devious above all else; it is perverse—who can understand it?',
        difficulty: 'medium',
        themes: ['heart', 'sin', 'wisdom'],
        clue: 'A sobering line about the human heart.'
    },
    {
        id: 'lamentations-3-22-23',
        book: 'Lamentations',
        bookId: 'lamentations',
        reference: 'Lamentations 3:22-23',
        text: 'The steadfast love of the Lord never ceases, his mercies never come to an end; they are new every morning; great is your faithfulness.',
        difficulty: 'medium',
        themes: ['mercy', 'faithfulness', 'hope'],
        clue: 'A poetic line often quoted in worship.'
    },
    {
        id: 'lamentations-3-25',
        book: 'Lamentations',
        bookId: 'lamentations',
        reference: 'Lamentations 3:25',
        text: 'The Lord is good to those who wait for him, to the soul that seeks him.',
        difficulty: 'medium',
        themes: ['hope', 'waiting', 'goodness'],
        clue: 'A quiet statement of hope in the middle of lament.'
    },
    {
        id: 'lamentations-3-26',
        book: 'Lamentations',
        bookId: 'lamentations',
        reference: 'Lamentations 3:26',
        text: 'It is good that one should wait quietly for the salvation of the Lord.',
        difficulty: 'hard',
        themes: ['waiting', 'salvation', 'hope'],
        clue: 'A brief line about quiet hope.'
    },
    {
        id: 'baruch-4-28',
        book: 'Baruch',
        bookId: 'baruch',
        reference: 'Baruch 4:28',
        text: 'For just as you were disposed to go astray from God, return with tenfold zeal to seek him.',
        difficulty: 'hard',
        themes: ['repentance', 'return', 'zeal'],
        clue: 'A deuterocanonical call to return to God.'
    },
    {
        id: 'baruch-3-14',
        book: 'Baruch',
        bookId: 'baruch',
        reference: 'Baruch 3:14',
        text: 'Learn where there is wisdom, where there is strength, where there is understanding, so that you may at the same time discern where there is length of days, and life, where there is light for the eyes, and peace.',
        difficulty: 'hard',
        themes: ['wisdom', 'understanding', 'peace'],
        clue: 'A deuterocanonical call to seek wisdom.'
    },
    {
        id: 'baruch-5-5',
        book: 'Baruch',
        bookId: 'baruch',
        reference: 'Baruch 5:5',
        text: 'Take off the garment of your sorrow and affliction, O Jerusalem, and put on forever the beauty of the glory from God.',
        difficulty: 'medium',
        themes: ['hope', 'restoration', 'glory'],
        clue: 'A poetic promise addressed to Jerusalem.'
    },
    {
        id: 'ezekiel-36-26',
        book: 'Ezekiel',
        bookId: 'ezekiel',
        reference: 'Ezekiel 36:26',
        text: 'A new heart I will give you, and a new spirit I will put within you; and I will remove from your body the heart of stone and give you a heart of flesh.',
        difficulty: 'easy',
        themes: ['renewal', 'heart', 'spirit'],
        clue: 'A prophetic promise of inner transformation.'
    },
    {
        id: 'ezekiel-18-32',
        book: 'Ezekiel',
        bookId: 'ezekiel',
        reference: 'Ezekiel 18:32',
        text: 'For I have no pleasure in the death of anyone, says the Lord God. Turn, then, and live.',
        difficulty: 'medium',
        themes: ['repentance', 'life', 'mercy'],
        clue: 'A prophetic call to turn and live.'
    },
    {
        id: 'ezekiel-37-5',
        book: 'Ezekiel',
        bookId: 'ezekiel',
        reference: 'Ezekiel 37:5',
        text: 'Thus says the Lord God to these bones: I will cause breath to enter you, and you shall live.',
        difficulty: 'medium',
        themes: ['life', 'restoration', 'vision'],
        clue: 'A line from the valley of dry bones.'
    },
    {
        id: 'daniel-3-17',
        book: 'Daniel',
        bookId: 'daniel',
        reference: 'Daniel 3:17',
        text: 'If our God whom we serve is able to deliver us from the furnace of blazing fire and out of your hand, O king, let him deliver us.',
        difficulty: 'medium',
        themes: ['faith', 'deliverance', 'courage'],
        clue: 'A declaration made before a fiery trial.'
    },
    {
        id: 'daniel-6-22',
        book: 'Daniel',
        bookId: 'daniel',
        reference: 'Daniel 6:22',
        text: 'My God sent his angel and shut the lions’ mouths so that they would not hurt me, because I was found blameless before him; and also before you, O king, I have done no wrong.',
        difficulty: 'medium',
        themes: ['deliverance', 'angels', 'faithfulness'],
        clue: 'A testimony after surviving a den of lions.'
    },
    {
        id: 'daniel-7-14',
        book: 'Daniel',
        bookId: 'daniel',
        reference: 'Daniel 7:14',
        text: 'To him was given dominion and glory and kingship, that all peoples, nations, and languages should serve him. His dominion is an everlasting dominion that shall not pass away, and his kingship is one that shall never be destroyed.',
        difficulty: 'hard',
        themes: ['kingdom', 'vision', 'messiah'],
        clue: 'A vision of everlasting dominion.'
    },
    {
        id: 'hosea-6-6',
        book: 'Hosea',
        bookId: 'hosea',
        reference: 'Hosea 6:6',
        text: 'For I desire steadfast love and not sacrifice, the knowledge of God rather than burnt offerings.',
        difficulty: 'medium',
        themes: ['mercy', 'worship', 'prophecy'],
        clue: 'A prophetic rebuke about what God truly desires.'
    },
    {
        id: 'hosea-11-1',
        book: 'Hosea',
        bookId: 'hosea',
        reference: 'Hosea 11:1',
        text: 'When Israel was a child, I loved him, and out of Egypt I called my son.',
        difficulty: 'medium',
        themes: ['love', 'history', 'prophecy'],
        clue: 'A line later echoed in the New Testament.'
    },
    {
        id: 'hosea-14-9',
        book: 'Hosea',
        bookId: 'hosea',
        reference: 'Hosea 14:9',
        text: 'Those who are wise understand these things; those who are discerning know them. For the ways of the Lord are right, and the upright walk in them, but transgressors stumble in them.',
        difficulty: 'hard',
        themes: ['wisdom', 'obedience', 'prophecy'],
        clue: 'A closing reflection on the ways of the Lord.'
    },
    {
        id: 'joel-3-1',
        book: 'Joel',
        bookId: 'joel',
        reference: 'Joel 3:1',
        text: 'Then afterward I will pour out my spirit on all flesh; your sons and your daughters shall prophesy, your old men shall dream dreams, and your young men shall see visions.',
        difficulty: 'medium',
        themes: ['spirit', 'prophecy', 'promise'],
        clue: 'A prophecy later echoed in Acts.'
    },
    {
        id: 'joel-2-13',
        book: 'Joel',
        bookId: 'joel',
        reference: 'Joel 2:13',
        text: 'Rend your hearts and not your clothing. Return to the Lord, your God, for he is gracious and merciful, slow to anger, and abounding in steadfast love, and relents from punishing.',
        difficulty: 'medium',
        themes: ['repentance', 'mercy', 'return'],
        clue: 'A prophetic call to true repentance.'
    },
    {
        id: 'joel-2-32',
        book: 'Joel',
        bookId: 'joel',
        reference: 'Joel 2:32',
        text: 'Then everyone who calls on the name of the Lord shall be saved; for in Mount Zion and in Jerusalem there shall be those who escape, as the Lord has said, and among the survivors shall be those whom the Lord calls.',
        difficulty: 'hard',
        themes: ['salvation', 'calling', 'prophecy'],
        clue: 'A line about calling on the name of the Lord.'
    },
    {
        id: 'amos-5-24',
        book: 'Amos',
        bookId: 'amos',
        reference: 'Amos 5:24',
        text: 'But let justice roll down like waters, and righteousness like an ever-flowing stream.',
        difficulty: 'easy',
        themes: ['justice', 'righteousness', 'prophecy'],
        clue: 'A prophetic call for justice.'
    },
    {
        id: 'amos-4-13',
        book: 'Amos',
        bookId: 'amos',
        reference: 'Amos 4:13',
        text: 'For lo, the one who forms the mountains, creates the wind, reveals his thoughts to mortals, makes the morning darkness, and treads on the heights of the earth—the Lord, the God of hosts, is his name!',
        difficulty: 'hard',
        themes: ['majesty', 'creation', 'prophecy'],
        clue: 'A doxological line in a prophetic book.'
    },
    {
        id: 'amos-9-11',
        book: 'Amos',
        bookId: 'amos',
        reference: 'Amos 9:11',
        text: 'On that day I will raise up the booth of David that is fallen, and repair its breaches, and raise up its ruins, and rebuild it as in the days of old;',
        difficulty: 'hard',
        themes: ['restoration', 'david', 'prophecy'],
        clue: 'A restoration promise at the end of Amos.'
    },
    {
        id: 'obadiah-1-15',
        book: 'Obadiah',
        bookId: 'obadiah',
        reference: 'Obadiah 1:15',
        text: 'For the day of the Lord is near against all the nations. As you have done, it shall be done to you; your deeds shall return on your own head.',
        difficulty: 'hard',
        themes: ['judgment', 'day-of-the-lord'],
        clue: 'A short prophetic book about judgment.'
    },
    {
        id: 'obadiah-1-4',
        book: 'Obadiah',
        bookId: 'obadiah',
        reference: 'Obadiah 1:4',
        text: 'Though you soar aloft like the eagle, though your nest is set among the stars, from there I will bring you down, says the Lord.',
        difficulty: 'hard',
        themes: ['judgment', 'pride', 'prophecy'],
        clue: 'A warning against pride in a very short book.'
    },
    {
        id: 'obadiah-1-21',
        book: 'Obadiah',
        bookId: 'obadiah',
        reference: 'Obadiah 1:21',
        text: 'Those who have been saved shall go up to Mount Zion to rule Mount Esau; and the kingdom shall be the Lord’s.',
        difficulty: 'hard',
        themes: ['kingdom', 'deliverance', 'prophecy'],
        clue: 'The final line of Obadiah.'
    },
    {
        id: 'jonah-2-3',
        book: 'Jonah',
        bookId: 'jonah',
        reference: 'Jonah 2:3',
        text: 'The waters closed over me to take my life; the deep surrounded me; weeds were wrapped around my head.',
        difficulty: 'medium',
        themes: ['distress', 'prayer', 'deliverance'],
        clue: 'A prayer from beneath the waters.'
    },
    {
        id: 'jonah-2-2',
        book: 'Jonah',
        bookId: 'jonah',
        reference: 'Jonah 2:2',
        text: 'saying, “I called to the Lord out of my distress, and he answered me; out of the belly of Sheol I cried, and you heard my voice.',
        difficulty: 'medium',
        themes: ['prayer', 'distress', 'deliverance'],
        clue: 'A cry from distress inside Jonah’s prayer.'
    },
    {
        id: 'jonah-4-2',
        book: 'Jonah',
        bookId: 'jonah',
        reference: 'Jonah 4:2',
        text: 'He prayed to the Lord and said, “O Lord! Is not this what I said while I was still in my own country? That is why I fled to Tarshish at the beginning; for I knew that you are a gracious God and merciful, slow to anger, and abounding in steadfast love, and ready to relent from punishing.”',
        difficulty: 'hard',
        themes: ['mercy', 'prophecy', 'character-of-god'],
        clue: 'Jonah complains using a famous description of God.'
    },
    {
        id: 'micah-6-11-13',
        book: 'Micah',
        bookId: 'micah',
        reference: 'Micah 6:11-13',
        text: 'Can I tolerate wicked scales and a bag of deceitful weights? Because your wealthy are full of violence and your inhabitants speak lies, with tongues of deceit in their mouths, therefore I have begun to strike you down, making you desolate because of your sins.',
        difficulty: 'hard',
        themes: ['justice', 'judgment', 'dishonesty'],
        clue: 'A prophetic condemnation of dishonest scales.'
    },
    {
        id: 'micah-6-8',
        book: 'Micah',
        bookId: 'micah',
        reference: 'Micah 6:8',
        text: 'He has told you, O mortal, what is good; and what does the Lord require of you but to do justice, and to love kindness, and to walk humbly with your God?',
        difficulty: 'easy',
        themes: ['justice', 'humility', 'obedience'],
        clue: 'A famous summary of what the Lord requires.'
    },
    {
        id: 'micah-5-2',
        book: 'Micah',
        bookId: 'micah',
        reference: 'Micah 5:2',
        text: 'But you, O Bethlehem of Ephrathah, who are one of the little clans of Judah, from you shall come forth for me one who is to rule in Israel, whose origin is from of old, from ancient days.',
        difficulty: 'medium',
        themes: ['messiah', 'prophecy', 'bethlehem'],
        clue: 'A prophetic verse associated with Bethlehem.'
    },
    {
        id: 'nahum-1-7',
        book: 'Nahum',
        bookId: 'nahum',
        reference: 'Nahum 1:7',
        text: 'The Lord is good, a stronghold in a day of trouble; he protects those who take refuge in him,',
        difficulty: 'medium',
        themes: ['refuge', 'goodness', 'trust'],
        clue: 'A short prophetic comfort verse.'
    },
    {
        id: 'nahum-1-3',
        book: 'Nahum',
        bookId: 'nahum',
        reference: 'Nahum 1:3',
        text: 'The Lord is slow to anger but great in power, and the Lord will by no means clear the guilty. His way is in whirlwind and storm, and the clouds are the dust of his feet.',
        difficulty: 'hard',
        themes: ['judgment', 'power', 'character-of-god'],
        clue: 'A prophetic description of the Lord’s power.'
    },
    {
        id: 'nahum-1-15',
        book: 'Nahum',
        bookId: 'nahum',
        reference: 'Nahum 1:15',
        text: 'Look! On the mountains the feet of one who brings good tidings, who proclaims peace! Celebrate your festivals, O Judah, fulfill your vows, for never again shall the wicked invade you; they are utterly cut off.',
        difficulty: 'hard',
        themes: ['peace', 'good-news', 'deliverance'],
        clue: 'A line about good tidings and peace.'
    },
    {
        id: 'habakkuk-2-4',
        book: 'Habakkuk',
        bookId: 'habakkuk',
        reference: 'Habakkuk 2:4',
        text: 'Look at the proud! Their spirit is not right in them, but the righteous live by their faithfulness.',
        difficulty: 'medium',
        themes: ['faith', 'righteousness', 'prophecy'],
        clue: 'A line often discussed in relation to faith.'
    },
    {
        id: 'habakkuk-3-19',
        book: 'Habakkuk',
        bookId: 'habakkuk',
        reference: 'Habakkuk 3:19',
        text: 'God, the Lord, is my strength; he makes my feet like the feet of a deer, and makes me tread upon the heights.',
        difficulty: 'medium',
        themes: ['strength', 'trust', 'praise'],
        clue: 'A closing line about strength and sure footing.'
    },
    {
        id: 'habakkuk-2-14',
        book: 'Habakkuk',
        bookId: 'habakkuk',
        reference: 'Habakkuk 2:14',
        text: 'But the earth will be filled with the knowledge of the glory of the Lord, as the waters cover the sea.',
        difficulty: 'medium',
        themes: ['glory', 'knowledge', 'prophecy'],
        clue: 'A sweeping vision of the Lord’s glory filling the earth.'
    },
    {
        id: 'zephaniah-3-17',
        book: 'Zephaniah',
        bookId: 'zephaniah',
        reference: 'Zephaniah 3:17',
        text: 'The Lord, your God, is in your midst, a warrior who gives victory; he will rejoice over you with gladness, he will renew you in his love; he will exult over you with loud singing.',
        difficulty: 'medium',
        themes: ['presence', 'joy', 'salvation'],
        clue: 'A prophetic promise of God rejoicing over his people.'
    },
    {
        id: 'zephaniah-2-3',
        book: 'Zephaniah',
        bookId: 'zephaniah',
        reference: 'Zephaniah 2:3',
        text: 'Seek the Lord, all you humble of the land, who do his commands; seek righteousness, seek humility; perhaps you may be hidden on the day of the Lord’s wrath.',
        difficulty: 'hard',
        themes: ['humility', 'seeking', 'judgment'],
        clue: 'A call to seek the Lord and humility.'
    },
    {
        id: 'zephaniah-3-13',
        book: 'Zephaniah',
        bookId: 'zephaniah',
        reference: 'Zephaniah 3:13',
        text: 'For the remnant of Israel shall do no wrong and utter no lies, nor shall a deceitful tongue be found in their mouths. Then they will pasture and lie down, and no one shall make them afraid.',
        difficulty: 'hard',
        themes: ['remnant', 'peace', 'righteousness'],
        clue: 'A promise concerning the remnant of Israel.'
    },
    {
        id: 'haggai-1-5',
        book: 'Haggai',
        bookId: 'haggai',
        reference: 'Haggai 1:5',
        text: 'Now therefore thus says the Lord of hosts: Consider how you have fared.',
        difficulty: 'hard',
        themes: ['reflection', 'obedience', 'prophecy'],
        clue: 'A very short prophetic wake-up call.'
    },
    {
        id: 'haggai-1-7',
        book: 'Haggai',
        bookId: 'haggai',
        reference: 'Haggai 1:7',
        text: 'Thus says the Lord of hosts: Consider how you have fared.',
        difficulty: 'hard',
        themes: ['reflection', 'obedience', 'prophecy'],
        clue: 'The repeated challenge in Haggai.'
    },
    {
        id: 'haggai-2-9',
        book: 'Haggai',
        bookId: 'haggai',
        reference: 'Haggai 2:9',
        text: 'The latter splendor of this house shall be greater than the former, says the Lord of hosts; and in this place I will give prosperity, says the Lord of hosts.',
        difficulty: 'medium',
        themes: ['glory', 'temple', 'promise'],
        clue: 'A promise about the future splendor of the house.'
    },
    {
        id: 'zechariah-4-6',
        book: 'Zechariah',
        bookId: 'zechariah',
        reference: 'Zechariah 4:6',
        text: 'He said to me, “This is the word of the Lord to Zerubbabel: Not by might, nor by power, but by my spirit, says the Lord of hosts.”',
        difficulty: 'easy',
        themes: ['spirit', 'power', 'prophecy'],
        clue: 'A prophetic line about strength by the Spirit.'
    },
    {
        id: 'zechariah-9-9',
        book: 'Zechariah',
        bookId: 'zechariah',
        reference: 'Zechariah 9:9',
        text: 'Rejoice greatly, O daughter Zion! Shout aloud, O daughter Jerusalem! Lo, your king comes to you; triumphant and victorious is he, humble and riding on a donkey, on a colt, the foal of a donkey.',
        difficulty: 'medium',
        themes: ['king', 'messiah', 'prophecy'],
        clue: 'A prophecy often connected with Palm Sunday.'
    },
    {
        id: 'zechariah-8-16',
        book: 'Zechariah',
        bookId: 'zechariah',
        reference: 'Zechariah 8:16',
        text: 'These are the things that you shall do: Speak the truth to one another, render in your gates judgments that are true and make for peace,',
        difficulty: 'hard',
        themes: ['truth', 'justice', 'peace'],
        clue: 'A practical prophetic instruction about truth and peace.'
    },
    {
        id: 'malachi-3-10',
        book: 'Malachi',
        bookId: 'malachi',
        reference: 'Malachi 3:10',
        text: 'Bring the full tithe into the storehouse, so that there may be food in my house, and thus put me to the test, says the Lord of hosts; see if I will not open the windows of heaven for you and pour down for you an overflowing blessing.',
        difficulty: 'medium',
        themes: ['giving', 'blessing', 'obedience'],
        clue: 'A prophetic challenge tied to the tithe.'
    },
    {
        id: 'malachi-4-2',
        book: 'Malachi',
        bookId: 'malachi',
        reference: 'Malachi 4:2',
        text: 'But for you who revere my name the sun of righteousness shall rise, with healing in its wings.',
        difficulty: 'medium',
        themes: ['healing', 'righteousness', 'hope'],
        clue: 'A prophetic promise using sunrise imagery.'
    },
    {
        id: 'malachi-3-1',
        book: 'Malachi',
        bookId: 'malachi',
        reference: 'Malachi 3:1',
        text: 'See, I am sending my messenger to prepare the way before me, and the Lord whom you seek will suddenly come to his temple.',
        difficulty: 'medium',
        themes: ['messenger', 'temple', 'prophecy'],
        clue: 'A prophetic announcement about a messenger preparing the way.'
    },
    {
        id: 'matthew-5-14',
        book: 'Matthew',
        bookId: 'matthew',
        reference: 'Matthew 5:14',
        text: 'You are the light of the world. A city built on a hill cannot be hid.',
        difficulty: 'easy',
        themes: ['discipleship', 'light', 'sermon-on-the-mount'],
        clue: 'A saying from Jesus in a famous sermon.'
    },
    {
        id: 'matthew-5-16',
        book: 'Matthew',
        bookId: 'matthew',
        reference: 'Matthew 5:16',
        text: 'In the same way, let your light shine before others, so that they may see your good works and give glory to your Father in heaven.',
        difficulty: 'easy',
        themes: ['discipleship', 'light', 'witness'],
        clue: 'A follow-up saying about letting your light shine.'
    },
    {
        id: 'matthew-11-28',
        book: 'Matthew',
        bookId: 'matthew',
        reference: 'Matthew 11:28',
        text: 'Come to me, all you that are weary and are carrying heavy burdens, and I will give you rest.',
        difficulty: 'easy',
        themes: ['rest', 'jesus', 'comfort'],
        clue: 'An invitation from Jesus to the weary.'
    },
    {
        id: 'matthew-28-19',
        book: 'Matthew',
        bookId: 'matthew',
        reference: 'Matthew 28:19',
        text: 'Go therefore and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit,',
        difficulty: 'easy',
        themes: ['mission', 'discipleship', 'baptism'],
        clue: 'The Great Commission.'
    },
    {
        id: 'mark-10-27',
        book: 'Mark',
        bookId: 'mark',
        reference: 'Mark 10:27',
        text: 'Jesus looked at them and said, “For mortals it is impossible, but not for God; for God all things are possible.”',
        difficulty: 'easy',
        themes: ['faith', 'possibility', 'jesus'],
        clue: 'A Gospel saying about what is possible with God.'
    },
    {
        id: 'mark-1-17',
        book: 'Mark',
        bookId: 'mark',
        reference: 'Mark 1:17',
        text: 'And Jesus said to them, “Follow me and I will make you fish for people.”',
        difficulty: 'easy',
        themes: ['calling', 'discipleship', 'jesus'],
        clue: 'An early call of disciples in Mark.'
    },
    {
        id: 'mark-8-34',
        book: 'Mark',
        bookId: 'mark',
        reference: 'Mark 8:34',
        text: 'He called the crowd with his disciples, and said to them, “If any want to become my followers, let them deny themselves and take up their cross and follow me.”',
        difficulty: 'medium',
        themes: ['discipleship', 'cross', 'jesus'],
        clue: 'A Gospel call to discipleship and self-denial.'
    },
    {
        id: 'luke-1-37',
        book: 'Luke',
        bookId: 'luke',
        reference: 'Luke 1:37',
        text: 'For nothing will be impossible with God.',
        difficulty: 'easy',
        themes: ['faith', 'angelic-message', 'possibility'],
        clue: 'A short Gospel promise tied to the infancy narrative.'
    },
    {
        id: 'luke-2-14',
        book: 'Luke',
        bookId: 'luke',
        reference: 'Luke 2:14',
        text: '“Glory to God in the highest heaven, and on earth peace among those whom he favors!”',
        difficulty: 'easy',
        themes: ['nativity', 'peace', 'praise'],
        clue: 'The angelic song at Jesus’ birth.'
    },
    {
        id: 'luke-6-31',
        book: 'Luke',
        bookId: 'luke',
        reference: 'Luke 6:31',
        text: 'Do to others as you would have them do to you.',
        difficulty: 'easy',
        themes: ['ethics', 'love', 'jesus'],
        clue: 'Luke’s concise version of the golden rule.'
    },
    {
        id: 'luke-24-32',
        book: 'Luke',
        bookId: 'luke',
        reference: 'Luke 24:32',
        text: 'They said to each other, “Were not our hearts burning within us while he was talking to us on the road, while he was opening the scriptures to us?”',
        difficulty: 'medium',
        themes: ['resurrection', 'scripture', 'disciples'],
        clue: 'The Emmaus road recognition verse.'
    },
    {
        id: 'john-14-6',
        book: 'John',
        bookId: 'john',
        reference: 'John 14:6',
        text: 'Jesus said to him, “I am the way, and the truth, and the life. No one comes to the Father except through me.”',
        difficulty: 'easy',
        themes: ['jesus', 'identity', 'salvation'],
        clue: 'An “I am” saying from the Fourth Gospel.'
    },
    {
        id: 'john-3-16',
        book: 'John',
        bookId: 'john',
        reference: 'John 3:16',
        text: 'For God so loved the world that he gave his only Son, so that everyone who believes in him may not perish but may have eternal life.',
        difficulty: 'easy',
        themes: ['love', 'salvation', 'belief'],
        clue: 'One of the most quoted verses in the Bible.'
    },
    {
        id: 'john-8-12',
        book: 'John',
        bookId: 'john',
        reference: 'John 8:12',
        text: 'Again Jesus spoke to them, saying, “I am the light of the world. Whoever follows me will never walk in darkness but will have the light of life.”',
        difficulty: 'easy',
        themes: ['light', 'jesus', 'identity'],
        clue: 'Another “I am” saying in John.'
    },
    {
        id: 'john-11-25',
        book: 'John',
        bookId: 'john',
        reference: 'John 11:25',
        text: 'Jesus said to her, “I am the resurrection and the life. Those who believe in me, even though they die, will live,”',
        difficulty: 'medium',
        themes: ['resurrection', 'life', 'belief'],
        clue: 'An “I am” saying spoken to Martha.'
    },
    {
        id: 'acts-1-8',
        book: 'Acts',
        bookId: 'acts',
        reference: 'Acts 1:8',
        text: 'But you will receive power when the Holy Spirit has come upon you; and you will be my witnesses in Jerusalem, in all Judea and Samaria, and to the ends of the earth.',
        difficulty: 'easy',
        themes: ['holy-spirit', 'mission', 'witness'],
        clue: 'A programmatic verse for the early Church.'
    },
    {
        id: 'acts-2-21',
        book: 'Acts',
        bookId: 'acts',
        reference: 'Acts 2:21',
        text: 'Then everyone who calls on the name of the Lord shall be saved.',
        difficulty: 'medium',
        themes: ['salvation', 'preaching', 'lord'],
        clue: 'A line quoted in Peter’s Pentecost sermon.'
    },
    {
        id: 'acts-4-12',
        book: 'Acts',
        bookId: 'acts',
        reference: 'Acts 4:12',
        text: 'There is salvation in no one else, for there is no other name under heaven given among mortals by which we must be saved.',
        difficulty: 'medium',
        themes: ['salvation', 'jesus', 'preaching'],
        clue: 'A bold apostolic proclamation.'
    },
    {
        id: 'acts-17-28',
        book: 'Acts',
        bookId: 'acts',
        reference: 'Acts 17:28',
        text: 'For “In him we live and move and have our being”; as even some of your own poets have said, “For we too are his offspring.”',
        difficulty: 'hard',
        themes: ['creation', 'mission', 'paul'],
        clue: 'Paul speaks this in Athens.'
    },
    {
        id: 'romans-8-28',
        book: 'Romans',
        bookId: 'romans',
        reference: 'Romans 8:28',
        text: 'We know that all things work together for good for those who love God, who are called according to his purpose.',
        difficulty: 'easy',
        themes: ['providence', 'hope', 'calling'],
        clue: 'A famous Pauline line about God working for good.'
    },
    {
        id: 'romans-5-8',
        book: 'Romans',
        bookId: 'romans',
        reference: 'Romans 5:8',
        text: 'But God proves his love for us in that while we still were sinners Christ died for us.',
        difficulty: 'easy',
        themes: ['love', 'grace', 'christ'],
        clue: 'A clear summary of God’s love shown in Christ.'
    },
    {
        id: 'romans-12-2',
        book: 'Romans',
        bookId: 'romans',
        reference: 'Romans 12:2',
        text: 'Do not be conformed to this world, but be transformed by the renewing of your minds, so that you may discern what is the will of God—what is good and acceptable and perfect.',
        difficulty: 'medium',
        themes: ['transformation', 'discipleship', 'mind'],
        clue: 'A Pauline call to renewal of mind.'
    },
    {
        id: 'romans-12-12',
        book: 'Romans',
        bookId: 'romans',
        reference: 'Romans 12:12',
        text: 'Rejoice in hope, be patient in suffering, persevere in prayer.',
        difficulty: 'easy',
        themes: ['hope', 'prayer', 'perseverance'],
        clue: 'A compact set of Pauline exhortations.'
    },
    {
        id: '1-corinthians-13-13',
        book: '1 Corinthians',
        bookId: '1-corinthians',
        reference: '1 Corinthians 13:13',
        text: 'And now faith, hope, and love abide, these three; and the greatest of these is love.',
        difficulty: 'easy',
        themes: ['love', 'faith', 'hope'],
        clue: 'A famous line from the love chapter.'
    },
    {
        id: '1-corinthians-10-13',
        book: '1 Corinthians',
        bookId: '1-corinthians',
        reference: '1 Corinthians 10:13',
        text: 'No testing has overtaken you that is not common to everyone. God is faithful, and he will not let you be tested beyond your strength, but with the testing he will also provide the way out so that you may be able to endure it.',
        difficulty: 'medium',
        themes: ['testing', 'faithfulness', 'endurance'],
        clue: 'A Pauline encouragement about temptation and endurance.'
    },
    {
        id: '1-corinthians-6-19',
        book: '1 Corinthians',
        bookId: '1-corinthians',
        reference: '1 Corinthians 6:19',
        text: 'Or do you not know that your body is a temple of the Holy Spirit within you, which you have from God, and that you are not your own?',
        difficulty: 'medium',
        themes: ['holy-spirit', 'body', 'holiness'],
        clue: 'A Pauline reminder about the body and the Spirit.'
    },
    {
        id: '2-corinthians-5-7',
        book: '2 Corinthians',
        bookId: '2-corinthians',
        reference: '2 Corinthians 5:7',
        text: 'for we walk by faith, not by sight.',
        difficulty: 'easy',
        themes: ['faith', 'trust'],
        clue: 'A short Pauline contrast between faith and sight.'
    },
    {
        id: '2-corinthians-4-7',
        book: '2 Corinthians',
        bookId: '2-corinthians',
        reference: '2 Corinthians 4:7',
        text: 'But we have this treasure in clay jars, so that it may be made clear that this extraordinary power belongs to God and does not come from us.',
        difficulty: 'medium',
        themes: ['power', 'weakness', 'ministry'],
        clue: 'A Pauline image of treasure in fragile vessels.'
    },
    {
        id: '2-corinthians-12-9',
        book: '2 Corinthians',
        bookId: '2-corinthians',
        reference: '2 Corinthians 12:9',
        text: 'but he said to me, “My grace is sufficient for you, for power is made perfect in weakness.” So, I will boast all the more gladly of my weaknesses, so that the power of Christ may dwell in me.',
        difficulty: 'easy',
        themes: ['grace', 'weakness', 'power'],
        clue: 'A famous Pauline line about grace in weakness.'
    },
    {
        id: 'galatians-5-22-23',
        book: 'Galatians',
        bookId: 'galatians',
        reference: 'Galatians 5:22-23',
        text: 'By contrast, the fruit of the Spirit is love, joy, peace, patience, kindness, generosity, faithfulness, gentleness, and self-control. There is no law against such things.',
        difficulty: 'easy',
        themes: ['holy-spirit', 'virtue', 'fruit'],
        clue: 'A Pauline list of the fruit of the Spirit.'
    },
    {
        id: 'galatians-2-20',
        book: 'Galatians',
        bookId: 'galatians',
        reference: 'Galatians 2:20',
        text: 'and it is no longer I who live, but it is Christ who lives in me. And the life I now live in the flesh I live by faith in the Son of God, who loved me and gave himself for me.',
        difficulty: 'medium',
        themes: ['christ', 'faith', 'identity'],
        clue: 'A profound statement about union with Christ.'
    },
    {
        id: 'galatians-6-9',
        book: 'Galatians',
        bookId: 'galatians',
        reference: 'Galatians 6:9',
        text: 'So let us not grow weary in doing what is right, for we will reap at harvest time, if we do not give up.',
        difficulty: 'easy',
        themes: ['perseverance', 'doing-good', 'hope'],
        clue: 'A Pauline encouragement not to give up.'
    },
    {
        id: 'ephesians-2-8',
        book: 'Ephesians',
        bookId: 'ephesians',
        reference: 'Ephesians 2:8',
        text: 'For by grace you have been saved through faith, and this is not your own doing; it is the gift of God—',
        difficulty: 'easy',
        themes: ['grace', 'salvation', 'faith'],
        clue: 'A Pauline line about grace and faith.'
    },
    {
        id: 'ephesians-4-32',
        book: 'Ephesians',
        bookId: 'ephesians',
        reference: 'Ephesians 4:32',
        text: 'and be kind to one another, tenderhearted, forgiving one another, as God in Christ has forgiven you.',
        difficulty: 'easy',
        themes: ['forgiveness', 'kindness', 'community'],
        clue: 'A Pauline command about kindness and forgiveness.'
    },
    {
        id: 'ephesians-6-11',
        book: 'Ephesians',
        bookId: 'ephesians',
        reference: 'Ephesians 6:11',
        text: 'Put on the whole armor of God, so that you may be able to stand against the wiles of the devil.',
        difficulty: 'easy',
        themes: ['spiritual-warfare', 'strength', 'discipleship'],
        clue: 'A line from the armor of God passage.'
    },
    {
        id: 'philippians-4-13',
        book: 'Philippians',
        bookId: 'philippians',
        reference: 'Philippians 4:13',
        text: 'I can do all things through him who strengthens me.',
        difficulty: 'easy',
        themes: ['strength', 'perseverance', 'christ'],
        clue: 'A famous Pauline statement about strength.'
    },
    {
        id: 'philippians-4-6',
        book: 'Philippians',
        bookId: 'philippians',
        reference: 'Philippians 4:6',
        text: 'Do not worry about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.',
        difficulty: 'easy',
        themes: ['prayer', 'peace', 'anxiety'],
        clue: 'A Pauline exhortation about prayer instead of worry.'
    },
    {
        id: 'philippians-2-3',
        book: 'Philippians',
        bookId: 'philippians',
        reference: 'Philippians 2:3',
        text: 'Do nothing from selfish ambition or conceit, but in humility regard others as better than yourselves.',
        difficulty: 'medium',
        themes: ['humility', 'community', 'discipleship'],
        clue: 'A Pauline call to humility.'
    },
    {
        id: 'colossians-3-23',
        book: 'Colossians',
        bookId: 'colossians',
        reference: 'Colossians 3:23',
        text: 'Whatever your task, put yourselves into it, as done for the Lord and not for your masters,',
        difficulty: 'medium',
        themes: ['work', 'service', 'discipleship'],
        clue: 'A Pauline instruction about work and motive.'
    },
    {
        id: 'colossians-3-2',
        book: 'Colossians',
        bookId: 'colossians',
        reference: 'Colossians 3:2',
        text: 'Set your minds on things that are above, not on things that are on earth,',
        difficulty: 'easy',
        themes: ['mind', 'heaven', 'discipleship'],
        clue: 'A Pauline instruction about where to set your mind.'
    },
    {
        id: 'colossians-3-12',
        book: 'Colossians',
        bookId: 'colossians',
        reference: 'Colossians 3:12',
        text: 'As God’s chosen ones, holy and beloved, clothe yourselves with compassion, kindness, humility, meekness, and patience.',
        difficulty: 'medium',
        themes: ['virtue', 'identity', 'community'],
        clue: 'A Pauline exhortation using clothing imagery.'
    },
    {
        id: '1-thessalonians-5-16-18',
        book: '1 Thessalonians',
        bookId: '1-thessalonians',
        reference: '1 Thessalonians 5:16-18',
        text: 'Rejoice always, pray without ceasing, give thanks in all circumstances; for this is the will of God in Christ Jesus for you.',
        difficulty: 'easy',
        themes: ['prayer', 'joy', 'gratitude'],
        clue: 'A Pauline trio of short exhortations.'
    },
    {
        id: '1-thessalonians-4-3',
        book: '1 Thessalonians',
        bookId: '1-thessalonians',
        reference: '1 Thessalonians 4:3',
        text: 'For this is the will of God, your sanctification: that you abstain from fornication;',
        difficulty: 'hard',
        themes: ['holiness', 'sanctification', 'ethics'],
        clue: 'A Pauline statement about the will of God.'
    },
    {
        id: '1-thessalonians-5-11',
        book: '1 Thessalonians',
        bookId: '1-thessalonians',
        reference: '1 Thessalonians 5:11',
        text: 'Therefore encourage one another and build up each other, as indeed you are doing.',
        difficulty: 'easy',
        themes: ['encouragement', 'community', 'pastoral'],
        clue: 'A short call to mutual encouragement.'
    },
    {
        id: '2-thessalonians-3-3',
        book: '2 Thessalonians',
        bookId: '2-thessalonians',
        reference: '2 Thessalonians 3:3',
        text: 'But the Lord is faithful; he will strengthen you and guard you from the evil one.',
        difficulty: 'medium',
        themes: ['faithfulness', 'protection', 'encouragement'],
        clue: 'A Pauline reassurance about the Lord’s faithfulness.'
    },
    {
        id: '2-thessalonians-2-16-17',
        book: '2 Thessalonians',
        bookId: '2-thessalonians',
        reference: '2 Thessalonians 2:16-17',
        text: 'Now may our Lord Jesus Christ himself and God our Father, who loved us and through grace gave us eternal comfort and good hope, comfort your hearts and strengthen them in every good work and word.',
        difficulty: 'medium',
        themes: ['comfort', 'hope', 'strength'],
        clue: 'A Pauline prayer for comfort and strength.'
    },
    {
        id: '2-thessalonians-3-16',
        book: '2 Thessalonians',
        bookId: '2-thessalonians',
        reference: '2 Thessalonians 3:16',
        text: 'Now may the Lord of peace himself give you peace at all times in all ways. The Lord be with all of you.',
        difficulty: 'medium',
        themes: ['peace', 'prayer', 'blessing'],
        clue: 'A closing blessing in 2 Thessalonians.'
    },
    {
        id: '1-timothy-4-12',
        book: '1 Timothy',
        bookId: '1-timothy',
        reference: '1 Timothy 4:12',
        text: 'Let no one despise your youth, but set the believers an example in speech and conduct, in love, in faith, in purity.',
        difficulty: 'easy',
        themes: ['example', 'youth', 'leadership'],
        clue: 'A pastoral encouragement to a younger leader.'
    },
    {
        id: '1-timothy-6-10',
        book: '1 Timothy',
        bookId: '1-timothy',
        reference: '1 Timothy 6:10',
        text: 'For the love of money is a root of all kinds of evil, and in their eagerness to be rich some have wandered away from the faith and pierced themselves with many pains.',
        difficulty: 'medium',
        themes: ['money', 'warning', 'faith'],
        clue: 'A pastoral warning involving money.'
    },
    {
        id: '1-timothy-2-5',
        book: '1 Timothy',
        bookId: '1-timothy',
        reference: '1 Timothy 2:5',
        text: 'For there is one God; there is also one mediator between God and humankind, Christ Jesus, himself human,',
        difficulty: 'medium',
        themes: ['christ', 'mediation', 'salvation'],
        clue: 'A pastoral line about one mediator.'
    },
    {
        id: '2-timothy-1-7',
        book: '2 Timothy',
        bookId: '2-timothy',
        reference: '2 Timothy 1:7',
        text: 'for God did not give us a spirit of cowardice, but rather a spirit of power and of love and of self-discipline.',
        difficulty: 'easy',
        themes: ['courage', 'power', 'self-discipline'],
        clue: 'A pastoral line about power, love, and discipline.'
    },
    {
        id: '2-timothy-3-16',
        book: '2 Timothy',
        bookId: '2-timothy',
        reference: '2 Timothy 3:16',
        text: 'All scripture is inspired by God and is useful for teaching, for reproof, for correction, and for training in righteousness,',
        difficulty: 'easy',
        themes: ['scripture', 'teaching', 'righteousness'],
        clue: 'A key pastoral verse about Scripture.'
    },
    {
        id: '2-timothy-4-7',
        book: '2 Timothy',
        bookId: '2-timothy',
        reference: '2 Timothy 4:7',
        text: 'I have fought the good fight, I have finished the race, I have kept the faith.',
        difficulty: 'easy',
        themes: ['perseverance', 'faith', 'endurance'],
        clue: 'A famous closing reflection from Paul.'
    },
    {
        id: 'titus-2-11',
        book: 'Titus',
        bookId: 'titus',
        reference: 'Titus 2:11',
        text: 'For the grace of God has appeared, bringing salvation to all,',
        difficulty: 'medium',
        themes: ['grace', 'salvation'],
        clue: 'A short pastoral line about grace appearing.'
    },
    {
        id: 'titus-3-5',
        book: 'Titus',
        bookId: 'titus',
        reference: 'Titus 3:5',
        text: 'he saved us, not because of any works of righteousness that we had done, but according to his mercy, through the water of rebirth and renewal by the Holy Spirit.',
        difficulty: 'medium',
        themes: ['salvation', 'mercy', 'holy-spirit'],
        clue: 'A pastoral statement about salvation and renewal.'
    },
    {
        id: 'titus-2-7',
        book: 'Titus',
        bookId: 'titus',
        reference: 'Titus 2:7',
        text: 'Show yourself in all respects a model of good works, and in your teaching show integrity, gravity,',
        difficulty: 'hard',
        themes: ['example', 'teaching', 'leadership'],
        clue: 'A pastoral instruction about modeling good works.'
    },
    {
        id: 'philemon-1-6',
        book: 'Philemon',
        bookId: 'philemon',
        reference: 'Philemon 1:6',
        text: 'I pray that the sharing of your faith may become effective when you perceive all the good that we may do for Christ.',
        difficulty: 'hard',
        themes: ['faith', 'fellowship', 'prayer'],
        clue: 'A short personal letter from Paul.'
    },
    {
        id: 'philemon-1-7',
        book: 'Philemon',
        bookId: 'philemon',
        reference: 'Philemon 1:7',
        text: 'I have indeed received much joy and encouragement from your love, because the hearts of the saints have been refreshed through you, my brother.',
        difficulty: 'hard',
        themes: ['love', 'encouragement', 'community'],
        clue: 'A personal commendation in Philemon.'
    },
    {
        id: 'philemon-1-16',
        book: 'Philemon',
        bookId: 'philemon',
        reference: 'Philemon 1:16',
        text: 'no longer as a slave but more than a slave, a beloved brother—especially to me but how much more to you, both in the flesh and in the Lord.',
        difficulty: 'hard',
        themes: ['brotherhood', 'reconciliation', 'community'],
        clue: 'A key appeal in Paul’s short letter to Philemon.'
    },
    {
        id: 'hebrews-11-1',
        book: 'Hebrews',
        bookId: 'hebrews',
        reference: 'Hebrews 11:1',
        text: 'Now faith is the assurance of things hoped for, the conviction of things not seen.',
        difficulty: 'easy',
        themes: ['faith', 'hope'],
        clue: 'A classic definition of faith.'
    },
    {
        id: 'hebrews-4-12',
        book: 'Hebrews',
        bookId: 'hebrews',
        reference: 'Hebrews 4:12',
        text: 'Indeed, the word of God is living and active, sharper than any two-edged sword, piercing until it divides soul from spirit, joints from marrow; it is able to judge the thoughts and intentions of the heart.',
        difficulty: 'medium',
        themes: ['scripture', 'discernment', 'truth'],
        clue: 'A classic line about the power of God’s word.'
    },
    {
        id: 'hebrews-10-24',
        book: 'Hebrews',
        bookId: 'hebrews',
        reference: 'Hebrews 10:24',
        text: 'And let us consider how to provoke one another to love and good deeds,',
        difficulty: 'easy',
        themes: ['community', 'love', 'encouragement'],
        clue: 'A call to stir one another toward good works.'
    },
    {
        id: 'hebrews-12-1',
        book: 'Hebrews',
        bookId: 'hebrews',
        reference: 'Hebrews 12:1',
        text: 'Therefore, since we are surrounded by so great a cloud of witnesses, let us also lay aside every weight and the sin that clings so closely, and let us run with perseverance the race that is set before us,',
        difficulty: 'medium',
        themes: ['perseverance', 'faith', 'endurance'],
        clue: 'A famous call to run with perseverance.'
    },
    {
        id: 'james-1-5',
        book: 'James',
        bookId: 'james',
        reference: 'James 1:5',
        text: 'If any of you is lacking in wisdom, ask God, who gives to all generously and ungrudgingly, and it will be given you.',
        difficulty: 'easy',
        themes: ['wisdom', 'prayer'],
        clue: 'A general letter encouraging prayer for wisdom.'
    },
    {
        id: 'james-1-22',
        book: 'James',
        bookId: 'james',
        reference: 'James 1:22',
        text: 'But be doers of the word, and not merely hearers who deceive themselves.',
        difficulty: 'easy',
        themes: ['obedience', 'word', 'action'],
        clue: 'A practical instruction about hearing and doing.'
    },
    {
        id: 'james-4-7',
        book: 'James',
        bookId: 'james',
        reference: 'James 4:7',
        text: 'Submit yourselves therefore to God. Resist the devil, and he will flee from you.',
        difficulty: 'medium',
        themes: ['resistance', 'obedience', 'spiritual-warfare'],
        clue: 'A compact exhortation about submission and resistance.'
    },
    {
        id: '1-peter-5-7',
        book: '1 Peter',
        bookId: '1-peter',
        reference: '1 Peter 5:7',
        text: 'Cast all your anxiety on him, because he cares for you.',
        difficulty: 'easy',
        themes: ['care', 'anxiety', 'trust'],
        clue: 'A general letter about bringing your cares to God.'
    },
    {
        id: '1-peter-1-3',
        book: '1 Peter',
        bookId: '1-peter',
        reference: '1 Peter 1:3',
        text: 'Blessed be the God and Father of our Lord Jesus Christ! By his great mercy he has given us a new birth into a living hope through the resurrection of Jesus Christ from the dead,',
        difficulty: 'medium',
        themes: ['hope', 'resurrection', 'mercy'],
        clue: 'An opening line about new birth and living hope.'
    },
    {
        id: '1-peter-2-9',
        book: '1 Peter',
        bookId: '1-peter',
        reference: '1 Peter 2:9',
        text: 'But you are a chosen race, a royal priesthood, a holy nation, God’s own people, in order that you may proclaim the mighty acts of him who called you out of darkness into his marvelous light.',
        difficulty: 'medium',
        themes: ['identity', 'light', 'calling'],
        clue: 'A powerful identity verse for God’s people.'
    },
    {
        id: '2-peter-3-9',
        book: '2 Peter',
        bookId: '2-peter',
        reference: '2 Peter 3:9',
        text: 'The Lord is not slow about his promise, as some think of slowness, but is patient with you, not wanting any to perish but all to come to repentance.',
        difficulty: 'medium',
        themes: ['patience', 'promise', 'repentance'],
        clue: 'A general letter about the Lord’s patience.'
    },
    {
        id: '2-peter-1-5',
        book: '2 Peter',
        bookId: '2-peter',
        reference: '2 Peter 1:5',
        text: 'For this very reason, you must make every effort to support your faith with goodness, and goodness with knowledge,',
        difficulty: 'medium',
        themes: ['virtue', 'growth', 'faith'],
        clue: 'A short verse about building up Christian character.'
    },
    {
        id: '1-john-4-19',
        book: '1 John',
        bookId: '1-john',
        reference: '1 John 4:19',
        text: 'We love because he first loved us.',
        difficulty: 'easy',
        themes: ['love', 'identity'],
        clue: 'A very short and memorable line about love.'
    },
    {
        id: '1-john-1-9',
        book: '1 John',
        bookId: '1-john',
        reference: '1 John 1:9',
        text: 'If we confess our sins, he who is faithful and just will forgive us our sins and cleanse us from all unrighteousness.',
        difficulty: 'easy',
        themes: ['confession', 'forgiveness', 'cleansing'],
        clue: 'A simple promise about confession and forgiveness.'
    },
    {
        id: '1-john-3-18',
        book: '1 John',
        bookId: '1-john',
        reference: '1 John 3:18',
        text: 'Little children, let us love, not in word or speech, but in truth and action.',
        difficulty: 'easy',
        themes: ['love', 'truth', 'action'],
        clue: 'A practical instruction about love in action.'
    },
    {
        id: '2-john-1-6',
        book: '2 John',
        bookId: '2-john',
        reference: '2 John 1:6',
        text: 'And this is love, that we walk according to his commandments; this is the commandment just as you have heard it from the beginning—you must walk in it.',
        difficulty: 'hard',
        themes: ['love', 'obedience', 'truth'],
        clue: 'A very short letter connecting love and obedience.'
    },
    {
        id: '2-john-1-8',
        book: '2 John',
        bookId: '2-john',
        reference: '2 John 1:8',
        text: 'Be on your guard, so that you do not lose what we have worked for, but may receive a full reward.',
        difficulty: 'hard',
        themes: ['watchfulness', 'reward', 'truth'],
        clue: 'A warning in a very short letter.'
    },
    {
        id: '3-john-1-4',
        book: '3 John',
        bookId: '3-john',
        reference: '3 John 1:4',
        text: 'I have no greater joy than this, to hear that my children are walking in the truth.',
        difficulty: 'hard',
        themes: ['truth', 'joy', 'pastoral-care'],
        clue: 'A very short letter about joy in the truth.'
    },
    {
        id: '3-john-1-11',
        book: '3 John',
        bookId: '3-john',
        reference: '3 John 1:11',
        text: 'Beloved, do not imitate what is evil but imitate what is good. Whoever does good is from God; whoever does evil has not seen God.',
        difficulty: 'hard',
        themes: ['goodness', 'example', 'truth'],
        clue: 'A short instruction about following good examples.'
    },
    {
        id: 'jude-1-24',
        book: 'Jude',
        bookId: 'jude',
        reference: 'Jude 1:24',
        text: 'Now to him who is able to keep you from falling, and to make you stand without blemish in the presence of his glory with rejoicing,',
        difficulty: 'medium',
        themes: ['doxology', 'perseverance', 'glory'],
        clue: 'A closing doxology from a short general letter.'
    },
    {
        id: 'jude-1-21',
        book: 'Jude',
        bookId: 'jude',
        reference: 'Jude 1:21',
        text: 'keep yourselves in the love of God; look forward to the mercy of our Lord Jesus Christ that leads to eternal life.',
        difficulty: 'medium',
        themes: ['love', 'mercy', 'hope'],
        clue: 'A practical exhortation near the end of Jude.'
    },
    {
        id: 'revelation-21-4',
        book: 'Revelation',
        bookId: 'revelation',
        reference: 'Revelation 21:4',
        text: 'he will wipe every tear from their eyes. Death will be no more; mourning and crying and pain will be no more, for the first things have passed away.',
        difficulty: 'easy',
        themes: ['hope', 'new-creation', 'comfort'],
        clue: 'An apocalyptic promise of renewal.'
    },
    {
        id: 'revelation-1-8',
        book: 'Revelation',
        bookId: 'revelation',
        reference: 'Revelation 1:8',
        text: 'I am the Alpha and the Omega, says the Lord God, who is and who was and who is to come, the Almighty.',
        difficulty: 'easy',
        themes: ['god', 'eternity', 'revelation'],
        clue: 'A majestic opening declaration in Revelation.'
    },
    {
        id: 'revelation-3-20',
        book: 'Revelation',
        bookId: 'revelation',
        reference: 'Revelation 3:20',
        text: 'Listen! I am standing at the door, knocking; if you hear my voice and open the door, I will come in to you and eat with you, and you with me.',
        difficulty: 'medium',
        themes: ['invitation', 'communion', 'jesus'],
        clue: 'A famous invitation in a message to the church.'
    },
    {
        id: 'revelation-22-13',
        book: 'Revelation',
        bookId: 'revelation',
        reference: 'Revelation 22:13',
        text: 'I am the Alpha and the Omega, the first and the last, the beginning and the end.',
        difficulty: 'easy',
        themes: ['god', 'eternity', 'completion'],
        clue: 'A closing declaration of God’s sovereignty.'
    }
];

export const verses = VERSES_BASE.map((verse, index) => ({
    ...verse,
    order: index + 1
}));
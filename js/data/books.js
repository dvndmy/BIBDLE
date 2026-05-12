const BOOKS_BASE = [
    {
        id: 'genesis',
        name: 'Genesis',
        testament: 'Old',
        section: 'Pentateuch',
        sectionKey: 'pentateuch',
        bookIntroTitle: 'Beginnings and Promise',
        bookIntroText: 'Genesis tells of creation, the fall, the flood, and the first covenant family, tracing God’s promises through Abraham, Isaac, Jacob, and Joseph.',
        bookThemes: ['creation', 'covenant', 'promise', 'beginnings', 'patriarchs']
    },
    {
        id: 'exodus',
        name: 'Exodus',
        testament: 'Old',
        section: 'Pentateuch',
        sectionKey: 'pentateuch',
        bookIntroTitle: 'Rescue and Covenant',
        bookIntroText: 'Exodus recounts God’s deliverance of Israel from Egypt, the giving of the law at Sinai, and God’s presence among his people.',
        bookThemes: ['deliverance', 'covenant', 'law', 'worship', 'presence']
    },
    {
        id: 'leviticus',
        name: 'Leviticus',
        testament: 'Old',
        section: 'Pentateuch',
        sectionKey: 'pentateuch',
        bookIntroTitle: 'Holiness and Worship',
        bookIntroText: 'Leviticus teaches Israel how to live as a holy people through sacrifice, priesthood, purity, and covenant obedience.',
        bookThemes: ['holiness', 'worship', 'sacrifice', 'priesthood', 'purity']
    },
    {
        id: 'numbers',
        name: 'Numbers',
        testament: 'Old',
        section: 'Pentateuch',
        sectionKey: 'pentateuch',
        bookIntroTitle: 'Wilderness and Trust',
        bookIntroText: 'Numbers follows Israel in the wilderness, showing both rebellion and God’s faithfulness as a new generation prepares to enter the land.',
        bookThemes: ['wilderness', 'trust', 'rebellion', 'faithfulness', 'journey']
    },
    {
        id: 'deuteronomy',
        name: 'Deuteronomy',
        testament: 'Old',
        section: 'Pentateuch',
        sectionKey: 'pentateuch',
        bookIntroTitle: 'Remember and Obey',
        bookIntroText: 'Deuteronomy is Moses’ farewell call to remember God’s covenant, love the Lord wholeheartedly, and live faithfully in the promised land.',
        bookThemes: ['covenant', 'obedience', 'memory', 'law', 'love-of-god']
    },

    {
        id: 'joshua',
        name: 'Joshua',
        testament: 'Old',
        section: 'Historical Books',
        sectionKey: 'historical-books',
        bookIntroTitle: 'Entering the Land',
        bookIntroText: 'Joshua tells of Israel’s entry into the promised land and stresses courage, leadership, and fidelity to God’s covenant.',
        bookThemes: ['promise', 'land', 'courage', 'conquest', 'faithfulness']
    },
    {
        id: 'judges',
        name: 'Judges',
        testament: 'Old',
        section: 'Historical Books',
        sectionKey: 'historical-books',
        bookIntroTitle: 'Cycles of Decline',
        bookIntroText: 'Judges shows repeated cycles of sin, oppression, rescue, and relapse, revealing Israel’s need for faithful leadership.',
        bookThemes: ['rebellion', 'deliverance', 'leadership', 'cycle-of-sin', 'mercy']
    },
    {
        id: 'ruth',
        name: 'Ruth',
        testament: 'Old',
        section: 'Historical Books',
        sectionKey: 'historical-books',
        bookIntroTitle: 'Loyalty and Providence',
        bookIntroText: 'Ruth is a quiet story of loyalty, kindness, and God’s hidden providence that leads into the line of David.',
        bookThemes: ['loyalty', 'kindness', 'providence', 'family', 'redemption']
    },
    {
        id: '1-samuel',
        name: '1 Samuel',
        testament: 'Old',
        section: 'Historical Books',
        sectionKey: 'historical-books',
        bookIntroTitle: 'From Judges to Kings',
        bookIntroText: '1 Samuel traces Israel’s transition to monarchy through Samuel, Saul, and the rise of David.',
        bookThemes: ['kingship', 'calling', 'obedience', 'leadership', 'anointing']
    },
    {
        id: '2-samuel',
        name: '2 Samuel',
        testament: 'Old',
        section: 'Historical Books',
        sectionKey: 'historical-books',
        bookIntroTitle: 'David’s Reign',
        bookIntroText: '2 Samuel centers on David’s kingship, his covenant with God, and the blessings and consequences within his house.',
        bookThemes: ['david', 'covenant', 'kingship', 'sin-and-consequence', 'mercy']
    },
    {
        id: '1-kings',
        name: '1 Kings',
        testament: 'Old',
        section: 'Historical Books',
        sectionKey: 'historical-books',
        bookIntroTitle: 'Temple and Division',
        bookIntroText: '1 Kings begins with Solomon’s wisdom and temple, then records the kingdom’s division and growing unfaithfulness.',
        bookThemes: ['wisdom', 'temple', 'kingship', 'division', 'idolatry']
    },
    {
        id: '2-kings',
        name: '2 Kings',
        testament: 'Old',
        section: 'Historical Books',
        sectionKey: 'historical-books',
        bookIntroTitle: 'Fall and Exile',
        bookIntroText: '2 Kings tells of prophetic warnings, failed rulers, and the eventual fall of Israel and Judah into exile.',
        bookThemes: ['exile', 'judgment', 'prophets', 'idolatry', 'covenant-unfaithfulness']
    },
    {
        id: '1-chronicles',
        name: '1 Chronicles',
        testament: 'Old',
        section: 'Historical Books',
        sectionKey: 'historical-books',
        bookIntroTitle: 'David Remembered',
        bookIntroText: '1 Chronicles retells Israel’s story with a focus on David, worship, genealogy, and the hope of a faithful kingdom.',
        bookThemes: ['david', 'worship', 'genealogy', 'temple', 'hope']
    },
    {
        id: '2-chronicles',
        name: '2 Chronicles',
        testament: 'Old',
        section: 'Historical Books',
        sectionKey: 'historical-books',
        bookIntroTitle: 'Temple and Reform',
        bookIntroText: '2 Chronicles highlights the temple, reforming kings, and the spiritual reasons behind Judah’s fall and return.',
        bookThemes: ['temple', 'reform', 'worship', 'judgment', 'restoration']
    },
    {
        id: 'ezra',
        name: 'Ezra',
        testament: 'Old',
        section: 'Historical Books',
        sectionKey: 'historical-books',
        bookIntroTitle: 'Return and Renewal',
        bookIntroText: 'Ezra recounts the return from exile, the rebuilding of the temple, and a renewed commitment to God’s law.',
        bookThemes: ['return', 'temple', 'law', 'renewal', 'restoration']
    },
    {
        id: 'nehemiah',
        name: 'Nehemiah',
        testament: 'Old',
        section: 'Historical Books',
        sectionKey: 'historical-books',
        bookIntroTitle: 'Rebuild and Reform',
        bookIntroText: 'Nehemiah tells of Jerusalem’s walls being rebuilt and the community being spiritually renewed under strong leadership.',
        bookThemes: ['rebuilding', 'leadership', 'prayer', 'community', 'renewal']
    },
    {
        id: 'tobit',
        name: 'Tobit',
        testament: 'Old',
        section: 'Historical Books',
        sectionKey: 'historical-books',
        bookIntroTitle: 'Faithfulness in Exile',
        bookIntroText: 'Tobit is a story of family, prayer, almsgiving, and God’s providential care during hardship.',
        bookThemes: ['providence', 'family', 'prayer', 'almsgiving', 'faithfulness']
    },
    {
        id: 'judith',
        name: 'Judith',
        testament: 'Old',
        section: 'Historical Books',
        sectionKey: 'historical-books',
        bookIntroTitle: 'Courage and Deliverance',
        bookIntroText: 'Judith tells how courage, prayer, and trust in God bring deliverance to God’s people.',
        bookThemes: ['courage', 'deliverance', 'faith', 'prayer', 'victory']
    },
    {
        id: 'esther',
        name: 'Esther',
        testament: 'Old',
        section: 'Historical Books',
        sectionKey: 'historical-books',
        bookIntroTitle: 'Courage at Court',
        bookIntroText: 'Esther shows how bravery and timely action preserve the people of God in a moment of danger.',
        bookThemes: ['providence', 'courage', 'deliverance', 'identity', 'reversal']
    },
    {
        id: '1-maccabees',
        name: '1 Maccabees',
        testament: 'Old',
        section: 'Historical Books',
        sectionKey: 'historical-books',
        bookIntroTitle: 'Resistance and Freedom',
        bookIntroText: '1 Maccabees tells of faithful resistance, political struggle, and the defense of Jewish worship and identity.',
        bookThemes: ['faithfulness', 'resistance', 'worship', 'identity', 'freedom']
    },
    {
        id: '2-maccabees',
        name: '2 Maccabees',
        testament: 'Old',
        section: 'Historical Books',
        sectionKey: 'historical-books',
        bookIntroTitle: 'Martyrdom and Hope',
        bookIntroText: '2 Maccabees emphasizes courage under persecution, God’s justice, and hope beyond death.',
        bookThemes: ['martyrdom', 'resurrection', 'justice', 'courage', 'faithfulness']
    },

    {
        id: 'job',
        name: 'Job',
        testament: 'Old',
        section: 'Wisdom Books',
        sectionKey: 'wisdom-books',
        bookIntroTitle: 'Suffering and Faith',
        bookIntroText: 'Job wrestles with suffering, innocence, and the mystery of God’s wisdom, refusing easy answers.',
        bookThemes: ['suffering', 'faith', 'wisdom', 'perseverance', 'mystery']
    },
    {
        id: 'psalms',
        name: 'Psalms',
        testament: 'Old',
        section: 'Wisdom Books',
        sectionKey: 'wisdom-books',
        bookIntroTitle: 'Prayer in Every Season',
        bookIntroText: 'Psalms gathers songs and prayers of praise, lament, trust, thanksgiving, and worship for every season of life.',
        bookThemes: ['prayer', 'worship', 'praise', 'lament', 'trust']
    },
    {
        id: 'proverbs',
        name: 'Proverbs',
        testament: 'Old',
        section: 'Wisdom Books',
        sectionKey: 'wisdom-books',
        bookIntroTitle: 'Wisdom for Daily Life',
        bookIntroText: 'Proverbs offers practical wisdom about speech, work, relationships, and the fear of the Lord.',
        bookThemes: ['wisdom', 'instruction', 'character', 'speech', 'fear-of-the-lord']
    },
    {
        id: 'ecclesiastes',
        name: 'Ecclesiastes',
        testament: 'Old',
        section: 'Wisdom Books',
        sectionKey: 'wisdom-books',
        bookIntroTitle: 'Meaning and Mortality',
        bookIntroText: 'Ecclesiastes reflects on time, mortality, and the limits of human striving, urging reverence before God.',
        bookThemes: ['meaning', 'time', 'mortality', 'wisdom', 'reverence']
    },
    {
        id: 'song-of-solomon',
        name: 'Song of Solomon',
        testament: 'Old',
        section: 'Wisdom Books',
        sectionKey: 'wisdom-books',
        bookIntroTitle: 'Love in Poetry',
        bookIntroText: 'Song of Solomon is a lyrical celebration of love, beauty, longing, and delight.',
        bookThemes: ['love', 'beauty', 'poetry', 'desire', 'joy']
    },
    {
        id: 'wisdom',
        name: 'Wisdom',
        testament: 'Old',
        section: 'Wisdom Books',
        sectionKey: 'wisdom-books',
        bookIntroTitle: 'Wisdom and Righteousness',
        bookIntroText: 'Wisdom reflects on righteousness, immortality, and the beauty of divine wisdom at work in the world.',
        bookThemes: ['wisdom', 'righteousness', 'immortality', 'justice', 'divine-order']
    },
    {
        id: 'sirach',
        name: 'Sirach',
        testament: 'Old',
        section: 'Wisdom Books',
        sectionKey: 'wisdom-books',
        bookIntroTitle: 'Practical Wisdom',
        bookIntroText: 'Sirach gives grounded instruction about friendship, speech, humility, family, and faithful living.',
        bookThemes: ['wisdom', 'discipline', 'friendship', 'humility', 'daily-life']
    },

    {
        id: 'isaiah',
        name: 'Isaiah',
        testament: 'Old',
        section: 'Major Prophets',
        sectionKey: 'major-prophets',
        bookIntroTitle: 'Judgment and Hope',
        bookIntroText: 'Isaiah speaks of holiness, judgment, comfort, and future hope, including famous promises about the coming Messiah.',
        bookThemes: ['holiness', 'judgment', 'hope', 'messiah', 'restoration']
    },
    {
        id: 'jeremiah',
        name: 'Jeremiah',
        testament: 'Old',
        section: 'Major Prophets',
        sectionKey: 'major-prophets',
        bookIntroTitle: 'Warning and Weeping',
        bookIntroText: 'Jeremiah calls Judah to repentance, laments coming judgment, and points toward a new covenant.',
        bookThemes: ['repentance', 'judgment', 'lament', 'covenant', 'hope']
    },
    {
        id: 'lamentations',
        name: 'Lamentations',
        testament: 'Old',
        section: 'Major Prophets',
        sectionKey: 'major-prophets',
        bookIntroTitle: 'Grief and Hope',
        bookIntroText: 'Lamentations mourns Jerusalem’s fall with poetic sorrow, yet still reaches for God’s mercy and faithfulness.',
        bookThemes: ['lament', 'judgment', 'grief', 'mercy', 'hope']
    },
    {
        id: 'baruch',
        name: 'Baruch',
        testament: 'Old',
        section: 'Major Prophets',
        sectionKey: 'major-prophets',
        bookIntroTitle: 'Exile and Return',
        bookIntroText: 'Baruch blends confession, wisdom, and hope, calling God’s people to return to him and trust in restoration.',
        bookThemes: ['repentance', 'wisdom', 'exile', 'hope', 'return']
    },
    {
        id: 'ezekiel',
        name: 'Ezekiel',
        testament: 'Old',
        section: 'Major Prophets',
        sectionKey: 'major-prophets',
        bookIntroTitle: 'Visions and Renewal',
        bookIntroText: 'Ezekiel uses vivid visions to announce judgment, divine glory, and the promise of a new heart and restored people.',
        bookThemes: ['glory', 'judgment', 'renewal', 'vision', 'restoration']
    },
    {
        id: 'daniel',
        name: 'Daniel',
        testament: 'Old',
        section: 'Major Prophets',
        sectionKey: 'major-prophets',
        bookIntroTitle: 'Faithful Under Pressure',
        bookIntroText: 'Daniel combines court stories and apocalyptic visions to show that God rules over kingdoms and honors faithful endurance.',
        bookThemes: ['faithfulness', 'kingdom', 'vision', 'deliverance', 'endurance']
    },

    {
        id: 'hosea',
        name: 'Hosea',
        testament: 'Old',
        section: 'Minor Prophets',
        sectionKey: 'minor-prophets',
        bookIntroTitle: 'Love That Pursues',
        bookIntroText: 'Hosea portrays God’s wounded yet faithful love, calling an unfaithful people back to covenant loyalty.',
        bookThemes: ['covenant-love', 'repentance', 'mercy', 'unfaithfulness', 'restoration']
    },
    {
        id: 'joel',
        name: 'Joel',
        testament: 'Old',
        section: 'Minor Prophets',
        sectionKey: 'minor-prophets',
        bookIntroTitle: 'Repent and Hope',
        bookIntroText: 'Joel moves from disaster to hope, calling for heartfelt repentance and promising the outpouring of God’s Spirit.',
        bookThemes: ['repentance', 'spirit', 'day-of-the-lord', 'restoration', 'hope']
    },
    {
        id: 'amos',
        name: 'Amos',
        testament: 'Old',
        section: 'Minor Prophets',
        sectionKey: 'minor-prophets',
        bookIntroTitle: 'Justice Like a River',
        bookIntroText: 'Amos denounces injustice, empty worship, and complacency, insisting that righteousness must shape communal life.',
        bookThemes: ['justice', 'righteousness', 'judgment', 'true-worship', 'prophecy']
    },
    {
        id: 'obadiah',
        name: 'Obadiah',
        testament: 'Old',
        section: 'Minor Prophets',
        sectionKey: 'minor-prophets',
        bookIntroTitle: 'Pride Brought Low',
        bookIntroText: 'Obadiah is a short prophecy against pride and violence, ending with the Lord’s kingdom prevailing.',
        bookThemes: ['judgment', 'pride', 'justice', 'kingdom', 'reversal']
    },
    {
        id: 'jonah',
        name: 'Jonah',
        testament: 'Old',
        section: 'Minor Prophets',
        sectionKey: 'minor-prophets',
        bookIntroTitle: 'Mercy Beyond Borders',
        bookIntroText: 'Jonah tells a surprising story of resistance, repentance, and God’s compassion for outsiders.',
        bookThemes: ['mercy', 'repentance', 'mission', 'compassion', 'obedience']
    },
    {
        id: 'micah',
        name: 'Micah',
        testament: 'Old',
        section: 'Minor Prophets',
        sectionKey: 'minor-prophets',
        bookIntroTitle: 'Justice, Mercy, Humility',
        bookIntroText: 'Micah confronts corruption and false security while calling God’s people to justice, kindness, and humble faithfulness.',
        bookThemes: ['justice', 'humility', 'judgment', 'hope', 'messiah']
    },
    {
        id: 'nahum',
        name: 'Nahum',
        testament: 'Old',
        section: 'Minor Prophets',
        sectionKey: 'minor-prophets',
        bookIntroTitle: 'Judgment on Oppression',
        bookIntroText: 'Nahum announces God’s judgment on Nineveh and offers comfort to those crushed by violence.',
        bookThemes: ['judgment', 'justice', 'deliverance', 'power-of-god', 'comfort']
    },
    {
        id: 'habakkuk',
        name: 'Habakkuk',
        testament: 'Old',
        section: 'Minor Prophets',
        sectionKey: 'minor-prophets',
        bookIntroTitle: 'Questions and Trust',
        bookIntroText: 'Habakkuk openly questions God about evil and learns to live by faith even before answers are complete.',
        bookThemes: ['faith', 'justice', 'questioning', 'trust', 'hope']
    },
    {
        id: 'zephaniah',
        name: 'Zephaniah',
        testament: 'Old',
        section: 'Minor Prophets',
        sectionKey: 'minor-prophets',
        bookIntroTitle: 'Judgment and Joy',
        bookIntroText: 'Zephaniah warns of judgment but ends with joy, renewal, and God rejoicing over his people.',
        bookThemes: ['judgment', 'remnant', 'joy', 'restoration', 'presence']
    },
    {
        id: 'haggai',
        name: 'Haggai',
        testament: 'Old',
        section: 'Minor Prophets',
        sectionKey: 'minor-prophets',
        bookIntroTitle: 'Rebuild What Matters',
        bookIntroText: 'Haggai urges the returned exiles to rebuild the temple and reorder their priorities around God’s presence.',
        bookThemes: ['temple', 'obedience', 'priorities', 'restoration', 'hope']
    },
    {
        id: 'zechariah',
        name: 'Zechariah',
        testament: 'Old',
        section: 'Minor Prophets',
        sectionKey: 'minor-prophets',
        bookIntroTitle: 'Visions of Restoration',
        bookIntroText: 'Zechariah combines symbolic visions and future hope, calling God’s people to faithfulness and pointing to a coming king.',
        bookThemes: ['vision', 'restoration', 'messiah', 'hope', 'faithfulness']
    },
    {
        id: 'malachi',
        name: 'Malachi',
        testament: 'Old',
        section: 'Minor Prophets',
        sectionKey: 'minor-prophets',
        bookIntroTitle: 'Faithfulness Before Silence',
        bookIntroText: 'Malachi confronts careless worship and covenant failure while promising a coming messenger and future healing.',
        bookThemes: ['covenant', 'worship', 'faithfulness', 'messenger', 'hope']
    },

    {
        id: 'matthew',
        name: 'Matthew',
        testament: 'New',
        section: 'Gospels',
        sectionKey: 'gospels',
        bookIntroTitle: 'Jesus the Promised King',
        bookIntroText: 'Matthew presents Jesus as the promised Messiah, teacher, and king who fulfills Scripture and forms disciples.',
        bookThemes: ['jesus', 'kingdom', 'fulfillment', 'discipleship', 'teaching']
    },
    {
        id: 'mark',
        name: 'Mark',
        testament: 'New',
        section: 'Gospels',
        sectionKey: 'gospels',
        bookIntroTitle: 'The Servant in Action',
        bookIntroText: 'Mark moves quickly through Jesus’ ministry, highlighting authority, suffering, and the cost of discipleship.',
        bookThemes: ['jesus', 'discipleship', 'authority', 'suffering', 'action']
    },
    {
        id: 'luke',
        name: 'Luke',
        testament: 'New',
        section: 'Gospels',
        sectionKey: 'gospels',
        bookIntroTitle: 'Good News for All',
        bookIntroText: 'Luke emphasizes salvation, mercy, prayer, and the reach of Jesus’ mission to the poor, the outsider, and the lost.',
        bookThemes: ['salvation', 'mercy', 'prayer', 'outsiders', 'joy']
    },
    {
        id: 'john',
        name: 'John',
        testament: 'New',
        section: 'Gospels',
        sectionKey: 'gospels',
        bookIntroTitle: 'Believe and Have Life',
        bookIntroText: 'John presents Jesus through signs and deep teaching so readers may believe and find life in his name.',
        bookThemes: ['belief', 'life', 'light', 'jesus-identity', 'love']
    },

    {
        id: 'acts',
        name: 'Acts',
        testament: 'New',
        section: 'Historical Books',
        sectionKey: 'historical-books',
        bookIntroTitle: 'The Church Sent Out',
        bookIntroText: 'Acts tells how the Holy Spirit empowers the early church to witness from Jerusalem to the wider world.',
        bookThemes: ['holy-spirit', 'mission', 'church', 'witness', 'growth']
    },

    {
        id: 'romans',
        name: 'Romans',
        testament: 'New',
        section: 'Pauline Letters',
        sectionKey: 'pauline-letters',
        bookIntroTitle: 'Grace and New Life',
        bookIntroText: 'Romans explains sin, grace, faith, and life in the Spirit with Paul’s fullest treatment of the gospel.',
        bookThemes: ['grace', 'faith', 'salvation', 'righteousness', 'spirit']
    },
    {
        id: '1-corinthians',
        name: '1 Corinthians',
        testament: 'New',
        section: 'Pauline Letters',
        sectionKey: 'pauline-letters',
        bookIntroTitle: 'Correction for a Divided Church',
        bookIntroText: '1 Corinthians addresses conflict, worship, holiness, spiritual gifts, and love in a troubled Christian community.',
        bookThemes: ['church-unity', 'love', 'holiness', 'worship', 'spiritual-gifts']
    },
    {
        id: '2-corinthians',
        name: '2 Corinthians',
        testament: 'New',
        section: 'Pauline Letters',
        sectionKey: 'pauline-letters',
        bookIntroTitle: 'Strength in Weakness',
        bookIntroText: '2 Corinthians is deeply personal, defending Paul’s ministry while showing how God’s power is revealed in weakness.',
        bookThemes: ['weakness', 'grace', 'ministry', 'reconciliation', 'comfort']
    },
    {
        id: 'galatians',
        name: 'Galatians',
        testament: 'New',
        section: 'Pauline Letters',
        sectionKey: 'pauline-letters',
        bookIntroTitle: 'Freedom in Christ',
        bookIntroText: 'Galatians insists that believers are justified by faith, not by the law, and are called to walk by the Spirit.',
        bookThemes: ['faith', 'freedom', 'grace', 'spirit', 'identity-in-christ']
    },
    {
        id: 'ephesians',
        name: 'Ephesians',
        testament: 'New',
        section: 'Pauline Letters',
        sectionKey: 'pauline-letters',
        bookIntroTitle: 'The Church in Christ',
        bookIntroText: 'Ephesians celebrates salvation by grace and describes the church as one body called to unity, holiness, and strength.',
        bookThemes: ['church', 'grace', 'unity', 'identity', 'spiritual-strength']
    },
    {
        id: 'philippians',
        name: 'Philippians',
        testament: 'New',
        section: 'Pauline Letters',
        sectionKey: 'pauline-letters',
        bookIntroTitle: 'Joy and Humility',
        bookIntroText: 'Philippians is a warm letter of joy, perseverance, and Christlike humility in the middle of hardship.',
        bookThemes: ['joy', 'humility', 'perseverance', 'christ', 'peace']
    },
    {
        id: 'colossians',
        name: 'Colossians',
        testament: 'New',
        section: 'Pauline Letters',
        sectionKey: 'pauline-letters',
        bookIntroTitle: 'Christ Above All',
        bookIntroText: 'Colossians proclaims the supremacy of Christ and calls believers to a renewed life shaped by him.',
        bookThemes: ['christ', 'new-life', 'fullness', 'identity', 'holiness']
    },
    {
        id: '1-thessalonians',
        name: '1 Thessalonians',
        testament: 'New',
        section: 'Pauline Letters',
        sectionKey: 'pauline-letters',
        bookIntroTitle: 'Faithful and Ready',
        bookIntroText: '1 Thessalonians encourages a young church in faith, love, holiness, and hope in the Lord’s return.',
        bookThemes: ['hope', 'holiness', 'encouragement', 'community', 'second-coming']
    },
    {
        id: '2-thessalonians',
        name: '2 Thessalonians',
        testament: 'New',
        section: 'Pauline Letters',
        sectionKey: 'pauline-letters',
        bookIntroTitle: 'Steady in Confusion',
        bookIntroText: '2 Thessalonians strengthens believers facing confusion and pressure, urging endurance, order, and confidence in God’s faithfulness.',
        bookThemes: ['perseverance', 'faithfulness', 'hope', 'order', 'second-coming']
    },
    {
        id: '1-timothy',
        name: '1 Timothy',
        testament: 'New',
        section: 'Pauline Letters',
        sectionKey: 'pauline-letters',
        bookIntroTitle: 'Guidance for Church Leadership',
        bookIntroText: '1 Timothy gives pastoral instruction about teaching, leadership, worship, and godly conduct in the church.',
        bookThemes: ['leadership', 'teaching', 'worship', 'godliness', 'church-order']
    },
    {
        id: '2-timothy',
        name: '2 Timothy',
        testament: 'New',
        section: 'Pauline Letters',
        sectionKey: 'pauline-letters',
        bookIntroTitle: 'Finish Faithfully',
        bookIntroText: '2 Timothy is Paul’s urgent call to courage, endurance, and fidelity to Scripture and sound teaching.',
        bookThemes: ['endurance', 'scripture', 'courage', 'faithfulness', 'ministry']
    },
    {
        id: 'titus',
        name: 'Titus',
        testament: 'New',
        section: 'Pauline Letters',
        sectionKey: 'pauline-letters',
        bookIntroTitle: 'Order and Good Works',
        bookIntroText: 'Titus links sound teaching with practical goodness, urging healthy leadership and visible Christian character.',
        bookThemes: ['leadership', 'good-works', 'grace', 'teaching', 'godliness']
    },
    {
        id: 'philemon',
        name: 'Philemon',
        testament: 'New',
        section: 'Pauline Letters',
        sectionKey: 'pauline-letters',
        bookIntroTitle: 'A Letter of Reconciliation',
        bookIntroText: 'Philemon is a short personal appeal that shows how the gospel reshapes relationships through mercy and brotherhood.',
        bookThemes: ['reconciliation', 'forgiveness', 'brotherhood', 'grace', 'community']
    },

    {
        id: 'hebrews',
        name: 'Hebrews',
        testament: 'New',
        section: 'General Letters',
        sectionKey: 'general-letters',
        bookIntroTitle: 'Jesus the Great High Priest',
        bookIntroText: 'Hebrews presents Jesus as greater than all who came before and calls believers to persevere in faith.',
        bookThemes: ['jesus', 'priesthood', 'faith', 'perseverance', 'fulfillment']
    },
    {
        id: 'james',
        name: 'James',
        testament: 'New',
        section: 'General Letters',
        sectionKey: 'general-letters',
        bookIntroTitle: 'Faith That Acts',
        bookIntroText: 'James is practical and direct, urging believers to show wisdom and genuine faith through action.',
        bookThemes: ['faith-and-works', 'wisdom', 'speech', 'perseverance', 'obedience']
    },
    {
        id: '1-peter',
        name: '1 Peter',
        testament: 'New',
        section: 'General Letters',
        sectionKey: 'general-letters',
        bookIntroTitle: 'Hope in Suffering',
        bookIntroText: '1 Peter encourages believers facing hardship to stand firm in hope, holiness, and identity in Christ.',
        bookThemes: ['hope', 'suffering', 'holiness', 'identity', 'perseverance']
    },
    {
        id: '2-peter',
        name: '2 Peter',
        testament: 'New',
        section: 'General Letters',
        sectionKey: 'general-letters',
        bookIntroTitle: 'Grow and Stay Alert',
        bookIntroText: '2 Peter urges growth in virtue, warns against false teaching, and reminds believers of God’s sure promises.',
        bookThemes: ['growth', 'truth', 'false-teaching', 'promise', 'watchfulness']
    },
    {
        id: '1-john',
        name: '1 John',
        testament: 'New',
        section: 'General Letters',
        sectionKey: 'general-letters',
        bookIntroTitle: 'Walk in Light and Love',
        bookIntroText: '1 John emphasizes truth, love, obedience, and assurance for those who belong to God.',
        bookThemes: ['love', 'truth', 'assurance', 'obedience', 'light']
    },
    {
        id: '2-john',
        name: '2 John',
        testament: 'New',
        section: 'General Letters',
        sectionKey: 'general-letters',
        bookIntroTitle: 'Truth and Love Together',
        bookIntroText: '2 John is a brief warning to remain in truth, walk in love, and resist false teaching.',
        bookThemes: ['truth', 'love', 'obedience', 'watchfulness', 'discernment']
    },
    {
        id: '3-john',
        name: '3 John',
        testament: 'New',
        section: 'General Letters',
        sectionKey: 'general-letters',
        bookIntroTitle: 'Faithfulness in Community',
        bookIntroText: '3 John praises faithful support for truth and contrasts good and harmful leadership within the church.',
        bookThemes: ['truth', 'hospitality', 'leadership', 'faithfulness', 'community']
    },
    {
        id: 'jude',
        name: 'Jude',
        testament: 'New',
        section: 'General Letters',
        sectionKey: 'general-letters',
        bookIntroTitle: 'Contend for the Faith',
        bookIntroText: 'Jude urges believers to remain steadfast, resist corruption, and trust God to keep them faithful.',
        bookThemes: ['faithfulness', 'warning', 'perseverance', 'truth', 'god’s-keeping']
    },

    {
        id: 'revelation',
        name: 'Revelation',
        testament: 'New',
        section: 'Apocalypse',
        sectionKey: 'apocalypse',
        bookIntroTitle: 'Victory and New Creation',
        bookIntroText: 'Revelation uses vivid visions to reveal Christ’s victory, call the church to endurance, and point to a renewed creation.',
        bookThemes: ['victory', 'endurance', 'judgment', 'worship', 'new-creation']
    }
];

export const books = BOOKS_BASE.map((book, index) => ({
    ...book,
    order: index + 1,
    normalizedName: book.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    firstLetter: book.name.replace(/^[123]\s*/, '').trim().charAt(0).toUpperCase()
}));
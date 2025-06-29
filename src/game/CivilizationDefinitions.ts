// Civilization definitions based on Civilization 1 civilizations
export const CivilizationType = {
    ROMANS: 'romans',
    AMERICAN: 'american',
    AZTECS: 'aztecs',
    BABYLONIAN: 'babylonian',
    CHINESE: 'chinese',
    EGYPTIAN: 'egyptian',
    ENGLISH: 'english',
    FRENCH: 'french',
    GERMAN: 'german',
    GREEKS: 'greeks',
    INDIAN: 'indian',
    //JAPANESE: 'japanese',
    MONGOL: 'mongol',
    RUSSIAN: 'russian',
    ZULU: 'zulu'
} as const;

export type CivilizationType = typeof CivilizationType[keyof typeof CivilizationType];

export interface Civilization {
    id: CivilizationType;
    name: string;
    adjective: string; // e.g., "Roman", "American", etc.
    color: string; // Hex color code for visual representation
    leader: string; // Historical leader name
    cities: string[]; // Default city names in order of preference
    description: string; // Brief description of the civilization
}

export const CIVILIZATION_DEFINITIONS: Record<CivilizationType, Civilization> = {
    [CivilizationType.ROMANS]: {
        id: CivilizationType.ROMANS,
        name: 'Roman Empire',
        adjective: 'Roman',
        color: '#FFDE21',
        leader: 'Caesar',
        cities: [
            'Rome', 'Caesarea', 'Carthage', 'Nicopolis', 'Byzantium', 'Brundisium',
            'Syracuse', 'Antioch', 'Palmyra', 'Cyrene', 'Gordion', 'Tyrus',
            'Jerusalem', 'Seleucia', 'Ravenna', 'Artaxata'
        ],
        description: 'A powerful empire that dominated the Mediterranean world through military might and administrative excellence.'
    },

    [CivilizationType.AMERICAN]: {
        id: CivilizationType.AMERICAN,
        name: 'Americans',
        adjective: 'American',
        color: '#FF00FF',
        leader: 'Abraham Lincoln',
        cities: [
            'Washington', 'New York', 'Boston', 'Philadelphia', 'Atlanta', 'Chicago',
            'Buffalo', 'St. Louis', 'Detroit', 'New Orleans', 'Baltimore', 'Denver',
            'Cincinnati', 'Dallas', 'Los Angeles', 'Las Vegas'
        ],
        description: 'A young nation founded on principles of democracy and freedom, destined for expansion across a vast continent.'
    },

    [CivilizationType.AZTECS]: {
        id: CivilizationType.AZTECS,
        name: 'Aztec Empire',
        adjective: 'Aztec',
        color: '#00DDDD', // Teal
        leader: 'Montezuma',
        cities: [
            'Tenochtitlan', 'Chiauhtia', 'Chapultapec', 'Coatepec', 'Ayontzinco', 'Itzapalapa',
            'Itzapam', 'Mitxcoac', 'Tucubaya', 'Tecamac', 'Tepezinco', 'Ticoman',
            'Tlaxcala', 'Xaltocan', 'Xicalango', 'Zumpanco'
        ],
        description: 'A mighty Mesoamerican empire built on tribute, trade, and religious devotion centered in the Valley of Mexico.'
    },

    [CivilizationType.BABYLONIAN]: {
        id: CivilizationType.BABYLONIAN,
        name: 'Babylonians',
        adjective: 'Babylonian',
        color: '#343434', // Dark gray
        leader: 'Hammurabi',
        cities: [
            'Babylon', 'Sumer', 'Uruk', 'Ninevah', 'Ashur', 'Ellipi',
            'Akkad', 'Eridu', 'Kish', 'Nippur', 'Shuruppak', 'Zariqum',
            'Izibia', 'Nimrud', 'Arbela', 'Zamua'
        ],
        description: 'Ancient masters of law and astronomy from Mesopotamia, the cradle of civilization between the rivers.'
    },

    [CivilizationType.CHINESE]: {
        id: CivilizationType.CHINESE,
        name: 'Chinese',
        adjective: 'Chinese',
        color: '#DC143C', // Crimson
        leader: 'Mao Tse Tung',
        cities: [
            'Peking', 'Shanghai', 'Canton', 'Nanking', 'Tsingtao', 'Hangchow',
            'Tientsin', 'Tatung', 'Macao', 'Anyang', 'Shantung', 'Chinan',
            'Kaifeng', 'Ningpo', 'Paoting', 'Yangchow'
        ],
        description: 'An ancient civilization known for technological innovation, philosophy, and the Mandate of Heaven.'
    },

    [CivilizationType.EGYPTIAN]: {
        id: CivilizationType.EGYPTIAN,
        name: 'Egyptians',
        adjective: 'Egyptian',
        color: '#00FFFF',
        leader: 'Cleopatra',
        cities: [
            'Thebes', 'Memphis', 'Oryx', 'Heliopolis', 'Gaza', 'Alexandria',
            'Byblos', 'Cairo', 'Coptos', 'Edfu', 'Pithom', 'Busirus',
            'Athribus', 'Mendes', 'Tanis', 'Abydos'
        ],
        description: 'Masters of the Nile, builders of pyramids and monuments that have endured for millennia.'
    },

    [CivilizationType.ENGLISH]: {
        id: CivilizationType.ENGLISH,
        name: 'English',
        adjective: 'English',
        color: '#800080', // Purple
        leader: 'Elizabeth I',
        cities: [
            'London', 'Coventry', 'Birmingham', 'Dover', 'Nottingham', 'York',
            'Liverpool', 'Brighton', 'Oxford', 'Reading', 'Exeter', 'Cambridge',
            'Hastings', 'Canterbury', 'Banbury', 'Newcastle'
        ],
        description: 'A maritime power destined to rule the waves and establish a global empire upon which the sun never sets.'
    },

    [CivilizationType.FRENCH]: {
        id: CivilizationType.FRENCH,
        name: 'French',
        adjective: 'French',
        color: '#4169E1', // Royal blue
        leader: 'Napoleon',
        cities: [
            'Paris', 'Orleans', 'Lyons', 'Tours', 'Chartres', 'Bordeaux',
            'Rouen', 'Avignon', 'Marseilles', 'Grenoble', 'Dijon', 'Amiens',
            'Cherbourg', 'Poitiers', 'Toulouse', 'Bayonne'
        ],
        description: 'A nation of culture, cuisine, and conquest that has shaped European politics and philosophy for centuries.'
    },

    [CivilizationType.GERMAN]: {
        id: CivilizationType.GERMAN,
        name: 'Germans',
        adjective: 'German',
        color: '#2F4F4F', // Dark slate gray
        leader: 'Frederick',
        cities: [
            'Berlin', 'Leipzig', 'Hamburg', 'Bremen', 'Frankfurt', 'Bonn',
            'Nuremberg', 'Cologne', 'Hannover', 'Munich', 'Stuttgart', 'Heidelberg',
            'Salzburg', 'Konigsberg', 'Dortmund', 'Brandenburg'
        ],
        description: 'A confederation of industrious peoples known for engineering excellence, philosophy, and military precision.'
    },

    [CivilizationType.GREEKS]: {
        id: CivilizationType.GREEKS,
        name: 'Greeks',
        adjective: 'Greek',
        color: '#008000', // green
        leader: 'Alexander',
        cities: [
            'Athens', 'Sparta', 'Corinth', 'Delphi', 'Eretria', 'Pharsalos',
            'Argos', 'Mycenae', 'Herakleia', 'Antioch', 'Ephesos', 'Rhodes',
            'Knossos', 'Troy', 'Pergamon', 'Miletos'
        ],
        description: 'The birthplace of democracy, philosophy, and classical learning that laid the foundation of Western civilization.'
    },

    [CivilizationType.INDIAN]: {
        id: CivilizationType.INDIAN,
        name: 'Indians',
        adjective: 'Indian',
        color: '#EEEEEE',
        leader: 'Gandhi',
        cities: [
            'Delhi', 'Bombay', 'Madras', 'Bangalore', 'Calcutta', 'Lahore',
            'Karachi', 'Kolhapur', 'Jaipur', 'Hyderbad', 'Bengal', 'Chittagong',
            'Punjab', 'Dacca', 'Indus', 'Ganges'
        ],
        description: 'A diverse subcontinent rich in spirituality, mathematics, and trade that bridges East and West.'
    },

    //   [CivilizationType.JAPANESE]: {
    //     id: CivilizationType.JAPANESE,
    //     name: 'Japanese',
    //     adjective: 'Japanese',
    //     color: '#8B008B', // Dark magenta
    //     leader: 'Tokugawa',
    //     cities: [
    //       'Tokyo', 'Kyoto', 'Osaka', 'Nagoya', 'Yokohama', 'Kobe',
    //       'Fukuoka', 'Sendai', 'Kanazawa', 'Sapporo', 'Matsuyama', 'Akita',
    //       'Hiroshima', 'Nagasaki', 'Nara', 'Kamakura'
    //     ],
    //     description: 'An island nation of honor, tradition, and technological innovation, balancing ancient customs with progress.'
    //   },

    [CivilizationType.MONGOL]: {
        id: CivilizationType.MONGOL,
        name: 'Mongols',
        adjective: 'Mongol',
        color: '#8B4513', // Saddle brown
        leader: 'Genghis Khan',
        cities: [
            'Samarkand', 'Bokhara', 'Nishapur', 'Karakorum', 'Kashgar', 'Tabriz',
            'Aleppo', 'Kabul', 'Ormuz', 'Basra', 'Khanbaryk', 'Khorasan',
            'Shangtu', 'Kazan', 'Qyinsay', 'Kerman'
        ],
        description: 'Fierce nomadic warriors who built the largest contiguous land empire in history through superior horsemanship and tactics.'
    },

    [CivilizationType.RUSSIAN]: {
        id: CivilizationType.RUSSIAN,
        name: 'Russians',
        adjective: 'Russian',
        color: '#556B2F', // Dark olive green
        leader: 'Stalin',
        cities: [
            'Moscow', 'Leningrad', 'Kiev', 'Minsk', 'Smolensk', 'Odessa',
            'Sevastopol', 'Tiblisi', 'Sverdlovsk', 'Yakutsk', 'Vladivostok', 'Novograd',
            'Krasnoyarsk', 'Riga', 'Rostov', 'Atrakhan'
        ],
        description: 'A vast empire spanning continents, enduring through harsh winters and emerging as a major world power.'
    },

    [CivilizationType.ZULU]: {
        id: CivilizationType.ZULU,
        name: 'Zulus',
        adjective: 'Zulu',
        color: '#800000', // Maroon
        leader: 'Shaka',
        cities: [
            'Zimbabwe', 'Ulundi', 'Bapedi', 'Hlobane', 'Isandhlwana', 'Intombe',
            'Mpondo', 'Ngome', 'Swazi', 'Tugela', 'Umtata', 'Umfolozi',
            'Ibabanago', 'Isipezi', 'Amatikulu', 'Zunquin'
        ],
        description: 'A proud warrior nation of southern Africa known for military innovation and fierce resistance to colonization.'
    }
};

export function getCivilization(civilizationType: CivilizationType): Civilization {
    return CIVILIZATION_DEFINITIONS[civilizationType];
}

export function getCivilizationByName(name: string): Civilization | undefined {
    return Object.values(CIVILIZATION_DEFINITIONS).find(
        civ => civ.name.toLowerCase() === name.toLowerCase() ||
            civ.adjective.toLowerCase() === name.toLowerCase()
    );
}

export function getRandomCivilization(): Civilization {
    const civilizations = Object.values(CIVILIZATION_DEFINITIONS);
    const randomIndex = Math.floor(Math.random() * civilizations.length);
    return civilizations[randomIndex];
}

export function getAllCivilizations(): Civilization[] {
    return Object.values(CIVILIZATION_DEFINITIONS);
}

export function getCivilizationColors(): Record<CivilizationType, string> {
    const colorMap: Record<CivilizationType, string> = {} as Record<CivilizationType, string>;
    Object.entries(CIVILIZATION_DEFINITIONS).forEach(([key, civ]) => {
        colorMap[key as CivilizationType] = civ.color;
    });
    return colorMap;
}

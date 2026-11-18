/* ===== מגה, דיינמקס וג'יגנטמקס =====
   נוצר מנתוני PokeAPI. הצורות נכנסות ל-POKEMON עם form ו-base, כדי שכל
   הציור והחישוב (שם, תמונה, סוגים, חוזק) יעבדו עליהן כמו על כל פוקימון.
   הן לא מופיעות בחבילה, בעולם, בפוקידקס ובבוחר של הכתר.
   dex של צורה = מספר התמונה שלה ב-PokeAPI. */
const FORMS = {
  "venusaur-mega": {dex: 10033, he: "מגה ונוזאור", types: ["grass", "poison"], hp: 80, power: 41, catch: 0, form: "mega", base: "venusaur"},
  "charizard-mega-x": {dex: 10034, he: "מגה צ'אריזארד X", types: ["fire", "dragon"], hp: 78, power: 43, catch: 0, form: "mega", base: "charizard"},
  "charizard-mega-y": {dex: 10035, he: "מגה צ'אריזארד Y", types: ["fire", "flying"], hp: 78, power: 53, catch: 0, form: "mega", base: "charizard"},
  "blastoise-mega": {dex: 10036, he: "מגה בלאסטויז", types: ["water"], hp: 79, power: 45, catch: 0, form: "mega", base: "blastoise"},
  "alakazam-mega": {dex: 10037, he: "מגה אלקזאם", types: ["psychic"], hp: 55, power: 58, catch: 0, form: "mega", base: "alakazam"},
  "gengar-mega": {dex: 10038, he: "מגה גנגר", types: ["ghost", "poison"], hp: 60, power: 57, catch: 0, form: "mega", base: "gengar"},
  "kangaskhan-mega": {dex: 10039, he: "מגה קנגסקאן", types: ["normal"], hp: 105, power: 42, catch: 0, form: "mega", base: "kangaskhan"},
  "pinsir-mega": {dex: 10040, he: "מגה פינסר", types: ["bug", "flying"], hp: 65, power: 52, catch: 0, form: "mega", base: "pinsir"},
  "gyarados-mega": {dex: 10041, he: "מגה גאיארדוס", types: ["water", "dark"], hp: 95, power: 52, catch: 0, form: "mega", base: "gyarados"},
  "aerodactyl-mega": {dex: 10042, he: "מגה אירודקטיל", types: ["rock", "flying"], hp: 80, power: 45, catch: 0, form: "mega", base: "aerodactyl"},
  "mewtwo-mega-x": {dex: 10043, he: "מגה מיוטו X", types: ["psychic", "fighting"], hp: 106, power: 63, catch: 0, form: "mega", base: "mewtwo"},
  "mewtwo-mega-y": {dex: 10044, he: "מגה מיוטו Y", types: ["psychic"], hp: 106, power: 65, catch: 0, form: "mega", base: "mewtwo"},
  "ampharos-mega": {dex: 10045, he: "מגה אמפארוס", types: ["electric", "dragon"], hp: 90, power: 55, catch: 0, form: "mega", base: "ampharos"},
  "scizor-mega": {dex: 10046, he: "מגה סיזור", types: ["bug", "steel"], hp: 70, power: 50, catch: 0, form: "mega", base: "scizor"},
  "heracross-mega": {dex: 10047, he: "מגה הרקרוס", types: ["bug", "fighting"], hp: 80, power: 62, catch: 0, form: "mega", base: "heracross"},
  "houndoom-mega": {dex: 10048, he: "מגה האונדום", types: ["dark", "fire"], hp: 75, power: 47, catch: 0, form: "mega", base: "houndoom"},
  "tyranitar-mega": {dex: 10049, he: "מגה טיירניטאר", types: ["rock", "dark"], hp: 100, power: 55, catch: 0, form: "mega", base: "tyranitar"},
  "blaziken-mega": {dex: 10050, he: "מגה בלייזיקן", types: ["fire", "fighting"], hp: 80, power: 53, catch: 0, form: "mega", base: "blaziken"},
  "gardevoir-mega": {dex: 10051, he: "מגה גארדבואר", types: ["psychic", "fairy"], hp: 68, power: 55, catch: 0, form: "mega", base: "gardevoir"},
  "mawile-mega": {dex: 10052, he: "מגה מאוויל", types: ["steel", "fairy"], hp: 50, power: 35, catch: 0, form: "mega", base: "mawile"},
  "aggron-mega": {dex: 10053, he: "מגה אגרון", types: ["steel"], hp: 70, power: 47, catch: 0, form: "mega", base: "aggron"},
  "medicham-mega": {dex: 10054, he: "מגה מדיצ'אם", types: ["fighting", "psychic"], hp: 60, power: 33, catch: 0, form: "mega", base: "medicham"},
  "manectric-mega": {dex: 10055, he: "מגה מאנקטריק", types: ["electric"], hp: 70, power: 45, catch: 0, form: "mega", base: "manectric"},
  "banette-mega": {dex: 10056, he: "מגה באנט", types: ["ghost"], hp: 64, power: 55, catch: 0, form: "mega", base: "banette"},
  "absol-mega": {dex: 10057, he: "מגה אבסול", types: ["dark"], hp: 65, power: 50, catch: 0, form: "mega", base: "absol"},
  "garchomp-mega": {dex: 10058, he: "מגה גארצ'ומפ", types: ["dragon", "ground"], hp: 108, power: 57, catch: 0, form: "mega", base: "garchomp"},
  "lucario-mega": {dex: 10059, he: "מגה לוקאריו", types: ["fighting", "steel"], hp: 70, power: 48, catch: 0, form: "mega", base: "lucario"},
  "abomasnow-mega": {dex: 10060, he: "מגה אבומסנו", types: ["grass", "ice"], hp: 90, power: 44, catch: 0, form: "mega", base: "abomasnow"},
  "latias-mega": {dex: 10062, he: "מגה לטיאס", types: ["dragon", "psychic"], hp: 80, power: 47, catch: 0, form: "mega", base: "latias"},
  "latios-mega": {dex: 10063, he: "מגה לטיוס", types: ["dragon", "psychic"], hp: 80, power: 53, catch: 0, form: "mega", base: "latios"},
  "swampert-mega": {dex: 10064, he: "מגה סוואמפרט", types: ["water", "ground"], hp: 100, power: 50, catch: 0, form: "mega", base: "swampert"},
  "sceptile-mega": {dex: 10065, he: "מגה ספטייל", types: ["grass", "dragon"], hp: 70, power: 48, catch: 0, form: "mega", base: "sceptile"},
  "sableye-mega": {dex: 10066, he: "מגה סייבלאיי", types: ["dark", "ghost"], hp: 50, power: 28, catch: 0, form: "mega", base: "sableye"},
  "altaria-mega": {dex: 10067, he: "מגה אלטריה", types: ["dragon", "fairy"], hp: 75, power: 37, catch: 0, form: "mega", base: "altaria"},
  "gallade-mega": {dex: 10068, he: "מגה גאלייד", types: ["psychic", "fighting"], hp: 68, power: 55, catch: 0, form: "mega", base: "gallade"},
  "audino-mega": {dex: 10069, he: "מגה אודינו", types: ["normal", "fairy"], hp: 103, power: 27, catch: 0, form: "mega", base: "audino"},
  "sharpedo-mega": {dex: 10070, he: "מגה שארפידו", types: ["water", "dark"], hp: 70, power: 47, catch: 0, form: "mega", base: "sharpedo"},
  "slowbro-mega": {dex: 10071, he: "מגה סלוברו", types: ["water", "psychic"], hp: 95, power: 43, catch: 0, form: "mega", base: "slowbro"},
  "steelix-mega": {dex: 10072, he: "מגה סטיליקס", types: ["steel", "ground"], hp: 75, power: 42, catch: 0, form: "mega", base: "steelix"},
  "pidgeot-mega": {dex: 10073, he: "מגה פידג'יאוט", types: ["normal", "flying"], hp: 83, power: 45, catch: 0, form: "mega", base: "pidgeot"},
  "glalie-mega": {dex: 10074, he: "מגה גליילי", types: ["ice"], hp: 80, power: 40, catch: 0, form: "mega", base: "glalie"},
  "diancie-mega": {dex: 10075, he: "מגה דיאנסי", types: ["rock", "fairy"], hp: 50, power: 53, catch: 0, form: "mega", base: "diancie"},
  "metagross-mega": {dex: 10076, he: "מגה מטאגרוס", types: ["steel", "psychic"], hp: 80, power: 48, catch: 0, form: "mega", base: "metagross"},
  "rayquaza-mega": {dex: 10079, he: "מגה רייקוואזה", types: ["dragon", "flying"], hp: 105, power: 60, catch: 0, form: "mega", base: "rayquaza"},
  "camerupt-mega": {dex: 10087, he: "מגה קאמרופט", types: ["fire", "ground"], hp: 70, power: 48, catch: 0, form: "mega", base: "camerupt"},
  "lopunny-mega": {dex: 10088, he: "מגה לופאני", types: ["normal", "fighting"], hp: 65, power: 45, catch: 0, form: "mega", base: "lopunny"},
  "salamence-mega": {dex: 10089, he: "מגה סלאמנס", types: ["dragon", "flying"], hp: 95, power: 48, catch: 0, form: "mega", base: "salamence"},
  "beedrill-mega": {dex: 10090, he: "מגה בידריל", types: ["bug", "poison"], hp: 65, power: 50, catch: 0, form: "mega", base: "beedrill"},
  "venusaur-gmax": {dex: 10195, he: "ונוזאור ג'יגנטמקס", types: ["grass", "poison"], hp: 80, power: 33, catch: 0, form: "gmax", base: "venusaur", gmove: ["ג'י-מקס שוט גפנים", "grass"]},
  "charizard-gmax": {dex: 10196, he: "צ'אריזארד ג'יגנטמקס", types: ["fire", "flying"], hp: 78, power: 36, catch: 0, form: "gmax", base: "charizard", gmove: ["ג'י-מקס שריפת יער", "fire"]},
  "blastoise-gmax": {dex: 10197, he: "בלאסטויז ג'יגנטמקס", types: ["water"], hp: 79, power: 28, catch: 0, form: "gmax", base: "blastoise", gmove: ["ג'י-מקס הפגזה", "water"]},
  "butterfree-gmax": {dex: 10198, he: "באטרפרי ג'יגנטמקס", types: ["bug", "flying"], hp: 60, power: 30, catch: 0, form: "gmax", base: "butterfree", gmove: ["ג'י-מקס בלבול", "bug"]},
  "pikachu-gmax": {dex: 10199, he: "פיקאצ'ו ג'יגנטמקס", types: ["electric"], hp: 35, power: 18, catch: 0, form: "gmax", base: "pikachu", gmove: ["ג'י-מקס התרסקות וולט", "electric"]},
  "meowth-gmax": {dex: 10200, he: "מיאות' ג'יגנטמקס", types: ["normal"], hp: 40, power: 15, catch: 0, form: "gmax", base: "meowth", gmove: ["ג'י-מקס בהלת זהב", "normal"]},
  "machamp-gmax": {dex: 10201, he: "מאצ'אמפ ג'יגנטמקס", types: ["fighting"], hp: 90, power: 43, catch: 0, form: "gmax", base: "machamp", gmove: ["ג'י-מקס מכת צ'י", "fighting"]},
  "gengar-gmax": {dex: 10202, he: "גנגר ג'יגנטמקס", types: ["ghost", "poison"], hp: 60, power: 43, catch: 0, form: "gmax", base: "gengar", gmove: ["ג'י-מקס אימה", "ghost"]},
  "kingler-gmax": {dex: 10203, he: "קינגלר ג'יגנטמקס", types: ["water"], hp: 55, power: 43, catch: 0, form: "gmax", base: "kingler", gmove: ["ג'י-מקס פרץ קצף", "water"]},
  "lapras-gmax": {dex: 10204, he: "לאפרס ג'יגנטמקס", types: ["water", "ice"], hp: 130, power: 28, catch: 0, form: "gmax", base: "lapras", gmove: ["ג'י-מקס תהודה", "ice"]},
  "eevee-gmax": {dex: 10205, he: "איווי ג'יגנטמקס", types: ["normal"], hp: 55, power: 18, catch: 0, form: "gmax", base: "eevee", gmove: ["ג'י-מקס חיבוק", "normal"]},
  "snorlax-gmax": {dex: 10206, he: "סנורלקס ג'יגנטמקס", types: ["normal"], hp: 160, power: 37, catch: 0, form: "gmax", base: "snorlax", gmove: ["ג'י-מקס מילוי", "normal"]},
  "garbodor-gmax": {dex: 10207, he: "גרבודור ג'יגנטמקס", types: ["poison"], hp: 80, power: 32, catch: 0, form: "gmax", base: "garbodor", gmove: ["ג'י-מקס צחנה", "poison"]},
  "melmetal-gmax": {dex: 10208, he: "מלמטאל ג'יגנטמקס", types: ["steel"], hp: 135, power: 48, catch: 0, form: "gmax", base: "melmetal", gmove: ["ג'י-מקס התכה", "steel"]},
  "rillaboom-gmax": {dex: 10209, he: "רילאבום ג'יגנטמקס", types: ["grass"], hp: 100, power: 42, catch: 0, form: "gmax", base: "rillaboom", gmove: ["ג'י-מקס סולו תופים", "grass", 160]},
  "cinderace-gmax": {dex: 10210, he: "סינדרייס ג'יגנטמקס", types: ["fire"], hp: 80, power: 39, catch: 0, form: "gmax", base: "cinderace", gmove: ["ג'י-מקס כדור אש", "fire", 160]},
  "inteleon-gmax": {dex: 10211, he: "אינטליאון ג'יגנטמקס", types: ["water"], hp: 70, power: 42, catch: 0, form: "gmax", base: "inteleon", gmove: ["ג'י-מקס צליפת מים", "water", 160]},
  "corviknight-gmax": {dex: 10212, he: "קורבינייט ג'יגנטמקס", types: ["flying", "steel"], hp: 98, power: 29, catch: 0, form: "gmax", base: "corviknight", gmove: ["ג'י-מקס זעם הרוח", "flying"]},
  "orbeetle-gmax": {dex: 10213, he: "אורביטל ג'יגנטמקס", types: ["bug", "psychic"], hp: 60, power: 27, catch: 0, form: "gmax", base: "orbeetle", gmove: ["ג'י-מקס כבידה", "psychic"]},
  "drednaw-gmax": {dex: 10214, he: "דרדנו ג'יגנטמקס", types: ["water", "rock"], hp: 90, power: 38, catch: 0, form: "gmax", base: "drednaw", gmove: ["ג'י-מקס גל אבנים", "water"]},
  "coalossal-gmax": {dex: 10215, he: "קולוסל ג'יגנטמקס", types: ["rock", "fire"], hp: 110, power: 27, catch: 0, form: "gmax", base: "coalossal", gmove: ["ג'י-מקס סלע געשי", "rock"]},
  "flapple-gmax": {dex: 10216, he: "פלאפל ג'יגנטמקס", types: ["grass", "dragon"], hp: 70, power: 37, catch: 0, form: "gmax", base: "flapple", gmove: ["ג'י-מקס חמיצות", "grass"]},
  "appletun-gmax": {dex: 10217, he: "אפלטון ג'יגנטמקס", types: ["grass", "dragon"], hp: 110, power: 33, catch: 0, form: "gmax", base: "appletun", gmove: ["ג'י-מקס מתיקות", "grass"]},
  "sandaconda-gmax": {dex: 10218, he: "סנדקונדה ג'יגנטמקס", types: ["ground"], hp: 72, power: 36, catch: 0, form: "gmax", base: "sandaconda", gmove: ["ג'י-מקס סופת חול", "ground"]},
  "toxtricity-amped-gmax": {dex: 10219, he: "טוקסטריסיטי ג'יגנטמקס", types: ["electric", "poison"], hp: 75, power: 38, catch: 0, form: "gmax", base: "toxtricity-amped", gmove: ["ג'י-מקס הלם משתק", "electric"]},
  "centiskorch-gmax": {dex: 10220, he: "סנטיסקורצ' ג'יגנטמקס", types: ["fire", "bug"], hp: 100, power: 38, catch: 0, form: "gmax", base: "centiskorch", gmove: ["ג'י-מקס תופת", "fire"]},
  "hatterene-gmax": {dex: 10221, he: "האטרין ג'יגנטמקס", types: ["psychic", "fairy"], hp: 57, power: 45, catch: 0, form: "gmax", base: "hatterene", gmove: ["ג'י-מקס מכת עונש", "fairy"]},
  "grimmsnarl-gmax": {dex: 10222, he: "גרימסנארל ג'יגנטמקס", types: ["dark", "fairy"], hp: 95, power: 40, catch: 0, form: "gmax", base: "grimmsnarl", gmove: ["ג'י-מקס תנומה", "dark"]},
  "alcremie-gmax": {dex: 10223, he: "אלקרמי ג'יגנטמקס", types: ["fairy"], hp: 65, power: 37, catch: 0, form: "gmax", base: "alcremie", gmove: ["ג'י-מקס גמר", "fairy"]},
  "copperajah-gmax": {dex: 10224, he: "קופרג'ה ג'יגנטמקס", types: ["steel"], hp: 122, power: 43, catch: 0, form: "gmax", base: "copperajah", gmove: ["ג'י-מקס גל פלדה", "steel"]},
  "duraludon-gmax": {dex: 10225, he: "דוראלודון ג'יגנטמקס", types: ["steel", "dragon"], hp: 70, power: 40, catch: 0, form: "gmax", base: "duraludon", gmove: ["ג'י-מקס התרוקנות", "dragon"]},
  "urshifu-single-strike-gmax": {dex: 10226, he: "אורשיפו ג'יגנטמקס", types: ["fighting", "dark"], hp: 100, power: 43, catch: 0, form: "gmax", base: "urshifu-single-strike", gmove: ["ג'י-מקס מכה אחת", "dark"]},
  "clefable-mega": {dex: 10278, he: "מגה קלפייבל", types: ["fairy", "flying"], hp: 95, power: 45, catch: 0, form: "mega", base: "clefable"},
  "victreebel-mega": {dex: 10279, he: "מגה ויקטריבל", types: ["grass", "poison"], hp: 80, power: 45, catch: 0, form: "mega", base: "victreebel"},
  "starmie-mega": {dex: 10280, he: "מגה סטארמי", types: ["water", "psychic"], hp: 60, power: 43, catch: 0, form: "mega", base: "starmie"},
  "dragonite-mega": {dex: 10281, he: "מגה דרגונייט", types: ["dragon", "flying"], hp: 91, power: 48, catch: 0, form: "mega", base: "dragonite"},
  "meganium-mega": {dex: 10282, he: "מגה מגניום", types: ["grass", "fairy"], hp: 80, power: 48, catch: 0, form: "mega", base: "meganium"},
  "feraligatr-mega": {dex: 10283, he: "מגה פרליגייטור", types: ["water", "dragon"], hp: 85, power: 53, catch: 0, form: "mega", base: "feraligatr"},
  "skarmory-mega": {dex: 10284, he: "מגה סקרמורי", types: ["steel", "flying"], hp: 65, power: 47, catch: 0, form: "mega", base: "skarmory"},
  "froslass-mega": {dex: 10285, he: "מגה פרוסלאס", types: ["ice", "ghost"], hp: 70, power: 47, catch: 0, form: "mega", base: "froslass"},
  "emboar-mega": {dex: 10286, he: "מגה אמבור", types: ["fire", "fighting"], hp: 110, power: 49, catch: 0, form: "mega", base: "emboar"},
  "excadrill-mega": {dex: 10287, he: "מגה אקסקדריל", types: ["ground", "steel"], hp: 110, power: 55, catch: 0, form: "mega", base: "excadrill"},
  "scolipede-mega": {dex: 10288, he: "מגה סקוליפיד", types: ["bug", "poison"], hp: 60, power: 47, catch: 0, form: "mega", base: "scolipede"},
  "scrafty-mega": {dex: 10289, he: "מגה סקראפטי", types: ["dark", "fighting"], hp: 65, power: 43, catch: 0, form: "mega", base: "scrafty"},
  "eelektross-mega": {dex: 10290, he: "מגה אילקטרוס", types: ["electric"], hp: 85, power: 48, catch: 0, form: "mega", base: "eelektross"},
  "chandelure-mega": {dex: 10291, he: "מגה שנדלור", types: ["ghost", "fire"], hp: 60, power: 58, catch: 0, form: "mega", base: "chandelure"},
  "chesnaught-mega": {dex: 10292, he: "מגה צ'סנוט", types: ["grass", "fighting"], hp: 88, power: 46, catch: 0, form: "mega", base: "chesnaught"},
  "delphox-mega": {dex: 10293, he: "מגה דלפוקס", types: ["fire", "psychic"], hp: 75, power: 53, catch: 0, form: "mega", base: "delphox"},
  "greninja-mega": {dex: 10294, he: "מגה גרנינג'ה", types: ["water", "dark"], hp: 72, power: 44, catch: 0, form: "mega", base: "greninja"},
  "pyroar-mega": {dex: 10295, he: "מגה פיירואר", types: ["fire", "normal"], hp: 86, power: 43, catch: 0, form: "mega", base: "pyroar-male"},
  "floette-mega": {dex: 10296, he: "מגה פלואט", types: ["fairy"], hp: 74, power: 52, catch: 0, form: "mega", base: "floette"},
  "malamar-mega": {dex: 10297, he: "מגה מלמר", types: ["dark", "psychic"], hp: 86, power: 34, catch: 0, form: "mega", base: "malamar"},
  "barbaracle-mega": {dex: 10298, he: "מגה ברברקל", types: ["rock", "fighting"], hp: 72, power: 47, catch: 0, form: "mega", base: "barbaracle"},
  "dragalge-mega": {dex: 10299, he: "מגה דרגאלג'", types: ["poison", "dragon"], hp: 65, power: 44, catch: 0, form: "mega", base: "dragalge"},
  "hawlucha-mega": {dex: 10300, he: "מגה הולוצ'ה", types: ["fighting", "flying"], hp: 78, power: 46, catch: 0, form: "mega", base: "hawlucha"},
  "zygarde-mega": {dex: 10301, he: "מגה זיגרד", types: ["dragon", "ground"], hp: 216, power: 72, catch: 0, form: "mega", base: "zygarde-50"},
  "drampa-mega": {dex: 10302, he: "מגה דראמפה", types: ["normal", "dragon"], hp: 78, power: 53, catch: 0, form: "mega", base: "drampa"},
  "falinks-mega": {dex: 10303, he: "מגה פאלינקס", types: ["fighting"], hp: 65, power: 45, catch: 0, form: "mega", base: "falinks"},
  "raichu-mega-x": {dex: 10304, he: "מגה ראיצ'ו X", types: ["electric"], hp: 60, power: 45, catch: 0, form: "mega", base: "raichu"},
  "raichu-mega-y": {dex: 10305, he: "מגה ראיצ'ו Y", types: ["electric"], hp: 60, power: 53, catch: 0, form: "mega", base: "raichu"},
  "chimecho-mega": {dex: 10306, he: "מגה צ'יימקו", types: ["psychic", "steel"], hp: 75, power: 45, catch: 0, form: "mega", base: "chimecho"},
  "absol-mega-z": {dex: 10307, he: "מגה אבסול Z", types: ["dark", "ghost"], hp: 65, power: 51, catch: 0, form: "mega", base: "absol"},
  "staraptor-mega": {dex: 10308, he: "מגה סטאראפטור", types: ["fighting", "flying"], hp: 85, power: 47, catch: 0, form: "mega", base: "staraptor"},
  "garchomp-mega-z": {dex: 10309, he: "מגה גארצ'ומפ Z", types: ["dragon"], hp: 108, power: 47, catch: 0, form: "mega", base: "garchomp"},
  "lucario-mega-z": {dex: 10310, he: "מגה לוקאריו Z", types: ["fighting", "steel"], hp: 70, power: 55, catch: 0, form: "mega", base: "lucario"},
  "heatran-mega": {dex: 10311, he: "מגה היטראן", types: ["fire", "steel"], hp: 91, power: 58, catch: 0, form: "mega", base: "heatran"},
  "darkrai-mega": {dex: 10312, he: "מגה דארקריי", types: ["dark"], hp: 70, power: 55, catch: 0, form: "mega", base: "darkrai"},
  "golurk-mega": {dex: 10313, he: "מגה גולרק", types: ["ground", "ghost"], hp: 89, power: 53, catch: 0, form: "mega", base: "golurk"},
  "meowstic-male-mega": {dex: 10314, he: "מגה מיאוסטיק", types: ["psychic"], hp: 74, power: 48, catch: 0, form: "mega", base: "meowstic-male"},
  "crabominable-mega": {dex: 10315, he: "מגה קראבומינבל", types: ["fighting", "ice"], hp: 97, power: 52, catch: 0, form: "mega", base: "crabominable"},
  "golisopod-mega": {dex: 10316, he: "מגה גוליסופוד", types: ["bug", "steel"], hp: 75, power: 50, catch: 0, form: "mega", base: "golisopod"},
  "magearna-mega": {dex: 10317, he: "מגה מגירנה", types: ["steel", "fairy"], hp: 80, power: 57, catch: 0, form: "mega", base: "magearna"},
  "zeraora-mega": {dex: 10319, he: "מגה זראורה", types: ["electric"], hp: 88, power: 52, catch: 0, form: "mega", base: "zeraora"},
  "scovillain-mega": {dex: 10320, he: "מגה סקוביליין", types: ["grass", "fire"], hp: 65, power: 46, catch: 0, form: "mega", base: "scovillain"},
  "glimmora-mega": {dex: 10321, he: "מגה גלימורה", types: ["rock", "poison"], hp: 83, power: 50, catch: 0, form: "mega", base: "glimmora"},
  "tatsugiri-curly-mega": {dex: 10322, he: "מגה טטסוגירי", types: ["dragon", "water"], hp: 68, power: 45, catch: 0, form: "mega", base: "tatsugiri-curly"},
  "baxcalibur-mega": {dex: 10325, he: "מגה בקסקליבר", types: ["dragon", "ice"], hp: 115, power: 58, catch: 0, form: "mega", base: "baxcalibur"}
};
Object.assign(POKEMON, FORMS);
// הנתונים של הצורות לעולם (חיים, התקפה, הגנה, מיוחד, הגנה מיוחדת, מהירות)
const FORM_STATS = {"10033": [80, 100, 123, 122, 120, 80], "10034": [78, 130, 111, 130, 85, 100], "10035": [78, 104, 78, 159, 115, 100], "10036": [79, 103, 120, 135, 115, 78], "10037": [55, 50, 65, 175, 105, 150], "10038": [60, 65, 80, 170, 95, 130], "10039": [105, 125, 100, 60, 100, 100], "10040": [65, 155, 120, 65, 90, 105], "10041": [95, 155, 109, 70, 130, 81], "10042": [80, 135, 85, 70, 95, 150], "10043": [106, 190, 100, 154, 100, 130], "10044": [106, 150, 70, 194, 120, 140], "10045": [90, 95, 105, 165, 110, 45], "10046": [70, 150, 140, 65, 100, 75], "10047": [80, 185, 115, 40, 105, 75], "10048": [75, 90, 90, 140, 90, 115], "10049": [100, 164, 150, 95, 120, 71], "10050": [80, 160, 80, 130, 80, 100], "10051": [68, 85, 65, 165, 135, 100], "10052": [50, 105, 125, 55, 95, 50], "10053": [70, 140, 230, 60, 80, 50], "10054": [60, 100, 85, 80, 85, 100], "10055": [70, 75, 80, 135, 80, 135], "10056": [64, 165, 75, 93, 83, 75], "10057": [65, 150, 60, 115, 60, 115], "10058": [108, 170, 115, 120, 95, 92], "10059": [70, 145, 88, 140, 70, 112], "10060": [90, 132, 105, 132, 105, 30], "10062": [80, 100, 120, 140, 150, 110], "10063": [80, 130, 100, 160, 120, 110], "10064": [100, 150, 110, 95, 110, 70], "10065": [70, 110, 75, 145, 85, 145], "10066": [50, 85, 125, 85, 115, 20], "10067": [75, 110, 110, 110, 105, 80], "10068": [68, 165, 95, 65, 115, 110], "10069": [103, 60, 126, 80, 126, 50], "10070": [70, 140, 70, 110, 65, 105], "10071": [95, 75, 180, 130, 80, 30], "10072": [75, 125, 230, 55, 95, 30], "10073": [83, 80, 80, 135, 80, 121], "10074": [80, 120, 80, 120, 80, 100], "10075": [50, 160, 110, 160, 110, 110], "10076": [80, 145, 150, 105, 110, 110], "10079": [105, 180, 100, 180, 100, 115], "10087": [70, 120, 100, 145, 105, 20], "10088": [65, 136, 94, 54, 96, 135], "10089": [95, 145, 130, 120, 90, 120], "10090": [65, 150, 40, 15, 80, 145], "10195": [80, 82, 83, 100, 100, 80], "10196": [78, 84, 78, 109, 85, 100], "10197": [79, 83, 100, 85, 105, 78], "10198": [60, 45, 50, 90, 80, 70], "10199": [35, 55, 40, 50, 50, 90], "10200": [40, 45, 35, 40, 40, 90], "10201": [90, 130, 80, 65, 85, 55], "10202": [60, 65, 60, 130, 75, 110], "10203": [55, 130, 115, 50, 50, 75], "10204": [130, 85, 80, 85, 95, 60], "10205": [55, 55, 50, 45, 65, 55], "10206": [160, 110, 65, 65, 110, 30], "10207": [80, 95, 82, 60, 82, 75], "10208": [135, 143, 143, 80, 65, 34], "10209": [100, 125, 90, 60, 70, 85], "10210": [80, 116, 75, 65, 75, 119], "10211": [70, 85, 65, 125, 65, 120], "10212": [98, 87, 105, 53, 85, 67], "10213": [60, 45, 110, 80, 120, 90], "10214": [90, 115, 90, 48, 68, 74], "10215": [110, 80, 120, 80, 90, 30], "10216": [70, 110, 80, 95, 60, 70], "10217": [110, 85, 80, 100, 80, 30], "10218": [72, 107, 125, 65, 70, 71], "10219": [75, 98, 70, 114, 70, 75], "10220": [100, 115, 65, 90, 90, 65], "10221": [57, 90, 95, 136, 103, 29], "10222": [95, 120, 65, 95, 75, 60], "10223": [65, 60, 75, 110, 121, 64], "10224": [122, 130, 69, 80, 69, 30], "10225": [70, 95, 115, 120, 50, 85], "10226": [100, 130, 100, 63, 60, 97], "10278": [95, 80, 93, 135, 110, 70], "10279": [80, 125, 85, 135, 95, 70], "10280": [60, 100, 105, 130, 105, 120], "10281": [91, 124, 115, 145, 125, 100], "10282": [80, 92, 115, 143, 115, 80], "10283": [85, 160, 125, 89, 93, 78], "10284": [65, 140, 110, 40, 100, 110], "10285": [70, 80, 70, 140, 100, 120], "10286": [110, 148, 75, 110, 110, 75], "10287": [110, 165, 100, 65, 65, 103], "10288": [60, 140, 149, 75, 99, 62], "10289": [65, 130, 135, 55, 135, 68], "10290": [85, 145, 80, 135, 90, 80], "10291": [60, 75, 110, 175, 110, 90], "10292": [88, 137, 172, 74, 115, 44], "10293": [75, 69, 72, 159, 125, 134], "10294": [72, 125, 77, 133, 81, 142], "10295": [86, 88, 92, 129, 86, 126], "10296": [74, 85, 87, 155, 148, 102], "10297": [86, 102, 88, 98, 120, 88], "10298": [72, 140, 130, 64, 106, 88], "10299": [65, 85, 105, 132, 163, 44], "10300": [78, 137, 100, 74, 93, 118], "10301": [216, 70, 91, 216, 85, 100], "10302": [78, 85, 110, 160, 116, 36], "10303": [65, 135, 135, 70, 65, 100], "10304": [60, 135, 95, 90, 95, 110], "10305": [60, 100, 55, 160, 80, 130], "10306": [75, 50, 110, 135, 120, 65], "10307": [65, 154, 60, 75, 60, 151], "10308": [85, 140, 100, 60, 90, 110], "10309": [108, 130, 85, 141, 85, 151], "10310": [70, 100, 70, 164, 70, 151], "10311": [91, 120, 106, 175, 141, 67], "10312": [70, 120, 130, 165, 130, 85], "10313": [89, 159, 105, 70, 105, 55], "10314": [74, 48, 76, 143, 101, 124], "10315": [97, 157, 122, 62, 107, 33], "10316": [75, 150, 175, 70, 120, 40], "10317": [80, 125, 115, 170, 115, 95], "10319": [88, 157, 75, 147, 80, 153], "10320": [65, 138, 85, 138, 85, 75], "10321": [83, 90, 105, 150, 96, 101], "10322": [68, 65, 90, 135, 125, 92], "10325": [115, 175, 117, 105, 101, 87]};
if (typeof WSTATS !== "undefined") Object.assign(WSTATS, FORM_STATS);

/* פוקימון ← צורות המגה שלו (X / Y / Z כשיש כמה) */
const MEGA_OF = {"venusaur": ["venusaur-mega"], "charizard": ["charizard-mega-x", "charizard-mega-y"], "blastoise": ["blastoise-mega"], "alakazam": ["alakazam-mega"], "gengar": ["gengar-mega"], "kangaskhan": ["kangaskhan-mega"], "pinsir": ["pinsir-mega"], "gyarados": ["gyarados-mega"], "aerodactyl": ["aerodactyl-mega"], "mewtwo": ["mewtwo-mega-x", "mewtwo-mega-y"], "ampharos": ["ampharos-mega"], "scizor": ["scizor-mega"], "heracross": ["heracross-mega"], "houndoom": ["houndoom-mega"], "tyranitar": ["tyranitar-mega"], "blaziken": ["blaziken-mega"], "gardevoir": ["gardevoir-mega"], "mawile": ["mawile-mega"], "aggron": ["aggron-mega"], "medicham": ["medicham-mega"], "manectric": ["manectric-mega"], "banette": ["banette-mega"], "absol": ["absol-mega", "absol-mega-z"], "garchomp": ["garchomp-mega", "garchomp-mega-z"], "lucario": ["lucario-mega", "lucario-mega-z"], "abomasnow": ["abomasnow-mega"], "latias": ["latias-mega"], "latios": ["latios-mega"], "swampert": ["swampert-mega"], "sceptile": ["sceptile-mega"], "sableye": ["sableye-mega"], "altaria": ["altaria-mega"], "gallade": ["gallade-mega"], "audino": ["audino-mega"], "sharpedo": ["sharpedo-mega"], "slowbro": ["slowbro-mega"], "steelix": ["steelix-mega"], "pidgeot": ["pidgeot-mega"], "glalie": ["glalie-mega"], "diancie": ["diancie-mega"], "metagross": ["metagross-mega"], "rayquaza": ["rayquaza-mega"], "camerupt": ["camerupt-mega"], "lopunny": ["lopunny-mega"], "salamence": ["salamence-mega"], "beedrill": ["beedrill-mega"], "clefable": ["clefable-mega"], "victreebel": ["victreebel-mega"], "starmie": ["starmie-mega"], "dragonite": ["dragonite-mega"], "meganium": ["meganium-mega"], "feraligatr": ["feraligatr-mega"], "skarmory": ["skarmory-mega"], "froslass": ["froslass-mega"], "emboar": ["emboar-mega"], "excadrill": ["excadrill-mega"], "scolipede": ["scolipede-mega"], "scrafty": ["scrafty-mega"], "eelektross": ["eelektross-mega"], "chandelure": ["chandelure-mega"], "chesnaught": ["chesnaught-mega"], "delphox": ["delphox-mega"], "greninja": ["greninja-mega"], "pyroar-male": ["pyroar-mega"], "floette": ["floette-mega"], "malamar": ["malamar-mega"], "barbaracle": ["barbaracle-mega"], "dragalge": ["dragalge-mega"], "hawlucha": ["hawlucha-mega"], "zygarde-50": ["zygarde-mega"], "drampa": ["drampa-mega"], "falinks": ["falinks-mega"], "raichu": ["raichu-mega-x", "raichu-mega-y"], "chimecho": ["chimecho-mega"], "staraptor": ["staraptor-mega"], "heatran": ["heatran-mega"], "darkrai": ["darkrai-mega"], "golurk": ["golurk-mega"], "meowstic-male": ["meowstic-male-mega"], "crabominable": ["crabominable-mega"], "golisopod": ["golisopod-mega"], "magearna": ["magearna-mega"], "zeraora": ["zeraora-mega"], "scovillain": ["scovillain-mega"], "glimmora": ["glimmora-mega"], "tatsugiri-curly": ["tatsugiri-curly-mega"], "baxcalibur": ["baxcalibur-mega"]};
/* פוקימון ← צורת הג'יגנטמקס שלו */
const GMAX_OF = {"venusaur": "venusaur-gmax", "charizard": "charizard-gmax", "blastoise": "blastoise-gmax", "butterfree": "butterfree-gmax", "pikachu": "pikachu-gmax", "meowth": "meowth-gmax", "machamp": "machamp-gmax", "gengar": "gengar-gmax", "kingler": "kingler-gmax", "lapras": "lapras-gmax", "eevee": "eevee-gmax", "snorlax": "snorlax-gmax", "garbodor": "garbodor-gmax", "melmetal": "melmetal-gmax", "rillaboom": "rillaboom-gmax", "cinderace": "cinderace-gmax", "inteleon": "inteleon-gmax", "corviknight": "corviknight-gmax", "orbeetle": "orbeetle-gmax", "drednaw": "drednaw-gmax", "coalossal": "coalossal-gmax", "flapple": "flapple-gmax", "appletun": "appletun-gmax", "sandaconda": "sandaconda-gmax", "toxtricity-amped": "toxtricity-amped-gmax", "centiskorch": "centiskorch-gmax", "hatterene": "hatterene-gmax", "grimmsnarl": "grimmsnarl-gmax", "alcremie": "alcremie-gmax", "copperajah": "copperajah-gmax", "duraludon": "duraludon-gmax", "urshifu-single-strike": "urshifu-single-strike-gmax"};

/* ---------- החפצים ----------
   אבן מגה: מגה-אבולוציה לפוקימון אחד, פעם אחת בכל קרב, עד סוף הקרב.
   צמיד דיינמקס: דיינמקס (או ג'יגנטמקס למי שיש לו) פעם אחת בכל קרב, ל-3 תורות.
   במשחק השולחן הם קלפים בחבילה שתופסים כמו פריט. בעולם קונים אותם במרכז. */
const GEAR = {
  "key-stone":    {dex: -1, he: "אבן מגה", types: ["normal"], hp: 1, power: 0, catch: .3, form: "gear"},
  "dynamax-band": {dex: -2, he: "צמיד דיינמקס", types: ["normal"], hp: 1, power: 0, catch: .3, form: "gear"}
};
Object.assign(POKEMON, GEAR);
Object.assign(ITEMS, {
  "key-stone":    {mega: 1, icon: "💎", text: "אפשר להפוך פוקימון למגה פעם בכל קרב"},
  "dynamax-band": {band: 1, icon: "🔴", text: "אפשר לעשות דיינמקס פעם בכל קרב"}
});
const GEAR_IDS = ["key-stone", "dynamax-band"];
const GEAR_PRICE = {"key-stone": 400, "dynamax-band": 400};
const DMAX_TURNS = 3;

const isForm = id => !!(POKEMON[id] && POKEMON[id].form);
const baseOf = id => (POKEMON[id] && POKEMON[id].base) || id;
// בסדרה הם לא יכולים לעשות דיינמקס
const NO_DMAX = ["zacian", "zamazenta", "eternatus"];
const canMega = id => !!MEGA_OF[id];
const canDmax = id => !!POKEMON[id] && !POKEMON[id].form && !NO_DMAX.includes(id) && !ITEMS[id];

/* ---------- מתקפות מקס ----------
   בדיינמקס כל מתקפה הופכת למתקפת מקס מאותו סוג. העוצמה לפי הטבלה של הסדרה,
   והיא תמיד פוגעת. לג'יגנטמקס יש מתקפת ג'י-מקס משלו במקום מתקפת המקס מהסוג שלו. */
const MAX_NAMES = {normal: "מקס מכה", fire: "מקס להבה", water: "מקס גייזר", electric: "מקס ברק", grass: "מקס צמחייה",
  ice: "מקס סופת ברד", fighting: "מקס אגרוף", poison: "מקס רפש", ground: "מקס רעידה", flying: "מקס זרם אוויר",
  psychic: "מקס סערת מוח", bug: "מקס פרפור", rock: "מקס מפולת", ghost: "מקס רפאים", dragon: "מקס רוח דרקון",
  dark: "מקס חושך", steel: "מקס דוקרן פלדה", fairy: "מקס מטר כוכבים"};
function maxPower(power, type) {
  const low = type === "fighting" || type === "poison";
  const t = low ? [70, 75, 80, 85, 90, 95, 100] : [90, 100, 110, 120, 130, 140, 150];
  return power <= 40 ? t[0] : power <= 50 ? t[1] : power <= 60 ? t[2] : power <= 70 ? t[3] : power <= 100 ? t[4] : power <= 140 ? t[5] : t[6];
}
/* אותו מבנה כמו WMOVES: [שם, סוג, עוצמה, דיוק, פיזית, עדיפות] */
function maxMove(monId, moveKey) {
  const mv = WMOVES[moveKey] || ["", "normal", 40, 100, 1, 0];
  const g = POKEMON[monId] && POKEMON[monId].gmove;
  if (g && g[1] === mv[1]) return [g[0], mv[1], g[2] || maxPower(mv[2], mv[1]), 100, mv[4], 0];
  return [MAX_NAMES[mv[1]] || "מקס מכה", mv[1], maxPower(mv[2], mv[1]), 100, mv[4], 0];
}

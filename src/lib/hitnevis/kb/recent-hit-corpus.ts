/**
 * Recent Persian hit corpus manifest.
 * Source: FarsiChart 1400s / RadioJavan public chart.
 * Snapshot: 2026-09-25.
 *
 * Copyright rule: full lyric text is intentionally NOT stored.
 * This manifest stores only public metadata so downstream tooling can
 * attach derived, non-lyric songwriting features.
 */
export type RecentHitSong = {
  rank: number;
  title: string;
  artist: string;
  plays: number;
  era: "1400s";
};

const ROWS: [number, string, string, number][] = [
  [1,"Daste Man Nist","Shadmehr Aghili",104441906],
  [2,"Batel","Shadmehr Aghili",77170697],
  [3,"Shookhi Nadaram","Sohrab Pakzad & Asef Aria",70066588],
  [4,"Yakh Zadam","Shadmehr Aghili",69015686],
  [5,"Amoo Hassan","Donya",68935972],
  [6,"Maman Mano Bebakhsh","Sasy",66669805],
  [7,"Manam","Majid Razavi",65375113],
  [8,"Roze Sefid","Haamim",64874161],
  [9,"Paghadam","Alireza Talischi",64629471],
  [10,"Ghesmate Man","Alireza Jj & Shayan Eshraghi",63649570],
  [11,"Behtar Az Mane","Ali Yasini",63106487],
  [12,"Balance","Alireza Jj & Mehrad Hidden & Sohrab Mj & Sepehr Khalse",62844115],
  [13,"Tamasha","Shadmehr Aghili",62488727],
  [14,"Saaghi","The Don & Koorosh",62124341],
  [15,"Nesfe Shab","Ali Yasini",61446181],
  [16,"Jange Delam","Shadmehr Aghili",60529121],
  [17,"Fresh","Sijal & Sepehr Khalse & Behzad Leito & Mehrad Hidden",60467791],
  [18,"Hiss","Asef Aria",60048728],
  [19,"Chera Too Jangi","Shadmehr Aghili",58720984],
  [20,"Business","Behzad Leito & Sijal & Saman Wilson & Sepehr Khalse & Sohrab Mj & Alireza Jj",57747099],
  [21,"Shakhe Nabat","Masih & Arash Ap",57169283],
  [22,"Tala","Majid Razavi",53349884],
  [23,"Dota Dele Ashegh","Behnam Bani",51292620],
  [24,"Bottle","Talk Down & fedi",50926041],
  [25,"Faghat To","Moein",50538503],
  [26,"Divoonegi","Sirvan Khosravi",49776267],
  [27,"Ghalbe Mani","Haamim",48113593],
  [28,"Dotayi","Kimia & Donya",47982715],
  [29,"Ghasedak","Ashvan",47591809],
  [30,"Bemoni Baram","Reza Sadeghi",47320337],
  [31,"Noor Cheshmi","Sohrab Pakzad",46828659],
  [32,"Chips Remix","Donya & Talk Down",46533705],
  [33,"Negine Ghalbami","Majid Razavi",45650949],
  [34,"Dafi Surprise","Talk Down & fedi",45394840],
  [35,"Mirese Khabara","Ali Yasini",45012374],
  [36,"Khejalati","Majid Razavi",44658915],
  [37,"Ay Setareh","Haamim",43292492],
  [38,"Par Mizane","Majid Razavi",42799795],
  [39,"Zakhme Kari","Behnam Bani",42651050],
  [40,"Oomadam Too Shahr","Sijal & Behzad Leito & Mehrad Hidden",42497775],
  [41,"Pishe To","Shadmehr Aghili",42477453],
  [42,"Zare Zare","Ashvan",42376565],
  [43,"Hagh Bedeh","Shadmehr Aghili",42253734],
  [44,"Faal","The Don & Behzad Leito",41949806],
  [45,"Nade Ghol","Ali Yasini",41621419],
  [46,"Dokhtare Haji","Talk Down & fedi",41420813],
  [47,"Ba Toam","Naser Zeynali",40936755],
  [48,"Baroon","Behnam Bani",39452935],
  [49,"Che Heyf","Moein Z",39373427],
  [50,"Baradarane Leila","Sasy",39276780],
  [51,"Sia Sefid","Haamim",37672165],
  [52,"Hesse Mamooli","Ali Ardavan & Behzad Leito & Sepehr Khalse & I.Da",37138408],
  [53,"Joz To","TM Bax",37075016],
  [54,"Shooresho Daravordi","Anita",37044234],
  [55,"Baraye","Shervin Hajipour",36735225],
  [56,"Ghermez","Garsha Rezaei",36666062],
  [57,"Bemoon Ba Man","Arta & Koorosh",36536241],
  [58,"Nadaramet","Mohsen Yeganeh",36519179],
  [59,"Khodeto Beresoon","Naser Zeynali",36501901],
  [60,"Atre Bahar","Aron Afshar",36443787],
  [61,"Bezano Bekoob","Kimia",36436288],
  [62,"Shabe Eshgh","Behnam Bani",36375809],
  [63,"Chesh To Chesh","Garsha Rezaei",36343346],
  [64,"To","Erfan Tahmasbi",36179803],
  [65,"Kodex","EpiCure & Ho3ein & Sohrab Mj",36069659],
  [66,"Gelooband","Erfan Tahmasbi",35573423],
  [67,"Khandehato Ghorboon","Aron Afshar",35443843],
  [68,"Asheghi Mamnoo","Reza Bahram",35374477],
  [69,"Moteasefane","Majid Razavi",34675273],
  [70,"Bonbast","Ashvan",34147957],
  [71,"Hala Na","Gdaal & Sami Beigi & Erfan & Madgal",33995258],
  [72,"Boro Bargard","Donya",33880441],
  [73,"Male Mani","Moein Z",33816236],
  [74,"Hulu","Sasy & Arash",33782249],
  [75,"Che Konam (New Version)","Erfan Tahmasbi",33668109],
  [76,"Dashe Golam","Ali Ardavan & Sohrab Mj & Sepehr Khalse",33326870],
  [77,"Gorgo Mish","Majid Razavi",33128646],
  [78,"Hala Hala Ha","Masoud Sadeghloo",32835108],
  [79,"Cheshmat","Farzad Farzin",32081786],
  [80,"Bang Bang","Alireza Jj & Yasna",31687818],
  [81,"Cha Cha","TM Bax",31539582],
  [82,"Miam Rooye Khatet","Sohrab Mj & Mehrad Hidden & Catchybeatz & Ali Ardavan",31236387],
  [83,"Man Bahat Ghahram","Amir Tataloo",31088901],
  [84,"Male Man Bash","Sohrab Pakzad",30992991],
  [85,"Ki Mishe Man","Haamim",30752120],
  [86,"Dava Darmoon","Masoud Sadeghloo",30479706],
  [87,"Havaye Del","Reza Bahram",30203875],
  [88,"Ziba","Majid Razavi",30089110],
  [89,"Bi Marefat","Behnam Bani",29934513],
  [90,"Eshghe Ghadimi","Haamim",29779278],
  [91,"Amoo Zanjir Baf","Masih & Arash Ap",29618700],
  [92,"Moo Meshki","Sohrab Pakzad",29581525],
  [93,"Ti Amo","Talk Down",28869277],
  [94,"Ghalb","Donya",28782452],
  [95,"Dokhtar Irooni","Sohrab Pakzad",28447404],
  [96,"Del","Sijal & Behzad Leito & Farhad B & Dynatonic",28337752],
  [97,"Belakhare","Majid Razavi",28326954],
  [98,"Shab Bekheir","Satin",28191846],
  [99,"Wow Che Nice","EpiCure & Amin Aminem & Tensi",27887507],
  [100,"Baroon","Sogand",27411143],
];

export const RECENT_TOP_100: RecentHitSong[] = ROWS.map(([rank, title, artist, plays]) => ({
  rank, title, artist, plays, era: "1400s",
}));

export const RECENT_HIT_CORPUS_DATE = "2026-09-25";
export const RECENT_HIT_CORPUS_SOURCE =
  "FarsiChart / Persian Songs of the 1400s / RadioJavan public chart";

export function getRecentHitCorpusStats() {
  const artists = new Map<string, number>();
  for (const row of RECENT_TOP_100) artists.set(row.artist, (artists.get(row.artist) || 0) + 1);
  return {
    songCount: RECENT_TOP_100.length,
    date: RECENT_HIT_CORPUS_DATE,
    source: RECENT_HIT_CORPUS_SOURCE,
    topArtists: [...artists.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
  };
}

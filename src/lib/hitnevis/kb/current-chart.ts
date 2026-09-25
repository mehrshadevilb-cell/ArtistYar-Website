/**
 * Public chart snapshot used as a recency layer for HitNevis.
 * Source: FarsiChart top 100 Persian/Iranian songs, RadioJavan view.
 * Snapshot: 2026-09-24. Metadata only; no lyric text is stored.
 */
export type ChartSong = { rank: number; title: string; artist: string; plays: number };

export const HITNEVIS_CHART_DATE = "2026-09-24";
export const HITNEVIS_CHART_SOURCE = "FarsiChart / RadioJavan public chart";

export const CURRENT_TOP_100: ChartSong[] = [
  [1,"Gentleman","Sasy",131205333],[2,"Behet Ghol Midam","Mohsen Yeganeh",126411806],
  [3,"Bi Ehsas","Shadmehr Aghili",120936614],[4,"Door Shodi","Shadmehr Aghili",116045680],
  [5,"Gheseh Eshgh","Ebi",112478072],[6,"Daste Man Nist","Shadmehr Aghili",104434924],
  [7,"Sheyda","Ashvan",93855322],[8,"Darya","Masih & Arash Ap",92177728],
  [9,"100 Rishteri","Masih & Arash Ap",91740735],[10,"Baroon Delam Khast","Shadmehr Aghili",91247334],
  [11,"To Ke Nisti Pisham","Masih & Arash Ap",89447825],[12,"Hesse Khoobie","Shadmehr Aghili",85746072],
  [13,"Delaaram","Puzzle Band (Ft Hamid Hiraad)",84605583],[14,"Tehran Tokyo","Sasy",79307950],
  [15,"Chatre Khis","Hamed Homayoun",79286738],[16,"Doctor","Sasy",79011214],
  [17,"Ashegham Karde","Behnam Bani",78989374],[18,"Romantic","Sogand",77626865],
  [19,"Batel","Shadmehr Aghili",77163499],[20,"Bia Bazam","Masih & Arash Ap",75906822],
  [21,"Ghabe Akse Khali","Sirvan Khosravi",74756190],[22,"Rooze Sard","Shadmehr Aghili",74076559],
  [23,"Shabe Royaei","Aron Afshar",73664912],[24,"Khaabe Khosh","Shadmehr Aghili",73081529],
  [25,"Ashegham Kardi","Hoorosh Band",72938685],[26,"Ghorse Ghamar 2","Behnam Bani",72411792],
  [27,"Ghazi","Shadmehr Aghili",70595466],[28,"Shookhi Nadaram","Sohrab Pakzad (Ft Asef Aria)",70066588],
  [29,"Gole Eshgh","Reza Bahram",69373875],[30,"Yakh Zadam","Shadmehr Aghili",69012557],
  [31,"Amoo Hassan","Donya",68935972],[32,"Navazesh","Amir Tataloo",68892471],
  [33,"Salam","Sogand",68838524],[34,"Mah Pishooni","Hoorosh Band",68350047],
  [35,"Akharesh Ghashange","Alireza Talischi",68283342],[36,"Saaghiya","Sasy",68050796],
  [37,"Pooste Shir","Ebi",67579583],[38,"Vaghti Ke Bad Misham","Shadmehr Aghili",67503005],
  [39,"Maman Mano Bebakhsh","Sasy",66664096],[40,"Ki Behtar Az To","Aref",65934316],
  [41,"Manam","Majid Razavi",65371381],[42,"Harjaye Shahr","Ali Yasini",65283527],
  [43,"Roze Sefid","Haamim",64874161],[44,"Alaki","Siavash Ghomayshi",64734906],
  [45,"Paghadam","Alireza Talischi",64614401],[46,"Akhare Shab","Masoud Sadeghloo & Mehdi Hosseini",64440391],
  [47,"Asheghaneh","Farzad Farzin",63843836],[48,"Ghesmate Man","Alireza Jj (Ft Shayan Eshraghi)",63649570],
  [49,"Akhmato Va Kon","Behnam Bani",63514553],[50,"Janam Bash","Aron Afshar",63116518],
  [51,"Behtar Az Mane","Ali Yasini",63106487],[52,"Balance","Alireza Jj (Ft Mehrad Hidden, Sohrab Mj, & Sepehr Khalse)",62840638],
  [53,"Tamasha","Shadmehr Aghili",62476147],[54,"Ghaf","Alireza Talischi",62253387],
  [55,"Saaghi","The Don (Ft Koorosh)",62117163],[56,"Che Pesari","Sasy",61803016],
  [57,"Nesfe Shab","Ali Yasini",61446181],[58,"Alijenab","Evan Band",61401846],
  [59,"Az Eshgh Bego","Reza Bahram",61366345],[60,"Hamishegi","Shadmehr Aghili",61305807],
  [61,"Faghat Ba To Eshgham","Shadmehr Aghili",61275213],[62,"Ahange Shad","Ashvan",61255808],
  [63,"Aroom Aroom","Alishmas (Ft Mehdi Jahani)",60706691],[64,"Khoshhalam","Behnam Bani",60554480],
  [65,"Jange Delam","Shadmehr Aghili",60526509],[66,"Fresh","Sijal & Sepehr Khalse (Ft Behzad Leito & Mehrad Hidden)",60464170],
  [67,"Shookhie Mage","Hamid Hiraad",60462828],[68,"Ghalbe Man","Shadmehr Aghili",60096628],
  [69,"Hiss","Asef Aria",60048728],[70,"Tabestoon Kootahe","Zedbazi",59934145],
  [71,"Avaz Nemishi","Shadmehr Aghili",59569759],[72,"Adat Kardam","Alishmas & Mehdi Jahani",58915811],
  [73,"Chera Too Jangi","Shadmehr Aghili",58717611],[74,"Eshgham Inrooza","Mohammad Alizadeh",58490628],
  [75,"Bache Mahal","Zedbazi",58299581],[76,"Be Ki Poz Midi","Hoorosh Band",58279496],
  [77,"Ghorse Ghamar","Behnam Bani",58019687],[78,"Business","Behzad Leito & Sijal (Ft Sepehr Khalse, Saman Wilson, Sohrab Mj, & Alireza Jj)",57743709],
  [79,"Ye Khabari Shode","Naser Zeynali",57318938],[80,"Nakoni Bavar","Zedbazi (Ft Behzad Leito)",57232967],
  [81,"Shakhe Nabat","Masih & Arash Ap",57169283],[82,"Taghdir","Shadmehr Aghili",57011774],
  [83,"Ahay Khabardar","Homayoun Shajarian",56954444],[84,"Che Bekhay Che Nakhay","Behnam Bani",56572567],
  [85,"Divaneh","Reza Bahram",56156577],[86,"Shah Beyt","Masih & Arash Ap",55254019],
  [87,"Saghi","Hayedeh",55109083],[88,"Yebaram Man","Koorosh (Ft Arta, Behzad Leito, & Raha)",54775628],
  [89,"Soojehat Tekrarie","Sirvan Khosravi",54641092],[90,"Lazemami","TM Bax",54527646],
  [91,"Shabeh Eshgh","Hayedeh",54475328],[92,"Tala","Majid Razavi",53342284],
  [93,"Fogholade","Behzad Leito & Sijal (Ft Sami Beigi)",53096820],[94,"Bezan Baran","Ehaam",52793217],
  [95,"Akharin Bar","Ebi",52562163],[96,"Harbar In Daro","Macan Band",52420181],
  [97,"Akhar Mano Be Baad Dad","Hoorosh Band",51999829],[98,"Tajrobeh Kon","Shadmehr Aghili",51954747],
  [99,"Haminim Ke Hastim","Wantons",51639718],[100,"Male Man Bash","Sohrab Mj (Ft Amir Tataloo & Orchid)",51629203],
].map(([rank,title,artist,plays]) => ({ rank, title, artist, plays }));

export function getCurrentChartStats() {
  const rows = CURRENT_TOP_100;
  return {
    date: HITNEVIS_CHART_DATE,
    source: HITNEVIS_CHART_SOURCE,
    songCount: rows.length,
    totalPlays: rows.reduce((sum, row) => sum + row.plays, 0),
    topArtists: Array.from(
      rows.reduce((map, row) => map.set(row.artist, (map.get(row.artist) || 0) + 1), new Map<string, number>()),
    ).sort((a, b) => b[1] - a[1]).slice(0, 8),
  };
}

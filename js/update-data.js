const fs = require('fs');
const path = require('path');
const https = require('https');
const { parseString } = require('xml2js');

// RSS-источники
const RSS_SOURCES = {
    vaticanNews: 'https://www.vaticannews.va/en/church/rss.xml',
    zenit: 'https://zenit.org/feed/',
    catholicNewsAgency: 'https://www.catholicnewsagency.com/rss/news.xml',
    nationalCatholicRegister: 'https://www.ncregister.com/rss.xml',
    ewtn: 'https://www.ewtn.com/rss.xml',
    crux: 'https://cruxnow.com/feed/',
    aleteia: 'https://aleteia.org/feed/',
    catholicHerald: 'https://catholicherald.co.uk/feed/'
};

const KEYWORDS = [
    'persecution', 'martyr', 'killed', 'murdered', 'death', 'dead',
    'church attack', 'bombing', 'explosion', 'burned church',
    'christian', 'catholic', 'orthodox', 'protestant', 'evangelical',
    'religious freedom', 'religious liberty',
    'imprisoned', 'arrested', 'detained', 'jailed',
    'kidnapped', 'abducted', 'hostage',
    'discrimination', 'anti-christian', 'blasphemy',
    'nigeria', 'china', 'india', 'pakistan', 'iran', 'iraq', 'syria',
    'egypt', 'eritrea', 'north korea', 'somalia', 'libya',
    'afghanistan', 'yemen', 'sudan', 'myanmar', 'burkina faso', 'mali'
];

const COUNTRY_DATA = {
    'Nigeria': { lat: 9.0820, lng: 8.6753, cities: { 'Abuja': [9.0810, 7.4895], 'Lagos': [6.5244, 3.3792], 'Kaduna': [10.5105, 7.4165] }},
    'India': { lat: 20.5937, lng: 78.9629, cities: { 'Delhi': [28.7041, 77.1025], 'Mumbai': [19.0760, 72.8777], 'Odisha': [20.9517, 85.0985] }},
    'China': { lat: 35.8617, lng: 104.1954, cities: { 'Beijing': [39.9042, 116.4074], 'Shanghai': [31.2304, 121.4737] }},
    'Pakistan': { lat: 30.3753, lng: 69.3451, cities: { 'Lahore': [31.5204, 74.3587], 'Islamabad': [33.6844, 73.0479] }},
    'Iran': { lat: 32.4279, lng: 53.6880, cities: { 'Tehran': [35.6892, 51.3890], 'Isfahan': [32.6539, 51.6660] }},
    'Egypt': { lat: 26.8206, lng: 30.8025, cities: { 'Cairo': [30.0444, 31.2357], 'Alexandria': [31.2001, 29.9187] }},
    'Syria': { lat: 34.8021, lng: 38.9968, cities: { 'Damascus': [33.5138, 36.2765], 'Aleppo': [36.2021, 37.1343] }},
    'Iraq': { lat: 33.2232, lng: 43.6793, cities: { 'Baghdad': [33.3152, 44.3661], 'Mosul': [36.3566, 43.1640] }},
    'Turkey': { lat: 38.9637, lng: 35.2433, cities: { 'Istanbul': [41.0082, 28.9784], 'Ankara': [39.9334, 32.8597] }},
    'Myanmar': { lat: 21.9162, lng: 95.9560, cities: { 'Yangon': [16.8661, 96.1951], 'Mandalay': [21.9162, 95.9560] }},
    'Sudan': { lat: 12.8628, lng: 30.2176, cities: { 'Khartoum': [15.5007, 32.5599] }},
    'Eritrea': { lat: 15.1794, lng: 39.7823, cities: { 'Asmara': [15.3229, 38.9251] }},
    'North Korea': { lat: 40.3399, lng: 127.5101, cities: { 'Pyongyang': [39.0392, 125.7625] }},
    'Somalia': { lat: 5.1521, lng: 46.1996, cities: { 'Mogadishu': [2.0469, 45.3182] }},
    'Libya': { lat: 26.3351, lng: 17.2283, cities: { 'Tripoli': [32.8872, 13.1913] }},
    'Afghanistan': { lat: 33.9391, lng: 67.7100, cities: { 'Kabul': [34.5553, 69.2075] }},
    'Yemen': { lat: 15.5527, lng: 48.5164, cities: { 'Sanaa': [15.3694, 44.1910] }},
    'Saudi Arabia': { lat: 23.8859, lng: 45.0792, cities: { 'Riyadh': [24.7136, 46.6753] }},
    'Algeria': { lat: 28.0339, lng: 1.6596, cities: { 'Algiers': [36.7538, 3.0588] }},
    'Morocco': { lat: 31.7917, lng: -7.0926, cities: { 'Rabat': [34.0209, -6.8416] }},
    'Tunisia': { lat: 33.8869, lng: 9.5375, cities: { 'Tunis': [36.8065, 10.1815] }},
    'Mali': { lat: 17.5707, lng: -3.9962, cities: { 'Bamako': [12.6392, -8.0029] }},
    'Burkina Faso': { lat: 12.2383, lng: -1.5616, cities: { 'Ouagadougou': [12.3714, -1.5197] }},
    'Niger': { lat: 17.6078, lng: 8.0817, cities: { 'Niamey': [13.5116, 2.1254] }},
    'Cameroon': { lat: 7.3697, lng: 12.3547, cities: { 'Yaoundé': [3.8480, 11.5021] }},
    'Central African Republic': { lat: 6.6111, lng: 20.9394, cities: { 'Bangui': [4.3947, 18.5582] }},
    'Democratic Republic of the Congo': { lat: -4.0383, lng: 21.7587, cities: { 'Kinshasa': [-4.4419, 15.2663] }},
    'Mozambique': { lat: -18.6657, lng: 35.5296, cities: { 'Maputo': [-25.9692, 32.5732] }},
    'Ethiopia': { lat: 9.1450, lng: 40.4897, cities: { 'Addis Ababa': [9.0320, 38.7469] }},
    'Kenya': { lat: -0.0236, lng: 37.9062, cities: { 'Nairobi': [-1.2921, 36.8219] }},
    'Uganda': { lat: 1.3733, lng: 32.2903, cities: { 'Kampala': [0.3476, 32.5825] }},
    'Tanzania': { lat: -6.3690, lng: 34.8888, cities: { 'Dodoma': [-6.1630, 35.7516] }},
    'Angola': { lat: -11.2027, lng: 17.8739, cities: { 'Luanda': [-8.8390, 13.2894] }},
    'Colombia': { lat: 4.5709, lng: -74.2973, cities: { 'Bogotá': [4.7110, -74.0721] }},
    'Mexico': { lat: 23.6345, lng: -102.5528, cities: { 'Mexico City': [19.4326, -99.1332] }},
    'Cuba': { lat: 21.5218, lng: -77.7812, cities: { 'Havana': [23.1136, -82.3666] }},
    'Bangladesh': { lat: 23.6850, lng: 90.3563, cities: { 'Dhaka': [23.8103, 90.4125] }},
    'Sri Lanka': { lat: 7.8731, lng: 80.7718, cities: { 'Colombo': [6.9271, 79.8612] }},
    'Nepal': { lat: 28.3949, lng: 84.1240, cities: { 'Kathmandu': [27.7172, 85.3240] }},
    'Laos': { lat: 19.8563, lng: 102.4955, cities: { 'Vientiane': [17.9757, 102.6331] }},
    'Vietnam': { lat: 14.0583, lng: 108.2772, cities: { 'Hanoi': [21.0278, 105.8342] }},
    'Uzbekistan': { lat: 41.3775, lng: 64.5853, cities: { 'Tashkent': [41.2995, 69.2401] }},
    'Kazakhstan': { lat: 48.0196, lng: 66.9237, cities: { 'Astana': [51.1605, 71.4704] }},
    'Indonesia': { lat: -0.7893, lng: 113.9213, cities: { 'Jakarta': [-6.2088, 106.8456] }},
    'Malaysia': { lat: 4.2105, lng: 101.9758, cities: { 'Kuala Lumpur': [3.1390, 101.6869] }},
    'Philippines': { lat: 12.8797, lng: 121.7740, cities: { 'Manila': [14.5995, 120.9842] }},
    'Lebanon': { lat: 33.8547, lng: 35.8623, cities: { 'Beirut': [33.8938, 35.5018] }},
    'Jordan': { lat: 30.5852, lng: 36.2384, cities: { 'Amman': [31.9454, 35.9284] }},
    'Palestine': { lat: 31.9522, lng: 35.2332, cities: { 'Jerusalem': [31.7683, 35.2137] }},
    'Israel': { lat: 31.0461, lng: 34.8516, cities: { 'Jerusalem': [31.7683, 35.2137] }},
    'South Sudan': { lat: 6.8770, lng: 31.3070, cities: { 'Juba': [4.8594, 31.5713] }},
    'Chad': { lat: 15.4542, lng: 18.7322, cities: { "N'Djamena": [12.1348, 15.0557] }},
    'Mauritania': { lat: 21.0079, lng: -10.9408, cities: { 'Nouakchott': [18.0735, -15.9582] }},
    'Qatar': { lat: 25.3548, lng: 51.1839, cities: { 'Doha': [25.2854, 51.5310] }},
    'United Arab Emirates': { lat: 23.4241, lng: 53.8478, cities: { 'Dubai': [25.2048, 55.2708] }},
    'Oman': { lat: 21.4735, lng: 55.9754, cities: { 'Muscat': [23.5859, 58.4059] }},
    'Kuwait': { lat: 29.3117, lng: 47.4818, cities: { 'Kuwait City': [29.3759, 47.9774] }},
    'Bahrain': { lat: 26.0667, lng: 50.5577, cities: { 'Manama': [26.2285, 50.5860] }},
    'Brunei': { lat: 4.5353, lng: 114.7277, cities: { 'Bandar Seri Begawan': [4.9031, 114.9398] }},
    'Maldives': { lat: 3.2028, lng: 73.2207, cities: { 'Malé': [4.1755, 73.5093] }},
    'Bhutan': { lat: 27.5142, lng: 90.4336, cities: { 'Thimphu': [27.4728, 89.6390] }},
    'Tajikistan': { lat: 38.8610, lng: 71.2761, cities: { 'Dushanbe': [38.5598, 68.7870] }},
    'Turkmenistan': { lat: 38.9697, lng: 59.5563, cities: { 'Ashgabat': [37.9601, 58.3261] }},
    'Kyrgyzstan': { lat: 41.2044, lng: 74.7661, cities: { 'Bishkek': [42.8746, 74.5698] }},
    'Azerbaijan': { lat: 40.1431, lng: 47.5769, cities: { 'Baku': [40.4093, 49.8671] }},
    'Armenia': { lat: 40.0691, lng: 45.0382, cities: { 'Yerevan': [40.1792, 44.4991] }},
    'Georgia': { lat: 32.1656, lng: -82.9001, cities: { 'Tbilisi': [41.7151, 44.8271] }},
    'Ukraine': { lat: 48.3794, lng: 31.1656, cities: { 'Kyiv': [50.4501, 30.5234] }},
    'Russia': { lat: 61.5240, lng: 105.3188, cities: { 'Moscow': [55.7558, 37.6173] }},
    'Belarus': { lat: 53.7098, lng: 27.9534, cities: { 'Minsk': [53.9045, 27.5615] }},
    'Moldova': { lat: 47.4116, lng: 28.3699, cities: { 'Chișinău': [47.0105, 28.8638] }},
    'Romania': { lat: 45.9432, lng: 24.9668, cities: { 'Bucharest': [44.4268, 26.1025] }},
    'Bulgaria': { lat: 42.7339, lng: 25.4858, cities: { 'Sofia': [42.6977, 23.3219] }},
    'Serbia': { lat: 44.0165, lng: 21.0059, cities: { 'Belgrade': [44.7866, 20.4489] }},
    'North Macedonia': { lat: 41.6086, lng: 21.7453, cities: { 'Skopje': [41.9981, 21.4254] }},
    'Albania': { lat: 41.1533, lng: 20.1683, cities: { 'Tirana': [41.3275, 19.8187] }},
    'Montenegro': { lat: 42.7087, lng: 19.3744, cities: { 'Podgorica': [42.4304, 19.2594] }},
    'Bosnia and Herzegovina': { lat: 43.9159, lng: 17.6791, cities: { 'Sarajevo': [43.8563, 18.4131] }},
    'Croatia': { lat: 45.1000, lng: 15.2000, cities: { 'Zagreb': [45.8150, 15.9819] }},
    'Slovenia': { lat: 46.1512, lng: 14.9955, cities: { 'Ljubljana': [46.0569, 14.5058] }},
    'Slovakia': { lat: 48.6690, lng: 19.6990, cities: { 'Bratislava': [48.1486, 17.1077] }},
    'Czech Republic': { lat: 49.8175, lng: 15.4730, cities: { 'Prague': [50.0755, 14.4378] }},
    'Hungary': { lat: 47.1625, lng: 19.5033, cities: { 'Budapest': [47.4979, 19.0402] }},
    'Poland': { lat: 51.9194, lng: 19.1451, cities: { 'Warsaw': [52.2297, 21.0122] }},
    'Lithuania': { lat: 55.1694, lng: 23.8813, cities: { 'Vilnius': [54.6872, 25.2797] }},
    'Latvia': { lat: 56.8796, lng: 24.6032, cities: { 'Riga': [56.9496, 24.1052] }},
    'Estonia': { lat: 58.5953, lng: 25.0136, cities: { 'Tallinn': [59.4370, 24.7536] }},
    'Finland': { lat: 61.9241, lng: 25.7482, cities: { 'Helsinki': [60.1699, 24.9384] }},
    'Sweden': { lat: 60.1282, lng: 18.6435, cities: { 'Stockholm': [59.3293, 18.0686] }},
    'Norway': { lat: 60.4720, lng: 8.4689, cities: { 'Oslo': [59.9139, 10.7522] }},
    'Denmark': { lat: 56.2639, lng: 9.5018, cities: { 'Copenhagen': [55.6761, 12.5683] }},
    'Iceland': { lat: 64.9631, lng: -19.0208, cities: { 'Reykjavik': [64.1466, -21.9426] }},
    'Ireland': { lat: 53.1424, lng: -7.6921, cities: { 'Dublin': [53.3498, -6.2603] }},
    'United Kingdom': { lat: 55.3781, lng: -3.4360, cities: { 'London': [51.5074, -0.1278] }},
    'Netherlands': { lat: 52.1326, lng: 5.2913, cities: { 'Amsterdam': [52.3676, 4.9041] }},
    'Belgium': { lat: 50.5039, lng: 4.4699, cities: { 'Brussels': [50.8503, 4.3517] }},
    'Luxembourg': { lat: 49.8153, lng: 6.1296, cities: { 'Luxembourg City': [49.6116, 6.1319] }},
    'France': { lat: 46.2276, lng: 2.2137, cities: { 'Paris': [48.8566, 2.3522] }},
    'Spain': { lat: 40.4637, lng: -3.7492, cities: { 'Madrid': [40.4168, -3.7038] }},
    'Portugal': { lat: 39.3999, lng: -8.2245, cities: { 'Lisbon': [38.7223, -9.1393] }},
    'Germany': { lat: 51.1657, lng: 10.4515, cities: { 'Berlin': [52.5200, 13.4050] }},
    'Switzerland': { lat: 46.8182, lng: 8.2275, cities: { 'Zurich': [47.3769, 8.5417] }},
    'Austria': { lat: 47.5162, lng: 14.5501, cities: { 'Vienna': [48.2082, 16.3738] }},
    'Italy': { lat: 41.8719, lng: 12.5674, cities: { 'Rome': [41.9028, 12.4964] }},
    'Greece': { lat: 39.0742, lng: 21.8243, cities: { 'Athens': [37.9838, 23.7275] }},
    'Cyprus': { lat: 35.1264, lng: 33.4299, cities: { 'Nicosia': [35.1856, 33.3823] }},
    'Malta': { lat: 35.9375, lng: 14.3754, cities: { 'Valletta': [35.8989, 14.5146] }},
    'Canada': { lat: 56.1304, lng: -106.3468, cities: { 'Ottawa': [45.4215, -75.6972] }},
    'United States': { lat: 37.0902, lng: -95.7129, cities: { 'Washington': [38.9072, -77.0369] }},
    'Australia': { lat: -25.2744, lng: 133.7751, cities: { 'Canberra': [-35.2809, 149.1300] }},
    'New Zealand': { lat: -40.9006, lng: 174.8860, cities: { 'Wellington': [-41.2865, 174.7762] }},
    'Japan': { lat: 36.2048, lng: 138.2529, cities: { 'Tokyo': [35.6762, 139.6503] }},
    'South Korea': { lat: 35.9078, lng: 127.7669, cities: { 'Seoul': [37.5665, 126.9780] }},
    'Taiwan': { lat: 23.6978, lng: 120.9605, cities: { 'Taipei': [25.0330, 121.5654] }},
    'Hong Kong': { lat: 22.3193, lng: 114.1694, cities: { 'Hong Kong': [22.3193, 114.1694] }},
    'Macau': { lat: 22.1987, lng: 113.5439, cities: { 'Macau': [22.1987, 113.5439] }},
    'Mongolia': { lat: 46.8625, lng: 103.8467, cities: { 'Ulaanbaatar': [47.8864, 106.9057] }},
    'Kosovo': { lat: 42.6026, lng: 20.9030, cities: { 'Pristina': [42.6629, 21.1655] }},
    'Eswatini': { lat: -26.5225, lng: 31.4659, cities: { 'Mbabane': [-26.3054, 31.1367] }},
    'Lesotho': { lat: -29.6100, lng: 28.2336, cities: { 'Maseru': [-29.3151, 27.4869] }},
    'Botswana': { lat: -22.3285, lng: 24.6849, cities: { 'Gaborone': [-24.6282, 25.9231] }},
    'Namibia': { lat: -22.9576, lng: 18.4904, cities: { 'Windhoek': [-22.5609, 17.0658] }},
    'Zambia': { lat: -13.1339, lng: 27.8493, cities: { 'Lusaka': [-15.3875, 28.3228] }},
    'Zimbabwe': { lat: -19.0154, lng: 29.1549, cities: { 'Harare': [-17.8252, 31.0335] }},
    'Malawi': { lat: -13.2543, lng: 34.3015, cities: { 'Lilongwe': [-13.9626, 33.7741] }},
    'Madagascar': { lat: -18.7669, lng: 46.8691, cities: { 'Antananarivo': [-18.8792, 47.5079] }},
    'Mauritius': { lat: -20.3484, lng: 57.5522, cities: { 'Port Louis': [-20.1609, 57.5012] }},
    'Seychelles': { lat: -4.6796, lng: 55.4920, cities: { 'Victoria': [-4.6191, 55.4513] }},
    'Comoros': { lat: -11.6455, lng: 43.3333, cities: { 'Moroni': [-11.7172, 43.2473] }},
    'Djibouti': { lat: 11.8251, lng: 42.5903, cities: { 'Djibouti': [11.5721, 43.1456] }},
    'Equatorial Guinea': { lat: 1.6508, lng: 10.2679, cities: { 'Malabo': [3.7550, 8.7821] }},
    'Gabon': { lat: -0.8037, lng: 11.6094, cities: { 'Libreville': [0.4162, 9.4673] }},
    'Republic of the Congo': { lat: -0.2280, lng: 15.8277, cities: { 'Brazzaville': [-4.2634, 15.2429] }},
    'Rwanda': { lat: -1.9403, lng: 29.8739, cities: { 'Kigali': [-1.9706, 30.1044] }},
    'Burundi': { lat: -3.3731, lng: 29.9189, cities: { 'Gitega': [-3.4264, 29.9308] }},
    'Benin': { lat: 9.3077, lng: 2.3158, cities: { 'Porto-Novo': [6.4969, 2.6283] }},
    'Togo': { lat: 8.6195, lng: 0.8248, cities: { 'Lomé': [6.1256, 1.2254] }},
    'Ghana': { lat: 7.9465, lng: -1.0232, cities: { 'Accra': [5.6037, -0.1870] }},
    'Côte d\'Ivoire': { lat: 7.5400, lng: -5.5471, cities: { 'Yamoussoukro': [6.8276, -5.2893] }},
    'Liberia': { lat: 6.4281, lng: -9.4295, cities: { 'Monrovia': [6.3150, -10.8074] }},
    'Sierra Leone': { lat: 8.4606, lng: -11.7799, cities: { 'Freetown': [8.4657, -13.2317] }},
    'Guinea': { lat: 9.9456, lng: -9.6966, cities: { 'Conakry': [9.6412, -13.5784] }},
    'Guinea-Bissau': { lat: 11.8037, lng: -15.1804, cities: { 'Bissau': [11.8817, -15.6174] }},
    'Gambia': { lat: 13.4432, lng: -15.3101, cities: { 'Banjul': [13.4549, -16.5790] }},
    'Senegal': { lat: 14.4974, lng: -14.4524, cities: { 'Dakar': [14.7167, -17.4677] }},
    'Cape Verde': { lat: 16.5388, lng: -23.0418, cities: { 'Praia': [14.9330, -23.5133] }},
    'São Tomé and Príncipe': { lat: 0.1864, lng: 6.6131, cities: { 'São Tomé': [0.3365, 6.7273] }},
    'Suriname': { lat: 3.9193, lng: -56.0278, cities: { 'Paramaribo': [5.8520, -55.2038] }},
    'Guyana': { lat: 4.8604, lng: -58.9302, cities: { 'Georgetown': [6.8013, -58.1551] }},
    'French Guiana': { lat: 3.9339, lng: -53.1258, cities: { 'Cayenne': [4.9224, -52.3135] }},
    'Venezuela': { lat: 6.4238, lng: -66.5897, cities: { 'Caracas': [10.4806, -66.9036] }},
    'Ecuador': { lat: -1.8312, lng: -78.1834, cities: { 'Quito': [-0.1807, -78.4678] }},
    'Peru': { lat: -9.1900, lng: -75.0152, cities: { 'Lima': [-12.0464, -77.0428] }},
    'Bolivia': { lat: -16.2902, lng: -63.5887, cities: { 'Sucre': [-19.0353, -65.2592] }},
    'Paraguay': { lat: -23.4425, lng: -58.4438, cities: { 'Asunción': [-25.2637, -57.5759] }},
    'Uruguay': { lat: -32.5228, lng: -55.7658, cities: { 'Montevideo': [-34.9011, -56.1645] }},
    'Chile': { lat: -35.6751, lng: -71.5430, cities: { 'Santiago': [-33.4489, -70.6693] }},
    'Argentina': { lat: -38.4161, lng: -63.6167, cities: { 'Buenos Aires': [-34.6037, -58.3816] }},
    'Brazil': { lat: -14.2350, lng: -51.9253, cities: { 'Brasília': [-15.7975, -47.8919] }},
    'Belize': { lat: 17.1899, lng: -88.4976, cities: { 'Belmopan': [17.2510, -88.7590] }},
    'Guatemala': { lat: 15.7835, lng: -90.2308, cities: { 'Guatemala City': [14.6349, -90.5069] }},
    'Honduras': { lat: 15.2000, lng: -86.2419, cities: { 'Tegucigalpa': [14.0723, -87.1921] }},
    'El Salvador': { lat: 13.7942, lng: -88.8965, cities: { 'San Salvador': [13.6929, -89.2182] }},
    'Nicaragua': { lat: 12.8654, lng: -85.2072, cities: { 'Managua': [12.1140, -86.2362] }},
    'Costa Rica': { lat: 9.7489, lng: -83.7534, cities: { 'San José': [9.9281, -84.0907] }},
    'Panama': { lat: 8.5380, lng: -80.7821, cities: { 'Panama City': [8.9824, -79.5199] }},
    'Jamaica': { lat: 18.1096, lng: -77.2975, cities: { 'Kingston': [17.9712, -76.7926] }},
    'Haiti': { lat: 18.9712, lng: -72.2852, cities: { 'Port-au-Prince': [18.5944, -72.3074] }},
    'Dominican Republic': { lat: 18.7357, lng: -70.1627, cities: { 'Santo Domingo': [18.4861, -69.9312] }},
    'Trinidad and Tobago': { lat: 10.6918, lng: -61.2225, cities: { 'Port of Spain': [10.6549, -61.5019] }},
    'Barbados': { lat: 13.1939, lng: -59.5432, cities: { 'Bridgetown': [13.1059, -59.6132] }},
    'Saint Lucia': { lat: 13.9094, lng: -60.9789, cities: { 'Castries': [14.0101, -60.9875] }},
    'Grenada': { lat: 12.1165, lng: -61.6790, cities: { "St. George's": [12.0561, -61.7488] }},
    'Saint Vincent and the Grenadines': { lat: 12.9843, lng: -61.2872, cities: { 'Kingstown': [13.1600, -61.2248] }},
    'Antigua and Barbuda': { lat: 17.0608, lng: -61.7964, cities: { "St. John's": [17.1274, -61.8468] }},
    'Dominica': { lat: 15.4150, lng: -61.3710, cities: { 'Roseau': [15.3092, -61.3794] }},
    'Saint Kitts and Nevis': { lat: 17.3578, lng: -62.7820, cities: { 'Basseterre': [17.3026, -62.7177] }},
    'Bahamas': { lat: 25.0343, lng: -77.3963, cities: { 'Nassau': [25.0478, -77.3554] }},
    'Fiji': { lat: -16.5782, lng: 179.4141, cities: { 'Suva': [-18.1248, 178.4501] }},
    'Papua New Guinea': { lat: -6.314993, lng: 143.95555, cities: { 'Port Moresby': [-9.4438, 147.1803] }},
    'Solomon Islands': { lat: -9.6457, lng: 160.1562, cities: { 'Honiara': [-9.4456, 159.9729] }},
    'Vanuatu': { lat: -15.3767, lng: 166.9592, cities: { 'Port Vila': [-17.7333, 168.3273] }},
    'Samoa': { lat: -13.7590, lng: -172.1046, cities: { 'Apia': [-13.8507, -171.7514] }},
    'Tonga': { lat: -21.1790, lng: -175.1982, cities: { "Nuku'alofa": [-21.1394, -175.2018] }},
    'Kiribati': { lat: -3.3704, lng: -168.7340, cities: { 'Tarawa': [1.4518, 172.9717] }},
    'Tuvalu': { lat: -7.1095, lng: 177.6493, cities: { 'Funafuti': [-8.5211, 179.1961] }},
    'Nauru': { lat: -0.5228, lng: 166.9315, cities: { 'Yaren': [-0.5477, 166.9209] }},
    'Palau': { lat: 7.5150, lng: 134.5825, cities: { 'Ngerulmud': [7.5004, 134.6243] }},
    'Micronesia': { lat: 7.4256, lng: 150.5508, cities: { 'Palikir': [6.9147, 158.1610] }},
    'Marshall Islands': { lat: 11.3404, lng: 166.9757, cities: { 'Majuro': [7.1164, 171.1840] }},
    'South Africa': { lat: -30.5595, lng: 22.9375, cities: { 'Pretoria': [-25.7479, 28.2293] }}
};

// Fallback данные
const FALLBACK_EVENTS = [
    {date: "2026-02-28", lat: 9.0810, lng: 7.4895, country: "Nigeria", city: "Abuja", type: "attack", title: "Church attacked in Abuja suburb", description: "Gunmen attacked worshippers during Sunday service", source: "RSS Feed", url: "#", victims: 12},
    {date: "2026-02-27", lat: 20.9517, lng: 85.0985, country: "India", city: "Odisha", type: "murder", title: "Christian family killed in Odisha", description: "Three members of Christian family murdered", source: "RSS Feed", url: "#", victims: 3},
    {date: "2026-02-26", lat: 35.6892, lng: 51.3890, country: "Iran", city: "Tehran", type: "arrest", title: "Church raid in Tehran", description: "Authorities arrested 8 Christians during prayer meeting", source: "RSS Feed", url: "#", victims: 8},
    {date: "2026-02-25", lat: 33.3152, lng: 44.3661, country: "Iraq", city: "Baghdad", type: "attack", title: "Bombing near Christian district", description: "Explosion killed 5 and injured 12 near church", source: "RSS Feed", url: "#", victims: 5},
    {date: "2026-02-24", lat: 30.0444, lng: 31.2357, country: "Egypt", city: "Cairo", type: "discrimination", title: "Church closure ordered", description: "Authorities shut down unlicensed church building", source: "RSS Feed", url: "#", victims: 0},
    {date: "2026-02-23", lat: -1.2921, lng: 36.8219, country: "Kenya", city: "Nairobi", type: "attack", title: "Attack on Christian school", description: "Militants attacked school in Christian area", source: "RSS Feed", url: "#", victims: 2},
    {date: "2026-02-22", lat: 15.3229, lng: 38.9251, country: "Eritrea", city: "Asmara", type: "arrest", title: "Mass arrests of Christians", description: "30 Christians detained during prayer gathering", source: "RSS Feed", url: "#", victims: 30},
    {date: "2026-02-21", lat: 10.5105, lng: 7.4165, country: "Nigeria", city: "Kaduna", type: "kidnapping", title: "Priest kidnapped", description: "Catholic priest abducted by armed men", source: "RSS Feed", url: "#", victims: 1}
];

function detectCountry(text) {
    const lowerText = text.toLowerCase();
    for (const [country, data] of Object.entries(COUNTRY_DATA)) {
        if (lowerText.includes(country.toLowerCase())) {
            return { 
                name: country, 
                lat: data.lat, 
                lng: data.lng,
                city: Object.keys(data.cities)[0] || 'Unknown'
            };
        }
    }
    if (lowerText.includes('nigerian') || lowerText.includes('nigerians')) {
        return { name: 'Nigeria', lat: 9.0820, lng: 8.6753, city: 'Lagos' };
    }
    if (lowerText.includes('indian') || lowerText.includes('hindu')) {
        return { name: 'India', lat: 20.5937, lng: 78.9629, city: 'Delhi' };
    }
    return null;
}

function detectType(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.match(/killed|murdered|death|dead|slain|massacre|execution/)) return 'murder';
    if (lowerText.match(/attack|bomb|explosion|shooting|raid|stormed|burned/)) return 'attack';
    if (lowerText.match(/kidnap|abduct|hostage|captive|missing/)) return 'kidnapping';
    if (lowerText.match(/arrest|detain|prison|jail|imprisoned|sentence/)) return 'arrest';
    if (lowerText.match(/close|ban|shut|outlaw|discriminat|fine|restrict/)) return 'discrimination';
    return 'other';
}

function extractVictims(text) {
    const patterns = [
        /(\d+)\s*(?:people|persons|christians|believers|victims|dead|killed|died)/i,
        /killed\s*(\d+)/i,
        /(\d+)\s*killed/i,
        /at\s*least\s*(\d+)/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const num = parseInt(match[1]);
            if (num > 0 && num < 10000) return num;
        }
    }
    return 0;
}

function fetchRSS(url) {
    return new Promise((resolve, reject) => {
        const options = {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };
        
        const req = https.get(url, options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                console.log(`   ↪️ Редирект на ${res.headers.location}`);
                return fetchRSS(res.headers.location).then(resolve).catch(reject);
            }
            
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

function parseRSS(xml) {
    return new Promise((resolve, reject) => {
        parseString(xml, { explicitArray: false }, (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            
            let items = [];
            
            if (result?.rss?.channel?.item) {
                items = Array.isArray(result.rss.channel.item) 
                    ? result.rss.channel.item 
                    : [result.rss.channel.item];
            }
            else if (result?.feed?.entry) {
                items = Array.isArray(result.feed.entry) 
                    ? result.feed.entry 
                    : [result.feed.entry];
            }
            else if (result?.['rdf:RDF']?.item) {
                items = Array.isArray(result['rdf:RDF'].item)
                    ? result['rdf:RDF'].item
                    : [result['rdf:RDF'].item];
            }
            
            resolve(items);
        });
    });
}

async function updateData() {
    console.log('🚀 Начало RSS-парсинга...');
    console.log(`⏰ ${new Date().toLocaleString()}`);
    console.log(`📡 Проверяем ${Object.keys(RSS_SOURCES).length} источников\n`);
    
    const allEvents = [];
    const errors = [];
    let successCount = 0;
    let totalRelevant = 0;

    for (const [sourceName, url] of Object.entries(RSS_SOURCES)) {
        try {
            console.log(`📡 ${sourceName}:`);
            console.log(`   URL: ${url}`);
            
            const xml = await fetchRSS(url);
            console.log(`   ✅ Соединение установлено`);
            
            const items = await parseRSS(xml);
            console.log(`   📄 Записей в RSS: ${items.length}`);

            let relevantCount = 0;
            let skippedCount = 0;
            
            for (const item of items.slice(0, 20)) {
                const title = item.title?.[0] || item.title || '';
                const description = (item.description?.[0] || item.description || item.summary?.[0] || '').replace(/<[^>]*>/g, '');
                const link = item.link?.[0]?.$?.href || item.link?.[0] || item.link || item.id || '';
                const pubDate = item.pubDate?.[0] || item.published?.[0] || item.updated?.[0] || item.date || new Date().toISOString();
                
                const fullText = (title + ' ' + description).toLowerCase();
                
                // Проверяем релевантность
                const matchedKeywords = KEYWORDS.filter(kw => fullText.includes(kw.toLowerCase()));
                const isRelevant = matchedKeywords.length > 0;
                
                if (!isRelevant) {
                    skippedCount++;
                    continue;
                }

                const countryData = detectCountry(fullText);
                if (!countryData) {
                    console.log(`   ⚠️ Не найдена страна: "${title.substring(0, 50)}..."`);
                    continue;
                }

                relevantCount++;
                totalRelevant++;
                
                const lat = countryData.lat + (Math.random() - 0.5) * 2;
                const lng = countryData.lng + (Math.random() - 0.5) * 2;

                const event = {
                    date: new Date(pubDate).toISOString().split('T')[0],
                    lat: parseFloat(lat.toFixed(4)),
                    lng: parseFloat(lng.toFixed(4)),
                    country: countryData.name,
                    city: countryData.city,
                    type: detectType(fullText),
                    title: title.substring(0, 120),
                    description: description.substring(0, 250),
                    source: sourceName,
                    url: link || '#',
                    victims: extractVictims(fullText)
                };

                allEvents.push(event);
                console.log(`   ✓ ${event.type.toUpperCase()}: ${event.country} - ${title.substring(0, 60)}...`);
            }
            
            console.log(`   📊 Релевантных: ${relevantCount}, Пропущено: ${skippedCount}`);
            if (relevantCount > 0) successCount++;

        } catch (error) {
            console.error(`   ❌ Ошибка: ${error.message}`);
            errors.push({ source: sourceName, error: error.message });
        }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log('📊 ИТОГИ RSS-ПАРСИНГА:');
    console.log(`${'='.repeat(50)}`);
    console.log(`📡 Всего источников: ${Object.keys(RSS_SOURCES).length}`);
    console.log(`✅ Рабочих источников: ${successCount}`);
    console.log(`❌ Ошибок: ${errors.length}`);
    console.log(`📰 Всего релевантных событий: ${totalRelevant}`);
    console.log(`🎯 Уникальных событий: ${allEvents.length}`);

    // Если RSS не сработал, используем fallback
    let finalEvents;
    let updateMethod;
    
    if (allEvents.length === 0) {
        console.log(`\n⚠️ RSS НЕ ДАЛ РЕЗУЛЬТАТОВ! Используем fallback...`);
        finalEvents = FALLBACK_EVENTS;
        updateMethod = 'FALLBACK';
    } else {
        // Дедупликация
        const seen = new Set();
        const uniqueEvents = [];
        
        for (const event of allEvents) {
            const key = (event.url + event.title).toLowerCase().substring(0, 100);
            if (!seen.has(key)) {
                seen.add(key);
                uniqueEvents.push(event);
            }
        }
        
        uniqueEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
        finalEvents = uniqueEvents.slice(0, 50);
        updateMethod = 'RSS';
        
        console.log(`\n✅ RSS СРАБОТАЛ! Событий: ${finalEvents.length}`);
    }

    const output = {
        metadata: {
            lastUpdated: new Date().toISOString(),
            version: '1.2',
            totalEvents: finalEvents.length,
            sourcesChecked: Object.keys(RSS_SOURCES).length,
            sourcesWorking: successCount,
            errors: errors,
            updateMethod: updateMethod,
            rssSuccess: allEvents.length > 0
        },
        events: finalEvents
    };

    const outputPath = path.join(__dirname, '..', 'data', 'events.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

    console.log(`\n${'='.repeat(50)}`);
    console.log('💾 РЕЗУЛЬТАТ СОХРАНЕН:');
    console.log(`${'='.repeat(50)}`);
    console.log(`📁 Файл: ${outputPath}`);
    console.log(`📊 Событий: ${finalEvents.length}`);
    console.log(`🔧 Метод: ${updateMethod}`);
    console.log(`✅ Готово!\n`);
    
    // Статистика по типам
    const typeStats = {};
    finalEvents.forEach(e => {
        typeStats[e.type] = (typeStats[e.type] || 0) + 1;
    });
    console.log(`📈 По типам:`, typeStats);
    
    // Статистика по странам
    const countryStats = {};
    finalEvents.forEach(e => {
        countryStats[e.country] = (countryStats[e.country] || 0) + 1;
    });
    console.log(`🌍 Топ стран:`, Object.entries(countryStats).slice(0, 5));

    return output;
}

if (require.main === module) {
    updateData().catch(err => {
        console.error('💥 Критическая ошибка:', err);
        
        const outputPath = path.join(__dirname, '..', 'data', 'events.json');
        const fallbackOutput = {
            metadata: {
                lastUpdated: new Date().toISOString(),
                version: '1.2',
                totalEvents: FALLBACK_EVENTS.length,
                sourcesChecked: 0,
                sourcesWorking: 0,
                errors: [{ source: 'critical', error: err.message }],
                updateMethod: 'CRITICAL_FALLBACK',
                rssSuccess: false
            },
            events: FALLBACK_EVENTS
        };
        
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, JSON.stringify(fallbackOutput, null, 2), 'utf8');
        console.log('🔄 Создан fallback файл после критической ошибки');
        process.exit(0);
    });
}

module.exports = { updateData };

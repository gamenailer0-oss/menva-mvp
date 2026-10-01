// Every meme slide, one entry per PNG. make.mjs renders them; series-memes.json schedules them.
// Rules: no emoji, no em dashes, no brands or real people, no prices, nothing about the product before 5 Oct.
// Characters: Jumbo (the menu-photo burger who lies about his size), and the Khana Group:
// Ayesha (turns into Madam), Sara, Hamza (over-orders, "main share kar lunga"), Zain (decides nothing).
export const MEMES = [
  // ---------- Pre-launch: tease only ----------
  { file: 'nokia-01-kachori', tpl: 'nokia', count: '96/1', text: 'ek kachori\ndo samosa\nmenu photo ka\nkya bharosa :-)' },

  { file: 'jumbo-01-meet-1', tpl: 'jumbo', bg: 'cream', n: '1/2', kick: 'Meet Jumbo', h: 'Menu pe:', mood: 'flex', size: 820, stageY: -40,
    bubble: { x: 450, y: 290, t: 'Main *12 inch* ka hun. Do log kha sakte hain.' } },
  { file: 'jumbo-01-meet-2', tpl: 'jumbo', bg: 'chili', n: '2/2', kick: 'Meet Jumbo', h: 'Plate pe:', mood: 'caught', size: 300, stageY: 130,
    bubble: { x: 470, y: 690, t: 'Camera angle tha bhai.' } },

  // ---------- Week 1, 1 pm memes ----------
  { file: 'jumbo-02-launch', tpl: 'jumbo', bg: 'orange', h: 'Jumbo jab pata chale ke ab log order se *pehle* dish table pe dekh sakte hain', hsize: 78, mood: 'caught', size: 640 },

  { file: 'tier-01-excuses', tpl: 'tier', h: 'Dinner ke sab se bare jhooth',
    rows: [['S', '"Bas halka sa kuch lunga"'], ['A', '"Main share kar lunga"'], ['B', '"Mera to diet hai" (fries mangwata hai)'], ['C', '"Jo tum log lo, wohi theek hai"'], ['F', '"Photo mein to bara lag raha tha"']] },

  { file: 'notes-01-trust', tpl: 'notes', date: 'Wednesday, 7 October', h: 'Cheezein jin pe bharosa kiya, aur pachtaya',
    items: ['~~Weather app~~', '~~"5 minute mein pohanch raha hun"~~', '~~"Halki si mirch hai"~~', '~~Menu ki photo~~', 'Apni aankhein'],
    end: 'Ab dish order se pehle table pe.' },

  { file: 'jumbo-03-thursday', tpl: 'jumbo', bg: 'ink', kick: 'wake up babe', h: "it's *Jhoota Thursday*", sub: 'Is hafte Jumbo ka jhooth: "Serves 2".\nSach: 2 log dekh sakte hain.', mood: 'smug', size: 640 },

  { file: 'text-01-kuch-bhi', tpl: 'text', bg: 'mustard', h: 'POV: tum ne "kuch bhi mangwa lo" bola', sub: 'aur ab poori table tumhe aise dekh rahi hai jaise bill tum doge.', hsize: 96 },

  { file: 'nokia-02-naan', tpl: 'nokia', count: '84/1', text: 'roses are red\nnaan hai garam\nmenu ki photo\nthori besharam :-)' },

  { file: 'bingo-01-sunday', tpl: 'bingo', h: 'Sunday family dinner bingo',
    cells: ['Abbu: "bill main dunga"', 'Chacha: "ye to ghar pe ban sakta tha"', '"Wohi jo pichli dafa liya tha"', 'Waiter ko teen dafa bulaya', 'Ammi: "ghar chalo, der ho gayi"', 'Cousin pehle photo leta hai', 'Kisi ne photo dekh ke order kiya', '"Itna sa?"', 'Bacha fries pe lar raha hai'],
    x: [0, 6, 7] },

  // ---------- Week 1, 5 pm Khana Group chats ----------
  { file: 'chat-01-launch-1', tpl: 'chat', n: '1/2', me: 'zain', msgs: [
    { sys: 'Monday' },
    { from: 'zain', t: 'guys aaj dinner?', at: '6:02 pm' },
    { from: 'sara', t: 'haan but last time wala scene nahi chahiye', at: '6:03 pm' },
    { from: 'hamza', t: 'kaunsa scene', at: '6:03 pm' },
    { from: 'sara', t: 'jab tum ne photo dekh ke *teen platter* mangwa liye the', at: '6:04 pm' },
    { from: 'ayesha', t: 'aur bill chaar mein split hua', at: '6:04 pm' },
    { from: 'hamza', id: 'lie', t: 'photo mein chhote lag rahe the', at: '6:05 pm' }],
    pen: [{ id: 'lie', note: 'jhooth', side: 'right' }] },
  { file: 'chat-01-launch-2', tpl: 'chat', n: '2/2', me: 'zain', msgs: [
    { from: 'hamza', t: 'photo mein chhote lag rahe the', at: '6:05 pm' },
    { from: 'ayesha', id: 'madam', t: 'Hamza. Class ke baad milna.', at: '6:05 pm' },
    { from: 'hamza', t: 'ye Ayesha hai ya Madam', at: '6:06 pm' },
    { from: 'sara', t: 'chashma pehen liya hai usne, bhaago', at: '6:06 pm' },
    { from: 'zain', t: 'main to chup hun', at: '6:06 pm' },
    { from: 'ayesha', t: 'Zain tum bhi. Murga.', at: '6:07 pm' }],
    pen: [{ id: 'madam', note: 'Madam mode on', side: 'right' }] },

  { file: 'chat-02-plan-1', tpl: 'chat', n: '1/2', me: 'sara', msgs: [
    { sys: 'Tuesday' },
    { from: 'zain', t: 'kahan chalein?', at: '7:00 pm' },
    { from: 'hamza', t: 'kahin bhi', at: '7:01 pm' },
    { from: 'sara', t: 'kahin bhi nahi hota Hamza', at: '7:01 pm' },
    { from: 'zain', t: 'acha to tum batao', at: '7:02 pm' },
    { from: 'sara', t: 'main ne pichli dafa bataya tha', at: '7:02 pm' },
    { sys: '47 unread messages' },
    { from: 'hamza', id: 'late', t: 'guys 9:40 ho gaye hain', at: '9:40 pm' }],
    pen: [{ id: 'late', note: '2 ghante 40 minute', side: 'left' }] },
  { file: 'chat-02-plan-2', tpl: 'chat', n: '2/2', me: 'sara', msgs: [
    { from: 'ayesha', t: 'Final. Main decide kar rahi hun.', at: '9:41 pm' },
    { from: 'ayesha', t: 'Koi objection?', at: '9:41 pm' },
    { from: 'hamza', id: 'obj', t: 'objection', at: '9:41 pm' },
    { from: 'ayesha', t: 'Overruled.', at: '9:41 pm' },
    { from: 'zain', t: 'ye democracy nahi hai', at: '9:42 pm' },
    { from: 'ayesha', t: 'Bilkul nahi hai. Gaari mein baitho.', at: '9:42 pm' }],
    pen: [{ id: 'obj', note: 'bahadur', side: 'right' }] },

  { file: 'chat-03-photo-1', tpl: 'chat', n: '1/2', me: 'zain', msgs: [
    { sys: 'Wednesday' },
    { from: 'sara', t: 'ye dekho kitna bara hai', at: '8:10 pm' },
    { from: 'sara', t: '[photo] Jumbo Burger', at: '8:10 pm' },
    { from: 'zain', id: 'ph', t: 'Sara ye photo hai, plate nahi', at: '8:11 pm' },
    { from: 'hamza', t: 'main iske liye 40 minute drive karunga', at: '8:11 pm' },
    { from: 'ayesha', t: 'Hamza tum pichli dafa bhi yehi bole the', at: '8:12 pm' }],
    pen: [{ id: 'ph', note: 'genius', side: 'left' }] },
  { file: 'chat-03-photo-2', tpl: 'chat', n: '2/2', me: 'zain', msgs: [
    { from: 'hamza', t: 'is dafa alag hoga', at: '8:12 pm' },
    { from: 'ayesha', id: 'scan', t: 'Table pe QR scan karo. Dish order se pehle table pe dekho. Phir order.', at: '8:13 pm' },
    { from: 'sara', t: 'ye kab se ho raha hai', at: '8:13 pm' },
    { from: 'ayesha', t: 'Jab se tum log photo pe bharosa karna band karoge.', at: '8:14 pm' },
    { from: 'hamza', t: 'phir bhi do mangwaunga', at: '8:14 pm' }],
    pen: [{ id: 'scan', note: 'notes bana lo', side: 'right' }] },

  { file: 'chat-04-share-1', tpl: 'chat', n: '1/2', me: 'ayesha', msgs: [
    { sys: 'Thursday' },
    { from: 'hamza', t: 'main fries nahi lunga', at: '9:00 pm' },
    { from: 'hamza', id: 'share', t: 'tum logon se share kar lunga', at: '9:00 pm' },
    { from: 'sara', t: 'Hamza ne aaj tak share kiya hai?', at: '9:01 pm' },
    { from: 'zain', t: 'ek dafa 2019 mein, ghalti se', at: '9:01 pm' }],
    pen: [{ id: 'share', note: 'famous last words', side: 'right' }] },
  { file: 'chat-04-share-2', tpl: 'chat', n: '2/2', me: 'ayesha', msgs: [
    { sys: '25 minute baad' },
    { from: 'sara', t: 'meri fries kahan gayi', at: '9:26 pm' },
    { from: 'zain', t: 'meri bhi', at: '9:26 pm' },
    { from: 'hamza', id: 'tax', t: 'sharing tax', at: '9:27 pm' },
    { from: 'ayesha', t: 'Hamza. Kal se tum apni plate laoge. Aur pehle dekh ke order karoge kitni hai.', at: '9:28 pm' }],
    pen: [{ id: 'tax', note: 'ye koi tax nahi hota', side: 'left' }] },

  { file: 'chat-05-bill-1', tpl: 'chat', n: '1/2', me: 'sara', msgs: [
    { sys: 'Friday' },
    { from: 'zain', t: 'bill aa gaya', at: '11:10 pm' },
    { from: 'zain', t: 'chaar mein barabar?', at: '11:10 pm' },
    { from: 'hamza', t: 'haan bilkul', at: '11:10 pm' },
    { from: 'sara', id: 'water', t: 'main ne sirf pani piya tha', at: '11:11 pm' },
    { from: 'ayesha', t: 'aur meri plate se chaar fries', at: '11:11 pm' }],
    pen: [{ id: 'water', note: 'sach', side: 'left' }] },
  { file: 'chat-05-bill-2', tpl: 'chat', n: '2/2', me: 'sara', msgs: [
    { from: 'hamza', t: 'chaar fries ka bhi hisaab?', at: '11:12 pm' },
    { from: 'ayesha', t: 'Fries gin ke nahi, tumhari plates gin ke.', at: '11:12 pm' },
    { from: 'ayesha', id: 'three', t: 'Teen.', at: '11:12 pm' },
    { from: 'zain', t: 'main to bas wohi pay karunga jo maine dekh ke order kiya tha', at: '11:13 pm' },
    { from: 'hamza', t: 'maine bhi dekh ke kiya tha', at: '11:13 pm' },
    { from: 'sara', t: 'photo dekh ke', at: '11:13 pm' }],
    pen: [{ id: 'three', note: 'teen!', side: 'right' }] },

  { file: 'chat-06-diet-1', tpl: 'chat', n: '1/2', me: 'hamza', msgs: [
    { sys: 'Saturday' },
    { from: 'zain', id: 'diet', t: 'mera diet hai, main sirf salad', at: '8:30 pm' },
    { from: 'sara', t: 'konsa salad', at: '8:31 pm' },
    { from: 'zain', t: 'wo wala jis ke upar fried chicken hota hai', at: '8:31 pm' },
    { from: 'ayesha', t: 'Zain wo salad nahi hai', at: '8:32 pm' }],
    pen: [{ id: 'diet', note: 'Monday se', side: 'right' }] },
  { file: 'chat-06-diet-2', tpl: 'chat', n: '2/2', me: 'hamza', msgs: [
    { from: 'zain', t: 'patta hai upar, salad hai', at: '8:32 pm' },
    { from: 'hamza', t: 'aur saath mein fries?', at: '8:33 pm' },
    { from: 'zain', id: 'side', t: 'fries side hai, side count nahi hoti', at: '8:33 pm' },
    { from: 'ayesha', t: 'Zain. Murga. Abhi.', at: '8:34 pm' },
    { from: 'zain', t: 'ye bhi exercise hai, theek hai', at: '8:34 pm' }],
    pen: [{ id: 'side', note: 'science', side: 'left' }] },

  { file: 'chat-07-ammi-1', tpl: 'chat', n: '1/2', me: 'sara', msgs: [
    { sys: 'Sunday' },
    { from: 'hamza', t: 'aaj raat bahar khana?', at: '5:00 pm' },
    { sys: 'Sara added Ammi' },
    { from: 'sara', id: 'oops', t: 'GHALTI SE', at: '5:01 pm' },
    { from: 'ammi', name: 'Ammi', t: 'Assalam o alaikum bachon', at: '5:01 pm' },
    { from: 'ammi', name: 'Ammi', t: 'Ghar mein khana bana hai', at: '5:02 pm' }],
    pen: [{ id: 'oops', note: 'game over', side: 'left' }] },
  { file: 'chat-07-ammi-2', tpl: 'chat', n: '2/2', me: 'sara', msgs: [
    { from: 'hamza', t: 'Walaikum assalam aunty', at: '5:02 pm' },
    { from: 'zain', t: 'ji aunty bilkul, ghar ka khana best', at: '5:02 pm' },
    { from: 'ammi', name: 'Ammi', id: 'photo', t: 'Aur photo bhi bhej rahi hun, jitna photo mein hai utna hi plate mein hoga', at: '5:03 pm' },
    { from: 'ayesha', t: 'Aunty aap hamari Madam ho', at: '5:03 pm' },
    { sys: 'Hamza left' }],
    pen: [{ id: 'photo', note: 'asli legend', side: 'right' }] }
];

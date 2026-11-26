// 초등 5학년 영어 문제 은행 (2022 개정 5학년 의사소통 기능 + 기본 어휘)
// lv 1 = 기초(3·4학년 복습), 2 = 5학년 핵심, 3 = 도전
// 단어 형식: '영어|뜻|그림|lv'

const W = `
apple|사과|🍎|1
banana|바나나|🍌|1
grape|포도|🍇|1
orange|오렌지|🍊|1
peach|복숭아|🍑|1
lemon|레몬|🍋|1
strawberry|딸기|🍓|2
watermelon|수박|🍉|2
cherry|체리|🍒|1
tomato|토마토|🍅|1
potato|감자|🥔|1
carrot|당근|🥕|1
onion|양파|🧅|2
corn|옥수수|🌽|1
mushroom|버섯|🍄|2
bread|빵|🍞|1
cheese|치즈|🧀|1
egg|달걀|🥚|1
milk|우유|🥛|1
juice|주스|🧃|1
water|물|💧|1
rice|밥, 쌀|🍚|1
noodles|국수|🍜|2
pizza|피자|🍕|1
hamburger|햄버거|🍔|1
sandwich|샌드위치|🥪|2
salad|샐러드|🥗|2
soup|수프, 국|🥣|2
cake|케이크|🍰|1
cookie|쿠키|🍪|1
candy|사탕|🍬|1
chicken|닭, 닭고기|🍗|1
fish|물고기, 생선|🐟|1
salt|소금|🧂|2
sugar|설탕||2
butter|버터|🧈|2
breakfast|아침 식사|🍳|2
lunch|점심 식사||2
dinner|저녁 식사||2
dessert|후식||3
red|빨간색|🟥|1
blue|파란색|🟦|1
yellow|노란색|🟨|1
green|초록색|🟩|1
purple|보라색|🟪|1
brown|갈색|🟫|1
black|검은색|⬛|1
white|흰색|⬜|1
pink|분홍색||1
cat|고양이|🐱|1
dog|개|🐶|1
rabbit|토끼|🐰|1
bear|곰|🐻|1
tiger|호랑이|🐯|1
lion|사자|🦁|1
monkey|원숭이|🐵|1
elephant|코끼리|🐘|1
horse|말|🐴|1
pig|돼지|🐷|1
cow|소|🐮|1
duck|오리|🦆|1
bird|새|🐦|1
frog|개구리|🐸|1
snake|뱀|🐍|1
giraffe|기린|🦒|2
zebra|얼룩말|🦓|2
penguin|펭귄|🐧|2
dolphin|돌고래|🐬|2
whale|고래|🐳|2
turtle|거북|🐢|2
ant|개미|🐜|2
bee|벌|🐝|2
butterfly|나비|🦋|2
spider|거미|🕷️|2
head|머리|🗣️|1
eye|눈|👁️|1
ear|귀|👂|1
nose|코|👃|1
mouth|입|👄|1
hand|손|✋|1
foot|발|🦶|1
leg|다리|🦵|1
arm|팔|💪|1
tooth|이, 치아|🦷|2
hair|머리카락||1
father|아버지|👨|1
mother|어머니|👩|1
brother|남자 형제|👦|1
sister|여자 형제|👧|1
grandfather|할아버지|👴|2
grandmother|할머니|👵|2
uncle|삼촌||2
aunt|이모, 고모||2
cousin|사촌||3
baby|아기|👶|1
friend|친구|🧑‍🤝‍🧑|1
book|책|📕|1
pencil|연필|✏️|1
eraser|지우개||1
ruler|자|📏|1
bag|가방|🎒|1
desk|책상||1
chair|의자|🪑|1
door|문|🚪|1
window|창문|🪟|1
clock|시계|🕰️|1
phone|전화기|📱|1
computer|컴퓨터|💻|1
umbrella|우산|☂️|1
cap|모자(야구 모자)|🧢|1
hat|모자|👒|1
glasses|안경|👓|2
gloves|장갑|🧤|2
scarf|목도리|🧣|2
shoes|신발|👟|1
socks|양말|🧦|1
watch|손목시계|⌚|2
camera|카메라|📷|2
key|열쇠|🔑|2
ball|공|⚽|1
doll|인형|🪆|1
robot|로봇|🤖|1
kite|연|🪁|2
bike|자전거|🚲|1
bus|버스|🚌|1
car|자동차|🚗|1
train|기차|🚆|1
airplane|비행기|✈️|1
ship|배|🚢|1
taxi|택시|🚕|2
subway|지하철|🚇|2
one|하나, 1|1️⃣|1
two|둘, 2|2️⃣|1
three|셋, 3|3️⃣|1
four|넷, 4|4️⃣|1
five|다섯, 5|5️⃣|1
six|여섯, 6|6️⃣|1
seven|일곱, 7|7️⃣|1
eight|여덟, 8|8️⃣|1
nine|아홉, 9|9️⃣|1
ten|열, 10|🔟|1
eleven|열하나, 11||2
twelve|열둘, 12||2
fifteen|열다섯, 15||2
twenty|스물, 20||2
thirty|서른, 30||2
fifty|쉰, 50||2
hundred|백, 100|💯|2
thousand|천, 1000||3
first|첫 번째|🥇|2
second|두 번째|🥈|2
third|세 번째|🥉|2
fifth|다섯 번째||3
twelfth|열두 번째||3
twentieth|스무 번째||3
Monday|월요일||2
Tuesday|화요일||2
Wednesday|수요일||2
Thursday|목요일||2
Friday|금요일||2
Saturday|토요일||2
Sunday|일요일||2
January|1월||2
February|2월||2
March|3월||2
April|4월||2
May|5월||2
June|6월||2
July|7월||2
August|8월||2
September|9월||3
October|10월||3
November|11월||3
December|12월||3
spring|봄|🌸|1
summer|여름|🏖️|1
fall|가을|🍂|1
winter|겨울|⛄|1
sunny|화창한|☀️|1
rainy|비가 오는|🌧️|1
cloudy|흐린|☁️|1
snowy|눈이 오는|🌨️|1
windy|바람이 부는|🌬️|1
hot|더운, 뜨거운|🥵|1
cold|추운, 차가운|🥶|1
warm|따뜻한||2
cool|시원한||2
happy|행복한|😀|1
sad|슬픈|😢|1
angry|화난|😠|1
tired|피곤한|😫|1
sleepy|졸린|😴|2
hungry|배고픈|🤤|1
thirsty|목마른||2
excited|신이 난|🤩|2
bored|지루한|🥱|2
worried|걱정하는|😟|2
nervous|긴장한|😬|3
surprised|놀란|😲|2
scared|무서워하는|😱|2
big|큰||1
small|작은||1
tall|키가 큰||1
short|짧은, 키가 작은||1
long|긴||1
fast|빠른|🐆|1
slow|느린|🐌|1
old|나이 든, 오래된||1
young|젊은, 어린||2
new|새로운||1
heavy|무거운||2
light|가벼운||2
strong|힘센||2
kind|친절한||2
smart|똑똑한||2
funny|재미있는, 웃기는||2
brave|용감한||3
curly|곱슬곱슬한||3
straight|곧은, 똑바로||3
delicious|맛있는|😋|2
sweet|달콤한||2
salty|짠||2
spicy|매운|🌶️|2
sour|신, 시큼한||2
expensive|비싼|💰|3
cheap|값싼||3
clean|깨끗한, 청소하다|🧹|2
dirty|더러운||2
busy|바쁜||2
free|한가한, 무료의||3
easy|쉬운||2
difficult|어려운||3
school|학교|🏫|1
classroom|교실||2
library|도서관|📚|2
hospital|병원|🏥|2
park|공원|🏞️|1
zoo|동물원||1
museum|박물관|🏛️|2
bank|은행|🏦|2
bakery|빵집|🥐|2
restaurant|식당|🍽️|2
post office|우체국|🏤|2
police station|경찰서|🚓|3
fire station|소방서|🚒|3
market|시장|🏪|2
bookstore|서점||2
toy store|장난감 가게|🧸|2
theater|극장|🎭|3
pool|수영장|🏊|2
beach|해변|🏖️|2
mountain|산|⛰️|2
river|강|🏞️|2
sea|바다|🌊|2
house|집|🏠|1
room|방||1
kitchen|부엌||2
bathroom|화장실, 욕실|🛁|2
living room|거실|🛋️|2
garden|정원|🌷|2
doctor|의사|🧑‍⚕️|2
nurse|간호사||2
teacher|선생님|🧑‍🏫|1
student|학생|🧑‍🎓|1
cook|요리사, 요리하다|🧑‍🍳|2
chef|요리사|🧑‍🍳|2
farmer|농부|🧑‍🌾|2
pilot|조종사|🧑‍✈️|2
police officer|경찰관|👮|3
firefighter|소방관|🧑‍🚒|3
singer|가수|🎤|2
dancer|무용수|💃|2
painter|화가|🎨|2
scientist|과학자|🧑‍🔬|3
writer|작가||3
designer|디자이너||3
vet|수의사||3
astronaut|우주 비행사|🧑‍🚀|3
soccer|축구|⚽|1
baseball|야구|⚾|1
basketball|농구|🏀|1
tennis|테니스|🎾|2
badminton|배드민턴|🏸|2
swimming|수영|🏊|2
piano|피아노|🎹|1
guitar|기타|🎸|2
violin|바이올린|🎻|2
drum|북, 드럼|🥁|2
English|영어||1
math|수학|➗|2
science|과학|🔬|2
music|음악|🎵|2
art|미술|🎨|2
P.E.|체육||2
social studies|사회||3
Korean|국어, 한국어||2
history|역사||3
Korea|한국|🇰🇷|1
Canada|캐나다|🇨🇦|2
China|중국|🇨🇳|2
Japan|일본|🇯🇵|2
France|프랑스|🇫🇷|2
Brazil|브라질|🇧🇷|2
Australia|호주|🇦🇺|2
Spain|스페인|🇪🇸|3
Mexico|멕시코|🇲🇽|3
Egypt|이집트|🇪🇬|3
Kenya|케냐|🇰🇪|3
Vietnam|베트남|🇻🇳|3
Italy|이탈리아|🇮🇹|3
India|인도|🇮🇳|3
eat|먹다||1
drink|마시다||1
run|달리다|🏃|1
walk|걷다|🚶|1
swim|수영하다||1
jump|뛰다, 점프하다||1
sing|노래하다||1
dance|춤추다||1
read|읽다||1
write|쓰다|✍️|1
draw|그리다||1
sleep|자다||1
play|놀다, 경기하다||1
open|열다||1
close|닫다||1
sit|앉다||1
stand|서다||1
come|오다||1
go|가다||1
see|보다||1
look|보다, 바라보다||1
listen|듣다|🎧|1
speak|말하다||2
help|돕다||1
like|좋아하다||1
want|원하다||1
make|만들다||1
buy|사다|🛒|2
sell|팔다||2
wash|씻다||2
brush|닦다, 솔질하다|🪥|2
clean up|치우다||2
study|공부하다||2
learn|배우다||2
teach|가르치다||2
visit|방문하다||2
travel|여행하다|🧳|2
climb|오르다||2
ride|타다||2
fly|날다||2
catch|잡다||2
throw|던지다||2
carry|나르다||2
borrow|빌리다||3
remember|기억하다||3
forget|잊다||3
practice|연습하다||2
finish|끝내다||2
start|시작하다||2
turn|돌다, 돌리다||2
cross|건너다||3
take a picture|사진을 찍다|📸|2
watch TV|텔레비전을 보다|📺|2
go fishing|낚시하러 가다|🎣|2
go camping|캠핑하러 가다|🏕️|2
go hiking|등산하러 가다|🥾|3
ride a bike|자전거를 타다|🚴|2
play the piano|피아노를 치다|🎹|2
do homework|숙제를 하다|📝|2
headache|두통|🤕|3
stomachache|복통||3
toothache|치통||3
fever|열|🤒|2
cold|감기|🤧|2
medicine|약|💊|3
rest|휴식, 쉬다||3
always|항상||3
usually|보통, 대개||3
sometimes|가끔||3
never|결코 ~않다||3
yesterday|어제||2
today|오늘||1
tomorrow|내일||2
weekend|주말||2
vacation|방학, 휴가||2
birthday|생일|🎂|1
party|파티|🎉|1
gift|선물|🎁|2
holiday|휴일||2
festival|축제||3
future|미래||3
dream|꿈||2
money|돈|💵|1
price|가격||3
left|왼쪽|⬅️|2
right|오른쪽, 옳은|➡️|2
next to|~ 옆에||3
between|~ 사이에||3
across from|~ 맞은편에||3
behind|~ 뒤에||2
in front of|~ 앞에||2
under|~ 아래에||1
on|~ 위에||1
`.trim().split('\n').map((l) => { const [en, ko, pic, lv] = l.split('|'); return { en, ko, pic, lv: Number(lv) }; });
export const WORDS = W;

// 대화 응답 고르기: q(묻는 말) → a(알맞은 답), w(틀린 답 3)
export const DIALOGS = [
  // 인사·소개 (기초)
  { q: 'How are you?', a: "I'm fine, thank you.", w: ["I'm ten years old.", "It's sunny.", "It's a pencil."], ko: '잘 지내니?', lv: 1 },
  { q: "What's your name?", a: 'My name is Jimin.', w: ["I'm from Korea.", "It's my bag.", 'Yes, I can.'], ko: '네 이름이 뭐니?', lv: 1 },
  { q: 'How old are you?', a: "I'm twelve years old.", w: ["I'm fine.", "It's three o'clock.", "It's 2,000 won."], ko: '몇 살이니?', lv: 1 },
  { q: 'What color is it?', a: "It's yellow.", w: ["It's a banana.", "It's Monday.", "I'm happy."], ko: '그것은 무슨 색이니?', lv: 1 },
  { q: 'What is this?', a: "It's a ruler.", w: ["It's red.", "I'm Tom.", 'Yes, I do.'], ko: '이것은 무엇이니?', lv: 1 },
  { q: 'Do you like pizza?', a: 'Yes, I do.', w: ['Yes, I am.', "No, it isn't.", 'Yes, I can.'], ko: '피자 좋아하니?', lv: 1 },
  { q: 'Can you swim?', a: "No, I can't.", w: ["No, I don't.", "No, it isn't.", "No, I'm not."], ko: '수영할 수 있니?', lv: 1 },
  { q: "What's the weather like?", a: "It's rainy.", w: ["It's Tuesday.", "It's my cap.", "I'm hungry."], ko: '날씨가 어떠니?', lv: 1 },
  { q: 'What time is it?', a: "It's seven thirty.", w: ["It's July.", "It's a clock.", "It's sunny."], ko: '몇 시니?', lv: 1 },
  { q: 'Where is my cap?', a: "It's under the desk.", w: ["It's blue.", "It's my cap.", "I'm in the room."], ko: '내 모자 어디 있니?', lv: 1 },
  { q: 'How many apples?', a: 'Five apples.', w: ["It's an apple.", "They're red.", 'I like apples.'], ko: '사과가 몇 개니?', lv: 1 },
  { q: "Let's play soccer.", a: 'Sounds good!', w: ['Thank you.', "I'm sorry to hear that.", "You're welcome."], ko: '축구 하자.', lv: 1 },
  { q: 'Thank you.', a: "You're welcome.", w: ['Sounds good.', 'Nice to meet you.', "That's too bad."], ko: '고마워.', lv: 1 },
  { q: 'Nice to meet you.', a: 'Nice to meet you, too.', w: ["You're welcome.", "I'm sorry.", 'Me, too. Thank you.'], ko: '만나서 반가워.', lv: 1 },
  { q: 'Are you hungry?', a: "Yes, I am.", w: ['Yes, I do.', 'Yes, it is.', 'Yes, I can.'], ko: '배고프니?', lv: 1 },
  { q: 'Is this your bag?', a: "No, it isn't.", w: ["No, I don't.", "No, I'm not.", "No, I can't."], ko: '이거 네 가방이니?', lv: 1 },
  // 출신
  { q: 'Where are you from?', a: "I'm from Canada.", w: ["I'm in the library.", "It's next to the bank.", "I'm eleven years old."], ko: '너는 어디 출신이니?', lv: 2 },
  { q: 'Where is she from?', a: "She's from Brazil.", w: ["She's a doctor.", "She's tall.", "She's in the park."], ko: '그녀는 어디 출신이니?', lv: 2 },
  { q: 'Is he from China?', a: "No, he isn't. He's from Japan.", w: ["No, he doesn't. He likes Japan.", "Yes, he can.", "No, I'm not."], ko: '그는 중국 출신이니?', lv: 2 },
  // 소유
  { q: 'Whose cap is this?', a: "It's Mina's.", w: ["It's blue.", "It's on the desk.", "It's 5,000 won."], ko: '이건 누구의 모자니?', lv: 2 },
  { q: 'Whose shoes are these?', a: "They're mine.", w: ["They're big.", "It's mine.", "They're in the box."], ko: '이건 누구의 신발이니?', lv: 2 },
  { q: 'Is this your umbrella?', a: "Yes, it's mine.", w: ["Yes, it's yours.", 'Yes, I do.', "Yes, they're mine."], ko: '이거 네 우산이니?', lv: 2 },
  // 허락
  { q: 'Can I take a picture here?', a: "Sorry, you can't.", w: ["Sorry, I don't.", 'No, it is not.', "I'm from Korea."], ko: '여기서 사진 찍어도 되나요?', lv: 2 },
  { q: 'May I come in?', a: 'Sure. Come on in.', w: ["You're welcome.", "I'm fine, thanks.", 'Nice to meet you.'], ko: '들어가도 되나요?', lv: 2 },
  { q: 'Can I use your eraser?', a: 'Sure. Here you are.', w: ["It's my eraser.", 'Yes, I do.', 'No, thank you.'], ko: '네 지우개 써도 되니?', lv: 2 },
  { q: 'Can I eat this cookie?', a: 'Of course. Go ahead.', w: ["I'm full.", "It's delicious.", 'Yes, I am.'], ko: '이 쿠키 먹어도 돼?', lv: 2 },
  // 아픔·충고
  { q: "What's wrong?", a: 'I have a headache.', w: ["It's sunny.", "I'm from Korea.", 'I like math.'], ko: '무슨 일이니? (어디 아프니?)', lv: 2 },
  { q: 'I have a cold.', a: "That's too bad. Get some rest.", w: ['Sounds good!', "You're welcome.", 'Good job!'], ko: '나 감기에 걸렸어.', lv: 2 },
  { q: 'I have a toothache.', a: 'You should go to the dentist.', w: ['You should eat more candy.', "Let's go swimming.", 'Me, too. I like it.'], ko: '나 이가 아파.', lv: 2 },
  { q: 'I have a fever.', a: 'You should take some medicine.', w: ['You should play outside.', 'Happy birthday!', "It's my fever."], ko: '나 열이 나.', lv: 2 },
  { q: 'I have a stomachache.', a: "Don't eat too much.", w: ['Eat more ice cream.', 'Nice to meet you.', "It's on the table."], ko: '나 배가 아파.', lv: 3 },
  // 길 묻기
  { q: 'Where is the library?', a: 'Go straight and turn left.', w: ["It's a big library.", 'I like books.', "It's at 3 o'clock."], ko: '도서관이 어디에 있나요?', lv: 2 },
  { q: 'How can I get to the post office?', a: 'Go straight two blocks and turn right.', w: ['By bus, I like it.', "It's a post office.", 'I go to school.'], ko: '우체국에 어떻게 가나요?', lv: 3 },
  { q: 'Where is the bakery?', a: "It's next to the bank.", w: ["It's delicious.", "It's ten o'clock.", 'I want some bread.'], ko: '빵집이 어디에 있나요?', lv: 2 },
  { q: 'Is there a hospital near here?', a: "Yes, there is. It's across from the park.", w: ['Yes, I am.', "No, I don't.", "It's a big hospital."], ko: '이 근처에 병원이 있나요?', lv: 3 },
  // 과거
  { q: 'What did you do yesterday?', a: 'I played baseball with my friends.', w: ['I play baseball every day.', 'I will play baseball.', 'I like baseball.'], ko: '어제 뭐 했니?', lv: 2 },
  { q: 'What did you do last weekend?', a: 'I visited my grandmother.', w: ['I visit my grandmother.', "I'm visiting my grandmother.", 'I will visit my grandmother.'], ko: '지난 주말에 뭐 했니?', lv: 2 },
  { q: 'How was your vacation?', a: 'It was great!', w: ['It is Monday.', 'I go camping.', "I'm going there."], ko: '방학은 어땠니?', lv: 2 },
  { q: 'Did you go to the museum?', a: 'Yes, I did.', w: ['Yes, I do.', 'Yes, I am.', 'Yes, it is.'], ko: '박물관에 갔었니?', lv: 2 },
  { q: 'Where did you go?', a: 'I went to the beach.', w: ['I go to the beach.', "I'm going to the beach.", 'I like the beach.'], ko: '어디에 갔었니?', lv: 3 },
  // 계획
  { q: 'What will you do this summer?', a: 'I will learn to swim.', w: ['I learned to swim.', 'I learn swim yesterday.', "It's summer."], ko: '이번 여름에 뭐 할 거니?', lv: 2 },
  { q: 'What are you going to do tomorrow?', a: "I'm going to go hiking.", w: ['I went hiking.', 'I go hiking yesterday.', 'I like hiking.'], ko: '내일 뭐 할 거니?', lv: 3 },
  { q: 'Will you come to my party?', a: "Sure. I'd love to.", w: ['Yes, I did.', "It's my party.", "No, I don't."], ko: '내 파티에 올래?', lv: 2 },
  // 가격·쇼핑
  { q: 'How much is it?', a: "It's 3,000 won.", w: ["It's three o'clock.", "It's three apples.", "I'm three."], ko: '그것은 얼마인가요?', lv: 2 },
  { q: 'How much are these socks?', a: "They're 5,000 won.", w: ["They're white.", "It's 5 o'clock.", "They're mine."], ko: '이 양말은 얼마인가요?', lv: 2 },
  { q: 'May I help you?', a: "Yes, please. I'm looking for a cap.", w: ['Sure. Here you are.', "You're welcome.", 'I can help you.'], ko: '도와드릴까요? (무엇을 찾으세요?)', lv: 2 },
  { q: 'Can I try it on?', a: 'Sure. The fitting room is over there.', w: ["It's 9,000 won.", 'Yes, I did.', 'I like blue.'], ko: '입어 봐도 되나요?', lv: 3 },
  // 음식 주문
  { q: 'What would you like?', a: "I'd like a hamburger, please.", w: ['I like hamburgers yesterday.', "It's a hamburger.", 'Yes, I would.'], ko: '무엇을 드시겠어요?', lv: 2 },
  { q: 'Would you like some juice?', a: 'Yes, please.', w: ['Yes, I am.', "You're welcome.", 'Yes, I did.'], ko: '주스 좀 드릴까요?', lv: 2 },
  { q: 'Would you like some more?', a: "No, thanks. I'm full.", w: ["No, thanks. I'm hungry.", "Yes, it's mine.", "I'm from Korea."], ko: '좀 더 드릴까요?', lv: 2 },
  { q: 'How does it taste?', a: "It's sweet and delicious.", w: ["It's 4,000 won.", "It's on the plate.", "It's my lunch."], ko: '맛이 어때?', lv: 3 },
  // 날짜·시간·일과
  { q: 'When is your birthday?', a: "It's May 5th.", w: ["It's Monday.", "It's 5 o'clock.", "I'm twelve."], ko: '네 생일은 언제니?', lv: 2 },
  { q: 'What day is it today?', a: "It's Friday.", w: ["It's June 10th.", "It's sunny.", "It's ten thirty."], ko: '오늘은 무슨 요일이니?', lv: 2 },
  { q: "What's the date today?", a: "It's October 3rd.", w: ["It's Wednesday.", "It's 3 o'clock.", "It's cloudy."], ko: '오늘은 며칠이니?', lv: 3 },
  { q: 'What time do you get up?', a: 'I get up at seven.', w: ['I get up early yesterday.', "It's seven years old.", 'I go to bed.'], ko: '너는 몇 시에 일어나니?', lv: 2 },
  { q: 'How often do you exercise?', a: 'Three times a week.', w: ['For three hours.', 'At three o\'clock.', 'Three years old.'], ko: '얼마나 자주 운동하니?', lv: 3 },
  { q: 'What do you usually do on weekends?', a: 'I usually ride my bike.', w: ['I rode my bike yesterday.', 'I will ride my bike.', "It's my bike."], ko: '주말에 보통 뭐 하니?', lv: 3 },
  // 꿈·과목·좋아하는 것
  { q: 'What do you want to be?', a: 'I want to be a scientist.', w: ['I want a scientist.', 'I am a scientist yesterday.', 'I like science class.'], ko: '너는 무엇이 되고 싶니?', lv: 2 },
  { q: "What's your favorite subject?", a: 'My favorite subject is P.E.', w: ['My favorite color is blue.', 'I want to be a teacher.', 'I go to school.'], ko: '가장 좋아하는 과목이 뭐니?', lv: 2 },
  { q: 'Why do you like music?', a: 'Because I like singing.', w: ['Yes, I like music.', 'Music is on Tuesday.', 'I will sing.'], ko: '왜 음악을 좋아하니?', lv: 3 },
  { q: 'What are you good at?', a: "I'm good at drawing.", w: ["I'm good, thanks.", 'I draw a picture yesterday.', 'I want drawing.'], ko: '너는 무엇을 잘하니?', lv: 3 },
  // 제안
  { q: "Let's go to the zoo.", a: "Sorry, I can't. I have to study.", w: ["Sorry, I don't. It's my zoo.", "You're welcome.", 'Yes, it is.'], ko: '동물원에 가자.', lv: 2 },
  { q: "Why don't we play badminton?", a: "That's a good idea.", w: ['Because I like it.', 'I played badminton.', "It's a badminton."], ko: '배드민턴 치는 게 어때?', lv: 3 },
  { q: 'Shall we meet at two?', a: "OK. See you then.", w: ["It's two o'clock now.", 'I met at two.', 'Two apples, please.'], ko: '2시에 만날까?', lv: 3 },
  // 외모·성격
  { q: 'What does your sister look like?', a: 'She has long straight hair.', w: ['She likes cooking.', "She's my sister.", "She's in the kitchen."], ko: '너의 언니는 어떻게 생겼니?', lv: 3 },
  { q: 'What is your father like?', a: "He's kind and funny.", w: ['He likes soccer.', "He's in Seoul.", "He's 45."], ko: '너의 아빠는 어떤 분이시니?', lv: 3 },
  // 기분
  { q: 'You look happy. What happened?', a: 'I got a gift from my uncle.', w: ['I have a headache.', 'I lost my bag.', "It's my uncle."], ko: '기뻐 보이네. 무슨 일 있었니?', lv: 3 },
  { q: 'Why are you sad?', a: 'Because I lost my dog.', w: ['Because I won the game.', 'Yes, I am sad.', 'I am a dog.'], ko: '왜 슬프니?', lv: 3 },
];

// 빈칸 완성: s(빈칸 ___), a(정답), w(오답 3), ko(뜻)
export const SENTENCES = [
  { s: 'I ___ a student.', a: 'am', w: ['is', 'are', 'be'], ko: '나는 학생이에요.', lv: 1 },
  { s: 'She ___ my sister.', a: 'is', w: ['am', 'are', 'be'], ko: '그녀는 내 언니예요.', lv: 1 },
  { s: 'They ___ my friends.', a: 'are', w: ['is', 'am', 'be'], ko: '그들은 내 친구들이에요.', lv: 1 },
  { s: 'I have ___ apple.', a: 'an', w: ['a', 'two', 'many'], ko: '나는 사과 한 개가 있어요.', lv: 1 },
  { s: 'I have two ___.', a: 'dogs', w: ['dog', 'a dog', 'doges'], ko: '나는 개 두 마리가 있어요.', lv: 1 },
  { s: 'The book is ___ the desk.', a: 'on', w: ['at', 'of', 'to'], ko: '책이 책상 위에 있어요.', lv: 1 },
  { s: "I can't ___. I'm not a fish!", a: 'swim', w: ['eat', 'sleep', 'read'], ko: '나는 수영을 못 해요. 물고기가 아니잖아요!', lv: 1 },
  { s: "It's cold. Wear your ___.", a: 'gloves', w: ['sunglasses', 'swimsuit', 'shorts'], ko: '추워요. 장갑을 껴요.', lv: 1 },
  { s: 'Do you like apples? — Yes, I ___.', a: 'do', w: ['am', 'is', 'does'], ko: '사과 좋아하니? — 응, 좋아해.', lv: 1 },
  { s: 'He ___ soccer after school.', a: 'plays', w: ['play', 'playing', 'to play'], ko: '그는 방과 후에 축구를 해요.', lv: 2 },
  { s: 'She ___ to school by bus.', a: 'goes', w: ['go', 'going', 'gos'], ko: '그녀는 버스로 학교에 가요.', lv: 2 },
  { s: "I'm ___ Korea.", a: 'from', w: ['at', 'on', 'to'], ko: '나는 한국에서 왔어요.', lv: 2 },
  { s: '___ cap is this? — It\'s Tom\'s.', a: 'Whose', w: ['Who', 'What', 'Where'], ko: '이건 누구의 모자니? — 톰의 것이야.', lv: 2 },
  { s: "Is this your pencil? — Yes, it's ___.", a: 'mine', w: ['me', 'my', 'I'], ko: '이거 네 연필이니? — 응, 내 거야.', lv: 2 },
  { s: '___ I sit here? — Sure.', a: 'Can', w: ['Do', 'Am', 'Is'], ko: '여기 앉아도 되나요? — 물론이죠.', lv: 2 },
  { s: 'You ___ run in the classroom.', a: "shouldn't", w: ['should', "don't do", "aren't"], ko: '교실에서 뛰면 안 돼요.', lv: 2 },
  { s: 'You should ___ some rest.', a: 'get', w: ['gets', 'getting', 'got'], ko: '좀 쉬는 게 좋겠어요.', lv: 2 },
  { s: 'I ___ a headache.', a: 'have', w: ['am', 'has', 'do'], ko: '나는 머리가 아파요.', lv: 2 },
  { s: 'Go straight and turn ___. It\'s on your right.', a: 'right', w: ['up', 'down', 'back'], ko: '쭉 가서 오른쪽으로 도세요. 오른편에 있어요.', lv: 2 },
  { s: 'The bank is ___ the bakery and the school.', a: 'between', w: ['next', 'across', 'front'], ko: '은행은 빵집과 학교 사이에 있어요.', lv: 3 },
  { s: 'The park is ___ from the hospital.', a: 'across', w: ['between', 'next', 'under'], ko: '공원은 병원 맞은편에 있어요.', lv: 3 },
  { s: 'I ___ my grandma last Sunday.', a: 'visited', w: ['visit', 'visits', 'will visit'], ko: '나는 지난 일요일에 할머니 댁에 갔어요.', lv: 2 },
  { s: 'We ___ to the beach yesterday.', a: 'went', w: ['go', 'goes', 'going'], ko: '우리는 어제 해변에 갔어요.', lv: 2 },
  { s: 'I ___ a big fish last summer.', a: 'caught', w: ['catch', 'catched', 'catches'], ko: '나는 지난여름에 큰 물고기를 잡았어요.', lv: 3 },
  { s: 'She ___ a cake for me yesterday.', a: 'made', w: ['make', 'makes', 'maked'], ko: '그녀는 어제 나에게 케이크를 만들어 줬어요.', lv: 2 },
  { s: 'I ___ a movie last night.', a: 'watched', w: ['watch', 'watches', 'watching'], ko: '나는 어젯밤에 영화를 봤어요.', lv: 2 },
  { s: 'He ___ a book yesterday.', a: 'read', w: ['reads', 'readed', 'reading'], ko: '그는 어제 책을 읽었어요.', lv: 3 },
  { s: 'I ___ go camping this weekend.', a: 'will', w: ['did', 'was', 'am'], ko: '나는 이번 주말에 캠핑을 갈 거예요.', lv: 2 },
  { s: "I'm going ___ visit Jeju.", a: 'to', w: ['for', 'at', 'in'], ko: '나는 제주를 방문할 거예요.', lv: 3 },
  { s: 'How ___ is this shirt? — It\'s 10,000 won.', a: 'much', w: ['many', 'old', 'long'], ko: '이 셔츠 얼마예요? — 만 원이에요.', lv: 2 },
  { s: 'How ___ pencils do you have?', a: 'many', w: ['much', 'old', 'long'], ko: '연필을 몇 자루 가지고 있니?', lv: 2 },
  { s: 'My birthday is ___ June 3rd.', a: 'on', w: ['in', 'at', 'of'], ko: '내 생일은 6월 3일이에요.', lv: 3 },
  { s: 'My birthday is ___ June.', a: 'in', w: ['on', 'at', 'of'], ko: '내 생일은 6월이에요.', lv: 3 },
  { s: 'I get up ___ seven o\'clock.', a: 'at', w: ['in', 'on', 'of'], ko: '나는 7시에 일어나요.', lv: 2 },
  { s: 'I ___ brush my teeth after meals.', a: 'always', w: ['yesterday', 'tomorrow', 'last'], ko: '나는 밥 먹고 항상 이를 닦아요.', lv: 3 },
  { s: 'I want to ___ a pilot.', a: 'be', w: ['is', 'am', 'are'], ko: '나는 조종사가 되고 싶어요.', lv: 2 },
  { s: 'I like animals. I want to be a ___.', a: 'vet', w: ['pilot', 'singer', 'chef'], ko: '나는 동물을 좋아해요. 수의사가 되고 싶어요.', lv: 3 },
  { s: "I'd ___ a sandwich, please.", a: 'like', w: ['likes', 'liking', 'want to'], ko: '샌드위치 하나 주세요.', lv: 2 },
  { s: 'Would you like ___ milk?', a: 'some', w: ['a', 'an', 'many'], ko: '우유 좀 드릴까요?', lv: 3 },
  { s: "Let's ___ soccer after school.", a: 'play', w: ['plays', 'played', 'playing'], ko: '방과 후에 축구 하자.', lv: 2 },
  { s: 'She ___ long curly hair.', a: 'has', w: ['have', 'is', 'are'], ko: '그녀는 긴 곱슬머리예요.', lv: 3 },
  { s: 'My brother is ___ than me.', a: 'taller', w: ['tall', 'tallest', 'more tall'], ko: '우리 형은 나보다 키가 커요.', lv: 3 },
  { s: "I'm sorry I'm ___.", a: 'late', w: ['fast', 'tall', 'sweet'], ko: '늦어서 미안해요.', lv: 2 },
  { s: 'What ___ you do yesterday?', a: 'did', w: ['do', 'does', 'are'], ko: '어제 뭐 했니?', lv: 2 },
  { s: 'Why are you happy? — ___ I got a new bike.', a: 'Because', w: ['But', 'So', 'And'], ko: '왜 기분이 좋니? — 새 자전거가 생겼거든.', lv: 3 },
  { s: 'Can I ___ your order?', a: 'take', w: ['eat', 'swim', 'sing'], ko: '주문하시겠어요?', lv: 2 },
  { s: 'This soup is too ___. I need water.', a: 'spicy', w: ['happy', 'tall', 'slow'], ko: '이 수프는 너무 매워요. 물이 필요해요.', lv: 2 },
  { s: 'Wash your ___ before eating.', a: 'hands', w: ['books', 'shoes', 'chairs'], ko: '먹기 전에 손을 씻어요.', lv: 1 },
  { s: 'There ___ three bananas on the table.', a: 'are', w: ['is', 'am', 'be'], ko: '탁자 위에 바나나가 세 개 있어요.', lv: 3 },
  { s: 'There ___ a cat under the chair.', a: 'is', w: ['are', 'am', 'be'], ko: '의자 아래에 고양이가 한 마리 있어요.', lv: 2 },
];

// 시계 그림 (SVG)
function clock(h, m) {
  const a = (deg, len) => { const r = ((deg - 90) * Math.PI) / 180; return `${(30 + len * Math.cos(r)).toFixed(1)},${(30 + len * Math.sin(r)).toFixed(1)}`; };
  let ticks = '';
  for (let i = 0; i < 12; i++) ticks += `<line x1="${a(i * 30, 22)}" x2="${a(i * 30, 26)}" stroke="#3a2414" stroke-width="${i % 3 ? 1.2 : 2.4}"/>`.replace('x1="', 'x1="').replace(/x1="([\d.]+),([\d.]+)" x2="([\d.]+),([\d.]+)"/, 'x1="$1" y1="$2" x2="$3" y2="$4"');
  return `<svg class="clock" viewBox="0 0 60 60" width="60" height="60"><circle cx="30" cy="30" r="28" fill="#fff" stroke="#3a2414" stroke-width="3"/>${ticks}`
    + `<line x1="30" y1="30" x2="${a((h % 12) * 30 + m / 2, 14).split(',')[0]}" y2="${a((h % 12) * 30 + m / 2, 14).split(',')[1]}" stroke="#3a2414" stroke-width="4" stroke-linecap="round"/>`
    + `<line x1="30" y1="30" x2="${a(m * 6, 21).split(',')[0]}" y2="${a(m * 6, 21).split(',')[1]}" stroke="#c0392b" stroke-width="2.5" stroke-linecap="round"/><circle cx="30" cy="30" r="2.5" fill="#3a2414"/></svg>`;
}

// 그림 보고 알맞은 문장 고르기 (같은 묶음끼리 보기)
export const PICTURES = [
  { g: '날씨', items: [['☀️', "It's sunny."], ['🌧️', "It's rainy."], ['☁️', "It's cloudy."], ['🌨️', "It's snowy."], ['🌬️', "It's windy."]], lv: 1 },
  { g: '기분', items: [['😀', "I'm happy."], ['😢', "I'm sad."], ['😠', "I'm angry."], ['😫', "I'm tired."], ['🤤', "I'm hungry."], ['😲', "I'm surprised."], ['😱', "I'm scared."]], lv: 1 },
  { g: '아픔', items: [['🤕', 'I have a headache.'], ['🤒', 'I have a fever.'], ['🤧', 'I have a cold.'], ['🦷', 'I have a toothache.'], ['🤢', 'I have a stomachache.']], lv: 2 },
  { g: '할 수 있는 것', items: [['🏊', 'I can swim.'], ['🚴', 'I can ride a bike.'], ['🎹', 'I can play the piano.'], ['⚽', 'I can play soccer.'], ['🎤', 'I can sing well.'], ['🍳', 'I can cook.']], lv: 1 },
  { g: '과거에 한 일', items: [['🎣', 'I went fishing.'], ['🏕️', 'I went camping.'], ['📺', 'I watched TV.'], ['📚', 'I read a book.'], ['🍰', 'I made a cake.'], ['⚾', 'I played baseball.'], ['🏛️', 'I visited a museum.']], lv: 2 },
  { g: '장래 희망', items: [['🧑‍🍳', 'I want to be a chef.'], ['🧑‍⚕️', 'I want to be a doctor.'], ['🧑‍✈️', 'I want to be a pilot.'], ['🧑‍🔬', 'I want to be a scientist.'], ['🧑‍🚀', 'I want to be an astronaut.'], ['🧑‍🚒', 'I want to be a firefighter.'], ['🎨', 'I want to be a painter.']], lv: 2 },
  { g: '나라', items: [['🇰🇷', "I'm from Korea."], ['🇨🇦', "I'm from Canada."], ['🇯🇵', "I'm from Japan."], ['🇫🇷', "I'm from France."], ['🇧🇷', "I'm from Brazil."], ['🇨🇳', "I'm from China."], ['🇦🇺', "I'm from Australia."]], lv: 2 },
  { g: '위치', items: [['📦⬆️🐱', 'The cat is on the box.'], ['📦⬇️🐱', 'The cat is under the box.'], ['🐱📦', 'The cat is next to the box.'], ['📦🐱📦', 'The cat is between the boxes.']], lv: 2 },
  { g: '방향', items: [['⬆️', 'Go straight.'], ['⬅️', 'Turn left.'], ['➡️', 'Turn right.'], ['🔙', 'Go back.']], lv: 2 },
  { g: '일과', items: [['⏰', 'I get up at seven.'], ['🪥', 'I brush my teeth.'], ['🏫', 'I go to school.'], ['📝', 'I do my homework.'], ['🛏️', 'I go to bed at ten.']], lv: 2 },
  { g: '음식 주문', items: [['🍔', "I'd like a hamburger."], ['🍕', "I'd like a pizza."], ['🍜', "I'd like noodles."], ['🥗', "I'd like a salad."], ['🍝', "I'd like spaghetti."]], lv: 2 },
  { g: '가격', items: [['💵 1,000', "It's one thousand won."], ['💵 5,000', "It's five thousand won."], ['💵 10,000', "It's ten thousand won."], ['💵 2,500', "It's two thousand five hundred won."]], lv: 3 },
  { g: '시각', items: [[clock(7, 0), "It's seven o'clock."], [clock(7, 30), "It's seven thirty."], [clock(3, 0), "It's three o'clock."], [clock(10, 0), "It's ten o'clock."], [clock(12, 30), "It's twelve thirty."], [clock(9, 15), "It's nine fifteen."], [clock(4, 45), "It's four forty-five."]], lv: 2 },
];

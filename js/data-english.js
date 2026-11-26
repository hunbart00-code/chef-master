// 초등 5학년 영어 데이터 풀 (교과서 핵심 단어·표현 기반)
// 단어: 뜻 맞히기 / 스펠링 조합, 문장: 빈칸 완성

export const WORDS = [
  // 음식
  ['apple', '사과'], ['banana', '바나나'], ['bread', '빵'], ['butter', '버터'], ['cheese', '치즈'],
  ['chicken', '닭고기'], ['cookie', '쿠키'], ['egg', '달걀'], ['fish', '생선'], ['grape', '포도'],
  ['juice', '주스'], ['lemon', '레몬'], ['milk', '우유'], ['noodle', '국수'], ['onion', '양파'],
  ['orange', '오렌지'], ['pizza', '피자'], ['potato', '감자'], ['rice', '쌀, 밥'], ['salad', '샐러드'],
  ['salt', '소금'], ['soup', '수프, 국'], ['sugar', '설탕'], ['tomato', '토마토'], ['water', '물'],
  ['carrot', '당근'], ['corn', '옥수수'], ['strawberry', '딸기'], ['watermelon', '수박'], ['peach', '복숭아'],
  // 주방·식당
  ['bowl', '그릇'], ['spoon', '숟가락'], ['fork', '포크'], ['knife', '칼'], ['plate', '접시'],
  ['cup', '컵'], ['table', '탁자'], ['chair', '의자'], ['kitchen', '부엌'], ['menu', '메뉴, 차림표'],
  ['restaurant', '식당'], ['customer', '손님'], ['waiter', '종업원'], ['chef', '요리사'], ['money', '돈'],
  ['price', '가격'], ['breakfast', '아침 식사'], ['lunch', '점심 식사'], ['dinner', '저녁 식사'],
  // 동작
  ['cook', '요리하다'], ['eat', '먹다'], ['drink', '마시다'], ['cut', '자르다'], ['wash', '씻다'],
  ['buy', '사다'], ['sell', '팔다'], ['open', '열다'], ['close', '닫다'], ['clean', '청소하다, 깨끗한'],
  ['help', '돕다'], ['make', '만들다'], ['order', '주문하다'], ['wait', '기다리다'], ['pay', '지불하다'],
  ['carry', '나르다'], ['bring', '가져오다'], ['share', '나누다'],
  // 상태·맛
  ['delicious', '맛있는'], ['hungry', '배고픈'], ['full', '배부른'], ['hot', '뜨거운, 더운'], ['cold', '차가운, 추운'],
  ['sweet', '달콤한'], ['salty', '짠'], ['spicy', '매운'], ['sour', '신, 시큼한'], ['fresh', '신선한'],
  ['busy', '바쁜'], ['happy', '행복한'], ['angry', '화난'], ['tired', '피곤한'], ['kind', '친절한'],
  ['dirty', '더러운'], ['expensive', '비싼'], ['cheap', '값싼'], ['fast', '빠른'], ['slow', '느린'],
  // 날씨·계절
  ['weather', '날씨'], ['rainy', '비가 오는'], ['sunny', '화창한'], ['snowy', '눈이 오는'], ['windy', '바람이 부는'],
  ['cloudy', '흐린'], ['spring', '봄'], ['summer', '여름'], ['fall', '가을'], ['winter', '겨울'],
  // 생활
  ['friend', '친구'], ['family', '가족'], ['school', '학교'], ['teacher', '선생님'], ['student', '학생'],
  ['library', '도서관'], ['hospital', '병원'], ['museum', '박물관'], ['park', '공원'], ['market', '시장'],
  ['birthday', '생일'], ['holiday', '휴일'], ['vacation', '방학'], ['future', '미래'], ['dream', '꿈'],
].map(([en, ko]) => ({ en, ko }));

// s: 빈칸(___) 문장, a: 정답, w: 오답 3개, ko: 우리말 뜻(힌트)
export const SENTENCES = [
  { s: 'Can I ___ your order?', a: 'take', w: ['eat', 'swim', 'sing'], ko: '주문하시겠어요?' },
  { s: 'This soup is too ___. I need water.', a: 'spicy', w: ['happy', 'tall', 'slow'], ko: '이 수프는 너무 매워요. 물이 필요해요.' },
  { s: "I'm ___. Let's eat lunch.", a: 'hungry', w: ['full', 'tall', 'windy'], ko: '배고파요. 점심 먹자.' },
  { s: "How ___ is it? — It's 3,000 won.", a: 'much', w: ['many', 'old', 'tall'], ko: '얼마예요? — 3,000원이에요.' },
  { s: "I'd like ___ pizza, please.", a: 'a', w: ['an', 'am', 'are'], ko: '피자 한 판 주세요.' },
  { s: 'She ___ a cook.', a: 'is', w: ['am', 'are', 'be'], ko: '그녀는 요리사예요.' },
  { s: 'They ___ my friends.', a: 'are', w: ['is', 'am', 'be'], ko: '그들은 내 친구들이에요.' },
  { s: 'He ___ soccer after school.', a: 'plays', w: ['play', 'playing', 'to play'], ko: '그는 방과 후에 축구를 해요.' },
  { s: "What's the weather like? — It's ___.", a: 'rainy', w: ['hungry', 'kitchen', 'banana'], ko: '날씨가 어때요? — 비가 와요.' },
  { s: "Where is the spoon? — It's ___ the table.", a: 'on', w: ['and', 'but', 'or'], ko: '숟가락이 어디 있어요? — 탁자 위에 있어요.' },
  { s: "Let's ___ the table together.", a: 'clean', w: ['sleep', 'sing', 'swim'], ko: '같이 탁자를 청소하자.' },
  { s: 'Wash your ___ before eating.', a: 'hands', w: ['books', 'shoes', 'chairs'], ko: '먹기 전에 손을 씻어요.' },
  { s: 'I ___ a sandwich yesterday.', a: 'made', w: ['make', 'makes', 'making'], ko: '나는 어제 샌드위치를 만들었어요.' },
  { s: 'Can you help ___?', a: 'me', w: ['I', 'my', 'mine'], ko: '나를 도와줄 수 있니?' },
  { s: 'Do you like apples? — Yes, I ___.', a: 'do', w: ['am', 'is', 'does'], ko: '사과 좋아하니? — 응, 좋아해.' },
  { s: 'Is this your bag? — No, it ___.', a: "isn't", w: ["aren't", "don't", 'am not'], ko: '이거 네 가방이니? — 아니, 아니야.' },
  { s: 'How ___ apples do you want?', a: 'many', w: ['much', 'old', 'long'], ko: '사과 몇 개를 원하니?' },
  { s: "Thank you! — You're ___.", a: 'welcome', w: ['hungry', 'kitchen', 'busy'], ko: '고마워요! — 천만에요.' },
  { s: 'Would you like some water? — Yes, ___.', a: 'please', w: ['sorry', 'hello', 'goodbye'], ko: '물 좀 드릴까요? — 네, 주세요.' },
  { s: "I'm sorry I'm ___.", a: 'late', w: ['delicious', 'salty', 'sweet'], ko: '늦어서 미안해요.' },
  { s: 'The cake is ___ than the cookie.', a: 'bigger', w: ['big', 'biggest', 'more big'], ko: '케이크가 쿠키보다 더 커요.' },
  { s: 'My birthday is ___ May.', a: 'in', w: ['on', 'at', 'of'], ko: '내 생일은 5월이에요.' },
  { s: "Whose spoon is this? — It's ___.", a: 'mine', w: ['me', 'I', 'my'], ko: '이건 누구 숟가락이니? — 내 거야.' },
  { s: "What are you doing? — I'm ___ noodles.", a: 'cooking', w: ['cook', 'cooks', 'cooked'], ko: '뭐 하고 있니? — 국수를 요리하고 있어.' },
  { s: 'I want to be a ___. I like cooking.', a: 'chef', w: ['doctor', 'pilot', 'singer'], ko: '나는 요리사가 되고 싶어요. 요리를 좋아하거든요.' },
  { s: 'We have English class on ___.', a: 'Monday', w: ['lunch', 'apple', 'summer'], ko: '우리는 월요일에 영어 수업이 있어요.' },
  { s: 'What time is it? — It\'s ___ o\'clock.', a: 'seven', w: ['Monday', 'spring', 'apple'], ko: '몇 시예요? — 7시예요.' },
  { s: 'I usually get up ___ 7 a.m.', a: 'at', w: ['in', 'on', 'of'], ko: '나는 보통 아침 7시에 일어나요.' },
  { s: 'Go straight and turn ___.', a: 'left', w: ['salty', 'hungry', 'sweet'], ko: '똑바로 가서 왼쪽으로 도세요.' },
  { s: 'What did you do last weekend? — I ___ my grandma.', a: 'visited', w: ['visit', 'visits', 'visiting'], ko: '지난 주말에 뭐 했니? — 할머니 댁에 갔어.' },
  { s: 'May I ___ in? — Sure.', a: 'come', w: ['comes', 'coming', 'came'], ko: '들어가도 되나요? — 물론이죠.' },
  { s: 'You ___ run in the kitchen. It\'s dangerous.', a: "shouldn't", w: ['should', 'can', 'want'], ko: '부엌에서 뛰면 안 돼요. 위험해요.' },
];

const phoneACards = [
  { name: "Anna Petrova", file: "anna-petrova.png" },
  { name: "Jack Brown", file: "jack-brown.png" },
  { name: "Emma Davis", file: "emma-davis.png" },
  { name: "Nikos Petrou", file: "nikos-petrou.png" },
  { name: "Sofia Rossi", file: "sofia-rossi.png" },
  { name: "Pablo Garcia", file: "pablo-garcia.png" },
  { name: "Zosia Nowak", file: "zosia-nowak.png" },
  { name: "Wei Chen", file: "wei-chen.png" },
];

const phoneBCards = [
  { name: "Max Ivanov", file: "max-ivanov.png" },
  { name: "Lily White", file: "lily-white.png" },
  { name: "Ben Miller", file: "ben-miller.png" },
  { name: "Eleni Papas", file: "eleni-papas.png" },
  { name: "Luca Ricci", file: "luca-ricci.png" },
  { name: "Lucia Lopez", file: "lucia-lopez.png" },
  { name: "Adam Kowalski", file: "adam-kowalski.png" },
  { name: "Mei Wang", file: "mei-wang.png" },
];

const cardPath = "assets/cards/";

function shuffle(items) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}

function makePhoneDeck(cards, elements) {
  let queue = [];
  let lastCard = null;
  let position = 0;

  function refill() {
    queue = shuffle(cards);
    position = 0;

    if (lastCard && queue.length > 1 && queue[0].file === lastCard.file) {
      [queue[0], queue[1]] = [queue[1], queue[0]];
    }
  }

  function drawCard() {
    if (queue.length === 0) {
      refill();
    }

    const nextCard = queue.shift();
    lastCard = nextCard;
    position += 1;

    elements.stage.classList.remove("is-changing");
    void elements.stage.offsetWidth;

    elements.image.src = `${cardPath}${nextCard.file}`;
    elements.image.alt = `${nextCard.name} — World Friends Club card`;
    elements.counter.textContent = `Card ${position} / ${cards.length}`;
    elements.stage.classList.add("is-changing");
  }

  elements.button.addEventListener("click", drawCard);
  drawCard();

  return { drawCard };
}

function preload(cards) {
  cards.forEach((card) => {
    const image = new Image();
    image.src = `${cardPath}${card.file}`;
  });
}

preload([...phoneACards, ...phoneBCards]);

const phoneADeck = makePhoneDeck(phoneACards, {
  image: document.querySelector("#card-a"),
  stage: document.querySelector("#stage-a"),
  button: document.querySelector("#draw-a"),
  counter: document.querySelector("#counter-a"),
});

const phoneBDeck = makePhoneDeck(phoneBCards, {
  image: document.querySelector("#card-b"),
  stage: document.querySelector("#stage-b"),
  button: document.querySelector("#draw-b"),
  counter: document.querySelector("#counter-b"),
});

document.querySelector("#draw-both").addEventListener("click", () => {
  phoneADeck.drawCard();
  phoneBDeck.drawCard();
});
